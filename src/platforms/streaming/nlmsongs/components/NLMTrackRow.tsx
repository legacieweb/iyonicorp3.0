import { Captions, Heart, List, Music2, Pause, Play, Trash2 } from 'lucide-react';
import { resolveAssetUrl } from '../utils';
import type { Track } from '../types';

interface Props {
  track: Track;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  isAdminMode: boolean;
  hasUser: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onLyrics: () => void;
  onQueue: () => void;
  onRemove: () => void;
}

export const NLMTrackRow = ({
  track,
  index,
  isSelected,
  isPlaying,
  isAdminMode,
  hasUser,
  isFavorite,
  onSelect,
  onFavorite,
  onLyrics,
  onQueue,
  onRemove,
}: Props) => (
  <article className={`nlm-track-row ${isSelected ? 'is-selected' : ''}`}>
    <button
      className="nlm-track-select"
      onClick={onSelect}
      aria-label={`Play ${track.title} by ${track.artist}`}
    >
      <span className="nlm-track-number">
        {isSelected && isPlaying ? (
          <span className="nlm-equalizer"><i /><i /><i /></span>
        ) : (
          String(index + 1).padStart(2, '0')
        )}
      </span>
      <span className="nlm-mini-cover">
        {track.coverUrl ? (
          <img src={resolveAssetUrl(track.coverUrl)} alt="" />
        ) : (
          <Music2 size={18} />
        )}
      </span>
      <span className="nlm-track-title">
        <strong>{track.title}</strong>
        <small>
          {track.genre || (track.lyrics.length ? `${track.lyrics.length} lyric lines` : 'No genre listed')}
        </small>
      </span>
    </button>

    <span className="nlm-track-artist">{track.artist}</span>

    <span className="nlm-track-actions">
      {hasUser && (
        <button
          className={`nlm-row-favorite ${isFavorite ? 'is-fav' : ''}`}
          onClick={onFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={12} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}
      <button
        className="nlm-row-play"
        onClick={onSelect}
        aria-label={`${isSelected && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
      >
        {isSelected && isPlaying ? (
          <Pause size={15} />
        ) : (
          <Play size={15} fill="currentColor" />
        )}
      </button>
      <button
        className="nlm-row-lyrics"
        onClick={onLyrics}
        aria-label={`Show lyrics for ${track.title}`}
        title={`Lyrics for ${track.title}`}
      >
        <Captions size={16} />
      </button>
      {!isAdminMode && (
        <button
          className="nlm-row-queue"
          onClick={onQueue}
          aria-label={`Add ${track.title} to queue`}
          title="Add to queue"
        >
          <List size={16} />
        </button>
      )}
      {isAdminMode && (
        <button
          className="nlm-remove-track"
          onClick={onRemove}
          aria-label={`Remove ${track.title}`}
          title="Remove track"
        >
          <Trash2 size={15} />
        </button>
      )}
    </span>
  </article>
);

export default NLMTrackRow;
