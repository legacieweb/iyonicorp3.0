import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bot, Check, CreditCard, Database, Mail, ShoppingBag } from 'lucide-react';
import SEO from '../components/SEO';
import { HomepageFooter } from '../components/HomepageFooter';
import GlobalHeader from '../components/GlobalHeader';
import './Homepage.css';

const products = [
  { name: 'BizHub', kind: 'COMMERCE', copy: 'Set up a storefront and bring your products to the people who want them.', href: '/bizhub', icon: ShoppingBag, hue: 'shop', detail: 'Storefront · Products · Orders' },
  { name: 'IyonicPay', kind: 'PAYMENTS', copy: 'A simple way to receive payments for the work you sell online.', href: '/iyonicpay', icon: CreditCard, hue: 'pay', detail: 'Payments · Checkout' },
  { name: 'IyonicBots', kind: 'AUTOMATION', copy: 'Build helpful bot experiences for the conversations your business has.', href: '/iyonicbots', icon: Bot, hue: 'bots', detail: 'Bots · Conversations' },
  { name: 'IyonicDB', kind: 'DATA', copy: 'A database product for organizing the information behind your work.', href: '/iyonicdb', icon: Database, hue: 'db', detail: 'Data · Records' },
  { name: 'IyonicMailer', kind: 'MESSAGING', copy: 'Send email to keep in touch with your customers and community.', href: '/iyonic-mailer', icon: Mail, hue: 'mailer', detail: 'Email · Campaigns' },
];

