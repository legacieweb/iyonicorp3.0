import type { LyricLine, Track } from './types';
import type { NLMSong } from './types';
import { getApiOrigin } from '../../../utils/apiUrl';

const API_ORIGIN = getApiOrigin();

const URL_PATTERN = /^(?:https?:|blob:|data:)/i;

export const resolveAssetUrl = (value?: string | null): string => {
  if (!value) return '';
  if (URL_PATTERN.test(value)) return value;
  return new URL(value, `${API_ORIGIN}/`).toString();
};

export const parseLyrics = (value: string, syncToAudio: boolean): LyricLine[] | string => {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed: LyricLine[] = [];
  const timestampPattern = /^\[(\d+):([0-5]\d(?:\.\d{1,2})?)\]\s*(.+)$/;

  for (const [index, line] of lines.entries()) {
    const match = line.match(timestampPattern);
    if (syncToAudio && !match) {
      return `Lyric line ${index + 1} needs a timestamp, like [00:12] A new day comes around.`;
    }
    parsed.push({
      time: syncToAudio && match ? Number(match[1]) * 60 + Number(match[2]) : null,
      text: match ? match[3].trim() : line,
    });
  }

  return syncToAudio
    ? parsed.sort((first, second) => (first.time ?? 0) - (second.time ?? 0))
    : parsed;
};

export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0:00';
  return formatTime(seconds);
};

export const activeLyricIndex = (lyrics: LyricLine[], time: number): number => {
  let index = -1;
  for (let line = 0; line < lyrics.length; line += 1) {
    const lyricTime = lyrics[line].time;
    if (lyricTime === null || lyricTime > time) break;
    index = line;
  }
  return index;
};

export const toTrack = (song: NLMSong & { audio_url?: string; thumbnail_url?: string; is_active?: boolean }): Track => {
  const lyricsValue = typeof song.lyrics === 'string' ? song.lyrics : '';
  const hasTimestamps = lyricsValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .every((line) => /^\[\d+:[0-5]\d(?:\.\d{1,2})?\]\s*.+$/.test(line));

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
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  };
};

export const isAudioFile = (file: File): boolean =>
  /\.(mp3|wav|m4a)$/i.test(file.name);

export const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/');

export const sanitizeFilename = (title: string, artist: string): string =>
  `${artist} - ${title}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() ||
  'NLM track';

export const getAudioExtension = (url: string): 'mp3' | 'wav' | 'm4a' => {
  const ext = new URL(url, window.location.origin).pathname.split('.').pop()?.toLowerCase();
  return (ext && ['mp3', 'wav', 'm4a'].includes(ext) ? ext : 'mp3') as 'mp3' | 'wav' | 'm4a';
};

export const extractRouteTrackId = (pathname: string): string | null => {
  const match = pathname.match(/^\/nlmsongs\/track\/(.+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

export const debounce = <T extends (...args: unknown[]) => void>(fn: T, delay: number): T => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};
