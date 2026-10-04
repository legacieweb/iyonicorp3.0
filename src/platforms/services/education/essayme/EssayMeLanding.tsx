import React from 'react';
import { ArrowDown, ArrowRight, BookOpenText, Check, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../../../components/SEO';
import './essayme-landing.css';

const scrollToSection = (sectionId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  document.getElementById(sectionId)?.scrollIntoView({ behavior, block: 'start' });
};

const EssayMeLanding: React.FC = () => (
  <main className="essayme-landing">
    <SEO title="tutorme" description="Find a tutor who makes learning click. Discover subject experts, book tutoring sessions, and manage your learning in one place." keywords="tutors, tutoring marketplace, online tutoring, tutorme" />

    <header className="em-landing-header">
      <Link className="em-landing-brand" to="/utorme" aria-label="tutorme home">
        <span className="em-landing-mark"><BookOpenText size={20} /></span>
        <span>tutor<span>me</span><small>LEARNING, TOGETHER</small></span>
      </Link>
      <nav aria-label="tutorme navigation">
        <a href="#how-it-works" onClick={scrollToSection('how-it-works')}>How it works</a>
        <a href="#for-tutors" onClick={scrollToSection('for-tutors')}>For tutors</a>
        <Link to="/themes">Platform themes</Link>
      </nav>
      <div className="em-header-actions"><Link to="/login?redirect=%2Futorme%2Fstudent">Student sign in</Link><Link className="em-header-cta" to="/login?theme=utorme&redirect=%2Futorme%2Ftutor">Tutor sign in <ArrowRight size={15} /></Link></div>
    </header>

    <section className="em-hero">
      <div className="em-hero-inner">
        <div className="em-hero-copy">
          <p className="em-eyebrow"><span /> THE RIGHT GUIDE CHANGES EVERYTHING</p>
          <h1>tutorme<span>.</span></h1>
          <p className="em-hero-lede">Find your person.<br /><em>Make learning click.</em></p>
          <p className="em-hero-description">Meet tutors who know their subject, understand how you learn, and help you move forward one great session at a time.</p>
          <div className="em-hero-actions">
            <Link className="em-button-primary" to="/register?platform=utorme&role=customer&redirect=%2Futorme%2Fstudent">Find a tutor <ArrowRight size={17} /></Link>
            <Link className="em-button-text" to="/login?redirect=%2Futorme%2Fstudent">Student sign in <ArrowDown size={15} /></Link>
          </div>
          <div className="em-hero-trust"><ShieldCheck size={16} /><span>Good tutors build skills that stay with you.</span></div>
        </div>

        <div className="em-hero-art" aria-label="Preview of a tutoring session and tutor guidance">
          <div className="em-art-kicker"><Sparkles size={13} /> YOUR NEXT SESSION · BIOLOGY</div>
          <article className="em-art-assignment">
            <span className="em-art-label">LEARNING WITH DR. MAYA</span>
            <h2>Cells, energy<br />& the big picture.</h2>
            <p>Connect each step of cellular respiration and see where the energy goes.</p>
            <div className="em-art-lines"><i /><i /><i /><i /></div>
            <span className="em-art-page-number">1:1 SESSION · 45 MIN</span>
          </article>
          <article className="em-art-tutor-note">
            <span><span className="em-art-avatar">M</span><b>Maya <small>BIOLOGY TUTOR</small></b><Check size={14} /></span>
            <p>Let’s draw the pathway together. Where should we start?</p>
            <small>Patient explanations. No question too small.</small>
          </article>
          <div className="em-art-index"><MessageCircle size={15} /><span>One-to-one support<br /><b>that fits your goals</b></span></div>
          <span className="em-art-stamp">LEARN<br />YOUR WAY</span>
        </div>
      </div>
      <div className="em-hero-bottom"><span>MATH</span><i /><span>SCIENCE</span><i /><span>LANGUAGES</span><i /><span>EXAM PREP</span><span className="em-scroll-cue">SCROLL TO EXPLORE <ArrowDown size={13} /></span></div>
    </section>

    <section className="em-process" id="how-it-works">
      <div className="em-section-intro"><p className="em-eyebrow">LEARNING THAT MOVES WITH YOU</p><h2>Find your rhythm.<br /><em>Build real confidence.</em></h2><p>From one tricky topic to a new skill, get support that starts with your goals.</p></div>
      <div className="em-steps">
        <article><span className="em-step-number">01</span><div className="em-step-icon"><BookOpenText size={19} /></div><h3>Find your tutor</h3><p>Explore tutor subjects, experience, teaching styles, availability, and session rates.</p></article>
        <article><span className="em-step-number">02</span><div className="em-step-icon"><MessageCircle size={19} /></div><h3>Plan a session</h3><p>Share what you want to learn, choose a time, and message your tutor before you meet.</p></article>
        <article><span className="em-step-number">03</span><div className="em-step-icon"><Sparkles size={19} /></div><h3>Keep the momentum</h3><p>Build skills over time with sessions shaped around your pace, questions, and goals.</p></article>
      </div>
    </section>

    <section className="em-promise" id="our-promise">
      <div className="em-promise-mark"><ShieldCheck size={23} /></div>
      <div className="em-promise-copy"><p className="em-eyebrow">THE UTORME STANDARD</p><h2>Good tutors. Clear expectations.</h2><p>Choose a tutor based on their subject experience, session style, and availability. Learn together in a space built for respectful, focused conversations.</p></div>
      <div className="em-promise-points"><span><Check size={15} /> Tutor-led subject profiles</span><span><Check size={15} /> Clear session details</span><span><Check size={15} /> Direct student messaging</span></div>
    </section>

    <section className="em-price-band">
      <div><p className="em-eyebrow">PICK THE SUPPORT THAT FITS</p><h2>See the session.<br />Know the rate.</h2></div>
      <p>Compare tutor profiles and services before you book. Your student account keeps your sessions, messages, and learning plans together.</p>
      <Link className="em-button-primary" to="/register?platform=utorme&role=customer&redirect=%2Futorme%2Fstudent">Create student account <ArrowRight size={17} /></Link>
      <small>Student accounts are separate from tutor business accounts.</small>
    </section>

    <section className="em-tutor-cta" id="for-tutors">
      <div><p className="em-eyebrow">FOR SUBJECT EXPERTS AND EDUCATORS</p><h2>Build a tutoring practice<br /><em>that feels like you.</em></h2></div>
      <p>Create your tutor profile, list your services, manage sessions, and keep up with student conversations from your seller dashboard.</p>
      <div className="em-tutor-actions"><Link className="em-button-dark" to="/register?platform=utorme&role=seller&theme=utorme&redirect=%2Fthemes%3Fapply%3Dutorme">Create tutor account <ArrowRight size={16} /></Link><Link className="em-tutor-login" to="/login?theme=utorme&redirect=%2Futorme%2Ftutor">Tutor sign in</Link></div>
    </section>

    <footer className="em-landing-footer"><Link className="em-landing-brand" to="/utorme"><span className="em-landing-mark"><BookOpenText size={18} /></span><span>tutor<span>me</span><small>LEARNING, TOGETHER</small></span></Link><span>Learn your way.</span><span>Student and tutor accounts have separate workspaces.</span></footer>
  </main>
);

export default EssayMeLanding;