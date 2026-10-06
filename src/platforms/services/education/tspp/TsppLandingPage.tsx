import React from 'react';
import { ArrowRight, BadgeCheck, Briefcase, Building2, CheckCircle2, GraduationCap, ShieldCheck, Sparkles, Star, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../../../components/SEO';
import './tspp-theme.css';

const scrollToSignup = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  document.getElementById('signup')?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
};

const features = [
  { icon: <Building2 size={22} />, title: 'School profiles', desc: 'Showcase your school identity, values, and recruitment brand in a polished employer hub.' },
  { icon: <Users size={22} />, title: 'Verified talent', desc: 'Attract qualified teachers with trust signals, credential checks, and structured profiles.' },
  { icon: <Briefcase size={22} />, title: 'Hiring workflows', desc: 'Manage shortlists, interviews, candidate notes, and offer stages in one place.' },
  { icon: <GraduationCap size={22} />, title: 'Curriculum fit', desc: 'Filter applicants by subject, age group, location, and culture to match the right teacher.' },
];

const processSteps = [
  { step: '01', icon: <Building2 size={20} />, title: 'Create a profile', desc: 'Choose a role and add location, skills, experience, photo, and a short description.' },
  { step: '02', icon: <ShieldCheck size={20} />, title: 'Submit documents', desc: 'Upload a government ID and certificates to verify your identity (KYC).' },
  { step: '03', icon: <CheckCircle2 size={20} />, title: 'Get verified', desc: 'Our team reviews your documents. Once approved, your profile becomes visible to schools.' },
  { step: '04', icon: <Users size={20} />, title: 'Connect and hire', desc: 'Schools message, call, and video interview you directly through TSPP. Report back after each interview.' },
];

const testimonials = [
  { name: 'Sarah Lungren', role: 'Head of HR, Oak Crest Academy', quote: 'TSPP cut our time-to-hire by half. Verified profiles meant every candidate was already cleared for interview.', rating: 5 },
  { name: 'David Mensah', role: 'Science Teacher', quote: 'I verified once and started getting offers from schools that actually matched my expertise.', rating: 5 },
];

