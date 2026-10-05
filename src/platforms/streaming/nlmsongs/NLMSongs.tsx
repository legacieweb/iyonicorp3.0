import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Disc3, Download, Heart, Share2, Captions,
  FileAudio2, Headphones, LayoutDashboard, Library, LogIn, Loader2,
  LogOut, Lock, Music2, Palette, Pause, Play, Plus, Search,
  SkipBack, SkipForward, Shuffle, Repeat, Trash2, UserRound,
  Volume2, VolumeX, UserPlus, X, Clock, Waves, List, Sparkles,
  GripVertical,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { nlmsongsAPI, playlistsAPI, historyAPI, type NLMSong, type NLMPlaylist } from '../../../services/api';
import { DEMO_NLM_CATALOG } from './demoCatalog';
import { getApiOrigin } from '../../../utils/apiUrl';
import './nlmsongs.css';

const API_ORIGIN = getApiOrigin();

type LyricLine = { time: number | null; text: string };
type Track = {
  id: string;
  title: string;
  artist: string;
  description: string;
  genre: string;
  tags: string[];
  audioUrl: string;
  coverUrl?: string;
  lyrics: LyricLine[];
  syncLyrics: boolean;
  isActive: boolean;
};
type View = 'Listen' | 'Your Library';

const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Bass: [6, 5, 3, 2, 0, -2, -2, 0, 0, 0],
  Vocal: [0, 0, 2, 4, 5, 3, 2, 0, 0, 0],
  Treble: [-3, -2, 0, 2, 4, 5, 6, 5, 3, 0],
  Rock: [4, 3, 2, 0, -1, 2, 4, 5, 3, 2],
  Pop: [2, 1, 0, 1, 2, 3, 2, 1, 0, 0],
  Electronic: [5, 4, 3, 1, 0, 2, 4, 4, 3, 2],
};

const SLEEP_TIMER_OPTIONS = [
  { label: '5 minutes', seconds: 300 },
  { label: '10 minutes', seconds: 600 },
  { label: '15 minutes', seconds: 900 },
  { label: '30 minutes', seconds: 1800 },
  { label: 'One hour', seconds: 3600 },
  { label: 'End of track', seconds: -1 },
];

