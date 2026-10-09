import type { Track } from '../types';

interface Props {
  tracks: Track[];
  activeGenre: string;
  onSelect: (genre: string) => void;
  labelClassName?: string;
}

export const NLMGenreChips = ({ tracks, activeGenre, onSelect, labelClassName = 'FIND YOUR FREQUENCY' }: Props) => {
  const genres = Array.from(
    new Set(tracks.map((track) => track.genre.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <section className="nlm-discovery-section" aria-label="Browse by genre">
      <div className="nlm-discovery-heading">
        <span className="nlm-eyebrow">{labelClassName}</span>
        <h2>Browse by sound</h2>
      </div>
      <div className="nlm-genre-chips">
        <button
          className={!activeGenre ? 'is-active' : ''}
          onClick={() => onSelect('')}
          aria-pressed={!activeGenre}
        >
          All sounds
        </button>
        {genres.map((genre) => (
          <button
            key={genre}
            className={activeGenre === genre ? 'is-active' : ''}
            onClick={() => onSelect(activeGenre === genre ? '' : genre)}
            aria-pressed={activeGenre === genre}
          >
            {genre}
          </button>
        ))}
      </div>
    </section>
  );
};

export default NLMGenreChips;
