import React from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomepageFooter } from '../../components/HomepageFooter';
import GlobalHeader from '../../components/GlobalHeader';
import './static-pages.css';

interface StaticPageLayoutProps {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export const StaticSiteHeader: React.FC = () => <GlobalHeader signupHref="/#products" />;

export const StaticPageLayout: React.FC<StaticPageLayoutProps> = ({ title, eyebrow, description, icon: Icon, children }) => (
  <div className="home-reimagined iyoni-info-page min-h-screen text-gray-900">
    <StaticSiteHeader />
    <section className="iyoni-info-hero relative isolate overflow-hidden border-b">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(rgba(49, 94, 75, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(49, 94, 75, 0.045) 1px, transparent 1px)', backgroundSize: '34px 34px' }}
      />
      <div className="iyoni-info-hero-inner mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:py-24">
        <div className="max-w-4xl">
          <p className="iyoni-info-eyebrow mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]">
            <span className="h-px w-7" /> {eyebrow}
          </p>
          <h1 className="iyoni-info-title max-w-4xl text-4xl font-black leading-[1.06] text-gray-950 sm:text-6xl">{title}</h1>
          <p className="iyoni-info-description mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">{description}</p>
        </div>
        <div className="iyoni-info-mark hidden h-20 w-20 items-center justify-center border lg:flex" aria-hidden="true">
          <Icon className="h-9 w-9" strokeWidth={1.6} />
        </div>
      </div>
    </section>
    <main className="iyoni-info-main mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:py-20">
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
