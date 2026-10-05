import { useEffect, useState, type FormEvent } from 'react';
import {
  Film, Plus, Trash2, Edit, X, Upload,
  LayoutDashboard, LogOut,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ixstreamAPI, type IXStreamContent, type IXStreamSubscriptionPlan, type IXStreamSeason, type IXStreamEpisode } from '../../../services/api';
import { getApiOrigin } from '../../../utils/apiUrl';
import './ixstream.css';

const API_ORIGIN = getApiOrigin();

type Tab = 'content' | 'seasons' | 'episodes' | 'plans' | 'subscriptions';

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
  return new URL(value, `${API_ORIGIN}/`).toString();
};

const IxStreamAdmin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('content');
  const [content, setContent] = useState<IXStreamContent[]>([]);
  const [seasons, setSeasons] = useState<IXStreamSeason[]>([]);
  const [episodes, setEpisodes] = useState<IXStreamEpisode[]>([]);
  const [plans, setPlans] = useState<IXStreamSubscriptionPlan[]>([]);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'movie' | 'tvshow'>('movie');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [duration, setDuration] = useState('');
  const [rating, setRating] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planCurrency, setPlanCurrency] = useState('USD');
  const [planInterval, setPlanInterval] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [planIntervalCount, setPlanIntervalCount] = useState(1);
  const [planFeatures, setPlanFeatures] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadContent = async () => {
    try { const data = await ixstreamAPI.listAdminContent(); setContent(data); }
    catch (e) { console.error(e); }
  };
  const loadPlans = async () => {
    try { const data = await ixstreamAPI.listPlans(); setPlans(data.sort((a, b) => a.sortOrder - b.sortOrder)); }
    catch (e) { console.error(e); }
  };
  const loadSeasons = async (contentId: string) => {
    setActiveContentId(contentId);
    try { const data = await ixstreamAPI.listSeasons(contentId); setSeasons(data); }
    catch (e) { console.error(e); }
  };
  const loadEpisodes = async (seasonId: string) => {
    setTab('episodes');
    try { const data = await ixstreamAPI.listEpisodes(seasonId); setEpisodes(data); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { void loadContent(); void loadPlans(); }, []);
  useEffect(() => {
    if (!thumbnailFile) { setThumbnailPreview(''); return; }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const openAccount = () => navigate(user?.role === 'manager_admin' ? '/admin/dashboard' : '/ixstream/dashboard');
  const signOut = () => { logout(); navigate('/ixstream'); };

  const resetContentForm = () => {
    setTitle(''); setDescription(''); setType('movie'); setGenre(''); setTags('');
    setReleaseYear(''); setDuration(''); setRating(''); setThumbnailFile(null);
    setVideoFile(null); setThumbnailPreview(''); setFormError('');
  };

  const handleCreateContent = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) { setFormError('Add a title.'); return; }
    if (!videoFile) { setFormError('Choose a video file.'); return; }
    if (type === 'tvshow' && !description.trim()) { setFormError('Add a description for this series.'); return; }
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('type', type);
      formData.append('genre', genre.trim());
      formData.append('tags', tags.trim());
      formData.append('releaseYear', releaseYear);
      formData.append('duration', duration);
      formData.append('rating', rating);
      formData.append('video', videoFile);
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);
      const created = await ixstreamAPI.createContent(formData);
      setContent((prev) => [created, ...prev]);
      resetContentForm();
    } catch (error: any) {
      setFormError(error?.response?.data?.message || 'Could not create content. Try again.');
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Delete this title? This cannot be undone.')) return;
    try {
      await ixstreamAPI.deleteContent(id);
      setContent((prev) => prev.filter((c) => c.id !== id));
      if (activeContentId === id) { setActiveContentId(null); setSeasons([]); setTab('content'); }
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleCreateSeason = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const seasonNumber = seasons.length + 1;
    try {
      await ixstreamAPI.createSeason({ contentId: activeContentId!, seasonNumber, title: `Season ${seasonNumber}`, description: '' });
      void loadSeasons(activeContentId!);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    await ixstreamAPI.deletePlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (editingPlanId === id) { setEditingPlanId(null); resetPlanForm(); }
  };

  const handlePlanSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;
    try {
      if (editingPlanId) {
        await ixstreamAPI.updatePlan(editingPlanId, { name: planName, description: planDescription, priceCents: Math.round(Number(planPrice) * 100), currency: planCurrency, intervalType: planInterval, intervalCount: Number(planIntervalCount), features: planFeatures ? planFeatures.split(',').map((f) => f.trim()).filter(Boolean) : [] });
      } else {
        await ixstreamAPI.createPlan({ name: planName, description: planDescription, priceCents: Math.round(Number(planPrice) * 100), currency: planCurrency, intervalType: planInterval, intervalCount: Number(planIntervalCount), features: planFeatures ? planFeatures.split(',').map((f) => f.trim()).filter(Boolean) : [] });
      }
      void loadPlans();
      resetPlanForm();
    } catch (error: any) {
      console.error(error);
    }
  };

  const resetPlanForm = () => {
    setPlanName(''); setPlanDescription(''); setPlanPrice(''); setPlanCurrency('USD');
    setPlanInterval('month'); setPlanIntervalCount(1); setPlanFeatures('');
    setEditingPlanId(null); setFormError('');
  };

  const editPlan = (plan: IXStreamSubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setPlanDescription(plan.description);
    setPlanPrice((plan.priceCents / 100).toString());
    setPlanCurrency(plan.currency);
    setPlanInterval(plan.intervalType);
    setPlanIntervalCount(plan.intervalCount);
    setPlanFeatures(plan.features.join(', '));
  };

  return (
    <div className="ixs-admin-app">
      <aside className="ixs-sidebar">
        <a className="ixs-brand" href="#content" onClick={(e) => { e.preventDefault(); setTab('content'); }} aria-label="IxStream admin">
          <span className="ixs-brand-mark"><Film size={20} strokeWidth={2.5} /></span>
          <span>Ix<span className="ixs-brand-light">Stream</span></span>
        </a>
        <nav className="ixs-nav" aria-label="Admin navigation">
          <button className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}><Film size={17} />Content</button>
          <button className={tab === 'plans' ? 'is-active' : ''} onClick={() => setTab('plans')}><Upload size={17} />Plans</button>
        </nav>
        <div className="ixs-sidebar-foot"><span className="ixs-live-dot" /> ADMIN DASHBOARD</div>
      </aside>

      <main className="ixs-admin-main">
        <header className="ixs-topbar">
          <div className="ixs-location"><span>ADMIN</span><span className="ixs-slash">/</span><span>{tab.toUpperCase()}</span></div>
          <div className="ixs-account-actions">
            <span className="ixs-account-name">{user?.name || user?.email}</span>
            <button className="ixs-account-button" onClick={openAccount}><LayoutDashboard size={14} /> Dashboard</button>
            <button className="ixs-account-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
          </div>
        </header>

        <div className="ixs-admin-workspace">
          {tab === 'content' && (
            <section className="ixs-section">
              <div className="ixs-section-head"><h2>Catalogue</h2><span className="ixs-track-count">{content.length} TITLES</span></div>
              {activeContentId ? (
                <button onClick={() => { setActiveContentId(null); setSeasons([]); setTab('content'); }} className="ixs-back-button">← Back to all titles</button>
              ) : null}
              {!activeContentId ? (
                <div className="ixs-grid">
                  {content.length ? content.map((item) => (
                    <article key={item.id} className="ixs-admin-card">
                      <div className="ixs-card-preview">{item.thumbnailUrl ? <img src={resolveAssetUrl(item.thumbnailUrl)} alt="" /> : <Film size={32} />}</div>
                      <h3>{item.title}</h3>
                      <p className="ixs-card-meta">{item.type} · {item.genre || '—'}</p>
                      <div className="ixs-card-actions">
                        <button onClick={() => loadSeasons(item.id)} className="ixs-ghost-button"><Edit size={14} /> Manage</button>
                        <button onClick={() => handleDeleteContent(item.id)} className="ixs-ghost-button"><Trash2 size={14} /> Delete</button>
                      </div>
                    </article>
                  )) : <p className="ixs-empty-state">No titles published yet.</p>}
                </div>
              ) : (
                <div className="ixs-seasons-panel">
                  <h3>Seasons & Episodes for "{content.find((c) => c.id === activeContentId)?.title}"</h3>
                  {seasons.length ? seasons.map((season) => (
                    <div key={season.id} className="ixs-season-row">
                      <h4>{season.title || `Season ${season.seasonNumber}`}</h4>
                      <button onClick={() => loadEpisodes(season.id)} className="ixs-ghost-button">View episodes</button>
                    </div>
                  )) : <p>No seasons yet. Add one below.</p>}
                  <form onSubmit={handleCreateSeason} className="ixs-form-inline">
                    <button type="submit" className="ixs-submit-button"><Plus size={14} /> Add season</button>
                  </form>
                  {episodes.length > 0 && (
                    <div className="ixs-episodes-list">
                      <h4>Episodes</h4>
                      {episodes.map((ep) => (
                        <div key={ep.id} className="ixs-episode-row">
                          <span>S{ep.seasonId} · E{ep.episodeNumber} — {ep.title}</span>
                          <button onClick={() => {}} className="ixs-ghost-button"><Trash2 size={14} /> Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="ixs-upload-panel">
                <h3>Add a title</h3>
                <form onSubmit={handleCreateContent} noValidate>
                  <div className="ixs-form-fields">
                    <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Last Horizon" maxLength={255} required /></label>
                    <label>Type
                      <select value={type} onChange={(e) => setType(e.target.value as 'movie' | 'tvshow')} aria-label="Content type">
                        <option value="movie">Movie</option>
                        <option value="tvshow">TV Show</option>
                      </select>
                    </label>
                  </div>
                  <div className="ixs-form-fields">
                    <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short synopsis..." rows={3} /></label>
                    <label>Genre<input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Action, Drama, Sci-Fi..." maxLength={100} /></label>
                  </div>
                  <div className="ixs-form-fields">
                    <label>Release year<input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="2024" min={1900} max={2100} /></label>
                    <label>Duration (minutes)<input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={0} /></label>
                  </div>
                  <div className="ixs-form-fields">
                    <label>Rating<input type="number" step={0.1} value={rating} onChange={(e) => setRating(e.target.value)} min={0} max={10} placeholder="e.g. 8.5" /></label>
                    <label>Tags<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="action, thriller, award-winner" maxLength={200} /></label>
                  </div>
                  <div className="ixs-file-fields">
                    <label className="ixs-file-picker"><span className="ixs-file-icon"><Upload size={18} /></span><span><strong>{videoFile?.name || 'Choose a video'}</strong><small>Required · MP4, MOV, AVI, MKV</small></span><input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} required /></label>
                    <label className="ixs-file-picker">
                      {thumbnailPreview ? <img className="ixs-cover-preview" src={thumbnailPreview} alt="Thumbnail preview" /> : <span className="ixs-file-icon"><Film size={18} /></span>}
                      <span><strong>{thumbnailFile?.name || 'Choose a thumbnail'}</strong><small>Optional · JPG, PNG, WEBP</small></span>
                      <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                  {formError && <p className="ixs-form-error" role="alert">{formError}</p>}
                  <div className="ixs-form-actions"><button type="submit" className="ixs-submit-button" disabled={isSubmitting}>{isSubmitting ? 'Publishing…' : 'Add to catalogue'}</button></div>
                </form>
              </div>
            </section>
          )}

          {tab === 'plans' && (
            <section className="ixs-section">
              <div className="ixs-section-head"><h2>Subscription plans</h2><button onClick={() => { setEditingPlanId(null); resetPlanForm(); }} className="ixs-ghost-button"><Plus size={14} /> New plan</button></div>
              <div className="ixs-plans-grid">
                {plans.length ? plans.map((plan) => (
                  <div key={plan.id} className="ixs-plan-card">
                    <h3>{plan.name}</h3>
                    <p className="ixs-plan-price">${(plan.priceCents / 100).toFixed(2)}/{plan.intervalType === 'month' ? 'mo' : plan.intervalType === 'year' ? 'yr' : plan.intervalType}</p>
                    <ul>{plan.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    <div className="ixs-plan-actions">
                      <button onClick={() => editPlan(plan)} className="ixs-ghost-button"><Edit size={14} /></button>
                      <button onClick={() => handleDeletePlan(plan.id)} className="ixs-ghost-button"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )) : <p className="ixs-empty-state">No plans created.</p>}
              </div>
              {formError && <p className="ixs-form-error" role="alert">{formError}</p>}
            </section>
          )}

          {(editingPlanId !== null || planName) && (
            <div className="ixs-plan-form-overlay">
              <form onSubmit={handlePlanSubmit} className="ixs-plan-form">
                <h3>{editingPlanId ? 'Edit plan' : 'New plan'}</h3>
                <label>Name<input value={planName} onChange={(e) => setPlanName(e.target.value)} required /></label>
                <label>Description<textarea value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} rows={2} /></label>
                <div className="ixs-form-row">
                  <label>Price ($)<input type="number" step={0.01} value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} required min={0} /></label>
                  <label>Currency<input value={planCurrency} onChange={(e) => setPlanCurrency(e.target.value)} /></label>
                </div>
                <div className="ixs-form-row">
                  <label>Interval<input value={planIntervalCount} onChange={(e) => setPlanIntervalCount(Number(e.target.value))} min={1} type="number" style={{ width: 60 }} />
                    <select value={planInterval} onChange={(e) => setPlanInterval(e.target.value as any)} style={{ marginLeft: 8 }}>
                      <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option>
                    </select>
                  </label>
                </div>
                <label>Features (comma separated)<textarea value={planFeatures} onChange={(e) => setPlanFeatures(e.target.value)} placeholder="4K streaming, 5 profiles, Offline downloads" rows={2} /></label>
                <div className="ixs-form-actions">
                  <button type="submit" className="ixs-submit-button">{editingPlanId ? 'Save plan' : 'Create plan'}</button>
                  <button type="button" className="ixs-ghost-button" onClick={resetPlanForm}><X size={14} /> Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default IxStreamAdmin;