const TsppLandingPage: React.FC = () => (
  <div className="tspp-landing-page">
    <SEO
      title="TSPP | Verified hiring for private schools"
      description="TSPP connects private schools with verified teachers and school staff. Post jobs, search verified candidates, and interview — all in one trusted platform."
      keywords="private schools, teacher hiring, school recruitment, education platform, verified teachers, kyc hiring"
    />

    <header className="tspp-topbar">
      <div className="tspp-topbar-inner">
        <Link to="/tspp" className="tspp-brand" aria-label="TSPP home">
          <span className="tspp-brand-mark">T</span>
          <div className="tspp-brand-text">
            <strong>TSPP</strong>
            <small>Teachers &amp; Private Schools</small>
          </div>
        </Link>

        <nav className="tspp-nav" aria-label="TSPP navigation">
          <a href="#platform">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#testimonials">Testimonials</a>
          <Link to="/themes">Themes</Link>
        </nav>

        <div className="tspp-actions">
          <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fowner" className="tspp-btn tspp-btn-ghost">Admin dashboard</Link>
          <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fadmin" className="tspp-btn tspp-btn-ghost">School dashboard</Link>
          <a href="#signup" onClick={scrollToSignup} className="tspp-btn tspp-btn-primary">
            Sign up <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </header>

    <main>
    <section className="tspp-hero tspp-hero-shell">
      <div className="tspp-hero-copy">
        <div className="tspp-kicker">
          <span className="tspp-badge tspp-badge-premium"><Sparkles size={14} /> Verified hiring platform</span>
        </div>

        <h1>Verified teachers. Trusted schools. One hiring flow.</h1>
        <p className="tspp-subheading">
          TSPP removes the guesswork from private school hiring. Job seekers verify their credentials once and become visible to registered schools. Schools post adverts, search verified candidates, and interview — all on a platform built for trust.
        </p>

        <div className="tspp-cta-row">
          <a href="#signup" onClick={scrollToSignup} className="tspp-btn tspp-btn-primary tspp-btn-primary-large">
            Choose your account <ArrowRight size={17} />
          </a>
          <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fadmin" className="tspp-btn tspp-btn-ghost">Already a member? Sign in</Link>
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
            <li><BadgeCheck size={14} className="text-tspp-success" /> 7+ years teaching primary science</li>
            <li><BadgeCheck size={14} className="text-tspp-success" /> IB and British curriculum experience</li>
            <li><BadgeCheck size={14} className="text-tspp-success" /> Available for full-time and contract roles</li>
          </ul>

          <div className="tspp-card-footer">
            <div>
              <small>School match score</small>
              <strong>96%</strong>
            </div>
            <Link to="/tspp/client" className="tspp-btn tspp-btn-mini">View profile</Link>
          </div>
        </div>
      </div>
    </section>

    <section className="tspp-section tspp-signup-section" id="signup" aria-labelledby="tspp-signup-title">
      <div className="tspp-section-heading narrow">
        <p className="tspp-kicker">YOUR NEXT STEP</p>
        <h2 id="tspp-signup-title">Two ways to move education forward.</h2>
        <p>Choose the account that fits you. You can complete your profile and get into your TSPP workspace right after signing up.</p>
      </div>

      <div className="tspp-signup-choices">
        <article className="tspp-signup-choice tspp-signup-choice-school">
          <div className="tspp-signup-choice-topline">
            <span className="tspp-signup-choice-icon"><Building2 size={23} aria-hidden="true" /></span>
            <span className="tspp-signup-audience">For school leaders</span>
          </div>
          <h3>Sign up as a school</h3>
          <p>Build your school’s hiring workspace, publish roles, and meet verified teachers and staff.</p>
          <ul>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Create a school employer profile</li>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Find and shortlist verified candidates</li>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Manage interviews in one place</li>
          </ul>
          <Link to="/register?theme=tspp&role=seller&redirect=%2Ftspp%2Fadmin" className="tspp-btn tspp-signup-choice-cta">
            Create a school account <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <span className="tspp-signup-next-step">Next: set up your school hiring workspace</span>
        </article>

        <article className="tspp-signup-choice tspp-signup-choice-educator">
          <div className="tspp-signup-choice-topline">
            <span className="tspp-signup-choice-icon"><GraduationCap size={24} aria-hidden="true" /></span>
            <span className="tspp-signup-audience">For educators and staff</span>
          </div>
          <h3>Sign up as a teacher or worker</h3>
          <p>Share your experience, verify your credentials, and connect with schools looking for your skills.</p>
          <ul>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Create your professional profile</li>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Showcase experience and credentials</li>
            <li><CheckCircle2 size={16} aria-hidden="true" /> Hear from schools in your TSPP workspace</li>
          </ul>
          <Link to="/register?theme=tspp&role=customer&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-signup-choice-cta">
            Create teacher / worker account <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <span className="tspp-signup-next-step">Next: build your profile in the teacher and worker workspace</span>
        </article>
      </div>
    </section>

    <section className="tspp-section" id="platform">
      <div className="tspp-section-heading">
        <p className="tspp-kicker">A PREMIUM HIRING EXPERIENCE</p>
        <h2>Everything private schools need — nothing noisy.</h2>
        <p>No more sifting through unverified applications. TSPP brings structure, trust, and brand to every step of the hiring journey.</p>
      </div>

      <div className="tspp-feature-grid tspp-four-column-grid">
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
            <div className="tspp-step-icon">{step.icon}</div>
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

      <div className="tspp-feature-grid tspp-two-column-grid">
        {testimonials.map((t) => (
          <div key={t.name} className="tspp-card">
            <div className="tspp-card-topline" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" style={{ color: 'var(--tspp-accent)' }} />
                ))}
              </div>
              <span className="tspp-pill tspp-pill-muted"><Trophy size={12} /> Featured story</span>
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--tspp-ink-muted)', lineHeight: 1.7 }}>"{t.quote}"</p>
            <div className="tspp-card-footer" style={{ borderTopColor: 'var(--tspp-line-dark)' }}>
              <div className="tspp-avatar tspp-avatar-sm">{t.name.split(' ').map((n) => n[0]).join('')}</div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--tspp-primary)' }}>{t.name}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--tspp-slate)' }}>{t.role}</p>
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

      <div className="tspp-feature-grid tspp-three-column-grid">
        <div className="tspp-card tspp-price-card">
          <div>
            <p className="tspp-price-label">Other school staff</p>
            <h3>$50</h3>
            <p className="tspp-price-note">For librarians, cooks, carpenters, maintenance, and other non-teaching staff.</p>
            <ul className="tspp-price-features">
              <li><CheckCircle2 size={16} className="text-tspp-success" /> Profile creation and KYC upload</li>
              <li><CheckCircle2 size={16} className="text-tspp-success" /> Verification status tracking</li>
              <li><CheckCircle2 size={16} className="text-tspp-success" /> Messaging with schools</li>
              <li><CheckCircle2 size={16} className="text-tspp-success" /> 6-month access</li>
            </ul>
          </div>
        </div>

        <div className="tspp-card tspp-card-dark tspp-price-card">
          <div>
            <p className="tspp-price-label">Teachers</p>
            <h3>$100</h3>
            <p className="tspp-price-note">For nursery, primary, and secondary teachers applying for teaching roles.</p>
            <ul className="tspp-price-features">
              <li><CheckCircle2 size={16} className="text-tspp-accent" /> Priority placement in search results</li>
              <li><CheckCircle2 size={16} className="text-tspp-accent" /> Full profile with credential showcase</li>
              <li><CheckCircle2 size={16} className="text-tspp-accent" /> Interview scheduling and reviews</li>
              <li><CheckCircle2 size={16} className="text-tspp-accent" /> 6-month access</li>
            </ul>
          </div>
        </div>

        <div className="tspp-card tspp-price-card">
          <div>
            <p className="tspp-price-label">Schools</p>
            <h3>$500</h3>
            <p className="tspp-price-note">For private schools to post unlimited adverts, search verified candidates, and interview.</p>
            <ul className="tspp-price-features">
              <li><CheckCircle2 size={16} className="text-tspp-success" /> Unlimited job adverts</li>
              <li><CheckCircle2 size={16} className="text-tspp-success" /> Search verified talent pool</li>
              <li><CheckCircle2 size={16} className="text-tspp-success" /> Built-in messaging and video calls</li>
              <li><CheckCircle2 size={16} className="text-tspp-success" /> Auto-renews every 6 months</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section className="tspp-cta-panel">
      <div className="tspp-kicker">READY TO GROW THE TEAM?</div>
      <h2>Give your school hiring a system that feels premium and trustworthy.</h2>
      <div className="tspp-cta-row" style={{ marginTop: 0 }}>
        <a href="#signup" onClick={scrollToSignup} className="tspp-btn tspp-btn-ghost-light tspp-btn-primary-large">
          Choose your signup path <ArrowRight size={17} />
        </a>
      </div>
    </section>

    </main>
    <footer className="tspp-site-footer">
      <div className="tspp-footer-inner">
        <div className="tspp-footer-brand">
          <Link to="/tspp" className="tspp-brand" aria-label="TSPP home">
            <span className="tspp-brand-mark">T</span>
            <span className="tspp-brand-text">
              <strong>TSPP</strong>
              <small>Teachers &amp; Private Schools</small>
            </span>
          </Link>
          <p>Verified teachers and trusted schools, brought together with confidence.</p>
        </div>

        <nav className="tspp-footer-links" aria-label="TSPP footer navigation">
          <div>
            <h2>Explore</h2>
            <a href="#platform">The platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Testimonials</a>
          </div>
          <div>
            <h2>Get started</h2>
            <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fadmin">School sign in</Link>
            <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fclient">Teacher sign in</Link>
            <Link to="/register?theme=tspp&role=seller&redirect=%2Ftspp%2Fadmin">For schools</Link>
            <Link to="/register?theme=tspp&role=customer&redirect=%2Ftspp%2Fclient">For teachers</Link>
          </div>
        </nav>
      </div>
      <div className="tspp-footer-bottom">
        <span>© {new Date().getFullYear()} TSPP · Teachers &amp; Private Schools</span>
        <Link to="/themes">Explore themes</Link>
      </div>
    </footer>
  </div>
);

export default TsppLandingPage;
