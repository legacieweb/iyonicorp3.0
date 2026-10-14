import React, { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import './global-header.css';

type GlobalHeaderProps = { context?: string; dashboardHref?: string; signupHref?: string };

const GlobalHeader: React.FC<GlobalHeaderProps> = ({ context, dashboardHref, signupHref = '/register?role=seller' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="global-header">
      <div className="global-header-inner">
        <Link to="/" className="global-brand" aria-label="Iyonicorp home" onClick={closeMenu}>
          <img src="/logo.png" alt="" /><span>Iyonicorp</span><i>.</i>
        </Link>
        <button className="global-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="global-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav id="global-navigation" className={`global-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <Link to="/#products" onClick={closeMenu}>Products</Link>
          <Link to="/themes" onClick={closeMenu}>Themes &amp; platforms</Link>
          <Link to="/about" onClick={closeMenu}>About</Link>
          {context && <span className="global-header-context">{context}</span>}
          <div className="global-header-actions">
            {dashboardHref ? <Link className="global-header-cta" to={dashboardHref} onClick={closeMenu}>Dashboard <ArrowUpRight size={15} /></Link> : <><Link className="global-header-login" to="/login" onClick={closeMenu}>Log in</Link><Link className="global-header-cta" to={signupHref} onClick={closeMenu}>Get started <ArrowUpRight size={15} /></Link></>}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default GlobalHeader;
