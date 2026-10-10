import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Activity, ArrowUpRight, Disc3, FileAudio2, Headphones, LayoutDashboard, LogOut, Music2, Plus, RefreshCw, Search, Trash2, Upload, X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { nlmsongsAPI, type NLMSong, type NLMSongsAdminAnalytics } from '../../../services/api';
import { getApiOrigin } from '../../../utils/apiUrl';
import NLMMobileNavControls from './components/NLMMobileNavControls';
import './nlmsongs.css';

const API_ORIGIN = getApiOrigin();

type Tab = 'overview' | 'catalogue' | 'uploads';

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

const NLMSongsAdmin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (!coverFile) { setCoverPreview(''); return; }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const openAccount = () => navigate(user?.role === 'manager_admin' ? '/admin/dashboard' : '/nlmsongs/dashboard');
  const signOut = () => { logout(); navigate('/nlmsongs'); };

  const resetForm = () => {
    setTitle(''); setArtist(''); setDescription(''); setGenre(''); setTags('');
    setLyrics(''); setAudioFile(null); setCoverFile(null); setCoverPreview('');
    setFormError(''); setEditingId(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormError('');
    setIsSubmitting(true);
    if (!title.trim()) { setFormError('Add a track title.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!audioFile) { setFormError('Choose an audio file.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    const supportedExtension = /\.(mp3|wav|m4a)$/i.test(audioFile.name);
    if (!supportedExtension) { setFormError('Choose an MP3, WAV, or M4A file.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (coverFile && !coverFile.type.startsWith('image/')) { setFormError('The cover must be an image.'); isSubmittingRef.current = false; setIsSubmitting(false); return; }

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('artist', artist.trim());
      formData.append('description', description.trim());
      formData.append('genre', genre.trim());
      formData.append('tags', tags.trim());
      formData.append('lyrics', lyrics.trim());
      formData.append('audio', audioFile);
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
    setCoverFile(null);
    setFormError('');
    setTab('uploads');
  };

  const filtered = search.trim()
    ? tracks.filter((t) => [t.title, t.artist, t.genre, t.description, ...(Array.isArray(t.tags) ? t.tags : [])]
      .some((v) => String(v).toLowerCase().includes(search.toLowerCase())))
    : tracks;

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
        </nav>
        <div className="nlm-admin-sidebar-foot"><span className="nlm-live-dot" /> ADMIN DASHBOARD</div>
      </aside>

      <main className="nlm-admin-main">
        <header className="nlm-admin-topbar">
          <div className="nlm-location"><span>ADMIN</span><span className="nlm-location-slash">/</span><span>{tab.toUpperCase()}</span></div>
          <div className="nlm-account-actions">
            <span className="nlm-account-name">{user?.name || user?.email}</span>
            <button className="nlm-account-button" onClick={() => void loadTracks()} disabled={isLoading}><RefreshCw size={14} className={isLoading ? 'nlm-spin' : ''} /> Refresh</button>
            <button className="nlm-account-button" onClick={openAccount}><LayoutDashboard size={14} /> Dashboard</button>
            <button className="nlm-account-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
          </div>
        </header>

        <div className="nlm-admin-workspace">
          {tab === 'overview' && (() => {
            const activeTracks = tracks.filter((track) => track.isActive !== false);
            const genreCount = new Set(tracks.map((track) => track.genre?.trim()).filter(Boolean)).size;
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
                <article><span>Listening time</span><strong>{listeningSeconds === null ? '—' : `${Math.floor(listeningSeconds / 3600)}h`}</strong><small>{listeningSeconds === null ? 'No listening time recorded' : 'Recorded across all plays'}</small></article>
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
                {recentTracks.length ? <div className="nlm-admin-recent-tracks">{recentTracks.map((track) => <article key={track.id}><span className="nlm-admin-track-art">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt=""/> : <Music2 size={17}/>}</span><span><strong>{track.title}</strong><small>{track.artist || 'NLM Studio'} · {track.genre || 'Uncategorized'}</small></span><time>{new Date(track.createdAt).toLocaleDateString()}</time></article>)}</div> : <div className="nlm-admin-chart-empty">{tracks.length ? 'No recent additions in the past 30 days.' : 'Your uploaded tracks will appear here.'}</div>}
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
                <table className="nlm-admin-table">
                  <thead>
                    <tr><th>TRACK</th><th>ARTIST</th><th>GENRE</th><th>ACTIONS</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((track) => (
                      <tr key={track.id}>
                        <td><strong>{track.title}</strong><small>{track.tags?.slice(0, 2).join(', ') || ''}</small></td>
                        <td>{track.artist || 'NLM Studio'}</td>
                        <td>{track.genre || '—'}</td>
                        <td>
                          <button className="nlm-ghost-button" onClick={() => startEdit(track)} aria-label={`Edit ${track.title}`}><Disc3 size={14} /> Edit</button>
                          <button className="nlm-ghost-button" onClick={() => handleDelete(track.id)} aria-label={`Delete ${track.title}`}><Trash2 size={14} /> Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <label className="nlm-file-picker"><span className="nlm-file-icon"><FileAudio2 size={18} /></span><span><strong>{audioFile?.name || 'Choose an audio file'}</strong><small>Required · MP3, WAV, or M4A</small></span><input type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} required /></label>
                  <label className="nlm-file-picker nlm-cover-picker">
                    {coverPreview ? <img className="nlm-cover-preview" src={coverPreview} alt="Selected cover preview" /> : <span className="nlm-file-icon"><Disc3 size={18} /></span>}
                    <span><strong>{coverFile?.name || 'Add cover artwork'}</strong><small>{coverFile ? 'Selected · will be saved with the track' : 'Optional · JPG, PNG, WEBP, or GIF'}</small></span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
                <label className="nlm-lyrics-field">Lyrics <span>OPTIONAL</span><textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="[00:12] The city wakes in gold&#10;[00:18] A new day unfolds" rows={4} /></label>
                {formError && <p className="nlm-form-error" role="alert">{formError}</p>}
                <div className="nlm-form-actions"><button type="submit" className="nlm-submit-button" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : editingId ? 'Update track' : 'Add to library'}</button></div>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default NLMSongsAdmin;
