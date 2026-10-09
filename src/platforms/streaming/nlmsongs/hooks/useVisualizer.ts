import { useEffect, useRef, type RefObject } from 'react';
import { acquireNlmAudioGraph } from './sharedAudioGraph';

export const useVisualizer = (isActive: boolean, audioRef: RefObject<HTMLAudioElement | null>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!isActive || !audio || !canvas) return;

    let lease: ReturnType<typeof acquireNlmAudioGraph> | null = null;
    let animationFrame = 0;
    try {
      lease = acquireNlmAudioGraph(audio);
      const { graph } = lease;
      const analyser = graph.analyser;
      const context = canvas.getContext('2d');
      if (!context) return () => lease?.release();

      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const render = () => {
        analyser.getByteFrequencyData(data);
        context.clearRect(0, 0, bounds.width, bounds.height);
        const barCount = Math.min(data.length, 32);
        const barWidth = bounds.width / barCount;
        for (let index = 0; index < barCount; index += 1) {
          const height = (data[index] / 255) * bounds.height;
          context.fillStyle = `hsl(${(index / barCount) * 60 + 20}, 48%, 64%)`;
          context.fillRect(index * barWidth, bounds.height - height, Math.max(1, barWidth - 2), height);
        }
        animationFrame = requestAnimationFrame(render);
      };
      render();
      return () => {
        cancelAnimationFrame(animationFrame);
        lease?.release();
      };
    } catch (error) {
      console.error('Visualizer error:', error);
      lease?.release();
      return undefined;
    }
  }, [isActive, audioRef]);

  return canvasRef;
};
