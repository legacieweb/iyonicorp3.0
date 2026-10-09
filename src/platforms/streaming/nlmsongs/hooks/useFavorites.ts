import { useCallback, useEffect, useState } from 'react';
import { LOCAL_STORAGE_KEYS } from '../constants';

type Listener = (favorites: string[]) => void;

const getStoredFavorites = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.favorites) || '[]');
  } catch {
    return [];
  }
};

const persistFavorites = (favorites: string[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, JSON.stringify(favorites));
  } catch {}
};

const listeners: Listener[] = [];

export const useFavorites = (userId?: string | null) => {
  const [favorites, setFavorites] = useState<string[]>(() => getStoredFavorites());

  const syncFromStorage = useCallback(() => {
    const stored = getStoredFavorites();
    setFavorites(stored);
    listeners.forEach((listener) => listener(stored));
  }, []);

  useEffect(() => {
    const storageHandler = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEYS.favorites) {
        syncFromStorage();
      }
    };
    window.addEventListener('storage', storageHandler);
    return () => window.removeEventListener('storage', storageHandler);
  }, [syncFromStorage]);

  useEffect(() => {
    if (userId) {
      syncFromStorage();
    }
  }, [userId, syncFromStorage]);

  const toggleFavorite = useCallback((trackId: string): boolean => {
    const updated = favorites.includes(trackId)
      ? favorites.filter((id) => id !== trackId)
      : [...favorites, trackId];
    setFavorites(updated);
    persistFavorites(updated);
    listeners.forEach((listener) => listener(updated));
    return updated.includes(trackId);
  }, [favorites]);

  const isFavorite = useCallback((trackId: string): boolean =>
    favorites.includes(trackId), [favorites]);

  return { favorites, toggleFavorite, isFavorite, syncFromStorage };
};

export const subscribeToFavorites = (listener: Listener): (() => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
};
