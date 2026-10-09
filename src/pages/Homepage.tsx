import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  GraduationCap,
  Layers3,
  Mail,
  Menu,
  MonitorPlay,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import SEO from '../components/SEO';
import { HomepageFooter } from '../components/HomepageFooter';
import './Homepage.css';

interface HomepageProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
  onSignIn?: () => void;
  onOpenIyonicPay?: () => void;
  onOpenIyonicBots?: () => void;
  onOpenIyonicMailer?: () => void;
}

type Industry = {
  id: string;
  name: string;
  detail: string;
  route: string;
  routeLabel: string;
  status: string;
  icon: LucideIcon;
  needs?: string[];
  routeSupports?: string[];
  catalogNeeds?: string[];
  needRoutes?: Record<string, { route: string; routeLabel: string }>;
};

const industries: Industry[] = [
  {
    id: 'restaurant',
    name: 'Restaurants & cafés',
    detail: 'A dedicated point-of-sale experience, with food and hospitality themes in the catalog.',
    route: '/pos/apex-pos',
    routeLabel: 'Explore Apex POS',
    status: 'Dedicated POS',
    icon: Utensils,
    needs: ['in-person', 'commerce'],
    routeSupports: ['in-person'],
    catalogNeeds: ['commerce'],
  },
  {
    id: 'salon',
    name: 'Salons & spas',
    detail: 'Discover salon and spa storefront themes alongside service-platform listings in the Iyoni catalog.',
    route: '/themes',
    routeLabel: 'Browse salon options',
    status: 'Catalog discovery',
    icon: Sparkles,
    needs: ['appointments', 'storefront'],
    catalogNeeds: ['appointments', 'storefront'],
  },
  {
    id: 'rental',
    name: 'Car rentals',
    detail: 'A rental storefront theme is available in the catalog; no dedicated rental app is linked here.',
    route: '/themes',
    routeLabel: 'Browse themes',
    status: 'Storefront theme',
    icon: ArrowUpRight,
    needs: ['storefront'],
    catalogNeeds: ['storefront'],
  },
  {
    id: 'education',
    name: 'Tutoring & education',
    detail: 'Explore public education experiences including TSPP and TutorMe.',
    route: '/tspp',
    routeLabel: 'Explore TSPP',
    status: 'Dedicated platform',
    icon: GraduationCap,
    needs: ['education', 'appointments'],
    routeSupports: ['education'],
    needRoutes: { appointments: { route: '/utorme', routeLabel: 'Explore TutorMe' } },
  },
  {
    id: 'events',
    name: 'Events & streaming',
    detail: 'Discover event platforms in the catalog, or open the public IxStream experience.',
    route: '/ixstream',
    routeLabel: 'Explore IxStream',
    status: 'Dedicated streaming',
    icon: MonitorPlay,
    needs: ['media', 'commerce'],
    routeSupports: ['media'],
    catalogNeeds: ['commerce'],
  },
  {
    id: 'retail',
    name: 'Retail & ecommerce',
    detail: 'Start with IyonicShop or explore the public Craft Collective marketplace.',
    route: '/iyonicshop',
    routeLabel: 'Explore IyonicShop',
    status: 'Commerce platform',
    icon: ShoppingBag,
    needs: ['storefront', 'commerce'],
    routeSupports: ['storefront', 'commerce'],
  },
  {
    id: 'services',
    name: 'Service businesses',
    detail: 'Explore service businesses and available specialist experiences in the Iyoni platform catalog.',
    route: '/themes',
    routeLabel: 'Browse service platforms',
    status: 'Platform catalog',
    icon: CalendarDays,
    needs: ['appointments'],
    catalogNeeds: ['appointments'],
  },
  {
    id: 'more',
    name: 'Something else',
    detail: 'Explore the full catalog of product, service, education, and streaming platforms.',
    route: '/themes',
    routeLabel: 'Explore all platforms',
    status: 'Full catalog',
    icon: Layers3,
    needs: ['storefront', 'in-person', 'education', 'appointments', 'media', 'commerce'],
    catalogNeeds: ['storefront', 'in-person', 'education', 'appointments', 'media', 'commerce'],
  },
];

