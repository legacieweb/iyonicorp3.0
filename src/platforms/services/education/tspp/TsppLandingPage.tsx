import React from 'react';
import { ArrowRight, BadgeCheck, Briefcase, Building2, CheckCircle2, Clock, GraduationCap, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../../../components/SEO';
import './tspp-theme.css';

const features = [
  { icon: <Building2 size={20} />, title: 'School profiles', desc: 'Showcase your school identity, values, and recruitment brand in a polished employer hub.' },
  { icon: <Users size={20} />, title: 'Verified talent', desc: 'Attract qualified teachers with trust signals, credential checks, and structured profiles.' },
  { icon: <Briefcase size={20} />, title: 'Hiring workflows', desc: 'Manage shortlists, interviews, candidate notes, and offer stages in one place.' },
  { icon: <GraduationCap size={20} />, title: 'Curriculum fit', desc: 'Filter applicants by subject, age group, location, and culture to match the right teacher.' },
];

const processSteps = [
  { step: '01', title: 'Create a profile', desc: 'Choose a role and add location, skills, experience, photo, and a short description.' },
  { step: '02', title: 'Submit documents', desc: 'Upload a government ID and certificates to verify your identity (KYC).' },
  { step: '03', title: 'Get verified', desc: 'Our team reviews your documents. Once approved, your profile becomes visible to schools.' },
  { step: '04', title: 'Connect and hire', desc: 'Schools message, call, and video interview you directly through TSPP. Report back after each interview.' },
];

const testimonials = [
  { name: 'Sarah Lungren', role: 'Head of HR, Oak Crest Academy', quote: 'TSPP cut our time-to-hire by half. Verified profiles meant every candidate was already cleared for interview.', rating: 5 },
  { name: 'David Mensah', role: 'Science Teacher', quote: 'I verified once and started getting offers from schools that actually matched my expertise.', rating: 5 },
];

const TsppLandingPage: React.FC = () => (
  <main className="tspp-landing-page">
    <SEO
      title="TSPP | Verified hiring for private schools"
      description="TSPP connects private schools with verified teachers and school staff. Post jobs, search verified candidates, and interview — all in one trusted platform."
      keywords="private schools, teacher hiring, school recruitment, education platform, verified teachers, kyc hiring"
    />

    <div className="tspp-topbar-inner">
      <div className="tspp-brand" aria-label="TSPP home">
        <span className="tspp-brand-mark">T</span>
        <div className="tspp-brand-text">
          <strong>TSPP</strong>
          <small>Teachers &amp; Private Schools</small>
        </div>
      </div>

      <nav className="tspp-nav" aria-label="TSPP navigation">
        <a href="#platform">Platform</a>
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
        <a href="#testimonials">Testimonials</a>
        <Link to="/themes">Themes</Link>
      </nav>

      <div className="tspp-actions">
        <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fadmin" className="tspp-btn tspp-btn-ghost">School sign in</Link>
        <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-ghost">Teacher sign in</Link>
        <Link to="/register?theme=tspp&role=seller&redirect=%2Ftspp%2Fadmin" className="tspp-btn tspp-btn-primary">
          Book a demo <ArrowRight size={16} />
        </Link>
      </div>
    </div>

    <section className="tspp-hero" style={{ paddingTop: '4rem', paddingBottom: '3rem' }}>
      <div className="tspp-hero-copy">
        <div className="tspp-kicker">
          <span className="tspp-badge tspp-badge-premium"><Sparkles size={14} /> Verified hiring platform</span>
        </div>

        <h1>Verified teachers. Trusted schools. One hiring flow.</h1>
        <p className="tspp-subheading">
          TSPP removes the guesswork from private school hiring. Job seekers verify their credentials once and become visible to registered schools. Schools post adverts, search verified candidates, and interview — all on a platform built for trust.
        </p>

        <div className="tspp-cta-row">
          <Link to="/register?theme=tspp&role=seller&redirect=%2Ftspp%2Fadmin" className="tspp-btn tspp-btn-primary tspp-btn-primary-large">
            Get started for your school <ArrowRight size={17} />
          </Link>
          <Link to="/register?theme=tspp&role=customer&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-ghost">Apply as a teacher</Link>
        </div>

        <div className="tspp-proof-row">
          <div className="tspp-proof">
            <strong>1,200+</strong>
            <span>teachers verified</span>
          </div>
          <div className="tspp-proof">
            <strong>98%</strong>
            <span>hire-to-shortlist rate</span>
          </div>
          <div className="tspp-proof">
            <strong>24 hrs</strong>
            <span>average response time</span>
          </div>
        </div>
      </div>

      <div className="tspp-hero-panel" aria-label="TSPP platform preview">
        <div className="tspp-panel-header">
          <span className="tspp-dot" />
          <span className="tspp-dot" />
          <span className="tspp-dot" />
        </div>

        <div className="tspp-panel-card">
          <div className="tspp-card-topline">
            <span className="tspp-badge tspp-badge-live">Verified talent</span>
            <span className="tspp-pill tspp-pill-muted">School-ready</span>
          </div>

          <div className="tspp-card-main">
            <div>
              <p className="tspp-label">Featured teacher</p>
              <h2>Ms. Amina Okafor</h2>
            </div>
            <div className="tspp-avatar">AO</div>
          </div>

          <div className="tspp-score-row">
            <span><Star size={14} fill="currentColor" /> 4.9 rating</span>
            <span><ShieldCheck size={14} /> Background checked</span>
          </div>

          <ul className="tspp-list">
            <li><BadgeCheck size={14} className="text-tspp-mint" /> 7+ years teaching primary science</li>
            <li><BadgeCheck size={14} className="text-tspp-mint" /> IB and British curriculum experience</li>
            <li><BadgeCheck size={14} className="text-tspp-mint" /> Available for full-time and contract roles</li>
          </ul>

          <div className="tspp-card-footer">
            <div>
              <small>School match score</small>
              <strong>96%</strong>
            </div>
            <button type="button" className="tspp-btn tspp-btn-mini">View profile</button>
          </div>
        </div>
      </div>
    </section>

    <section className="tspp-section tspp-feature-band" id="platform">
      <div className="tspp-section-heading">
        <p className="tspp-kicker">A PREMIUM HIRING EXPERIENCE</p>
        <h2>Everything private schools need — nothing noisy.</h2>
        <p>No more sifting through unverified applications. TSPP brings structure, trust, and brand to every step of the hiring journey.</p>
      </div>

      <div className="tspp-feature-grid">
        {features.map((feature) => (
          <article key={feature.title} className="tspp-feature-card">
            <div className="tspp-icon-wrap">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="tspp-section tspp-process" id="how-it-works">
      <div className="tspp-section-heading narrow">
        <p className="tspp-kicker">HOW IT WORKS</p>
        <h2>From intake to onboarding, trust builds each step.</h2>
        <p>Four simple steps connect schools with verified educators. Follow the status in your own account at every stage.</p>
      </div>

      <div className="tspp-steps">
        {processSteps.map((step) => (
          <article key={step.step} className="tspp-step">
            <span className="tspp-step-number">{step.step}</span>
            <div className="tspp-step-icon">{step.step === '01' ? <Building2 size={19} /> : step.step === '02' ? <ShieldCheck size={19} /> : step.step === '03' ? <CheckCircle2 size={19} /> : <Users size={19} />}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="tspp-section" id="testimonials">
      <div className="tspp-section-heading narrow">
        <p className="tspp-kicker">WHAT SCHOOLS SAY</p>
        <h2>Hiring that schools love — and teachers trust.</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        {testimonials.map((t) => (
          <div key={t.name} className="tspp-card">
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} size={16} fill="currentColor" style={{ color: 'var(--tspp-amber)' }} />
              ))}
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--tspp-slate)', marginBottom: '1rem', lineHeight: 1.7 }}>"{t.quote}"</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="tspp-avatar tspp-avatar-sm">{t.name.split(' ').map((n) => n[0]).join('')}</div>
              <div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--tspp-navy)' }}>{t.name}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--tspp-slate-light)' }}>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="tspp-section tspp-pricing" id="pricing">
      <div className="tspp-section-heading narrow">
        <p className="tspp-kicker">PRICING</p>
        <h2>Transparent pricing for every role.</h2>
        <p>All plans renew automatically every six months. Cancel or upgrade anytime from your account.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div className="tspp-card">
          <p className="tspp-price-label">Other school staff</p>
          <h3>$50</h3>
          <p className="tspp-price-note">For librarians, cooks, carpenters, maintenance, and other non-teaching staff.</p>
          <ul className="tspp-price-features">
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> Profile creation and KYC upload</li>
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> Verification status tracking</li>
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> Messaging with schools</li>
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> 6-month access</li>
          </ul>
        </div>

        <div className="tspp-card tspp-card-dark">
          <p className="tspp-price-label" style={{ color: 'rgba(255,255,255,0.75)' }}>Teachers</p>
          <h3 style={{ color: 'var(--tspp-paper)' }}>$100</h3>
          <p className="tspp-price-note" style={{ color: 'rgba(255,255,255,0.8)' }}>For nursery, primary, and secondary teachers applying for teaching roles.</p>
          <ul className="tspp-price-features" style={{ color: 'var(--tspp-paper)' }}>
            <li><CheckCircle2 size={16} className="text-tspp-amber" /> Priority placement in search results</li>
            <li><CheckCircle2 size={16} className="text-tspp-amber" /> Full profile with credential showcase</li>
            <li><CheckCircle2 size={16} className="text-tspp-amber" /> Interview scheduling and reviews</li>
            <li><CheckCircle2 size={16} className="text-tspp-amber" /> 6-month access</li>
          </ul>
        </div>

        <div className="tspp-card">
          <p className="tspp-price-label">Schools</p>
          <h3>$500</h3>
          <p className="tspp-price-note">For private schools to post unlimited adverts, search verified candidates, and interview.</p>
          <ul className="tspp-price-features">
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> Unlimited job adverts</li>
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> Search verified talent pool</li>
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> Built-in messaging and video calls</li>
            <li><CheckCircle2 size={16} className="text-tspp-mint" /> Auto-renews every 6 months</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="tspp-cta-panel">
      <div className="tspp-kicker">READY TO GROW THE TEAM?</div>
      <h2>Give your school hiring a system that feels premium and trustworthy.</h2>
      <div className="tspp-cta-row" style={{ marginTop: 0 }}>
        <Link to="/register?theme=tspp&role=seller&redirect=%2Ftspp%2Fadmin" className="tspp-btn tspp-btn-ghost-light tspp-btn-primary-large">
          Start your TSPP setup <ArrowRight size={17} />
        </Link>
        <Link to="/register?theme=tspp&role=customer&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-ghost-light">Apply as a teacher</Link>
      </div>
    </section>
  </main>
);

export default TsppLandingPage;
