import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NLMSongs from './NLMSongs';
import NLMSongsSite from './NLMSongsSite';
import NLMSharedPlaylistPage from './components/NLMSharedPlaylistPage';
import NLMSongsAuthPage from './components/NLMSongsAuthPage';

const NLMSongsRouter = ({ adminDashboard }: { adminDashboard?: ReactNode }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const path = pathname.replace(/\/$/, '') || '/nlmsongs';
  useEffect(() => { if (path === '/nlmsongs/new') navigate('/nlmsongs/listen', { replace: true }); }, [path, navigate]);
  const isAdminDashboard = path === '/nlmsongs/dashboard';
  const authMode = path === '/nlmsongs/register' ? 'register' : path === '/nlmsongs/login' ? 'login' : null;
  const isSharedPlaylist = path.startsWith('/nlmsongs/playlist/');
  const isListenerPage = path === '/nlmsongs/listen'
    || path === '/nlmsongs/library'
    || path === '/nlmsongs/settings'
    || /^\/nlmsongs\/track\/[^/]+$/.test(path);

  if (authMode) return <NLMSongsAuthPage mode={authMode} />;

  return <>
    <NLMSongs isVisible={!isAdminDashboard && isListenerPage} />
    <NLMSongsSite isVisible={!isAdminDashboard && !isListenerPage && !isSharedPlaylist} />
    <NLMSharedPlaylistPage isVisible={isSharedPlaylist} />
    {isAdminDashboard && adminDashboard}
  </>;
};

export default NLMSongsRouter;
