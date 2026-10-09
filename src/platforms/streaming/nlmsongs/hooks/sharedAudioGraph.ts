import { EQ_FREQUENCIES } from '../constants';

export interface NlmAudioGraph {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  filters: BiquadFilterNode[];
  analyser: AnalyserNode;
  users: number;
  connected: boolean;
  failed: boolean;
  onPlay: () => void;
}

const graphs = new WeakMap<HTMLAudioElement, NlmAudioGraph>();

const connect = (graph: NlmAudioGraph) => {
  if (graph.connected || graph.failed) return;
  graph.source.connect(graph.filters[0]);
  graph.filters.forEach((filter, index) => {
    if (index < graph.filters.length - 1) filter.connect(graph.filters[index + 1]);
    else filter.connect(graph.analyser);
  });
  graph.analyser.connect(graph.context.destination);
  graph.connected = true;
};

const createGraph = (audio: HTMLAudioElement): NlmAudioGraph => {
  const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw new Error('Web Audio is not supported in this browser.');
  const context = new Context();
  const source = context.createMediaElementSource(audio);
  const graph: NlmAudioGraph = {
    context, source, filters: [], analyser: context.createAnalyser(), users: 0,
    connected: false, failed: false, onPlay: () => { void context.resume().catch(() => {}); },
  };
  // Cache immediately: even if filter setup fails, browsers forbid creating a second source for this element.
  graphs.set(audio, graph);
  try {
    graph.filters = EQ_FREQUENCIES.map((frequency, index) => {
      const filter = context.createBiquadFilter();
      filter.type = index === 0 ? 'lowshelf' : index === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = frequency;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });
    graph.analyser.fftSize = 128;
    return graph;
  } catch (error) {
    graph.failed = true;
    try { source.connect(context.destination); } catch { /* Playback fallback is best effort. */ }
    audio.addEventListener('play', graph.onPlay);
    throw error;
  }
};

export const acquireNlmAudioGraph = (audio: HTMLAudioElement) => {
  const graph = graphs.get(audio) ?? createGraph(audio);
  if (graph.failed) throw new Error('Audio processing could not be initialized for this source.');
  try {
    connect(graph);
  } catch (error) {
    graph.failed = true;
    graph.connected = false;
    try {
      graph.source.disconnect();
      graph.filters.forEach((filter) => filter.disconnect());
      graph.analyser.disconnect();
      graph.source.connect(graph.context.destination);
      audio.addEventListener('play', graph.onPlay);
    } catch { /* Preserve the original setup error. */ }
    throw error;
  }

  if (graph.users === 0) audio.addEventListener('play', graph.onPlay);
  graph.users += 1;
  if (!audio.paused) graph.onPlay();

  let released = false;
  return {
    graph,
    release: () => {
      if (released) return;
      released = true;
      graph.users = Math.max(0, graph.users - 1);
      if (graph.users !== 0) return;
      audio.removeEventListener('play', graph.onPlay);
      if (!graph.failed) {
        graph.source.disconnect();
        graph.filters.forEach((filter) => filter.disconnect());
        graph.analyser.disconnect();
        graph.connected = false;
      }
      if (graph.context.state === 'running') void graph.context.suspend();
    },
  };
};
