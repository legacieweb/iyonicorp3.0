import { useCallback, useEffect, useState } from 'react';
import { Music2, Play } from 'lucide-react';
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
  useEffect(() => {
    let active = true;
    if (!isVisible || !playlistId) return () => { active = false; };
    setState('loading');
    playlistsAPI.getShared(playlistId).then((value) => { if (active) { setPlaylist(value); setState('ready'); } })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [isVisible, playlistId]);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigateDiscovery = (view: 'Genres' | 'My List' | 'Playlists') => { navigate(`/nlmsongs/${view === 'My List' ? 'my-list' : view.toLowerCase()}`); closeMobileNav(); };
  const navigateView = (view: NLMView) => { navigate(view === 'Settings' ? '/nlmsongs/settings' : view === 'Your Library' ? '/nlmsongs/library' : '/nlmsongs/listen'); closeMobileNav(); };
  const playTracks = (trackIds: string[]) => window.dispatchEvent(new CustomEvent('nlm:play-playlist', { detail: { trackIds } }));
  return <div hidden={!isVisible} className={`nlm-member-app nlm-app-shell ${mobileNavOpen ? 'nlm-mobile-nav-open' : ''}`}>
    <NLMMobileNavControls isOpen={mobileNavOpen} onToggle={() => setMobileNavOpen((open) => !open)} onClose={closeMobileNav}/>
    <NLMSidebar view="Listen" trackCount={0} isAdminMode={false} onNavigate={navigateView} onNavigateDiscovery={navigateDiscovery} mobileOpen={mobileNavOpen} onMobileClose={closeMobileNav}/>
    <main className="nlm-main nlm-shared-playlist-main">
      <div className="nlm-workspace">
        {state === 'loading' ? <p className="nlm-empty-state" role="status">Loading shared playlist…</p> : state === 'error' || !playlist ? <section className="nlm-shared-state"><span className="nlm-eyebrow">NLM SONGS</span><h1>Playlist unavailable</h1><p>This playlist may be private or no longer available.</p><button className="nlm-ghost-button" onClick={() => navigate('/nlmsongs/listen')}>Explore NLM Songs</button></section> : <section className="nlm-shared-playlist">
          <span className="nlm-eyebrow">PUBLIC PLAYLIST · NLM SONGS</span><h1>{playlist.name}</h1>{playlist.description && <p>{playlist.description}</p>}<div className="nlm-shared-playlist-actions"><span className="nlm-shared-count">{playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}</span><button className="nlm-submit-button" onClick={() => playTracks(playlist.tracks.map((track) => track.id))} disabled={!playlist.tracks.length}><Play size={14} fill="currentColor"/> Play playlist</button></div>
          <div className="nlm-shared-track-list">{playlist.tracks.length ? playlist.tracks.map((track, index) => <article className="nlm-shared-track" key={track.id}>
            <span className="nlm-shared-index">{String(index + 1).padStart(2, '0')}</span><span className="nlm-shared-art">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt=""/> : <Music2 size={18}/>}</span><span className="nlm-shared-track-copy"><strong>{track.title}</strong><small>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</small></span><button className="nlm-ghost-button" onClick={() => playTracks([track.id])} aria-label={`Play ${track.title}`}><Play size={14} fill="currentColor"/></button>
          </article>) : <p className="nlm-empty-state">This playlist does not have any tracks yet.</p>}</div>
          <small className="nlm-share-privacy">Only public playlist details and track metadata are shown here.</small>
        </section>}
      </div>
      <footer className="nlm-site-footer"><div className="nlm-footer-brand"><span className="nlm-brand-mark"><Music2 size={16}/></span> nlm<span className="nlm-brand-light">songs</span></div><p>© {new Date().getFullYear()} NLM Songs</p></footer>
    </main>
  </div>;
};

export default SharedPlaylistPage;
