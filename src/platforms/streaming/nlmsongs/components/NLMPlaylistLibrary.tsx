import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, Copy, ListMusic, LockKeyhole, Music2, Play, Plus, Share2, Trash2,
} from 'lucide-react';
import { nlmsongsAPI, playlistsAPI, type NLMSong, type NLMPlaylist, type NLMPlaylistDetail } from '../../../../services/api';
import { resolveAssetUrl } from '../utils';

const shareUrl = (id: string) => `${window.location.origin}${window.location.pathname}#/nlmsongs/playlist/${encodeURIComponent(id)}`;
const errorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  return fallback;
};

export default function NLMPlaylistLibrary() {
  const [playlists, setPlaylists] = useState<NLMPlaylist[]>([]);
  const [catalogue, setCatalogue] = useState<NLMSong[]>([]);
  const [detail, setDetail] = useState<NLMPlaylistDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [catalogueError, setCatalogueError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [playBusy, setPlayBusy] = useState(false);
  const [detailReload, setDetailReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setCatalogueError('');
    const [playlistResult, catalogueResult] = await Promise.allSettled([playlistsAPI.getAll(), nlmsongsAPI.list()]);
    if (playlistResult.status === 'fulfilled') setPlaylists(playlistResult.value);
    else setError(errorMessage(playlistResult.reason, 'Your playlists could not be loaded. Please sign in and try again.'));
    if (catalogueResult.status === 'fulfilled') setCatalogue(catalogueResult.value.filter((track) => track.isActive !== false));
    else setCatalogueError(errorMessage(catalogueResult.reason, 'The catalogue could not be loaded. You can still manage existing tracks.'));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setError('');
    playlistsAPI.getById(selectedId)
      .then((value) => {
        if (!active) return;
        setDetail(value);
        setEditName(value.name);
        setEditDescription(value.description || '');
        setPlaylists((current) => current.map((playlist) => playlist.id === value.id ? { ...playlist, ...value } : playlist));
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason, 'This playlist could not be opened. Check that you are signed in as its owner.'));
      })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailReload]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await playlistsAPI.create({ name: name.trim(), description: description.trim() });
      setPlaylists((items) => [created, ...items]);
      setName('');
      setDescription('');
      setSelectedId(created.id);
      setNotice('Playlist created. Add tracks from the catalogue below.');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not create your playlist. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || !editName.trim() || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await playlistsAPI.update(detail.id, { name: editName.trim(), description: editDescription.trim() });
      setDetail((current) => current ? { ...current, ...updated } : current);
      setPlaylists((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setNotice('Playlist details saved.');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not save playlist details. Your edits are still here; try again.'));
    } finally {
      setSaving(false);
    }
  };

  const togglePublic = async (playlist: NLMPlaylist) => {
    setBusyAction(`visibility:${playlist.id}`);
    setError('');
    setNotice('');
    try {
      const updated = await playlistsAPI.update(playlist.id, { isPublic: !playlist.isPublic });
      setPlaylists((items) => items.map((item) => item.id === playlist.id ? updated : item));
      setDetail((current) => current?.id === playlist.id ? { ...current, ...updated } : current);
      setNotice(updated.isPublic ? 'Playlist is public and ready to share.' : 'Playlist is private again.');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not update playlist visibility. Please try again.'));
    } finally {
      setBusyAction('');
    }
  };

  const deletePlaylist = async (playlist: NLMPlaylist) => {
    if (!window.confirm(`Delete “${playlist.name}” and remove its playlist contents? This cannot be undone.`)) return;
    setBusyAction(`delete:${playlist.id}`);
    setError('');
    setNotice('');
    try {
      await playlistsAPI.delete(playlist.id);
      setPlaylists((items) => items.filter((item) => item.id !== playlist.id));
      if (selectedId === playlist.id) setSelectedId(null);
      setNotice(`“${playlist.name}” was deleted.`);
    } catch (reason) {
      setError(errorMessage(reason, 'Could not delete this playlist. Please try again.'));
    } finally {
      setBusyAction('');
    }
  };

  const copyLink = async (playlist: NLMPlaylist) => {
    try {
      await navigator.clipboard.writeText(shareUrl(playlist.id));
      setError('');
      setNotice('Public playlist link copied.');
    } catch {
      setError('Could not copy the link. Copy it from your browser address bar.');
    }
  };

  const playPlaylist = async (playlist: NLMPlaylist) => {
    setPlayBusy(true);
    setError('');
    setNotice('');
    try {
      const full = detail?.id === playlist.id ? detail : await playlistsAPI.getById(playlist.id);
      const trackIds = full.items.map((item) => item.trackId);
      if (!trackIds.length) {
        setNotice('Add a song to this playlist before playing it.');
        return;
      }
      window.dispatchEvent(new CustomEvent('nlm:play-playlist', { detail: { trackIds } }));
      setNotice(`Playing ${playlist.name}.`);
    } catch (reason) {
      setError(errorMessage(reason, 'Could not open this playlist. Check that you are signed in as its owner.'));
    } finally {
      setPlayBusy(false);
    }
  };

  const mutateTracks = async (action: string, request: () => Promise<unknown>, success: string) => {
    if (!detail || busyAction) return;
    setBusyAction(action);
    setError('');
    setNotice('');
    try {
      await request();
      setNotice(success);
      setDetailReload((count) => count + 1);
      setPlaylists((items) => items.map((item) => item.id === detail.id
        ? { ...item, trackCount: action.startsWith('add:') ? item.trackCount + 1 : action.startsWith('remove:') ? Math.max(0, item.trackCount - 1) : item.trackCount, updatedAt: new Date().toISOString() }
        : item));
    } catch (reason) {
      setError(errorMessage(reason, 'That playlist change could not be saved. Please try again.'));
    } finally {
      setBusyAction('');
    }
  };

  const trackById = useMemo(() => new Map(catalogue.map((track) => [track.id, track])), [catalogue]);
  const orderedItems = detail?.items ?? [];
  const includedIds = new Set(orderedItems.map((item) => item.trackId));
  const availableTracks = catalogue.filter((track) => !includedIds.has(track.id)
    && (!catalogueSearch.trim() || [track.title, track.artist, track.genre].some((value) => value.toLowerCase().includes(catalogueSearch.trim().toLowerCase()))));

  const moveTrack = (index: number, direction: -1 | 1) => {
    if (!detail) return;
    const next = [...orderedItems];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void mutateTracks('reorder', () => playlistsAPI.reorder(detail.id, next.map((item) => item.trackId)), 'Track order saved.');
  };

  return <section className="nlm-playlists-page" aria-labelledby="nlm-playlists-title">
    <div className="nlm-playlist-heading">
      <div><span className="nlm-eyebrow">YOUR COLLECTION</span><h1 id="nlm-playlists-title">{selectedId ? 'Manage playlist' : 'My Playlists'}</h1>
        <p className="nlm-playlists-intro">{selectedId ? 'Shape the tracklist, update sharing, and keep the set in your own order.' : 'Collect tracks into personal sets. Public playlists can be shared with a private-safe listening link.'}</p></div>
      <span className="nlm-playlist-total"><strong>{playlists.length.toString().padStart(2, '0')}</strong> PLAYLISTS</span>
    </div>

    {!selectedId && <form className="nlm-playlist-create" onSubmit={create}>
      <div><label htmlFor="nlm-playlist-name">Playlist name</label><input id="nlm-playlist-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="A late-night mix" required disabled={saving} />
      <label htmlFor="nlm-playlist-description">Description <span>(optional)</span></label><input id="nlm-playlist-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} placeholder="Set the mood" disabled={saving} /></div>
      <button className="nlm-submit-button" type="submit" disabled={saving || !name.trim()}><Plus size={15} /> {saving ? 'Creating…' : 'Create playlist'}</button>
    </form>}

    {error && <p className="nlm-inline-error" role="alert">{error}</p>}{notice && <p className="nlm-inline-notice" role="status">{notice}</p>}

    {selectedId ? <div className="nlm-playlist-manage">
      <button className="nlm-playlist-back" onClick={() => { setSelectedId(null); setError(''); setNotice(''); }}><ArrowLeft size={15}/> All playlists</button>
      {detailLoading ? <p className="nlm-empty-state" role="status">Opening your playlist…</p> : detail ? <>
        <div className="nlm-playlist-manage-hero">
          <div className="nlm-playlist-manage-art">{detail.coverUrl ? <img src={resolveAssetUrl(detail.coverUrl)} alt=""/> : orderedItems.slice(0, 4).map((item, index) => {
            const track = trackById.get(item.trackId);
            return <span key={item.id} className={`nlm-playlist-art-cell art-${index}`}>{track?.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt=""/> : <Music2 size={18}/>}</span>;
          })}</div>
          <div className="nlm-playlist-manage-summary"><span className="nlm-eyebrow">PLAYLIST / OWNER VIEW</span><h2>{detail.name}</h2><p>{detail.description || 'Add a description to tell this set’s story.'}</p><span>{detail.trackCount} {detail.trackCount === 1 ? 'track' : 'tracks'} · {detail.isPublic ? 'Public' : 'Private'}</span>
            <div className="nlm-playlist-manage-actions"><button className="nlm-submit-button" onClick={() => void playPlaylist(detail)} disabled={playBusy || !detail.trackCount}><Play size={14} fill="currentColor"/>{playBusy ? 'Loading…' : 'Play set'}</button>
              <button className="nlm-ghost-button" onClick={() => void togglePublic(detail)} disabled={busyAction !== ''}><Share2 size={14}/>{detail.isPublic ? 'Make private' : 'Make public'}</button>
              {detail.isPublic && <button className="nlm-ghost-button" onClick={() => void copyLink(detail)}><Copy size={14}/>Copy link</button>}
            </div>
          </div>
        </div>
        <form className="nlm-playlist-edit-form" onSubmit={saveDetails}>
          <div><span className="nlm-eyebrow">PLAYLIST DETAILS</span><label htmlFor="nlm-edit-playlist-name">Name</label><input id="nlm-edit-playlist-name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={80} required disabled={saving}/>
            <label htmlFor="nlm-edit-playlist-description">Description</label><textarea id="nlm-edit-playlist-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={240} rows={3} disabled={saving}/></div>
          <div className="nlm-playlist-edit-actions"><button className="nlm-submit-button" type="submit" disabled={saving || !editName.trim()}>{saving ? 'Saving…' : <><Check size={14}/> Save details</>}</button>
            <button className="nlm-playlist-delete" type="button" onClick={() => void deletePlaylist(detail)} disabled={busyAction !== ''}><Trash2 size={14}/> Delete playlist</button></div>
        </form>
        <div className="nlm-playlist-track-manager">
          <div className="nlm-playlist-track-heading"><div><span className="nlm-eyebrow">THE SEQUENCE</span><h3>Tracks in this playlist</h3></div><span>{orderedItems.length.toString().padStart(2, '0')} TRACKS</span></div>
          {orderedItems.length ? <ol className="nlm-managed-track-list">{orderedItems.map((item, index) => {
            const track = trackById.get(item.trackId);
            return <li key={item.id} className="nlm-managed-track">
              <span className="nlm-managed-track-position">{String(index + 1).padStart(2, '0')}</span>
              <span className="nlm-managed-track-art">{track?.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt=""/> : <Music2 size={17}/>}</span>
              <span className="nlm-managed-track-copy"><strong>{track?.title || 'Track unavailable'}</strong><small>{track ? `${track.artist || 'Unknown artist'}${track.genre ? ` · ${track.genre}` : ''}` : 'This track is no longer in the available catalogue.'}</small></span>
              <div className="nlm-managed-track-actions">
                <button aria-label={`Move ${track?.title || 'track'} up`} title="Move up" onClick={() => moveTrack(index, -1)} disabled={index === 0 || Boolean(busyAction)}><ArrowUp size={15}/></button>
                <button aria-label={`Move ${track?.title || 'track'} down`} title="Move down" onClick={() => moveTrack(index, 1)} disabled={index === orderedItems.length - 1 || Boolean(busyAction)}><ArrowDown size={15}/></button>
                <button aria-label={`Remove ${track?.title || 'track'} from playlist`} title="Remove track" onClick={() => void mutateTracks(`remove:${item.trackId}`, () => playlistsAPI.removeTrack(detail.id, item.trackId), 'Track removed from playlist.')} disabled={Boolean(busyAction)}><Trash2 size={15}/></button>
              </div>
            </li>;
          })}</ol> : <div className="nlm-playlist-track-empty"><ListMusic size={22}/><strong>This set is waiting for its first track.</strong><span>Add a song from the catalogue to get started.</span></div>}
        </div>
        <div className="nlm-playlist-add-tracks">
          <div className="nlm-playlist-track-heading"><div><span className="nlm-eyebrow">AVAILABLE CATALOGUE</span><h3>Add tracks</h3></div><label className="nlm-playlist-catalogue-search"><span className="nlm-sr-only">Filter available tracks</span><input value={catalogueSearch} onChange={(event) => setCatalogueSearch(event.target.value)} placeholder="Filter tracks…" /></label></div>
          {catalogueError ? <p className="nlm-inline-error" role="alert">{catalogueError}</p> : availableTracks.length ? <div className="nlm-available-track-list">{availableTracks.map((track) => <article key={track.id}>
            <span className="nlm-managed-track-art">{track.thumbnailUrl ? <img src={resolveAssetUrl(track.thumbnailUrl)} alt=""/> : <Music2 size={17}/>}</span>
            <span className="nlm-managed-track-copy"><strong>{track.title}</strong><small>{track.artist || 'Unknown artist'}{track.genre ? ` · ${track.genre}` : ''}</small></span>
            <button className="nlm-add-track-button" onClick={() => void mutateTracks(`add:${track.id}`, () => playlistsAPI.addTrack(detail.id, track.id), `${track.title} added to playlist.`)} disabled={Boolean(busyAction)}><Plus size={14}/> Add</button>
          </article>)}</div> : <div className="nlm-playlist-track-empty"><Music2 size={20}/><span>{catalogue.length ? 'Every available track is already in this playlist.' : 'No available catalogue tracks to add right now.'}</span></div>}
        </div>
      </> : null}
    </div> : <div className="nlm-playlist-list" aria-live="polite">
      {loading ? <p className="nlm-empty-state" role="status">Loading your playlists…</p> : error && playlists.length === 0 ? <div className="nlm-playlist-empty"><ListMusic size={24}/><strong>Your playlists could not be opened.</strong><button className="nlm-ghost-button" onClick={() => void load()}>Try again</button></div> : playlists.length === 0 ? <div className="nlm-playlist-empty"><ListMusic size={24}/><strong>Your playlists will live here.</strong><span>Create one above, then open it to add, arrange, and share your tracks.</span></div> : playlists.map((playlist) => <article className="nlm-playlist-item" key={playlist.id}>
        <button className="nlm-playlist-card-main" onClick={() => { setSelectedId(playlist.id); setNotice(''); setError(''); }} aria-label={`Manage ${playlist.name}`}>
          <span className="nlm-playlist-item-icon">{playlist.coverUrl ? <img src={resolveAssetUrl(playlist.coverUrl)} alt=""/> : <ListMusic size={20}/>}</span>
          <span className="nlm-playlist-item-copy"><strong>{playlist.name}</strong><small>{playlist.description || 'No description'} · {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}</small></span>
        </button>
        <span className="nlm-playlist-visibility">{playlist.isPublic ? <><Share2 size={14}/> Public</> : <><LockKeyhole size={14}/> Private</>}</span>
        <button className="nlm-submit-button nlm-playlist-play-button" onClick={() => void playPlaylist(playlist)} disabled={playBusy || playlist.trackCount === 0}><Play size={13} fill="currentColor"/>{playBusy ? 'Loading…' : 'Play'}</button>
        {playlist.isPublic && <button className="nlm-ghost-button" onClick={() => void copyLink(playlist)}><Copy size={14}/> Copy link</button>}
        <button className="nlm-ghost-button" onClick={() => void togglePublic(playlist)} disabled={busyAction !== ''}>{busyAction === `visibility:${playlist.id}` ? 'Saving…' : playlist.isPublic ? 'Make private' : 'Make public'}</button>
        <button className="nlm-playlist-delete" onClick={() => void deletePlaylist(playlist)} disabled={busyAction !== ''} aria-label={`Delete ${playlist.name}`}><Trash2 size={14}/> Delete</button>
      </article>)}
    </div>}
  </section>;
}
