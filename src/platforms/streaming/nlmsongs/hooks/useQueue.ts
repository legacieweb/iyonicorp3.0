import { useCallback, useEffect, useState } from 'react';
import type { RepeatMode, Track } from '../types';
import { LOCAL_STORAGE_KEYS, DEFAULT_REPEAT_MODE } from '../constants';

export const useQueue = () => {
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(DEFAULT_REPEAT_MODE);

  const restore = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.queue) || '[]');
      const shuffle = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.shuffle) || 'false');
      const repeat = (localStorage.getItem(LOCAL_STORAGE_KEYS.repeat) || DEFAULT_REPEAT_MODE) as RepeatMode;
      if (saved.length) {
        setQueue(saved);
      }
      setShuffleMode(shuffle);
      setRepeatMode(repeat);
    } catch {}
  }, []);

  const persist = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.queue, JSON.stringify(queue));
      localStorage.setItem(LOCAL_STORAGE_KEYS.shuffle, String(shuffleMode));
      localStorage.setItem(LOCAL_STORAGE_KEYS.repeat, repeatMode);
    } catch {}
  }, [queue, shuffleMode, repeatMode]);

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    const handleBeforeUnload = () => persist();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [persist]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveInQueue = useCallback((from: number, to: number) => {
    setQueue((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const toggleShuffle = useCallback(() => {
    setShuffleMode((s) => !s);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((r) => (r === 'off' ? 'one' : r === 'one' ? 'all' : 'off'));
  }, []);

  return {
    queue,
    shuffleMode,
    repeatMode,
    addToQueue,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    toggleShuffle,
    cycleRepeat,
    setRepeatMode,
  };
};
