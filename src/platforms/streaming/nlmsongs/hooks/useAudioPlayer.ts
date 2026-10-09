import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '../types';
import { DEFAULT_VOLUME } from '../constants';

export interface UseAudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  selectedTrack: Track | null;
  pendingAutoplayRef: React.MutableRefObject<boolean>;
  onEnded: () => void;
}

export const useAudioPlayer = ({
  audioRef,
  selectedTrack,
  pendingAutoplayRef,
  onEnded,
}: UseAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [playerError, setPlayerError] = useState('');

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioRef]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlayerError('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [selectedTrack?.id, audioRef]);

  const handlers = {
    onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) =>
      setCurrentTime(event.currentTarget.currentTime),
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLAudioElement>) =>
      setDuration(event.currentTarget.duration),
    onCanPlay: () => {
      if (!pendingAutoplayRef.current) return;
      pendingAutoplayRef.current = false;
      void audioRef.current?.play().catch(() => {
        setPlayerError('Playback failed. Check the audio file and media server, then try again.');
      });
    },
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onEnded: () => {
      setIsPlaying(false);
      onEnded();
    },
    onError: (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const errorCode = event.currentTarget.error?.code;
      const message = errorCode === 4
        ? 'This audio format is not supported by your browser. Use MP3, WAV, or M4A.'
        : errorCode === 3
          ? 'This audio file could not be decoded. It may be damaged or encoded with an unsupported codec.'
          : 'This audio file could not be loaded. Check the media server connection and try again.';
      setPlayerError(message);
      setIsPlaying(false);
    },
  };

  const togglePlayback = useCallback(async () => {
    if (!selectedTrack || !audioRef.current) return;
    setPlayerError('');
    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    } catch {
      setPlayerError('Playback failed. Check the audio file and media server, then try again.');
      setIsPlaying(false);
    }
  }, [selectedTrack, audioRef]);

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, [audioRef]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
  }, []);

  const clearError = useCallback(() => setPlayerError(''), []);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    playerError,
    handlers,
    togglePlayback,
    seek,
    setVolume,
    clearError,
  };
};
