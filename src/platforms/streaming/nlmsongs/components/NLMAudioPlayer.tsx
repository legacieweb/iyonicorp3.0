import {
  Download, Heart, List, Lock, Pause, Play, Repeat, Share2, Shuffle,
  SkipBack, SkipForward, Volume2, VolumeX,
} from 'lucide-react';
import type { RepeatMode, Track } from '../types';
import { formatTime, resolveAssetUrl } from '../utils';

interface Props {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  hasUser: boolean;
  isAdminMode: boolean;
  isFavorite: boolean;
  copied: boolean;
  onNowPlayingClick: () => void;
  onTogglePlayback: () => void;
  onPreviousTrack: () => void;
  onNextTrack: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (volume: number) => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
  onShare: () => void;
  onOpenPlaylist: () => void;
}

export const NLMAudioPlayer = ({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  shuffleMode,
  repeatMode,
  hasUser,
  isAdminMode,
  isFavorite,
  copied,
  onNowPlayingClick,
  onTogglePlayback,
  onPreviousTrack,
  onNextTrack,
  onToggleShuffle,
  onCycleRepeat,
  onSeek,
  onSetVolume,
  onToggleFavorite,
  onDownload,
  onShare,
  onOpenPlaylist,
}: Props) => (
  <footer className="nlm-player" aria-label="Audio player">
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
        className="nlm-player-action nlm-player-action-download"
        onClick={onDownload}
        disabled={!track}
        aria-label={hasUser ? `Download ${track?.title || 'track'}` : `Sign up to download ${track?.title || 'track'}`}
        title={hasUser ? 'Download track' : 'Sign up to download'}
      >
        {hasUser ? <Download size={15} /> : <Lock size={15} />}
        <span>Download</span>
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

export default NLMAudioPlayer;
