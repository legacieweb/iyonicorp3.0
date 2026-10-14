import { Heart, Music2, Pause, Play } from 'lucide-react';
import type { Track } from '../types';
import { resolveAssetUrl } from '../utils';

interface Props {
  title: string;
  eyebrow: string;
  tracks: Track[];
  note?: string;
  selectedId: string | null;
  isPlaying: boolean;
  hasUser: boolean;
  favorites: string[];
  onSelect: (track: Track) => void;
  onFavorite: (track: Track) => void;
}

export default function NLMDiscoveryShelf({ title, eyebrow, tracks, note, selectedId, isPlaying, hasUser, favorites, onSelect, onFavorite }: Props) {
  if (!tracks.length && !note) return null;
  return <section className="nlm-discovery-shelf" aria-label={title}>
    <header className="nlm-discovery-shelf-heading"><div><span className="nlm-eyebrow">{eyebrow}</span><h3>{title}</h3></div><span>{tracks.length ? `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}` : ''}</span></header>
    {note && <p className="nlm-discovery-shelf-note">{note}</p>}
    {tracks.length > 0 && <div className="nlm-discovery-shelf-list">{tracks.map((track, index) => {
      const isCurrent = selectedId === track.id;
      const isFavorite = favorites.includes(track.id);
      return <article className={`nlm-discovery-tile ${isCurrent ? 'is-selected' : ''}`} key={track.id}>
        <button className="nlm-discovery-tile-play" type="button" onClick={() => onSelect(track)} aria-label={`${isCurrent && isPlaying ? 'Pause' : 'Play'} ${track.title} by ${track.artist}`}>
          <span className="nlm-discovery-tile-art">{track.coverUrl ? <img src={resolveAssetUrl(track.coverUrl)} alt="" loading="lazy" /> : <Music2 size={20} />}</span>
          <span className="nlm-discovery-tile-copy"><small>{String(index + 1).padStart(2, '0')} · {track.genre || 'NLM Songs'}</small><strong>{track.title}</strong><span>{track.artist}</span></span>
          <span className="nlm-discovery-tile-action" aria-hidden="true">{isCurrent && isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</span>
        </button>
        {hasUser && <button className={`nlm-discovery-favorite ${isFavorite ? 'is-fav' : ''}`} type="button" onClick={() => onFavorite(track)} aria-label={isFavorite ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`} aria-pressed={isFavorite}><Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} /></button>}
      </article>;
    })}</div>}
  </section>;
}
