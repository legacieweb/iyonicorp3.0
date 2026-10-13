import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NLMSongs from './NLMSongs';
import NLMSongsSite from './NLMSongsSite';
import NLMSharedPlaylistPage from './components/NLMSharedPlaylistPage';
import NLMSongsAuthPage from './components/NLMSongsAuthPage';
import SEO from '../../../components/SEO';

const NLMSongsRouter = ({ adminDashboard }: { adminDashboard?: ReactNode }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const path = pathname.replace(/\/$/, '') || '/nlmsongs';
  useEffect(() => { if (path === '/nlmsongs/new') navigate('/nlmsongs/listen', { replace: true }); }, [path, navigate]);
  useEffect(() => { if (path === '/nlmsongs/my-list') navigate('/nlmsongs/library', { replace: true }); }, [path, navigate]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/nlmsongs-service-worker.js').catch(() => {});
    if ('storage' in navigator && 'persist' in navigator.storage) void navigator.storage.persist().catch(() => {});
  }, []);
  const isAdminDashboard = path === '/nlmsongs/dashboard';
  const authMode = path === '/nlmsongs/register' ? 'register' : path === '/nlmsongs/login' ? 'login' : null;
  const isSharedPlaylist = path.startsWith('/nlmsongs/playlist/');
  const isListenerPage = path === '/nlmsongs/listen'
    || path === '/nlmsongs/library'
    || path === '/nlmsongs/downloads'
    || path === '/nlmsongs/settings'
    || /^\/nlmsongs\/track\/[^/]+$/.test(path);
  const isPrivatePage = isAdminDashboard || authMode !== null || path === '/nlmsongs/library' || path === '/nlmsongs/downloads' || path === '/nlmsongs/settings' || path.startsWith('/nlmsongs/playlist/');
  const isGenresPage = path === '/nlmsongs/genres';
  const isTrackPage = /^\/nlmsongs\/track\/[^/]+$/.test(path);
  const metadata = isGenresPage
    ? { title: 'Explore Music Genres', description: 'Browse the NLM Songs music catalog by genre. Discover independent artists, new releases, and sounds selected for every mood.' }
    : isTrackPage
      ? { title: 'Listen to Music on NLM Songs', description: 'Discover independent music, explore new releases, and find your next favorite track on NLM Songs.' }
      : { title: 'Discover Independent Music', description: 'Stream independent music, discover emerging artists, explore new releases, and build your personal music library with NLM Songs.' };

  if (authMode) return <><SEO title={authMode === 'register' ? 'Create Your NLM Songs Account' : 'Sign In to NLM Songs'} description="Access your NLM Songs music library, playlists, and listening preferences." canonical={`https://iyonicorp.com/#${path}`} noIndex /><NLMSongsAuthPage mode={authMode} /></>;

  return <>
    <SEO title={metadata.title} description={metadata.description} keywords="NLM Songs, stream independent music, discover new music, independent artists, music genres, new releases" canonical={`https://iyonicorp.com/#${path}`} noIndex={isPrivatePage} />
    <NLMSongs isVisible={!isAdminDashboard && isListenerPage} />
    <NLMSongsSite isVisible={!isAdminDashboard && !isListenerPage && !isSharedPlaylist} />
    <NLMSharedPlaylistPage isVisible={isSharedPlaylist} />
    {isAdminDashboard && adminDashboard}
  </>;
};

export default NLMSongsRouter;
