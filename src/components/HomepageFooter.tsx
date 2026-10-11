import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import './HomepageFooter.css';

const footerGroups = [
  { title: 'Products', links: [{ name: 'BizHub', href: '/bizhub' }, { name: 'IyonicPay', href: '/iyonicpay' }, { name: 'IyonicBots', href: '/iyonicbots' }, { name: 'IyonicDB', href: '/iyonicdb' }, { name: 'IyonicMailer', href: '/iyonic-mailer' }] },
  { title: 'Company', links: [{ name: 'About', href: '/about' }, { name: 'Careers', href: '/careers' }, { name: 'Blog', href: '/blog' }, { name: 'Press', href: '/press' }] },
  { title: 'Resources', links: [{ name: 'Documentation', href: '/documentation' }, { name: 'API reference', href: '/api-reference' }, { name: 'Help center', href: '/help-center' }, { name: 'Status', href: '/status' }] },
  { title: 'Legal', links: [{ name: 'Privacy', href: '/privacy' }, { name: 'Terms', href: '/terms' }, { name: 'Cookies', href: '/cookies' }, { name: 'Licenses', href: '/licenses' }] },
];

export const HomepageFooter: React.FC = () => <footer className="icorp-footer">
  <div className="icorp-footer-main">
    <div className="icorp-footer-brand"><Link to="/" aria-label="Iyonicorp home"><img src="/logo.png" alt="" /><span>Iyonicorp</span></Link><p>Thoughtful tools for the people building what comes next.</p><Link className="icorp-footer-cta" to="/themes">Explore the platform collection <ArrowUpRight size={15} /></Link></div>
    <nav aria-label="Iyonicorp footer navigation" className="icorp-footer-nav">{footerGroups.map((group) => <div key={group.title}><h2>{group.title}</h2><ul>{group.links.map((item) => <li key={item.href}><Link to={item.href}>{item.name}</Link></li>)}</ul></div>)}</nav>
  </div>
  <div className="icorp-footer-bottom"><span>© {new Date().getFullYear()} Iyonicorp. All rights reserved.</span><span className="icorp-footer-signals">Run · Sell · Get paid · Automate · Grow</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><ArrowUp size={15} /></button></div>
</footer>;

export default HomepageFooter;