const needs = [
  { id: 'all', label: 'Best fit', description: 'Show the closest starting point' },
  { id: 'storefront', label: 'A storefront', description: 'Themes and product commerce' },
  { id: 'in-person', label: 'In-person sales', description: 'Point-of-sale experiences' },
  { id: 'appointments', label: 'Service or bookings', description: 'Service platform discovery' },
  { id: 'education', label: 'Education', description: 'Learning and hiring platforms' },
  { id: 'media', label: 'Events or streaming', description: 'Media and event discovery' },
  { id: 'commerce', label: 'Commerce', description: 'Commerce and marketplace tools' },
];

const capabilityCards = [
  {
    title: 'Operations',
    copy: 'Choose a business platform shaped for the way you work.',
    href: '/themes',
    icon: Layers3,
  },
  {
    title: 'Customers',
    copy: 'Discover customer-facing experiences across Iyoni platforms.',
    href: '/themes',
    icon: Store,
  },
  {
    title: 'Commerce',
    copy: 'Explore IyonicShop and the available storefront themes.',
    href: '/iyonicshop',
    icon: ShoppingBag,
  },
  {
    title: 'Payments',
    copy: 'See IyonicPay’s payment and wallet experience.',
    href: '/iyonicpay',
    icon: CreditCard,
  },
  {
    title: 'Scheduling',
    copy: 'Find service platforms with scheduling-oriented experiences.',
    href: '/themes',
    icon: CalendarDays,
  },
  {
    title: 'Automation',
    copy: 'Explore IyonicBots, Iyoni’s AI and automation service.',
    href: '/iyonicbots',
    icon: Bot,
  },
  {
    title: 'Intelligence',
    copy: 'Explore the tools and platform experiences available today.',
    href: '/themes',
    icon: Sparkles,
  },
  {
    title: 'Growth',
    copy: 'Start by finding the platform that fits your business.',
    href: '/themes',
    icon: ArrowUpRight,
  },
];

