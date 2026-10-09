import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { HomepageFooter } from '../components/HomepageFooter';
import IyoniPlatformBand from '../components/IyoniPlatformBand';
import {
  Store,
  ShoppingCart,
  Package,
  Layers,
  Globe,
  Palette,
  Code,
  Smartphone,
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  Menu,
  X,
} from 'lucide-react';
import './Homepage.css';

interface IyonicShopProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
  onSignIn?: () => void;
}

export const IyonicShop: React.FC<IyonicShopProps> = ({ onGetStarted, onSignIn }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = () => setIsMenuOpen(false);
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    setIsMenuOpen(false);
  };

  return (
    <div className="home-shell platform-shell min-h-screen">
      <IyoniPlatformBand />
      <SEO
        title="IyonicShop — Commerce Engine for Iyoni"
        description="IyonicShop is the commerce engine inside Iyoni's modular Business Operating System — built to sell products and services while staying connected to payments, operations, and growth."
        keywords="commerce engine, business operating system, storefront, product commerce, IyonicShop"
        canonical="https://iyonicorp.com/iyonicshop"
      />

      <header className="home-header">
        <nav className="home-nav" aria-label="Main navigation">
          <Link to="/" className="home-brand" aria-label="Iyoni home" onClick={handleNav}>
            <img src="/logo.png" alt="" />
            <span>Iyoni<span className="brand-period">.</span></span>
          </Link>
          <div className="nav-links">
            <button type="button" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" onClick={() => scrollToSection('pricing')}>Pricing</button>
            <Link to="/themes" onClick={handleNav}>All platforms</Link>
          </div>
          <div className="nav-actions">
            <button type="button" className="nav-login" onClick={onSignIn}>Log In</button>
            <Link to="/register?role=seller" className="nav-cta" onClick={handleNav}>
              Build with Iyoni <ArrowUpRight size={15} />
            </Link>
          </div>
          <button
            type="button"
            className="menu-toggle"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {isMenuOpen && (
            <div className="mobile-nav">
              <button type="button" onClick={() => scrollToSection('features')}>Features</button>
              <button type="button" onClick={() => scrollToSection('pricing')}>Pricing</button>
              <Link to="/themes" onClick={handleNav}>All platforms</Link>
              <button type="button" onClick={() => { onSignIn?.(); handleNav(); }}>Log In</button>
              <Link to="/register?role=seller" onClick={handleNav}>
                Build with Iyoni <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </nav>
      </header>

      <section className="platform-hero" aria-labelledby="shop-hero-title">
        <div className="platform-hero-copy">
          <p className="eyebrow"><span className="eyebrow-mark" /> Commerce engine</p>
          <h1 id="shop-hero-title">Sell what you offer.<br /><em>Run the business around it.</em></h1>
          <p className="hero-lede">
            IyonicShop is the commerce engine inside Iyoni's modular Business Operating System —
            helping businesses present products and services, accept orders, and stay connected to
            payments, operations, and growth.
          </p>
          <div className="hero-actions">
            <Link to="/register?role=seller" className="button button-dark" onClick={handleNav}>
              Find your platform <ArrowRight size={17} />
            </Link>
            <button type="button" className="text-link" onClick={onSignIn}>
              Explore Iyoni <ArrowDown size={15} />
            </button>
          </div>
          <div className="hero-footnote">
            <span className="footnote-rule" />
            <span><strong>One platform.</strong> Many business types. One connected foundation.</span>
          </div>
        </div>

        <div className="platform-hero-visual" aria-hidden="true">
          <div className="map-topline"><span>OPERATE</span><span>SELL</span></div>
          <div className="map-industry-row">
            <span>Products</span>
            <span>Services</span>
            <span>Payments</span>
            <span>Customers</span>
          </div>
          <div className="map-core">
            <div className="core-symbol"><span /><span /><span /></div>
            <div>
              <span className="core-overline">IYONI</span>
              <strong>Commerce</strong>
            </div>
            <ArrowRight size={20} />
          </div>
          <div className="map-capabilities">
            <span>Storefront</span>
            <span>Catalog</span>
            <span>Checkout</span>
            <span>Growth</span>
          </div>
          <div className="map-caption">
            <span className="caption-dot" />
            Built to connect storefronts to the wider business platform.
          </div>
        </div>
      </section>

      <section className="section-wrap">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#65736a]">
            A core Iyoni platform service
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-[#65736a]">
            IyonicShop is one of Iyoni's core services inside a broader Business Operating System.
            The platform also includes dedicated vertical experiences, shared payments tools, and automation services.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/themes" className="inline-flex items-center gap-2 font-bold text-[#315e4b] hover:text-[#193d30]">
              Explore all platforms <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-wrap" id="features" aria-labelledby="shop-features-title">
        <div className="section-intro">
          <p className="eyebrow">COMMERCE & STORES</p>
          <h2 id="shop-features-title">Sell everything you offer.<br /><em>Run the business around it.</em></h2>
          <p>
            Storefronts, products, services, and connected commerce tools built for your
            business — linked by design to payments and operations.
          </p>
        </div>

        <div className="capability-grid">
          <Link to="/themes" className="capability-card">
            <span className="capability-index">01</span>
            <Palette size={21} strokeWidth={1.7} />
            <strong>Storefront design</strong>
            <p>Choose a visual starting point from the platform theme collection.</p>
            <ArrowUpRight className="capability-arrow" size={16} />
          </Link>
          <Link to="/themes" className="capability-card">
            <span className="capability-index">02</span>
            <Package size={21} strokeWidth={1.7} />
            <strong>Product catalog</strong>
            <p>Present physical products, digital goods, services, and subscriptions.</p>
            <ArrowUpRight className="capability-arrow" size={16} />
          </Link>
          <Link to="/themes" className="capability-card">
            <span className="capability-index">03</span>
            <Layers size={21} strokeWidth={1.7} />
            <strong>Store layouts</strong>
            <p>Explore available storefront layouts and customize your experience.</p>
            <ArrowUpRight className="capability-arrow" size={16} />
          </Link>
        </div>
      </section>

      <section className="architecture-section" id="pricing" aria-labelledby="pricing-title">
        <div className="section-wrap architecture-inner">
          <div className="architecture-stamp">
            <span>CORE<br />SERVICE</span>
            <Store size={24} />
          </div>
          <div className="architecture-copy">
            <p className="eyebrow">A MODULAR WAY TO BUILD</p>
            <h2 id="pricing-title">One foundation.<br /><em>Distinct experiences.</em></h2>
            <p>
              Choose a business-specific experience, then explore the shared services around it.
              IyonicShop brings these paths together without asking every business to work the same way.
            </p>
            <div className="architecture-steps">
              <span><b>01</b> Find your platform</span>
              <i />
              <span><b>02</b> Explore available tools</span>
              <i />
              <span><b>03</b> Build from there</span>
            </div>
          </div>
        </div>
      </section>

      <section className="closing-cta">
        <div className="closing-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div className="closing-copy">
          <p className="eyebrow">ONE FOUNDATION. YOUR BUSINESS.</p>
          <h2>Build your store<br />with <em>Iyoni.</em></h2>
          <p>Find the platform that fits, then take your next step.</p>
          <div className="hero-actions">
            <Link className="button button-light" to="/themes">
              Explore platforms <ArrowRight size={17} />
            </Link>
            <button
              className="closing-login"
              type="button"
              onClick={() => onGetStarted?.('seller')}
            >
              Get started <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="closing-foot">
          IYONI CORP <span>—</span> RUN. SELL. GET PAID. AUTOMATE. GROW.
        </div>
      </section>

      <HomepageFooter />
    </div>
  );
};

export default IyonicShop;
