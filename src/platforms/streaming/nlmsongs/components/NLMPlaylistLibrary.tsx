import { useEffect, useState, type FormEvent } from 'react';
import { Copy, ListMusic, LockKeyhole, Play, Plus, Share2 } from 'lucide-react';
import { playlistsAPI, type NLMPlaylist } from '../../../../services/api';

const shareUrl = (id: string) => `${window.location.origin}${window.location.pathname}#/nlmsongs/playlist/${encodeURIComponent(id)}`;

export default function NLMPlaylistLibrary() {
  const [playlists, setPlaylists] = useState<NLMPlaylist[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [playBusy, setPlayBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try { setPlaylists(await playlistsAPI.getAll()); }
    catch { setError('Your playlists could not be loaded. Please sign in and try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const created = await playlistsAPI.create({ name: name.trim(), description: description.trim() });
      setPlaylists((items) => [created, ...items]); setName(''); setDescription(''); setNotice('Playlist created. Add songs from their detail pages.');
    } catch { setError('Could not create your playlist. Please try again.'); }
    finally { setSaving(false); }
  };

  const togglePublic = async (playlist: NLMPlaylist) => {
    setError(''); setNotice('');
    try {
      const updated = await playlistsAPI.update(playlist.id, { isPublic: !playlist.isPublic });
      setPlaylists((items) => items.map((item) => item.id === playlist.id ? updated : item));
      setNotice(updated.isPublic ? 'Playlist is public and ready to share.' : 'Playlist is private again.');
    } catch { setError('Could not update sharing. Please try again.'); }
  };

  const copyLink = async (playlist: NLMPlaylist) => {
    try { await navigator.clipboard.writeText(shareUrl(playlist.id)); setNotice('Public playlist link copied.'); }
    catch { setError('Could not copy the link.'); }
  };

  const playPlaylist = async (playlist: NLMPlaylist) => {
    setPlayBusy(playlist.id); setError(''); setNotice('');
    try {
      const details = await playlistsAPI.getById(playlist.id);
      const trackIds = details.items.map((item) => item.trackId);
      if (!trackIds.length) { setNotice('Add a song to this playlist before playing it.'); return; }
      window.dispatchEvent(new CustomEvent('nlm:play-playlist', { detail: { trackIds } }));
      setNotice(`Playing ${playlist.name}.`);
    } catch { setError('Could not open this playlist. Check that you are signed in as its owner.'); }
    finally { setPlayBusy(null); }
  };

  return <section className="nlm-playlists-page" aria-labelledby="nlm-playlists-title">
    <span className="nlm-eyebrow">YOUR COLLECTION</span><h1 id="nlm-playlists-title">My Playlists</h1>
    <p className="nlm-playlists-intro">Collect tracks into personal sets. Public playlists can be shared with a private-safe listening link.</p>
    <form className="nlm-playlist-create" onSubmit={create}>
      <div><label htmlFor="nlm-playlist-name">Playlist name</label><input id="nlm-playlist-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="A late-night mix" required />
      <label htmlFor="nlm-playlist-description">Description <span>(optional)</span></label><input id="nlm-playlist-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="Set the mood" /></div>
      <button className="nlm-submit-button" disabled={saving || !name.trim()}><Plus size={15} /> {saving ? 'Creating…' : 'Create playlist'}</button>
    </form>
    {error && <p className="nlm-inline-error" role="alert">{error}</p>}{notice && <p className="nlm-inline-notice" role="status">{notice}</p>}
    <div className="nlm-playlist-list" aria-live="polite">
      {loading ? <p className="nlm-empty-state">Loading your playlists…</p> : playlists.length === 0 ? <div className="nlm-playlist-empty"><ListMusic size={24}/><strong>Your playlists will live here.</strong><span>Create one above, then add tracks from any song detail page.</span></div> : playlists.map((playlist) => <article className="nlm-playlist-item" key={playlist.id}>
        <span className="nlm-playlist-item-icon"><ListMusic size={20}/></span><div className="nlm-playlist-item-copy"><strong>{playlist.name}</strong><small>{playlist.description || 'No description'} · {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}</small></div>
        <span className="nlm-playlist-visibility">{playlist.isPublic ? <><Share2 size={14}/> Public</> : <><LockKeyhole size={14}/> Private</>}</span>
        <button className="nlm-submit-button nlm-playlist-play-button" onClick={() => void playPlaylist(playlist)} disabled={playBusy === playlist.id || playlist.trackCount === 0}><Play size={13} fill="currentColor"/>{playBusy === playlist.id ? 'Loading…' : 'Play'}</button>
        {playlist.isPublic && <button className="nlm-ghost-button" onClick={() => void copyLink(playlist)}><Copy size={14}/> Copy link</button>}
        <button className="nlm-ghost-button" onClick={() => void togglePublic(playlist)} aria-label={`${playlist.isPublic ? 'Make private' : 'Make public'}: ${playlist.name}`}>{playlist.isPublic ? 'Make private' : 'Make public'}</button>
      </article>)}
    </div>
  </section>;
}
