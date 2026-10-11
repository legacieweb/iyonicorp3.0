import { Download, FileAudio2, Loader2, Music2, Play, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  nlmsongsAPI,
  historyAPI,
  type NLMSong,
} from '../../../services/api';
import {
  resolveAssetUrl,
  toTrack,
  extractRouteTrackId,
  activeLyricIndex,
  genreIdentity,
  normalizeGenreName,
} from './utils';
import {
  useAudioPlayer,
  useQueue,
  useFavorites,
  useEqualizer,
  useSleepTimer,
  useVisualizer,
  useKeyboardShortcuts,
} from './hooks';
import {
  NLMSidebar,
  NLMTopbar,
  NLMHeroPanel,
  NLMUploadForm,
  NLMLyricsOverlay,
  NLMTrackDetail,
  NLMQueuePanel,
  NLMEQModal,
  NLMSleepTimerModal,
  NLMPlaylistModal,
  NLMLibraryArea,
  NLMPageHeading,
  NLMPlayerError,
  NLMGenreChips,
  NLMAudioPlayer,
} from './components';
import type { Track } from './types';
import NLMEqualizerControl from './components/NLMEqualizerControl';
import NLMMobileNavControls from './components/NLMMobileNavControls';
import './nlmsongs.css';
import {
  deleteOfflineAudio,
  readAllOfflineAudio,
  readOfflineAudio,
  readOfflineCatalog,
  storeOfflineAudio,
  storeOfflineCatalog,
  supportsOfflineAudio,
  type OfflineAudioRecord,
} from './offlineAudio';

type View = 'Listen' | 'Your Library' | 'Downloads' | 'Settings';

const viewForPath = (pathname: string): View => {
  if (pathname.replace(/\/$/, '') === '/nlmsongs/library') return 'Your Library';
  if (pathname.replace(/\/$/, '') === '/nlmsongs/downloads') return 'Downloads';
  if (pathname.replace(/\/$/, '') === '/nlmsongs/settings') return 'Settings';
  return 'Listen';
};

const trackFromOfflineRecord = (record: OfflineAudioRecord): Track => record.track ?? ({
  id: record.id,
  title: record.title || 'Saved track',
  artist: 'NLM Songs',
  description: 'Saved for offline listening.',
  genre: '',
  tags: [],
  audioUrl: '',
  lyrics: [],
  syncLyrics: false,
  isActive: true,
});

