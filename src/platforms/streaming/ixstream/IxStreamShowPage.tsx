import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BadgeCheck, BookmarkPlus, Clock3, Play, Tv, Plus, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ixstreamAPI, type IXStreamContent, type IXStreamSeason, type IXStreamEpisode } from '../../../services/api';
import { DEMO_STREAMING_CATALOG, getDemoTitle } from './demoCatalog';
import IxStreamVideoPlayer from './IxStreamVideoPlayer';
import { openIxStreamWatchMode } from './watchMode';
import './ixstream.css';

const API_ORIGIN = new URL(import.meta.env.VITE_API_URL || 'http://localhost:2823/api', window.location.origin).origin;

const IxStreamShowPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<IXStreamContent | null>(null);
  const [seasons, setSeasons] = useState<IXStreamSeason[]>([]);
  const [episodes, setEpisodes] = useState<IXStreamEpisode[]>([]);
  const [activeSeason, setActiveSeason] = useState<string | null>(null);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonTitle, setSeasonTitle] = useState('');
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDescription, setEpisodeDescription] = useState('');
  const [episodeDuration, setEpisodeDuration] = useState('');
  const [episodeVideoFile, setEpisodeVideoFile] = useState<File | null>(null);
  const [episodeThumbnailFile, setEpisodeThumbnailFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('ixstream-saved') || '[]') as string[]).includes(id || ''); }
    catch { return false; }
  });

  const isAdmin = user?.role === 'manager_admin' || user?.role === 'seller';
  const isWatchMode = searchParams.get('mode') === 'watch';
  const requestedEpisodeId = searchParams.get('episode');

  const resolveUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
    return new URL(value, `${API_ORIGIN}/`).toString();
  };

  useEffect(() => {
    if (!id) return;
    const demo = getDemoTitle(id);
    if (demo) {
      setContent(demo);
      setSeasons(demo.seasons);
      setActiveSeason(demo.seasons[0]?.id ?? null);
      setEpisodes(demo.seasons[0]?.episodes ?? []);
      setIsLoading(false);
      return;
    }
    let isCurrent = true;
    setContent(null);
    setIsLoading(true);
    void ixstreamAPI.getContent(id).then((data) => {
      if (isCurrent) setContent(data);
    }).catch((error) => {
      console.error(error);
      if (isCurrent) setContent(null);
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });
    void ixstreamAPI.listSeasons(id).then((data) => {
      if (isCurrent) setSeasons(data);
    }).catch(() => {
      if (isCurrent) setSeasons([]);
    });
    return () => { isCurrent = false; };
  }, [id]);

  useEffect(() => {
    try { setSaved((JSON.parse(localStorage.getItem('ixstream-saved') || '[]') as string[]).includes(id || '')); }
    catch { setSaved(false); }
  }, [id]);

  const loadEpisodes = async (seasonId: string) => {
    setActiveSeason(seasonId);
    const demoSeason = seasons.find((season) => season.id === seasonId);
    if (content?.id.startsWith('demo-')) {
      setEpisodes(demoSeason?.episodes ?? []);
      return;
    }
    const data = await ixstreamAPI.listEpisodes(seasonId);
    setEpisodes(data);
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await ixstreamAPI.createSeason({ contentId: id, seasonNumber, title: seasonTitle, description: '' });
      void (await ixstreamAPI.listSeasons(id).then(setSeasons));
      setShowSeasonForm(false);
    } catch (err) { console.error(err); }
  };

  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason || !episodeVideoFile) return;
    try {
      const formData = new FormData();
      formData.append('seasonId', activeSeason);
      formData.append('episodeNumber', String(episodeNumber));
      formData.append('title', episodeTitle);
      formData.append('description', episodeDescription);
      formData.append('duration', episodeDuration);
      formData.append('video', episodeVideoFile);
      if (episodeThumbnailFile) formData.append('thumbnail', episodeThumbnailFile);
      const created = await ixstreamAPI.createEpisode(formData);
      setEpisodes((prev) => [created, ...prev]);
      setShowEpisodeForm(false);
    } catch (err) { console.error(err); }
  };

  if (!content) {
    return <div className="ixs-show-page">
      <header className="ixs-detail-topbar"><button onClick={() => navigate('/ixstream')}><ArrowLeft size={16} /> Back to IxStream</button></header>
      <div className="ixs-not-found">{isLoading ? 'Loading title…' : 'This title is not available.'}</div>
    </div>;
  }

  const trailerUrl = getDemoTitle(content.id)?.trailerUrl ?? content.videoUrl;
  const relatedTitles = DEMO_STREAMING_CATALOG.filter((title) => title.id !== content.id).slice(0, 3);
  const saveTitle = () => {
    let savedIds: string[] = [];
    try { savedIds = JSON.parse(localStorage.getItem('ixstream-saved') || '[]') as string[]; } catch { savedIds = []; }
    const next = saved ? savedIds.filter((savedId) => savedId !== content.id) : [...new Set([...savedIds, content.id])];
    localStorage.setItem('ixstream-saved', JSON.stringify(next));
    setSaved(!saved);
  };

  if (isWatchMode) {
    const watchEpisode = episodes.find((episode) => episode.id === requestedEpisodeId) ?? null;
    const watchUrl = watchEpisode?.videoUrl ?? content.videoUrl;
    const fullscreenOnStart = searchParams.get('fullscreen') === '1';
    return (
      <main className="ixs-watch-mode">
        <header className="ixs-watch-topbar">
          <button onClick={() => navigate(`/ixstream/show/${content.id}`)}><ArrowLeft size={17} /> Back to title</button>
          <div><span>{content.type === 'movie' ? 'NOW PLAYING' : 'SERIES PREVIEW'}</span><strong>{watchEpisode ? `${watchEpisode.episodeNumber}. ${watchEpisode.title}` : content.title}</strong></div>
          <span className="ixs-watch-quality">HD</span>
        </header>
        <section className="ixs-watch-stage">
          <IxStreamVideoPlayer key={watchUrl} className="ixs-watch-video" src={resolveUrl(watchUrl)} title={content.title} poster={resolveUrl(content.thumbnailUrl)} autoPlay autoFullscreen={fullscreenOnStart} />
          <div className="ixs-watch-caption"><h1>{content.title}</h1><p>{watchEpisode?.description || content.description}</p></div>
        </section>
        {content.type === 'tvshow' && episodes.length > 0 && <section className="ixs-watch-episodes">
          <div><span>CONTINUE WATCHING</span><h2>Episodes</h2></div>
          <div className="ixs-watch-episode-list">{episodes.map((episode) => <button key={episode.id} className={watchEpisode?.id === episode.id ? 'is-active' : ''} onClick={() => openIxStreamWatchMode(navigate, content.id, episode.id)}><Play size={15} /><span>{String(episode.episodeNumber).padStart(2, '0')} · {episode.title}</span><small>{episode.duration ? `${episode.duration} min` : 'Preview'}</small></button>)}</div>
        </section>}
      </main>
    );
  }

  return (
    <div className="ixs-show-page">
      <header className="ixs-detail-topbar">
        <button onClick={() => navigate('/ixstream')}><ArrowLeft size={16} /> IxStream</button>
        {user && <span className="ixs-detail-member"><BadgeCheck size={15} /> {user.name || user.email}</span>}
      </header>

      <section className={`ixs-detail-hero ixs-art-${DEMO_ART_INDEX[content.id] ?? 0}`}>
        <div className="ixs-detail-backdrop">{content.thumbnailUrl && <img src={resolveUrl(content.thumbnailUrl)} alt="" />}</div>
        <div className="ixs-detail-hero-copy">
          <span className="ixs-eyebrow">{content.id.startsWith('demo-') ? 'IXSTREAM ORIGINAL PREVIEW' : 'NOW STREAMING'} <span>·</span> {content.type === 'movie' ? 'FEATURE FILM' : 'SERIES'}</span>
          <h1>{content.title}</h1>
          <div className="ixs-detail-meta"><span>{content.releaseYear || 'New'}</span><span>{content.rating ? `★ ${content.rating}` : 'IxStream pick'}</span><span>{content.duration ? `${content.duration} min` : 'Episodes'}</span><span className="ixs-quality">4K · HDR</span></div>
          <p className="ixs-detail-lede">{content.description || 'A new story, selected for IxStream.'}</p>
          <div className="ixs-detail-tags">{content.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="ixs-detail-actions">
            <button className="ixs-play-button" onClick={() => openIxStreamWatchMode(navigate, content.id)}><Play size={16} fill="currentColor" /> Play now</button>
            <button className={`ixs-detail-save ${saved ? 'is-saved' : ''}`} onClick={saveTitle}><BookmarkPlus size={16} /> {saved ? 'In My List' : 'Add to My List'}</button>
          </div>
        </div>
        <div className={`ixs-detail-poster ixs-art-poster ixs-art-${DEMO_ART_INDEX[content.id] ?? 0}`}>
          {content.thumbnailUrl && <img src={resolveUrl(content.thumbnailUrl)} alt={content.title} />}
          <span className="ixs-poster-title">{content.title}</span>
          <span className="ixs-poster-edition">IXSTREAM ORIGINAL</span>
        </div>
      </section>

      <nav className="ixs-detail-nav" aria-label="Title sections">
        <span>EXPLORE THIS TITLE</span>
        <button onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}>Preview <ArrowUpRight size={13} /></button>
        <button onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}>Story <ArrowUpRight size={13} /></button>
        {content.type === 'tvshow' && <button onClick={() => document.getElementById('episodes')?.scrollIntoView({ behavior: 'smooth' })}>Episodes <ArrowUpRight size={13} /></button>}
        <button onClick={() => document.getElementById('more')?.scrollIntoView({ behavior: 'smooth' })}>More like this <ArrowUpRight size={13} /></button>
      </nav>

      <section className="ixs-trailer-section" id="preview">
        <div className="ixs-detail-section-title ixs-preview-heading"><span>01 / FIRST LOOK</span><h2>Step inside the story.</h2><p>Official preview <i /> {content.title}</p></div>
        <IxStreamVideoPlayer className="ixs-trailer-video" src={resolveUrl(trailerUrl)} title={`${content.title} trailer`} poster={resolveUrl(content.thumbnailUrl)} />
      </section>

      <section className="ixs-synopsis-section" id="story">
        <div className="ixs-story-copy">
          <div className="ixs-detail-section-title"><span>02 / THE STORY</span><h2>Some stories stay with you.</h2></div>
          <p>{content.description || 'Discover the story behind this IxStream title.'}</p>
          <div className="ixs-detail-tags">{content.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        <aside className="ixs-title-facts" aria-label="Title information">
          <span><small>FORMAT</small><strong>{content.type === 'movie' ? 'Feature film' : 'Original series'}</strong></span>
          <span><small>GENRE</small><strong>{content.genre || 'Drama'}</strong></span>
          <span><small>RELEASE YEAR</small><strong>{content.releaseYear || 'New'}</strong></span>
          <span><small>RUNTIME</small><strong>{content.duration ? `${content.duration} min` : 'Multiple episodes'}</strong></span>
          <span><small>IXSTREAM RATING</small><strong className="ixs-fact-rating">★ {content.rating ?? '—'} <i>/ 10</i></strong></span>
        </aside>
      </section>

      {content.type === 'tvshow' && <section className="ixs-episode-guide" id="episodes">
        <div className="ixs-detail-section-title"><span>03 / EPISODE GUIDE</span><h2>Pick up where it begins.</h2><p>{episodes.length} chapters ready to explore</p></div>
        {seasons.length > 1 && <div className="ixs-season-switcher" aria-label="Choose season">{seasons.map((season) => <button key={season.id} className={activeSeason === season.id ? 'is-active' : ''} onClick={() => loadEpisodes(season.id)}>{season.title || `Season ${season.seasonNumber}`}</button>)}</div>}
        {episodes.length ? <div className="ixs-episode-guide-grid">{episodes.map((episode, index) => <button key={episode.id} className="ixs-episode-card" onClick={() => openIxStreamWatchMode(navigate, content.id, episode.id)}>
          <span className={`ixs-episode-art ixs-art-${(index + DEMO_ART_INDEX[content.id] + 1) % 6}`}><span className="ixs-episode-number">EPISODE {String(episode.episodeNumber).padStart(2, '0')}</span><span className="ixs-episode-play"><Play size={19} fill="currentColor" /></span></span>
          <span className="ixs-episode-card-copy"><strong>{episode.title}</strong><span className="ixs-episode-duration"><Clock3 size={13} /> {episode.duration ? `${episode.duration} min` : 'Preview'}</span><small>{episode.description}</small></span>
        </button>)}</div> : <p className="ixs-episode-empty">Episodes will appear here when this series is ready to stream.</p>}
      </section>}

      <section className="ixs-related-section" id="more">
        <div className="ixs-detail-section-title"><span>{content.type === 'tvshow' ? '04' : '03'} / KEEP EXPLORING</span><h2>Stay for another story.</h2><p>More from the IxStream collection.</p></div>
        <div className="ixs-related-grid">{relatedTitles.map((title, index) => <button key={title.id} className="ixs-related-item" onClick={() => navigate(`/ixstream/show/${title.id}`)}>
          <span className={`ixs-related-art ixs-art-${(index + 1) % 6}`}><span>{title.title}</span></span>
          <span className="ixs-related-copy"><small>{title.type === 'movie' ? 'FILM' : 'SERIES'} · {title.releaseYear}</small><strong>{title.title}</strong><span>{title.genre}</span></span>
          <ArrowUpRight size={17} />
        </button>)}</div>
      </section>

      {isAdmin && content.type === 'tvshow' && (
        <div className="ixs-admin-actions">
          <button onClick={() => setShowSeasonForm(true)}><Plus size={16} /> Add season</button>
          {activeSeason && <button onClick={() => setShowEpisodeForm(true)}><Plus size={16} /> Add episode</button>}
        </div>
      )}

      {showSeasonForm && id && (
        <div className="ixs-modal-backdrop" onClick={() => setShowSeasonForm(false)}>
          <form className="ixs-form" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateSeason}>
            <h3>Add season</h3>
            <label>Season number<input type="number" value={seasonNumber} onChange={(e) => setSeasonNumber(Number(e.target.value))} min={1} required /></label>
            <label>Title<input value={seasonTitle} onChange={(e) => setSeasonTitle(e.target.value)} /></label>
            <div className="ixs-form-actions"><button type="submit" className="ixs-submit-button">Save</button><button type="button" className="ixs-ghost-button" onClick={() => setShowSeasonForm(false)}><X size={14} /> Cancel</button></div>
          </form>
        </div>
      )}

      {showEpisodeForm && activeSeason && (
        <div className="ixs-modal-backdrop" onClick={() => setShowEpisodeForm(false)}>
          <form className="ixs-form" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateEpisode}>
            <h3>Add episode</h3>
            <label>Episode number<input type="number" value={episodeNumber} onChange={(e) => setEpisodeNumber(Number(e.target.value))} min={1} required /></label>
            <label>Title<input value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} required /></label>
            <label>Description<textarea value={episodeDescription} onChange={(e) => setEpisodeDescription(e.target.value)} rows={2} /></label>
            <label>Duration (minutes)<input type="number" value={episodeDuration} onChange={(e) => setEpisodeDuration(e.target.value)} min={0} /></label>
            <label>Video file<input type="file" accept="video/*" onChange={(e) => setEpisodeVideoFile(e.target.files?.[0] ?? null)} required /></label>
            <label>Thumbnail<input type="file" accept="image/*" onChange={(e) => setEpisodeThumbnailFile(e.target.files?.[0] ?? null)} /></label>
            <div className="ixs-form-actions"><button type="submit" className="ixs-submit-button">Save</button><button type="button" className="ixs-ghost-button" onClick={() => setShowEpisodeForm(false)}><X size={14} /> Cancel</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

const DEMO_ART_INDEX: Record<string, number> = {
  'demo-glass-current': 0,
  'demo-northbound': 1,
  'demo-second-sun': 2,
  'demo-atlas-protocol': 3,
  'demo-blue-hour': 4,
  'demo-wild-meridian': 5,
};

export default IxStreamShowPage;
