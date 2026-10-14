import React from 'react';
import { ArrowLeft, ArrowUpRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import GlobalHeader from '../components/GlobalHeader';
import './not-found.css';

const NotFound: React.FC = () => <main className="not-found-page">
  <SEO title="Page not found | Iyonicorp" description="We couldn't find the page you were looking for. Head back to Iyonicorp or explore our products." />
  <GlobalHeader />
  <section className="not-found-content">
    <div className="not-found-art" aria-hidden="true"><div className="not-found-orbit orbit-one" /><div className="not-found-orbit orbit-two" /><div className="not-found-orbit orbit-three" /><span>404</span><i className="not-found-star star-one">✳</i><i className="not-found-star star-two">✦</i><i className="not-found-star star-three">·</i></div>
    <p className="not-found-eyebrow"><Compass size={14} /> WRONG TURN, GOOD COMPANY</p>
    <h1>This page wandered<br /><em>off the map.</em></h1>
    <p className="not-found-copy">The link may be outdated, or the page may have moved. Let’s get you back to something useful.</p>
    <div className="not-found-actions"><Link to="/" className="not-found-primary"><ArrowLeft size={16} /> Back to Iyonicorp</Link><Link to="/themes" className="not-found-secondary">Browse the platform collection <ArrowUpRight size={15} /></Link></div>
    <div className="not-found-links"><span>TRY A PRODUCT</span><Link to="/bizhub">Shop</Link><Link to="/iyonicpay">Pay</Link><Link to="/iyonicintelligence">Iyonic Intelligence</Link><Link to="/iyonicdb">DB</Link><Link to="/iyonic-mailer">Mailer</Link></div>
  </section>
  <footer className="not-found-footer"><span>© {new Date().getFullYear()} Iyonicorp</span><span>Build with room to grow.</span></footer>
</main>;

export default NotFound;
