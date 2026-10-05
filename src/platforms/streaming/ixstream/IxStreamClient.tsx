import { useEffect, useRef, useState } from 'react';
import {
  Film, Tv, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Search, LogIn, LogOut, LayoutDashboard, UserRound, X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ixstreamAPI, type IXStreamContent, type IXStreamSubscription } from '../../../services/api';
import { openIxStreamWatchMode } from './watchMode';
import { getApiOrigin } from '../../../utils/apiUrl';
import './ixstream.css';

const API_ORIGIN = getApiOrigin();

const IxStreamClient = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<IXStreamContent[]>([]);
  const [selected, setSelected] = useState<IXStreamContent | null>(null);
  const [search, setSearch] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [subscriptions, setSubscriptions] = useState<IXStreamSubscription[]>([]);
  const [showPlans, setShowPlans] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSub = subscriptions.find((s) => s.status === 'active') ?? null;

  const resolveUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
    return new URL(value, `${API_ORIGIN}/`).toString();
  };

  const loadContent = async () => {
    try {
      const data = await ixstreamAPI.listContent();
      setContent(data);
      if (id) {
        const found = data.find((c) => c.id === id) ?? null;
        setSelected(found);
      } else if (data.length && !selected) {
        setSelected(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubscriptions = async () => {
    if (!user) return;
    try {
      const data = await ixstreamAPI.getUserSubscriptions();
      setSubscriptions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { void loadContent(); void loadSubscriptions(); }, []);

  const togglePlayback = async () => {
    if (!videoRef.current) return;
    try {
      if (videoRef.current.paused) await videoRef.current.play();
      else videoRef.current.pause();
    } catch { setIsPlaying(false); }
  };

  const openAccount = () => navigate(user?.role === 'manager_admin'
    ? '/admin/dashboard'
    : user?.role === 'seller' ? '/ixstream/dashboard'
    : '/customer/dashboard');
  const openPlans = () => setShowPlans(true);
  const closePlans = () => setShowPlans(false);
  const signOut = () => { logout(); navigate('/ixstream'); };
  const openSignIn = () => navigate(`/login?redirect=${encodeURIComponent('/ixstream')}`);
  const openRegistration = () => navigate(`/register?role=customer&redirect=${encodeURIComponent('/ixstream')}`);

  const filtered = search.trim()
    ? content.filter((c) => [c.title, c.description, c.genre, ...c.tags].some((v) => String(v).toLowerCase().includes(search.toLowerCase())))
    : content;

  return (
    <div className="ixs-app">
      <video ref={videoRef} crossOrigin="anonymous" preload="metadata"
        src={resolveUrl(selected?.videoUrl)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <aside className="ixs-sidebar">
        <a className="ixs-brand" href="#home" onClick={(e) => { e.preventDefault(); setSelected(null); navigate('/ixstream'); }} aria-label="IxStream">
          <span className="ixs-brand-mark"><Film size={20} strokeWidth={2.5} /></span>
          <span>Ix<span className="ixs-brand-light">Stream</span></span>
        </a>
        <nav className="ixs-nav" aria-label="Navigation">
          <a href="#movies" onClick={(e) => { e.preventDefault(); setContent(content); }}><Film size={17} />Movies</a>
          <a href="#shows" onClick={(e) => { e.preventDefault(); setContent(content.filter((c) => c.type === 'tvshow')); }}><Tv size={17} />TV Shows</a>
        </nav>
        <div className="ixs-sidebar-foot"><span className="ixs-live-dot" /> PREMIUM STREAMING</div>
      </aside>

      <main className="ixs-main">
        <header className="ixs-topbar">
          <div className="ixs-search-panel">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles" aria-label="Search" />
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
                {activeSub && <span className="ixs-sub-badge">SUBSCRIBED</span>}
                {!activeSub && <button className="ixs-account-button" onClick={openPlans}><LayoutDashboard size={14} /> Plans</button>}
                <button className="ixs-account-button" onClick={openAccount}><LayoutDashboard size={14} /> Dashboard</button>
                <button className="ixs-account-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
              </>
            )}
          </div>
        </header>

        <div className="ixs-workspace">
          {!selected ? (
            <>
              <section className="ixs-hero">
                <div className="ixs-hero-placeholder"><Film size={64} /><p>Browse our premium catalogue</p></div>
              </section>
              <div className="ixs-grid">
                {filtered.length ? filtered.map((item) => (
                  <article key={item.id} className="ixs-card" onClick={() => { setSelected(item); navigate(`/ixstream/client/${item.id}`); }}>
                    <div className="ixs-card-poster">{item.thumbnailUrl ? <img src={resolveUrl(item.thumbnailUrl)} alt="" /> : <Film size={32} />}</div>
                    <h3>{item.title}</h3>
                    <p className="ixs-card-meta">{item.type} · {item.genre || '—'}</p>
                  </article>
                )) : <p className="ixs-empty-state">No titles found.</p>}
              </div>
            </>
          ) : (
            <section className="ixs-hero">
              <div className="ixs-hero-poster">{selected.thumbnailUrl ? <img src={resolveUrl(selected.thumbnailUrl)} alt={selected.title} /> : <Film size={48} />}</div>
              <div className="ixs-hero-info">
                <span className="ixs-eyebrow">{selected.type.toUpperCase()} · {selected.genre || 'Featured'}</span>
                <h1>{selected.title}</h1>
                <p>{selected.description || 'A premium title on IxStream.'}</p>
                <div className="ixs-hero-actions">
                  <button className="ixs-play-button" onClick={() => openIxStreamWatchMode(navigate, selected.id)}>
                    <Play size={16} fill="currentColor" /> Watch now
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        <footer className="ixs-player-bar" aria-label="Video player">
          <div className="ixs-now-playing">
            <span className="ixs-player-poster">{selected?.thumbnailUrl ? <img src={resolveUrl(selected.thumbnailUrl)} alt="" /> : <Film size={16} />}</span>
            <span><strong>{selected?.title || 'Nothing playing'}</strong><small>{selected?.type || 'Choose a title'}</small></span>
          </div>
          <div className="ixs-playback">
            <div className="ixs-transport">
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }} disabled={!selected} aria-label="Restart"><SkipBack size={16} fill="currentColor" /></button>
              <button className="ixs-play-button-small" onClick={togglePlayback} disabled={!selected}>{isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
              <button onClick={() => { if (videoRef.current && duration) videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration); }} disabled={!selected} aria-label="Skip forward"><SkipForward size={16} fill="currentColor" /></button>
            </div>
            <div className="ixs-seek-row">
              <span>{formatTime(currentTime)}</span>
              <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(e) => { const t = Number(e.target.value); setCurrentTime(t); if (videoRef.current) videoRef.current.currentTime = t; }} disabled={!selected} aria-label="Seek" />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="ixs-player-tools">
            <div className="ixs-volume"><button onClick={() => setVolume((v) => v === 0 ? 0.7 : 0)} aria-label={volume === 0 ? 'Unmute' : 'Mute'}>{volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button><input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" /></div>
          </div>
        </footer>
      </main>

      {showPlans && (
        <div className="ixs-modal-backdrop" onClick={closePlans}>
          <div className="ixs-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Subscription plans</h2>
            <IxStreamPlansView />
            <button onClick={closePlans} className="ixs-ghost-button"><X size={14} /> Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const IxStreamPlansView = () => {
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => { void ixstreamAPI.listPlans().then(setPlans).catch(() => setPlans([])); }, []);
  const handleSubscribe = async (planId: string) => {
    try { const sub = await ixstreamAPI.subscribe(planId); console.log('Subscribed', sub); }
    catch (e) { console.error(e); }
  };
  return (
    <div className="ixs-plans-grid">
      {plans.map((p) => (
        <div key={p.id} className="ixs-plan-card">
          <h3>{p.name}</h3>
          <p className="ixs-plan-price">${(p.priceCents / 100).toFixed(2)}</p>
          <ul>{p.features.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
          <button onClick={() => handleSubscribe(p.id)} className="ixs-submit-button">Subscribe</button>
        </div>
      ))}
    </div>
  );
};

export default IxStreamClient;
