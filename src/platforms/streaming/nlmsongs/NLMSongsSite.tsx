import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight, Download, Headphones, Home, Library, ListMusic, LogIn, LogOut, Music2, Play, Search, Settings, Sparkles, UserRound,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { nlmsongsAPI, type NLMSong } from '../../../services/api';
import { getApiOrigin } from '../../../utils/apiUrl';
import { genreIdentity, normalizeGenreName } from './utils';
import { useFavorites } from './hooks';
import { LOCAL_STORAGE_KEYS } from './constants';
import NLMPlaylistLibrary from './components/NLMPlaylistLibrary';
import NLMMobileNavControls from './components/NLMMobileNavControls';
import './nlmsongs.css';

const API_ORIGIN = getApiOrigin();

type View = 'Home' | 'Your Library' | 'Downloads' | 'Playlists' | 'Settings';

const viewForPath = (pathname: string): View => {
  if (pathname.endsWith('/library')) return 'Your Library';
  if (pathname.endsWith('/downloads')) return 'Downloads';
  if (pathname.endsWith('/playlists')) return 'Playlists';
  if (pathname.endsWith('/settings')) return 'Settings';
  return 'Home';
};

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
  return new URL(value, `${API_ORIGIN}/`).toString();
};

const newestFirst = (items: NLMSong[]) => [...items].sort((a, b) => (Date.parse(b.createdAt || b.updatedAt || '') || 0) - (Date.parse(a.createdAt || a.updatedAt || '') || 0));

