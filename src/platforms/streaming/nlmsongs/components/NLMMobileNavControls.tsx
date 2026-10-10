import { useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';

export default function NLMMobileNavControls({ isOpen, onToggle, onClose, sidebarId = 'nlm-app-sidebar' }: { isOpen: boolean; onToggle: () => void; onClose: () => void; sidebarId?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = document.getElementById(sidebarId);
    const firstLink = drawer?.querySelector<HTMLElement>('a, nav button');
    firstLink?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (triggerRef.current) triggerRef.current.focus();
      else previousFocus?.focus();
    };
  }, [isOpen, onClose, sidebarId]);

  return <>
    <button ref={triggerRef} type="button" className="nlm-mobile-menu-toggle" onClick={onToggle} aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isOpen} aria-controls={sidebarId}>
      {isOpen ? <X size={19}/> : <Menu size={19}/>}
    </button>
    {isOpen && <button type="button" className="nlm-mobile-nav-overlay" onClick={onClose} aria-label="Close navigation menu" tabIndex={-1} />}
  </>;
}
