import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles, Store, Layers3 } from 'lucide-react';
import SEO from '../components/SEO';
import GlobalHeader from '../components/GlobalHeader';
import { HomepageFooter } from '../components/HomepageFooter';
import './bizhub.css';

interface IyonicShopProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
  onSignIn?: () => void;
}

const managerSignupHref = '/register?role=seller_manager';


export const IyonicShop: React.FC<IyonicShopProps> = ({ onSignIn }) => {
  const location = useLocation();
  useEffect(() => {
    if (location.hash !== '#your-path') return;
    const frame = window.requestAnimationFrame(() => document.getElementById('your-path')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  return (
    <div className="bizhub-shell">
      <SEO title="BizHub by Iyonicorp — Find your business platform" description="Choose whether to run one business or manage a portfolio, then find the right Iyonicorp platform for each business." keywords="BizHub, business management, merchant account, manager account, Iyonicorp platforms" canonical="https://iyonicorp.com/bizhub" />
      <GlobalHeader context="BizHub" signupHref="/bizhub#your-path" />

      <main>
        <section className="bh-intro" aria-labelledby="bh-title">
          <div className="bh-intro-copy">
            <p className="bh-kicker"><span /> IYONICORP BUSINESS HUB <span className="bh-kicker-line" /></p>
            <h1 id="bh-title">One business<br />or a <em>whole portfolio.</em></h1>
            <p className="bh-lede">BizHub brings Iyonicorp’s business platforms together. Choose the path that fits you: run one business yourself, or manage infrastructure and services across multiple businesses.</p>
            <div className="bh-intro-actions"><Link className="bh-primary" to="/bizhub#your-path">Choose your path <ArrowRight size={17} /></Link><button type="button" onClick={onSignIn}>Already have an account? <span>Log in</span></button></div>
            <p className="bh-note"><Sparkles size={14} /> Start with your role. Find the right platform next.</p>
          </div>
          <div className="bh-feature bh-feature-portfolio" aria-label="A portfolio of businesses connected through Iyonicorp infrastructure">
            <div className="bh-feature-top"><span>ONE INFRASTRUCTURE</span><span>01 / MANY</span></div>
            <div className="bh-portfolio-art"><span className="bh-portfolio-orbit bh-orbit-one" /><span className="bh-portfolio-orbit bh-orbit-two" /><span className="bh-portfolio-core">IYONI<br /><small>INFRASTRUCTURE</small></span><span className="bh-portfolio-node bh-node-one">STORE</span><span className="bh-portfolio-node bh-node-two">SERVICE</span><span className="bh-portfolio-node bh-node-three">STUDIO</span><span className="bh-portfolio-node bh-node-four">MORE</span></div>
            <div className="bh-feature-bottom"><div><span>YOUR BUSINESS. YOUR SCALE.</span><strong>One workspace or a portfolio</strong></div><Link to="/bizhub#your-path" aria-label="Choose a BizHub path"><ArrowUpRight size={20} /></Link></div>
          </div>
          <div className="bh-vertical-note" aria-hidden="true">BUSINESS, BUILT AROUND YOU</div>
        </section>

        <section id="your-path" className="bh-paths" aria-labelledby="bh-paths-title">
          <div className="bh-paths-heading"><p className="bh-kicker">TWO WAYS TO BUILD WITH IYONICORP</p><h2 id="bh-paths-title">Choose the role<br />that <em>fits your ambition.</em></h2><p>Start with one business, or build a portfolio by helping multiple businesses run on Iyonicorp infrastructure.</p></div>
          <article className="bh-path bh-path-merchant"><div className="bh-path-icon"><Store size={21} /></div><span className="bh-path-number">01 / MERCHANT</span><h3>Running one business?</h3><p>Set up your own business workspace and choose a platform shaped around the way you sell or serve customers.</p><ul><li>Choose a business platform</li><li>Create your seller account</li><li>Build your business in its own workspace</li></ul><Link className="bh-path-cta" to="/themes">Explore business platforms <ArrowRight size={17} /></Link><span className="bh-path-footnote" style={{ color: '#727972' }}>Your seller role is selected when you choose a platform</span></article>
          <article className="bh-path bh-path-manager"><div className="bh-path-icon"><Layers3 size={21} /></div><span className="bh-path-number">02 / MANAGER</span><h3>Managing more than one?</h3><p>Use a manager account to bring multiple businesses into a portfolio and help each one adopt the Iyonicorp platforms and infrastructure that fit its work.</p><div className="bh-recurring"><span className="bh-recurring-mark">↻</span><p><strong>Earn as managed businesses sell</strong><br />Link each business to your manager account and support its setup. Your account tracks the configured commission on eligible orders from your managed sellers, so revenue can continue as they sell over time. Earnings depend on qualifying sales and the commission terms in effect.</p></div><Link className="bh-path-cta" to={managerSignupHref}>Create a manager account <ArrowRight size={17} /></Link><span className="bh-path-footnote">Manager role selected during registration</span></article>
        </section>

        <section className="bh-proof" aria-label="Your path with BizHub"><div><b>01</b><span><strong>Choose your role</strong><small>Run one business or manage a portfolio</small></span></div><i /><div><b>02</b><span><strong>Find the right platform</strong><small>Explore themes built for different kinds of work</small></span></div><i /><div><b>03</b><span><strong>Build with Iyonicorp</strong><small>Connect each business to shared infrastructure</small></span></div><span className="bh-proof-aside">BUILT FOR BUSINESS</span></section>

        <section className="bh-theme-handoff" aria-labelledby="bh-theme-title">
          <div className="bh-theme-index">PLATFORM DIRECTORY <span>—</span> 02</div>
          <div className="bh-theme-copy"><p className="bh-kicker">A PLATFORM FOR EVERY WAY OF WORKING</p><h2 id="bh-theme-title">Find your business<br />a <em>good place to grow.</em></h2><p>Explore the dedicated themes page to compare platforms for retail, services, food, creative work, and more. Choose the right fit for each business in your portfolio.</p><Link to="/themes" className="bh-theme-link">Explore all business platforms <ArrowRight size={17} /></Link></div>
          <div className="bh-theme-stamp" aria-hidden="true"><span>ONE BUSINESS<br />OR MANY</span><i>↗</i></div>
        </section>

        <section className="bh-close"><div className="bh-close-index">READY WHEN YOU ARE <span>—</span> 03</div><div><p>Pick your starting point.<br /><em>We’ll build from there.</em></p><span>Choose the merchant or manager path that fits your business.</span></div><Link to="/bizhub#your-path">Choose your path <ArrowRight size={17} /></Link><span className="bh-close-orbit" aria-hidden="true" /></section>
      </main>

      <HomepageFooter />
    </div>
  );
};

export default IyonicShop;
