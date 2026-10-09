import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Check, Loader2, Plus, X } from 'lucide-react';
import { playlistsAPI } from '../../../../services/api';
import type { NLMPlaylist } from '../types';

interface Props {
  isOpen: boolean;
  hasUser: boolean;
  trackId: string | null;
  onClose: () => void;
  onSignIn: () => void;
}

type Feedback = { kind: 'success' | 'error'; text: string };

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
};

export const NLMPlaylistModal = ({
  isOpen,
  hasUser,
  trackId,
  onClose,
  onSignIn,
}: Props) => {
  const [playlists, setPlaylists] = useState<NLMPlaylist[]>([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyPlaylistId, setBusyPlaylistId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadPlaylists = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setPlaylists(await playlistsAPI.getAll());
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Your playlists could not be loaded. Try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !hasUser) return;
    setFeedback(null);
    void loadPlaylists();
  }, [isOpen, hasUser]);

  const handleAdd = async (playlist: NLMPlaylist) => {
    if (!trackId || busyPlaylistId || isCreating) return;
    setBusyPlaylistId(playlist.id);
    setFeedback(null);
    try {
      await playlistsAPI.addTrack(playlist.id, trackId);
      setPlaylists((current) => current.map((item) => item.id === playlist.id
        ? { ...item, trackCount: item.trackCount + 1 }
        : item));
      setFeedback({ kind: 'success', text: `Added the current track to “${playlist.name}”.` });
    } catch (error) {
      setFeedback({ kind: 'error', text: getErrorMessage(error, 'The track could not be added. Try again.') });
    } finally {
      setBusyPlaylistId(null);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || isCreating || busyPlaylistId) return;
    setIsCreating(true);
    setFeedback(null);
    let createdPlaylist: NLMPlaylist | null = null;
    try {
      createdPlaylist = await playlistsAPI.create({ name, description: '' });
      setPlaylists((current) => [createdPlaylist as NLMPlaylist, ...current.filter((item) => item.id !== createdPlaylist?.id)]);
      setNewName('');

      if (trackId) {
        await playlistsAPI.addTrack(createdPlaylist.id, trackId);
        createdPlaylist = { ...createdPlaylist, trackCount: createdPlaylist.trackCount + 1 };
        setPlaylists((current) => current.map((item) => item.id === createdPlaylist?.id ? createdPlaylist as NLMPlaylist : item));
        setFeedback({ kind: 'success', text: `Created “${name}” and added the current track.` });
      } else {
        setFeedback({ kind: 'success', text: `Created “${name}”.` });
      }
    } catch (error) {
      const detail = getErrorMessage(error, 'Please try again.');
      setFeedback({
        kind: 'error',
        text: createdPlaylist
          ? `Playlist created, but the current track could not be added. ${detail}`
          : `The playlist could not be created. ${detail}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="nlm-playlist-overlay" onMouseDown={onClose}>
      <aside
        className="nlm-playlist-modal"
        onMouseDown={(event) => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
        aria-labelledby="nlm-playlist-title"
        aria-busy={isLoading || isCreating || Boolean(busyPlaylistId)}
      >
        <div className="nlm-playlist-modal-head">
          <div>
            <span className="nlm-eyebrow">YOUR COLLECTIONS</span>
            <h3 id="nlm-playlist-title">Add to playlist</h3>
          </div>
          <button className="nlm-playlist-close" onClick={onClose} aria-label="Close playlists">
            <X size={16} />
          </button>
        </div>

        {!hasUser ? (
          <div className="nlm-playlist-empty">
            <p>Sign in to create and manage playlists.</p>
            <button className="nlm-submit-button" onClick={onSignIn}>Sign in</button>
          </div>
        ) : (
          <>
            {feedback && (
              <p className={`nlm-playlist-feedback is-${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
                {feedback.kind === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
                <span>{feedback.text}</span>
              </p>
            )}

            {isLoading ? (
              <div className="nlm-playlist-loading" role="status"><Loader2 size={17} className="nlm-spinner" /> Loading your playlists…</div>
            ) : loadError ? (
              <div className="nlm-playlist-load-error" role="alert"><span>{loadError}</span><button onClick={() => void loadPlaylists()}>Try again</button></div>
            ) : playlists.length ? (
              <div className="nlm-playlist-list" aria-label="Your playlists">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="nlm-playlist-item">
                    <button
                      className="nlm-playlist-add"
                      onClick={() => void handleAdd(playlist)}
                      disabled={!trackId || isCreating || Boolean(busyPlaylistId)}
                      aria-label={`Add current track to ${playlist.name}`}
                      title={`Add to ${playlist.name}`}
                    >
                      {busyPlaylistId === playlist.id ? <Loader2 size={15} className="nlm-spinner" /> : <Plus size={15} />}
                    </button>
                    <span className="nlm-playlist-name">{playlist.name}</span>
                    <small className="nlm-playlist-count">{playlist.trackCount} tracks</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="nlm-playlist-no-lists">No playlists yet. Create one below{trackId ? ' and this track will be added' : ''}.</p>
            )}

            <form className="nlm-playlist-create-form" onSubmit={handleCreate}>
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="New playlist name"
                aria-label="New playlist name"
                maxLength={100}
                required
                disabled={isCreating || Boolean(busyPlaylistId)}
              />
              <button className="nlm-submit-button" type="submit" disabled={!newName.trim() || isCreating || Boolean(busyPlaylistId)}>
                {isCreating ? <><Loader2 size={14} className="nlm-spinner" /> {trackId ? 'Creating & adding…' : 'Creating…'}</> : <><Plus size={14} /> Create</>}
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
};

export default NLMPlaylistModal;