const NLMSongs = ({ mode = 'client', isVisible = true }: { mode?: 'client' | 'admin'; isVisible?: boolean }) => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingAutoplayRef = useRef(false);

  const [view, setView] = useState<View>(() => viewForPath(location.pathname));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState(() => normalizeGenreName(localStorage.getItem('nlm-genre-filter') || ''));
  const [sortOrder, setSortOrder] = useState<'recent' | 'title' | 'artist'>('recent');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [offlineState, setOfflineState] = useState<'idle' | 'loading' | 'saved' | 'error' | 'unsupported'>(supportsOfflineAudio() ? 'idle' : 'unsupported');
  const [offlineProgress, setOfflineProgress] = useState<number | null>(0);
  const [offlineMessage, setOfflineMessage] = useState('');
  const [offlineSource, setOfflineSource] = useState<{ trackId: string; url: string } | null>(null);
  const [offlineDownloads, setOfflineDownloads] = useState<OfflineAudioRecord[]>([]);
  const offlineObjectUrlRef = useRef<{ trackId: string; url: string } | null>(null);
  const [profileDraft, setProfileDraft] = useState({ firstName: '', lastName: '', phoneNumber: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');

  const isAdminMode = mode === 'admin' || user?.role === 'manager_admin';

  const queue = useQueue();
  const favorites = useFavorites(user?.id);
  const eq = useEqualizer(audioRef);
  const sleepTimer = useSleepTimer();
  const visualizerCanvasRef = useVisualizer(showVisualizer, audioRef);

  const reloadOfflineDownloads = useCallback(async () => {
    if (!supportsOfflineAudio()) return;
    try { setOfflineDownloads(await readAllOfflineAudio()); }
    catch { setOfflineDownloads([]); }
  }, []);

  useEffect(() => { void reloadOfflineDownloads(); }, [reloadOfflineDownloads]);

  useEffect(() => {
    if (!user) {
      setProfileDraft({ firstName: '', lastName: '', phoneNumber: '' });
      setProfileFeedback('');
      return;
    }
    const nameParts = (user.name || '').trim().split(/\s+/);
    setProfileDraft({
      firstName: user.firstName || nameParts[0] || '',
      lastName: user.lastName || nameParts.slice(1).join(' '),
      phoneNumber: user.phoneNumber || '',
    });
  }, [user]);

  const routeTrackId = extractRouteTrackId(location.pathname);
  const isDetailRoute = routeTrackId !== null && view !== 'Settings';
  const selectedTrack = tracks.find((track) => track.id === selectedId) ?? null;
  const detailTrack = routeTrackId
    ? tracks.find((track) => track.id === routeTrackId) ?? null
    : null;

  const activateOfflineBlob = useCallback((trackId: string, blob: Blob) => {
    const previous = offlineObjectUrlRef.current;
    if (previous) URL.revokeObjectURL(previous.url);
    const url = URL.createObjectURL(blob);
    offlineObjectUrlRef.current = { trackId, url };
    setOfflineSource({ trackId, url });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setOfflineMessage('');
    setOfflineProgress(0);
    setOfflineState(supportsOfflineAudio() ? 'idle' : 'unsupported');
    if (!selectedTrack) return;
    void readOfflineAudio(selectedTrack.id).then((saved) => {
      if (cancelled || !saved) return;
      setOfflineState('saved');
      setOfflineMessage('Available offline in this browser.');
      // Never replace the media source underneath a playing track. It will be
      // picked up the next time this track is selected or the app is reopened.
      const audio = audioRef.current;
      if (!pendingAutoplayRef.current && audio && (!audio.paused || audio.currentTime > 0)) return;
      activateOfflineBlob(selectedTrack.id, saved.blob);
    }).catch(() => {
      if (!cancelled) setOfflineMessage('Offline storage could not be checked.');
    });
    return () => {
      cancelled = true;
      const current = offlineObjectUrlRef.current;
      if (current?.trackId === selectedTrack.id) {
        URL.revokeObjectURL(current.url);
        offlineObjectUrlRef.current = null;
      }
    };
  }, [selectedTrack?.id, activateOfflineBlob]);

  useEffect(() => () => {
    if (offlineObjectUrlRef.current) URL.revokeObjectURL(offlineObjectUrlRef.current.url);
    offlineObjectUrlRef.current = null;
  }, []);

  const saveTrackOffline = async () => {
    if (!detailTrack || offlineState === 'loading' || offlineState === 'saved') return;
    if (!supportsOfflineAudio()) {
      setOfflineState('unsupported');
      setOfflineMessage('This browser does not support app-managed offline storage.');
      return;
    }
    setOfflineState('loading');
    setOfflineMessage('Audio is being saved in this browser for offline playback.');
    setOfflineProgress(null);
    try {
      const audioBlob = await nlmsongsAPI.download(detailTrack.id);
      setOfflineProgress(92);
      await storeOfflineAudio(detailTrack.id, detailTrack.title, audioBlob, detailTrack);
      await reloadOfflineDownloads();
      setOfflineProgress(100);
      const audio = audioRef.current;
      if (selectedId === detailTrack.id && audio?.paused && audio.currentTime === 0) {
        activateOfflineBlob(detailTrack.id, audioBlob);
      }
      setOfflineState('saved');
      setOfflineMessage('Available offline in this browser.');
    } catch (error) {
      setOfflineState('error');
      setOfflineMessage(error instanceof Error ? error.message : 'Could not save this track for offline listening.');
    }
  };

  useEffect(() => {
    setView(viewForPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (genreFilter) localStorage.setItem('nlm-genre-filter', genreFilter);
    else localStorage.removeItem('nlm-genre-filter');
  }, [genreFilter]);

  const navigateToView = (nextView: View) => {
    setView(nextView);
    const path = nextView === 'Your Library'
      ? '/nlmsongs/library'
      : nextView === 'Downloads' ? '/nlmsongs/downloads'
        : nextView === 'Settings' ? '/nlmsongs/settings' : '/nlmsongs/listen';
    if (location.pathname !== path) navigate(path);
  };

  const removeOfflineDownload = async (id: string) => {
    try {
      await deleteOfflineAudio(id);
      if (selectedId === id) {
        audioRef.current?.pause();
        setSelectedId(null);
      }
      const activeOfflineSource = offlineObjectUrlRef.current;
      if (activeOfflineSource?.trackId === id) {
        URL.revokeObjectURL(activeOfflineSource.url);
        offlineObjectUrlRef.current = null;
        setOfflineSource(null);
      }
      await reloadOfflineDownloads();
    } catch {
      setOfflineMessage('This download could not be removed. Try again.');
    }
  };
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  const genres = useMemo(
    () => [
      ...new Map(tracks.filter((track) => genreIdentity(track.genre)).map((track) => [genreIdentity(track.genre), normalizeGenreName(track.genre)] as const)).values(),
    ].sort((a, b) => a.localeCompare(b)),
    [tracks],
  );

  const filteredTracks = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = tracks;

    if (showFavoritesOnly || (view === 'Your Library' && !isAdminMode)) {
      result = result.filter((track) => favorites.favorites.includes(track.id));
    }
    if (genreFilter) {
      result = result.filter((track) => genreIdentity(track.genre) === genreIdentity(genreFilter));
    }
    if (query) {
      result = result.filter((track) =>
        [track.title, track.artist, track.genre, track.description, ...track.tags].some(
          (value) => String(value).toLowerCase().includes(query),
        ),
      );
    }
    if (sortOrder === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortOrder === 'artist') {
      result = [...result].sort((a, b) => a.artist.localeCompare(b.artist));
    }
    return result;
  }, [search, tracks, showFavoritesOnly, favorites.favorites, user, genreFilter, sortOrder, view, isAdminMode]);

  const featuredTrack = filteredTracks[0] ?? tracks[0] ?? null;

  const playNext = useCallback(() => {
    if (!selectedTrack || !tracks.length) return;
    if (queue.queue.length) {
      const nextTrack = queue.queue[0];
      queue.removeFromQueue(0);
      pendingAutoplayRef.current = true;
      setSelectedId(nextTrack.id);
      if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(nextTrack.id)}`);
      return;
    }
    const currentIndex = tracks.findIndex((t) => t.id === selectedId);
    if (currentIndex === -1) return;

    if (queue.shuffleMode) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const nextTrack = tracks[randomIndex];
      pendingAutoplayRef.current = true;
      setSelectedId(nextTrack.id);
      if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(nextTrack.id)}`);
      return;
    }

    if (queue.repeatMode === 'one') {
      pendingAutoplayRef.current = true;
      audioRef.current?.load();
      audioRef.current?.play().catch(() => {});
      return;
    }

    if (currentIndex < tracks.length - 1) {
      const nextTrack = tracks[currentIndex + 1];
      pendingAutoplayRef.current = true;
      setSelectedId(nextTrack.id);
      if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(nextTrack.id)}`);
    } else if (queue.repeatMode === 'all') {
      const nextTrack = tracks[0];
      pendingAutoplayRef.current = true;
      setSelectedId(nextTrack.id);
      if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(nextTrack.id)}`);
    }
  }, [selectedTrack, tracks, selectedId, queue.queue, queue.removeFromQueue, queue.shuffleMode, queue.repeatMode, isDetailRoute, navigate]);

  const playPrevious = useCallback(() => {
    if (!selectedTrack || !tracks.length) return;
    const currentIndex = tracks.findIndex((t) => t.id === selectedId);
    if (currentIndex === -1) return;

    if (audioRef.current?.currentTime && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    const previousTrack = tracks[prevIndex];
    pendingAutoplayRef.current = true;
    setSelectedId(previousTrack.id);
    if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(previousTrack.id)}`);
  }, [selectedTrack, tracks, selectedId, isDetailRoute, navigate]);

  const audioPlayer = useAudioPlayer({
    audioRef,
    selectedTrack,
    pendingAutoplayRef,
    onEnded: playNext,
  });

  useEffect(() => {
    const handlePlaylistPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ trackIds?: string[] }>).detail;
      const ids = Array.isArray(detail?.trackIds) ? [...new Set(detail.trackIds)] : [];
      if (!ids.length) return;
      const start = async () => {
        let available = tracks;
        if (ids.some((id) => !available.some((track) => track.id === id))) {
          try {
            const latest = (await nlmsongsAPI.list()).map(toTrack).filter((track) => track.isActive);
            setTracks(latest);
            available = latest;
          } catch { return; }
        }
        const ordered = ids.map((id) => available.find((track) => track.id === id)).filter((track): track is Track => Boolean(track));
        if (!ordered.length) return;
        queue.clearQueue();
        ordered.slice(1).forEach(queue.addToQueue);
        const alreadySelected = selectedId === ordered[0].id;
        pendingAutoplayRef.current = !alreadySelected;
        setView('Listen');
        setSelectedId(ordered[0].id);
        navigate(`/nlmsongs/track/${encodeURIComponent(ordered[0].id)}`);
        if (alreadySelected && audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioPlayer.play();
        }
      };
      void start();
    };
    window.addEventListener('nlm:play-playlist', handlePlaylistPlay);
    return () => window.removeEventListener('nlm:play-playlist', handlePlaylistPlay);
  }, [tracks, selectedId, audioPlayer.play, queue.clearQueue, queue.addToQueue, navigate]);

  const seekBackward = () => {
    if (audioRef.current && audioPlayer.duration) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const seekForward = () => {
    if (audioRef.current && audioPlayer.duration) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + 10,
        audioPlayer.duration,
      );
    }
  };

  useKeyboardShortcuts({
    isDetailRoute,
    queueOpen,
    showEqualizer,
    showPlaylistModal,
    showSleepTimer,
    onTogglePlayback: audioPlayer.togglePlayback,
    onPlayNext: playNext,
    onPlayPrevious: playPrevious,
    onSeekBackward: seekBackward,
    onSeekForward: seekForward,
    onToggleShuffle: queue.toggleShuffle,
    onCycleRepeat: queue.cycleRepeat,
    onToggleQueue: () => setQueueOpen(!queueOpen),
    onOpenEqualizer: () => setShowEqualizer(true),
    onToggleVisualizer: () => setShowVisualizer(!showVisualizer),
    onOpenSleepTimer: () => setShowSleepTimer(true),
    onCloseQueue: () => setQueueOpen(false),
    onCloseEqualizer: () => setShowEqualizer(false),
    onClosePlaylist: () => setShowPlaylistModal(false),
    onCloseSleepTimer: () => setShowSleepTimer(false),
  });

  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    setCatalogError('');

    try {
      const songs: NLMSong[] = isAdminMode
        ? await nlmsongsAPI.listAdmin()
        : await nlmsongsAPI.list();

      const mapped = songs.map(toTrack).filter((track) => track.audioUrl);
      setTracks(mapped);
      if (!isAdminMode) void storeOfflineCatalog(mapped).catch(() => {});

      if (!selectedId && mapped.length) {
        setSelectedId(
          mapped.find((track) => track.id === routeTrackId)?.id ?? mapped[0].id,
        );
      }
    } catch {
      const [cachedCatalog, savedAudio] = await Promise.all([
        readOfflineCatalog().catch(() => []),
        readAllOfflineAudio().catch(() => []),
      ]);
      const cachedTracks = new Map(cachedCatalog.map((track) => [track.id, track]));
      savedAudio.forEach((record) => cachedTracks.set(record.id, trackFromOfflineRecord(record)));
      setOfflineDownloads(savedAudio);
      setTracks([...cachedTracks.values()]);
      setCatalogError(cachedTracks.size || savedAudio.length
        ? ''
        : 'The song catalogue is unavailable offline. Connect once to prepare NLM Songs for offline listening.');
      if (isAdminMode) {
        console.error('Could not load NLMSongs catalogue');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAdminMode, routeTrackId, selectedId]);

  useEffect(() => {
    void loadTracks();
  }, [isAdminMode]);

  useEffect(() => {
    if (!routeTrackId || !tracks.some((track) => track.id === routeTrackId)) return;
    setSelectedId(routeTrackId);
  }, [routeTrackId, tracks]);

  useEffect(() => {
    if (!selectedTrack) return;
    const trackHistory = JSON.parse(
      localStorage.getItem('nlm-recent-play') || '[]',
    ) as string[];
    const withoutDup = trackHistory.filter((id) => id !== selectedTrack.id);
    withoutDup.unshift(selectedTrack.id);
    const recentIds = withoutDup.slice(0, 50);
    localStorage.setItem('nlm-recent-play', JSON.stringify(recentIds));

    if (user) {
      void historyAPI.recordPlay(selectedTrack.id, 0, 0).catch(() => {});
    }
  }, [selectedId, user]);

  useEffect(() => {
    if (!showLyrics) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLyrics(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showLyrics]);

  const selectTrack = (track: Track) => {
    const switchingTrack = selectedId !== track.id;
    if (switchingTrack) {
      pendingAutoplayRef.current = true;
    }
    setSelectedId(track.id);
    setView('Listen');
    setShowLyrics(false);
    navigate(`/nlmsongs/track/${encodeURIComponent(track.id)}`);
    if (!switchingTrack) {
      void audioPlayer.togglePlayback();
    }
  };

  const showTrackLyrics = (track: Track) => {
    setSelectedId(track.id);
    setView('Listen');
    setShowLyrics(true);
  };

  const openUpload = () => {
    if (!isAdminMode) {
      navigateToView('Listen');
      setUploadOpen(false);
      return;
    }
    navigateToView('Your Library');
    setUploadOpen(true);
  };

  const handleUploadSuccess = () => {
    void loadTracks();
  };

  const handleDeleteTrack = async (track: Track) => {
    if (!isAdminMode) {
      if (selectedId === track.id) {
        audioRef.current?.pause();
        setSelectedId(null);
      }
      setTracks((current) => current.filter((item) => item.id !== track.id));
      return;
    }

    try {
      await nlmsongsAPI.remove(track.id);
      if (selectedId === track.id) {
        audioRef.current?.pause();
        setSelectedId(null);
      }
      setTracks((current) => current.filter((item) => item.id !== track.id));
    } catch {
      console.error('Could not delete track');
    }
  };

  const shareTrack = async () => {
    if (!selectedTrack) return;

    const shareData = {
      title: selectedTrack.title,
      text: `Listen to ${selectedTrack.title} by ${selectedTrack.artist} on NLM Songs`,
      url: `${window.location.origin}${window.location.pathname}#/nlmsongs/track/${encodeURIComponent(selectedTrack.id)}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
      } else {
        const field = document.createElement('textarea');
        field.value = shareData.url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        let copiedLink = false;
        try {
          field.select();
          copiedLink = document.execCommand('copy');
        } finally {
          document.body.removeChild(field);
        }
        if (!copiedLink) throw new Error('Clipboard access is unavailable.');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const openAccount = () => navigate(user?.role === 'seller' ? '/nlmsongs/dashboard' : '/nlmsongs/listen');

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileFeedback('');
    const firstName = profileDraft.firstName.trim();
    const lastName = profileDraft.lastName.trim();
    try {
      await updateProfile({
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phoneNumber: profileDraft.phoneNumber.trim(),
      });
      setProfileFeedback('Your account details are up to date.');
    } catch (error) {
      const responseMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setProfileFeedback(typeof responseMessage === 'string' ? responseMessage : 'We couldn’t save your details. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const signOut = () => {
    setAccountMenuOpen(false);
    logout();
    navigate('/nlmsongs');
  };

  const openThemes = () => {
    setAccountMenuOpen(false);
    navigate('/themes', {
      state: { from: '/nlmsongs/listen' },
    });
  };

  const openSignIn = () => {
    setAccountMenuOpen(false);
    navigate(`/nlmsongs/login?redirect=${encodeURIComponent('/nlmsongs/listen')}`);
  };

  const openRegistration = () => {
    setAccountMenuOpen(false);
    navigate(`/nlmsongs/register?redirect=${encodeURIComponent('/nlmsongs/listen')}`);
  };

  const handleSleepTimerStart = (seconds: number) => {
    sleepTimer.start(seconds, () => {
      audioRef.current?.pause();
      audioPlayer.togglePlayback();
    });
  };

  return (
    <div className={`nlm-app ${mobileNavOpen ? 'nlm-mobile-nav-open' : ''} ${isVisible ? '' : 'nlm-route-hidden'}`}>
      <NLMMobileNavControls isOpen={mobileNavOpen} onToggle={() => setMobileNavOpen((open) => !open)} onClose={closeMobileNav} />
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        src={selectedTrack && offlineSource?.trackId === selectedTrack.id ? offlineSource.url : resolveAssetUrl(selectedTrack?.audioUrl)}
        preload="none"
        {...audioPlayer.handlers}
      />

      <NLMSidebar
        view={view}
        trackCount={tracks.length}
        downloadCount={offlineDownloads.length}
        isAdminMode={isAdminMode}
        onNavigate={navigateToView}
        onNavigateDiscovery={(target) => navigate(`/nlmsongs/${target === 'My List' ? 'my-list' : target.toLowerCase()}`)}
        mobileOpen={mobileNavOpen}
        onMobileClose={closeMobileNav}
      />

      <main className="nlm-main">
        <NLMTopbar
          user={user ?? null}
          isAdminMode={isAdminMode}
          view={view}
          accountMenuOpen={accountMenuOpen}
          onAccountMenuToggle={() => setAccountMenuOpen((open) => !open)}
          onAccountMenuClose={() => setAccountMenuOpen(false)}
          onOpenAccount={openAccount}
          onOpenThemes={openThemes}
          onOpenSignIn={openSignIn}
          onOpenRegistration={openRegistration}
          onOpenUpload={openUpload}
          onSignOut={signOut}
        />

        <div className="nlm-workspace">
          {!isDetailRoute && view !== 'Settings' && (
            <section
              className={`nlm-library-area ${isDetailRoute ? 'is-detail-route' : ''}`}
              aria-labelledby="nlm-page-title"
            >
              <NLMPageHeading
                eyebrow={view === 'Downloads' ? 'READY WITHOUT WI-FI' : view === 'Your Library' ? 'YOUR COLLECTION' : 'A ROOM OF YOUR OWN'}
                title={view === 'Downloads' ? 'Your downloads.' : view === 'Your Library' ? 'Your library.' : 'Find your next listen.'}
                copy={view === 'Downloads' ? 'Songs saved in this browser, ready to play whenever you are.' : view === 'Your Library' ? 'Your saved tracks, ready when you are.' : isAdminMode ? 'Explore new releases, tune into a genre, or browse the full catalogue.' : 'Start with a fresh release, explore a sound, or search the catalogue.'}
                index={view === 'Listen' ? '01' : view === 'Your Library' ? '02' : '03'}
              />

              {view === 'Listen' && (
                <NLMHeroPanel
                  featuredTrack={featuredTrack}
                  isAdminMode={isAdminMode}
                  onPlay={selectTrack}
                  onUpload={openUpload}
                />
              )}

              {view === 'Listen' && genres.length > 0 && (
                <NLMGenreChips
                  tracks={tracks}
                  activeGenre={genreFilter}
                  onSelect={setGenreFilter}
                />
              )}

              {view === 'Downloads' ? <section className="nlm-downloads-panel" aria-labelledby="nlm-downloads-title">
                <div className="nlm-downloads-heading"><div><span className="nlm-eyebrow">SAVED ON THIS BROWSER</span><h2 id="nlm-downloads-title">Offline collection</h2></div><span>{offlineDownloads.length} {offlineDownloads.length === 1 ? 'song' : 'songs'}</span></div>
                {offlineDownloads.length ? <div className="nlm-downloads-list">{offlineDownloads.map((record) => {
                  const track = tracks.find((item) => item.id === record.id) ?? trackFromOfflineRecord(record);
                  return <article className="nlm-download-row" key={record.id}>
                    <div className="nlm-download-art" aria-hidden="true"><Music2 size={19} /></div>
                    <div className="nlm-download-meta"><strong>{track.title}</strong><span>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</span><small>Saved {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(record.savedAt)}</small></div>
                    <span className="nlm-download-ready"><span /> Available offline</span>
                    <button className="nlm-download-play" onClick={() => selectTrack(track)} aria-label={`Play ${track.title}`} title="Play"><Play size={15} fill="currentColor" /></button>
                    <button className="nlm-download-remove" onClick={() => void removeOfflineDownload(record.id)} aria-label={`Remove ${track.title} from downloads`} title="Remove download"><Trash2 size={15} /></button>
                  </article>;
                })}</div> : <div className="nlm-downloads-empty"><span><Download size={20}/></span><strong>No offline songs yet</strong><p>Open a song and choose <b>Save for offline</b>. It will be stored in this browser and appear here.</p><button className="nlm-settings-action" onClick={() => navigateToView('Listen')}>Explore songs</button></div>}
              </section> : <NLMLibraryArea
                tracks={filteredTracks}
                isLoading={isLoading}
                error={catalogError}
                search={search}
                sortOrder={sortOrder}
                showFavoritesOnly={showFavoritesOnly}
                hasUser={Boolean(user)}
                isAdminMode={isAdminMode}
                selectedId={selectedId}
                isPlaying={audioPlayer.isPlaying}
                favorites={favorites.favorites}
                isPersonalLibrary={view === 'Your Library' && !isAdminMode}
                onSearch={setSearch}
                onSortChange={setSortOrder}
                onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
                onTrackSelect={selectTrack}
                onFavorite={(track) => favorites.toggleFavorite(track.id)}
                onLyrics={showTrackLyrics}
                onQueue={(track) => {
                  queue.addToQueue(track);
                  setQueueOpen(true);
                }}
                onRemove={handleDeleteTrack}
                onRetry={loadTracks}
                onUpload={openUpload}
                onBrowse={() => navigateToView('Listen')}
                sectionEyebrow={isAdminMode ? 'CATALOGUE' : 'LIBRARY'}
                sectionTitle={view === 'Your Library' ? 'Your saved tracks' : 'Recently added'}
              />}
            </section>
          )}

          {!isDetailRoute && view === 'Settings' && (
            <section className="nlm-settings-page" aria-labelledby="nlm-settings-title">
              <span className="nlm-eyebrow">YOUR LISTENING ROOM</span>
              <h1 id="nlm-settings-title">Settings</h1>
              <p className="nlm-settings-intro">Manage your account and saved music. Playback tools stay close at hand in the player.</p>

              <div className="nlm-settings-group">
                <div className="nlm-settings-group-heading"><span>PLAYBACK · EQUALIZER</span><small>Ten frequency bands, applied to the current audio.</small></div>
                <div className="nlm-settings-equalizer"><NLMEqualizerControl eq={eq} /></div>
              </div>

              <div className="nlm-settings-group">
                <div className="nlm-settings-group-heading"><span>ACCOUNT DETAILS</span><small>Update your NLM Songs profile here.</small></div>
                {user ? <form className="nlm-profile-form" onSubmit={saveProfile}>
                  <div className="nlm-profile-form-grid">
                    <label>First name<input autoComplete="given-name" value={profileDraft.firstName} onChange={(event) => setProfileDraft((draft) => ({ ...draft, firstName: event.target.value }))} required /></label>
                    <label>Last name<input autoComplete="family-name" value={profileDraft.lastName} onChange={(event) => setProfileDraft((draft) => ({ ...draft, lastName: event.target.value }))} required /></label>
                    <label>Email address<input type="email" value={user.email || ''} readOnly aria-readonly="true" /></label>
                    <label>Phone number<input type="tel" autoComplete="tel" value={profileDraft.phoneNumber} onChange={(event) => setProfileDraft((draft) => ({ ...draft, phoneNumber: event.target.value }))} /></label>
                  </div>
                  <div className="nlm-profile-form-footer">
                    <span className="nlm-profile-feedback" role="status">{profileFeedback || `Signed in as ${user.name || user.email}`}</span>
                    <button className="nlm-profile-save" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save changes'}</button>
                  </div>
                </form> : <div className="nlm-settings-row"><span><strong>Your NLM Songs account</strong><small>Sign in to manage your profile and personal listening settings.</small></span><button className="nlm-settings-action" onClick={openSignIn}>Sign in</button></div>}
              </div>

              <div className="nlm-settings-group">
                <div className="nlm-settings-group-heading"><span>YOUR LIBRARY</span><small>Your saved tracks are stored with this browser.</small></div>
                <div className="nlm-settings-controls nlm-settings-rows">
                  <div className="nlm-settings-row"><span><strong>Saved tracks</strong><small>{favorites.favorites.length} tracks in your library</small></span><button className="nlm-settings-action" onClick={() => navigateToView('Your Library')}>Open library</button></div>
                  <div className="nlm-settings-row"><span><strong>Offline downloads</strong><small>{offlineDownloads.length} songs saved in this browser</small></span><button className="nlm-settings-action" onClick={() => navigateToView('Downloads')}>Open downloads</button></div>
                </div>
              </div>
            </section>
          )}

          {isDetailRoute && detailTrack && (
            <NLMTrackDetail
              track={detailTrack}
              currentTime={audioPlayer.currentTime}
              onBack={() => navigate('/nlmsongs/listen')}
              onShowLyrics={() => setShowLyrics(true)}
              offlineState={offlineState}
              offlineProgress={offlineProgress}
              offlineMessage={offlineMessage}
              onSaveOffline={saveTrackOffline}
            />
          )}

          {isDetailRoute && !detailTrack && (
            <div className="nlm-detail-loading" role={isLoading ? 'status' : 'alert'}>
              {isLoading ? <Loader2 size={18} className="nlm-spinner" /> : <FileAudio2 size={18} />}
              {isLoading ? 'Loading this track…' : catalogError || 'This track is not available in the catalogue.'}
              <button onClick={() => catalogError ? void loadTracks() : navigate('/nlmsongs/listen')}>
                {catalogError ? 'Try again' : 'Return to discovery'}
              </button>
            </div>
          )}

          {uploadOpen && (
            <section className="nlm-upload-section" aria-labelledby="nlm-upload-title">
              <NLMUploadForm
                userId={user?.id ?? null}
                onSubmit={handleUploadSuccess}
                onCancel={() => setUploadOpen(false)}
              />
            </section>
          )}
        </div>

        <NLMLyricsOverlay
          track={selectedTrack}
          isOpen={showLyrics}
          isPlaying={audioPlayer.isPlaying}
          currentTime={audioPlayer.currentTime}
          onClose={() => setShowLyrics(false)}
        />

        {audioPlayer.playerError && (
          <NLMPlayerError
            message={audioPlayer.playerError}
            onDismiss={audioPlayer.clearError}
          />
        )}

        <NLMQueuePanel
          queue={queue.queue}
          isOpen={queueOpen}
          selectedTrackId={selectedId}
          isPlaying={audioPlayer.isPlaying}
          onClose={() => setQueueOpen(false)}
          onRemove={queue.removeFromQueue}
        />

        <NLMEQModal eq={eq} isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />

        <NLMSleepTimerModal
          isOpen={showSleepTimer}
          timer={sleepTimer.timer}
          isActive={sleepTimer.isActive}
          onClose={() => setShowSleepTimer(false)}
          onStart={handleSleepTimerStart}
          onCancel={sleepTimer.clear}
        />

        <NLMPlaylistModal
          isOpen={showPlaylistModal}
          hasUser={Boolean(user)}
          trackId={selectedTrack?.id ?? null}
          onClose={() => setShowPlaylistModal(false)}
          onSignIn={openSignIn}
        />

        {showVisualizer && (
          <div className="nlm-visualizer" aria-hidden="true">
            <canvas ref={visualizerCanvasRef} className="nlm-visualizer-canvas" />
          </div>
        )}
      </main>
      <NLMAudioPlayer
        track={selectedTrack}
        isPlaying={audioPlayer.isPlaying}
        currentTime={audioPlayer.currentTime}
        duration={audioPlayer.duration}
        volume={audioPlayer.volume}
        shuffleMode={queue.shuffleMode}
        repeatMode={queue.repeatMode}
        isAdminMode={isAdminMode}
        isFavorite={selectedTrack ? favorites.isFavorite(selectedTrack.id) : false}
        copied={copied}
        onNowPlayingClick={() => selectedTrack && navigate(`/nlmsongs/track/${encodeURIComponent(selectedTrack.id)}`)}
        onTogglePlayback={audioPlayer.togglePlayback}
        onPreviousTrack={playPrevious}
        onNextTrack={playNext}
        onToggleShuffle={queue.toggleShuffle}
        onCycleRepeat={queue.cycleRepeat}
        onSeek={audioPlayer.seek}
        onSetVolume={audioPlayer.setVolume}
        onToggleFavorite={() => selectedTrack && favorites.toggleFavorite(selectedTrack.id)}
        onShare={shareTrack}
        onOpenPlaylist={() => setShowPlaylistModal(true)}
      />
    </div>
  );
};

export default NLMSongs;
