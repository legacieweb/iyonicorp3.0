import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Activity, ArrowUpRight, CreditCard, Disc3, FileAudio2, Globe, Headphones, LayoutDashboard, LogOut, Music2, Plus, RefreshCw, Search, Settings, Trash2, Upload, UserRound, Users, X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { nlmsongsAPI, sellersAPI, type NLMSong, type NLMSongsAdminAnalytics } from '../../../services/api';
import { getApiOrigin } from '../../../utils/apiUrl';
import { genreIdentity, normalizeGenreName } from './utils';
import NLMMobileNavControls from './components/NLMMobileNavControls';
import './nlmsongs.css';

const API_ORIGIN = getApiOrigin();

type Tab = 'overview' | 'catalogue' | 'uploads' | 'settings' | 'account' | 'billing' | 'listeners' | 'access' | 'plans';

const resolveAssetUrl = (value?: string) => {
  if (!value) return '';
  if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
  return new URL(value, `${API_ORIGIN}/`).toString();
};

const metricNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMetric = (value: unknown) => metricNumber(value)?.toLocaleString() ?? '—';
const formatListeningTime = (value: number | null) => {
  if (value === null || value <= 0) return value === null ? '—' : '0m';
  const seconds = Math.floor(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${seconds % 60}s`;
};

const NLMSongsAdmin = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<Tab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tracks, setTracks] = useState<NLMSong[]>([]);
  const [analytics, setAnalytics] = useState<NLMSongsAdminAnalytics | null>(null);
  const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [existingCoverUrl, setExistingCoverUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seller, setSeller] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [listeners, setListeners] = useState<any[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState({ name: '', description: '', price: '0', currency: 'USD', intervalDays: '30', features: ['streaming'], monthlyPlays: '', playlistLimit: '', offlineLimit: '', deviceDownloadLimit: '' });
  const [settingsError, setSettingsError] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [featureCatalog, setFeatureCatalog] = useState<string[]>(['streaming', 'playlists', 'offline_listening', 'device_downloads', 'lyrics', 'equalizer']);
  const [listenerQuery, setListenerQuery] = useState('');

  const isSubmittingRef = useRef(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigateAdminTab = (nextTab: Tab) => {
    setTab(nextTab);
    closeMobileNav();
  };

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const [songs, stats] = await Promise.all([nlmsongsAPI.listAdmin(), nlmsongsAPI.getAdminAnalytics().catch(() => null)]);
      setTracks(songs);
      setAnalytics(stats);
      setAnalyticsUnavailable(!stats);
    } catch (error) {
      console.error('Could not load NLMSongs admin catalogue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadTracks(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference') || params.get('trxref');
    const planId = params.get('plan');
    if (location.pathname !== '/nlmsongs/dashboard' || !reference || !planId) return;
    setTab('billing'); setSavingSettings(true); setSettingsError('');
    void sellersAPI.verifySubscriptionPaystack(reference, planId)
      .then(async (result) => { setSettingsNotice(result?.message || 'Paystack payment confirmed.'); setBilling(await sellersAPI.getBilling()); navigate('/nlmsongs/dashboard', { replace: true }); })
      .catch((error: any) => setSettingsError(error?.response?.data?.message || 'We could not confirm the Paystack payment.'))
      .finally(() => setSavingSettings(false));
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!['settings', 'account', 'billing', 'listeners', 'access', 'plans'].includes(tab)) return;
    setSettingsError(''); setSettingsNotice('');
    const loadManagement = async () => {
      try {
        if (['settings', 'billing'].includes(tab)) {
          const profile = await sellersAPI.getMe();
          setSeller(profile); setSubdomain(profile.subdomain || '');
          if (tab === 'billing') setBilling(await sellersAPI.getBilling());
        }
        if (tab === 'listeners' || tab === 'access') {
          setListeners(await nlmsongsAPI.getListeners());
          if (tab === 'access') {
            const configured = await nlmsongsAPI.getAccessFeatures();
            setFeatureCatalog((items) => [...new Set([...items, ...configured.map((feature) => feature.featureKey)])]);
          }
        }
        if (tab === 'plans') {
          const [plans, configured] = await Promise.all([nlmsongsAPI.getAdminSubscriptionPlans(), nlmsongsAPI.getAccessFeatures()]);
          setSubscriptionPlans(plans);
          setFeatureCatalog((items) => [...new Set([...items, ...configured.map((feature) => feature.featureKey)])]);
        }
      } catch (error: any) {
        setSettingsError(error?.response?.data?.message || 'This section could not be loaded for this account.');
      }
    };
    void loadManagement();
  }, [tab, user?.role]);

  useEffect(() => {
    if (!coverFile) { setCoverPreview(''); return; }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const openAccount = () => { setTab('overview'); closeMobileNav(); };
  const signOut = () => { logout(); navigate('/nlmsongs'); };

  const resetForm = () => {
    setTitle(''); setArtist(''); setDescription(''); setGenre(''); setTags('');
    setLyrics(''); setAudioFile(null); setCoverFile(null); setCoverPreview('');
    setExistingCoverUrl('');
    setFormError(''); setEditingId(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormError('');
    setIsSubmitting(true);
    if (!title.trim()) { setFormError('Add a track title.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!editingId && !audioFile) { setFormError('Choose an audio file.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    const supportedExtension = !audioFile || /\.(mp3|wav|m4a)$/i.test(audioFile.name);
    if (!supportedExtension) { setFormError('Choose an MP3, WAV, or M4A file.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (coverFile && !coverFile.type.startsWith('image/')) { setFormError('The cover must be an image.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      const optionalFields = {
        artist: artist.trim(),
        description: description.trim(),
        genre: normalizeGenreName(genre),
        tags: tags.trim(),
        lyrics: lyrics.trim(),
      };
      Object.entries(optionalFields).forEach(([field, value]) => {
        if (value) formData.append(field, value);
      });
      if (audioFile) formData.append('audio', audioFile);
      if (coverFile) formData.append('thumbnail', coverFile);

      if (editingId) {
        const updated = await nlmsongsAPI.update(editingId, formData);
        setTracks((prev) => prev.map((t) => t.id === editingId ? updated : t));
      } else {
        const created = await nlmsongsAPI.create(formData);
        setTracks((prev) => [created, ...prev]);
      }
      resetForm();
      setTab('catalogue');
    } catch (error: any) {
      console.error('Could not save track:', error);
      setFormError(error?.response?.data?.message || 'Could not save this track. Try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this track? This cannot be undone.')) return;
    try {
      await nlmsongsAPI.remove(id);
      setTracks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Could not delete track:', error);
    }
  };

  const startEdit = (track: NLMSong) => {
    setEditingId(track.id);
    setTitle(track.title);
    setArtist(track.artist || '');
    setDescription(track.description || '');
    setGenre(track.genre || '');
    setTags(Array.isArray(track.tags) ? track.tags.join(', ') : '');
    setLyrics(track.lyrics || '');
    setCoverPreview('');
    setExistingCoverUrl(track.thumbnailUrl ? resolveAssetUrl(track.thumbnailUrl) : '');
    setCoverFile(null);
    setFormError('');
    setTab('uploads');
  };

  const filtered = search.trim()
    ? tracks.filter((t) => [t.title, t.artist, t.genre, t.description, ...(Array.isArray(t.tags) ? t.tags : [])]
      .some((v) => String(v).toLowerCase().includes(search.toLowerCase())))
    : tracks;

  const saveSubdomain = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingSettings(true); setSettingsError(''); setSettingsNotice('');
    try { const updated = await sellersAPI.updateMe({ subdomain: subdomain.trim(), shopType: 'streaming' } as any); setSeller(updated); setSubdomain(updated.subdomain || subdomain.trim()); setSettingsNotice('Your NLM Songs address is ready. Open it at ' + (updated.subdomain || subdomain.trim()) + '.iyonicorp.com.'); }
    catch (error: any) { setSettingsError(error?.response?.data?.message || 'Could not update the subdomain.'); }
    finally { setSavingSettings(false); }
  };

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingSettings(true); setSettingsError(''); setSettingsNotice('');
    const form = new FormData(event.currentTarget);
    try { await updateProfile({ name: String(form.get('name') || '').trim(), phoneNumber: String(form.get('phone') || '').trim() }); setSettingsNotice('Account details saved.'); }
    catch (error: any) { setSettingsError(error?.response?.data?.message || 'Could not save account details.'); }
    finally { setSavingSettings(false); }
  };

  const payWithWallet = async (planId: string) => {
    setSettingsError(''); setSettingsNotice(''); setSavingSettings(true);
    try { const result = await sellersAPI.paySubscriptionWithWallet(planId); setSettingsNotice(result?.message || 'Subscription updated using your IyonicPay wallet.'); setBilling(await sellersAPI.getBilling()); }
    catch (error: any) { setSettingsError(error?.response?.data?.message || 'IyonicPay wallet payment could not be completed.'); }
    finally { setSavingSettings(false); }
  };

  const payWithPaystack = async (planId: string) => {
    setSettingsError(''); setSavingSettings(true);
    try { const result = await sellersAPI.initializeSubscriptionPaystack(planId); if (!result?.authorizationUrl) throw new Error('Paystack checkout is unavailable.'); window.location.assign(result.authorizationUrl); }
    catch (error: any) { setSettingsError(error?.response?.data?.message || error?.message || 'Could not start Paystack checkout.'); setSavingSettings(false); }
  };

  const updateAccess = async (listener: any, tier: string, features: string[]) => {
    const access = { ...(listener.access || {}), tier, features, limits: listener.access?.limits || {} };
    try { await nlmsongsAPI.updateListenerAccess(listener.id, access); setListeners((items) => items.map((row) => row.id === listener.id ? { ...row, access } : row)); setSettingsNotice(`Access saved for ${listener.name || listener.email}.`); }
    catch (error: any) { setSettingsError(error?.response?.data?.message || 'Could not save listener access.'); }
  };

  const savePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingSettings(true); setSettingsError(''); setSettingsNotice('');
    const plan = {
      name: planDraft.name.trim(), description: planDraft.description.trim(), price: Number(planDraft.price), currency: planDraft.currency,
      intervalDays: Number(planDraft.intervalDays), features: planDraft.features,
      limits: Object.fromEntries([['monthlyPlays', planDraft.monthlyPlays], ['playlistLimit', planDraft.playlistLimit], ['offlineLimit', planDraft.offlineLimit], ['deviceDownloadLimit', planDraft.deviceDownloadLimit]].filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)])),
      isActive: true,
    };
    try {
      const saved = editingPlanId ? await nlmsongsAPI.updateSubscriptionPlan(editingPlanId, plan) : await nlmsongsAPI.createSubscriptionPlan(plan);
      setSubscriptionPlans((items) => editingPlanId ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      setEditingPlanId(null); setPlanDraft({ name: '', description: '', price: '0', currency: 'USD', intervalDays: '30', features: ['streaming'], monthlyPlays: '', playlistLimit: '', offlineLimit: '', deviceDownloadLimit: '' });
      setSettingsNotice(`${saved.name} plan saved.`);
    } catch (error: any) { setSettingsError(error?.response?.data?.message || 'Could not save this subscription plan.'); }
    finally { setSavingSettings(false); }
  };

  const editPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanDraft({ name: plan.name || '', description: plan.description || '', price: String(plan.price ?? 0), currency: plan.currency || 'USD', intervalDays: String(plan.intervalDays || 30), features: plan.features || [], monthlyPlays: plan.limits?.monthlyPlays == null ? '' : String(plan.limits.monthlyPlays), playlistLimit: plan.limits?.playlistLimit == null ? '' : String(plan.limits.playlistLimit), offlineLimit: plan.limits?.offlineLimit == null ? '' : String(plan.limits.offlineLimit), deviceDownloadLimit: plan.limits?.deviceDownloadLimit == null ? '' : String(plan.limits.deviceDownloadLimit) });
  };

  const archivePlan = async (plan: any) => {
    if (!confirm(`Archive ${plan.name}? Existing subscriptions keep their saved period, but new listeners cannot choose it.`)) return;
    try { await nlmsongsAPI.archiveSubscriptionPlan(plan.id); setSubscriptionPlans((items) => items.filter((item) => item.id !== plan.id)); setSettingsNotice(`${plan.name} archived.`); }
    catch (error: any) { setSettingsError(error?.response?.data?.message || 'Could not archive this plan.'); }
  };

  return (
    <div className={`nlm-admin-app ${mobileNavOpen ? 'nlm-mobile-nav-open' : ''}`}>
      <NLMMobileNavControls isOpen={mobileNavOpen} onToggle={() => setMobileNavOpen((open) => !open)} onClose={closeMobileNav} sidebarId="nlm-admin-sidebar" />
      <aside
        className={`nlm-admin-sidebar ${mobileNavOpen ? 'open' : ''}`}
        id="nlm-admin-sidebar"
        aria-label="NLM Songs admin navigation"
        role={mobileNavOpen ? 'dialog' : undefined}
        aria-modal={mobileNavOpen || undefined}
      >
        <a className="nlm-brand" href="#catalogue" onClick={(e) => { e.preventDefault(); navigateAdminTab('catalogue'); setEditingId(null); resetForm(); }} aria-label="NLM Songs admin">
          <span className="nlm-brand-mark"><Music2 size={20} strokeWidth={2.5} /></span>
          <span>nlm<span className="nlm-brand-light">songs</span></span>
        </a>
        <nav className="nlm-admin-nav" aria-label="Admin navigation">
          <button className={tab === 'overview' ? 'is-active' : ''} onClick={() => navigateAdminTab('overview')}><Activity size={17} />Overview</button>
          <button className={tab === 'catalogue' ? 'is-active' : ''} onClick={() => navigateAdminTab('catalogue')}><Disc3 size={17} />Catalogue</button>
          <button className={tab === 'uploads' ? 'is-active' : ''} onClick={() => navigateAdminTab('uploads')}><Upload size={17} />Uploads</button>
          <span className="nlm-admin-nav-label">STUDIO MANAGEMENT</span>
          <button className={tab === 'settings' ? 'is-active' : ''} onClick={() => navigateAdminTab('settings')}><Globe size={17} />Domain</button>
          <button className={tab === 'account' ? 'is-active' : ''} onClick={() => navigateAdminTab('account')}><UserRound size={17} />Account</button>
          <button className={tab === 'billing' ? 'is-active' : ''} onClick={() => navigateAdminTab('billing')}><CreditCard size={17} />Billing</button>
          <button className={tab === 'listeners' ? 'is-active' : ''} onClick={() => navigateAdminTab('listeners')}><Users size={17} />Listeners</button>
          <button className={tab === 'plans' ? 'is-active' : ''} onClick={() => navigateAdminTab('plans')}><CreditCard size={17} />Subscription plans</button>
          <button className={tab === 'access' ? 'is-active' : ''} onClick={() => navigateAdminTab('access')}><Settings size={17} />Access & plans</button>
        </nav>
        <div className="nlm-admin-sidebar-foot"><span className="nlm-live-dot" /> ADMIN DASHBOARD</div>
      </aside>

      <main className="nlm-admin-main">
        <header className="nlm-admin-topbar">
          <div className="nlm-location"><span>ADMIN</span><span className="nlm-location-slash">/</span><span>{tab.toUpperCase()}</span></div>
          <div className="nlm-account-actions">
            <span className="nlm-account-name">{user?.name || user?.email}</span>
            <button className="nlm-account-button" onClick={() => void loadTracks()} disabled={isLoading} aria-label="Refresh catalogue"><RefreshCw size={14} className={isLoading ? 'nlm-spin' : ''} /> Refresh</button>
            <button className="nlm-account-button" onClick={openAccount} aria-label="Open dashboard"><LayoutDashboard size={14} /> Dashboard</button>
            <button className="nlm-account-button" onClick={signOut} aria-label="Sign out"><LogOut size={14} /> Sign out</button>
          </div>
        </header>

        <div className="nlm-admin-workspace">
          {tab === 'overview' && (() => {
            const activeTracks = tracks.filter((track) => track.isActive !== false);
            const genreCount = new Set(tracks.map((track) => genreIdentity(track.genre)).filter(Boolean)).size;
            const recentTracks = tracks.filter((track) => track.createdAt && Date.now() - new Date(track.createdAt).getTime() <= 30 * 86400000).slice(0, 4);
            const analyticsPayload = analytics as (NLMSongsAdminAnalytics & Record<string, any>) | null;
            const summary = (analyticsPayload?.summary ?? analyticsPayload?.data?.summary ?? {}) as Record<string, unknown>;
            const readMetric = (camelKey: string, snakeKey: string) => metricNumber(summary[camelKey] ?? summary[snakeKey]);
            const totalPlays30d = readMetric('playsLast30Days', 'plays_last_30_days');
            const listeners30d = readMetric('listenersLast30Days', 'listeners_last_30_days');
            const lifetimePlays = readMetric('totalPlays', 'total_plays');
            const listeningSeconds = readMetric('listeningSeconds', 'listening_seconds');
            const dailySource = analyticsPayload?.dailyPlays ?? analyticsPayload?.daily_plays ?? analyticsPayload?.data?.dailyPlays ?? [];
            const daily = Array.isArray(dailySource) ? dailySource.flatMap((entry: any) => {
              const day = entry?.day ?? entry?.date;
              const plays = metricNumber(entry?.plays ?? entry?.count);
              return day && plays !== null ? [{ day: String(day), plays }] : [];
            }) : [];
            const topTracksSource = analyticsPayload?.topTracks ?? analyticsPayload?.top_tracks ?? analyticsPayload?.data?.topTracks ?? [];
            const topTracks = Array.isArray(topTracksSource) ? topTracksSource.filter((track: any) => track && typeof track === 'object') : [];
            const maxPlays = Math.max(1, ...daily.map((item) => item.plays));
            return <section className="nlm-admin-overview">
              <div className="nlm-admin-overview-head">
                <div><span className="nlm-eyebrow">YOUR MUSIC, IN FOCUS</span><h1>Overview</h1><p>A clear read on your catalogue and how listeners are finding it.</p></div>
                <div className="nlm-admin-quick-actions"><button className="nlm-submit-button" onClick={() => { resetForm(); setTab('uploads'); }}><Plus size={15} /> Add a track</button><button className="nlm-account-button" onClick={() => navigate('/nlmsongs/listen')}><Headphones size={15} /> Open player <ArrowUpRight size={13} /></button></div>
              </div>
              <div className="nlm-admin-metrics">
                <article><span>Catalogue</span><strong>{tracks.length}</strong><small>{activeTracks.length} active tracks</small></article>
                <article><span>Genres</span><strong>{genreCount}</strong><small>Across your catalogue</small></article>
                <article><span>Plays · 30 days</span><strong>{formatMetric(totalPlays30d)}</strong><small>{listeners30d === null ? 'Listener count unavailable' : `${listeners30d.toLocaleString()} listeners`}</small></article>
                <article><span>Listening time</span><strong>{formatListeningTime(listeningSeconds)}</strong><small>{listeningSeconds === null ? 'No listening time recorded' : 'Recorded across all plays'}</small></article>
              </div>
              {analyticsUnavailable && <p className="nlm-analytics-note" role="status">Listener metrics could not be loaded. Catalogue figures remain available.</p>}
              <div className="nlm-admin-insights-grid">
                <section className="nlm-admin-insight-card nlm-admin-listens-card"><header><div><span className="nlm-eyebrow">LAST 30 DAYS</span><h2>Listening activity</h2></div><span className="nlm-admin-card-note">{lifetimePlays === null ? 'No activity data' : `${lifetimePlays.toLocaleString()} lifetime plays`}</span></header>
                  {daily.length ? <div className="nlm-admin-chart" role="img" aria-label="Daily listening plays over the last 30 days">{daily.map((item) => <div className="nlm-admin-chart-column" key={item.day} title={`${new Date(item.day).toLocaleDateString()}: ${item.plays} plays`}><span style={{ height: `${Math.max(5, item.plays / maxPlays * 100)}%` }} /><small>{new Date(item.day).toLocaleDateString(undefined, { day: 'numeric' })}</small></div>)}</div> : <div className="nlm-admin-chart-empty">{analytics ? 'No listening history recorded in the last 30 days.' : 'Listening activity will appear when authorized metrics are available.'}</div>}
                </section>
                <section className="nlm-admin-insight-card"><header><div><span className="nlm-eyebrow">AUDIENCE FAVORITES</span><h2>Most played</h2></div></header>
                  {topTracks.length ? <div className="nlm-admin-top-tracks">{topTracks.map((track: any, index: number) => <article key={track.id || `${track.title || 'track'}-${index}`}><span className="nlm-admin-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{track.title || 'Untitled track'}</strong><small>{track.artist || 'NLM Studio'}{track.genre ? ` · ${track.genre}` : ''}</small></div><span className="nlm-admin-play-count">{formatMetric(track.plays ?? track.play_count)} <small>plays</small></span></article>)}</div> : <div className="nlm-admin-chart-empty">{analytics ? 'Your first plays will show up here.' : 'Top tracks are unavailable without listener metrics.'}</div>}
                </section>
              </div>
              <section className="nlm-admin-insight-card nlm-admin-recent-card"><header><div><span className="nlm-eyebrow">RECENTLY ADDED</span><h2>Latest in your catalogue</h2></div><button className="nlm-ghost-button" onClick={() => setTab('catalogue')}>View catalogue <ArrowUpRight size={13}/></button></header>
                {recentTracks.length ? <div className="nlm-admin-recent-tracks">{recentTracks.map((track) => <article key={track.id}><span className="nlm-admin-track-art">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt=""/> : <Music2 size={17}/>}</span><span><strong>{track.title}</strong><small>{track.artist || 'NLM Studio'} · {normalizeGenreName(track.genre) || 'Uncategorized'}</small></span><time>{new Date(track.createdAt).toLocaleDateString()}</time></article>)}</div> : <div className="nlm-admin-chart-empty">{tracks.length ? 'No recent additions in the past 30 days.' : 'Your uploaded tracks will appear here.'}</div>}
              </section>
            </section>;
          })()}
          {tab === 'catalogue' && (
            <section className="nlm-section">
              <div className="nlm-section-head">
                <div><span className="nlm-eyebrow">CATALOGUE</span><h2>Published tracks</h2></div>
                <span className="nlm-track-count">{filtered.length} TRACKS</span>
              </div>
              <div className="nlm-search-panel">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tracks, artists, genres..."
                  aria-label="Search admin catalogue"
                />
              </div>
              {isLoading ? (
                <div className="nlm-empty-library" role="status"><span className="nlm-empty-icon"><FileAudio2 size={21} /></span><div><h3>Loading catalogue…</h3></div></div>
              ) : filtered.length ? (
                <div className="nlm-admin-catalogue-list" aria-label="Published tracks">
                  {filtered.map((track, index) => (
                    <article className="nlm-admin-catalogue-item" key={track.id}>
                      <span className="nlm-admin-catalogue-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="nlm-admin-catalogue-art">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt="" loading="lazy" /> : <Music2 size={18} />}</span>
                      <div className="nlm-admin-catalogue-copy">
                        <strong>{track.title || 'Untitled track'}</strong>
                        <span>{track.artist || 'NLM Studio'}<i>·</i>{normalizeGenreName(track.genre) || 'Uncategorized'}</span>
                        {Array.isArray(track.tags) && track.tags.length > 0 && <small>{track.tags.slice(0, 3).join(' · ')}</small>}
                      </div>
                      <span className={`nlm-admin-catalogue-status ${track.isActive === false ? 'is-inactive' : ''}`}><i />{track.isActive === false ? 'Hidden' : 'Published'}</span>
                      <div className="nlm-admin-catalogue-actions">
                        <button className="nlm-ghost-button" onClick={() => startEdit(track)} aria-label={`Edit ${track.title}`}><Disc3 size={14} /><span>Edit</span></button>
                        <button className="nlm-ghost-button" onClick={() => handleDelete(track.id)} aria-label={`Delete ${track.title}`}><Trash2 size={14} /><span>Delete</span></button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="nlm-empty-library"><span className="nlm-empty-icon"><FileAudio2 size={23} /></span>
                  <div><h3>No tracks published yet.</h3><p>Upload your first song from the Uploads tab.</p></div>
                  <button onClick={() => setTab('uploads')}><Plus size={15} /> Add a track</button>
                </div>
              )}
            </section>
          )}

          {tab === 'uploads' && (
            <section className="nlm-upload-panel" aria-labelledby="nlm-upload-title">
              <div className="nlm-form-heading">
                <div><span className="nlm-eyebrow">LOCAL FILES ONLY</span><h2 id="nlm-upload-title">{editingId ? 'Edit track' : 'Add to your room'}</h2></div>
                <button className="nlm-icon-button" onClick={() => { setTab('catalogue'); setEditingId(null); resetForm(); }} aria-label="Close uploads"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate} noValidate>
                <div className="nlm-form-fields">
                  <label>Track title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name this track" maxLength={100} required /></label>
                  <label><span className="nlm-input-label">Artist <small>OPTIONAL</small></span><input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist name" maxLength={100} /></label>
                </div>
                <div className="nlm-form-fields">
                  <label>Genre<input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Afrobeat, Gospel, Pop..." maxLength={100} /></label>
                  <label><span className="nlm-input-label">Tags <small>OPTIONAL</small></span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="love, sunrise, mellow" maxLength={200} /></label>
                </div>
                <label className="nlm-lyrics-field"><span className="nlm-input-label">Description <small>OPTIONAL</small></span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the feel, story, or theme of the song." rows={2} /></label>
                <div className="nlm-file-fields">
                  <label className="nlm-file-picker"><span className="nlm-file-icon"><FileAudio2 size={18} /></span><span><strong>{audioFile?.name || (editingId ? 'Keep current audio' : 'Choose an audio file')}</strong><small>{editingId ? 'Current audio is kept unless you choose a replacement · MP3, WAV, or M4A' : 'Required · MP3, WAV, or M4A'}</small></span><input type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} required={!editingId} /></label>
                  <label className="nlm-file-picker nlm-cover-picker">
                    {coverPreview || existingCoverUrl ? <img className="nlm-cover-preview" src={coverPreview || existingCoverUrl} alt={coverFile ? 'Selected cover preview' : 'Current cover artwork'} /> : <span className="nlm-file-icon"><Disc3 size={18} /></span>}
                    <span><strong>{coverFile?.name || (existingCoverUrl ? 'Current cover artwork' : 'Add cover artwork')}</strong><small>{coverFile ? 'Selected · will replace the current cover' : existingCoverUrl ? 'Current cover is kept unless you choose a replacement' : 'Optional · JPG, PNG, WEBP, or GIF'}</small></span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
                <label className="nlm-lyrics-field nlm-admin-lyrics-field"><span className="nlm-input-label">Lyrics <small>OPTIONAL · TIMESTAMPS SUPPORTED</small></span><textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="[00:12] The city wakes in gold&#10;[00:18] A new day unfolds" rows={12} /></label>
                {formError && <p className="nlm-form-error" role="alert">{formError}</p>}
                <div className="nlm-form-actions"><button type="submit" className="nlm-submit-button" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : editingId ? 'Update track' : 'Add to library'}</button></div>
              </form>
            </section>
          )}

          {['settings', 'account', 'billing', 'listeners', 'access', 'plans'].includes(tab) && <section className="nlm-management-page">
            <header className="nlm-management-heading"><div><span className="nlm-eyebrow">STUDIO MANAGEMENT</span><h1>{tab === 'settings' ? 'Domain settings' : tab === 'account' ? 'Account' : tab === 'billing' ? 'Billing & subscription' : tab === 'listeners' ? 'Listeners' : tab === 'plans' ? 'Subscription plans' : 'Listener access'}</h1><p>{tab === 'settings' ? 'Choose the address listeners use to find your NLM Songs space.' : tab === 'account' ? 'Review and update the details connected to your studio account.' : tab === 'billing' ? 'Manage your studio plan and choose a secure payment method.' : tab === 'listeners' ? 'See the people who listen to your catalogue.' : tab === 'plans' ? 'Create paid and free plans with features and usage limits for logged-in listeners.' : 'Create feature access and usage limits for listener accounts.'}</p></div></header>
            {settingsError && <p className="nlm-form-error" role="alert">{settingsError}</p>}
            {settingsNotice && <p className="nlm-settings-success" role="status">{settingsNotice}</p>}
            {tab === 'settings' && <div className="nlm-management-card"><div className="nlm-management-card-head"><Globe size={19}/><div><h2>Your listening address</h2><p>Set the subdomain for this NLM Songs studio.</p></div></div><form onSubmit={saveSubdomain} className="nlm-management-form"><label>Studio subdomain<div className="nlm-domain-field"><input value={subdomain} onChange={(event) => setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="your-studio" maxLength={50} required/><span>.iyonicorp.com</span></div></label><p className="nlm-management-hint">Current address: <strong>{subdomain || seller?.subdomain || 'Not set'}.iyonicorp.com</strong></p><button className="nlm-submit-button" disabled={savingSettings}>{savingSettings ? 'Saving…' : 'Save domain'}</button></form></div>}
            {tab === 'account' && <div className="nlm-management-card"><div className="nlm-management-card-head"><UserRound size={19}/><div><h2>Account details</h2><p>Your login email stays attached to this account.</p></div></div><form onSubmit={saveAccount} className="nlm-management-form"><label>Display name<input name="name" defaultValue={user?.name || ''} autoComplete="name" required/></label><label>Email address<input value={user?.email || ''} readOnly/></label><label>Phone number<input name="phone" defaultValue={user?.phoneNumber || ''} autoComplete="tel"/></label><button className="nlm-submit-button" disabled={savingSettings}>{savingSettings ? 'Saving…' : 'Save account'}</button></form></div>}
            {tab === 'plans' && <><div className="nlm-management-card"><div className="nlm-management-card-head"><CreditCard size={19}/><div><h2>{editingPlanId ? 'Edit subscription plan' : 'Create a plan'}</h2><p>Plans become available immediately to signed-in listeners when active.</p></div></div><form className="nlm-plan-editor" onSubmit={savePlan}><label>Plan name<input value={planDraft.name} onChange={(event) => setPlanDraft((draft) => ({ ...draft, name: event.target.value }))} maxLength={100} placeholder="Listener Plus" required/></label><label>Description<textarea value={planDraft.description} onChange={(event) => setPlanDraft((draft) => ({ ...draft, description: event.target.value }))} maxLength={1000} rows={2} placeholder="What listeners get with this plan"/></label><div className="nlm-form-fields"><label>Price<input type="number" min="0" step="0.01" value={planDraft.price} onChange={(event) => setPlanDraft((draft) => ({ ...draft, price: event.target.value }))} required/></label><label>Currency<input value={planDraft.currency} onChange={(event) => setPlanDraft((draft) => ({ ...draft, currency: event.target.value.toUpperCase() }))} maxLength={8} required/></label><label>Term in days<input type="number" min="1" max="3650" value={planDraft.intervalDays} onChange={(event) => setPlanDraft((draft) => ({ ...draft, intervalDays: event.target.value }))} required/></label></div><div className="nlm-plan-editor-limits"><strong>Usage limits <small>Leave blank for unlimited</small></strong><label>Plays / month<input type="number" min="0" max="1000000" value={planDraft.monthlyPlays} onChange={(event) => setPlanDraft((draft) => ({ ...draft, monthlyPlays: event.target.value }))} placeholder="Unlimited"/></label><label>Playlists<input type="number" min="0" max="1000000" value={planDraft.playlistLimit} onChange={(event) => setPlanDraft((draft) => ({ ...draft, playlistLimit: event.target.value }))} placeholder="Unlimited"/></label><label>Offline saves<input type="number" min="0" max="1000000" value={planDraft.offlineLimit} onChange={(event) => setPlanDraft((draft) => ({ ...draft, offlineLimit: event.target.value }))} placeholder="Unlimited"/></label><label>Phone downloads / month<input type="number" min="0" max="1000000" value={planDraft.deviceDownloadLimit} onChange={(event) => setPlanDraft((draft) => ({ ...draft, deviceDownloadLimit: event.target.value }))} placeholder="Unlimited"/></label></div><div className="nlm-plan-editor-features"><strong>Included features</strong><div>{featureCatalog.map((feature) => <label key={feature}><input type="checkbox" checked={planDraft.features.includes(feature)} onChange={(event) => setPlanDraft((draft) => ({ ...draft, features: event.target.checked ? [...new Set([...draft.features, feature])] : draft.features.filter((value) => value !== feature) }))}/>{feature.replace(/_/g, ' ')}</label>)}</div></div><div className="nlm-plan-actions"><button className="nlm-submit-button" disabled={savingSettings}>{savingSettings ? 'Saving…' : editingPlanId ? 'Save changes' : 'Publish plan'}</button>{editingPlanId && <button type="button" className="nlm-account-button" onClick={() => { setEditingPlanId(null); setPlanDraft({ name: '', description: '', price: '0', currency: 'USD', intervalDays: '30', features: ['streaming'], monthlyPlays: '', playlistLimit: '', offlineLimit: '', deviceDownloadLimit: '' }); }}>Cancel edit</button>}</div></form></div><div className="nlm-plan-admin-list">{subscriptionPlans.map((plan) => <article className="nlm-management-card" key={plan.id}><div><span className="nlm-eyebrow">{plan.currency} · {plan.intervalDays} DAYS</span><h2>{plan.name}</h2><p>{plan.description || 'No description provided.'}</p></div><strong className="nlm-plan-price">{plan.price === 0 ? 'Free' : `${plan.currency} ${Number(plan.price).toFixed(2)}`}</strong><div className="nlm-feature-chips">{(plan.features || []).map((feature: string) => <span key={feature}>{feature.replace(/_/g, ' ')}</span>)}</div><p className="nlm-management-hint">Limits: {plan.limits?.monthlyPlays ?? 'unlimited'} monthly plays · {plan.limits?.playlistLimit ?? 'unlimited'} playlists · {plan.limits?.offlineLimit ?? 'unlimited'} offline saves · {plan.limits?.deviceDownloadLimit ?? 'unlimited'} phone downloads / month</p><div className="nlm-plan-actions"><button className="nlm-account-button" onClick={() => editPlan(plan)}>Edit</button><button className="nlm-ghost-button" onClick={() => void archivePlan(plan)}>Archive</button></div></article>)}{!subscriptionPlans.length && <div className="nlm-admin-chart-empty">No plans yet. Create your first listener plan above.</div>}</div></>}
            {tab === 'billing' && <><div className="nlm-billing-summary"><div><span className="nlm-eyebrow">CURRENT PLAN</span><h2>{billing?.subscription?.plan ? String(billing.subscription.plan).replace(/^./, (letter: string) => letter.toUpperCase()) : 'Plan details unavailable'}</h2><p>{billing?.subscription?.status || 'Connect an NLM Songs seller account to manage billing.'}{billing?.subscription?.endDate ? ` · renews ${new Date(billing.subscription.endDate).toLocaleDateString()}` : ''}</p></div><div className="nlm-wallet-balance"><span>IYONICPAY WALLET</span><strong>{billing?.wallet?.currency || 'USD'} {Number(billing?.wallet?.balance || 0).toLocaleString()}</strong></div></div><div className="nlm-billing-plans">{Object.entries(billing?.plans || {}).filter(([id, plan]: any) => id === 'basic' && Number(plan?.price) > 0).map(([id, plan]: any) => <article className="nlm-management-card" key={id}><span className="nlm-eyebrow">{id.toUpperCase()}</span><h2>{plan.name}</h2><p>{plan.description}</p><strong className="nlm-plan-price">${Number(plan.price).toFixed(2)} <small>/ month</small></strong><div className="nlm-plan-features">{(plan.features || []).map((feature: string) => <span key={feature}>✓ {feature}</span>)}</div><div className="nlm-plan-actions"><button className="nlm-submit-button" disabled={savingSettings} onClick={() => void payWithWallet(id)}>Pay with IyonicPay</button><button className="nlm-account-button" disabled={savingSettings} onClick={() => void payWithPaystack(id)}>Pay with Paystack</button></div></article>)}</div><p className="nlm-management-hint">Payments use the existing secure subscription checkout. Wallet payments require an available IyonicPay balance.</p></>}
            {(tab === 'listeners' || tab === 'access') && <><div className="nlm-listener-tools"><div><strong>{listeners.length}</strong><span>listener accounts</span></div><input value={listenerQuery} onChange={(event) => setListenerQuery(event.target.value)} placeholder="Find a listener" aria-label="Find a listener"/></div>{tab === 'access' && <div className="nlm-management-card nlm-feature-builder"><div className="nlm-management-card-head"><Settings size={19}/><div><h2>Subscription features</h2><p>Define features you can grant to listener access profiles.</p></div></div><form onSubmit={(event) => { event.preventDefault(); const label = newFeature.trim(); if (!label) return; void nlmsongsAPI.addAccessFeature(label).then((feature) => { setFeatureCatalog((items) => [...new Set([...items, feature.featureKey])]); setNewFeature(''); setSettingsNotice(`Added ${feature.label} to subscription features.`); }).catch((error: any) => setSettingsError(error?.response?.data?.message || 'Could not add this feature.')); }}><input value={newFeature} onChange={(event) => setNewFeature(event.target.value)} placeholder="For example: premium audio" maxLength={40}/><button className="nlm-account-button" type="submit"><Plus size={14}/> Add feature</button></form><div className="nlm-feature-chips">{featureCatalog.map((feature) => <span key={feature}>{feature.replace(/_/g, ' ')}</span>)}</div><p className="nlm-management-hint">Grant features and set play limits from each listener’s access profile.</p></div>}
              <div className="nlm-listener-list">{listeners.filter((listener) => `${listener.name || ''} ${listener.email || ''}`.toLowerCase().includes(listenerQuery.toLowerCase())).map((listener) => { const access = listener.access || { tier: 'standard', features: [], limits: {} }; return <article className="nlm-listener-row" key={listener.id}><div className="nlm-listener-avatar"><UserRound size={17}/></div><div className="nlm-listener-identity"><strong>{listener.name || 'Listener'}</strong><span>{listener.email}</span></div><div className="nlm-listener-meta"><span>{Number(listener.playCount || 0).toLocaleString()} plays</span><small>{listener.lastPlayedAt ? `Last listened ${new Date(listener.lastPlayedAt).toLocaleDateString()}` : 'Listener account'}</small></div>{tab === 'access' && <div className="nlm-listener-access"><select value={access.tier || 'standard'} aria-label={`Access tier for ${listener.name || listener.email}`} onChange={(event) => void updateAccess(listener, event.target.value, access.features || [])}><option value="standard">Standard</option><option value="plus">Plus</option><option value="restricted">Restricted</option></select><details><summary>Features & limits</summary><div className="nlm-listener-feature-options">{featureCatalog.map((feature) => <label key={feature}><input type="checkbox" checked={(access.features || []).includes(feature)} onChange={(event) => { const next = event.target.checked ? [...new Set([...(access.features || []), feature])] : (access.features || []).filter((item: string) => item !== feature); void updateAccess(listener, access.tier || 'standard', next); }}/>{feature.replace(/_/g, ' ')}</label>)}</div><label className="nlm-limit-field">Monthly plays<input type="number" min="0" max="100000" defaultValue={access.limits?.monthlyPlays ?? ''} placeholder="Unlimited" onBlur={(event) => { const rawValue = event.target.value; const limits = { ...(access.limits || {}), ...(rawValue === '' ? { monthlyPlays: null } : { monthlyPlays: Number(rawValue) }) }; void nlmsongsAPI.updateListenerAccess(listener.id, { ...access, limits }).then(() => setListeners((rows) => rows.map((row) => row.id === listener.id ? { ...row, access: { ...access, limits } } : row))).catch(() => setSettingsError('Could not save the play limit.')); }}/></label></details></div>}</article>; })}{!listeners.length && <div className="nlm-admin-chart-empty">Listener accounts will appear here after people start listening to your tracks.</div>}</div></>}
          </section>}
        </div>
      </main>
    </div>
  );
};

export default NLMSongsAdmin;
