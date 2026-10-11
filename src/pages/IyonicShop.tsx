import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Search, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import GlobalHeader from '../components/GlobalHeader';
import { HomepageFooter } from '../components/HomepageFooter';
import { getThemeDashboardRoute } from '../utils/themeDashboard';
import './bizhub.css';

interface IyonicShopProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
  onSignIn?: () => void;
}

type Platform = { id: string; name: string; category: string; fit: string; description: string; mark: string; tone: string; tags: string[] };

const PLATFORMS: Platform[] = [
  { id: 'modern-ecommerce', name: 'Modern E-commerce', category: 'Retail & fashion', fit: 'For product brands', description: 'A clean, flexible storefront for fashion, home, and everyday retail.', mark: 'M / E', tone: 'sand', tags: ['Retail', 'Fashion', 'Products'] },
  { id: 'luxury-boutique', name: 'Luxury Boutique', category: 'Retail & fashion', fit: 'For premium labels', description: 'Editorial product storytelling with a more considered, boutique feel.', mark: 'LB', tone: 'plum', tags: ['Luxury', 'Editorial', 'Retail'] },
  { id: 'beauty-store', name: 'Beauty Store', category: 'Beauty & wellness', fit: 'For beauty brands', description: 'A polished home for skincare, cosmetics, and personal care ranges.', mark: 'BEAUTY', tone: 'rose', tags: ['Beauty', 'Skincare', 'Products'] },
  { id: 'shoe-store', name: 'Shoe Store', category: 'Retail & fashion', fit: 'For footwear', description: 'Put collections, new drops, and standout pairs at the center.', mark: 'STEP', tone: 'blue', tags: ['Footwear', 'Fashion', 'Retail'] },
  { id: 'jewelry-store', name: 'Jewelry Store', category: 'Retail & fashion', fit: 'For jewelry makers', description: 'A refined showcase for fine jewelry, accessories, and collections.', mark: 'AUREL', tone: 'gold', tags: ['Jewelry', 'Luxury', 'Accessories'] },
  { id: 'bakery-store', name: 'Bakery Store', category: 'Food & hospitality', fit: 'For bakers & makers', description: 'An inviting storefront for baked goods, cafes, and local makers.', mark: 'DAILY\nLOAF', tone: 'bread', tags: ['Bakery', 'Food', 'Local'] },
  { id: 'aura-salon', name: 'Aura Salon', category: 'Beauty & wellness', fit: 'For salons', description: 'Service menus and a welcoming booking experience for your clients.', mark: 'AURA', tone: 'mint', tags: ['Salon', 'Appointments', 'Services'] },
  { id: 'creative-studio', name: 'Creative Studio', category: 'Creative & professional', fit: 'For studios & agencies', description: 'A distinctive digital home for creative practices and independent studios.', mark: 'STUDIO\nNº 08', tone: 'orange', tags: ['Creative', 'Studio', 'Services'] },
  { id: 'elite-consulting', name: 'Elite Consulting', category: 'Creative & professional', fit: 'For consultants', description: 'A confident, structured presence for firms built on expertise.', mark: 'ELITE', tone: 'navy', tags: ['Consulting', 'Professional', 'Services'] },
  { id: 'restaurant', name: 'The Restaurant', category: 'Food & hospitality', fit: 'For restaurants', description: 'Bring your menu, reservations, and guest experience together.', mark: 'TABLE\n& CO.', tone: 'red', tags: ['Restaurant', 'Food', 'Hospitality'] },
  { id: 'event-planner', name: 'Event Flow', category: 'Events & experiences', fit: 'For event businesses', description: 'A dedicated workspace for event listings, bookings, and operations.', mark: 'EVENT\nFLOW', tone: 'violet', tags: ['Events', 'Bookings', 'Services'] },
  { id: 'pulse-fit', name: 'Pulse Fit', category: 'Beauty & wellness', fit: 'For fitness studios', description: 'Manage classes, trainers, schedules, and member bookings.', mark: 'PULSE', tone: 'lime', tags: ['Fitness', 'Classes', 'Memberships'] },
];

const CATEGORIES = ['Everything', 'Retail & fashion', 'Beauty & wellness', 'Food & hospitality', 'Creative & professional', 'Events & experiences'];
const signupHref = (platform: Platform) => {
  const params = new URLSearchParams({ role: 'seller', platform: platform.id, theme: platform.id, redirect: getThemeDashboardRoute(platform.id) });
  return `/register?${params.toString()}`;
};

