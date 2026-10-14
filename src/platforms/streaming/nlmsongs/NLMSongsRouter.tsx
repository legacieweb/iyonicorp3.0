import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NLMSongs from './NLMSongs';
import NLMSongsSite from './NLMSongsSite';
import NLMSharedPlaylistPage from './components/NLMSharedPlaylistPage';
import NLMSongsAuthPage from './components/NLMSongsAuthPage';
import SEO from '../../../components/SEO';

const NLMSongsRouter = ({ adminDashboard }: { adminDashboard?: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, '') || '/nlmsongs';
  const preserveListenerState = Boolean((location.state as { openDeviceDownloads?: boolean } | null)?.openDeviceDownloads);
  useEffect(() => { if (path === '/nlmsongs/listen' && !preserveListenerState) navigate('/nlmsongs', { replace: true, state: location.state }); }, [path, navigate, preserveListenerState, location.state]);
  useEffect(() => { if (path === '/nlmsongs/new') navigate('/nlmsongs', { replace: true }); }, [path, navigate]);
  useEffect(() => { if (path === '/nlmsongs/genres') navigate('/nlmsongs', { replace: true }); }, [path, navigate]);
  useEffect(() => { if (path === '/nlmsongs/my-list') navigate('/nlmsongs/library', { replace: true }); }, [path, navigate]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/nlmsongs-service-worker.js').catch(() => {});
    if ('storage' in navigator && 'persist' in navigator.storage) void navigator.storage.persist().catch(() => {});
  }, []);
  const isAdminDashboard = path === '/nlmsongs/dashboard';
  const authMode = path === '/nlmsongs/register' ? 'register' : path === '/nlmsongs/login' ? 'login' : null;
  const isSharedPlaylist = path.startsWith('/nlmsongs/playlist/');
  const isListenerPage = (path === '/nlmsongs/listen' && preserveListenerState)
    || path === '/nlmsongs/library'
    || path === '/nlmsongs/downloads'
    || path === '/nlmsongs/settings'
    || /^\/nlmsongs\/track\/[^/]+$/.test(path);
  const isPrivatePage = isAdminDashboard || authMode !== null || path === '/nlmsongs/library' || path === '/nlmsongs/downloads' || path === '/nlmsongs/settings' || path.startsWith('/nlmsongs/playlist/');
  const isTrackPage = /^\/nlmsongs\/track\/[^/]+$/.test(path);
  const isListenPage = path === '/nlmsongs/listen' || path === '/nlmsongs';
  const metadata = isTrackPage
      ? { title: 'Independent Music Track Details', description: 'Listen to independent artists and explore track details, lyrics, and related music on NLM Songs.' }
      : isListenPage
        ? { title: 'Listen to Independent Music', description: 'Stream independent music, discover new releases, and build your personal library with NLM Songs.' }
        : { title: 'Discover Independent Music on NLM Songs', description: 'Find independent artists, explore new releases, and discover music selected for every mood on NLM Songs.' };
  const canonicalBase = typeof window === 'undefined' ? 'https://iyonicorp.com' : window.location.origin;

  if (authMode) return <><SEO title={authMode === 'register' ? 'Create Your NLM Songs Account' : 'Sign In to NLM Songs'} description="Access your NLM Songs music library, playlists, and listening preferences." canonical={`${canonicalBase}/#${path}`} noIndex /><NLMSongsAuthPage mode={authMode} /></>;

  return <>
    <SEO title={metadata.title} description={metadata.description} keywords="NLM Songs, independent music, emerging artists, new music releases, music genres, online music streaming" canonical={`${canonicalBase}/#${path}`} noIndex={isPrivatePage} />
    <NLMSongs isVisible={!isAdminDashboard && isListenerPage} showFloatingPlayer={!isAdminDashboard && !authMode} />
    <NLMSongsSite isVisible={!isAdminDashboard && !isListenerPage && !isSharedPlaylist} />
    <NLMSharedPlaylistPage isVisible={isSharedPlaylist} />
    {isAdminDashboard && adminDashboard}
  </>;
};

export default NLMSongsRouter;
