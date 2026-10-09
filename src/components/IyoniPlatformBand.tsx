import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const serviceLinks = [
  { label: 'IyonicShop', to: '/iyonicshop' },
  { label: 'IyonicPay', to: '/iyonicpay' },
  { label: 'IyonicBots', to: '/iyonicbots' },
];

const IyoniPlatformBand: React.FC = () => (
  <div className="border-b border-[#dce4db] bg-[#f4f6f0] text-[#284638]">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-2.5 sm:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#52675a]">
        <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
        <span>Iyoni <span className="hidden sm:inline">· Modular business platform</span></span>
      </Link>
      <nav aria-label="Iyoni platform navigation" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold sm:gap-x-5 sm:text-xs">
        {serviceLinks.map((service) => (
          <Link key={service.to} to={service.to} className="transition-colors hover:text-emerald-700">{service.label}</Link>
        ))}
        <Link to="/themes" className="inline-flex items-center gap-1 text-[#235941]">
          Find your platform <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </nav>
    </div>
  </div>
);

export default IyoniPlatformBand;
