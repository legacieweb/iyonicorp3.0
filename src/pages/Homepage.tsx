import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Bot, CalendarDays, Check, CreditCard, Database, Mail, Scissors, ShoppingBag, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import { HomepageFooter } from '../components/HomepageFooter';
import GlobalHeader from '../components/GlobalHeader';
import './Homepage.css';

const tools = [
  { name: 'BizHub', role: 'Build your online business', copy: 'A flexible business platform for services and products.', href: '/bizhub', icon: ShoppingBag, color: 'mint' },
  { name: 'IyonicPay', role: 'Get paid', copy: 'Checkout and business payments.', href: '/iyonicpay', icon: CreditCard, color: 'blue' },
  { name: 'Iyonic Intelligence', role: 'AI conversations & automation', copy: 'Intelligent customer conversations and business workflows.', href: '/iyonicintelligence', icon: Bot, color: 'mint' },
  { name: 'IyonicDB', role: 'Know your business', copy: 'Organized information for daily work.', href: '/iyonicdb', icon: Database, color: 'sand' },
  { name: 'IyonicMailer', role: 'Stay in touch', copy: 'Email updates and customer campaigns.', href: '/iyonic-mailer', icon: Mail, color: 'rose' },
];

const businesses = [
  { title: 'Services', examples: 'Salons · Consultants · Studios · Fitness', icon: Scissors, shade: 'business-service' },
  { title: 'Places & experiences', examples: 'Restaurants · Events · Local businesses', icon: CalendarDays, shade: 'business-place' },
  { title: 'Products', examples: 'Independent makers · Retail · Growing brands', icon: ShoppingBag, shade: 'business-product' },
];

