import { FileAudio2, Heart, Loader2, Plus } from 'lucide-react';
import { NLMSearchBar, NLMSectionHead, NLMTrackRow } from './index';
import type { Track } from '../types';

interface Props {
  tracks: Track[];
  isLoading: boolean;
  error: string;
  search: string;
  sortOrder: 'recent' | 'title' | 'artist';
  showFavoritesOnly: boolean;
  hasUser: boolean;
  isAdminMode: boolean;
  selectedId: string | null;
  isPlaying: boolean;
  favorites: string[];
  isPersonalLibrary: boolean;
  onSearch: (value: string) => void;
  onSortChange: (order: 'recent' | 'title' | 'artist') => void;
  onToggleFavorites: () => void;
  onTrackSelect: (track: Track) => void;
  onFavorite: (track: Track) => void;
  onLyrics: (track: Track) => void;
  onQueue: (track: Track) => void;
  onRemove: (track: Track) => void;
  onRetry: () => void;
  onUpload: () => void;
  onBrowse: () => void;
  sectionEyebrow: string;
  sectionTitle: string;
}

export const NLMLibraryArea = ({
  tracks,
  isLoading,
  error,
  search,
  sortOrder,
  showFavoritesOnly,
  hasUser,
  isAdminMode,
  selectedId,
  isPlaying,
  favorites,
  isPersonalLibrary,
  onSearch,
  onSortChange,
  onToggleFavorites,
  onTrackSelect,
  onFavorite,
  onLyrics,
  onQueue,
  onRemove,
  onRetry,
  onUpload,
  onBrowse,
  sectionEyebrow,
  sectionTitle,
}: Props) => (
  <section className={`nlm-track-section ${isPersonalLibrary ? 'is-personal-library' : ''}`} aria-label={isPersonalLibrary ? 'Your saved NLM Songs' : 'NLM Songs catalogue'}>
    <NLMSectionHead
      eyebrow={sectionEyebrow}
      title={sectionTitle}
      count={tracks.length}
    />

    <div className="nlm-library-toolbar">
      {!isPersonalLibrary && hasUser && (
        <button
          className={`nlm-favorites-toggle ${showFavoritesOnly ? 'is-active' : ''}`}
          onClick={onToggleFavorites}
          aria-pressed={showFavoritesOnly}
        >
          <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
          <span>{showFavoritesOnly ? 'All tracks' : 'Favorites only'}</span>
        </button>
      )}
      <label className="nlm-sort-control">
        SORT BY
        <select
          value={sortOrder}
          onChange={(event) => onSortChange(event.target.value as typeof sortOrder)}
        >
          <option value="recent">Recently added</option>
          <option value="title">Title</option>
          <option value="artist">Artist</option>
        </select>
      </label>
      <NLMSearchBar
        value={search}
        onChange={onSearch}
        placeholder={isPersonalLibrary ? 'Search your saved tracks' : 'Search tracks, artists, genres, or moods'}
        ariaLabel={isPersonalLibrary ? 'Search your saved tracks' : 'Search the NLM Songs catalogue'}
      />
    </div>

    {isLoading ? (
      <LoadingState />
    ) : error ? (
      <ErrorState message={error} onRetry={onRetry} />
    ) : tracks.length ? (
      <div className="nlm-track-list">
        <div className="nlm-track-columns">
          <span>TRACK</span>
          <span>ARTIST</span>
          <span>ACTIONS</span>
        </div>
        {tracks.map((track, index) => (
          <NLMTrackRow
            key={track.id}
            track={track}
            index={index}
            isSelected={selectedId === track.id}
            isPlaying={isPlaying}
            isAdminMode={isAdminMode}
            hasUser={hasUser}
            isFavorite={favorites.includes(track.id)}
            onSelect={() => onTrackSelect(track)}
            onFavorite={() => onFavorite(track)}
            onLyrics={() => onLyrics(track)}
            onQueue={() => onQueue(track)}
            onRemove={() => onRemove(track)}
          />
        ))}
      </div>
    ) : (
      <EmptyState
        search={search}
        isAdminMode={isAdminMode}
        isPersonalLibrary={isPersonalLibrary}
        showFavoritesOnly={showFavoritesOnly}
        onUpload={onUpload}
        onBrowse={onBrowse}
        onClearFavorites={onToggleFavorites}
      />
    )}
  </section>
);

const LoadingState = () => (
  <div className="nlm-empty-library" role="status">
    <span className="nlm-empty-icon">
      <Loader2 size={21} className="nlm-spinner" />
    </span>
    <div>
      <h3>Opening the listening room…</h3>
      <p>Loading the published tracks from the catalogue.</p>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="nlm-empty-library" role="alert">
    <span className="nlm-empty-icon"><FileAudio2 size={21} /></span>
    <div>
      <h3>Couldn’t load the catalogue.</h3>
      <p>{message}</p>
    </div>
    <button onClick={() => void onRetry()}>Try again</button>
  </div>
);

const EmptyState = ({ search, isAdminMode, isPersonalLibrary, showFavoritesOnly, onUpload, onBrowse, onClearFavorites }: {
  search: string;
  isAdminMode: boolean;
  isPersonalLibrary: boolean;
  showFavoritesOnly: boolean;
  onUpload: () => void;
  onBrowse: () => void;
  onClearFavorites: () => void;
}) => (
  <div className="nlm-empty-library">
    <span className="nlm-empty-icon"><FileAudio2 size={23} /></span>
    <div>
      <h3>
        {search
          ? 'No tracks match those filters.'
          : isPersonalLibrary
            ? 'Your library is ready for a first save.'
            : showFavoritesOnly
              ? 'No favorites saved yet.'
          : isAdminMode
            ? 'Nothing in the room yet.'
            : 'No songs are live yet.'}
      </h3>
      <p>
        {search
          ? 'Try another search, choose a different sound, or clear the current filter.'
          : isPersonalLibrary
            ? 'Save tracks from the catalogue and they will be collected here for your next visit.'
            : showFavoritesOnly
              ? 'Favorite a track to keep it close, or return to the full catalogue.'
          : isAdminMode
            ? 'Add an audio file from your device to start a library. Your files will be stored in the platform catalogue.'
            : 'The public library will appear here once the admin publishes tracks.'}
      </p>
    </div>
    {!search && isPersonalLibrary && <button onClick={onBrowse}>Browse catalogue</button>}
    {!search && showFavoritesOnly && !isPersonalLibrary && <button onClick={onClearFavorites}>Show all tracks</button>}
    {isAdminMode && (
      <button onClick={onUpload}>
        <Plus size={15} /> Add a track
      </button>
    )}
  </div>
);

export default NLMLibraryArea;
