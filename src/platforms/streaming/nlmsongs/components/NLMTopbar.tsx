import { LayoutDashboard, LogOut, LogIn, Palette, Plus, UserPlus, UserRound, X } from 'lucide-react';
import type { NLMUser } from '../types';

interface Props {
  user: NLMUser | null;
  isAdminMode: boolean;
  view: 'Listen' | 'Your Library' | 'Settings';
  accountMenuOpen: boolean;
  onAccountMenuToggle: () => void;
  onAccountMenuClose: () => void;
  onOpenAccount: () => void;
  onOpenThemes: () => void;
  onOpenSignIn: () => void;
  onOpenRegistration: () => void;
  onOpenUpload: () => void;
  onSignOut: () => void;
}

export const NLMTopbar = ({
  user,
  isAdminMode,
  view,
  accountMenuOpen,
  onAccountMenuToggle,
  onAccountMenuClose,
  onOpenAccount,
  onOpenThemes,
  onOpenSignIn,
  onOpenRegistration,
  onOpenUpload,
  onSignOut,
}: Props) => (
  <header className="nlm-topbar">
    <div className="nlm-location">
      <span>LISTENING ROOM</span>
      <span className="nlm-location-slash">/</span>
      <span>{view.toUpperCase()}</span>
    </div>

    <div className="nlm-account-actions">
      <div className="nlm-desktop-actions">
        {!user ? (
          <>
            <button className="nlm-account-button" onClick={onOpenSignIn}>
              <LogIn size={14} /> Sign in
            </button>
            <button className="nlm-auth-join" onClick={onOpenRegistration}>
              <UserPlus size={14} /> Create account
            </button>
          </>
        ) : isAdminMode ? (
          <>
            <span className="nlm-account-name">{user.name || user.email}</span>
            <button className="nlm-account-button" onClick={onOpenThemes}>
              <Palette size={14} /> Themes
            </button>
            <button className="nlm-account-button" onClick={onOpenAccount}>
              <LayoutDashboard size={14} /> Dashboard
            </button>
            <button className="nlm-account-button" onClick={onSignOut}>
              <LogOut size={14} /> Sign out
            </button>
            <button className="nlm-add-button" onClick={onOpenUpload}>
              <Plus size={16} /> Add your music
            </button>
          </>
        ) : (
          <>
            <span className="nlm-account-name">{user.name || user.email}</span>
            <button className="nlm-account-button" onClick={onOpenAccount}>
              <LayoutDashboard size={14} /> Dashboard
            </button>
            <button className="nlm-account-button" onClick={onSignOut}>
              <LogOut size={14} /> Sign out
            </button>
          </>
        )}
      </div>

      <button
        className="nlm-mobile-account-toggle"
        aria-label={accountMenuOpen ? 'Close account menu' : 'Open account menu'}
        aria-expanded={accountMenuOpen}
        aria-controls="nlm-mobile-account-menu"
        onClick={onAccountMenuToggle}
      >
        {accountMenuOpen ? <X size={18} /> : <UserRound size={18} />}
      </button>

      {accountMenuOpen && (
        <div className="nlm-mobile-account-menu" id="nlm-mobile-account-menu">
          {user && (
            <p className="nlm-mobile-account-name">{user.name || user.email}</p>
          )}
          {!user ? (
            <>
              <button onClick={onOpenSignIn}>
                <LogIn size={15} /> Sign in
              </button>
              <button className="is-primary" onClick={onOpenRegistration}>
                <UserPlus size={15} /> Create account
              </button>
            </>
          ) : (
            <>
              {isAdminMode && (
                <button onClick={() => { onAccountMenuClose(); onOpenThemes(); }}>
                  <Palette size={15} /> Themes
                </button>
              )}
              <button onClick={() => { onAccountMenuClose(); onOpenAccount(); }}>
                <LayoutDashboard size={15} /> Dashboard
              </button>
              {isAdminMode && (
                <button onClick={() => { onAccountMenuClose(); onOpenUpload(); }}>
                  <Plus size={15} /> Add your music
                </button>
              )}
              <button onClick={() => { onAccountMenuClose(); onSignOut(); }}>
                <LogOut size={15} /> Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  </header>
);

export default NLMTopbar;
