import { useEffect, useRef } from 'react';
import type { RepeatMode, Track } from '../types';

export interface KeyboardShortcutConfig {
  isDetailRoute: boolean;
  queueOpen: boolean;
  showEqualizer: boolean;
  showPlaylistModal: boolean;
  showSleepTimer: boolean;
  onTogglePlayback: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleQueue: () => void;
  onOpenEqualizer: () => void;
  onToggleVisualizer: () => void;
  onOpenSleepTimer: () => void;
  onCloseQueue: () => void;
  onCloseEqualizer: () => void;
  onClosePlaylist: () => void;
  onCloseSleepTimer: () => void;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutConfig) => {
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { current } = configRef;
      if (current.isDetailRoute) return;

      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          current.onTogglePlayback();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          current.onSeekBackward();
          break;
        case 'ArrowRight':
          event.preventDefault();
          current.onSeekForward();
          break;
        case 'n':
          event.preventDefault();
          current.onPlayNext();
          break;
        case 'p':
          event.preventDefault();
          current.onPlayPrevious();
          break;
        case 's':
          event.preventDefault();
          current.onToggleShuffle();
          break;
        case 'r':
          event.preventDefault();
          current.onCycleRepeat();
          break;
        case 'q':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            current.onToggleQueue();
          }
          break;
        case 'e':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            current.onOpenEqualizer();
          }
          break;
        case 'v':
          event.preventDefault();
          current.onToggleVisualizer();
          break;
        case 't':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            current.onOpenSleepTimer();
          }
          break;
        case 'Escape':
          if (current.queueOpen) current.onCloseQueue();
          if (current.showEqualizer) current.onCloseEqualizer();
          if (current.showPlaylistModal) current.onClosePlaylist();
          if (current.showSleepTimer) current.onCloseSleepTimer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