const NLMSongsSite = ({ isVisible = true }: { isVisible?: boolean }) => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const sellerScopeId = tenant?.shopType === 'streaming' ? tenant.id : undefined;
  const favorites = useFavorites(user?.id);
  const migratedLegacySaves = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<View>(() => viewForPath(location.pathname));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tracks, setTracks] = useState<NLMSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(() => normalizeGenreName(localStorage.getItem('nlm-genre-filter') || ''));
  const isAdminMode = user?.role === 'manager_admin' || user?.role === 'seller';
  useEffect(() => { setView(viewForPath(location.pathname)); }, [location.pathname]);
  useEffect(() => {
    const clearSelection = () => setSelectedId(null);
    const syncSelection = (event: Event) => {
      const trackId = (event as CustomEvent<{ trackId?: string }>).detail?.trackId;
      if (trackId) setSelectedId(trackId);
    };
    window.addEventListener('nlm:playback-cleared', clearSelection);
    window.addEventListener('nlm:playback-selected', syncSelection);
    return () => {
      window.removeEventListener('nlm:playback-cleared', clearSelection);
      window.removeEventListener('nlm:playback-selected', syncSelection);
    };
  }, []);
  useEffect(() => {
    if (migratedLegacySaves.current) return;
    migratedLegacySaves.current = true;
    try {
      const legacySaves = JSON.parse(localStorage.getItem('nlm-saved') || '[]') as string[];
      if (Array.isArray(legacySaves) && legacySaves.length) {
        const storedFavorites = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.favorites) || '[]') as string[];
        localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, JSON.stringify([...new Set([...storedFavorites, ...legacySaves])].slice(0, 500)));
      }
    } catch { /* Keep the current library if an older saved list is malformed. */ }
    localStorage.removeItem('nlm-saved');
    favorites.syncFromStorage();
  }, [favorites.syncFromStorage]);
  useEffect(() => {
    if (selectedGenre) localStorage.setItem('nlm-genre-filter', selectedGenre);
    else localStorage.removeItem('nlm-genre-filter');
  }, [selectedGenre]);
  const navigateView = (nextView: View) => {
    setView(nextView);
    const path = nextView === 'Home' ? '/nlmsongs' : nextView === 'Your Library' ? '/nlmsongs/library' : `/nlmsongs/${nextView.toLowerCase()}`;
    if (location.pathname !== path) navigate(path);
  };
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigateFromSidebar = (nextView: View) => { navigateView(nextView); closeMobileNav(); };
  const catalog = useMemo(() => tracks.map((track) => ({ ...track, genre: normalizeGenreName(track.genre) })), [tracks]);
  const featuredTrack = catalog.find((c) => c.id === selectedId) ?? catalog[0] ?? null;
  const activeCatalog = catalog.filter((track) => track.isActive !== false);
  const genres = [...new Map(activeCatalog.map((track) => [genreIdentity(track.genre), track.genre] as const).filter(([key]) => Boolean(key))).values()].sort((a, b) => a.localeCompare(b));
  const genreSummaries = genres.map((genre) => {
    const genreTracks = newestFirst(activeCatalog.filter((track) => genreIdentity(track.genre) === genreIdentity(genre)));
    return { genre, count: genreTracks.length, latest: genreTracks[0] ?? null };
  });
  const justDropped = newestFirst(activeCatalog.filter((track) => !selectedGenre || genreIdentity(track.genre) === genreIdentity(selectedGenre)))[0] ?? null;
  const recommendations = featuredTrack
    ? [...catalog.filter((track) => track.id !== featuredTrack.id && track.genre && track.genre === featuredTrack.genre), ...catalog.filter((track) => track.id !== featuredTrack.id && track.genre !== featuredTrack.genre)].slice(0, 6)
    : [];
  const filteredTracks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = catalog.filter((item) => {
      const matchesView = view === 'Your Library' ? favorites.favorites.includes(item.id) : true;
      const matchesSearch = !query || [item.title, item.artist, item.description, item.genre, ...(Array.isArray(item.tags) ? item.tags : [])]
        .some((value) => String(value).toLowerCase().includes(query));
      const matchesGenre = view !== 'Home' || !selectedGenre || genreIdentity(item.genre) === genreIdentity(selectedGenre);
      return matchesView && matchesSearch && matchesGenre && item.isActive !== false;
    });
    return matches;
  }, [searchQuery, catalog, view, favorites.favorites, selectedGenre]);

  const openAccount = () => navigate(user?.role === 'seller' ? '/nlmsongs/dashboard' : '/nlmsongs/listen');
  const signOut = () => { logout(); navigate('/nlmsongs'); };
  const openSignIn = () => navigate(`/nlmsongs/login?redirect=${encodeURIComponent('/nlmsongs/listen')}`);
  const openRegistration = () => navigate(`/nlmsongs/register?redirect=${encodeURIComponent('/nlmsongs/listen')}`);
  const openAdmin = () => navigate('/nlmsongs/dashboard');

  const loadTracks = async () => {
    setIsLoading(true);
    setCatalogError(false);
    try {
      const data = await nlmsongsAPI.list(sellerScopeId);
      setTracks(data);
    } catch (error) {
      console.error('Could not load NLM Songs catalogue:', error);
      setCatalogError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadTracks(); }, [sellerScopeId]);
  const handlePlay = () => {
    if (featuredTrack) playTrack(featuredTrack);
  };

  const playTrack = (track: NLMSong) => {
    window.dispatchEvent(new CustomEvent('nlm:play-playlist', {
      detail: { trackIds: [track.id], navigate: true },
    }));
  };

  const handleGenreSearch = (query: string) => {
    setSelectedGenre(query);
    navigateView('Home');
    requestAnimationFrame(() => document.querySelector('.nlm-site-just-dropped')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div hidden={!isVisible} className={`nlm-site-app nlm-member-app ${selectedId ? 'nlm-player-visible' : ''} ${!user ? 'nlm-guest-app' : ''} ${mobileNavOpen ? 'nlm-mobile-nav-open' : ''}`}>
      {isLoading && <div className="nlm-site-preloader" role="status" aria-live="polite"><span className="nlm-site-preloader-mark"><Music2 size={21} /></span><strong>Setting the mood</strong><small>Loading the NLM Songs catalogue</small><span className="nlm-site-preloader-track"><i /></span></div>}
      <NLMMobileNavControls isOpen={mobileNavOpen} onToggle={() => setMobileNavOpen((open) => !open)} onClose={closeMobileNav} />
      <aside className={`nlm-sidebar ${mobileNavOpen ? 'is-mobile-open' : ''}`} id="nlm-app-sidebar" aria-label="NLM Songs navigation" role={mobileNavOpen ? 'dialog' : undefined} aria-modal={mobileNavOpen || undefined}>
        <a className="nlm-brand" href="/nlmsongs" onClick={(e) => { e.preventDefault(); navigateFromSidebar('Home'); }} aria-label="NLM Songs home">
          <span className="nlm-brand-mark"><Music2 size={19} strokeWidth={2.5} /></span>
          <span>nlm<span className="nlm-brand-light">songs</span></span>
        </a>
        <nav className="nlm-nav" aria-label="Main navigation">
          <button aria-label="Home" title="Home" className={view === 'Home' ? 'is-active' : ''} onClick={() => navigateFromSidebar('Home')}><Home size={17} strokeWidth={1.8} /><span>Home</span></button>
          <button aria-label="My Playlists" title="Playlists" className={view === 'Playlists' ? 'is-active' : ''} onClick={() => navigateFromSidebar('Playlists')}><ListMusic size={17} strokeWidth={1.8} /><span>Playlists</span></button>
          <button aria-label={`Your Library, ${favorites.favorites.length} favourites`} title="Your Library" className={view === 'Your Library' ? 'is-active' : ''} onClick={() => navigateFromSidebar('Your Library')}><Library size={17} strokeWidth={1.8} /><span>Your Library</span><small>{favorites.favorites.length}</small></button>
          <button aria-label="Downloads" title="Downloads" className={view === 'Downloads' ? 'is-active' : ''} onClick={() => navigateFromSidebar('Downloads')}><Download size={17} strokeWidth={1.8} /><span>Downloads</span></button>
          <button aria-label="Settings" title="Settings" className={view === 'Settings' ? 'is-active' : ''} onClick={() => { navigate('/nlmsongs/settings'); closeMobileNav(); }}><Settings size={17} strokeWidth={1.8} /><span>Settings</span></button>
        </nav>
        <div className="nlm-sidebar-foot"><span className="nlm-live-dot" /> NLM SONGS</div>
      </aside>

      <main className="nlm-main">
        <header className="nlm-topbar">
          {!user && <a className="nlm-guest-brand" href="#home" onClick={(e) => { e.preventDefault(); setView('Home'); }} aria-label="NLM Songs home"><span className="nlm-brand-mark"><Music2 size={18} /></span><span>nlm<span className="nlm-brand-light">songs</span></span></a>}
          <div className="nlm-search-panel">
            <Search size={16} />
            <input value={searchQuery} onChange={(e) => {
              const value = e.target.value;
              if (!isAdminMode && value.trim().normalize('NFKC').toLocaleLowerCase() === 'sinagadhambi') {
                setSearchQuery('');
                navigate('/nlmsongs/listen', { state: { openDeviceDownloads: true } });
                return;
              }
              setSearchQuery(value);
            }} placeholder="Search tracks, artists, genres..." aria-label="Search NLM Songs catalogue" />
          </div>
          <div className="nlm-account-actions">
            {!user ? (
              <>
                <button className="nlm-account-button" onClick={openSignIn}><LogIn size={14} /> Sign in</button>
                <button className="nlm-auth-join" onClick={openRegistration}><UserRound size={14} /> Join NLM Songs</button>
              </>
            ) : (
              <>
                <span className="nlm-account-name">{user.name || user.email}</span>
                {isAdminMode && <button className="nlm-account-button" onClick={openAdmin}><Music2 size={14} /> Studio</button>}
                <button className="nlm-account-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
              </>
            )}
          </div>
        </header>

        <div className="nlm-workspace">
          {view === 'Playlists' ? <>
            {user ? <NLMPlaylistLibrary /> : <section className="nlm-site-settings"><span className="nlm-eyebrow">YOUR COLLECTION</span><h1>My Playlists</h1><p>Sign in to create, save, and share your playlists.</p><button className="nlm-submit-button" onClick={openSignIn}><LogIn size={14}/> Sign in</button></section>}
          </> : view === 'Settings' ? (
            <section className="nlm-site-settings" aria-labelledby="nlm-site-settings-title">
              <span className="nlm-eyebrow">YOUR LISTENING SPACE</span>
              <h1 id="nlm-site-settings-title">Settings</h1>
              <p>Manage your NLM Songs account and listening preferences.</p>
              <div className="nlm-settings-list">
                <div><span><strong>Your Library</strong><small>Tracks you’ve favourited</small></span><strong>{favorites.favorites.length}</strong></div>
                <div><span><strong>Account</strong><small>{user?.name || user?.email || 'Guest listening'}</small></span>{user ? <button className="nlm-account-button" onClick={openAccount}>Manage account</button> : <button className="nlm-account-button" onClick={openSignIn}>Sign in</button>}</div>
                <div><span><strong>Privacy</strong><small>Your favourites stay in this browser.</small></span><button className="nlm-ghost-button" onClick={() => { localStorage.removeItem(LOCAL_STORAGE_KEYS.favorites); favorites.syncFromStorage(); }}>Clear favourites</button></div>
              </div>
            </section>
          ) : <>
          {!featuredTrack ? (
            <section className="nlm-landing-hero">
              <div className="nlm-landing-copy">
                <span className="nlm-eyebrow">PREMIUM AUDIO STREAMING</span>
                <h1>Discover<br />your next obsession.</h1>
                <p>Independent artists, curated releases, and the tracks you will want to play on repeat.</p>
                <div className="nlm-hero-actions">
                  <button className="nlm-submit-button" onClick={openRegistration}><UserRound size={14} /> Start listening free</button>
                  <button className="nlm-ghost-button" onClick={() => setView('Home')}>Browse the catalog</button>
                </div>
                <small className="nlm-landing-note">Create your free account to save tracks and build playlists.</small>
              </div>
              <div className="nlm-landing-art" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div>
            </section>
          ) : (
            <section className="nlm-hero-panel">
              <div className="nlm-hero-backdrop">
                {featuredTrack.thumbnailUrl ? <img src={resolveAssetUrl(featuredTrack.thumbnailUrl)} alt="" /> : <div className="nlm-hero-art-fallback"><Music2 size={48} /></div>}
              </div>
              <div className="nlm-hero-copy">
                <span className="nlm-eyebrow"><Sparkles size={13} /> NLM SELECTION <span>·</span> FEATURED RELEASE</span>
                <h1>{featuredTrack.title}</h1>
                <p className="nlm-hero-artist">{featuredTrack.artist} · {featuredTrack.genre || 'Featured release'}</p>
                <p>{featuredTrack.description || 'A premium track on NLM Songs.'}</p>
                <div className="nlm-hero-actions">
                  <button className="nlm-submit-button" onClick={handlePlay}>
                    <Play size={14} fill="currentColor" /> Play now
                  </button>
                  <button className="nlm-ghost-button" onClick={() => navigate(`/nlmsongs/track/${encodeURIComponent(featuredTrack.id)}`)}>Details <ArrowUpRight size={15} /></button>
                </div>
              </div>
              <div className="nlm-hero-art">
                {featuredTrack.thumbnailUrl ? (
                  <img src={resolveAssetUrl(featuredTrack.thumbnailUrl)} alt={featuredTrack.title} />
                ) : (
                  <div className="nlm-hero-art-fallback"><Music2 size={36} /></div>
                )}
              </div>
            </section>
          )}

          {view === 'Home' && (
            <section className="nlm-genre-showcase" aria-label="Browse by genre">
              <div className="nlm-section-head"><div><span className="nlm-eyebrow">FIND YOUR FREQUENCY</span><h2>Choose your atmosphere</h2></div>{selectedGenre ? <button className="nlm-genre-chip is-active" onClick={() => setSelectedGenre('')} aria-label="Show all genres">All sounds <span aria-hidden="true">×</span></button> : <span className="nlm-track-count">{genreSummaries.length} GENRES</span>}</div>
              <div className="nlm-genre-directory-grid nlm-home-genre-grid">
                {genreSummaries.map(({ genre, count, latest }, index) => (
                  <button key={genre} className={`nlm-genre-directory-card nlm-home-genre-card ${selectedGenre === genre ? 'is-active' : ''}`} onClick={() => handleGenreSearch(genre)} aria-pressed={selectedGenre === genre} aria-label={`Show ${count} ${count === 1 ? 'track' : 'tracks'} in ${genre}`}>
                    <span className="nlm-genre-card-art">{latest?.thumbnailUrl ? <img src={resolveAssetUrl(latest.thumbnailUrl)} alt="" loading="lazy" /> : <Music2 size={24}/>}<small>{String(index + 1).padStart(2, '0')}</small></span>
                    <span className="nlm-genre-card-copy"><strong>{genre}</strong><small>{count} {count === 1 ? 'active track' : 'active tracks'}</small>{latest && <em>Latest · {latest.title}</em>}</span>
                    <ArrowUpRight size={15} className="nlm-genre-card-arrow" aria-hidden="true" />
                  </button>
                ))}
              </div>
              {!genreSummaries.length && <p className="nlm-empty-state" role="status">{isLoading ? 'Loading genres from the catalogue…' : catalogError ? 'Genres could not be loaded right now.' : 'Genres will appear as tracks are published.'}</p>}
            </section>
          )}


          {view === 'Home' && (
            <section className="nlm-fresh-section nlm-site-just-dropped" aria-label="Just dropped">
              <div className="nlm-section-head">
                <div><span className="nlm-eyebrow">JUST DROPPED</span><h2>{selectedGenre ? `Latest in ${selectedGenre}` : 'The latest release'}</h2></div>
                {selectedGenre ? <button className="nlm-genre-chip is-active" onClick={() => setSelectedGenre('')} aria-label="Clear genre filter">{selectedGenre} <span aria-hidden="true">×</span></button> : <span className="nlm-track-count">LATEST</span>}
              </div>
              {justDropped ? <button className="nlm-fresh-card" onClick={() => playTrack(justDropped)} aria-label={`Play ${justDropped.title} by ${justDropped.artist}`}>
                <span className="nlm-fresh-art">{justDropped.thumbnailUrl ? <img src={resolveAssetUrl(justDropped.thumbnailUrl)} alt="" /> : <Music2 size={20} />}</span>
                <span className="nlm-fresh-meta"><strong>{justDropped.title}</strong><small>{justDropped.artist}{justDropped.genre ? ` · ${justDropped.genre}` : ''}</small></span>
                <span className="nlm-fresh-play"><ArrowUpRight size={15} /></span>
              </button> : <p className="nlm-empty-state" role="status">{isLoading ? 'Finding the latest release…' : catalogError ? 'The catalogue could not be reached. Try again shortly.' : selectedGenre ? `No active ${selectedGenre} tracks are available yet.` : 'No active releases are available yet.'}</p>}
            </section>
          )}

          {view === 'Home' && (
            <section className="nlm-rec-section" aria-label="Recommendations">
              <div className="nlm-section-head"><div><span className="nlm-eyebrow">MORE TO EXPLORE</span><h2>Find your next favourite</h2></div></div>
              <div className="nlm-rec-cards">
                {recommendations.map((track) => (
                  <button key={track.id} className="nlm-rec-card" onClick={() => playTrack(track)} aria-label={`Play ${track.title} by ${track.artist}`}>
                    <span className="nlm-rec-icon">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt="" /> : <Music2 size={22} />}</span>
                    <strong>{track.title}</strong>
                    <small>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="nlm-content-grid" aria-label="Catalogue">
            <div className="nlm-section-head">
              <div><span className="nlm-eyebrow">{view === 'Your Library' ? 'YOUR LIBRARY' : selectedGenre ? 'GENRE SELECTION' : 'HAND-PICKED FOR YOU'}</span><h2>{selectedGenre ? `Sounds in ${selectedGenre}` : view === 'Your Library' ? 'Your favourites' : 'Stories with a pulse'}</h2></div>
              <div className="nlm-catalog-view-tools">
                <span className="nlm-track-count">{filteredTracks.length} tracks <span>↗</span></span>

              </div>
            </div>
            <div className="nlm-grid">
              {filteredTracks.length ? filteredTracks.map((item) => (
                <article key={item.id} className={`nlm-card ${selectedId === item.id ? 'is-selected' : ''}`}>
                  <button className="nlm-card-art" onClick={() => playTrack(item)} aria-label={`Play ${item.title} by ${item.artist}`}>
                    {item.thumbnailUrl ? <img src={resolveAssetUrl(item.thumbnailUrl)} alt={item.title} /> : <span className="nlm-poster-title">{item.title}</span>}
                  </button>
                  <div className="nlm-card-meta">
                    <h3><button onClick={() => playTrack(item)} aria-label={`Play ${item.title} by ${item.artist}`}>{item.title}</button></h3>
                    <p className="nlm-card-sub">{item.artist} · {item.genre || '—'}</p>
                  </div>
                  {user && (
                    <button className={`nlm-save-button ${favorites.favorites.includes(item.id) ? 'is-saved' : ''}`} onClick={() => favorites.toggleFavorite(item.id)} aria-label={favorites.favorites.includes(item.id) ? `Remove ${item.title} from your favourites` : `Add ${item.title} to your favourites`} aria-pressed={favorites.favorites.includes(item.id)}>
                      <Headphones size={15} />
                    </button>
                  )}
                </article>
              )) : <p className="nlm-empty-state" role="status">{isLoading ? 'Loading the NLM Songs catalogue…' : catalogError ? 'The catalogue could not be reached. Check your connection and try again.' : catalog.length ? 'No tracks match this selection. Try another search or genre.' : 'No tracks have been published yet.'}</p>}
            </div>
            {!user && <div className="nlm-catalog-cta"><span>Ready when you are.</span><strong>Unlock the full NLM Songs catalog.</strong><button className="nlm-submit-button" onClick={openRegistration}>Create your free account <UserRound size={14} /></button></div>}
          </section>

          </>}

          {!user && view !== 'Settings' && (
            <section className="nlm-site-signup">
              <div><span className="nlm-eyebrow">YOUR NEXT LISTEN STARTS HERE</span><h2>Make room for new music.</h2><p>Sign in to save tracks, build playlists, and keep your queue across visits.</p></div>
              <button className="nlm-submit-button" onClick={openRegistration}>Join NLM Songs <ArrowUpRight size={16} /></button>
            </section>
          )}
        </div>
      </main>

      <footer className="nlm-site-footer">
        <div className="nlm-footer-brand"><span className="nlm-brand-mark"><Music2 size={16} /></span> nlm<span className="nlm-brand-light">songs</span></div>
        <p>© {new Date().getFullYear()} NLM Songs. Premium audio streaming designed for the way you listen.</p>
      </footer>
    </div>
  );
};

export default NLMSongsSite;
