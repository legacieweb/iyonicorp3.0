import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Headphones, Home, ListMusic, LogIn, LogOut, Music2, Play, Search, Settings, Sparkles, UserRound,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { nlmsongsAPI, type NLMSong } from '../../../services/api';
import { getApiOrigin } from '../../../utils/apiUrl';
import NLMPlaylistLibrary from './components/NLMPlaylistLibrary';
import NLMMobileNavControls from './components/NLMMobileNavControls';
import './nlmsongs.css';

const API_ORIGIN = getApiOrigin();

type View = 'Home' | 'Genres' | 'My List' | 'Playlists' | 'Settings';

const viewForPath = (pathname: string): View => {
  if (pathname.endsWith('/genres')) return 'Genres';
  if (pathname.endsWith('/my-list')) return 'My List';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<View>(() => viewForPath(location.pathname));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tracks, setTracks] = useState<NLMSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(() => localStorage.getItem('nlm-genre-filter') || '');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nlm-saved') || '[]') as string[]; }
    catch { return []; }
  });

  const isAdminMode = user?.role === 'manager_admin' || user?.role === 'seller';
  useEffect(() => { setView(viewForPath(location.pathname)); }, [location.pathname]);
  useEffect(() => {
    if (selectedGenre) localStorage.setItem('nlm-genre-filter', selectedGenre);
    else localStorage.removeItem('nlm-genre-filter');
  }, [selectedGenre]);
  const navigateView = (nextView: View) => {
    setView(nextView);
    const path = nextView === 'Home' ? '/nlmsongs/listen' : nextView === 'My List' ? '/nlmsongs/my-list' : `/nlmsongs/${nextView.toLowerCase()}`;
    if (location.pathname !== path) navigate(path);
  };
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigateFromSidebar = (nextView: View) => { navigateView(nextView); closeMobileNav(); };
  const catalog = tracks;
  const featuredTrack = catalog.find((c) => c.id === selectedId) ?? catalog[0] ?? null;
  const genres = [...new Set(catalog.map((track) => track.genre?.trim()).filter((genre): genre is string => Boolean(genre)))].sort((a, b) => a.localeCompare(b));
  const genreSummaries = genres.map((genre) => {
    const genreTracks = newestFirst(catalog.filter((track) => track.isActive !== false && track.genre?.trim() === genre));
    return { genre, count: genreTracks.length, latest: genreTracks[0] ?? null };
  });
  const justDropped = newestFirst(catalog.filter((track) => track.isActive !== false && (!selectedGenre || track.genre === selectedGenre)))[0] ?? null;
  const recommendations = featuredTrack
    ? [...catalog.filter((track) => track.id !== featuredTrack.id && track.genre && track.genre === featuredTrack.genre), ...catalog.filter((track) => track.id !== featuredTrack.id && track.genre !== featuredTrack.genre)].slice(0, 6)
    : [];
  const filteredTracks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = catalog.filter((item) => {
      const matchesView = view === 'My List' ? savedIds.includes(item.id) : true;
      const matchesSearch = !query || [item.title, item.artist, item.description, item.genre, ...(Array.isArray(item.tags) ? item.tags : [])]
        .some((value) => String(value).toLowerCase().includes(query));
      const matchesGenre = view !== 'Genres' || !selectedGenre || item.genre === selectedGenre;
      return matchesView && matchesSearch && matchesGenre && item.isActive !== false;
    });
    return matches;
  }, [searchQuery, catalog, view, savedIds, selectedGenre]);

  const openAccount = () => navigate(user?.role === 'manager_admin'
    ? '/admin/dashboard'
    : user?.role === 'seller' ? '/nlmsongs/dashboard' : '/customer/dashboard');
  const signOut = () => { logout(); navigate('/nlmsongs'); };
  const openSignIn = () => navigate(`/login?redirect=${encodeURIComponent('/nlmsongs')}`);
  const openRegistration = () => navigate(`/register?role=customer&redirect=${encodeURIComponent('/nlmsongs')}`);
  const openAdmin = () => navigate('/nlmsongs/dashboard');

  const loadTracks = async () => {
    setIsLoading(true);
    setCatalogError(false);
    try {
      const data = await nlmsongsAPI.list();
      setTracks(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (error) {
      console.error('Could not load NLM Songs catalogue:', error);
      setCatalogError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadTracks(); }, []);
  useEffect(() => { localStorage.setItem('nlm-saved', JSON.stringify(savedIds)); }, [savedIds]);

  const handlePlay = () => {
    if (!user) { openRegistration(); return; }
    if (featuredTrack) navigate(`/nlmsongs/track/${encodeURIComponent(featuredTrack.id)}`);
  };

  const handleGenreSearch = (query: string) => {
    setSelectedGenre(query);
    navigateView('Genres');
    document.querySelector('.nlm-content-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div hidden={!isVisible} className={`nlm-site-app nlm-member-app ${!user ? 'nlm-guest-app' : ''} ${mobileNavOpen ? 'nlm-mobile-nav-open' : ''}`}>
      <NLMMobileNavControls isOpen={mobileNavOpen} onToggle={() => setMobileNavOpen((open) => !open)} onClose={closeMobileNav} />
      <aside className={`nlm-sidebar ${mobileNavOpen ? 'is-mobile-open' : ''}`} id="nlm-app-sidebar" aria-label="NLM Songs navigation" role={mobileNavOpen ? 'dialog' : undefined} aria-modal={mobileNavOpen || undefined}>
        <a className="nlm-brand" href="/nlmsongs/listen" onClick={(e) => { e.preventDefault(); navigateFromSidebar('Home'); }} aria-label="NLM Songs home">
          <span className="nlm-brand-mark"><Music2 size={19} strokeWidth={2.5} /></span>
          <span>nlm<span className="nlm-brand-light">songs</span></span>
        </a>
        <nav className="nlm-nav" aria-label="Main navigation">
          <button aria-label="Home" title="Home" className={view === 'Home' ? 'is-active' : ''} onClick={() => navigateFromSidebar('Home')}><Home size={17} strokeWidth={1.8} /><span>Home</span></button>
          <button aria-label="Genres" title="Genres" className={view === 'Genres' ? 'is-active' : ''} onClick={() => navigateFromSidebar('Genres')}><Music2 size={17} strokeWidth={1.8} /><span>Genres</span></button>
          <button aria-label={`My list, ${savedIds.length} saved`} title="My List" className={view === 'My List' ? 'is-active' : ''} onClick={() => navigateFromSidebar('My List')}><Headphones size={17} strokeWidth={1.8} /><span>My List</span><small>{savedIds.length}</small></button>
          <button aria-label="My Playlists" title="Playlists" className={view === 'Playlists' ? 'is-active' : ''} onClick={() => navigateFromSidebar('Playlists')}><ListMusic size={17} strokeWidth={1.8} /><span>Playlists</span></button>
          <button aria-label="Settings" title="Settings" className={view === 'Settings' ? 'is-active' : ''} onClick={() => { navigate('/nlmsongs/settings'); closeMobileNav(); }}><Settings size={17} strokeWidth={1.8} /><span>Settings</span></button>
        </nav>
        <div className="nlm-sidebar-foot"><span className="nlm-live-dot" /> NLM SONGS</div>
      </aside>

      <main className="nlm-main">
        <header className="nlm-topbar">
          {!user && <a className="nlm-guest-brand" href="#home" onClick={(e) => { e.preventDefault(); setView('Home'); }} aria-label="NLM Songs home"><span className="nlm-brand-mark"><Music2 size={18} /></span><span>nlm<span className="nlm-brand-light">songs</span></span></a>}
          <div className="nlm-search-panel">
            <Search size={16} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tracks, artists, genres..." aria-label="Search NLM Songs catalogue" />
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
                <div><span><strong>Personal library</strong><small>Tracks saved to your list</small></span><strong>{savedIds.length}</strong></div>
                <div><span><strong>Account</strong><small>{user?.name || user?.email || 'Guest listening'}</small></span>{user ? <button className="nlm-account-button" onClick={openAccount}>Manage account</button> : <button className="nlm-account-button" onClick={openSignIn}>Sign in</button>}</div>
                <div><span><strong>Privacy</strong><small>Your saved tracks stay in this browser.</small></span><button className="nlm-ghost-button" onClick={() => { setSavedIds([]); localStorage.removeItem('nlm-saved'); }}>Clear saved tracks</button></div>
              </div>
            </section>
          ) : <>
          {view === 'Genres' ? (
            <section className="nlm-genres-intro">
              <span className="nlm-eyebrow">FIND YOUR FREQUENCY</span>
              <h1>Choose your atmosphere.</h1>
              <p>Explore every sound in the catalogue. Pick a genre to see its newest release and the tracks gathered around it.</p>
              <div className="nlm-genres-total"><strong>{genreSummaries.length}</strong><span>genres in the catalogue</span><i /> <strong>{catalog.filter((track) => track.isActive !== false).length}</strong><span>active tracks</span></div>
            </section>
          ) : !featuredTrack ? (
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
                <span className="nlm-eyebrow"><Sparkles size={13} /> NLM SELECTION <span>·</span> NOW PLAYING</span>
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

          <section className="nlm-content-grid" aria-label="Catalogue">
            <div className="nlm-section-head"><div><span className="nlm-eyebrow">{view === 'My List' ? 'YOUR LIBRARY' : view === 'Genres' ? 'ACTIVE CATALOGUE' : 'HAND-PICKED FOR YOU'}</span><h2>{view === 'Genres' ? selectedGenre || 'All sounds' : view === 'My List' ? 'Saved for later' : 'Stories with a pulse'}</h2></div><span className="nlm-track-count">{filteredTracks.length} tracks <span>↗</span></span></div>
            <div className="nlm-grid">
              {filteredTracks.length ? filteredTracks.map((item) => (
                <article key={item.id} className={`nlm-card ${selectedId === item.id ? 'is-selected' : ''}`}>
                  <button className="nlm-card-art" onClick={() => navigate(`/nlmsongs/track/${encodeURIComponent(item.id)}`)} aria-label={`View ${item.title} details`}>
                    {item.thumbnailUrl ? <img src={resolveAssetUrl(item.thumbnailUrl)} alt={item.title} /> : <span className="nlm-poster-title">{item.title}</span>}
                  </button>
                  <div className="nlm-card-meta">
                    <h3><button onClick={() => navigate(`/nlmsongs/track/${encodeURIComponent(item.id)}`)}>{item.title}</button></h3>
                    <p className="nlm-card-sub">{item.artist} · {item.genre || '—'}</p>
                  </div>
                  {user && (
                    <button className={`nlm-save-button ${savedIds.includes(item.id) ? 'is-saved' : ''}`} onClick={() => setSavedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...new Set([...ids, item.id])].slice(0, 200))} aria-label={savedIds.includes(item.id) ? `Remove ${item.title} from My List` : `Save ${item.title} to My List`}>
                      <Headphones size={15} />
                    </button>
                  )}
                  {item.id.startsWith('demo-') && <span className="nlm-demo-label">DEMO PREVIEW</span>}
                </article>
              )) : <p className="nlm-empty-state" role="status">{isLoading ? 'Loading the NLM Songs catalogue…' : catalogError ? 'The catalogue could not be reached. Check your connection and try again.' : catalog.length ? 'No tracks match this selection. Try another search or genre.' : 'No tracks have been published yet.'}</p>}
            </div>
            {!user && <div className="nlm-catalog-cta"><span>Ready when you are.</span><strong>Unlock the full NLM Songs catalog.</strong><button className="nlm-submit-button" onClick={openRegistration}>Create your free account <UserRound size={14} /></button></div>}
          </section>

          {view === 'Genres' && (
            <section className="nlm-genre-directory" aria-label="Explore catalogue genres">
              <div className="nlm-genre-directory-head"><div><span className="nlm-eyebrow">BROWSE BY SOUND</span><h2>Every mood has a home.</h2></div>{selectedGenre && <button className="nlm-genre-chip is-active" onClick={() => setSelectedGenre('')} aria-label="Clear genre filter">{selectedGenre} <span aria-hidden="true">×</span></button>}</div>
              {genreSummaries.length ? <div className="nlm-genre-directory-grid">{genreSummaries.map(({ genre, count, latest }, index) => <button key={genre} className={`nlm-genre-directory-card ${selectedGenre === genre ? 'is-active' : ''}`} onClick={() => setSelectedGenre((current) => current === genre ? '' : genre)} aria-pressed={selectedGenre === genre}>
                <span className="nlm-genre-card-art">{latest?.thumbnailUrl ? <img src={resolveAssetUrl(latest.thumbnailUrl)} alt=""/> : <Music2 size={24}/>}<small>{String(index + 1).padStart(2, '0')}</small></span>
                <span className="nlm-genre-card-copy"><strong>{genre}</strong><small>{count} {count === 1 ? 'active track' : 'active tracks'}</small>{latest && <em>Latest · {latest.title}</em>}</span>
                <ArrowUpRight size={15} className="nlm-genre-card-arrow"/>
              </button>)}</div> : <p className="nlm-empty-state">{isLoading ? 'Loading genres from the catalogue…' : catalogError ? 'Genres could not be loaded right now.' : 'Genres will appear as tracks are published.'}</p>}
            </section>
          )}

          {view === 'Home' && (
            <section className="nlm-genre-showcase" aria-label="Browse by genre">
              <div className="nlm-section-head"><div><span className="nlm-eyebrow">FIND YOUR FREQUENCY</span><h2>Choose your atmosphere</h2></div><span className="nlm-track-count">GENRES</span></div>
              <div className="nlm-genre-chips">
                {genres.map((genre) => (
                  <button key={genre} className={`nlm-genre-chip ${selectedGenre === genre ? 'is-active' : ''}`} onClick={() => handleGenreSearch(genre)} aria-pressed={selectedGenre === genre} aria-label={`Browse ${genre}`}>
                    {genre}
                  </button>
                ))}
                {selectedGenre && <button className="nlm-genre-chip" onClick={() => setSelectedGenre('')}>All genres</button>}
              </div>
            </section>
          )}

          {(view === 'Home' || view === 'Genres') && (
            <section className="nlm-fresh-section nlm-site-just-dropped" aria-label="Just dropped">
              <div className="nlm-section-head">
                <div><span className="nlm-eyebrow">JUST DROPPED</span><h2>{selectedGenre ? `Latest in ${selectedGenre}` : 'The latest release'}</h2></div>
                {selectedGenre ? <button className="nlm-genre-chip is-active" onClick={() => setSelectedGenre('')} aria-label="Clear genre filter">{selectedGenre} <span aria-hidden="true">×</span></button> : <span className="nlm-track-count">LATEST</span>}
              </div>
              {justDropped ? <button className="nlm-fresh-card" onClick={() => navigate(`/nlmsongs/track/${encodeURIComponent(justDropped.id)}`)} aria-label={`Open details for ${justDropped.title}`}>
                <span className="nlm-fresh-art">{justDropped.thumbnailUrl ? <img src={resolveAssetUrl(justDropped.thumbnailUrl)} alt="" /> : <Music2 size={20} />}</span>
                <span className="nlm-fresh-meta"><strong>{justDropped.title}</strong><small>{justDropped.artist}{justDropped.genre ? ` · ${justDropped.genre}` : ''}</small></span>
                <span className="nlm-fresh-play"><ArrowUpRight size={15} /></span>
              </button> : <p className="nlm-empty-state" role="status">{isLoading ? 'Finding the latest release…' : catalogError ? 'The catalogue could not be reached. Try again shortly.' : selectedGenre ? `No active ${selectedGenre} tracks are available yet.` : 'No active releases are available yet.'}</p>}
            </section>
          )}

          {view === 'Home' && (
            <section className="nlm-rec-section" aria-label="Recommendations">
              <div className="nlm-section-head"><div><span className="nlm-eyebrow">FOR YOUR EARS</span><h2>Because you listened</h2></div></div>
              <div className="nlm-rec-cards">
                {recommendations.map((track) => (
                  <button key={track.id} className="nlm-rec-card" onClick={() => navigate(`/nlmsongs/track/${encodeURIComponent(track.id)}`)}>
                    <span className="nlm-rec-icon">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt="" /> : <Music2 size={22} />}</span>
                    <strong>{track.title}</strong>
                    <small>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

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
