import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import './HomepageFooter.css';

type SocialName = 'x' | 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'pinterest';

const socialPaths: Record<SocialName, string> = {
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.636 7.584H.476l8.6-9.83L0 1.153h7.594l5.243 6.932zm-1.291 19.49h2.039L6.482 3.244H4.294z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.85-3.037-1.851 0-2.134 1.445-2.134 2.939v5.667H9.355V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.268 2.37 4.268 5.455zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124M3.56 9h3.56v11.452H3.56zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z',
  facebook: 'M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 11.016 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.089 24 18.092 24 12.073',
  instagram: 'M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2m0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6m5.25-3.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55A3.016 3.016 0 0 0 .501 6.186C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136C4.495 20.5 12 20.5 12 20.5s7.505 0 9.376-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z',
  tiktok: 'M12.525.02h3.005c.18 1.51 1.04 2.917 2.31 3.743 1.26.855 2.82 1.14 4.28 1.216v3.113c-1.37-.045-2.75-.33-4.02-.915-.55-.24-1.06-.555-1.57-.87-.01 2.73.01 5.46-.02 8.18-.07 1.31-.5 2.61-1.27 3.68-1.25 1.84-3.42 3.04-5.66 3.08-1.37.08-2.75-.29-3.92-.99-1.94-1.15-3.3-3.27-3.5-5.53-.02-.39-.03-.78-.01-1.17.18-1.94 1.14-3.8 2.65-5.03 1.7-1.41 4.07-2.08 6.26-1.68.02 1.14-.03 2.28-.03 3.42-1.46-.47-3.17-.13-4.23.99-.74.76-1.1 1.88-.92 2.93.15 1.14.88 2.19 1.9 2.71.64.34 1.39.46 2.11.37 1.02-.1 1.97-.7 2.49-1.58.2-.35.33-.74.4-1.14.07-1.24.04-2.49.05-3.73V.02',
  pinterest: 'M12 0a12 12 0 0 0-4.37 23.18c-.01-.97 0-2.14.24-3.2l1.73-7.32s-.43-.85-.43-2.1c0-1.97 1.14-3.44 2.56-3.44 1.2 0 1.78.9 1.78 1.98 0 1.2-.77 3-1.16 4.67-.33 1.4.7 2.54 2.08 2.54 2.5 0 4.18-3.2 4.18-6.99 0-2.88-1.94-5.04-5.48-5.04-4 0-6.49 2.98-6.49 6.31 0 1.15.34 1.96.87 2.59.24.29.28.4.19.72l-.26 1.04c-.09.33-.35.45-.65.33-1.8-.74-2.65-2.73-2.65-4.97 0-3.69 3.11-8.12 9.29-8.12 4.96 0 8.22 3.59 8.22 7.45 0 5.1-2.83 8.92-7.01 8.92-1.4 0-2.72-.76-3.17-1.62l-.91 3.63c-.28 1.08-.82 2.16-1.31 3A12 12 0 1 0 12 0'
};

const socialLinks: { icon: SocialName; href: string; label: string }[] = [
  { icon: 'x', href: 'https://x.com/iyonicorp', label: 'X' },
  { icon: 'linkedin', href: 'https://www.linkedin.com/company/iyonicorp', label: 'LinkedIn' },
  { icon: 'facebook', href: 'https://facebook.com/iyonicweb', label: 'Facebook' },
  { icon: 'instagram', href: 'https://instagram.com/iyonicorp', label: 'Instagram' },
  { icon: 'youtube', href: 'https://youtube.com/@iyonicorp', label: 'YouTube' },
  { icon: 'tiktok', href: 'https://tiktok.com/@iyonicorp', label: 'TikTok' },
  { icon: 'pinterest', href: 'https://pinterest.com/iyonicorp', label: 'Pinterest' },
];

const footerGroups = [
  { title: 'Products', links: [{ name: 'BizHub', href: '/bizhub' }, { name: 'IyonicPay', href: '/iyonicpay' }, { name: 'Iyonic Intelligence', href: '/iyonicintelligence' }, { name: 'IyonicDB', href: '/iyonicdb' }, { name: 'IyonicMailer', href: '/iyonic-mailer' }] },
  { title: 'Company', links: [{ name: 'About', href: '/about' }, { name: 'Careers', href: '/careers' }, { name: 'Blog', href: '/blog' }, { name: 'Press', href: '/press' }] },
  { title: 'Resources', links: [{ name: 'Documentation', href: '/documentation' }, { name: 'Help center', href: '/help-center' }, { name: 'Status', href: '/status' }] },
  { title: 'Legal', links: [{ name: 'Privacy', href: '/privacy' }, { name: 'Terms', href: '/terms' }, { name: 'Cookies', href: '/cookies' }, { name: 'Licenses', href: '/licenses' }] },
];

export const HomepageFooter: React.FC = () => (
  <footer className="icorp-footer" aria-labelledby="icorp-footer-brand">
    <div className="icorp-footer-inner">
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
      <div className="icorp-footer-bottom">
        <span>© {new Date().getFullYear()} Iyonicorp. All rights reserved.</span>
        <div className="icorp-footer-social">
          <ul aria-label="Iyonicorp social links">
            {socialLinks.map(({ icon, href, label }) => <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Iyonicorp on ${label}`} title={label}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={socialPaths[icon]} /></svg></a></li>)}
          </ul>
        </div>
        <span className="icorp-footer-signals">A connected platform for growing businesses</span>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><ArrowUp size={15} /></button>
      </div>
    </div>
  </footer>
);

export default HomepageFooter;
