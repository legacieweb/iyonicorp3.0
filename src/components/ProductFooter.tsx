import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Github, Linkedin, Twitter } from 'lucide-react';

interface ProductFooterProps {
  product: 'IyonicShop' | 'IyonicPay' | 'IyonicBots';
  accentClass: string;
  description: string;
}

const productLinks = [
  { label: 'IyonicShop', to: '/iyonicshop' },
  { label: 'IyonicPay', to: '/iyonicpay' },
  { label: 'IyonicBots', to: '/iyonicbots' },
];

const resourceLinks = [
  { label: 'Documentation', to: '/documentation' },
  { label: 'API Reference', to: '/api-reference' },
  { label: 'Help Center', to: '/help-center' },
  { label: 'Status', to: '/status' },
];

const companyLinks = [
  { label: 'About', to: '/about' },
  { label: 'Careers', to: '/careers' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];

export const ProductFooter: React.FC<ProductFooterProps> = ({ product, accentClass, description }) => (
  <footer className="bg-gray-950 text-white">
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
      <div className="grid gap-12 border-b border-white/10 pb-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="group inline-flex items-center gap-3">
            <img src="/logo.png" alt="iyonicweb" className="h-11 w-11 object-contain" />
            <span className="text-2xl font-black tracking-tight">{product}</span>
          </Link>
          <p className="mt-6 max-w-sm text-base leading-7 text-gray-400">{description}</p>
          <div className="mt-8 flex gap-3">
            {[{ icon: Twitter, label: 'Twitter' }, { icon: Linkedin, label: 'LinkedIn' }, { icon: Github, label: 'GitHub' }].map(({ icon: Icon, label }) => (
              <a key={label} href="#" aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gray-400 transition hover:border-white/30 hover:text-white">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterColumn title="Platform" links={productLinks} accentClass={accentClass} />
        <FooterColumn title="Resources" links={resourceLinks} accentClass={accentClass} />
        <FooterColumn title="Company" links={companyLinks} accentClass={accentClass} />
      </div>
      <div className="flex flex-col gap-4 pt-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 iyonicweb. Built for the next generation of business.</p>
        <Link to="/" className={`inline-flex items-center gap-2 font-semibold ${accentClass}`}>
          Explore iyonicweb <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </footer>
);

const FooterColumn: React.FC<{ title: string; links: { label: string; to: string }[]; accentClass: string }> = ({ title, links, accentClass }) => (
  <div>
    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">{title}</h3>
    <ul className="mt-6 space-y-4">
      {links.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className="text-sm font-medium text-gray-400 transition hover:text-white">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default ProductFooter;
