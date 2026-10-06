import React from 'react';
import { ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomepageFooter } from '../../components/HomepageFooter';

interface StaticPageLayoutProps {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export const StaticSiteHeader: React.FC = () => (
  <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
      <Link to="/" className="group inline-flex min-w-0 items-center gap-3" aria-label="Iyonicorp home">
        <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
        <span className="truncate text-lg font-black text-gray-950">Iyonicorp</span>
      </Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
        <Link to="/iyonicshop" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-950">Shop</Link>
        <Link to="/documentation" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-950">Resources</Link>
        <Link to="/about" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-950">Company</Link>
      </nav>
      <Link
        to="/register?role=seller"
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Get started <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  </header>
);

export const StaticPageLayout: React.FC<StaticPageLayoutProps> = ({ title, eyebrow, description, icon: Icon, children }) => (
  <div className="min-h-screen bg-white text-gray-900">
    <StaticSiteHeader />
    <section className="relative isolate overflow-hidden border-b border-blue-100 bg-[#f0f6ff]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(rgba(30, 64, 175, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 64, 175, 0.045) 1px, transparent 1px)', backgroundSize: '34px 34px' }}
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-24">
        <div className="max-w-4xl">
          <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-800">
            <span className="h-px w-7 bg-blue-700" /> {eyebrow}
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-[1.06] text-gray-950 sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">{description}</p>
        </div>
        <div className="hidden h-20 w-20 items-center justify-center rounded-2xl border border-blue-200 bg-white/80 text-blue-800 shadow-sm lg:flex" aria-hidden="true">
          <Icon className="h-9 w-9" strokeWidth={1.6} />
        </div>
      </div>
    </section>
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
      {children}
      <div className="mt-16 flex flex-col gap-4 border-t border-gray-200 pt-7 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="inline-flex items-center gap-2 font-semibold text-gray-800 transition-colors hover:text-blue-700">
          Back to Iyonicorp <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p>Built for the next generation of business.</p>
      </div>
    </main>
    <HomepageFooter />
  </div>
);

export default StaticPageLayout;