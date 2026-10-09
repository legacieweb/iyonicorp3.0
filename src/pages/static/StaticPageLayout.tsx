import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomepageFooter } from '../../components/HomepageFooter';

interface StaticPageLayoutProps {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export const StaticSiteHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { label: 'Find your platform', to: '/themes' },
    { label: 'IyonicShop', to: '/iyonicshop' },
    { label: 'IyonicPay', to: '/iyonicpay' },
    { label: 'IyonicBots', to: '/iyonicbots' },
    { label: 'Resources', to: '/documentation' },
    { label: 'Company', to: '/about' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link to="/" className="group inline-flex min-w-0 items-center gap-3" aria-label="Iyoni home" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
          <span className="truncate text-lg font-black text-gray-950">Iyoni</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-xs font-semibold text-gray-600 transition-colors hover:text-emerald-800">{link.label}</Link>
          ))}
        </nav>
        <Link
          to="/themes"
          className="hidden min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[#193d30] px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 sm:inline-flex"
        >
          Find your platform <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 lg:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <nav aria-label="Mobile navigation" className="grid gap-1 border-t border-gray-100 bg-white px-5 py-3 sm:px-8 lg:hidden">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-900">{link.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export const StaticPageLayout: React.FC<StaticPageLayoutProps> = ({ title, eyebrow, description, icon: Icon, children }) => (
  <div className="min-h-screen bg-white text-gray-900">
    <StaticSiteHeader />
    <section     className="relative isolate overflow-hidden border-b border-emerald-100 bg-[#f0f4ee]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(rgba(49, 94, 75, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(49, 94, 75, 0.045) 1px, transparent 1px)', backgroundSize: '34px 34px' }}
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-24">
        <div className="max-w-4xl">
          <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-900">
            <span className="h-px w-7 bg-emerald-800" /> {eyebrow}
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.06] text-gray-950 sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">{description}</p>
        </div>
        <div className="hidden h-20 w-20 items-center justify-center rounded-2xl border border-emerald-200 bg-white/80 text-emerald-900 shadow-sm lg:flex" aria-hidden="true">
          <Icon className="h-9 w-9" strokeWidth={1.6} />
        </div>
      </div>
    </section>
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
      {children}
      <div className="mt-16 flex flex-col gap-4 border-t border-gray-200 pt-7 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="inline-flex items-center gap-2 font-semibold text-gray-800 transition-colors hover:text-emerald-800">
          Back to Iyonicorp <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p>One foundation. Many business experiences.</p>
      </div>
    </main>
    <HomepageFooter />
  </div>
);

export default StaticPageLayout;