import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, BadgeCheck, BookmarkPlus, Film, Home, LayoutDashboard, LogIn, LogOut,
  Play, Search, Sparkles, Tv, UserRound,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ixstreamAPI, type IXStreamContent } from '../../../services/api';
import { DEMO_STREAMING_CATALOG } from './demoCatalog';
import { openIxStreamWatchMode } from './watchMode';
import './ixstream.css';

const API_ORIGIN = new URL(import.meta.env.VITE_API_URL || 'http://localhost:2823/api', window.location.origin).origin;

type View = 'Home' | 'Movies' | 'Series' | 'My List';

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
  return new URL(value, `${API_ORIGIN}/`).toString();
};

const IxStreamSite = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('Home');
  const [content, setContent] = useState<IXStreamContent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ixstream-saved') || '[]') as string[]; }
    catch { return []; }
  });

  const isAdminMode = user?.role === 'manager_admin' || user?.role === 'seller';
  const catalog = content.length ? content : DEMO_STREAMING_CATALOG;
  const featuredContent = catalog.find((c) => c.id === selectedId) ?? catalog[0] ?? null;
  const filteredContent = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesView = view === 'Movies' ? item.type === 'movie'
        : view === 'Series' ? item.type === 'tvshow'
          : view === 'My List' ? savedIds.includes(item.id) : true;
      const matchesSearch = !query || [item.title, item.description, item.genre, ...item.tags]
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesView && matchesSearch;
    });
  }, [searchQuery, catalog, view, savedIds]);

  const openAccount = () => navigate(user?.role === 'manager_admin'
    ? '/admin/dashboard'
    : user?.role === 'seller' ? '/ixstream/dashboard' : '/customer/dashboard');
  const signOut = () => { logout(); navigate('/ixstream'); };
  const openSignIn = () => navigate(`/login?redirect=${encodeURIComponent('/ixstream')}`);
  const openRegistration = () => navigate(`/register?role=customer&redirect=${encodeURIComponent('/ixstream')}`);
  const handleWatch = async () => {
    if (!user && !featuredContent?.id.startsWith('demo-')) { openRegistration(); return; }
    if (featuredContent) openIxStreamWatchMode(navigate, featuredContent.id);
  };

  const loadContent = async () => {
    try {
      const data = await ixstreamAPI.listContent();
      setContent(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (error) {
      console.error('Could not load IxStream catalogue:', error);
    }
  };

  useEffect(() => { void loadContent(); }, []);
  useEffect(() => { localStorage.setItem('ixstream-saved', JSON.stringify(savedIds)); }, [savedIds]);
  const openPlans = () => navigate('/ixstream/client');

  return (
    <div className={`ixs-app ${user ? 'ixs-member-app' : 'ixs-guest-app'}`}>
      {user && <aside className="ixs-sidebar">
        <a className="ixs-brand" href="#home" onClick={(e) => { e.preventDefault(); setView('Home'); }} aria-label="IxStream home">
          <span className="ixs-brand-mark"><Film size={20} strokeWidth={2.5} /></span>
          <span>Ix<span className="ixs-brand-light">Stream</span></span>
        </a>
        <nav className="ixs-nav" aria-label="Main navigation">
          <button aria-label="For you" title="For you" className={view === 'Home' ? 'is-active' : ''} onClick={() => setView('Home')}><Home size={17} strokeWidth={1.8} /><span>For you</span></button>
          <button aria-label="Movies" title="Movies" className={view === 'Movies' ? 'is-active' : ''} onClick={() => setView('Movies')}><Film size={17} strokeWidth={1.8} /><span>Movies</span></button>
          <button aria-label="Series" title="Series" className={view === 'Series' ? 'is-active' : ''} onClick={() => setView('Series')}><Tv size={17} strokeWidth={1.8} /><span>Series</span></button>
          <button aria-label={`My list, ${savedIds.length} saved`} title="My list" className={view === 'My List' ? 'is-active' : ''} onClick={() => setView('My List')}><BookmarkPlus size={17} strokeWidth={1.8} /><span>My list</span><small>{savedIds.length}</small></button>
        </nav>
        {user && <div className="ixs-member-card">
          <span className="ixs-member-avatar">{(user.name || user.email || 'I').charAt(0).toUpperCase()}</span>
          <span className="ixs-member-copy"><strong>{user.name || 'IxStream member'}</strong><small><BadgeCheck size={12} /> Member profile</small></span>
          <button onClick={openAccount} aria-label="Open account"><ArrowUpRight size={15} /></button>
        </div>}
        <div className="ixs-sidebar-foot"><span className="ixs-live-dot" /> {content.length ? 'YOUR SCREENING ROOM' : 'DEMO PREVIEWS ACTIVE'}</div>
      </aside>}

      <main className="ixs-main">
        <header className="ixs-topbar">
          {!user && <Link className="ixs-guest-brand" to="/ixstream" aria-label="IxStream home"><span className="ixs-brand-mark"><Film size={18} /></span><span>Ix<span className="ixs-brand-light">Stream</span></span></Link>}
          <div className="ixs-search-panel">
            <Search size={16} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search movies and shows" aria-label="Search IxStream catalogue" />
          </div>
          <div className="ixs-account-actions">
            {!user ? (
              <>
                <button className="ixs-account-button" onClick={openSignIn}><LogIn size={14} /> Sign in</button>
                <button className="ixs-auth-join" onClick={openRegistration}><UserRound size={14} /> Join IxStream</button>
              </>
            ) : (
              <>
                <span className="ixs-account-name">{user.name || user.email}</span>
                {isAdminMode && <button className="ixs-account-button" onClick={() => navigate('/ixstream/admin')}><LayoutDashboard size={14} /> Studio</button>}
                <button className="ixs-account-button" onClick={openPlans}><Sparkles size={14} /> Plans</button>
                <button className="ixs-account-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
              </>
            )}
          </div>
        </header>

        <div className="ixs-workspace">
          {!featuredContent ? (
            <section className="ixs-landing-hero">
              <div className="ixs-landing-copy">
                <span className="ixs-eyebrow">A new kind of streaming service</span>
                <h1>Stories worth staying up for.</h1>
                <p>Independent voices, ambitious originals, and the films you will want to talk about tomorrow.</p>
                <div className="ixs-hero-actions">
                  <button className="ixs-play-button" onClick={openRegistration}><UserRound size={16} /> Start watching free</button>
                  <button className="ixs-hero-secondary" onClick={() => setView('Home')}>Preview the catalog</button>
                </div>
                <small className="ixs-landing-note">Create your free account to unlock every watch preview.</small>
              </div>
              <div className="ixs-landing-art" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div>
            </section>
          ) : (
            <section className="ixs-hero">
              <div className={`ixs-hero-backdrop ${featuredContent.thumbnailUrl ? '' : `ixs-art-${Math.max(0, DEMO_STREAMING_CATALOG.findIndex((item) => item.id === featuredContent.id)) % 6}`} `}>
                {featuredContent.thumbnailUrl ? <img src={resolveAssetUrl(featuredContent.thumbnailUrl)} alt="" /> : <div className="ixs-hero-fallback"><Film size={48} /></div>}
              </div>
              <div className="ixs-hero-info">
                <span className="ixs-eyebrow"><Sparkles size={13} /> IXSTREAM PREMIERE <span>·</span> {featuredContent.type === 'movie' ? 'FEATURE FILM' : 'SERIES'}</span>
                <h1>{featuredContent.title}</h1>
                <div className="ixs-hero-meta">
                  <span>{featuredContent.releaseYear || 'New release'}</span>
                  <span className="ixs-rating">★ {featuredContent.rating ?? '—'}</span>
                  <span>{featuredContent.duration ? `${featuredContent.duration} min` : 'Feature'}</span>
                  <span className="ixs-quality">4K · HDR</span>
                </div>
                <p>{featuredContent.description || 'A premium title on IxStream.'}</p>
                <div className="ixs-hero-actions">
                  <button className="ixs-play-button" onClick={handleWatch}>
                    <Play size={16} fill="currentColor" /> Play now
                  </button>
                  <button className="ixs-hero-secondary" onClick={() => navigate(`/ixstream/show/${featuredContent.id}`)}>Details <ArrowUpRight size={15} /></button>
                </div>
              </div>
              <div className="ixs-hero-index"><span>IXS ORIGINALS</span><i /><span>{String(Math.max(catalog.length, 1)).padStart(2, '0')} TITLES</span></div>
            </section>
          )}

          <div className="ixs-platform-stats">
            <div className="ixs-stat-card"><span>Curated collection</span><strong>{catalog.length}</strong><small>stories to explore</small></div>
            <div className="ixs-stat-card"><span>Watch your way</span><strong>{catalog.filter((item) => item.type === 'movie').length} <em>films</em></strong><small>{catalog.filter((item) => item.type === 'tvshow').length} series</small></div>
            <div className="ixs-stat-card"><span>Personal library</span><strong>{savedIds.length}</strong><small>saved for later</small></div>
          </div>

          <section className="ixs-content-grid" aria-label="Catalogue">
            <div className="ixs-section-head"><div><span className="ixs-section-kicker">{view === 'My List' ? 'Your library' : 'Hand-picked for tonight'}</span><h2>{view === 'Movies' ? 'Feature films' : view === 'Series' ? 'Series to get lost in' : view === 'My List' ? 'Saved for later' : 'Stories with a pulse'}</h2></div><span className="ixs-track-count">{filteredContent.length} titles <span>↗</span></span></div>
            <div className="ixs-grid">
              {filteredContent.length ? filteredContent.map((item, index) => (
                <article key={item.id} className={`ixs-card ${selectedId === item.id ? 'is-selected' : ''}`}>
                  <button className={`ixs-card-poster ixs-art-poster ixs-art-${index % 6}`} onClick={() => navigate(`/ixstream/show/${item.id}`)} aria-label={`View ${item.title} details`}>
                    {item.thumbnailUrl ? <img src={resolveAssetUrl(item.thumbnailUrl)} alt={item.title} /> : <span className="ixs-poster-title">{item.title}</span>}
                    <span className="ixs-card-type">{item.type === 'movie' ? 'FILM' : 'SERIES'}</span>
                    {item.id.startsWith('demo-') && <span className="ixs-demo-label">DEMO PREVIEW</span>}
                  </button>
                  <button className={`ixs-save-button ${savedIds.includes(item.id) ? 'is-saved' : ''}`} onClick={() => setSavedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} aria-label={savedIds.includes(item.id) ? `Remove ${item.title} from My List` : `Save ${item.title} to My List`}><BookmarkPlus size={15} /></button>
                  <h3><button onClick={() => navigate(`/ixstream/show/${item.id}`)}>{item.title}</button></h3>
                  <p className="ixs-card-meta">{item.genre || '—'} · {item.releaseYear || ''}</p>
                </article>
              )) : <p className="ixs-empty-state">Nothing here yet. Try another category or search.</p>}
            </div>
            {!user && <div className="ixs-catalog-cta"><span>Ready when you are.</span><strong>Unlock the full IxStream catalog.</strong><button className="ixs-submit-button" onClick={openRegistration}>Create your free account <UserRound size={14} /></button></div>}
          </section>

          <section className="ixs-mood-section">
            <div className="ixs-section-head"><div><span className="ixs-section-kicker">A good place to begin</span><h2>Choose your atmosphere</h2></div><span className="ixs-track-count">THREE WAYS IN</span></div>
            <div className="ixs-mood-grid">
              {[
                { label: 'Uncharted worlds', detail: 'Big questions. Strange signals. New horizons.', query: 'sci-fi', art: 0, number: '01' },
                { label: 'Secrets after dark', detail: 'Follow the clue before the lights come up.', query: 'mystery', art: 3, number: '02' },
                { label: 'Closer to earth', detail: 'Real places, living worlds, fresh perspective.', query: 'documentary', art: 5, number: '03' },
              ].map((mood) => <button className={`ixs-mood-item ixs-art-${mood.art}`} key={mood.label} onClick={() => {
                setSearchQuery(mood.query);
                setView('Home');
                document.querySelector('.ixs-content-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}><span className="ixs-mood-number">{mood.number} / MOOD</span><span className="ixs-mood-copy"><strong>{mood.label}</strong><small>{mood.detail}</small></span><ArrowUpRight size={18} /></button>)}
            </div>
          </section>

          <section className="ixs-home-guide">
            <div className="ixs-home-guide-heading"><span className="ixs-section-kicker">Made for the way you watch</span><h2>One more episode.<br />One less decision.</h2></div>
            <div className="ixs-home-guide-steps">
              <article><span>01</span><h3>Find your story</h3><p>Search by title, browse films and series, or start with a mood.</p></article>
              <article><span>02</span><h3>Make it a night</h3><p>Open a title for its trailer, synopsis, and episode guide.</p></article>
              <article><span>03</span><h3>Keep it close</h3><p>Add a favorite to My List and come back whenever you are ready.</p></article>
            </div>
          </section>

          {!user && <section className="ixs-home-signup">
            <div><span className="ixs-section-kicker">Your next watch starts here</span><h2>Make room for a new favorite.</h2><p>Create an IxStream account to keep your list close across visits.</p></div>
            <button className="ixs-play-button" onClick={openRegistration}>Join IxStream <ArrowUpRight size={16} /></button>
          </section>}
        </div>

      </main>
    </div>
  );
};

export default IxStreamSite;
