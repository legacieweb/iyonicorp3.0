import { resolveAssetUrl, activeLyricIndex } from '../utils';
import type { Track } from '../types';

interface Props {
  track: Track;
  currentTime: number;
  onBack: () => void;
  onShowLyrics: () => void;
}

export const NLMTrackDetail = ({
  track,
  currentTime,
  onBack,
  onShowLyrics,
}: Props) => (
  <section className="nlm-detail-page" aria-labelledby="nlm-details-title">
    <button className="nlm-detail-back" onClick={onBack}>
      Back to discovery
    </button>

    <div className="nlm-details-shell">
      <TrackArtwork track={track} />

      <div className="nlm-details-meta">
        <span className="nlm-eyebrow">NLM SONGS / TRACK DETAILS</span>
        <h2 id="nlm-details-title">{track.title}</h2>
        <p id="nlm-details-artist" className="nlm-details-artist">{track.artist}</p>
        {track.description && (
          <p className="nlm-details-description">{track.description}</p>
        )}
        {track.tags.length > 0 && (
          <div className="nlm-details-tags">
            {track.tags.map((tag) => (
              <span key={tag} className="nlm-details-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <DetailLyrics track={track} currentTime={currentTime} onShowLyrics={onShowLyrics} />
    </div>
  </section>
);

const TrackArtwork = ({ track }: { track: Track }) => (
  <div className="nlm-details-art-wrap">
    <div className="nlm-details-art">
      {track.coverUrl ? (
        <img src={resolveAssetUrl(track.coverUrl)} alt={track.title} />
      ) : (
        <div className="nlm-details-art-fallback" />
      )}
    </div>
    {track.genre && <span className="nlm-details-genre">{track.genre}</span>}
  </div>
);

const DetailLyrics = ({ track, currentTime, onShowLyrics }: {
  track: Track;
  currentTime: number;
  onShowLyrics: () => void;
}) => {
  const hasLyrics = track.lyrics.length > 0;
  const highlightedIndex = activeLyricIndex(track.lyrics, currentTime);

  return (
    <div className="nlm-details-lyrics">
      <h3>Lyrics</h3>
      {hasLyrics ? (
        <div className={`nlm-lyric-lines ${track.syncLyrics ? 'is-synced' : 'is-plain'}`}>
          {track.lyrics.map((line, index) => (
            <p
              key={`${line.time ?? 'plain'}-${index}`}
              className={track.syncLyrics ? (index === highlightedIndex ? 'is-current' : index < highlightedIndex ? 'is-past' : '') : ''}
            >
              {line.text}
            </p>
          ))}
        </div>
      ) : (
        <p className="nlm-detail-no-lyrics">Lyrics have not been added for this track yet.</p>
      )}
    </div>
  );
};

export default NLMTrackDetail;