export const IyonicShop: React.FC<IyonicShopProps> = ({ onSignIn }) => {
  const [category, setCategory] = useState('Everything');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PLATFORMS.filter((item) => (category === 'Everything' || item.category === category)
      && (!needle || [item.name, item.fit, item.category, item.description, ...item.tags].join(' ').toLowerCase().includes(needle)));
  }, [category, query]);
  const featured = PLATFORMS[0];

  return (
    <div className="bizhub-shell">
      <SEO title="BizHub by Iyonicorp — Find your business platform" description="Choose a platform designed around the way your business works. Start with your business type, then build your customer experience with Iyoni." keywords="BizHub, business platforms, storefront themes, business tools, Iyonicorp" canonical="https://iyonicorp.com/bizhub" />
      <GlobalHeader context="BizHub" />

      <main>
        <section className="bh-intro" aria-labelledby="bh-title">
          <div className="bh-intro-copy">
            <p className="bh-kicker"><span /> IYONICORP BUSINESS HUB <span className="bh-kicker-line" /></p>
            <h1 id="bh-title">The right platform<br />for <em>your kind</em> of business.</h1>
            <p className="bh-lede">Start with what you do. We’ll help you find the platform built for it — so your storefront, tools, and customer experience start on the same page.</p>
            <div className="bh-intro-actions"><a className="bh-primary" href="#platforms">Find your platform <ArrowRight size={17} /></a><button type="button" onClick={onSignIn}>Already have an account? <span>Log in</span></button></div>
            <p className="bh-note"><Sparkles size={14} /> Choose your business setup first. Your workspace follows.</p>
          </div>
          <div className="bh-feature" aria-label="Featured platform: Modern E-commerce">
            <div className="bh-feature-top"><span>BUILT FOR THE WAY YOU SELL</span><span>01 / 12</span></div>
            <div className="bh-feature-art bh-art-sand"><span className="bh-art-label">FORM / FUNCTION</span><span className="bh-art-wordmark">M / E</span><span className="bh-art-orbit" /><span className="bh-art-product">OBJECTS<br />FOR EVERYDAY</span><span className="bh-art-small">Modern E-commerce</span></div>
            <div className="bh-feature-bottom"><div><span>FEATURED STARTING POINT</span><strong>{featured.name}</strong></div><Link to={signupHref(featured)} aria-label="Choose Modern E-commerce"><ArrowUpRight size={20} /></Link></div>
          </div>
          <div className="bh-vertical-note" aria-hidden="true">BUSINESS, BUILT AROUND YOU</div>
        </section>

        <section className="bh-proof" aria-label="How BizHub works"><div><b>01</b><span><strong>Find your fit</strong><small>Choose a platform for your business</small></span></div><i /><div><b>02</b><span><strong>Set up your workspace</strong><small>Sign up with your platform selected</small></span></div><i /><div><b>03</b><span><strong>Welcome your customers</strong><small>They land in your platform experience</small></span></div><span className="bh-proof-aside">ONE BUSINESS. ONE HOME.</span></section>

        <section id="platforms" className="bh-catalog" aria-labelledby="bh-catalog-title">
          <div className="bh-catalog-heading"><div><p className="bh-kicker">A BETTER PLACE TO BEGIN</p><h2 id="bh-catalog-title">What do you <em>do?</em></h2></div><p>Every business has its own rhythm. Pick the one that sounds like yours.</p></div>
          <div className="bh-tools"><div className="bh-tabs" role="group" aria-label="Filter platforms by business category">{CATEGORIES.map((item) => <button key={item} type="button" className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="bh-search"><Search size={17} /><span className="sr-only">Search platforms</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a business or platform" /></label></div>

          {filtered.length ? <div className="bh-grid">{filtered.map((platform, index) => <article className="bh-card" key={platform.id} style={{ '--bh-i': index } as React.CSSProperties}>
            <div className={`bh-card-art bh-art-${platform.tone}`}><span className="bh-card-meta">{platform.category}</span><span className="bh-card-mark">{platform.mark.split('\n').map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</span><span className="bh-card-art-index">IYONI / {String(PLATFORMS.indexOf(platform) + 1).padStart(2, '0')}</span></div>
            <div className="bh-card-body"><span className="bh-card-fit">{platform.fit}</span><h3>{platform.name}</h3><p>{platform.description}</p><div className="bh-tags">{platform.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><Link to={signupHref(platform)} className="bh-card-link">Choose this platform <ArrowRight size={16} /></Link></div>
          </article>)}</div> : <div className="bh-empty"><strong>No platform found yet.</strong><span>Try another search or browse every platform in the collection.</span><button type="button" onClick={() => { setQuery(''); setCategory('Everything'); }}>Clear filters</button></div>}
          <div className="bh-all-platforms"><span>Looking for a different kind of business?</span><Link to="/themes">Browse all platforms <ArrowUpRight size={16} /></Link></div>
        </section>

        <section className="bh-close"><div className="bh-close-index">YOUR NEXT MOVE <span>—</span> 03</div><div><p>Start with the business<br />you’re <em>building.</em></p><span>Choose your platform first. Your signup and business workspace will be ready for it.</span></div><Link to={signupHref(featured)}>Explore your options <ArrowRight size={17} /></Link><span className="bh-close-orbit" aria-hidden="true" /></section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default IyonicShop;