export const Homepage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('.home-reimagined .ir-reveal');
    if (!('IntersectionObserver' in window)) return;
    sections.forEach((section) => { section.dataset.revealReady = 'true'; });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).dataset.revealed = 'true';
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!location.hash) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  return (
  <div className="home-reimagined">
    <SEO title="IYONICORP — Start, run, and automate your business" description="IYONICORP connects the tools to build an online business, manage payments and customer relationships, organize business information, and automate everyday work." keywords="IYONICORP, business ecosystem, business platform, service business, business tools, payments, automation" canonical="https://iyonicorp.com/" />
    <GlobalHeader signupHref="/#products" />
    <main>
      <section className="ir-hero">
        <div className="ir-hero-copy">
          <p className="ir-kicker"><span className="ir-kicker-dot" /> YOUR BUSINESS, CONNECTED BY IYONICORP</p>
          <h1>Start.<br /><em>Run.</em><br />Automate.</h1>
          <p className="ir-intro">IYONICORP brings business tools together in one ecosystem. Build your online presence, manage payments and customer relationships, organize information, and automate everyday work.</p>
          <p className="ir-inclusive">For service businesses, independent professionals, local businesses, product sellers, and growing teams.</p>
          <div className="ir-hero-actions">
            <Link className="ir-button ir-button-dark" to="/bizhub#your-path">Build your business <ArrowRight size={17} /></Link>
            <a className="ir-link" href="#ecosystem">Explore the platform <ArrowDown size={15} /></a>
          </div>
          <div className="ir-hero-foot"><span>ONE PLACE TO BEGIN</span><i /><span>ROOM FOR WHAT’S NEXT</span></div>
        </div>

        <div className="ir-scene" aria-label="A service business and a product business supported by the IYONICORP ecosystem">
          <div className="ir-scene-top"><span><b className="ir-symbol">I</b> DIFFERENT BUSINESSES</span><span>ONE CONNECTED ECOSYSTEM <ArrowUpRight size={13} /></span></div>
          <div className="ir-preview-stack">
            <article className="ir-site-card ir-salon">
              <div className="ir-site-nav"><strong>FORM / STUDIO</strong><span>ABOUT&nbsp;&nbsp; SERVICES&nbsp;&nbsp; BOOK</span></div>
              <div className="ir-salon-body"><span className="ir-site-tag">NAIROBI · PERSONAL CARE</span><h2>A little time<br />for yourself.</h2><p>Thoughtful cuts and color, made around you.</p><span className="ir-booking"><CalendarDays size={13} /> BOOK AN APPOINTMENT <ArrowUpRight size={12} /></span></div>
              <span className="ir-salon-stamp">OPEN<br />TODAY</span>
            </article>
            <article className="ir-site-card ir-goods">
              <div className="ir-goods-cover"><div className="ir-ceramic" aria-hidden="true"><i /><b /></div><span>FIELD<br />OBJECTS</span></div>
              <div className="ir-goods-info"><small>MADE SLOWLY, USED DAILY</small><strong>Pieces for<br />the everyday.</strong><span>SHOP COLLECTION <ArrowUpRight size={12} /></span></div>
            </article>
            <div className="ir-connect-label"><span /> PRODUCTS AND SERVICES. CONNECTED BUSINESS TOOLS.</div>
          </div>
          <div className="ir-scene-base"><span><Check size={12} /> ONLINE PRESENCE</span><span><Check size={12} /> GET PAID</span><span><Check size={12} /> AUTOMATE</span></div>
          <div className="ir-floating-note"><Sparkles size={15} /><span><b>Tools for the work behind your business</b><small>Connected by IYONICORP</small></span></div>
        </div>
        <span className="ir-hero-index" aria-hidden="true">01 / BUSINESS, IN MOTION</span>
      </section>

      <section className="ir-manifesto" aria-label="IYONICORP business platform"><span>THE IYONICORP PLATFORM</span><strong>Start with your business.</strong><i>→</i><strong>Connect the work around it.</strong><span>START · RUN · AUTOMATE</span></section>

      <section className="ir-businesses ir-reveal" id="businesses">
        <div className="ir-section-intro"><div><p className="ir-kicker"><span className="ir-kicker-dash" /> BUILT AROUND HOW YOU DO BUSINESS</p><h2>Every kind of<br /><em>business belongs.</em></h2></div><p>The IYONICORP ecosystem supports the way different businesses work: build an online presence, serve customers, get paid, stay organized, and keep routine work moving.</p></div>
        <div className="ir-business-list">{businesses.map(({ title, examples, icon: Icon, shade }, index) => <article className={`ir-business-row ${shade}`} key={title}><span className="ir-business-number">0{index + 1}</span><div className="ir-business-icon"><Icon size={21} strokeWidth={1.6} /></div><h3>{title}</h3><p>{examples}</p></article>)}</div>
        <div className="ir-bizhub-line"><span className="ir-bizhub-word">A CONNECTED SYSTEM</span><p>From your online business presence to payments, customer communication, information, and automation—each part supports how you work.</p><Link to="/#ecosystem">See how it connects <ArrowRight size={15} /></Link></div>
      </section>

      <section className="ir-ecosystem ir-reveal" id="ecosystem">
        <div className="ir-eco-heading" id="products"><div><p className="ir-kicker"><span className="ir-kicker-dash" /> ONE CONNECTED ECOSYSTEM</p><h2>One ecosystem.<br />Every part of <em>business.</em></h2></div><p>Each IYONICORP product has a clear role. Together, they help your business show up online, handle everyday operations, serve customers, and automate repeat work.</p></div>
        <div className="ir-eco-layout">
          <div className="ir-eco-core"><span className="ir-core-orbit ir-orbit-a" /><span className="ir-core-orbit ir-orbit-b" /><span className="ir-core-kicker">YOUR BUSINESS ECOSYSTEM</span><strong>IYONICORP</strong><p>Start. Run. Automate.</p><Link to="/about">How it works <ArrowUpRight size={14} /></Link><span className="ir-core-dot" /></div>
          <div className="ir-tools">{tools.map(({ name, role, copy, href, icon: Icon, color }, index) => <Link to={href} className={`ir-tool ir-tool-${color}`} key={name}><span className="ir-tool-index">0{index + 1}</span><span className="ir-tool-icon"><Icon size={19} strokeWidth={1.7} /></span><span className="ir-tool-copy"><small>{role}</small><strong>{name}</strong><span>{copy}</span></span><ArrowUpRight className="ir-tool-arrow" size={17} /></Link>)}</div>
        </div>
        <div className="ir-eco-caption"><span>CONNECTED BY YOUR BUSINESS</span><i /><span>USE WHAT YOU NEED, WHEN YOU NEED IT</span></div>
      </section>

      <section className="ir-lifecycle ir-reveal">
        <div className="ir-lifecycle-title"><p className="ir-kicker"><span className="ir-kicker-dash" /> YOUR BUSINESS, AT EVERY STAGE</p><h2>Begin with an idea.<br /><em>Build into what’s next.</em></h2></div>
        <div className="ir-lifecycle-steps">
          <article><span className="ir-step-index">01 <i /></span><h3>Start</h3><p>Build an online business that fits what you do, from a service-led website to a place to present and sell products.</p><Link to="/bizhub">Build with BizHub <ArrowRight size={14} /></Link></article>
          <article><span className="ir-step-index">02 <i /></span><h3>Run</h3><p>Bring payments, customer communication, and business information together with IyonicPay, IyonicMailer, and IyonicDB.</p><Link to="/iyonicpay">Explore business tools <ArrowRight size={14} /></Link></article>
          <article><span className="ir-step-index">03 <i /></span><h3>Automate</h3><p>Use Iyonic Intelligence to support repeat conversations and workflows, so there’s more room for the work that moves you forward.</p><Link to="/iyonicintelligence">Explore Iyonic Intelligence <ArrowRight size={14} /></Link></article>
        </div>
      </section>

      <section className="ir-final ir-reveal"><div className="ir-final-note"><span>YOUR NEXT MOVE</span><i /></div><div className="ir-final-content"><div><p className="ir-kicker"><span className="ir-kicker-dot" /> MADE FOR THE WORK YOU DO</p><h2>Make room<br />to <em>build.</em></h2></div><div className="ir-final-action"><p>Start with your business. Bring the right tools together as you go.</p><Link to="/bizhub#your-path" className="ir-button ir-button-light">Get started with IYONICORP <ArrowRight size={17} /></Link><Link className="ir-final-about" to="/about">Get to know IYONICORP <ArrowUpRight size={14} /></Link></div></div><div className="ir-final-bottom"><span>START · RUN · AUTOMATE</span><span>IYONICORP <b>I.</b></span></div><span className="ir-final-disc" aria-hidden="true" /></section>
    </main>
    <HomepageFooter />
  </div>
);
};

export default Homepage;
