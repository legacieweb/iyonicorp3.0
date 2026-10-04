import React, { useEffect, useRef } from 'react';
import { ArrowRight, Check, Clapperboard, Loader2, RefreshCw, X } from 'lucide-react';
import './theme-launch.css';

export type ThemeLaunchState = 'checking' | 'applying' | 'ready' | 'error';

interface ThemeLaunchOverlayProps {
  themeName: string;
  previewUrl: string;
  kind: string;
  state: ThemeLaunchState;
  error?: string;
  onRetry: () => void;
  onClose: () => void;
}

const copy: Record<ThemeLaunchState, { title: string; description: string }> = {
  checking: { title: 'Confirming your license', description: 'Checking that this platform is ready for your workspace.' },
  applying: { title: 'Setting the stage', description: 'Your platform is being connected to your seller workspace.' },
  ready: { title: 'Your platform is ready', description: 'Opening your newly configured business workspace.' },
  error: { title: 'We couldn’t confirm the switch', description: 'The request may have reached the server. Check your workspace before trying again.' },
};

const ThemeLaunchOverlay: React.FC<ThemeLaunchOverlayProps> = ({ themeName, previewUrl, kind, state, error, onRetry, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const canClose = state === 'error';
  const canRetry = !error?.startsWith('Acquire this platform');
  const focusableSelector = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (canClose ? closeRef.current : titleRef.current)?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    (canClose ? closeRef.current : titleRef.current)?.focus();
  }, [canClose, state]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (canClose) onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
    if (!focusable.length) {
      event.preventDefault();
      titleRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`theme-launch-overlay${state === 'error' ? ' is-error' : ''}`} onKeyDown={handleKeyDown}>
      <div className="theme-launch-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="theme-launch-title" aria-describedby="theme-launch-description">
        <header className="theme-launch-header">
          <span className="theme-launch-brand"><Clapperboard size={15} /> IYONICWEB / PLATFORM PREMIERE</span>
          {canClose && <button ref={closeRef} type="button" className="theme-launch-close" onClick={onClose} aria-label="Close platform reveal"><X size={19} /></button>}
        </header>
        <div className="theme-launch-kicker"><span>{kind}</span><i /> A NEW WORKSPACE</div>
        <section className="theme-launch-screen" aria-label={`${themeName} live preview`}>
          <iframe title={`${themeName} platform preview`} src={previewUrl} tabIndex={-1} aria-hidden="true" />
          <div className="theme-launch-screen-shade" />
          <div className="theme-launch-curtain theme-launch-curtain-left" />
          <div className="theme-launch-curtain theme-launch-curtain-right" />
          <div className="theme-launch-screen-caption">
            <span>THE COLLECTION / {kind.toUpperCase()}</span>
            <strong>{themeName}</strong>
          </div>
          <span className="theme-launch-screen-stamp"><Check size={14} /> ONE-TIME LICENSE</span>
        </section>
        <div className="theme-launch-status" aria-live="polite">
          <div className="theme-launch-status-copy">
            <span className="theme-launch-status-step">{state === 'error' ? 'NEEDS ATTENTION' : state === 'ready' ? 'COMPLETE' : state === 'checking' ? 'STEP 01 / 02' : 'STEP 02 / 02'}</span>
            <h1 ref={titleRef} id="theme-launch-title" tabIndex={-1}>{copy[state].title}</h1>
            <p id="theme-launch-description">{copy[state].description}</p>
            {state === 'error' && <p className="theme-launch-error" role="alert">{error}</p>}
          </div>
          {state === 'ready' ? <span className="theme-launch-ready-icon"><Check size={20} /></span>
            : state === 'error' ? <span className="theme-launch-error-mark">!</span>
              : <Loader2 className="theme-launch-spinner" size={22} aria-hidden="true" />}
        </div>
        <div className={`theme-launch-progress state-${state}`} role="progressbar" aria-label="Platform setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state === 'ready' ? 100 : state === 'applying' ? 68 : state === 'error' ? 0 : 25}>
          <span />
        </div>
        {canClose ? (
          <footer className="theme-launch-actions">
            <button type="button" className="theme-launch-return" onClick={onClose}>Return to the collection <ArrowRight size={15} /></button>
            {canRetry && <button type="button" className="theme-launch-retry" onClick={onRetry}><RefreshCw size={15} /> Try again</button>}
            <p>Dismissal is available after an error. After a timeout, verify your dashboard before retrying.</p>
          </footer>
        ) : (
          <p className="theme-launch-dismiss-note">Stay here while your workspace is being prepared. It will open automatically when ready.</p>
        )}
      </div>
    </div>
  );
};

export default ThemeLaunchOverlay;
