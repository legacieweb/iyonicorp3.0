import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  FastForward, Maximize, Minimize, Pause, PictureInPicture, Play,
  Rewind, Settings, Volume2, VolumeX,
} from 'lucide-react';

type IxStreamVideoPlayerProps = {
  src: string;
  title: string;
  poster?: string;
  autoPlay?: boolean;
  autoFullscreen?: boolean;
  className?: string;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const IxStreamVideoPlayer = ({ src, title, poster, autoPlay = false, autoFullscreen = false, className = '' }: IxStreamVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem('ixstream-playback-speed')) || 1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(0);
  const controlsBeforePointerRef = useRef(true);

  const noteActivity = () => {
    const now = Date.now();
    if (now - lastActivityRef.current < 250) return;
    lastActivityRef.current = now;
    setControlsVisible(true);
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    if (playing && !settingsOpen && !error) {
      idleTimerRef.current = window.setTimeout(() => setControlsVisible(false), 5000);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current || document.fullscreenElement === document.documentElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!autoFullscreen || !stageRef.current) return;
    if (document.fullscreenElement === document.documentElement) {
      setIsFullscreen(true);
      setFullscreenBlocked(false);
      return;
    }
    void stageRef.current.requestFullscreen().then(() => setFullscreenBlocked(false)).catch(() => setFullscreenBlocked(true));
  }, [autoFullscreen]);

  useEffect(() => {
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    if (!playing || settingsOpen || error) {
      setControlsVisible(true);
      return;
    }
    idleTimerRef.current = window.setTimeout(() => setControlsVisible(false), 5000);
    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, [playing, settingsOpen, error]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      noteActivity();
      if (event.code === 'Space') {
        if (target instanceof HTMLElement && target.closest('button')) return;
        event.preventDefault();
        void togglePlayback();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(-10);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(10);
      } else if (event.key.toLowerCase() === 'm') {
        setVolume((current) => current === 0 ? 0.85 : 0);
      } else if (event.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;
    void video.play().catch(() => setPlaying(false));
  }, [autoPlay, src]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = speed;
    }
  }, [volume, speed]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); } catch { setPlaying(false); }
    } else video.pause();
  };

  const seekBy = (offset: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + offset, 0), duration || 0);
    setCurrentTime(video.currentTime);
  };

  const toggleFullscreen = async () => {
    if (!stageRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current.requestFullscreen();
      setFullscreenBlocked(false);
    } catch { setIsFullscreen(false); }
  };

  const handlePlayerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === videoRef.current) controlsBeforePointerRef.current = controlsVisible;
    noteActivity();
  };

  const toggleControlsFromVideo = () => {
    if (!playing) return;
    const nextVisible = !controlsBeforePointerRef.current;
    setControlsVisible(nextVisible);
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    if (nextVisible) idleTimerRef.current = window.setTimeout(() => setControlsVisible(false), 5000);
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch { /* Picture-in-picture is not available in every browser context. */ }
  };

  const chooseSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    localStorage.setItem('ixstream-playback-speed', String(nextSpeed));
    setSettingsOpen(false);
  };

  return (
    <div className={`ixs-video-player ${className} ${controlsVisible || settingsOpen || !playing ? '' : 'is-controls-hidden'}`} ref={stageRef} onPointerMove={noteActivity} onPointerDown={handlePlayerPointerDown} onFocus={noteActivity}>
      <div className="ixs-video-frame">
        <video
          ref={videoRef}
          key={src}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          playsInline
          preload="auto"
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onDurationChange={(event) => setDuration(event.currentTarget.duration)}
          onPlay={() => { setPlaying(true); setError(false); }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setError(true)}
          onClick={toggleControlsFromVideo}
          aria-label={title}
        />
        {!playing && !error && <button className="ixs-video-center-play" onClick={() => void togglePlayback()} aria-label={`Play ${title}`}><Play size={28} fill="currentColor" /></button>}
        {fullscreenBlocked && autoFullscreen && <button className="ixs-fullscreen-prompt" onClick={() => void toggleFullscreen()}><Maximize size={16} /> Tap to enter fullscreen</button>}
        {error && <div className="ixs-video-error">This preview could not load. Try another title.</div>}
      </div>
      <div className="ixs-video-controls">
        <input className="ixs-video-seek" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => {
          const nextTime = Number(event.target.value);
          setCurrentTime(nextTime);
          if (videoRef.current) videoRef.current.currentTime = nextTime;
        }} aria-label="Seek video" style={{ '--ixs-seek-progress': `${duration ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties} />
        <div className="ixs-video-control-row">
          <div className="ixs-video-control-group">
            <button onClick={() => void togglePlayback()} aria-label={playing ? 'Pause video' : 'Play video'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
            <button onClick={() => seekBy(-10)} aria-label="Back 10 seconds"><Rewind size={17} /><small>10</small></button>
            <button onClick={() => seekBy(10)} aria-label="Forward 10 seconds"><FastForward size={17} /><small>10</small></button>
            <button onClick={() => setVolume((current) => current === 0 ? 0.85 : 0)} aria-label={volume === 0 ? 'Unmute' : 'Mute'}>{volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
            <input className="ixs-volume-slider" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" />
            <span className="ixs-video-time">{formatTime(currentTime)} <i>/</i> {formatTime(duration)}</span>
          </div>
          <div className="ixs-video-control-group">
            <div className="ixs-video-settings-wrap">
              <button onClick={() => setSettingsOpen((open) => !open)} aria-label="Playback settings" aria-expanded={settingsOpen}><Settings size={18} /></button>
              {settingsOpen && <div className="ixs-video-settings" role="menu" aria-label="Playback speed">
                <strong>Playback speed</strong>
                {SPEEDS.map((option) => <button key={option} role="menuitemradio" aria-checked={speed === option} className={speed === option ? 'is-selected' : ''} onClick={() => chooseSpeed(option)}>{option === 1 ? 'Normal' : `${option}×`}</button>)}
              </div>}
            </div>
            <button onClick={() => void togglePictureInPicture()} aria-label="Picture in picture" title="Picture in picture"><PictureInPicture size={18} /></button>
            <button onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export default IxStreamVideoPlayer;