export const Homepage: React.FC = () => {
  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>('.home-signal [data-reveal]');
    if (!('IntersectionObserver' in window)) return;
    revealItems.forEach((item) => item.dataset.revealReady = 'true');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).dataset.revealed = 'true';
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
  <div className="home-shell home-signal">
    <SEO title="Iyonicorp — Tools for what you're building" description="Explore Iyonicorp products, themes, and platforms for building and running a business." keywords="Iyonicorp, BizHub, IyonicPay, IyonicBots, IyonicDB, IyonicMailer" canonical="https://iyonicorp.com/" />
    <GlobalHeader />
    <main>
      <section className="signal-hero">
        <div className="signal-hero-grid" aria-hidden="true" />
        <div className="signal-hero-copy">
          <p className="signal-eyebrow"><span className="signal-live" /> INDEPENDENT TOOLS. ONE PLACE TO START.</p>
          <h1>Make room<br />for <span>what's next.</span></h1>
          <p className="signal-lede">Build the business behind your idea with practical tools for selling, payments, automation, data, and email.</p>
          <div className="signal-actions"><a className="signal-button signal-button-lime" href="#products">Explore products <ArrowDownRight size={17} /></a><Link className="signal-text-link" to="/register?role=seller">Get started <ArrowUpRight size={16} /></Link></div>
          <div className="signal-hero-caption"><span>THE IYONICORP TOOLKIT</span><i /> BUILT TO WORK YOUR WAY</div>
        </div>
        <div className="toolchain" aria-label="Explore the Iyonicorp toolkit: five linked products">
          <div className="chain-spine" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <div className="chain-heading"><span>THE IYONICORP TOOLCHAIN</span><span>01—05</span></div>
          <div className="chain-origin"><span className="origin-sun" aria-hidden="true">I</span><div><strong>Build something.</strong><small>Choose the tools that move it forward.</small></div><span className="origin-arrow">↘</span></div>
          <div className="chain-nodes">{products.map(({ name, icon: Icon, hue, detail, href }, index) => <Link key={name} to={href} className={`chain-node node-${hue}`}><span className="node-number">0{index + 1}</span><span className="node-icon"><Icon size={index === 0 ? 25 : 20} strokeWidth={1.7} /></span><span className="node-wordmark">{name}</span><span className="node-detail">{detail}</span><ArrowUpRight className="node-arrow" size={16} /></Link>)}</div>
          <div className="chain-foot"><span>TOOLS WITH A JOB TO DO</span><span>CHOOSE YOUR ROUTE ↗</span></div>
        </div>
        <div className="hero-vertical" aria-hidden="true">PRODUCTS FOR PEOPLE IN MOTION</div>
      </section>

      <section className="signal-manifesto" data-reveal><span className="manifesto-index">01 / TOOLKIT</span><p>Start with the piece you need.<br /><span>Let the rest follow.</span></p><span className="manifesto-note">FIVE PRACTICAL PRODUCTS<br />FOR THE DAILY WORK OF BUSINESS</span></section>

      <section className="signal-products" id="products" data-reveal>
        <div className="signal-section-head"><div><p className="signal-eyebrow"><span className="signal-mark" /> THE PRODUCTS</p><h2>Five ways to<br /><span>move forward.</span></h2></div><div className="signal-products-aside"><p>Tools for the real work of building a business. Start with what you need; discover the rest when you’re ready.</p><span>01—05 <i /> EXPLORE THE COLLECTION</span></div></div>
        <div className="product-grid">{products.map(({ name, kind, copy, href, icon: Icon, hue, detail }, index) => <Link to={href} className={`product-card card-${hue}`} key={name}><div className="product-card-top"><span className="product-number">0{index + 1} <i /> {kind}</span><span className="product-card-icon"><Icon size={20} strokeWidth={1.65} /></span></div><div className="product-card-copy"><h3>{name}</h3><p>{copy}</p></div><div className="product-card-footer"><span>{detail}</span><span className="product-card-arrow"><ArrowUpRight size={17} /></span></div><span className="product-card-orbit" aria-hidden="true" /></Link>)}</div>
      </section>

      <section className="signal-platforms" data-reveal><div className="platform-grid" aria-hidden="true" /><div className="platform-copy"><p className="signal-eyebrow"><span className="signal-mark" /> THEMES &amp; PLATFORMS</p><h2>Choose how<br />you <span>show up.</span></h2><p>Browse free themes, acquire a VIP SaaS platform to manage from your owner dashboard, or explore private platforms operated by their owners.</p><Link to="/themes" className="signal-button signal-button-outline">Explore themes &amp; platforms <ArrowRight size={16} /></Link></div><div className="platform-options"><div className="platform-options-head"><span>WAYS TO GET STARTED</span><span>02 / 03</span></div><div className="platform-option"><span className="option-symbol">01</span><div><strong>Free themes</strong><small>Choose a theme for your storefront.</small></div><span className="option-state"><Check size={13} /> FREE</span></div><div className="platform-option"><span className="option-symbol">02</span><div><strong>VIP SaaS platforms</strong><small>Acquire and manage through your owner dashboard.</small></div><span className="option-state">ACQUIRE</span></div><div className="platform-option"><span className="option-symbol">03</span><div><strong>Private platforms</strong><small>Platforms operated by their owners.</small></div><span className="option-state">PRIVATE</span></div><div className="platform-options-footer"><span>FIND THE RIGHT FIT</span><span>↗ IYONICORP.COM/THEMES</span></div></div></section>

      <section className="signal-close" data-reveal><div className="close-topline"><span>READY WHEN YOU ARE</span><span>IONICORP / 01</span></div><div className="close-main"><div><p className="signal-eyebrow"><span className="signal-live" /> YOUR NEXT MOVE STARTS HERE</p><h2>Make the next<br /><span>thing happen.</span></h2></div><div className="close-action"><p>Choose a tool and make a start.<br />You can build the rest as you go.</p><Link to="/register?role=seller" className="signal-button signal-button-dark">Build with Iyonicorp <ArrowRight size={17} /></Link></div></div><div className="close-bottom"><span>GOOD IDEAS, PUT TO WORK.</span><span className="close-mark" aria-hidden="true">I.</span></div><div className="close-orbit" aria-hidden="true"><span /></div></section>
    </main>
    <HomepageFooter />
  </div>
  );
};

export default Homepage;
