import { ArrowLeft, Music2 } from 'lucide-react';
import { resolveAssetUrl, activeLyricIndex } from '../utils';
import type { Track } from '../types';

interface Props {
  track: Track;
  currentTime: number;
  onBack: () => void;
}

export const NLMTrackDetail = ({ track, currentTime, onBack }: Props) => {
  const tags = Array.isArray(track.tags) ? track.tags.filter(Boolean) : [];

  return (
    <main className="nlm-detail-page" aria-labelledby="nlm-details-title">
      {track.coverUrl ? (
        <img className="nlm-details-page-art" src={resolveAssetUrl(track.coverUrl)} alt="" aria-hidden="true" />
      ) : (
        <div className="nlm-details-page-art-fallback" aria-hidden="true"><Music2 size={56} /></div>
      )}
      <button className="nlm-detail-back" onClick={onBack} type="button">
        <ArrowLeft aria-hidden="true" size={15} />
        <span>Back to discovery</span>
      </button>

      <article className="nlm-details-shell">
        <section className="nlm-details-hero" aria-label="Track overview">
          <div className="nlm-details-meta">
            <div className="nlm-details-kicker">
              <span className="nlm-eyebrow">NLM SONGS</span>
              <span className="nlm-details-kicker-divider" aria-hidden="true" />
              <span className="nlm-details-kicker-label">Track details</span>
            </div>
            {track.genre && <span className="nlm-details-genre">{track.genre}</span>}
            <h1 id="nlm-details-title">{track.title}</h1>
            <p id="nlm-details-artist" className="nlm-details-artist">{track.artist}</p>
            {track.description && <p className="nlm-details-description">{track.description}</p>}
            {tags.length > 0 && (
              <ul className="nlm-details-tags" aria-label="Track tags">
                {tags.map((tag) => <li key={tag} className="nlm-details-tag">{tag}</li>)}
              </ul>
            )}
            <span className="nlm-details-art-caption"><i aria-hidden="true" />Independent sound, discovered here</span>
          </div>
        </section>

        <DetailLyrics track={track} currentTime={currentTime} />
      </article>
    </main>
  );
};

const DetailLyrics = ({ track, currentTime }: {
  track: Track;
  currentTime: number;
}) => {
  const hasLyrics = track.lyrics.length > 0;
  const highlightedIndex = activeLyricIndex(track.lyrics, currentTime);

  return (
    <section className="nlm-details-lyrics" aria-label="Song lyrics">
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
    </section>
  );
};

export default NLMTrackDetail;
