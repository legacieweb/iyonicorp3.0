import { useEffect, useRef, type RefObject } from 'react';
import { acquireNlmAudioGraph } from '../hooks/sharedAudioGraph';
import {
  Check, Download, Heart, List, Loader2, Pause, Play, Repeat, Share2, Shuffle,
  SkipBack, SkipForward, Volume2, VolumeX,
} from 'lucide-react';
import type { RepeatMode, Track } from '../types';
import { formatTime, resolveAssetUrl } from '../utils';

interface Props {
  track: Track | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  isAdminMode: boolean;
  isFavorite: boolean;
  copied: boolean;
  offlineState: 'idle' | 'loading' | 'saved' | 'error' | 'unsupported';
  offlineProgress: number | null;
  offlineMessage: string;
  onSaveOffline: () => void;
  onNowPlayingClick: () => void;
  onTogglePlayback: () => void;
  onPreviousTrack: () => void;
  onNextTrack: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (volume: number) => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onOpenPlaylist: () => void;
}

export const NLMAudioPlayer = ({
  track,
  audioRef,
  isPlaying,
  currentTime,
  duration,
  volume,
  shuffleMode,
  repeatMode,
  isAdminMode,
  isFavorite,
  copied,
  offlineState,
  offlineProgress,
  offlineMessage,
  onSaveOffline,
  onNowPlayingClick,
  onTogglePlayback,
  onPreviousTrack,
  onNextTrack,
  onToggleShuffle,
  onCycleRepeat,
  onSeek,
  onSetVolume,
  onToggleFavorite,
  onShare,
  onOpenPlaylist,
}: Props) => {
  const playerRef = useRef<HTMLElement>(null);
  const waveSvgRef = useRef<SVGSVGElement>(null);
  const wavePathRef = useRef<SVGPathElement>(null);
  const waveSecondaryPathRef = useRef<SVGPathElement>(null);
  const waveSpectrumPathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const player = playerRef.current;
    const audio = audioRef.current;
    if (!player || !audio) return;

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lease: ReturnType<typeof acquireNlmAudioGraph> | null = null;
    let frame = 0;
    try {
      const analyser = isPlaying ? (lease = acquireNlmAudioGraph(audio)).graph.analyser : null;
      const samples = new Uint8Array(analyser?.frequencyBinCount || 128);
      const sampleCount = Math.min(36, samples.length);
      let reducedMotion = motionPreference.matches;
      let smoothBass = 0;
      let smoothMid = 0;
      let smoothHigh = 0;
      let smoothEnergy = 0;
      let smoothBeat = 0;
      let wavePhase = 0;

      const drawWaveBorder = (energy: number, beat: number) => {
        const path = wavePathRef.current;
        const secondaryPath = waveSecondaryPathRef.current;
        const tertiaryPath = waveSpectrumPathRef.current;
        const svg = waveSvgRef.current;
        const width = player.clientWidth;
        const height = player.clientHeight;
        if (!path || !secondaryPath || !tertiaryPath || !svg || width < 1 || height < 1) return;

        const borderWidth = 1;
        const edge = borderWidth / 2;
        const computedRadius = Number.parseFloat(window.getComputedStyle(player).borderTopLeftRadius) || 0;
        const radius = Math.max(.5, Math.min(computedRadius - edge, (height - borderWidth) / 2, (width - borderWidth) / 2));
        const straightX = Math.max(0, width - borderWidth - radius * 2);
        const straightY = Math.max(0, height - borderWidth - radius * 2);
        const arcLength = Math.PI * radius / 2;
        const perimeter = straightX * 2 + straightY * 2 + arcLength * 4;
        const bounds = player.getBoundingClientRect();
        const pointCount = Math.max(120, Math.min(360, Math.ceil(perimeter / 5)));
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

        const createWavePath = (cycles: number, phaseOffset: number, scale: number) => {
          let d = '';
          for (let index = 0; index < pointCount; index += 1) {
            const progress = index / (pointCount - 1);
            const distance = progress * perimeter;
            const binPosition = progress * Math.max(0, sampleCount - 1);
            const lowerBin = Math.floor(binPosition);
            const upperBin = Math.min(sampleCount - 1, lowerBin + 1);
            const mix = binPosition - lowerBin;
            const lowerLevel = Math.max(0, (samples[lowerBin] / 255 - .035) / .965);
            const upperLevel = Math.max(0, (samples[upperBin] / 255 - .035) / .965);
            const level = Math.sqrt(lowerLevel + (upperLevel - lowerLevel) * mix);
            const beatLift = beat * (2 + level * 6);
            const signalHeight = 2 + level * (7 + energy * 5) + beatLift;
            const waveAngle = progress * Math.PI * 2 * cycles + wavePhase + phaseOffset;
            const wave = Math.max(0, Math.sin(waveAngle)) * .76 + Math.max(0, Math.sin(waveAngle * 2.1 + .65)) * .24;

            let x = 0;
            let y = 0;
            let nx = 0;
            let ny = 0;
            if (distance < straightX) {
              x = edge + radius + distance;
              y = edge;
              nx = 0; ny = -1;
            } else if (distance < straightX + arcLength) {
              const angle = -Math.PI / 2 + (distance - straightX) / radius;
              x = width - edge - radius + Math.cos(angle) * radius;
              y = edge + radius + Math.sin(angle) * radius;
              nx = Math.cos(angle); ny = Math.sin(angle);
            } else if (distance < straightX + arcLength + straightY) {
              const segment = distance - straightX - arcLength;
              x = width - edge;
              y = edge + radius + segment;
              nx = 1; ny = 0;
            } else if (distance < straightX + straightY + arcLength * 2) {
              const angle = (distance - straightX - arcLength - straightY) / radius;
              x = width - edge - radius + Math.cos(angle) * radius;
              y = height - edge - radius + Math.sin(angle) * radius;
              nx = Math.cos(angle); ny = Math.sin(angle);
            } else if (distance < straightX * 2 + straightY + arcLength * 2) {
              const segment = distance - straightX - straightY - arcLength * 2;
              x = width - edge - radius - segment;
              y = height - edge;
              nx = 0; ny = 1;
            } else if (distance < straightX * 2 + straightY + arcLength * 3) {
              const angle = Math.PI / 2 + (distance - straightX * 2 - straightY - arcLength * 2) / radius;
              x = edge + radius + Math.cos(angle) * radius;
              y = height - edge - radius + Math.sin(angle) * radius;
              nx = Math.cos(angle); ny = Math.sin(angle);
            } else if (distance < straightX * 2 + straightY * 2 + arcLength * 3) {
              const segment = distance - straightX * 2 - straightY - arcLength * 3;
              x = edge;
              y = height - edge - radius - segment;
              nx = -1; ny = 0;
            } else {
              const angle = Math.PI + (distance - straightX * 2 - straightY * 2 - arcLength * 3) / radius;
              x = edge + radius + Math.cos(angle) * radius;
              y = edge + radius + Math.sin(angle) * radius;
              nx = Math.cos(angle); ny = Math.sin(angle);
            }

            const roomX = nx > .001 ? (window.innerWidth - bounds.right - 5) / nx : nx < -.001 ? (bounds.left - 5) / -nx : Infinity;
            const roomY = ny > .001 ? (window.innerHeight - bounds.bottom - 5) / ny : ny < -.001 ? (bounds.top - 5) / -ny : Infinity;
            const availableOutset = Math.max(1, Math.min(roomX, roomY, 18));
            const topEdgeBoost = distance < straightX ? 1.65 : 1;
            const offset = Math.min(availableOutset, signalHeight * wave * scale * topEdgeBoost);
            const pointX = x + nx * offset;
            const pointY = y + ny * offset;
            d += (index === 0 ? 'M ' : ' L ') + pointX.toFixed(2) + ' ' + pointY.toFixed(2);
          }
          return d + ' Z';
        };

        path.setAttribute('d', createWavePath(5, 0, 1));
        secondaryPath.setAttribute('d', createWavePath(6, Math.PI * .62, .78));
        tertiaryPath.setAttribute('d', createWavePath(7, Math.PI * 1.18, .56));
      };
      const update = () => {
        const playingAudio = Boolean(isPlaying && analyser && !audio.paused && !audio.ended);
        if (playingAudio && !document.hidden && !reducedMotion) {
          analyser.getByteFrequencyData(samples);
          const last = sampleCount;
          let bass = 0;
          let mid = 0;
          let high = 0;
          for (let index = 0; index < last; index += 1) {
            const value = Math.max(0, (samples[index] / 255 - .06) / .94);
            if (index < last * .2) bass += value;
            else if (index < last * .62) mid += value;
            else high += value;
          }
          bass /= Math.max(1, last * .2);
          mid /= Math.max(1, last * .42);
          high /= Math.max(1, last * .38);
          const blend = (current: number, next: number) => current + (next - current) * (next > current ? .24 : .1);
          const bassTransient = Math.max(0, bass - smoothBass - .025);
          smoothBeat = Math.max(smoothBeat * .82, Math.min(1, bassTransient * 8));
          smoothBass = blend(smoothBass, bass);
          smoothMid = blend(smoothMid, mid);
          smoothHigh = blend(smoothHigh, high);
          smoothEnergy = blend(smoothEnergy, Math.min(1, (smoothBass + smoothMid + smoothHigh) / 3));
          wavePhase += .012 + smoothEnergy * .035 + smoothBeat * .16;
          const waveColor = smoothBeat > .42 ? 'var(--nlm-coral-glow)' : smoothMid > .38 ? 'var(--nlm-cyan-glow)' : 'var(--nlm-accent-glow)';
          player.style.setProperty('--nlm-player-wave-color', waveColor);
        } else {
          smoothEnergy += (0 - smoothEnergy) * .08;
          smoothBeat += (0 - smoothBeat) * .16;
          if (!reducedMotion) wavePhase += .003;
          player.style.setProperty('--nlm-player-wave-color', 'var(--nlm-accent)');
        }
        drawWaveBorder(playingAudio ? smoothEnergy : .035, playingAudio ? smoothBeat : 0);
        frame = window.requestAnimationFrame(update);
      };
      const onMotionPreferenceChange = () => {
        reducedMotion = motionPreference.matches;
        window.cancelAnimationFrame(frame);
        frame = 0;
        update();
      };
      const resizeObserver = new ResizeObserver(() => drawWaveBorder(smoothEnergy, smoothBeat));
      resizeObserver.observe(player);
      motionPreference.addEventListener('change', onMotionPreferenceChange);
      update();
      return () => {
        window.cancelAnimationFrame(frame);
        motionPreference.removeEventListener('change', onMotionPreferenceChange);
        resizeObserver.disconnect();
        lease?.release();
        for (const name of ['--nlm-player-wave-color', '--nlm-player-wave-radius-tl-x', '--nlm-player-wave-radius-tr-x', '--nlm-player-wave-radius-br-x', '--nlm-player-wave-radius-bl-x', '--nlm-player-wave-radius-tl-y', '--nlm-player-wave-radius-tr-y', '--nlm-player-wave-radius-br-y', '--nlm-player-wave-radius-bl-y']) player.style.removeProperty(name);
      };
    } catch {
      lease?.release();
      return undefined;
    }
  }, [audioRef, isPlaying, track?.id]);

  return (
  <footer ref={playerRef} className={`nlm-player nlm-player-floating has-visualizer ${isPlaying ? 'is-audio-playing' : ''}`} aria-label="Audio player">
    <svg ref={waveSvgRef} className="nlm-player-wave-border" aria-hidden="true" focusable="false">
      <path ref={waveSpectrumPathRef} className="nlm-player-wave-tertiary" />
      <path ref={waveSecondaryPathRef} className="nlm-player-wave-secondary" />
      <path ref={wavePathRef} className="nlm-player-wave-primary" />
    </svg>
    <button
      className="nlm-now-playing"
      onClick={onNowPlayingClick}
      disabled={!track}
      aria-label="Open current track details"
    >
      <span className="nlm-player-cover">
        {track?.coverUrl ? <img src={resolveAssetUrl(track.coverUrl)} alt="" /> : <span className="nlm-player-cover-fallback" />}
      </span>
      <span className="nlm-player-info">
        <strong>{track?.title || 'Nothing playing'}</strong>
        <small>{track?.artist || 'Choose a track from your library'}</small>
      </span>
    </button>

    <div className="nlm-playback">
      <div className="nlm-transport">
        <button className={`nlm-transport-shuffle ${shuffleMode ? 'is-active' : ''}`} onClick={onToggleShuffle} disabled={!track} aria-label={shuffleMode ? 'Disable shuffle' : 'Enable shuffle'} aria-pressed={shuffleMode} title={shuffleMode ? 'Shuffle on' : 'Shuffle off'}>
          <Shuffle size={15} />
        </button>
        <button className="nlm-transport-skip" onClick={onPreviousTrack} disabled={!track} aria-label="Previous track" title="Previous track">
          <SkipBack size={16} />
        </button>
        <button className="nlm-play-button" onClick={onTogglePlayback} disabled={!track} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <button className="nlm-transport-skip" onClick={onNextTrack} disabled={!track} aria-label="Next track" title="Next track">
          <SkipForward size={16} />
        </button>
        <button className={`nlm-transport-repeat ${repeatMode !== 'off' ? 'is-active' : ''}`} onClick={onCycleRepeat} disabled={!track} aria-label={`Repeat mode: ${repeatMode}`} aria-pressed={repeatMode !== 'off'} title={`Repeat ${repeatMode}`}>
          <Repeat size={15} />
          {repeatMode === 'one' && <span className="nlm-repeat-all-badge">1</span>}
          {repeatMode === 'all' && <span className="nlm-repeat-all-badge">ALL</span>}
        </button>
      </div>

      <div className="nlm-seek-row">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => onSeek(Number(event.target.value))}
          disabled={!track || !duration}
          aria-label="Seek through track"
          style={{ '--seek-progress': `${duration ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
        />
        <span>{formatTime(duration)}</span>
      </div>
    </div>

    <div className="nlm-player-actions" aria-label="Track actions">
      <button
        className={`nlm-player-action nlm-player-action-favorite ${isFavorite ? 'is-fav' : ''}`}
        onClick={onToggleFavorite}
        disabled={!track}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={isFavorite}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
        <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
      </button>
      <button
        className={`nlm-player-action nlm-player-action-download ${offlineState === 'saved' ? 'is-fav' : ''} ${offlineState === 'error' ? 'has-error' : ''}`}
        onClick={onSaveOffline}
        disabled={!track || offlineState === 'loading' || offlineState === 'saved' || offlineState === 'unsupported'}
        aria-label={offlineState === 'saved' ? 'Saved for offline' : 'Save track for offline listening'}
        title={offlineMessage || (offlineState === 'saved' ? 'Saved for offline' : 'Save for offline')}
      >
        {offlineState === 'loading' ? <Loader2 size={15} className="nlm-spinner" /> : offlineState === 'saved' ? <Check size={15} /> : <Download size={15} />}
        <span>{offlineState === 'loading' ? `Saving${offlineProgress !== null ? ` ${offlineProgress}%` : '…'}` : offlineState === 'saved' ? 'Saved' : offlineState === 'error' ? 'Retry' : offlineState === 'unsupported' ? 'Unavailable' : 'Offline'}</span>
      </button>
      <button
        className="nlm-player-action"
        onClick={onShare}
        disabled={!track}
        aria-label="Share track"
        title="Share track"
      >
        <Share2 size={15} />
        <span>{copied ? 'Copied' : 'Share'}</span>
      </button>
      {!isAdminMode && (
        <button
          className="nlm-player-action"
          onClick={onOpenPlaylist}
          disabled={!track}
          aria-label="Add to playlist"
          title="Add to playlist"
        >
          <List size={15} />
          <span>Playlist</span>
        </button>
      )}
    </div>

    <div className="nlm-volume">
      <button onClick={() => onSetVolume(volume === 0 ? 0.78 : 0)} aria-label={volume === 0 ? 'Turn sound on' : 'Mute'}>
        {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(event) => onSetVolume(Number(event.target.value))}
        aria-label="Volume"
        style={{ '--seek-progress': `${volume * 100}%` } as React.CSSProperties}
      />
    </div>
  </footer>
  );
};

export default NLMAudioPlayer;
