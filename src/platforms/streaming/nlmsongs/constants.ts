import type { ComponentType } from 'react';
import type { EqualizerState, RepeatMode, SleepTimerOption, GenreOption, FeatureCard, NavItemConfig } from './types';
import { Headphones, Library, Play, Settings, Sparkles } from 'lucide-react';

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Bass: [6, 5, 3, 2, 0, -2, -2, 0, 0, 0],
  Vocal: [0, 0, 2, 4, 5, 3, 2, 0, 0, 0],
  Treble: [-3, -2, 0, 2, 4, 5, 6, 5, 3, 0],
  Rock: [4, 3, 2, 0, -1, 2, 4, 5, 3, 2],
  Pop: [2, 1, 0, 1, 2, 3, 2, 1, 0, 0],
  Electronic: [5, 4, 3, 1, 0, 2, 4, 4, 3, 2],
};

export const EQ_BAND_COUNT = 10;
export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export const DEFAULT_EQ_BANDS: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const SLEEP_TIMER_OPTIONS: SleepTimerOption[] = [
  { label: '5 minutes', seconds: 300 },
  { label: '10 minutes', seconds: 600 },
  { label: '15 minutes', seconds: 900 },
  { label: '30 minutes', seconds: 1800 },
  { label: 'One hour', seconds: 3600 },
  { label: 'End of track', seconds: -1 },
];

export const DEFAULT_VOLUME = 0.78;

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a'] as const;
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

export const AUDIO_FILE_ACCEPT = '.mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4';
export const IMAGE_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export const CLIENT_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Listen', icon: Headphones },
  { label: 'Your Library', icon: Library },
  { label: 'Settings', icon: Settings },
];

export const LOCAL_STORAGE_KEYS = {
  favorites: 'nlm-favorites',
  queue: 'nlm-queue',
  shuffle: 'nlm-shuffle',
  repeat: 'nlm-repeat',
  recentPlay: 'nlm-recent-play',
  saved: 'nlm-saved',
} as const;

export const DEFAULT_REPEAT_MODE: RepeatMode = 'off';

export const createDefaultEqualizerState = (): Omit<EqualizerState, 'toggle' | 'resume' | 'setBands' | 'applyPreset' | 'reset'> => ({
  active: true,
  available: false,
  error: '',
  bands: [...DEFAULT_EQ_BANDS],
  preset: 'Flat',
});

export const FEATURE_CARDS: FeatureCard[] = [
  {
    label: 'Build playlists',
    icon: Headphones,
    detail: 'Save your favorite tracks and organize them into custom playlists.',
  },
  {
    label: 'Queue & shuffle',
    icon: Library,
    detail: 'Reorder your next songs live with drag-and-drop queue control.',
  },
  {
    label: 'Sleep timer',
    icon: Play,
    detail: 'Wind down with a timer that fades the music and shuts off.',
  },
  {
    label: 'Equalizer',
    icon: Sparkles,
    detail: 'Shape the sound with a 10-band EQ and genre presets.',
  },
];

export const DEMO_GENRES: GenreOption[] = [
  { label: 'Electronic', query: 'Electronic', color: '--nlm-coral' },
  { label: 'Ambient', query: 'Ambient', color: '--nlm-lime' },
  { label: 'Synthwave', query: 'Synthwave', color: '--nlm-coral' },
  { label: 'Hip-Hop', query: 'Hip-Hop', color: '--nlm-lime' },
  { label: 'Jazz', query: 'Jazz', color: '--nlm-coral' },
  { label: 'Indie Pop', query: 'Indie Pop', color: '--nlm-lime' },
  { label: 'Trap', query: 'Trap', color: '--nlm-coral' },
  { label: 'Downtempo', query: 'Downtempo', color: '--nlm-lime' },
  { label: 'IDM', query: 'IDM', color: '--nlm-coral' },
  { label: 'Pop', query: 'Pop', color: '--nlm-lime' },
];

export const getEqBandLabel = (index: number): string => {
  const frequency = EQ_FREQUENCIES[index] ?? EQ_FREQUENCIES[0];
  return frequency >= 1000 ? `${frequency / 1000}kHz` : `${frequency}Hz`;
};
