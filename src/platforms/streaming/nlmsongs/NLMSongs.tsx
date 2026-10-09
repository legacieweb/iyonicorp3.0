import { FileAudio2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getAudioExtension,
  sanitizeFilename,
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

type View = 'Listen' | 'Your Library' | 'Settings';

const viewForPath = (pathname: string): View => {
  if (pathname.replace(/\/$/, '') === '/nlmsongs/library') return 'Your Library';
  if (pathname.replace(/\/$/, '') === '/nlmsongs/settings') return 'Settings';
  return 'Listen';
};

const NLMSongs = ({ mode = 'client', isVisible = true }: { mode?: 'client' | 'admin'; isVisible?: boolean }) => {
  const { user, logout } = useAuth();
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
  const [genreFilter, setGenreFilter] = useState(() => localStorage.getItem('nlm-genre-filter') || '');
  const [sortOrder, setSortOrder] = useState<'recent' | 'title' | 'artist'>('recent');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAdminMode = mode === 'admin' || user?.role === 'manager_admin';

  const queue = useQueue();
  const favorites = useFavorites(user?.id);
  const eq = useEqualizer(audioRef);
  const sleepTimer = useSleepTimer();
  const visualizerCanvasRef = useVisualizer(showVisualizer, audioRef);

  const routeTrackId = extractRouteTrackId(location.pathname);
  const isDetailRoute = routeTrackId !== null && view !== 'Settings';
  const selectedTrack = tracks.find((track) => track.id === selectedId) ?? null;
  const detailTrack = routeTrackId
    ? tracks.find((track) => track.id === routeTrackId) ?? null
    : null;

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
      : nextView === 'Settings' ? '/nlmsongs/settings' : '/nlmsongs/listen';
    if (location.pathname !== path) navigate(path);
  };
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  const genres = useMemo(
    () => [
      ...new Set(tracks.map((track) => track.genre.trim()).filter(Boolean)),
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
      result = result.filter((track) => track.genre === genreFilter);
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
          audioRef.current.play().catch(() => {});
        }
      };
      void start();
    };
    window.addEventListener('nlm:play-playlist', handlePlaylistPlay);
    return () => window.removeEventListener('nlm:play-playlist', handlePlaylistPlay);
  }, [tracks, selectedId, queue.clearQueue, queue.addToQueue, navigate]);

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

      if (!selectedId && mapped.length) {
        setSelectedId(
          mapped.find((track) => track.id === routeTrackId)?.id ?? mapped[0].id,
        );
      }
    } catch {
      setCatalogError(
        'The song catalogue could not be reached. Check your connection and try again.',
      );
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

  const downloadTrack = async (track: Track | null = selectedTrack) => {
    if (!track || !track.audioUrl) return;
    setDownloadError('');
    if (!user) {
      navigate(
        `/register?role=customer&redirect=${encodeURIComponent(
          `/nlmsongs/track/${encodeURIComponent(track.id)}`,
        )}`,
      );
      return;
    }

    try {
      const audio = await nlmsongsAPI.download(track.id);
      const extension = getAudioExtension(track.audioUrl);
      const filename = `${sanitizeFilename(track.title, track.artist)}.${extension}`;
      const objectUrl = URL.createObjectURL(audio);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setDownloadError('This track could not be downloaded right now. Please try again.');
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

  const openAccount = () =>
    navigate(
      user?.role === 'manager_admin'
        ? '/admin/dashboard'
        : user?.role === 'seller_manager'
          ? '/manager/dashboard'
          : user?.role === 'seller'
            ? '/nlmsongs/dashboard'
            : '/customer/dashboard',
    );

  const signOut = () => {
    setAccountMenuOpen(false);
    logout();
    navigate('/nlmsongs');
  };

  const openThemes = () => {
    setAccountMenuOpen(false);
    navigate('/themes', {
      state: { from: user?.role === 'manager_admin' ? '/admin/dashboard' : '/nlmsongs/dashboard' },
    });
  };

  const openSignIn = () => {
    setAccountMenuOpen(false);
    navigate(`/login?redirect=${encodeURIComponent('/nlmsongs')}`);
  };

  const openRegistration = () => {
    setAccountMenuOpen(false);
    navigate(`/register?role=customer&redirect=${encodeURIComponent('/nlmsongs')}`);
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
        src={resolveAssetUrl(selectedTrack?.audioUrl)}
        preload="metadata"
        {...audioPlayer.handlers}
      />

      <NLMSidebar
        view={view}
        trackCount={tracks.length}
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
                eyebrow={view === 'Your Library' ? 'YOUR COLLECTION' : 'A ROOM OF YOUR OWN'}
                title={view === 'Your Library' ? 'Your library.' : 'Find your next listen.'}
                copy={view === 'Your Library' ? 'Your saved tracks, ready when you are.' : isAdminMode ? 'Explore new releases, tune into a genre, or browse the full catalogue.' : 'Start with a fresh release, explore a sound, or search the catalogue.'}
                index={view === 'Listen' ? '01' : '02'}
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

              <NLMLibraryArea
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
              />
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
                <div className="nlm-settings-group-heading"><span>ACCOUNT</span><small>Your NLM Songs profile</small></div>
                <div className="nlm-settings-controls nlm-settings-rows">
                  <div className="nlm-settings-row"><span><strong>Signed in as</strong><small>{user?.name || user?.email || 'Guest listener'}</small></span>{user ? <button className="nlm-settings-action" onClick={openAccount}>Manage account</button> : <button className="nlm-settings-action" onClick={openSignIn}>Sign in</button>}</div>
                  <div className="nlm-settings-row"><span><strong>Catalogue</strong><small>{tracks.length} published tracks available</small></span><button className="nlm-settings-action" onClick={() => navigateToView('Listen')}>Browse listening</button></div>
                </div>
              </div>

              <div className="nlm-settings-group">
                <div className="nlm-settings-group-heading"><span>YOUR LIBRARY</span><small>Your saved tracks are stored with this browser.</small></div>
                <div className="nlm-settings-controls nlm-settings-rows">
                  <div className="nlm-settings-row"><span><strong>Saved tracks</strong><small>{favorites.favorites.length} tracks in your library</small></span><button className="nlm-settings-action" onClick={() => navigateToView('Your Library')}>Open library</button></div>
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
        {downloadError && (
          <NLMPlayerError
            message={downloadError}
            onDismiss={() => setDownloadError('')}
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
        hasUser={Boolean(user)}
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
        onDownload={() => void downloadTrack(selectedTrack)}
        onShare={shareTrack}
        onOpenPlaylist={() => setShowPlaylistModal(true)}
      />
    </div>
  );
};

export default NLMSongs;
