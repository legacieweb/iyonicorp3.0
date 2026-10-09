import { Disc3, Music2, X } from 'lucide-react';
import { resolveAssetUrl } from '../utils';
import { formatTime } from '../utils';
import type { LyricLine, Track } from '../types';
import { activeLyricIndex } from '../utils';

interface Props {
  track: Track | null;
  isOpen: boolean;
  isPlaying: boolean;
  currentTime: number;
  onClose: () => void;
}

export const NLMLyricsOverlay = ({ track, isOpen, isPlaying, currentTime, onClose }: Props) => {
  if (!track || !isOpen) return null;

  const highlightedIndex = activeLyricIndex(track.lyrics, currentTime);
  const hasLyrics = track.lyrics.length > 0;

  return (
    <div
      className="nlm-lyrics-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="nlm-lyrics-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nlm-lyrics-title"
        aria-describedby="nlm-lyrics-artist"
      >
        <div className="nlm-lyrics-artwork">
          {track.coverUrl ? (
            <img
              className="nlm-lyrics-artwork-image"
              src={resolveAssetUrl(track.coverUrl)}
              alt=""
            />
          ) : (
            <div className="nlm-lyrics-artwork-fallback" />
          )}
          <span className="nlm-lyrics-artwork-label">
            <i /> NOW PLAYING
          </span>
          <div className="nlm-lyrics-artwork-caption">
            <span>NLM SONGS / LYRICS</span>
            <strong>{track.title}</strong>
          </div>
        </div>

        <div className="nlm-lyrics-panel">
          <div className="nlm-lyrics-top">
            <span className="nlm-eyebrow">
              {track.syncLyrics ? 'SYNCED TO THE MUSIC' : 'THE WORDS, UNFILTERED'}
            </span>
            <button
              className="nlm-lyrics-close"
              onClick={onClose}
              aria-label="Close lyrics"
            >
              <X size={18} />
            </button>
          </div>

          <div className="nlm-lyrics-heading">
            <span className="nlm-lyrics-live">
              <i /> {track.syncLyrics ? (isPlaying ? 'LIVE SYNC' : 'SYNCED') : 'PLAIN LYRICS'}
            </span>
            <h2 id="nlm-lyrics-title">
              {track.title}<br /><i>lyrics</i>
            </h2>
            <p id="nlm-lyrics-artist">{track.artist}</p>
          </div>

          {hasLyrics ? (
            <div
              className={`nlm-lyric-lines ${track.syncLyrics ? 'is-synced' : 'is-plain'}`}
              aria-live="polite"
              aria-relevant="text"
            >
              {track.lyrics.map((line, index) => (
                <LyricLine
                  key={`${line.time ?? 'plain'}-${index}`}
                  line={line}
                  index={index}
                  isActive={index === highlightedIndex}
                  isPast={index < highlightedIndex}
                  isSynced={track.syncLyrics}
                />
              ))}
            </div>
          ) : (
            <NoLyricsMessage />
          )}

          <div className="nlm-lyrics-track">
            <span className="nlm-lyrics-track-cover">
              {track.coverUrl ? (
                <img src={resolveAssetUrl(track.coverUrl)} alt="" />
              ) : (
                <Music2 size={17} />
              )}
            </span>
            <span className="nlm-lyrics-track-meta">
              <strong>{track.title}</strong>
              <small>{track.artist}</small>
            </span>
            <span className="nlm-lyrics-track-index">NLM / LYRICS</span>
          </div>
        </div>
      </section>
    </div>
  );
};

interface LyricLineProps {
  line: { time: number | null; text: string };
  index: number;
  isActive: boolean;
  isPast: boolean;
  isSynced: boolean;
}

const LyricLine = ({ line, isActive, isPast, isSynced }: LyricLineProps) => {
  const lineClass = isSynced
    ? isActive
      ? 'is-current'
      : isPast
        ? 'is-past'
        : ''
    : '';

  return (
    <p className={lineClass}>{line.text}</p>
  );
};

const NoLyricsMessage = () => (
  <div className="nlm-no-lyrics">
    <span className="nlm-no-lyrics-mark">"</span>
    <p>No lyrics for this track yet.</p>
    <span>Words added by the artist will appear here.</span>
  </div>
);

export default NLMLyricsOverlay;
