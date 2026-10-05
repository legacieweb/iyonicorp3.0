import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Headphones, Home, LogIn, LogOut, Music2, Play, Search, Sparkles, UserRound,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { nlmsongsAPI, type NLMSong } from '../../../services/api';
import { DEMO_NLM_CATALOG, DEMO_GENRES, getDemoTrack } from './demoCatalog';
import { getApiOrigin } from '../../../utils/apiUrl';
import './nlmsongs.css';

const API_ORIGIN = getApiOrigin();

type View = 'Home' | 'Genres' | 'New' | 'My List';

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
  return new URL(value, `${API_ORIGIN}/`).toString();
};

const NLMSongsSite = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('Home');
  const [tracks, setTracks] = useState<NLMSong[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nlm-saved') || '[]') as string[]; }
    catch { return []; }
  });

  const isAdminMode = user?.role === 'manager_admin' || user?.role === 'seller';
  const catalog = tracks.length ? tracks : DEMO_NLM_CATALOG;
  const featuredTrack = catalog.find((c) => c.id === selectedId) ?? catalog[0] ?? null;
  const filteredTracks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesView = view === 'Genres' ? true
        : view === 'New' ? true
        : view === 'My List' ? savedIds.includes(item.id) : true;
      const matchesSearch = !query || [item.title, item.artist, item.description, item.genre, ...item.tags]
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesView && matchesSearch && item.isActive !== false;
    });
  }, [searchQuery, catalog, view, savedIds]);

  const openAccount = () => navigate(user?.role === 'manager_admin'
    ? '/admin/dashboard'
    : user?.role === 'seller' ? '/nlmsongs/dashboard' : '/customer/dashboard');
  const signOut = () => { logout(); navigate('/nlmsongs'); };
  const openSignIn = () => navigate(`/login?redirect=${encodeURIComponent('/nlmsongs')}`);
  const openRegistration = () => navigate(`/register?role=customer&redirect=${encodeURIComponent('/nlmsongs')}`);
  const openAdmin = () => navigate('/nlmsongs/dashboard');

  const loadTracks = async () => {
    try {
      const data = await nlmsongsAPI.list();
      setTracks(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (error) {
      console.error('Could not load NLM Songs catalogue:', error);
    }
  };

  useEffect(() => { void loadTracks(); }, []);
  useEffect(() => { localStorage.setItem('nlm-saved', JSON.stringify(savedIds)); }, [savedIds]);

  const handlePlay = () => {
    if (!user && !featuredTrack?.id.startsWith('demo-')) { openRegistration(); return; }
    if (featuredTrack) navigate(`/nlmsongs/track/${encodeURIComponent(featuredTrack.id)}`);
  };

  const handleGenreSearch = (query: string) => {
    setSearchQuery(query);
    setView('Home');
    document.querySelector('.nlm-content-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`nlm-site-app ${user ? 'nlm-member-app' : 'nlm-guest-app'}`}>
      {user && <aside className="nlm-sidebar">
        <a className="nlm-brand" href="#home" onClick={(e) => { e.preventDefault(); setView('Home'); }} aria-label="NLM Songs home">
          <span className="nlm-brand-mark"><Music2 size={19} strokeWidth={2.5} /></span>
          <span>nlm<span className="nlm-brand-light">songs</span></span>
        </a>
        <nav className="nlm-nav" aria-label="Main navigation">
          <button aria-label="Home" title="Home" className={view === 'Home' ? 'is-active' : ''} onClick={() => setView('Home')}><Home size={17} strokeWidth={1.8} /><span>Home</span></button>
          <button aria-label="Genres" title="Genres" className={view === 'Genres' ? 'is-active' : ''} onClick={() => setView('Genres')}><Music2 size={17} strokeWidth={1.8} /><span>Genres</span></button>
          <button aria-label="New releases" title="New" className={view === 'New' ? 'is-active' : ''} onClick={() => setView('New')}><Sparkles size={17} strokeWidth={1.8} /><span>New</span></button>
          <button aria-label={`My list, ${savedIds.length} saved`} title="My List" className={view === 'My List' ? 'is-active' : ''} onClick={() => setView('My List')}><Headphones size={17} strokeWidth={1.8} /><span>My List</span><small>{savedIds.length}</small></button>
        </nav>
        <div className="nlm-sidebar-foot"><span className="nlm-live-dot" /> NLM SONGS</div>
      </aside>}

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

          <div className="nlm-platform-stats">
            <div className="nlm-stat-card"><span>Total tracks</span><strong>{catalog.length}</strong><small>tracks to explore</small></div>
            <div className="nlm-stat-card"><span>Genres</span><strong>{new Set(catalog.map((item) => item.genre).filter(Boolean)).size}</strong><small>distinct sounds</small></div>
            <div className="nlm-stat-card"><span>Personal library</span><strong>{savedIds.length}</strong><small>saved for later</small></div>
          </div>

          <section className="nlm-content-grid" aria-label="Catalogue">
            <div className="nlm-section-head"><div><span className="nlm-eyebrow">{view === 'My List' ? 'YOUR LIBRARY' : 'HAND-PICKED FOR YOU'}</span><h2>{view === 'Genres' ? 'Browse by sound' : view === 'New' ? 'Fresh releases' : view === 'My List' ? 'Saved for later' : 'Stories with a pulse'}</h2></div><span className="nlm-track-count">{filteredTracks.length} tracks <span>↗</span></span></div>
            <div className="nlm-grid">
              {filteredTracks.length ? filteredTracks.map((item, index) => (
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
              )) : <p className="nlm-empty-state">Nothing here yet. Try another category or search.</p>}
            </div>
            {!user && <div className="nlm-catalog-cta"><span>Ready when you are.</span><strong>Unlock the full NLM Songs catalog.</strong><button className="nlm-submit-button" onClick={openRegistration}>Create your free account <UserRound size={14} /></button></div>}
          </section>

          {view === 'Home' && (
            <section className="nlm-feature-section">
              <div className="nlm-section-head"><div><span className="nlm-eyebrow">A GOOD PLACE TO BEGIN</span><h2>Made for the way you listen</h2></div></div>
              <div className="nlm-feature-grid">
                {[
                  { label: 'Build playlists', icon: <Headphones size={24} />, detail: 'Save your favorite tracks and organize them into custom playlists.' },
                  { label: 'Queue & shuffle', icon: <Music2 size={24} />, detail: 'Reorder your next songs live with drag-and-drop queue control.' },
                  { label: 'Sleep timer', icon: <Play size={24} />, detail: 'Wind down with a timer that fades the music and shuts off.' },
                  { label: 'Equalizer', icon: <Sparkles size={24} />, detail: 'Shape the sound with a 10-band EQ and genre presets.' },
                ].map((feature) => (
                  <article key={feature.label} className="nlm-feature-card">
                    <span className="nlm-feature-icon">{feature.icon}</span>
                    <h3>{feature.label}</h3>
                    <p>{feature.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === 'Home' && (
            <section className="nlm-genre-showcase" aria-label="Browse by genre">
              <div className="nlm-section-head"><div><span className="nlm-eyebrow">FIND YOUR FREQUENCY</span><h2>Choose your atmosphere</h2></div><span className="nlm-track-count">GENRES</span></div>
              <div className="nlm-genre-chips">
                {DEMO_GENRES.map((g) => (
                  <button key={g.label} className="nlm-genre-chip" onClick={() => handleGenreSearch(g.query)} aria-label={g.label}>
                    {g.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {view === 'Home' && (
            <section className="nlm-rec-section" aria-label="Recommendations">
              <div className="nlm-section-head"><div><span className="nlm-eyebrow">FOR YOUR EARS</span><h2>Because you listened</h2></div></div>
              <div className="nlm-rec-cards">
                {DEMO_NLM_CATALOG.slice(0, 6).map((track) => (
                  <button key={track.id} className="nlm-rec-card" onClick={() => navigate(`/nlmsongs/track/${encodeURIComponent(track.id)}`)}>
                    <span className="nlm-rec-icon">{track.genre === 'Electronic' ? <Sparkles size={22} /> : <Music2 size={22} />}</span>
                    <strong>{track.title}</strong>
                    <small>{track.artist}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!user && (
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
