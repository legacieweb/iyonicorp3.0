import { Music2, Play } from 'lucide-react';
import { resolveAssetUrl } from '../utils';
import type { Track } from '../types';

interface Props {
  tracks: Track[];
  onSelect: (track: Track) => void;
  activeGenre?: string;
}

export const NLMFreshSection = ({ tracks, onSelect, activeGenre }: Props) => {
  const featured = [...tracks]
    .filter((track) => track.isActive)
    .sort((a, b) => (Date.parse(b.createdAt || b.updatedAt || '') || 0) - (Date.parse(a.createdAt || a.updatedAt || '') || 0))
    .slice(0, 4);

  return (
    <section className="nlm-fresh-section" aria-label="Fresh cuts">
      <div className="nlm-section-head">
        <div>
          <span className="nlm-eyebrow">JUST DROPPED</span>
          <h2>{activeGenre ? `Fresh in ${activeGenre}` : 'Fresh cuts'}</h2>
        </div>
        <span className="nlm-track-count">{activeGenre || 'LATEST RELEASE'}</span>
      </div>
      {featured.length ? <div className="nlm-fresh-list">
        {featured.map((track, index) => (
          <button
            key={track.id}
            className="nlm-fresh-card"
            onClick={() => onSelect(track)}
          >
            <span className="nlm-fresh-art">
              {track.coverUrl ? (
                <img src={resolveAssetUrl(track.coverUrl)} alt="" />
              ) : (
                <Music2 size={20} />
              )}
            </span>
            <span className="nlm-fresh-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="nlm-fresh-meta">
              <strong>{track.title}</strong>
              <small>
                {track.artist}
                {track.genre ? ` · ${track.genre}` : ''}
              </small>
            </span>
            <span className="nlm-fresh-play">
              <Play size={14} fill="currentColor" />
            </span>
          </button>
        ))}
      </div> : <p className="nlm-empty-state">{activeGenre ? `No active ${activeGenre} releases yet.` : 'No active releases yet.'}</p>}
    </section>
  );
};

export default NLMFreshSection;
