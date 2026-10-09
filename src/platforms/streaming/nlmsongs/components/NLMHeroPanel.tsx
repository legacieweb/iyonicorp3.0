import { Play } from 'lucide-react';
import type { Track } from '../types';
import { resolveAssetUrl } from '../utils';

interface Props {
  featuredTrack: Track | null;
  isAdminMode: boolean;
  onPlay: (track: Track) => void;
  onUpload: () => void;
}

export const NLMHeroPanel = ({ featuredTrack, isAdminMode, onPlay, onUpload }: Props) => {
  if (!featuredTrack) {
    return (
      <div className="nlm-hero-panel">
        <div className="nlm-hero-copy">
          <span className="nlm-eyebrow">NOW PLAYING</span>
          <h2>Build your catalog</h2>
          <p>Publish songs, curate playlists, and shape a premium listening experience.</p>
          <div className="nlm-hero-actions">
            <button className="nlm-submit-button" onClick={onUpload}>
              Explore catalog
            </button>
          </div>
        </div>
        <div className="nlm-hero-art" />
      </div>
    );
  }

  return (
    <div className="nlm-hero-panel">
      <div className="nlm-hero-copy">
        <span className="nlm-eyebrow">NOW PLAYING</span>
        <h2>{featuredTrack.title}</h2>
        <p>{`${featuredTrack.artist} · ${featuredTrack.genre || 'Featured release'}`}</p>
        <div className="nlm-hero-actions">
          <button
            className="nlm-submit-button"
            onClick={() => onPlay(featuredTrack)}
          >
            <Play size={14} fill="currentColor" /> Play track
          </button>
          {isAdminMode && (
            <button className="nlm-ghost-button" onClick={onUpload}>
              Upload new song
            </button>
          )}
        </div>
      </div>
      <div className="nlm-hero-art">
        {featuredTrack.coverUrl ? (
          <img src={resolveAssetUrl(featuredTrack.coverUrl)} alt={featuredTrack.title} />
        ) : (
          <div className="nlm-hero-art-fallback" />
        )}
      </div>
    </div>
  );
};

export default NLMHeroPanel;
