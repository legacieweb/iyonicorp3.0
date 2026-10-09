import { useCallback, useEffect, useRef, useState } from 'react';

export const useSleepTimer = () => {
  const [timer, setTimer] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTimer(null);
    setIsActive(false);
  }, []);

  const start = useCallback((seconds: number, onExpire: () => void) => {
    clear();
    if (seconds <= 0) return;
    setTimer(seconds);
    setIsActive(true);
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setTimer(null);
      onExpire();
    }, seconds * 1000);
  }, [clear]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const remainingLabel = timer !== null && timer > 0 ? formatTimeRemaining(timer) : 'End of track';

  function formatTimeRemaining(seconds: number) {
    if (seconds < 60) return '0:30';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return { timer, isActive, remainingLabel, start, clear };
};