function parseLyrics(value: string, syncToAudio: boolean): LyricLine[] | string {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed: LyricLine[] = [];

  for (const [index, line] of lines.entries()) {
    const match = line.match(/^\[(\d+):([0-5]\d(?:\.\d{1,2})?)\]\s*(.+)$/);
    if (syncToAudio && !match) return `Lyric line ${index + 1} needs a timestamp, like [00:12] A new day comes around.`;
    parsed.push({
      time: syncToAudio && match ? Number(match[1]) * 60 + Number(match[2]) : null,
      text: match ? match[3].trim() : line,
    });
  }

  return syncToAudio ? parsed.sort((first, second) => (first.time ?? 0) - (second.time ?? 0)) : parsed;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function activeLyricIndex(lyrics: LyricLine[], time: number) {
  let index = -1;
  for (let line = 0; line < lyrics.length; line += 1) {
    const lyricTime = lyrics[line].time;
    if (lyricTime === null || lyricTime > time) break;
    index = line;
  }
  return index;
}

const NLMSongs = ({ mode = 'client' }: { mode?: 'client' | 'admin' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [eqActive, setEqActive] = useState(false);
  const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [eqPreset, setEqPreset] = useState('Flat');
  const eq = useMemo(() => ({
    active: eqActive,
    bands: eqBands,
    preset: eqPreset,
    toggle: () => setEqActive((a) => !a),
    setBands: (banks: number[]) => setEqBands(banks),
    applyPreset: (name: string) => { setEqPreset(name); setEqBands([...(EQ_PRESETS[name] || EQ_PRESETS.Flat)]); },
    reset: () => { setEqPreset('Flat'); setEqBands([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); },
  }), [eqActive, eqBands, eqPreset]);

  const [view, setView] = useState<View>('Listen');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [lyricsText, setLyricsText] = useState('');
  const [syncLyrics, setSyncLyrics] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [genreFilter, setGenreFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'title' | 'artist'>('recent');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nlm-favorites') || '[]'); } catch { return []; }
  });
  const [copied, setCopied] = useState(false);

  const [queue, setQueue] = useState<Track[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [crossfade, setCrossfade] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<NLMPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [history, setHistory] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.78);
  const [showSleepTimer, setShowSleepTimer] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingAutoplayRef = useRef(false);
  const lyricsCloseRef = useRef<HTMLButtonElement>(null);
  const isSubmittingRef = useRef(false);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const visualizerActiveRef = useRef(false);
  const lastPlayTimeRef = useRef(0);

  const isAdminMode = mode === 'admin' || user?.role === 'manager_admin';
  const openAccount = () => navigate(user?.role === 'manager_admin'
    ? '/admin/dashboard'
    : user?.role === 'seller_manager'
      ? '/manager/dashboard'
      : user?.role === 'seller'
        ? '/nlmsongs/dashboard'
        : '/customer/dashboard');
  const signOut = () => {
    setAccountMenuOpen(false);
    logout();
    navigate('/nlmsongs');
  };
  const openThemes = () => {
    setAccountMenuOpen(false);
    navigate('/themes', { state: { from: user?.role === 'manager_admin' ? '/admin/dashboard' : '/nlmsongs/dashboard' } });
  };
  const openSignIn = () => {
    setAccountMenuOpen(false);
    navigate(`/login?redirect=${encodeURIComponent('/nlmsongs')}`);
  };
  const openRegistration = () => {
    setAccountMenuOpen(false);
    navigate(`/register?role=customer&redirect=${encodeURIComponent('/nlmsongs')}`);
  };

  const routeTrackId = useMemo(() => {
    const match = location.pathname.match(/^\/nlmsongs\/track\/(.+)$/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  }, [location.pathname]);
  const isDetailRoute = routeTrackId !== null;
  const selectedTrack = tracks.find((track) => track.id === selectedId) ?? null;
  const detailTrack = routeTrackId ? tracks.find((track) => track.id === routeTrackId) ?? null : null;
  const genres = useMemo(() => [...new Set(tracks.map((track) => track.genre.trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second)), [tracks]);
  const filteredTracks = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = tracks;
    if (showFavoritesOnly && user) {
      result = result.filter((track) => favorites.includes(track.id));
    }
    if (genreFilter) result = result.filter((track) => track.genre === genreFilter);
    if (query) result = result.filter((track) => [
      track.title,
      track.artist,
      track.genre,
      track.description,
      ...track.tags,
    ].some((value) => String(value).toLowerCase().includes(query)));
    if (sortOrder === 'title') result = [...result].sort((first, second) => first.title.localeCompare(second.title));
    if (sortOrder === 'artist') result = [...result].sort((first, second) => first.artist.localeCompare(second.artist));
    return result;
  }, [search, tracks, showFavoritesOnly, favorites, user, genreFilter, sortOrder]);
  const featuredTrack = filteredTracks[0] ?? tracks[0] ?? null;
  const highlightedLyric = useMemo(
    () => selectedTrack ? activeLyricIndex(selectedTrack.lyrics, currentTime) : -1,
    [currentTime, selectedTrack],
  );

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl('');
      return;
    }
    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [coverFile]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!showLyrics) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lyricsCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLyrics(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [showLyrics]);

  useEffect(() => {
    if (!routeTrackId || !tracks.some((track) => track.id === routeTrackId)) return;
    setSelectedId(routeTrackId);
  }, [routeTrackId, tracks]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlayerError('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [selectedId]);

  useEffect(() => {
    if (audioRef.current && eq.bands) {
      const gainNodes = eq.bands.map((_, i) => {
        const gain = audioContextRef.current?.createGain();
        if (gain) gain.gain.value = Math.pow(10, (eq.bands[i] || 0) / 20);
        return gain;
      }).filter(Boolean) as GainNode[];
      void gainNodes;
    }
  }, [eq.bands]);

  useEffect(() => {
    if (sleepTimerActive && sleepTimer !== null && sleepTimer > 0) {
      sleepTimerRef.current = setTimeout(() => {
        setIsPlaying(false);
        setSleepTimerActive(false);
        setSleepTimer(null);
        audioRef.current?.pause();
      }, sleepTimer * 1000);
      return () => {
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      };
    }
  }, [sleepTimerActive, sleepTimer]);

  useEffect(() => {
    if (showVisualizer && audioRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        const analyzer = audioContextRef.current.createAnalyser();
        analyzer.fftSize = 64;
        sourceRef.current.connect(analyzer);
        analyzer.connect(audioContextRef.current.destination);

        const canvas = visualizerCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const buffer = new Uint8Array(analyzer.frequencyBinCount);
        const draw = () => {
          if (!visualizerActiveRef.current) return;
          analyzer.getByteFrequencyData(buffer);
          const barCount = Math.min(buffer.length, 32);
          const barWidth = canvas.width / barCount;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < barCount; i++) {
            const barHeight = (buffer[i] / 255) * canvas.height;
            const x = i * barWidth;
            const y = canvas.height - barHeight;
            ctx.fillStyle = `hsl(${(i / barCount) * 60 + 20}, 70%, 60%)`;
            ctx.fillRect(x, y, barWidth - 1, barHeight);
          }
          animationFrameRef.current = requestAnimationFrame(draw);
        };

        const resizeCanvas = () => {
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * window.devicePixelRatio;
          canvas.height = rect.height * window.devicePixelRatio;
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resizeCanvas();
        visualizerActiveRef.current = true;
        draw();

        return () => {
          visualizerActiveRef.current = false;
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          audioContextRef.current?.close();
        };
      } catch (err) {
        console.error('Visualizer error:', err);
      }
    }
  }, [showVisualizer, audioRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isDetailRoute) return;
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          void togglePlayback();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
          break;
        case 'n':
          event.preventDefault();
          void playNext();
          break;
        case 'p':
          event.preventDefault();
          void playPrevious();
          break;
        case 's':
          event.preventDefault();
          setShuffleMode((s) => !s);
          break;
        case 'r':
          event.preventDefault();
          setRepeatMode((r) => r === 'off' ? 'one' : r === 'one' ? 'all' : 'off');
          break;
        case 'q':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setQueueOpen((q) => !q);
          }
          break;
        case 'e':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setShowEqualizer(true);
          }
          break;
        case 'v':
          event.preventDefault();
          setShowVisualizer((v) => !v);
          break;
        case 't':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setShowSleepTimer(true);
          }
          break;
        case 'Escape':
          if (queueOpen) setQueueOpen(false);
          if (showEqualizer) setShowEqualizer(false);
          if (showPlaylistModal) setShowPlaylistModal(false);
          if (showSleepTimer) setShowSleepTimer(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailRoute, duration, queueOpen, showEqualizer, showPlaylistModal, showSleepTimer]);

  const resolveAssetUrl = (value?: string) => {
    if (!value) return '';
    if (/^(?:https?:|blob:|data:)/i.test(value)) return value;
    return new URL(value, `${API_ORIGIN}/`).toString();
  };

  const toTrack = (song: any): Track => {
    const lyricsValue = typeof song.lyrics === 'string' ? song.lyrics : '';
    const lyricLines = lyricsValue.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
    const hasTimestamps = lyricLines.length > 0 && lyricLines.every((line: string) => /^\[\d+:[0-5]\d(?:\.\d{1,2})?\]\s*.+$/.test(line));
    const parsedLyrics = parseLyrics(lyricsValue, hasTimestamps);
    return {
      id: String(song.id),
      title: String(song.title || 'Untitled track'),
      artist: String(song.artist || 'NLM Studio'),
      description: String(song.description || ''),
      genre: String(song.genre || ''),
      tags: Array.isArray(song.tags) ? song.tags : [],
      audioUrl: String(song.audioUrl || song.audio_url || ''),
      coverUrl: song.thumbnailUrl || song.thumbnail_url || undefined,
      lyrics: typeof parsedLyrics === 'string' ? [] : parsedLyrics,
      syncLyrics: hasTimestamps,
      isActive: song.isActive ?? song.is_active ?? true,
    };
  };

  const loadTracks = async () => {
    setIsLoading(true);
    setCatalogError('');
    if (!isAdminMode) {
      try {
        const songs = await nlmsongsAPI.list();
        const mapped = songs.map(toTrack).filter((track) => track.audioUrl);
        setTracks(mapped);
        if (!selectedId && mapped.length) setSelectedId(mapped.find((track) => track.id === routeTrackId)?.id ?? mapped[0].id);
      } catch (error) {
        console.error('Could not load public catalogue:', error);
        setCatalogError('The song catalogue could not be reached. Check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const songs = await nlmsongsAPI.listAdmin();
      const mapped = songs.map(toTrack).filter((track) => track.audioUrl);
      setTracks(mapped);
      if (!selectedId && mapped.length) setSelectedId(mapped.find((track) => track.id === routeTrackId)?.id ?? mapped[0].id);
    } catch (error) {
      console.error('Could not load NLMSongs catalogue:', error);
      setCatalogError('The song catalogue could not be reached. Check your connection and try again.');
      setFormError('The catalogue could not be loaded right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTracks();
  }, [isAdminMode]);

  useEffect(() => {
    if (!tracks.length) return;
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem('nlm-queue', JSON.stringify(queue));
        localStorage.setItem('nlm-shuffle', String(shuffleMode));
        localStorage.setItem('nlm-repeat', repeatMode);
      } catch {}
    };
    const savedQueue = (() => {
      try {
        const q = JSON.parse(localStorage.getItem('nlm-queue') || '[]');
        const sh = JSON.parse(localStorage.getItem('nlm-shuffle') || 'false');
        const rp = localStorage.getItem('nlm-repeat') || 'off';
        if (q.length) {
          setQueue(q);
          setShuffleMode(sh);
          setRepeatMode(rp as any);
        }
      } catch {}
      return null;
    })();
    void savedQueue;
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tracks.length, queue, shuffleMode, repeatMode]);

  const removeTrack = async (track: Track) => {
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
    } catch (error) {
      console.error('Could not delete track:', error);
      setFormError('This song could not be removed. Please try again.');
    }
  };

  const handleAddTrack = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormError('');
    setIsLoading(true);
    try {
    if (!isAdminMode) {
      setFormError('Admin access is required to publish a song to the catalogue.');
      return;
    }
    if (!title.trim()) {
      setFormError('Add a track title to continue.');
      return;
    }
    if (!audioFile) {
      setFormError('Choose an audio file from this device.');
      return;
    }
    const supportedExtension = /\.(mp3|wav|m4a)$/i.test(audioFile.name);
    if (!supportedExtension) {
      setFormError('Choose an MP3, WAV, or M4A file for reliable browser playback.');
      return;
    }
    if (coverFile && !coverFile.type.startsWith('image/')) {
      setFormError('The cover image must be an image file.');
      return;
    }
    const parsedLyrics = parseLyrics(lyricsText, syncLyrics);
    if (typeof parsedLyrics === 'string') {
      setFormError(parsedLyrics);
      return;
    }

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('artist', artist.trim());
      formData.append('description', description.trim());
      formData.append('genre', genre.trim());
      formData.append('tags', tags.trim());
      formData.append('lyrics', syncLyrics ? lyricsText.trim() : parsedLyrics.map((line) => line.text).join('\n'));
      formData.append('audio', audioFile);
      if (coverFile) {
        formData.append('thumbnail', coverFile);
      }

      const created = await nlmsongsAPI.create(formData);
      const mappedTrack = toTrack(created);
      setTracks((current) => [mappedTrack, ...current]);
      setSelectedId(mappedTrack.id);
      setView('Listen');
      setUploadOpen(false);
      setTitle('');
      setArtist('');
      setDescription('');
      setGenre('');
      setTags('');
      setAudioFile(null);
      setCoverFile(null);
      setLyricsText('');
      setSyncLyrics(false);
    } catch (error: any) {
      console.error('Could not publish track:', error);
      setFormError(error?.response?.data?.message || 'This song could not be published. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    if (!selectedTrack || !audioRef.current) return;
    setPlayerError('');
    try {
      if (audioRef.current.paused) {
        if (crossfade && lastPlayTimeRef.current > 0 && audioRef.current.currentTime === 0) {
        }
        await audioRef.current.play();
      }
      else audioRef.current.pause();
    } catch {
      setPlayerError('Playback failed. Check the audio file and media server, then try again.');
      setIsPlaying(false);
    }
  };

  const playNext = async () => {
    if (!selectedTrack || !tracks.length) return;
    const currentIndex = tracks.findIndex((t) => t.id === selectedId);
    if (currentIndex === -1) return;

    if (shuffleMode) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      pendingAutoplayRef.current = true;
      setSelectedId(tracks[randomIndex].id);
      return;
    }

    if (repeatMode === 'one') {
      pendingAutoplayRef.current = true;
      audioRef.current?.load();
      audioRef.current?.play().catch(() => {});
      return;
    }

    if (currentIndex < tracks.length - 1) {
      pendingAutoplayRef.current = true;
      setSelectedId(tracks[currentIndex + 1].id);
    } else if (repeatMode === 'all') {
      pendingAutoplayRef.current = true;
      setSelectedId(tracks[0].id);
    }
  };

  const playPrevious = () => {
    if (!selectedTrack || !tracks.length) return;
    const currentIndex = tracks.findIndex((t) => t.id === selectedId);
    if (currentIndex === -1) return;
    if (audioRef.current?.currentTime && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    pendingAutoplayRef.current = true;
    setSelectedId(tracks[prevIndex].id);
  };

  useEffect(() => {
    if (!selectedTrack) return;
    const trackHistory = JSON.parse(localStorage.getItem('nlm-recent-play') || '[]') as string[];
    const withoutDup = trackHistory.filter((id) => id !== selectedTrack.id);
    withoutDup.unshift(selectedTrack.id);
    const recentIds = withoutDup.slice(0, 50);
    localStorage.setItem('nlm-recent-play', JSON.stringify(recentIds));

    setHistory(recentIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[]);

    if (user) {
      void historyAPI.recordPlay(selectedTrack.id, 0, 0).catch(() => {});
    }
  }, [selectedId, user]);

  const downloadTrack = (track: Track | null = selectedTrack) => {
    if (!track || !track.audioUrl) return;
    if (!user) {
      navigate(`/register?role=customer&redirect=${encodeURIComponent(`/nlmsongs/track/${encodeURIComponent(track.id)}`)}`);
      return;
    }
    const url = resolveAssetUrl(track.audioUrl);
    const urlExtension = new URL(url, window.location.origin).pathname.split('.').pop()?.toLowerCase();
    const extension = urlExtension && ['mp3', 'wav', 'm4a'].includes(urlExtension) ? urlExtension : 'mp3';
    const safeFilename = `${track.artist} - ${track.title}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim();
    const filename = `${safeFilename || 'NLM track'}.${extension}`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const toggleFavorite = (track?: Track) => {
    const target = track ?? selectedTrack;
    if (!target) return;
    if (!user) {
      openSignIn();
      return;
    }
    const trackId = target.id;
    setFavorites((current) => {
      const isFav = current.includes(trackId);
      const updated = isFav ? current.filter((id) => id !== trackId) : [...current, trackId];
      localStorage.setItem('nlm-favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (trackId: string) => favorites.includes(trackId);

  const shareTrack = async () => {
    if (!selectedTrack) return;
    const shareData = {
      title: selectedTrack.title,
      text: `Listen to ${selectedTrack.title} by ${selectedTrack.artist} on NLM Songs`,
      url: `${window.location.origin}/nlmsongs/track/${encodeURIComponent(selectedTrack.id)}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const selectTrack = (track: Track) => {
    const switchingTrack = selectedId !== track.id;
    pendingAutoplayRef.current = switchingTrack;
    setSelectedId(track.id);
    setView('Listen');
    setShowLyrics(false);
    navigate(`/nlmsongs/track/${encodeURIComponent(track.id)}`);
    if (!switchingTrack) void togglePlayback();
  };

  const showTrackLyrics = (track: Track) => {
    setSelectedId(track.id);
    setView('Listen');
    setShowLyrics(true);
  };

  const openUpload = () => {
    if (!isAdminMode) {
      setView('Listen');
      setUploadOpen(false);
      setFormError('The public library is read-only. Visit the admin dashboard to upload new songs.');
      return;
    }
    setView('Your Library');
    setUploadOpen(true);
    setFormError('');
  };

  const loadPlaylists = async () => {
    if (!user) return;
    try {
      const data = await playlistsAPI.getAll();
      setPlaylists(data);
    } catch (error) {
      console.error('Could not load playlists:', error);
    }
  };

  const handleCreatePlaylist = async (event: FormEvent) => {
    event.preventDefault();
    if (!playlistName.trim()) return;
    try {
      const created = await playlistsAPI.create({ name: playlistName.trim(), description: playlistDesc.trim() });
      setPlaylists((prev) => [created, ...prev]);
      setPlaylistName('');
      setPlaylistDesc('');
      setShowPlaylistModal(false);
    } catch (error) {
      console.error('Could not create playlist:', error);
    }
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!selectedTrack) return;
    try {
      await playlistsAPI.addTrack(playlistId, selectedTrack.id);
    } catch (error) {
      console.error('Could not add track to playlist:', error);
    }
  };

  useEffect(() => {
    void loadPlaylists();
  }, [user]);

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
    setQueueOpen(true);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const moveInQueue = (from: number, to: number) => {
    setQueue((prev) => {
      const newQueue = [...prev];
      const [moved] = newQueue.splice(from, 1);
      newQueue.splice(to, 0, moved);
      return newQueue;
    });
  };

  const navItems: { label: View; icon: typeof Headphones }[] = [
    { label: 'Listen', icon: Headphones },
    { label: 'Your Library', icon: Library },
  ];

  const setSleepTimerValue = (seconds: number) => {
    setSleepTimer(seconds);
    setSleepTimerActive(true);
    setShowSleepTimer(false);
  };

  const cancelSleepTimer = () => {
    setSleepTimer(null);
    setSleepTimerActive(false);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  };

   return (
    <div className="nlm-app">
      <audio
        ref={audioRef}
        src={resolveAssetUrl(selectedTrack?.audioUrl)}
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onCanPlay={() => {
          if (!pendingAutoplayRef.current) return;
          pendingAutoplayRef.current = false;
          void audioRef.current?.play().catch(() => {
            setPlayerError('Playback failed. Check the audio file and media server, then try again.');
          });
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); void playNext(); }}
        onError={(event) => {
          if (selectedTrack) {
            const errorCode = event.currentTarget.error?.code;
            setPlayerError(errorCode === 4
              ? 'This audio format is not supported by your browser. Use MP3, WAV, or M4A.'
              : errorCode === 3
                ? 'This audio file could not be decoded. It may be damaged or encoded with an unsupported codec.'
                : 'This audio file could not be loaded. Check the media server connection and try again.');
            setIsPlaying(false);
          }
        }}
      />

      <aside className="nlm-sidebar">
        <a className="nlm-brand" href="#listen" onClick={(event) => { event.preventDefault(); setView('Listen'); }} aria-label="NLM Songs home">
          <span className="nlm-brand-mark"><Music2 size={19} strokeWidth={2.5} /></span>
          <span>nlm<span className="nlm-brand-light">songs</span></span>
        </a>
        <span className="nlm-nav-caption">YOUR SPACE</span>
        <nav className="nlm-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={view === label ? 'is-active' : ''} onClick={() => { setView(label); setUploadOpen(false); }} aria-current={view === label ? 'page' : undefined}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Your Library' && tracks.length > 0 && <small>{tracks.length}</small>}
            </button>
          ))}
        </nav>
        <div className="nlm-sidebar-rule" />
        <div className="nlm-sidebar-note">
          <span className="nlm-note-glyph"><Disc3 size={20} /></span>
          <p>Your music stays<br />right here with you.</p>
          <span>LOCAL LISTENING</span>
        </div>
        <div className="nlm-sidebar-foot"><span className="nlm-live-dot" /> PRIVATE BY DESIGN</div>
      </aside>

      <main className="nlm-main">
        <header className="nlm-topbar">
          <div className="nlm-location"><span>LISTENING ROOM</span><span className="nlm-location-slash">/</span><span>{view.toUpperCase()}</span></div>
          <div className="nlm-account-actions">
            <div className="nlm-desktop-actions">
              {!user ? <>
                <button className="nlm-account-button" onClick={openSignIn}><LogIn size={14} /> Sign in</button>
                <button className="nlm-auth-join" onClick={openRegistration}><UserPlus size={14} /> Create account</button>
              </> : isAdminMode ? <>
                <span className="nlm-account-name">{user.name || user.email}</span>
                <button className="nlm-account-button" onClick={openThemes}><Palette size={14} /> Themes</button>
                <button className="nlm-account-button" onClick={openAccount}><LayoutDashboard size={14} /> Dashboard</button>
                <button className="nlm-account-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
                <button className="nlm-add-button" onClick={openUpload}><Plus size={16} /> Add your music</button>
              </> : <>
                <span className="nlm-account-name">{user.name || user.email}</span>
                <button className="nlm-account-button" onClick={openAccount}><LayoutDashboard size={14} /> Dashboard</button>
                <button className="nlm-account-button" onClick={signOut}><LogOut size={14} /> Sign out</button>
              </>}
            </div>
            <button className="nlm-mobile-account-toggle" aria-label={accountMenuOpen ? 'Close account menu' : 'Open account menu'} aria-expanded={accountMenuOpen} aria-controls="nlm-mobile-account-menu" onClick={() => setAccountMenuOpen((open) => !open)}>
              {accountMenuOpen ? <X size={18} /> : <UserRound size={18} />}
            </button>
            {accountMenuOpen && <div className="nlm-mobile-account-menu" id="nlm-mobile-account-menu">
              {user && <p className="nlm-mobile-account-name">{user.name || user.email}</p>}
              {!user ? <>
                <button onClick={openSignIn}><LogIn size={15} /> Sign in</button>
                <button className="is-primary" onClick={openRegistration}><UserPlus size={15} /> Create account</button>
              </> : <>
                {isAdminMode && <button onClick={openThemes}><Palette size={15} /> Themes</button>}
                <button onClick={() => { setAccountMenuOpen(false); openAccount(); }}><LayoutDashboard size={15} /> Dashboard</button>
                {isAdminMode && <button onClick={() => { setAccountMenuOpen(false); openUpload(); }}><Plus size={15} /> Add your music</button>}
                <button onClick={signOut}><LogOut size={15} /> Sign out</button>
              </>}
            </div>}
          </div>
        </header>

        <div className="nlm-workspace">
          <section className={`nlm-library-area ${isDetailRoute ? 'is-detail-route' : ''}`} aria-labelledby="nlm-page-title">
            <div className="nlm-page-heading">
              <div>
                <p className="nlm-eyebrow">A ROOM OF YOUR OWN</p>
                <h1 id="nlm-page-title">{view === 'Your Library' ? <>Your <i>library.</i></> : <>Make room<br />for <i>listening.</i></>}</h1>
                <p className="nlm-heading-copy">{isAdminMode ? 'Your catalogue lives in one place, with uploads, lyrics, and metadata kept in the platform.' : 'Open the library and browse the songs already published for listening.'}</p>
              </div>
              <span className="nlm-heading-index">{view === 'Listen' ? '01' : '02'} <span>/ 02</span></span>
            </div>

            {view === 'Listen' && !isDetailRoute && (
              <div className="nlm-hero-panel">
                <div className="nlm-hero-copy">
                  <span className="nlm-eyebrow">NOW PLAYING</span>
                  <h2>{featuredTrack ? featuredTrack.title : 'Build your catalog'}</h2>
                  <p>{featuredTrack ? `${featuredTrack.artist} · ${featuredTrack.genre || 'Featured release'}` : 'Publish songs, curate playlists, and shape a premium listening experience.'}</p>
                  <div className="nlm-hero-actions">
                    <button className="nlm-submit-button" onClick={() => featuredTrack && selectTrack(featuredTrack)}>
                      <Play size={14} fill="currentColor" /> {featuredTrack ? 'Play track' : 'Explore catalog'}
                    </button>
                    {isAdminMode && <button className="nlm-ghost-button" onClick={openUpload}>Upload new song</button>}
                  </div>
                </div>
                <div className="nlm-hero-art">
                  {featuredTrack?.coverUrl ? (
                    <img src={resolveAssetUrl(featuredTrack.coverUrl)} alt={featuredTrack.title} />
                  ) : (
                    <div className="nlm-hero-art-fallback"><Music2 size={36} /></div>
                  )}
                </div>
              </div>
            )}

            <div className="nlm-platform-stats">
              <div className="nlm-stat-card">
                <span>Total tracks</span>
                <strong>{tracks.length}</strong>
              </div>
              <div className="nlm-stat-card">
                <span>Genres</span>
                <strong>{new Set(tracks.map((track) => track.genre).filter(Boolean)).size}</strong>
              </div>
              <div className="nlm-stat-card">
                <span>Library status</span>
                <strong>{isAdminMode ? 'Admin live' : 'Public view'}</strong>
              </div>
            </div>

            {view === 'Listen' && !isDetailRoute && genres.length > 0 && (
              <section className="nlm-discovery-section" aria-label="Browse by genre">
                <div className="nlm-discovery-heading"><span className="nlm-eyebrow">FIND YOUR FREQUENCY</span><h2>Browse by sound</h2></div>
                <div className="nlm-genre-chips">
                  <button className={!genreFilter ? 'is-active' : ''} onClick={() => setGenreFilter('')} aria-pressed={!genreFilter}>All sounds</button>
                  {genres.map((genre) => <button key={genre} className={genreFilter === genre ? 'is-active' : ''} onClick={() => setGenreFilter(genreFilter === genre ? '' : genre)} aria-pressed={genreFilter === genre}>{genre}</button>)}
                </div>
              </section>
            )}

            {view === 'Listen' && !isDetailRoute && tracks.length > 0 && (
              <section className="nlm-fresh-section" aria-label="Fresh cuts">
                <div className="nlm-section-head"><div><span className="nlm-eyebrow">JUST DROPPED</span><h2>Fresh cuts</h2></div><span className="nlm-track-count">PICK A TRACK</span></div>
                <div className="nlm-fresh-list">
                  {tracks.slice(0, 3).map((track, index) => (
                    <button key={track.id} className="nlm-fresh-card" onClick={() => selectTrack(track)}>
                      <span className="nlm-fresh-art">{track.coverUrl ? <img src={resolveAssetUrl(track.coverUrl)} alt="" /> : <Music2 size={20} />}</span>
                      <span className="nlm-fresh-index">0{index + 1}</span>
                      <span className="nlm-fresh-meta"><strong>{track.title}</strong><small>{track.artist}{track.genre ? ` · ${track.genre}` : ''}</small></span>
                      <span className="nlm-fresh-play"><Play size={14} fill="currentColor" /></span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="nlm-search-panel">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tracks, artists, genres, or moods"
                aria-label="Search the NLM Songs catalogue"
              />
            </div>

            {!isDetailRoute && <>
                <section className="nlm-track-section" aria-label="Your local tracks">
                   <div className="nlm-section-head"><div><span className="nlm-eyebrow">{isAdminMode ? 'CATALOGUE' : 'LIBRARY'}</span><h2>{view === 'Your Library' ? 'Your tracks' : 'Recently added'}</h2></div><span className="nlm-track-count">{filteredTracks.length.toString().padStart(2, '0')} TRACKS</span></div>
                   {user && (<button className={`nlm-favorites-toggle ${showFavoritesOnly ? 'is-active' : ''}`} onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} aria-pressed={showFavoritesOnly}><Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} /><span>{showFavoritesOnly ? 'All tracks' : 'Favorites only'}</span></button>)}
                   <label className="nlm-sort-control">SORT BY <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}><option value="recent">Recently added</option><option value="title">Title</option><option value="artist">Artist</option></select></label>
                  {isLoading ? (
                    <div className="nlm-empty-library" role="status"><span className="nlm-empty-icon"><Loader2 size={21} className="nlm-spinner" /></span><div><h3>Opening the listening room…</h3><p>Loading the published tracks from the catalogue.</p></div></div>
                  ) : catalogError ? (
                    <div className="nlm-empty-library" role="alert"><span className="nlm-empty-icon"><FileAudio2 size={21} /></span><div><h3>Couldn’t load the catalogue.</h3><p>{catalogError}</p></div><button onClick={() => void loadTracks()}>Try again</button></div>
                  ) : filteredTracks.length ? (
                    <div className="nlm-track-list">
                      <div className="nlm-track-columns"><span>TRACK</span><span>ARTIST</span><span>ACTIONS</span></div>
                      {filteredTracks.map((track, index) => (
                        <article key={track.id} className={`nlm-track-row ${selectedId === track.id ? 'is-selected' : ''}`}>
                          <button className="nlm-track-select" onClick={() => selectTrack(track)} aria-label={`Play ${track.title} by ${track.artist}`}>
                            <span className="nlm-track-number">{selectedId === track.id && isPlaying ? <span className="nlm-equalizer"><i /><i /><i /></span> : String(index + 1).padStart(2, '0')}</span>
                            <span className="nlm-mini-cover">{track.coverUrl ? <img src={resolveAssetUrl(track.coverUrl)} alt="" /> : <Music2 size={18} />}</span>
                            <span className="nlm-track-title"><strong>{track.title}</strong><small>{track.lyrics.length ? `${track.lyrics.length} lyric lines` : 'No lyrics added'}</small></span>
                          </button>
                          <span className="nlm-track-artist">{track.artist}</span>
                          <span className="nlm-track-actions">
                            {user && (<button className={`nlm-row-favorite ${isFavorite(track.id) ? 'is-fav' : ''}`} onClick={() => toggleFavorite(track)} aria-label={isFavorite(track.id) ? 'Remove from favorites' : 'Add to favorites'} title={isFavorite(track.id) ? 'Remove from favorites' : 'Add to favorites'}><Heart size={12} fill={isFavorite(track.id) ? 'currentColor' : 'none'} /></button>)}
                            <button className="nlm-row-play" onClick={() => selectTrack(track)} aria-label={`${selectedId === track.id && isPlaying ? 'Pause' : 'Play'} ${track.title}`}>{selectedId === track.id && isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button>
                            <button className="nlm-row-lyrics" onClick={() => showTrackLyrics(track)} aria-label={`Show lyrics for ${track.title}`} title={`Lyrics for ${track.title}`}><Captions size={16} /></button>
                            {!isAdminMode && (<button className="nlm-row-queue" onClick={() => addToQueue(track)} aria-label={`Add ${track.title} to queue`} title="Add to queue"><List size={16} /></button>)}
                            {isAdminMode && <button className="nlm-remove-track" onClick={() => void removeTrack(track)} aria-label={`Remove ${track.title}`} title="Remove track"><Trash2 size={15} /></button>}
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="nlm-empty-library">
                      <span className="nlm-empty-icon"><FileAudio2 size={23} /></span>
                      <div><h3>{search || genreFilter || showFavoritesOnly ? 'No tracks match those filters.' : isAdminMode ? 'Nothing in the room yet.' : 'No songs are live yet.'}</h3><p>{search || genreFilter || showFavoritesOnly ? 'Try another search, choose a different sound, or clear your favorites filter.' : isAdminMode ? 'Add an audio file from your device to start a library. Your files will be stored in the platform catalogue.' : 'The public library will appear here once the admin publishes tracks.'}</p></div>
                      {isAdminMode && <button onClick={openUpload}><Plus size={15} /> Add a track</button>}
                    </div>
                  )}
                </section>
                {uploadOpen && (
                  <section className="nlm-upload-panel" aria-labelledby="nlm-upload-title">
                    <div className="nlm-form-heading"><div><span className="nlm-eyebrow">LOCAL FILES ONLY</span><h2 id="nlm-upload-title">Add to your room</h2></div><button className="nlm-icon-button" onClick={() => { setUploadOpen(false); setFormError(''); }} aria-label="Close add track form"><X size={18} /></button></div>
                    <form onSubmit={handleAddTrack} noValidate>
                      <div className="nlm-form-fields">
                        <label>Track title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name this track" maxLength={100} /></label>
                        <label><span className="nlm-input-label">Artist <small>OPTIONAL</small></span><input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Artist name" maxLength={100} /></label>
                      </div>
                      <div className="nlm-form-fields">
                        <label>Genre<input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Afrobeat, Gospel, Pop..." maxLength={100} /></label>
                        <label><span className="nlm-input-label">Tags <small>OPTIONAL</small></span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="love, sunrise, mellow" maxLength={200} /></label>
                      </div>
                      <label className="nlm-lyrics-field"><span className="nlm-input-label">Description <small>OPTIONAL</small></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the feel, story, or theme of the song." rows={2} /></label>
                      <div className="nlm-file-fields">
                        <label className="nlm-file-picker"><span className="nlm-file-icon"><FileAudio2 size={18} /></span><span><strong>{audioFile?.name || 'Choose an audio file'}</strong><small>Required · MP3, WAV, or M4A</small></span><input type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} /></label>
                        <label className="nlm-file-picker nlm-cover-picker">{coverPreviewUrl ? <img className="nlm-cover-preview" src={coverPreviewUrl} alt="Selected cover preview" /> : <span className="nlm-file-icon"><Disc3 size={18} /></span>}<span><strong>{coverFile?.name || 'Add cover artwork'}</strong><small>{coverFile ? 'Selected · will be saved with the track' : 'Optional · JPG, PNG, WEBP, or GIF'}</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} /></label>
                      </div>
                      <div className="nlm-lyrics-mode"><span><strong>Sync lyrics to audio</strong><small>{syncLyrics ? 'Add a timestamp to every line.' : 'Plain lyrics, one line at a time.'}</small></span><label className="nlm-switch"><input type="checkbox" checked={syncLyrics} onChange={(event) => setSyncLyrics(event.target.checked)} /><span aria-hidden="true" /></label></div>
                      <label className="nlm-lyrics-field">Lyrics <span>OPTIONAL</span><textarea value={lyricsText} onChange={(event) => setLyricsText(event.target.value)} placeholder={syncLyrics ? '[00:12] The city wakes in gold\n[00:18] A new day unfolds' : 'The city wakes in gold\nA new day unfolds'} rows={4} /></label>
                      {formError && <p className="nlm-form-error" role="alert">{formError}</p>}
                      <div className="nlm-form-actions"><p>{isLoading ? 'Publishing to the platform…' : 'Saved to the live catalogue.'}</p><button type="submit" className="nlm-submit-button" disabled={isLoading}>{isLoading ? <Loader2 size={15} className="nlm-spinner" /> : <Plus size={15} />} Add to library</button></div>
                    </form>
                  </section>
                )}
             </>}
           </section>

        </div>

        {showLyrics && selectedTrack && <div className="nlm-lyrics-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLyrics(false); }}>
          <section className="nlm-lyrics-modal" role="dialog" aria-modal="true" aria-labelledby="nlm-lyrics-title" aria-describedby="nlm-lyrics-artist">
            <div className="nlm-lyrics-artwork">
              {selectedTrack.coverUrl ? <img className="nlm-lyrics-artwork-image" src={resolveAssetUrl(selectedTrack.coverUrl)} alt="" /> : <div className="nlm-lyrics-artwork-fallback"><Disc3 size={72} /></div>}
              <span className="nlm-lyrics-artwork-label"><i /> NOW PLAYING</span>
              <div className="nlm-lyrics-artwork-caption"><span>NLM SONGS / LYRICS</span><strong>{selectedTrack.title}</strong></div>
            </div>
            <div className="nlm-lyrics-panel">
              <div className="nlm-lyrics-top"><span className="nlm-eyebrow">{selectedTrack.syncLyrics ? 'SYNCED TO THE MUSIC' : 'THE WORDS, UNFILTERED'}</span><button ref={lyricsCloseRef} className="nlm-lyrics-close" onClick={() => setShowLyrics(false)} aria-label="Close lyrics"><X size={18} /></button></div>
              <div className="nlm-lyrics-heading"><span className="nlm-lyrics-live"><i /> {selectedTrack.syncLyrics ? isPlaying ? 'LIVE SYNC' : 'SYNCED' : 'PLAIN LYRICS'}</span><h2 id="nlm-lyrics-title">{selectedTrack.title}<br /><i>lyrics</i></h2><p id="nlm-lyrics-artist">{selectedTrack.artist}</p></div>
              {selectedTrack.lyrics.length ? (
                <div className={`nlm-lyric-lines ${selectedTrack.syncLyrics ? 'is-synced' : 'is-plain'}`} aria-live="polite" aria-relevant="text">
                  {selectedTrack.lyrics.map((line, index) => (
                    <p key={`${line.time ?? 'plain'}-${index}`} className={selectedTrack.syncLyrics ? index === highlightedLyric ? 'is-current' : index < highlightedLyric ? 'is-past' : '' : ''}>{line.text}</p>
                  ))}
                </div>
              ) : <div className="nlm-no-lyrics"><span className="nlm-no-lyrics-mark">"</span><p>No lyrics for this track yet.</p><span>Words added by the artist will appear here.</span></div>}
              <div className="nlm-lyrics-track"><span className="nlm-lyrics-track-cover">{selectedTrack.coverUrl ? <img src={resolveAssetUrl(selectedTrack.coverUrl)} alt="" /> : <Music2 size={17} />}</span><span className="nlm-lyrics-track-meta"><strong>{selectedTrack.title}</strong><small>{selectedTrack.artist}</small></span><span className="nlm-lyrics-track-index">NLM / LYRICS</span></div>
            </div>
          </section>
        </div>}

        {playerError && <p className="nlm-player-error" role="alert">{playerError}<button onClick={() => setPlayerError('')} aria-label="Dismiss playback message"><X size={14} /></button></p>}

        {isDetailRoute && <section className="nlm-detail-page" aria-labelledby="nlm-details-title">
          {detailTrack ? <>
            <button className="nlm-detail-back" onClick={() => navigate('/nlmsongs')}><SkipBack size={14} /> Back to discovery</button>
            <div className="nlm-details-shell">
              <div className="nlm-details-art-wrap">
                <div className="nlm-details-art">{detailTrack.coverUrl ? <img src={resolveAssetUrl(detailTrack.coverUrl)} alt={detailTrack.title} /> : <div className="nlm-details-art-fallback"><Music2 size={80} /></div>}</div>
                {detailTrack.genre && <span className="nlm-details-genre">{detailTrack.genre}</span>}
              </div>
              <div className="nlm-details-meta">
                <span className="nlm-eyebrow">NLM SONGS / TRACK DETAILS</span>
                <h2 id="nlm-details-title">{detailTrack.title}</h2>
                <p id="nlm-details-artist" className="nlm-details-artist">{detailTrack.artist}</p>
                {detailTrack.description && <p className="nlm-details-description">{detailTrack.description}</p>}
                {detailTrack.tags.length > 0 && <div className="nlm-details-tags">{detailTrack.tags.map((tag) => <span key={tag} className="nlm-details-tag">{tag}</span>)}</div>}
              </div>
              <div className="nlm-details-controls">
                <button className="nlm-details-play" onClick={() => void togglePlayback()} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button>
                <div className="nlm-details-seek"><span>{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => { const nextTime = Number(event.target.value); setCurrentTime(nextTime); if (audioRef.current) audioRef.current.currentTime = nextTime; }} aria-label="Seek through track" style={{ '--seek-progress': `${duration ? currentTime / duration * 100 : 0}%` } as React.CSSProperties} /><span>{formatTime(duration)}</span></div>
              </div>
              <div className="nlm-details-actions">
                <button className={`nlm-details-favorite ${isFavorite(detailTrack.id) ? 'is-fav' : ''}`} onClick={() => toggleFavorite(detailTrack)} aria-label={isFavorite(detailTrack.id) ? 'Remove from favorites' : 'Add to favorites'} title={isFavorite(detailTrack.id) ? 'Remove from favorites' : 'Add to favorites'}><Heart size={18} fill={isFavorite(detailTrack.id) ? 'currentColor' : 'none'} /><span>{isFavorite(detailTrack.id) ? 'Favorited' : 'Add to favorites'}</span></button>
                <button className={`nlm-details-download ${!user ? 'nlm-details-download-locked' : ''}`} onClick={() => downloadTrack(detailTrack)} aria-label={`Download ${detailTrack.title}`} title={user ? 'Download track' : 'Create an account to download'}>{user ? <Download size={16} /> : <Lock size={16} />}<span>{user ? 'Download' : 'Sign up to download'}</span></button>
                <button className="nlm-details-share" onClick={shareTrack} aria-label="Share track" title="Share track"><Share2 size={16} /><span>{copied ? 'Copied!' : 'Share'}</span></button>
                {!isAdminMode && (<button className="nlm-details-playlist" onClick={() => setShowPlaylistModal(true)} aria-label="Add to playlist" title="Add to playlist"><List size={16} /><span>Add to playlist</span></button>)}
              </div>
              <div className="nlm-details-lyrics"><h3>Lyrics</h3>{detailTrack.lyrics.length ? <div className={`nlm-lyric-lines ${detailTrack.syncLyrics ? 'is-synced' : 'is-plain'}`}>{detailTrack.lyrics.map((line, index) => (<p key={`${line.time ?? 'plain'}-${index}`} className={detailTrack.syncLyrics ? index === highlightedLyric ? 'is-current' : index < highlightedLyric ? 'is-past' : '' : ''}>{line.text}</p>))}</div> : <p className="nlm-detail-no-lyrics">Lyrics have not been added for this track yet.</p>}</div>
            </div>
          </> : <div className="nlm-detail-loading" role={isLoading ? 'status' : 'alert'}>{isLoading ? <Loader2 size={18} className="nlm-spinner" /> : <FileAudio2 size={18} />} {isLoading ? 'Loading this track…' : catalogError || 'This track is not available in the catalogue.'}<button onClick={() => catalogError ? void loadTracks() : navigate('/nlmsongs')}>{catalogError ? 'Try again' : 'Return to discovery'}</button></div>}
        </section>}

        {playerError && <p className="nlm-player-error" role="alert">{playerError}<button onClick={() => setPlayerError('')} aria-label="Dismiss playback message"><X size={14} /></button></p>}

        <footer className="nlm-player" aria-label="Audio player">
          <button className="nlm-now-playing" onClick={() => selectedTrack && navigate(`/nlmsongs/track/${encodeURIComponent(selectedTrack.id)}`)} disabled={!selectedTrack} aria-label="Open current track details"><span className="nlm-player-cover">{selectedTrack?.coverUrl ? <img src={resolveAssetUrl(selectedTrack.coverUrl)} alt="" /> : <Music2 size={18} />}</span><span className="nlm-player-info"><strong>{selectedTrack?.title || 'Nothing playing'}</strong><small>{selectedTrack?.artist || 'Choose a track from your library'}</small></span>{selectedTrack && (<span className={`nlm-player-favorite ${isFavorite(selectedTrack.id) ? 'is-fav' : ''}`} aria-hidden="true"><Heart size={14} fill={isFavorite(selectedTrack.id) ? 'currentColor' : 'none'} /></span>)}</button>
          <div className="nlm-playback">
            <div className="nlm-transport">
              {!isAdminMode && (
                <button className={`nlm-transport-shuffle ${shuffleMode ? 'is-active' : ''}`} onClick={() => setShuffleMode((s) => !s)} disabled={!selectedTrack} aria-label={shuffleMode ? 'Disable shuffle' : 'Enable shuffle'} aria-pressed={shuffleMode}><Shuffle size={16} fill={shuffleMode ? 'currentColor' : 'none'} /></button>
              )}
              <button className="nlm-transport-skip" onClick={() => { if (audioRef.current && duration) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }} disabled={!selectedTrack} aria-label="Skip backward 10 seconds"><SkipBack size={16} fill="currentColor" /></button>
              <button className="nlm-play-button" onClick={() => void togglePlayback()} disabled={!selectedTrack} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
              <button className="nlm-transport-skip" onClick={() => { if (audioRef.current && duration) audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration); }} disabled={!selectedTrack} aria-label="Skip forward 10 seconds"><SkipForward size={16} fill="currentColor" /></button>
              {!isAdminMode && (
                <button className={`nlm-transport-repeat ${repeatMode !== 'off' ? 'is-active' : ''}`} onClick={() => setRepeatMode((r) => r === 'off' ? 'one' : r === 'one' ? 'all' : 'off')} disabled={!selectedTrack} aria-label={`Repeat mode: ${repeatMode === 'off' ? 'off' : repeatMode === 'one' ? 'one' : 'all'}`} aria-pressed={repeatMode !== 'off'}>
                  <Repeat size={16} fill={repeatMode === 'one' ? 'currentColor' : 'none'} />
                  {repeatMode === 'all' && <span className="nlm-repeat-all-badge">ALL</span>}
                </button>
              )}
            </div>
            <div className="nlm-seek-row"><span>{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => { const nextTime = Number(event.target.value); setCurrentTime(nextTime); if (audioRef.current) audioRef.current.currentTime = nextTime; }} disabled={!selectedTrack || !duration} aria-label="Seek through track" style={{ '--seek-progress': `${duration ? currentTime / duration * 100 : 0}%` } as React.CSSProperties} /><span>{formatTime(duration)}</span></div>
          </div>
          <div className="nlm-player-tools">
            {!isAdminMode && (
              <>
                <button className={`nlm-player-lyrics ${showLyrics ? 'is-open' : ''}`} onClick={() => selectedTrack && setShowLyrics((open) => !open)} disabled={!selectedTrack} aria-pressed={showLyrics} aria-label={showLyrics ? 'Hide lyrics' : `Show lyrics for ${selectedTrack?.title || 'current track'}`}><Captions size={16} /><span>Lyrics</span></button>
                <button className={`nlm-player-queue ${queueOpen ? 'is-open' : ''}`} onClick={() => setQueueOpen((q) => !q)} disabled={!selectedTrack} aria-pressed={queueOpen} aria-label={queueOpen ? 'Hide queue' : 'Open queue'}><List size={16} /><span>Queue</span></button>
                <button className={`nlm-player-eq ${eq.active ? 'is-active' : ''}`} onClick={() => setShowEqualizer(true)} disabled={!selectedTrack} aria-label="Equalizer"><Sparkles size={16} /><span>EQ</span></button>
                <button className={`nlm-player-visualizer ${showVisualizer ? 'is-active' : ''}`} onClick={() => setShowVisualizer((v) => !v)} disabled={!selectedTrack} aria-label={showVisualizer ? 'Hide visualizer' : 'Show visualizer'}><Waves size={16} /><span>Visual</span></button>
                <button className={`nlm-player-sleep ${sleepTimerActive ? 'is-active' : ''}`} onClick={() => setShowSleepTimer(true)} disabled={!selectedTrack} aria-label={sleepTimerActive ? `Sleep timer active (${sleepTimer ? formatTime(sleepTimer) : 'end of track'})` : 'Set sleep timer'}><Clock size={16} /><span>{sleepTimerActive && sleepTimer !== null && sleepTimer > 0 ? formatTime(sleepTimer) : 'Timer'}</span></button>
              </>
            )}
            <div className="nlm-volume"><button onClick={() => setVolume((current) => current === 0 ? 0.78 : 0)} aria-label={volume === 0 ? 'Turn sound on' : 'Mute'}>{volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" style={{ '--seek-progress': `${volume * 100}%` } as React.CSSProperties} /></div>
          </div>
        </footer>
      </main>

      {queueOpen && (
        <div className={`nlm-queue-overlay`} onMouseDown={() => setQueueOpen(false)}>
          <aside className="nlm-queue-panel" onMouseDown={(e) => e.stopPropagation()} aria-label="Up next" aria-modal="true" role="dialog">
            <div className="nlm-queue-head">
              <h3>Up next</h3>
              <span className="nlm-queue-count">{queue.length} tracks</span>
              <button className="nlm-queue-close" onClick={() => setQueueOpen(false)} aria-label="Close queue"><X size={18} /></button>
            </div>
            <div className="nlm-queue-list">
              {queue.length ? (
                queue.map((track, index) => (
                  <div key={`${track.id}-${index}`} className={`nlm-queue-item ${selectedId === track.id && isPlaying ? 'is-playing' : ''}`}>
                    <span className="nlm-queue-drag" aria-hidden="true"><GripVertical size={14} /></span>
                    <span className="nlm-queue-title">
                      <strong>{track.title}</strong>
                      <small>{track.artist}</small>
                    </span>
                    <button className="nlm-queue-remove" onClick={() => removeFromQueue(index)} aria-label={`Remove ${track.title} from queue`} title="Remove from queue"><Trash2 size={14} /></button>
                  </div>
                ))
              ) : (
                <div className="nlm-queue-empty"><Clock size={18} /><p>No tracks queued. Add songs with the + button.</p></div>
              )}
            </div>
          </aside>
        </div>
      )}

      {showEqualizer && (
        <div className="nlm-eq-overlay" onMouseDown={() => setShowEqualizer(false)}>
          <aside className="nlm-eq-modal" onMouseDown={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
            <div className="nlm-eq-title"><h3>Equalizer</h3><button className="nlm-eq-close" onClick={() => setShowEqualizer(false)} aria-label="Close equalizer"><X size={16} /></button></div>
            <div className="nlm-eq-preset-row">
              {Object.keys(EQ_PRESETS).map((name) => (
                <button key={name} className={eq.preset === name ? 'is-active' : ''} onClick={() => eq.applyPreset(name)} aria-pressed={eq.preset === name}>{name}</button>
              ))}
            </div>
            <div className="nlm-eq-bands">
              {eq.bands.map((band, index) => (
                <div key={index} className="nlm-eq-band">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={band}
                    onChange={(e) => {
                      const newBands = [...eq.bands];
                      newBands[index] = Number(e.target.value);
                      eq.setBands(newBands);
                    }}
                    aria-label={`Band ${index + 1} gain`}
                  />
                  <span className="nlm-eq-band-label">{(60 * Math.pow(2, index / 3)).toFixed(0)}Hz</span>
                </div>
              ))}
            </div>
            <div className="nlm-eq-footer">
              <button className="nlm-eq-reset" onClick={eq.reset}>Reset</button>
            </div>
          </aside>
        </div>
      )}

      {showSleepTimer && (
        <div className="nlm-sleep-overlay" onMouseDown={() => setShowSleepTimer(false)}>
          <aside className="nlm-sleep-modal" onMouseDown={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
            <div className="nlm-sleep-title"><h3>Sleep timer</h3><button className="nlm-sleep-close" onClick={() => setShowSleepTimer(false)} aria-label="Close sleep timer"><X size={16} /></button></div>
            <div className="nlm-sleep-options">
              {SLEEP_TIMER_OPTIONS.map((option) => (
                <button key={option.label} onClick={() => setSleepTimerValue(option.seconds)} aria-label={option.label}><span>{option.label}</span></button>
              ))}
              {sleepTimerActive && (
                <button className="nlm-sleep-cancel" onClick={cancelSleepTimer}><span>Cancel timer</span></button>
              )}
            </div>
          </aside>
        </div>
      )}

      {showPlaylistModal && (
        <div className="nlm-playlist-overlay" onMouseDown={() => setShowPlaylistModal(false)}>
          <aside className="nlm-playlist-modal" onMouseDown={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
            <div className="nlm-playlist-modal-head">
              <h3>Add to playlist</h3>
              <button className="nlm-playlist-close" onClick={() => setShowPlaylistModal(false)} aria-label="Close playlists"><X size={16} /></button>
            </div>
            {user ? (
              <>
                {playlists.map((pl) => (
                  <div key={pl.id} className="nlm-playlist-item">
                    <button className="nlm-playlist-add" onClick={() => { void addToPlaylist(pl.id); setShowPlaylistModal(false); }} aria-label={`Add to ${pl.name}`} title={`Add to ${pl.name}`}>+</button>
                    <span className="nlm-playlist-name">{pl.name}</span>
                    <small className="nlm-playlist-count">{pl.trackCount} tracks</small>
                  </div>
                ))}
                <div className="nlm-playlist-create-form">
                  <input value={playlistName} onChange={(e) => setPlaylistName(e.target.value)} placeholder="New playlist name" maxLength={100} />
                  <button className="nlm-submit-button" onClick={() => { void handleCreatePlaylist({} as any); }} disabled={!playlistName.trim()}>Create</button>
                </div>
              </>
            ) : (
              <div className="nlm-playlist-empty"><p>Sign in to create and manage playlists.</p><button className="nlm-submit-button" onClick={openSignIn}>Sign in</button></div>
            )}
          </aside>
        </div>
      )}

      {showVisualizer && (
        <div className="nlm-visualizer" aria-hidden="true">
          <canvas ref={visualizerCanvasRef} className="nlm-visualizer-canvas" />
        </div>
      )}
     </div>
  );
};

export default NLMSongs;
