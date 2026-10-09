import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { DEFAULT_EQ_BANDS, EQ_PRESETS } from '../constants';
import type { EqualizerState } from '../types';
import { acquireNlmAudioGraph, type NlmAudioGraph } from './sharedAudioGraph';

const STORAGE_KEY = 'nlm-equalizer-v1';
const loadSettings = (): { bands: number[]; preset: string; active: boolean } => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(parsed?.bands) && parsed.bands.length === 10) {
      return {
        bands: parsed.bands.map((band: unknown) => Math.max(-12, Math.min(12, Number(band) || 0))),
        preset: typeof parsed.preset === 'string' ? parsed.preset : 'Custom',
        active: parsed.active !== false,
      };
    }
  } catch { /* Storage may be unavailable; use the flat profile. */ }
  return { bands: [...DEFAULT_EQ_BANDS], preset: 'Flat', active: true };
};

export const useEqualizer = (audioRef: RefObject<HTMLAudioElement | null>) => {
  const [initial] = useState(loadSettings);
  const [bands, setBands] = useState<number[]>(initial.bands);
  const [preset, setPreset] = useState(initial.preset);
  const [active, setActive] = useState(initial.active);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const graphRef = useRef<NlmAudioGraph | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let release: (() => void) | undefined;
    try {
      const lease = acquireNlmAudioGraph(audio);
      const graph = lease.graph;
      release = lease.release;
      graphRef.current = graph;
      setAvailable(true);
      setError('');
      return () => {
        graphRef.current = null;
        release?.();
      };
    } catch (cause) {
      release?.();
      setAvailable(false);
      setError(cause instanceof Error ? cause.message : 'Equalizer could not connect to this audio source.');
    }
  }, [audioRef]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.filters.forEach((filter, index) => {
      filter.gain.setTargetAtTime(active ? bands[index] : 0, graph.context.currentTime, 0.015);
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ bands, preset, active })); } catch { /* Keep audio controls usable without storage. */ }
  }, [bands, preset, active, available]);

  const toggle = useCallback(() => setActive((value) => !value), []);
  const resume = useCallback(() => {
    const context = graphRef.current?.context;
    if (context?.state === 'suspended') void context.resume().catch(() => setError('Tap play again to enable audio processing.'));
  }, []);
  const applyPreset = useCallback((name: string) => {
    setPreset(name);
    setBands([...(EQ_PRESETS[name] ?? DEFAULT_EQ_BANDS)]);
    setActive(true);
  }, []);
  const reset = useCallback(() => {
    setPreset('Flat');
    setBands([...DEFAULT_EQ_BANDS]);
    setActive(true);
  }, []);
  const setBandsValue = useCallback((value: number[]) => {
    setPreset('Custom');
    setBands(value.map((band) => Math.max(-12, Math.min(12, band))));
    setActive(true);
  }, []);

  const state: EqualizerState = { active, available, error, bands, preset, toggle, resume, setBands: setBandsValue, applyPreset, reset };
  return state;
};
