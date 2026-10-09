import type { LucideIcon } from 'lucide-react';
import type { NLMSong, NLMPlaylist, NLMPlaylistItem, User } from '../../../services/api';

export type { NLMSong, NLMPlaylist, NLMPlaylistItem };

export type LyricLine = {
  time: number | null;
  text: string;
};

export interface Track {
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
  createdAt?: string;
  updatedAt?: string;
}

export type NLMView = 'Listen' | 'Your Library' | 'Settings';

export type SiteView = 'Home' | 'Genres' | 'My List';

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playerError: string;
}

export interface EqualizerState {
  active: boolean;
  available: boolean;
  error: string;
  bands: number[];
  preset: string;
  toggle: () => void;
  resume: () => void;
  setBands: (bands: number[]) => void;
  applyPreset: (name: string) => void;
  reset: () => void;
}

export type SleepTimerOption = {
  label: string;
  seconds: number;
};

export type GenreOption = {
  label: string;
  query: string;
  color: string;
};

export type FeatureCard = {
  label: string;
  icon: LucideIcon;
  detail: string;
};

export type NavItemConfig = {
  label: string;
  icon: LucideIcon;
};

export type NLMUser = User;
