import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, ListMusic, Music2, Play, Search, Shuffle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { playlistsAPI, type NLMSharedPlaylist } from '../../../../services/api';
import type { NLMView } from '../types';
import { resolveAssetUrl } from '../utils';
import NLMSidebar from './NLMSidebar';
import NLMMobileNavControls from './NLMMobileNavControls';
import '../nlmsongs.css';

const SharedPlaylistPage = ({ isVisible = true }: { isVisible?: boolean }) => {
  const { pathname } = useLocation();
  const rawPlaylistId = pathname.split('/')[3] || '';
  let playlistId = rawPlaylistId;
  try { playlistId = decodeURIComponent(rawPlaylistId); } catch { /* Keep the raw path segment. */ }
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [playlist, setPlaylist] = useState<NLMSharedPlaylist | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [shareFeedback, setShareFeedback] = useState('');
  const [trackQuery, setTrackQuery] = useState('');
  const [trackSort, setTrackSort] = useState<'playlist' | 'title' | 'artist'>('playlist');
  useEffect(() => {
    let active = true;
    if (!isVisible || !playlistId) return () => { active = false; };
    setState('loading');
    playlistsAPI.getShared(playlistId).then((value) => { if (active) { setPlaylist(value); setState('ready'); } })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [isVisible, playlistId, retryCount]);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigateDiscovery = (view: 'Genres' | 'My List' | 'Playlists') => { navigate(`/nlmsongs/${view === 'My List' ? 'my-list' : view.toLowerCase()}`); closeMobileNav(); };
  const navigateView = (view: NLMView) => { navigate(view === 'Settings' ? '/nlmsongs/settings' : view === 'Your Library' ? '/nlmsongs/library' : '/nlmsongs/listen'); closeMobileNav(); };
  const playTracks = (trackIds: string[]) => window.dispatchEvent(new CustomEvent('nlm:play-playlist', { detail: { trackIds } }));
  const copyPlaylistLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareFeedback('Playlist link copied.');
    } catch {
      setShareFeedback('Could not copy the link. Copy it from your browser address bar.');
    }
  };
  const tracks = playlist?.tracks ?? [];
  const artists = useMemo(() => [...new Set(tracks.map((track) => track.artist.trim()).filter(Boolean))], [tracks]);
  const genres = useMemo(() => [...new Set(tracks.map((track) => track.genre?.trim()).filter((genre): genre is string => Boolean(genre)))], [tracks]);
  const shuffleTracks = () => {
    const shuffled = [...tracks];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    playTracks(shuffled.map((track) => track.id));
  };
  const playFromTrack = (index: number) => {
    playTracks(tracks.slice(index).map((track) => track.id));
  };
  const visibleTracks = useMemo(() => {
    const query = trackQuery.trim().toLocaleLowerCase();
    const filtered = tracks.map((track, index) => ({ track, index })).filter(({ track }) =>
      !query || [track.title, track.artist, track.genre].some((value) => (value || '').toLocaleLowerCase().includes(query)));
    if (trackSort === 'title') filtered.sort((a, b) => a.track.title.localeCompare(b.track.title));
    if (trackSort === 'artist') filtered.sort((a, b) => a.track.artist.localeCompare(b.track.artist) || a.track.title.localeCompare(b.track.title));
    return filtered;
  }, [tracks, trackQuery, trackSort]);
  const coverUrl = playlist?.coverUrl ? resolveAssetUrl(playlist.coverUrl) : '';
  const collageTracks = playlist?.tracks.filter((track) => track.thumbnailUrl).slice(0, 3) ?? [];
  return <div hidden={!isVisible} className={`nlm-member-app nlm-app-shell ${mobileNavOpen ? 'nlm-mobile-nav-open' : ''}`}>
    <NLMMobileNavControls isOpen={mobileNavOpen} onToggle={() => setMobileNavOpen((open) => !open)} onClose={closeMobileNav}/>
    <NLMSidebar view="Listen" trackCount={0} isAdminMode={false} onNavigate={navigateView} onNavigateDiscovery={navigateDiscovery} mobileOpen={mobileNavOpen} onMobileClose={closeMobileNav}/>
    <main className="nlm-main nlm-shared-playlist-main">
      <div className="nlm-workspace">
        {state === 'loading' ? <p className="nlm-empty-state" role="status">Loading shared playlist…</p> : state === 'error' || !playlist ? <section className="nlm-shared-state"><span className="nlm-eyebrow">NLM SONGS / SHARED COLLECTION</span><h1>Playlist unavailable</h1><p>This playlist may be private or no longer available.</p><div className="nlm-shared-playlist-actions"><button className="nlm-submit-button" onClick={() => setRetryCount((count) => count + 1)}>Try again</button><button className="nlm-ghost-button" onClick={() => navigate('/nlmsongs/listen')}>Explore NLM Songs</button></div></section> : <section className="nlm-shared-playlist">
          <div className="nlm-shared-hero">
            <div className="nlm-shared-art-stack" aria-hidden="true">
              {coverUrl ? <img src={coverUrl} alt="" /> : collageTracks.length ? <span className="nlm-shared-art-collage">{collageTracks.map((track) => <img key={track.id} src={resolveAssetUrl(track.thumbnailUrl)} alt="" />)}</span> : <Music2 size={44} />}
            </div>
            <div className="nlm-shared-hero-copy">
              <span className="nlm-eyebrow">PUBLIC PLAYLIST · NLM SONGS</span>
              <h1>{playlist.name}</h1>
              {playlist.description && <p>{playlist.description}</p>}
              <div className="nlm-shared-playlist-actions">
                <span className="nlm-shared-count">{playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}</span>
                <button className="nlm-submit-button" onClick={() => playTracks(playlist.tracks.map((track) => track.id))} disabled={!playlist.tracks.length}><Play size={14} fill="currentColor"/> Play playlist</button>
                <button className="nlm-share-link-button" onClick={shuffleTracks} disabled={!playlist.tracks.length}><Shuffle size={14}/> Shuffle all</button>
                <button className="nlm-share-link-button" onClick={() => void copyPlaylistLink()}>{shareFeedback === 'Playlist link copied.' ? <Check size={14}/> : <Copy size={14}/>} {shareFeedback === 'Playlist link copied.' ? 'Copied' : 'Copy link'}</button>
              </div>
              <p className="nlm-share-feedback" role="status" aria-live="polite">{shareFeedback}</p>
            </div>
          </div>
          <div className="nlm-shared-facts" aria-label="Playlist details">
            {playlist.tracks.length > 0 && <>
              <div><strong>{artists.length}</strong><span>{artists.length === 1 ? 'artist' : 'artists'}</span></div>
              <div><strong>{genres.length}</strong><span>{genres.length === 1 ? 'genre' : 'genres'}</span></div>
              {artists.length > 0 && <p><span>Featuring</span>{artists.slice(0, 4).join(' · ')}{artists.length > 4 ? ` + ${artists.length - 4} more` : ''}</p>}
              {genres.length > 0 && <p><span>Sounds in this set</span>{genres.join(' · ')}</p>}
            </>}
          </div>
          <div className="nlm-shared-list-heading"><div><span className="nlm-eyebrow">IN THIS COLLECTION</span><h2>Track list</h2></div><span className="nlm-shared-count">{String(visibleTracks.length).padStart(2, '0')} OF {String(playlist.tracks.length).padStart(2, '0')} TRACKS</span></div>
          {playlist.tracks.length > 0 && <div className="nlm-shared-track-tools">
            <label className="nlm-shared-search"><Search size={15}/><span className="nlm-sr-only">Search this playlist</span><input value={trackQuery} onChange={(event) => setTrackQuery(event.target.value)} placeholder="Find a track, artist, or genre" /></label>
            <label className="nlm-shared-sort"><span>Sort</span><select value={trackSort} onChange={(event) => setTrackSort(event.target.value as typeof trackSort)} aria-label="Sort playlist tracks"><option value="playlist">Playlist order</option><option value="title">Title</option><option value="artist">Artist</option></select></label>
          </div>}
          <div className="nlm-shared-track-list">{playlist.tracks.length ? visibleTracks.length ? visibleTracks.map(({ track, index }) => <article className="nlm-shared-track" key={track.id}>
            <span className="nlm-shared-index">{String(index + 1).padStart(2, '0')}</span><span className="nlm-shared-art">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt=""/> : <Music2 size={18}/>}</span><span className="nlm-shared-track-copy"><strong>{track.title}</strong><small>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</small></span><span className="nlm-shared-track-actions"><button onClick={() => playTracks([track.id])} aria-label={`Play ${track.title}`} title={`Play ${track.title}`}><Play size={14} fill="currentColor"/></button><button className="nlm-shared-play-next" onClick={() => playFromTrack(index)} aria-label={`Play ${track.title} and queue the remaining playlist tracks`} title="Play from here and queue the remaining tracks"><ListMusic size={15}/></button></span>
          </article>) : <p className="nlm-shared-filter-empty" role="status">No tracks match “{trackQuery}”. Try another title, artist, or genre.</p> : <p className="nlm-empty-state">This playlist does not have any tracks yet.</p>}</div>
          <small className="nlm-share-privacy">Only public playlist details and track metadata are shown here.</small>
        </section>}
      </div>
      <footer className="nlm-site-footer"><div className="nlm-footer-brand"><span className="nlm-brand-mark"><Music2 size={16}/></span> nlm<span className="nlm-brand-light">songs</span></div><p>© {new Date().getFullYear()} NLM Songs</p></footer>
    </main>
  </div>;
};

export default SharedPlaylistPage;
