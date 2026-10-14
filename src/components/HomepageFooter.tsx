import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import './HomepageFooter.css';

const footerGroups = [
  { title: 'Products', links: [{ name: 'BizHub', href: '/bizhub' }, { name: 'IyonicPay', href: '/iyonicpay' }, { name: 'Iyonic Intelligence', href: '/iyonicintelligence' }, { name: 'IyonicDB', href: '/iyonicdb' }, { name: 'IyonicMailer', href: '/iyonic-mailer' }] },
  { title: 'Company', links: [{ name: 'About', href: '/about' }, { name: 'Careers', href: '/careers' }, { name: 'Blog', href: '/blog' }, { name: 'Press', href: '/press' }] },
  { title: 'Resources', links: [{ name: 'Documentation', href: '/documentation' }, { name: 'API reference', href: '/api-reference' }, { name: 'Help center', href: '/help-center' }, { name: 'Status', href: '/status' }] },
  { title: 'Legal', links: [{ name: 'Privacy', href: '/privacy' }, { name: 'Terms', href: '/terms' }, { name: 'Cookies', href: '/cookies' }, { name: 'Licenses', href: '/licenses' }] },
];

type HomepageFooterProps = { showAboutCta?: boolean };

export const HomepageFooter: React.FC<HomepageFooterProps> = ({ showAboutCta = true }) => (
  <footer className={`icorp-footer${showAboutCta ? '' : ' icorp-footer--compact'}`} aria-labelledby="icorp-footer-brand">
    <div className="icorp-footer-inner">
      {showAboutCta && <div className="icorp-footer-cta">
        <div><span className="icorp-footer-eyebrow">ABOUT IYONICORP</span><h2>Business tools, connected around your work.</h2></div>
        <Link to="/about" className="icorp-footer-button">Meet Iyonicorp <ArrowUpRight size={16} /></Link>
      </div>}
      <div className="icorp-footer-main">
        <div className="icorp-footer-brand">
          <Link to="/" className="icorp-footer-wordmark" aria-label="Iyonicorp home"><img src="/logo.png" alt="" /><span id="icorp-footer-brand">Iyonicorp</span></Link>
          <p>Thoughtful tools for the people building what comes next.</p>
          <span className="icorp-footer-signature"><i aria-hidden="true" /> START · RUN · AUTOMATE</span>
        </div>
        <nav aria-label="Iyonicorp footer navigation" className="icorp-footer-nav">
          {footerGroups.map((group) => <div key={group.title}><h3>{group.title}</h3><ul>{group.links.map((item) => <li key={item.href}><Link to={item.href}>{item.name}</Link></li>)}</ul></div>)}
        </nav>
      </div>
      <div className="icorp-footer-bottom"><span>© {new Date().getFullYear()} Iyonicorp. All rights reserved.</span><span className="icorp-footer-signals">A connected platform for growing businesses</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><ArrowUp size={15} /></button></div>
    </div>
  </footer>
);

export default HomepageFooter;
