import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronUp } from 'lucide-react';

interface ProductFooterProps {
  product: 'IyonicShop' | 'IyonicPay' | 'IyonicBots';
  accentClass: string;
  description: string;
}

const footerGroups = [
  {
    title: 'Iyoni platform',
    links: [
      { name: 'Find your platform', href: '/themes' },
      { name: 'IyonicShop', href: '/iyonicshop' },
      { name: 'IyonicPay', href: '/iyonicpay' },
      { name: 'IyonicBots', href: '/iyonicbots' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Blog', href: '/blog' },
      { name: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Docs', href: '/documentation' },
      { name: 'API', href: '/api-reference' },
      { name: 'Help', href: '/help-center' },
      { name: 'Status', href: '/status' },
      { name: 'Refunds', href: '/refunds' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Privacy', href: '/privacy' },
      { name: 'Terms', href: '/terms' },
      { name: 'Cookie', href: '/cookies' },
      { name: 'Licenses', href: '/licenses' },
    ],
  },
];

const platformSignals = ['Run', 'Sell', 'Get Paid', 'Automate', 'Grow'];

export const ProductFooter: React.FC<ProductFooterProps> = ({ product, accentClass, description }) => {
  const currentYear = new Date().getFullYear();
  const copyright = {
    IyonicShop: 'IyonicShop. Powered by Iyonicorp.',
    IyonicPay: 'IyonicPay by Iyonicorp. All rights reserved.',
    IyonicBots: 'Iyonic AI Engine by Iyonicorp. All rights reserved.',
  }[product];

  return (
    <footer className="relative overflow-hidden border-t border-[#d7d0c4] bg-[#f4efe6] text-[#1a2d2a]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#dfeadf] blur-[120px]" />
        <div className="absolute right-10 top-8 h-80 w-80 rounded-full bg-[#e8d8bd] blur-[140px]" />
        <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-[#dfeae3] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-6 lg:px-8">
        <div className="mb-10 border-y border-[#c9c1b5] py-6 md:py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="relative pl-5">
              <span className="absolute inset-y-0 left-0 w-px bg-[#8da99b]" aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#4b665d]">A shared foundation</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#122824] md:text-3xl">Bring the right tools together.</h2>
            </div>
            <Link
              to="/themes"
              style={{ color: '#ffffff' }}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#163d36] bg-[#163d36] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0f2d29] hover:text-white focus-visible:bg-[#0f2d29] focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#163d36] active:bg-[#0b2421] active:text-white"
            >
              Find your platform
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-10 pb-12 pt-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr] lg:gap-8">
          <div className="lg:pr-8">
            <Link to="/" className="group inline-flex items-center gap-3" aria-label="Iyoni home">
              <img src="/logo.png" alt="Iyoni logo" className="h-12 w-12 object-contain transition-transform duration-500 group-hover:scale-110" />
              <span className="text-2xl font-black tracking-[-0.06em] text-[#10221f]">Iyoni</span>
            </Link>

            <p className={`mt-6 max-w-sm text-[11px] font-bold uppercase tracking-[0.24em] ${accentClass}`}>{product}</p>
            <p className="mt-4 max-w-sm text-lg leading-8 text-[#425c57]">{description}</p>
            <p className="mt-6 max-w-md text-lg leading-8 text-[#2d403b]">
              One technology foundation for the platforms and services modern businesses need.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#49645f]">
              {platformSignals.map((signal, index) => (
                <React.Fragment key={signal}>
                  <span>{signal}</span>
                  {index < platformSignals.length - 1 && <span aria-hidden="true">•</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          <nav aria-label={`${product} footer navigation`} className="grid gap-8 md:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-5 text-[11px] font-black uppercase tracking-[0.24em] text-[#1d2b28]">{group.title}</h2>
                <ul className="space-y-3.5">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className="flex min-h-11 items-center text-sm font-medium text-[#4d5d5a] transition-colors hover:text-[#152b28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#163d36] md:min-h-0"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-2 flex flex-col gap-5 border-t border-[#d8d0c4] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-[#5e6762]">© {currentYear} {copyright}</p>
          <div className="flex items-center gap-3">
            <Link to="/" className={`inline-flex items-center gap-2 text-sm font-semibold ${accentClass}`}>
              Explore Iyoni platforms
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Back to top"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#c9c1b5] bg-[#fcfaf6] text-[#1f2d2b] shadow-[0_8px_20px_rgba(19,41,38,0.08)] transition-colors hover:border-[#9fb9af] hover:text-[#0d1d1b]"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ProductFooter;
