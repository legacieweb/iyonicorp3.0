import { Disc3, Download, Home, Library, ListMusic, Music2, Settings } from 'lucide-react';
import type { NLMView } from '../types';

interface Props {
  view: NLMView;
  trackCount: number;
  downloadCount: number;
  isAdminMode: boolean;
  onNavigate: (view: NLMView) => void;
  onNavigateDiscovery: (view: 'Playlists') => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const NLMSidebar = ({ view, trackCount, downloadCount, isAdminMode: _isAdminMode, onNavigate, onNavigateDiscovery, mobileOpen = false, onMobileClose }: Props) => {
  const goView = (nextView: NLMView) => { onNavigate(nextView); onMobileClose?.(); };
  const goDiscovery = () => { onNavigateDiscovery('Playlists'); onMobileClose?.(); };
  return <aside className={`nlm-sidebar ${mobileOpen ? 'is-mobile-open' : ''}`} id="nlm-app-sidebar" aria-label="NLM Songs navigation" role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined}>
    <a
      className="nlm-brand"
      href="/nlmsongs"
      onClick={(event) => {
        event.preventDefault();
        goView('Listen');
      }}
      aria-label="NLM Songs home"
    >
      <span className="nlm-brand-mark">
        <Music2 size={19} strokeWidth={2.5} />
      </span>
      <span>nlm<span className="nlm-brand-light">songs</span></span>
    </a>

    <span className="nlm-nav-caption">YOUR SPACE</span>

    <nav className="nlm-nav" aria-label="Main navigation">
      <button className={view === 'Listen' ? 'is-active' : ''} onClick={() => goView('Listen')} aria-label="Home" title="Home" aria-current={view === 'Listen' ? 'page' : undefined}><Home size={17} strokeWidth={1.8} /><span>Home</span></button>
      <button onClick={goDiscovery} aria-label="My Playlists" title="My Playlists"><ListMusic size={17} strokeWidth={1.8} /><span>Playlists</span></button>
      <button className={view === 'Your Library' ? 'is-active' : ''} onClick={() => goView('Your Library')} aria-label="Your Library" title="Your Library" aria-current={view === 'Your Library' ? 'page' : undefined}><Library size={17} strokeWidth={1.8} /><span>Your Library</span>{trackCount > 0 && <small>{trackCount}</small>}</button>
      <button className={view === 'Downloads' ? 'is-active' : ''} onClick={() => goView('Downloads')} aria-label={`Downloads, ${downloadCount} saved offline`} title="Downloads" aria-current={view === 'Downloads' ? 'page' : undefined}><Download size={17} strokeWidth={1.8} /><span>Downloads</span>{downloadCount > 0 && <small>{downloadCount}</small>}</button>
      <button className={view === 'Settings' ? 'is-active' : ''} onClick={() => goView('Settings')} aria-label="Settings" title="Settings" aria-current={view === 'Settings' ? 'page' : undefined}><Settings size={17} strokeWidth={1.8} /><span>Settings</span></button>
    </nav>

    <div className="nlm-sidebar-rule" />

    <div className="nlm-sidebar-note">
      <span className="nlm-note-glyph">
        <Disc3 size={20} />
      </span>
      <p>Your music stays<br />right here with you.</p>
      <span>LOCAL LISTENING</span>
    </div>

    <div className="nlm-sidebar-foot">
      <span className="nlm-live-dot" /> PRIVATE BY DESIGN
    </div>
  </aside>;
};

export default NLMSidebar;
