import { Download, FileAudio2, Loader2, Music2, Play, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
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
  getAudioExtension,
  normalizeGenreName,
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
import NLMDiscoveryShelf from './components/NLMDiscoveryShelf';
import type { Track } from './types';
import NLMEqualizerControl from './components/NLMEqualizerControl';
import NLMMobileNavControls from './components/NLMMobileNavControls';
import './nlmsongs.css';
import {
  deleteOfflineAudio,
  readAllOfflineAudio,
  readOfflineAudio,
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

const trackFromOfflineRecord = (record: OfflineAudioRecord, coverUrl?: string): Track => record.track ? ({
  ...record.track,
  ...(coverUrl ? { coverUrl } : {}),
}) : ({
  id: record.id,
  title: record.title || 'Saved track',
  artist: 'NLM Songs',
  description: 'Saved for offline listening.',
  genre: '',
  tags: [],
  audioUrl: '',
  coverUrl,
  lyrics: [],
  syncLyrics: false,
  isActive: true,
});

const NLMSongs = ({ mode = 'client', isVisible = true, showFloatingPlayer = true }: { mode?: 'client' | 'admin'; isVisible?: boolean; showFloatingPlayer?: boolean }) => {
  const { user, logout, updateProfile } = useAuth();
  const { tenant } = useTenant();
  const sellerScopeId = tenant?.shopType === 'streaming' ? tenant.id : undefined;
  const navigate = useNavigate();
  const location = useLocation();

  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingAutoplayRef = useRef(false);
  const playbackSessionRef = useRef<{ trackId: string; sessionId: string; playedSeconds: number; lastMediaTime: number; lastSent: number } | null>(null);

  const [view, setView] = useState<View>(() => viewForPath(location.pathname));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState(() => normalizeGenreName(localStorage.getItem('nlm-genre-filter') || ''));
  const [sortOrder, setSortOrder] = useState<'recent' | 'title' | 'artist'>('recent');
  const [trackDisplayMode, setTrackDisplayMode] = useState<'grid' | 'list'>(() => localStorage.getItem('nlm-track-display-mode') === 'list' ? 'list' : 'grid');
  const [playHistoryCounts, setPlayHistoryCounts] = useState<Record<string, number> | null>(null);
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
  const [offlineNotice, setOfflineNotice] = useState('');
  const [deviceDownloadOpen, setDeviceDownloadOpen] = useState(false);
  const [deviceFavoriteTracks, setDeviceFavoriteTracks] = useState<Track[]>([]);
  const [deviceDownloadRecords, setDeviceDownloadRecords] = useState<OfflineAudioRecord[]>([]);
  const [deviceDownloadLoading, setDeviceDownloadLoading] = useState(false);
  const [deviceDownloadStarted, setDeviceDownloadStarted] = useState(false);
  const [deviceDownloadAllowed, setDeviceDownloadAllowed] = useState(false);
  const [deviceDownloadError, setDeviceDownloadError] = useState('');
  const offlineArtworkUrlsRef = useRef<Map<string, string>>(new Map());
  const offlineObjectUrlRef = useRef<{ trackId: string; url: string } | null>(null);
  const [profileDraft, setProfileDraft] = useState({ firstName: '', lastName: '', phoneNumber: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [listenerSubscription, setListenerSubscription] = useState<any>(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState<any>({});
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [subscriptionFeedback, setSubscriptionFeedback] = useState('');
  const [accessNotice, setAccessNotice] = useState('');

  const getOfflineArtworkUrl = useCallback((record: Pick<OfflineAudioRecord, 'id' | 'artworkBlob'>) => {
    if (!record.artworkBlob) return undefined;
    const existing = offlineArtworkUrlsRef.current.get(record.id);
    if (existing) return existing;
    const url = URL.createObjectURL(record.artworkBlob);
    offlineArtworkUrlsRef.current.set(record.id, url);
    return url;
  }, []);

  const isAdminMode = mode === 'admin' || user?.role === 'manager_admin';

  const queue = useQueue();
  const favorites = useFavorites(user?.id);
  const eq = useEqualizer(audioRef);
  const sleepTimer = useSleepTimer();
  const visualizerCanvasRef = useVisualizer(showVisualizer, audioRef);

  const reloadOfflineDownloads = useCallback(async () => {
    if (!supportsOfflineAudio()) return;
    try {
      const records = await readAllOfflineAudio();
      setOfflineDownloads(records);
      setTracks((current) => {
        const merged = new Map(current.map((track) => [track.id, track]));
        records.forEach((record) => {
          const offlineTrack = trackFromOfflineRecord(record, getOfflineArtworkUrl(record));
          const currentTrack = merged.get(record.id);
          merged.set(record.id, currentTrack ? { ...currentTrack, ...(offlineTrack.coverUrl ? { coverUrl: offlineTrack.coverUrl } : {}) } : offlineTrack);
        });
        return [...merged.values()];
      });
    }
    catch { setOfflineDownloads([]); }
  }, [getOfflineArtworkUrl]);

  useEffect(() => { void reloadOfflineDownloads(); }, [reloadOfflineDownloads]);

  useEffect(() => {
    const markOffline = () => { setIsOnline(false); setOfflineNotice('You’re offline. Only songs saved on this browser are available.'); };
    const markOnline = () => { setIsOnline(true); setOfflineNotice(''); };
    if (typeof navigator !== 'undefined' && !navigator.onLine) markOffline();
    window.addEventListener('offline', markOffline);
    window.addEventListener('online', markOnline);
    return () => {
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('online', markOnline);
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    if (!user) { setAvailablePlans([]); setListenerSubscription(null); setSubscriptionUsage({}); return; }
    void Promise.all([nlmsongsAPI.getSubscriptionPlans(), nlmsongsAPI.getSubscription()])
      .then(([plans, status]) => { if (!cancelled) { setAvailablePlans(plans); setListenerSubscription(status.subscription); setSubscriptionUsage(status.usage || {}); } })
      .catch((error) => { if (!cancelled) console.error('Could not load listener subscription:', error); });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (location.pathname !== '/nlmsongs/settings' || params.get('subscription') !== 'paystack' || !reference) return;
    setSubscriptionBusy(true); setSubscriptionFeedback('Confirming your Paystack payment…');
    void nlmsongsAPI.verifyPlanPayment(reference)
      .then(async (result) => { const status = await nlmsongsAPI.getSubscription(); setListenerSubscription(status.subscription); setSubscriptionUsage(status.usage || {}); setSubscriptionFeedback(result?.message || 'Your plan is active.'); navigate('/nlmsongs/settings', { replace: true }); })
      .catch((error: any) => setSubscriptionFeedback(error?.response?.data?.message || 'We could not verify that payment.'))
      .finally(() => setSubscriptionBusy(false));
  }, [location.pathname, location.search, navigate]);

  const routeTrackId = extractRouteTrackId(location.pathname);
  const isDetailRoute = routeTrackId !== null && view !== 'Settings';
  const selectedTrack = tracks.find((track) => track.id === selectedId) ?? null;
  useEffect(() => {
    if (selectedTrack) {
      window.dispatchEvent(new CustomEvent('nlm:playback-selected', { detail: { trackId: selectedTrack.id } }));
    } else {
      window.dispatchEvent(new Event('nlm:playback-cleared'));
    }
  }, [selectedTrack?.id]);
  const detailTrack = routeTrackId
    ? tracks.find((track) => track.id === routeTrackId) ?? null
    : null;

  const authorizeTrack = useCallback(async (track: Track, feature = 'streaming') => {
    if (!user) return true;
    if (!navigator.onLine && offlineDownloads.some((record) => record.id === track.id)) return true;
    try {
      const access = await nlmsongsAPI.checkPlaybackAccess(track.id, feature);
      if (!access.allowed) { setAccessNotice(access.reason || 'This action is not included in your current plan.'); return false; }
      setAccessNotice('');
      return true;
    } catch (error: any) {
      if (offlineDownloads.some((record) => record.id === track.id)) {
        setAccessNotice('Playing your saved offline copy.');
        return true;
      }
      setAccessNotice(error?.response?.data?.message || 'Could not confirm plan access. Reconnect and try again.');
      return false;
    }
  }, [user, offlineDownloads]);

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
      if (isOnline && !pendingAutoplayRef.current && audio && (!audio.paused || audio.currentTime > 0)) return;
      if (!isOnline) pendingAutoplayRef.current = true;
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
  }, [selectedTrack?.id, activateOfflineBlob, isOnline]);

  useEffect(() => () => {
    if (offlineObjectUrlRef.current) URL.revokeObjectURL(offlineObjectUrlRef.current.url);
    offlineObjectUrlRef.current = null;
    offlineArtworkUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    offlineArtworkUrlsRef.current.clear();
  }, []);

  const saveTrackOffline = async () => {
    if (!selectedTrack || offlineState === 'loading' || offlineState === 'saved') return;
    if (!supportsOfflineAudio()) {
      setOfflineState('unsupported');
      setOfflineMessage('This browser does not support app-managed offline storage.');
      return;
    }
    setOfflineState('loading');
    setOfflineMessage('Audio is being saved in this browser for offline playback.');
    setOfflineProgress(null);
    try {
      const access = await nlmsongsAPI.checkFeatureAccess('offline_listening');
      if (!access.allowed) throw new Error('Offline listening is not included in your current plan.');
      const offlineLimit = Number(access.limits?.offlineLimit);
      if (Number.isFinite(offlineLimit) && !offlineDownloads.some((record) => record.id === selectedTrack.id) && offlineDownloads.length >= offlineLimit) {
        throw new Error(`Your plan allows ${offlineLimit} offline saves. Remove a saved song or choose another plan.`);
      }
      const audioBlob = await nlmsongsAPI.download(selectedTrack.id);
      let artworkBlob: Blob | undefined;
      if (selectedTrack.coverUrl) {
        const response = await fetch(resolveAssetUrl(selectedTrack.coverUrl));
        if (!response.ok) throw new Error('Could not save cover artwork. Try again while connected.');
        artworkBlob = await response.blob();
        if (!artworkBlob.size) throw new Error('The cover artwork is empty. Try saving this track again.');
      }
      setOfflineProgress(92);
      await storeOfflineAudio(selectedTrack.id, selectedTrack.title, audioBlob, selectedTrack, artworkBlob);
      if (artworkBlob) {
        const coverUrl = getOfflineArtworkUrl({ id: selectedTrack.id, artworkBlob });
        setTracks((current) => current.map((track) => track.id === selectedTrack.id ? { ...track, coverUrl } : track));
      }
      await reloadOfflineDownloads();
      setOfflineProgress(100);
      const audio = audioRef.current;
      if (audio?.paused && audio.currentTime === 0) {
        activateOfflineBlob(selectedTrack.id, audioBlob);
      }
      setOfflineState('saved');
      setOfflineMessage('Available offline in this browser.');
    } catch (error) {
      setOfflineState('error');
      setOfflineMessage(error instanceof Error ? error.message : 'Could not save this track for offline listening.');
    }
  };

  const openDeviceDownloadModal = useCallback(() => {
    if (isAdminMode || deviceDownloadOpen) return;
    setDeviceDownloadOpen(true);
    setDeviceDownloadLoading(true);
    setDeviceDownloadStarted(false);
    setDeviceDownloadError('');
    setDeviceDownloadAllowed(false);
    setDeviceFavoriteTracks(tracks.filter((track) => favorites.favorites.includes(track.id)));
    void Promise.all([readAllOfflineAudio(), nlmsongsAPI.checkFeatureAccess('device_downloads')]).then(([records, access]) => {
      const favoriteIds = favorites.favorites;
      const favoriteTracks = new Map(tracks.filter((track) => favoriteIds.includes(track.id)).map((track) => [track.id, track]));
      records.filter((record) => favoriteIds.includes(record.id)).forEach((record) => {
        if (!favoriteTracks.has(record.id)) favoriteTracks.set(record.id, trackFromOfflineRecord(record, getOfflineArtworkUrl(record)));
      });
      setDeviceFavoriteTracks([...favoriteTracks.values()]);
      setDeviceDownloadRecords(records.filter((record) => favorites.favorites.includes(record.id)));
      setDeviceDownloadAllowed(access.allowed);
      if (!access.allowed) setDeviceDownloadError('Saving songs to your phone requires a plan that includes device downloads.');
    }).catch(() => {
      setDeviceDownloadRecords([]);
      setDeviceDownloadError('Could not check your plan access. Please try again.');
    }).finally(() => setDeviceDownloadLoading(false));
  }, [deviceDownloadOpen, favorites.favorites, getOfflineArtworkUrl, isAdminMode, tracks]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (isAdminMode || value.trim().normalize('NFKC').toLocaleLowerCase() !== 'sinagadhambi' || deviceDownloadOpen) return;
    setSearch('');
    openDeviceDownloadModal();
  };

  useEffect(() => {
    if ((location.state as { openDeviceDownloads?: boolean } | null)?.openDeviceDownloads !== true) return;
    openDeviceDownloadModal();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate, openDeviceDownloadModal]);

  const downloadOfflineTrackToDevice = async (record: OfflineAudioRecord) => {
    try {
      await nlmsongsAPI.authorizeDeviceDownload(record.id);
      const title = record.track?.title || record.title || 'NLM Song';
      const artist = record.track?.artist || 'NLM Songs';
      const mimeType = record.blob.type.toLowerCase();
      const extension = mimeType.includes('mpeg') ? 'mp3'
        : mimeType.includes('wav') ? 'wav'
          : mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a'
            : getAudioExtension(record.track?.audioUrl || '');
      const file = new File([record.blob], `${sanitizeFilename(title, artist)}.${extension}`, { type: record.blob.type || 'audio/mpeg' });
      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: artist });
      } else {
        const objectUrl = URL.createObjectURL(record.blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = file.name;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
      setDeviceDownloadStarted(true);
      setDeviceDownloadError('');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setDeviceDownloadError(error instanceof Error ? error.message : 'Could not save this song to your device.');
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

    if (showFavoritesOnly || view === 'Your Library') {
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

  useEffect(() => {
    localStorage.setItem('nlm-track-display-mode', trackDisplayMode);
  }, [trackDisplayMode]);

  useEffect(() => {
    let active = true;
    if (!user || view !== 'Listen' || !isOnline) {
      setPlayHistoryCounts(null);
      return () => { active = false; };
    }
    historyAPI.getHistory(100).then((history) => {
      if (!active) return;
      const counts: Record<string, number> = {};
      history.forEach((item) => { if (item.trackId) counts[item.trackId] = (counts[item.trackId] || 0) + 1; });
      setPlayHistoryCounts(counts);
    }).catch(() => { if (active) setPlayHistoryCounts(null); });
    return () => { active = false; };
  }, [user?.id, view, isOnline]);

  const activeCatalogue = useMemo(() => tracks.filter((track) => track.isActive && Boolean(track.audioUrl)), [tracks]);
  const featuredTrack = selectedTrack ?? filteredTracks[0] ?? tracks.find((track) => track.isActive && track.audioUrl) ?? null;
  const newestTracks = useMemo(() => [...activeCatalogue].sort((a, b) => (Date.parse(b.createdAt || b.updatedAt || '') || 0) - (Date.parse(a.createdAt || a.updatedAt || '') || 0)).slice(0, 5), [activeCatalogue]);
  const mostPlayedTracks = useMemo(() => playHistoryCounts
    ? [...activeCatalogue].filter((track) => playHistoryCounts[track.id]).sort((a, b) => (playHistoryCounts[b.id] || 0) - (playHistoryCounts[a.id] || 0)).slice(0, 5)
    : [], [activeCatalogue, playHistoryCounts]);
  const relatedTracks = useMemo(() => {
    const anchor = selectedTrack || featuredTrack;
    if (!anchor) return [];
    const alreadyRecommended = new Set([...mostPlayedTracks, ...newestTracks].map((track) => track.id));
    const genre = anchor.genre?.toLowerCase();
    const artist = anchor.artist?.toLowerCase();
    return activeCatalogue.filter((track) => track.id !== anchor.id && (
      (genre && track.genre?.toLowerCase() === genre)
      || (artist && track.artist?.toLowerCase() === artist)
    ) && !alreadyRecommended.has(track.id)).slice(0, 5);
  }, [activeCatalogue, selectedTrack, featuredTrack, mostPlayedTracks, newestTracks]);
  const playNext = useCallback(async () => {
    if (!selectedTrack || !tracks.length) return;
    if (!isOnline && queue.queue.length) queue.clearQueue();
    if (isOnline && queue.queue.length) {
      const nextTrack = queue.queue[0];
      if (!await authorizeTrack(nextTrack)) return;
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
      if (!await authorizeTrack(nextTrack)) return;
      pendingAutoplayRef.current = true;
      setSelectedId(nextTrack.id);
      if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(nextTrack.id)}`);
      return;
    }

    if (queue.repeatMode === 'one') {
      if (!await authorizeTrack(selectedTrack)) return;
      pendingAutoplayRef.current = true;
      audioRef.current?.load();
      audioRef.current?.play().catch(() => {});
      return;
    }

    if (currentIndex < tracks.length - 1) {
      const nextTrack = tracks[currentIndex + 1];
      if (!await authorizeTrack(nextTrack)) return;
      pendingAutoplayRef.current = true;
      setSelectedId(nextTrack.id);
      if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(nextTrack.id)}`);
    } else if (queue.repeatMode === 'all') {
      const nextTrack = tracks[0];
      if (!await authorizeTrack(nextTrack)) return;
      pendingAutoplayRef.current = true;
      setSelectedId(nextTrack.id);
      if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(nextTrack.id)}`);
    } else {
      setSelectedId(null);
    }
  }, [selectedTrack, tracks, selectedId, queue.queue, queue.clearQueue, queue.removeFromQueue, queue.shuffleMode, queue.repeatMode, isDetailRoute, navigate, authorizeTrack, isOnline]);

  const playPrevious = useCallback(async () => {
    if (!selectedTrack || !tracks.length) return;
    const currentIndex = tracks.findIndex((t) => t.id === selectedId);
    if (currentIndex === -1) return;

    if (audioRef.current?.currentTime && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    const previousTrack = tracks[prevIndex];
    if (!await authorizeTrack(previousTrack)) return;
    pendingAutoplayRef.current = true;
    setSelectedId(previousTrack.id);
    if (isDetailRoute) navigate(`/nlmsongs/track/${encodeURIComponent(previousTrack.id)}`);
  }, [selectedTrack, tracks, selectedId, isDetailRoute, navigate, authorizeTrack]);

  const startPlaybackSession = useCallback(() => {
    if (!user || !selectedTrack || !isOnline) return;
    const current = playbackSessionRef.current;
    if (current?.trackId === selectedTrack.id) return;
    const sessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const currentTime = audioRef.current?.currentTime || 0;
    playbackSessionRef.current = { trackId: selectedTrack.id, sessionId, playedSeconds: 0, lastMediaTime: currentTime, lastSent: 0 };
    void historyAPI.recordPlay(selectedTrack.id, 0, audioRef.current?.duration || 0, sessionId).catch(() => {});
  }, [user, selectedTrack, isOnline]);

  const recordPlaybackProgress = useCallback((currentTime: number, duration: number, final = false) => {
    if (!user || !selectedTrack || !isOnline || !Number.isFinite(currentTime)) return;
    const session = playbackSessionRef.current;
    if (!session || session.trackId !== selectedTrack.id) return;
    const mediaDelta = currentTime - session.lastMediaTime;
    if (mediaDelta > 0 && mediaDelta <= 15) session.playedSeconds += mediaDelta;
    session.lastMediaTime = currentTime;
    if (!final && session.playedSeconds - session.lastSent < 10) return;
    session.lastSent = session.playedSeconds;
    void historyAPI.recordPlay(selectedTrack.id, session.playedSeconds, Number.isFinite(duration) ? duration : 0, session.sessionId).catch(() => {});
  }, [user, selectedTrack, isOnline]);

  const audioPlayer = useAudioPlayer({
    audioRef,
    selectedTrack,
    pendingAutoplayRef,
    onEnded: playNext,
    onPlaybackStart: startPlaybackSession,
    onPlaybackProgress: recordPlaybackProgress,
  });

  const togglePlaybackWithAccess = useCallback(async () => {
    if (audioPlayer.isPlaying) { audioPlayer.togglePlayback(); return; }
    if (!selectedTrack || !await authorizeTrack(selectedTrack)) return;
    audioPlayer.togglePlayback();
  }, [audioPlayer.isPlaying, audioPlayer.togglePlayback, selectedTrack, authorizeTrack]);

  const checkoutListenerPlan = async (planId: string, paymentMethod: 'iyonicpay' | 'paystack') => {
    setSubscriptionBusy(true); setSubscriptionFeedback('');
    try {
      const result = await nlmsongsAPI.subscribeToPlan(planId, paymentMethod);
      if (result.authorizationUrl) { window.location.assign(result.authorizationUrl); return; }
      const status = await nlmsongsAPI.getSubscription();
      setListenerSubscription(status.subscription); setSubscriptionUsage(status.usage || {});
      setSubscriptionFeedback(result.message || 'Your subscription is active.');
    } catch (error: any) {
      setSubscriptionFeedback(error?.response?.data?.message || 'Could not update your subscription.');
    } finally { setSubscriptionBusy(false); }
  };

  useEffect(() => {
    const handlePlaylistPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ trackIds?: string[]; navigate?: boolean }>).detail;
      const ids = Array.isArray(detail?.trackIds) ? [...new Set(detail.trackIds)] : [];
      if (!ids.length) return;
      const start = async () => {
        let available = tracks;
        if (ids.some((id) => !available.some((track) => track.id === id))) {
          try {
            const latest = (await nlmsongsAPI.list(sellerScopeId)).map(toTrack).filter((track) => track.isActive);
            setTracks(latest);
            available = latest;
          } catch { return; }
        }
        const ordered = ids.map((id) => available.find((track) => track.id === id)).filter((track): track is Track => Boolean(track));
        if (!ordered.length) return;
        if (!await authorizeTrack(ordered[0])) return;
        queue.clearQueue();
        ordered.slice(1).forEach(queue.addToQueue);
        const alreadySelected = selectedId === ordered[0].id;
        pendingAutoplayRef.current = !alreadySelected;
        setSelectedId(ordered[0].id);
        if (detail.navigate !== false) {
          setView('Listen');
          navigate(`/nlmsongs/track/${encodeURIComponent(ordered[0].id)}`);
        }
        if (alreadySelected && audioRef.current) {
          void audioPlayer.play();
        }
      };
      void start();
    };
    window.addEventListener('nlm:play-playlist', handlePlaylistPlay);
    return () => window.removeEventListener('nlm:play-playlist', handlePlaylistPlay);
  }, [tracks, selectedId, audioPlayer.play, queue.clearQueue, queue.addToQueue, navigate, authorizeTrack, sellerScopeId]);

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
    onTogglePlayback: togglePlaybackWithAccess,
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

    if (!isAdminMode && !isOnline) {
      const savedAudio = await readAllOfflineAudio().catch(() => []);
      const savedTracks = savedAudio.map((record) => trackFromOfflineRecord(record, getOfflineArtworkUrl(record)));
      setOfflineDownloads(savedAudio);
      setTracks(savedTracks);
      setOfflineNotice(savedTracks.length
        ? 'Offline listening · showing songs saved on this browser.'
        : 'You’re offline and have no songs saved on this browser yet.');
      setCatalogError(savedTracks.length ? '' : 'No songs are saved for offline listening.');
      if (!savedTracks.some((track) => track.id === selectedId)) {
        audioRef.current?.pause();
        setSelectedId(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      const songs: NLMSong[] = isAdminMode
        ? await nlmsongsAPI.listAdmin()
        : await nlmsongsAPI.list(sellerScopeId);

      const mapped = songs.map(toTrack).filter((track) => track.audioUrl);
      const savedAudio = isAdminMode ? [] : await readAllOfflineAudio().catch(() => []);
      const mergedTracks = new Map(mapped.map((track) => [track.id, track]));
      savedAudio.forEach((record) => {
        const offlineTrack = trackFromOfflineRecord(record, getOfflineArtworkUrl(record));
        const currentTrack = mergedTracks.get(record.id);
        mergedTracks.set(record.id, currentTrack ? { ...currentTrack, ...(offlineTrack.coverUrl ? { coverUrl: offlineTrack.coverUrl } : {}) } : offlineTrack);
      });
      const availableTracks = [...mergedTracks.values()];
      if (!isAdminMode) setOfflineDownloads(savedAudio);
      setTracks(availableTracks);
      setOfflineNotice('');
      if (!isAdminMode) void storeOfflineCatalog(mapped).catch(() => {});

      if (selectedId && !availableTracks.some((track) => track.id === selectedId)) setSelectedId(null);
    } catch {
      const savedAudio = await readAllOfflineAudio().catch(() => []);
      const savedTracks = savedAudio.map((record) => trackFromOfflineRecord(record, getOfflineArtworkUrl(record)));
      setOfflineDownloads(savedAudio);
      setTracks(savedTracks);
      const hasOfflineMusic = savedTracks.length > 0;
      setCatalogError(hasOfflineMusic ? '' : 'The song catalogue is unavailable. No songs are saved for offline listening.');
      setOfflineNotice(hasOfflineMusic
        ? 'The catalogue can’t be reached. Your saved offline songs are ready to play.'
        : 'The catalogue can’t be reached. Connect to the internet once to save songs for offline listening.');
      if (!savedTracks.some((track) => track.id === selectedId)) {
        audioRef.current?.pause();
        setSelectedId(null);
      }
      if (isAdminMode) {
        console.error('Could not load NLMSongs catalogue');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getOfflineArtworkUrl, isAdminMode, isOnline, routeTrackId, selectedId, sellerScopeId]);

  useEffect(() => {
    void loadTracks();
  }, [isAdminMode, sellerScopeId, isOnline]);

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

    playbackSessionRef.current = null;
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

  const selectTrack = async (track: Track) => {
    if (!await authorizeTrack(track)) return;
    const switchingTrack = selectedId !== track.id;
    if (switchingTrack) {
      pendingAutoplayRef.current = true;
    }
    setSelectedId(track.id);
    setView('Listen');
    setShowLyrics(false);
    navigate(`/nlmsongs/track/${encodeURIComponent(track.id)}`);
    if (!switchingTrack) {
      void togglePlaybackWithAccess();
    }
  };

  const showTrackLyrics = (track: Track) => {
    setSelectedId(track.id);
    setView('Listen');
    setShowLyrics(true);
  };

  const discoveryContent = view === 'Listen' ? <div className="nlm-discovery-shelves">
    <NLMDiscoveryShelf
      eyebrow="FROM YOUR LISTENING HISTORY" title="Most played" tracks={mostPlayedTracks}
      note={!mostPlayedTracks.length ? (user ? 'Your most played tracks will appear here as your listening history grows.' : 'Sign in and listen to tracks to build a personal Most played list.') : undefined}
      selectedId={selectedId} isPlaying={audioPlayer.isPlaying} hasUser={Boolean(user)} favorites={favorites.favorites}
      onSelect={selectTrack} onFavorite={(track) => favorites.toggleFavorite(track.id)}
    />
    <NLMDiscoveryShelf
      eyebrow="RECENTLY PUBLISHED" title="New songs" tracks={newestTracks.filter((track) => !mostPlayedTracks.some((played) => played.id === track.id))}
      note={!newestTracks.length ? 'New releases will appear here when tracks are published.' : undefined}
      selectedId={selectedId} isPlaying={audioPlayer.isPlaying} hasUser={Boolean(user)} favorites={favorites.favorites}
      onSelect={selectTrack} onFavorite={(track) => favorites.toggleFavorite(track.id)}
    />
    <NLMDiscoveryShelf
      eyebrow={featuredTrack?.genre || featuredTrack?.artist || 'FROM THE CATALOGUE'} title="Related listening" tracks={relatedTracks}
      note={featuredTrack && !relatedTracks.length ? 'There are no other active catalogue tracks with a matching artist or genre yet.' : undefined}
      selectedId={selectedId} isPlaying={audioPlayer.isPlaying} hasUser={Boolean(user)} favorites={favorites.favorites}
      onSelect={selectTrack} onFavorite={(track) => favorites.toggleFavorite(track.id)}
    />
  </div> : undefined;

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

  const playerElement = selectedTrack ? <NLMAudioPlayer
    track={selectedTrack}
    audioRef={audioRef}
    isPlaying={audioPlayer.isPlaying}
    currentTime={audioPlayer.currentTime}
    duration={audioPlayer.duration}
    volume={audioPlayer.volume}
    shuffleMode={queue.shuffleMode}
    repeatMode={queue.repeatMode}
    isAdminMode={isAdminMode}
    isFavorite={selectedTrack ? favorites.isFavorite(selectedTrack.id) : false}
    copied={copied}
    offlineState={offlineState}
    offlineProgress={offlineProgress}
    offlineMessage={offlineMessage}
    onSaveOffline={saveTrackOffline}
    onNowPlayingClick={() => selectedTrack && navigate(`/nlmsongs/track/${encodeURIComponent(selectedTrack.id)}`)}
    onTogglePlayback={togglePlaybackWithAccess}
    onPreviousTrack={playPrevious}
    onNextTrack={playNext}
    onToggleShuffle={queue.toggleShuffle}
    onCycleRepeat={queue.cycleRepeat}
    onSeek={audioPlayer.seek}
    onSetVolume={audioPlayer.setVolume}
    onToggleFavorite={() => selectedTrack && favorites.toggleFavorite(selectedTrack.id)}
    onShare={shareTrack}
    onOpenPlaylist={() => setShowPlaylistModal(true)}
  /> : null;

  return (
    <div className={`nlm-app ${mobileNavOpen ? 'nlm-mobile-nav-open' : ''} ${audioPlayer.isPlaying ? 'nlm-audio-active' : ''} ${selectedTrack ? 'nlm-player-visible' : ''} ${isDetailRoute ? 'nlm-detail-player-visible' : ''} ${isVisible ? '' : 'nlm-route-hidden'}`}>
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
        trackCount={favorites.favorites.length}
        downloadCount={offlineDownloads.length}
        isAdminMode={isAdminMode}
        onNavigate={navigateToView}
        onNavigateDiscovery={(target) => navigate(`/nlmsongs/${target.toLowerCase()}`)}
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

        {accessNotice && <div className="nlm-access-notice" role="status"><span><strong>Plan access</strong><small>{accessNotice}</small></span><button onClick={() => navigateToView('Settings')}>View plans</button><button className="nlm-access-notice-close" onClick={() => setAccessNotice('')} aria-label="Dismiss plan notice">×</button></div>}

        <div className="nlm-workspace">
          {offlineNotice && <div className="nlm-offline-notice" role="status"><span><strong>Offline listening</strong><small>{offlineNotice}</small></span><button onClick={() => navigateToView('Downloads')}>Open downloads <Download size={14} /></button></div>}
          {!isDetailRoute && view !== 'Settings' && (
            <section
              className={`nlm-library-area ${isDetailRoute ? 'is-detail-route' : ''}`}
              aria-labelledby="nlm-page-title"
            >
              <NLMPageHeading
                eyebrow={view === 'Downloads' ? 'READY WITHOUT WI-FI' : view === 'Your Library' ? 'YOUR COLLECTION' : 'A ROOM OF YOUR OWN'}
                title={view === 'Downloads' ? 'Your downloads.' : view === 'Your Library' ? 'Your library.' : 'Find your next listen.'}
                copy={view === 'Downloads' ? 'Songs saved in this browser, ready to play whenever you are.' : view === 'Your Library' ? 'Every track you’ve favourited, gathered in one place.' : isAdminMode ? 'Explore new releases, tune into a genre, or browse the full catalogue.' : 'Start with a fresh release, explore a sound, or search the catalogue.'}
                index={view === 'Listen' ? '01' : view === 'Your Library' ? '02' : '03'}
                showIndex={view !== 'Listen'}
              />

              {view === 'Listen' && (
                <NLMHeroPanel
                  featuredTrack={featuredTrack}
                  isPlaying={audioPlayer.isPlaying}
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
                <div className="nlm-downloads-heading"><div><span className="nlm-eyebrow">SAVED ON THIS BROWSER</span><h2 id="nlm-downloads-title">Offline collection</h2></div><div className="nlm-downloads-heading-actions"><span>{offlineDownloads.length} {offlineDownloads.length === 1 ? 'song' : 'songs'}</span><button className="nlm-settings-action" onClick={openDeviceDownloadModal} disabled={!user}>Save favourites to phone</button></div></div>
                {offlineDownloads.length ? <div className="nlm-downloads-list">{offlineDownloads.map((record) => {
                  const track = tracks.find((item) => item.id === record.id) ?? trackFromOfflineRecord(record);
                  return <article className="nlm-download-row" key={record.id}>
                    <div className="nlm-download-art" aria-hidden="true">{track.coverUrl ? <img src={resolveAssetUrl(track.coverUrl)} alt="" /> : <Music2 size={19} />}</div>
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
                isPersonalLibrary={view === 'Your Library'}
                onSearch={handleSearch}
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
                sectionTitle={view === 'Your Library' ? 'Your favourites' : view === 'Listen' ? 'All songs' : 'Recently added'}
                displayMode={trackDisplayMode}
                onDisplayModeChange={setTrackDisplayMode}
                discoveryContent={discoveryContent}
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

              <div className="nlm-settings-group nlm-listener-subscription-group">
                <div className="nlm-settings-group-heading"><span>LISTENER SUBSCRIPTION</span><small>Plans and access are updated as soon as your subscription changes.</small></div>
                {user ? <>
                  <div className="nlm-listener-current-plan"><span><small>CURRENT PLAN</small><strong>{listenerSubscription?.plan?.name || 'Free listening'}</strong></span><span><small>STATUS</small><strong>{listenerSubscription?.status || 'Active'}</strong></span>{listenerSubscription?.periodEnd && <span><small>RENEWS / ENDS</small><strong>{new Date(listenerSubscription.periodEnd).toLocaleDateString()}</strong></span>}{subscriptionUsage?.monthlyPlays !== null && subscriptionUsage?.monthlyPlays !== undefined && <span><small>PLAYS THIS MONTH</small><strong>{Number(subscriptionUsage.monthlyPlays).toLocaleString()}</strong></span>}</div>
                  {subscriptionFeedback && <p className="nlm-subscription-feedback" role="status">{subscriptionFeedback}</p>}
                  <div className="nlm-listener-plan-grid">{availablePlans.map((plan) => <article className={`nlm-listener-plan-card ${listenerSubscription?.plan?.id === plan.id ? 'is-current' : ''}`} key={plan.id}><span className="nlm-eyebrow">{listenerSubscription?.plan?.id === plan.id ? 'YOUR PLAN' : `${plan.intervalDays} DAY PLAN`}</span><h2>{plan.name}</h2><p>{plan.description || 'A listening plan for your music.'}</p><strong>{plan.price === 0 ? 'Free' : `${plan.currency} ${Number(plan.price).toFixed(2)}`}<small>{plan.price === 0 ? '' : ` · ${plan.intervalDays} days`}</small></strong><div className="nlm-listener-plan-includes">{(plan.features || []).map((feature: string) => <span key={feature}>✓ {feature.replace(/_/g, ' ')}</span>)}</div><p className="nlm-listener-plan-limits">{plan.limits?.monthlyPlays ?? 'Unlimited'} monthly plays · {plan.limits?.playlistLimit ?? 'Unlimited'} playlists · {plan.limits?.offlineLimit ?? 'Unlimited'} offline saves</p><div className="nlm-listener-plan-actions">{plan.price === 0 ? <button className="nlm-settings-action" disabled={subscriptionBusy || listenerSubscription?.plan?.id === plan.id} onClick={() => void checkoutListenerPlan(plan.id, 'iyonicpay')}>{listenerSubscription?.plan?.id === plan.id ? 'Current plan' : subscriptionBusy ? 'Applying…' : 'Choose free plan'}</button> : <><button className="nlm-settings-action" disabled={subscriptionBusy} onClick={() => void checkoutListenerPlan(plan.id, 'iyonicpay')}>IyonicPay</button><button className="nlm-settings-action" disabled={subscriptionBusy} onClick={() => void checkoutListenerPlan(plan.id, 'paystack')}>Paystack</button></>}</div></article>)}{!availablePlans.length && <div className="nlm-settings-row"><span><strong>No paid plans yet</strong><small>Plans published by the NLM Songs admin will appear here.</small></span></div>}</div>
                </> : <div className="nlm-settings-row"><span><strong>Sign in to view plans</strong><small>Subscription plans are available to logged-in NLM Songs listeners.</small></span><button className="nlm-settings-action" onClick={openSignIn}>Sign in</button></div>}
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

        {deviceDownloadOpen && <div className="nlm-device-download-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeviceDownloadOpen(false); }}>
          <section className="nlm-device-download-modal" role="dialog" aria-modal="true" aria-labelledby="nlm-device-download-title" aria-describedby="nlm-device-download-copy">
            <button className="nlm-device-download-close" onClick={() => setDeviceDownloadOpen(false)} aria-label="Close device downloads"><X size={18} /></button>
            <span className="nlm-eyebrow">YOUR OFFLINE COLLECTION</span>
            <h2 id="nlm-device-download-title">Save songs to your device</h2>
            <p id="nlm-device-download-copy">Choose a favourite you have saved offline. Your subscription unlocks exporting that audio file to your phone.</p>
            {deviceDownloadError && <div className="nlm-device-download-state is-error" role="status">{deviceDownloadError}{!deviceDownloadAllowed && <button className="nlm-settings-action" onClick={() => { setDeviceDownloadOpen(false); navigate('/nlmsongs/settings'); }}>View plans</button>}</div>}
            {deviceFavoriteTracks.length > 0 && <>
              <div className="nlm-device-download-section-title">Your favourites <small>{deviceFavoriteTracks.length}</small></div>
              <div className="nlm-device-download-list" aria-label="Your favourite songs">
                {deviceFavoriteTracks.map((track) => {
                  const isSavedOffline = deviceDownloadRecords.some((record) => record.id === track.id);
                  return <div className="nlm-device-download-row" key={`favorite-${track.id}`}>
                    <span className="nlm-device-download-art">{track.coverUrl ? <img src={resolveAssetUrl(track.coverUrl)} alt="" /> : <Music2 size={16} />}</span>
                    <span><strong>{track.title}</strong><small>{track.artist}</small></span>
                    <span className={`nlm-device-download-ready ${isSavedOffline ? '' : 'is-missing'}`}>{isSavedOffline ? 'Offline ready' : 'Save offline first'}</span>
                  </div>;
                })}
              </div>
            </>}
            {deviceDownloadLoading ? <div className="nlm-device-download-state" role="status"><Loader2 size={17} className="nlm-spinner" /> Checking browser offline saves…</div> : deviceDownloadRecords.length ? <>
              <div className="nlm-device-download-section-title">Saved offline · ready for device <small>{deviceDownloadRecords.length}</small></div>
              <div className="nlm-device-download-list" aria-label="Songs ready to download">
                {deviceDownloadRecords.map((record) => {
                  const savedTrack = record.track;
                  const coverUrl = savedTrack?.coverUrl ? resolveAssetUrl(savedTrack.coverUrl) : record.artworkBlob ? getOfflineArtworkUrl(record) : '';
                  return <div className="nlm-device-download-row" key={record.id}>
                    <span className="nlm-device-download-art">{coverUrl ? <img src={coverUrl} alt="" /> : <Music2 size={16} />}</span>
                    <span><strong>{savedTrack?.title || record.title}</strong><small>{savedTrack?.artist || 'NLM Songs'}</small></span>
                    <span className="nlm-device-download-ready">Ready</span>
                    <button className="nlm-device-download-start" disabled={!deviceDownloadAllowed || deviceDownloadLoading} onClick={() => void downloadOfflineTrackToDevice(record)}>Save to phone</button>
                  </div>;
                })}
              </div>
              <small className="nlm-device-download-note">On supported phones, the system share sheet lets you save the file to Files or Downloads. Otherwise your browser uses its normal download location.</small>
              {deviceDownloadStarted && <div className="nlm-device-download-state is-done" role="status"><span>✓</span> Your browser or phone has opened the save action.</div>}
            </> : !deviceDownloadLoading && <div className="nlm-device-download-empty"><strong>{deviceFavoriteTracks.length ? 'No favourites are saved offline yet' : 'No favourite songs yet'}</strong><span>Favourite a song, then use Save for offline in the player. It will be ready here after both steps.</span></div>}
          </section>
        </div>}

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
      {showFloatingPlayer && playerElement ? createPortal(<div className="nlm-player-portal">{playerElement}</div>, document.body) : null}
    </div>
  );
};

export default NLMSongs;