export const Homepage: React.FC<HomepageProps> = ({
  onGetStarted,
  onSignIn,
}) => {
  const [selectedIndustry, setSelectedIndustry] = useState('restaurant');
  const [selectedNeed, setSelectedNeed] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = industries.find((industry) => industry.id === selectedIndustry) ?? industries[0];
  const recommendation = selected;
  const RecommendationIcon = recommendation.icon;
  const selectedNeedInfo = needs.find((need) => need.id === selectedNeed);
  const needRoute = recommendation.needRoutes?.[selectedNeed];
  const recommendationRoute = needRoute?.route ?? recommendation.route;
  const recommendationRouteLabel = needRoute?.routeLabel ?? recommendation.routeLabel;

  const handleNeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNeed(event.target.value);
  };

  const handleNav = () => setMenuOpen(false);
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    setMenuOpen(false);
  };

  return (
    <div className="home-shell">
      <SEO
        title="The Operating System for Modern Businesses"
        description="Run your business, sell your products and services, get paid, automate your operations, and grow — all from one modular platform."
        keywords="business platform, business operating system, commerce, IyonicShop, IyonicPay, IyonicBots"
        canonical="https://iyonicorp.com/"
      />

      <header className="home-header">
        <nav className="home-nav" aria-label="Main navigation">
          <Link to="/" className="home-brand" aria-label="Iyoni home" onClick={handleNav}>
            <img src="/logo.png" alt="" />
            <span>Iyoni<span className="brand-period">.</span></span>
          </Link>
          <div className="nav-links">
            <button type="button" onClick={() => scrollToSection('platforms')}>Platforms</button>
            <button type="button" onClick={() => scrollToSection('foundation')}>The foundation</button>
            <button type="button" onClick={() => scrollToSection('services')}>Services</button>
            <Link to="/iyonicdb">IyonicDB</Link>
          </div>
          <div className="nav-actions">
            <button type="button" className="nav-login" onClick={onSignIn}>Log in</button>
            <Link to="/register?role=seller" className="nav-cta">Build with Iyoni <ArrowUpRight size={15} /></Link>
          </div>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {menuOpen && (
            <div className="mobile-nav">
              <button type="button" onClick={() => scrollToSection('platforms')}>Platforms</button>
              <button type="button" onClick={() => scrollToSection('foundation')}>The foundation</button>
              <button type="button" onClick={() => scrollToSection('services')}>Services</button>
              <Link to="/iyonicdb" onClick={handleNav}>IyonicDB</Link>
              <button type="button" onClick={() => { onSignIn?.(); handleNav(); }}>Log in</button>
              <Link to="/register?role=seller" onClick={handleNav}>Build with Iyoni <ArrowUpRight size={15} /></Link>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" /> A BUSINESS OPERATING SYSTEM</p>
            <h1 id="hero-title">The Operating System for <em>Modern Businesses.</em></h1>
            <p className="hero-lede">
              Run your business, sell your products and services, get paid, automate your operations, and grow — all from one modular platform.
            </p>
            <div className="hero-actions">
              <button className="button button-dark" type="button" onClick={() => scrollToSection('platforms')}>Find Your Platform <ArrowRight size={17} /></button>
              <button className="text-link" type="button" onClick={() => scrollToSection('foundation')}>Explore Iyoni <ArrowDown size={15} /></button>
            </div>
            <div className="hero-footnote">
              <span className="footnote-rule" />
              <span>One technology foundation.<br /><strong>Many businesses.</strong></span>
            </div>
          </div>

          <div className="hero-map" aria-label="Diagram showing business platforms connected to a shared Iyoni foundation">
            <div className="map-topline"><span>ONE FOUNDATION / MANY FORMS</span><span>01 — 04</span></div>
            <div className="map-industry-row">
              <span>Retail</span><span>Education</span><span>Services</span><span>Media</span>
            </div>
            <div className="map-connectors" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
            <div className="map-core">
              <div className="core-symbol"><span /><span /><span /></div>
              <div><span className="core-overline">THE SHARED FOUNDATION</span><strong>Iyoni</strong></div>
              <ArrowUpRight size={20} />
            </div>
            <div className="map-lower-label">MODULAR BUSINESS PLATFORMS <span>↓</span></div>
            <div className="map-capabilities">
              <span>Commerce</span><span>Payments</span><span>Operations</span><span>Automation</span>
            </div>
            <div className="map-caption"><span className="caption-dot" /> Connected by design. Configured for your business.</div>
          </div>
          <div className="hero-index" aria-hidden="true">IYONI / PLATFORM</div>
        </section>

        <div className="outcome-rail" aria-label="Business outcomes">
          <span>RUN</span><i /><span>SELL</span><i /><span>GET PAID</span><i /><span>AUTOMATE</span><i /><span>GROW</span>
          <button type="button" onClick={() => scrollToSection('capabilities')} aria-label="Explore business capabilities"><ArrowDown size={16} /></button>
        </div>

        <section className="discovery section-wrap" id="platforms" aria-labelledby="discovery-title">
          <div className="section-intro">
            <p className="eyebrow">START WITH YOUR BUSINESS</p>
            <h2 id="discovery-title">What kind of business<br />do you <em>run?</em></h2>
            <p>Different work deserves the right tools. Choose an industry to see a relevant starting point and what is available today.</p>
          </div>

          <div className="finder" aria-label="Platform finder">
            <div className="finder-heading">
              <div><span className="finder-step">01</span><h3>Find your starting point</h3></div>
              <label className="need-select">
                <span>What matters most?</span>
                <span className="select-control">
                  <select aria-label="Choose what matters most" value={selectedNeed} onChange={handleNeedChange}>
                    {needs.filter((need) => need.id === 'all' || selected.needs?.includes(need.id))
                      .map((need) => <option key={need.id} value={need.id}>{need.label}</option>)}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" />
                </span>
              </label>
            </div>
            <div className="industry-grid" role="group" aria-label="Choose your business type">
              {industries.map((industry, index) => {
                const Icon = industry.icon;
                const active = industry.id === selectedIndustry;
                return (
                  <button
                    key={industry.id}
                    type="button"
                    className={`industry-choice${active ? ' is-selected' : ''}`}
                    aria-pressed={active}
                    onClick={() => { setSelectedIndustry(industry.id); setSelectedNeed('all'); }}
                  >
                    <span className="industry-number">0{index + 1}</span>
                    <Icon size={20} strokeWidth={1.7} />
                    <span className="industry-name">{industry.name}</span>
                    {active && <Check className="industry-check" size={15} />}
                  </button>
                );
              })}
            </div>
            <div className="recommendation" aria-live="polite">
              <div className="recommendation-icon"><RecommendationIcon size={21} strokeWidth={1.8} /></div>
              <div className="recommendation-copy">
                <span className="recommendation-kicker">
                  {selectedNeed === 'all' ? recommendation.status : `A MATCH FOR ${needs.find((need) => need.id === selectedNeed)?.label.toUpperCase()}`}
                </span>
                <h4>{recommendation.name}</h4>
                <p>{recommendation.detail}</p>
                <span className="recommendation-note">
                  {selectedNeed !== 'all'
                    ? recommendation.routeSupports?.includes(selectedNeed) || needRoute
                      ? `${selectedNeedInfo?.description} This need maps to ${recommendationRouteLabel.replace(/^(Explore|Browse)\s+/, '')}, a dedicated experience.`
                      : recommendation.catalogNeeds?.includes(selectedNeed)
                        ? `${selectedNeedInfo?.description} Explore catalog listings for this need; some listings are storefront themes rather than dedicated systems.`
                        : `This need is not specifically represented by the selected ${recommendation.name} route. Explore the catalog for available options.`
                    : selected.status === 'Storefront theme' || selected.status === 'Catalog discovery' || selected.status === 'Platform catalog' || selected.status === 'Full catalog'
                      ? 'Catalog listing — check each platform for its current access and feature details.'
                      : 'Available route in this application.'}
                </span>
              </div>
              <Link className="recommendation-link" to={recommendationRoute}>
                {recommendationRouteLabel}<ArrowUpRight size={16} />
              </Link>
            </div>
            <p className="finder-hint"><span>i</span> Recommendations link to existing app pages. Catalog listings may be themes or platform previews, not separate operational systems.</p>
          </div>
        </section>

        <section className="platform-section" aria-labelledby="verticals-title">
          <div className="section-wrap platform-inner">
            <div className="platform-heading">
              <div>
                <p className="eyebrow">BUILT AROUND THE WAY YOU WORK</p>
                <h2 id="verticals-title">One foundation.<br /><em>Distinct platforms.</em></h2>
              </div>
              <p>Specialized experiences sit alongside the shared Iyoni foundation. Explore dedicated applications and browse catalog options, with their availability clearly distinguished.</p>
            </div>
            <div className="platform-diagram">
              <div className="vertical-list">
                <Link to="/pos/apex-pos" className="vertical-item">
                  <span className="vertical-icon vertical-blue"><Utensils size={19} /></span>
                  <span><strong>Apex POS</strong><small>Food service & in-person sales</small></span>
                  <span className="platform-tag">DEDICATED</span><ArrowUpRight size={17} />
                </Link>
                <Link to="/tspp" className="vertical-item">
                  <span className="vertical-icon vertical-olive"><GraduationCap size={19} /></span>
                  <span><strong>TSPP</strong><small>School and teacher hiring</small></span>
                  <span className="platform-tag">DEDICATED</span><ArrowUpRight size={17} />
                </Link>
                <Link to="/ixstream" className="vertical-item">
                  <span className="vertical-icon vertical-red"><MonitorPlay size={19} /></span>
                  <span><strong>IxStream</strong><small>Movie and TV streaming</small></span>
                  <span className="platform-tag">DEDICATED</span><ArrowUpRight size={17} />
                </Link>
                <Link to="/marketplace/craft-collective" className="vertical-item">
                  <span className="vertical-icon vertical-gold"><ShoppingBag size={19} /></span>
                  <span><strong>Craft Collective</strong><small>Artisan marketplace</small></span>
                  <span className="platform-tag">DEDICATED</span><ArrowUpRight size={17} />
                </Link>
                <Link to="/themes" className="vertical-item">
                  <span className="vertical-icon vertical-neutral"><Layers3 size={19} /></span>
                  <span><strong>More in the catalog</strong><small>Salon, rentals, events, services & more</small></span>
                  <span className="platform-tag">DISCOVER</span><ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="shared-engine">
                <span className="engine-kicker">A SHARED TECHNOLOGY FOUNDATION</span>
                <div className="engine-mark"><span /><span /><span /></div>
                <strong>Iyoni</strong>
                <p>Shared platform.<br />Business-specific experiences.</p>
                <div className="engine-line" />
                <span className="engine-caption">MODULAR BY DESIGN</span>
              </div>
            </div>
            <div className="catalog-disclaimer">Dedicated routes are linked where available. Other business types are presented as catalog discovery and are not represented as dedicated apps.</div>
          </div>
        </section>

        <section className="foundation section-wrap" id="foundation" aria-labelledby="foundation-title">
          <div className="foundation-intro">
            <p className="eyebrow">THE IYONI FOUNDATION</p>
            <h2 id="foundation-title">The right pieces.<br /><em>Connected.</em></h2>
          </div>
          <div className="foundation-copy">
            <p className="foundation-lede">One place to discover the systems that help your business run, sell, get paid, automate, and grow.</p>
            <p>Start with a specialist platform or explore core services. Each link leads to an existing Iyoni experience; feature depth varies by platform.</p>
            <button className="inline-link" type="button" onClick={() => scrollToSection('services')}>Meet the core services <ArrowRight size={16} /></button>
          </div>
          <div className="capability-grid" id="capabilities">
            {capabilityCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link key={card.title} to={card.href} className="capability-card">
                  <span className="capability-index">0{index + 1}</span>
                  <Icon size={21} strokeWidth={1.7} />
                  <strong>{card.title}</strong>
                  <p>{card.copy}</p>
                  <ArrowUpRight className="capability-arrow" size={16} />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="service-section" id="services" aria-labelledby="services-title">
          <div className="section-wrap">
            <div className="service-heading">
              <div><p className="eyebrow">CORE PLATFORM SERVICES</p><h2 id="services-title">Shared services.<br /><em>Business editions.</em></h2></div>
              <p>IyonicShop, IyonicPay, and IyonicBots are core Iyoni services — not separate business systems to piece together.</p>
            </div>
            <div className="service-list">
              <article className="service-row">
                <span className="service-symbol"><ShoppingBag size={21} /></span>
                <span className="service-name">IyonicShop</span>
                <span className="service-role">Commerce engine</span>
                <span className="service-detail">Explore storefronts and commerce tools.</span>
                <Link to="/iyonicshop" aria-label="Explore IyonicShop"><ArrowUpRight size={18} /></Link>
              </article>
              <article className="service-row">
                <span className="service-symbol"><CreditCard size={21} /></span>
                <span className="service-name">IyonicPay</span>
                <span className="service-role">Payment infrastructure</span>
                <span className="service-detail">Explore payment and wallet services.</span>
                <Link to="/iyonicpay" aria-label="Explore IyonicPay"><ArrowUpRight size={18} /></Link>
              </article>
              <article className="service-row">
                 <span className="service-symbol"><Bot size={21} /></span>
                 <span className="service-name">IyonicBots</span>
                 <span className="service-role">AI & automation engine</span>
                 <span className="service-detail">Explore Iyoni's AI and automation service.</span>
                 <Link to="/iyonicbots" aria-label="Explore IyonicBots"><ArrowUpRight size={18} /></Link>
               </article>
               <article className="service-row">
                 <span className="service-symbol"><Mail size={21} /></span>
                 <span className="service-name">IyonicMailer</span>
                 <span className="service-role">Email marketing platform</span>
                 <span className="service-detail">Explore email campaigns, SMTP, and reseller program.</span>
                 <Link to="/iyonic-mailer" aria-label="Explore IyonicMailer"><ArrowUpRight size={18} /></Link>
               </article>
            </div>
            <p className="service-note"><span>↳</span> What is available depends on the platform. Explore each service and its current experience.</p>
          </div>
        </section>

        <section className="architecture-section" aria-labelledby="architecture-title">
          <div className="section-wrap architecture-inner">
            <div className="architecture-stamp"><span>HOW IT<br />FITS TOGETHER</span><Layers3 size={24} /></div>
            <div className="architecture-copy">
              <p className="eyebrow">A MODULAR WAY TO BUILD</p>
              <h2 id="architecture-title">Start with your business.<br /><em>Grow into the platform.</em></h2>
              <p>Choose a business-specific experience, then explore the shared services around it. Iyoni brings these paths together without asking every business to work the same way.</p>
              <div className="architecture-steps">
                <span><b>01</b> Find your platform</span><i /><span><b>02</b> Explore available tools</span><i /><span><b>03</b> Build from there</span>
              </div>
            </div>
          </div>
        </section>

        <section className="closing-cta">
          <div className="closing-orbit" aria-hidden="true"><span /><span /><span /></div>
          <div className="closing-copy">
            <p className="eyebrow">ONE FOUNDATION. YOUR BUSINESS.</p>
            <h2>Build your business<br />with <em>Iyoni.</em></h2>
            <p>Find the platform that fits, then take your next step.</p>
            <div className="hero-actions">
              <Link className="button button-light" to="/themes">Explore platforms <ArrowRight size={17} /></Link>
              <button className="closing-login" type="button" onClick={() => onGetStarted?.('seller')}>
                Get started <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
          <div className="closing-foot">IYONI CORP <span>—</span> RUN. SELL. GET PAID. AUTOMATE. GROW.</div>
        </section>
      </main>
      <HomepageFooter />
    </div>
  );
};
