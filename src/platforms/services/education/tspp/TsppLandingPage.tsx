import React from 'react';
import { ArrowRight, BadgeCheck, Briefcase, Building2, ChevronRight, GraduationCap, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../../../components/SEO';
import './tspp-landing.css';

const TsppLandingPage: React.FC = () => (
  <main className="tspp-landing-page">
    <SEO
      title="TSPP | Premium school hiring platform"
      description="TSPP helps private schools and teaching talent connect through trusted hiring, branded employer pages, and streamlined staffing workflows."
      keywords="private schools, teacher hiring, school recruitment, education platform, tsa, tssp, tspa"
    />

    <header className="tspp-topbar">
      <div className="tspp-brand" aria-label="TSPP home">
        <span className="tspp-brand-mark">T</span>
        <div>
          <strong>TSPP</strong>
          <small>Teachers & Private Schools</small>
        </div>
      </div>

      <nav className="tspp-nav" aria-label="TSPP navigation">
        <a href="#platform">Platform</a>
        <a href="#why-tspp">Why it works</a>
        <a href="#pricing">Pricing</a>
        <Link to="/themes">Themes</Link>
      </nav>

      <div className="tspp-actions">
        <Link to="/login?redirect=%2Fseller%2Fdashboard" className="tspp-link-btn">Sign in</Link>
        <Link to="/register?theme=tspp&redirect=%2Fseller%2Fdashboard" className="tspp-primary-btn">
          Book a demo <ArrowRight size={16} />
        </Link>
      </div>
    </header>

    <section className="tspp-hero">
      <div className="tspp-hero-copy">
        <div className="tspp-badge-row">
          <span className="tspp-badge"><Sparkles size={14} /> Premium hiring platform</span>
        </div>
        <h1>Build a stronger school workforce with trust-first hiring.</h1>
        <p className="tspp-subheading">
          TSPP brings schools and verified teachers into one premium platform where hiring feels clear,
          fast, and beautifully structured from first inquiry to final onboarding.
        </p>

        <div className="tspp-cta-row">
          <Link to="/register?theme=tspp&redirect=%2Fseller%2Fdashboard" className="tspp-primary-btn large">
            Launch your school hub <ArrowRight size={17} />
          </Link>
          <a href="#platform" className="tspp-secondary-btn">Explore platform</a>
        </div>

        <div className="tspp-proof-row">
          <div>
            <strong>1,200+</strong>
            <span>teachers verified</span>
          </div>
          <div>
            <strong>98%</strong>
            <span>hire-to-shortlist rate</span>
          </div>
          <div>
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
            <span className="tspp-pill">Verified talent</span>
            <span className="tspp-pill muted">School-ready</span>
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
            <li><BadgeCheck size={14} /> 7+ years teaching primary science</li>
            <li><BadgeCheck size={14} /> IB and British curriculum experience</li>
            <li><BadgeCheck size={14} /> Available for full-time and contract roles</li>
          </ul>

          <div className="tspp-card-footer">
            <div>
              <small>School match score</small>
              <strong>96%</strong>
            </div>
            <button type="button" className="tspp-mini-button">View profile</button>
          </div>
        </div>
      </div>
    </section>

    <section className="tspp-feature-band" id="platform">
      <div className="tspp-section-heading">
        <p className="tspp-kicker">AN EXPERIENCE THAT FEELS premium</p>
        <h2>Everything private schools need — and nothing noisy.</h2>
      </div>

      <div className="tspp-feature-grid">
        <article className="tspp-feature-card">
          <div className="tspp-icon-wrap"><Building2 size={19} /></div>
          <h3>School profiles</h3>
          <p>Showcase your school identity, values, and recruitment brand in a polished employer hub.</p>
        </article>

        <article className="tspp-feature-card">
          <div className="tspp-icon-wrap"><Users size={19} /></div>
          <h3>Verified talent</h3>
          <p>Attract qualified teachers with trust signals, credential checks, and structured teacher profiles.</p>
        </article>

        <article className="tspp-feature-card">
          <div className="tspp-icon-wrap"><Briefcase size={19} /></div>
          <h3>Hiring workflows</h3>
          <p>Manage shortlists, interviews, candidate notes, and offer stages without fragmented tools.</p>
        </article>

        <article className="tspp-feature-card">
          <div className="tspp-icon-wrap"><GraduationCap size={19} /></div>
          <h3>Curriculum fit</h3>
          <p>Filter applicants by subject, age group, location, and school culture to match the right teacher.</p>
        </article>
      </div>
    </section>

    <section className="tspp-process" id="why-tspp">
      <div className="tspp-section-heading narrow">
        <p className="tspp-kicker">WHY IT WORKS</p>
        <h2>From intake to onboarding, the flow stays premium and intentional.</h2>
      </div>

      <div className="tspp-steps">
        <article>
          <span>01</span>
          <h3>List the role</h3>
          <p>Publish school vacancies with structured details, expectations, and brand positioning.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Review curated candidates</h3>
          <p>Shortlist teachers by experience, availability, certifications, and academic fit.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Interview and hire</h3>
          <p>Coordinate interviews, notes, references, and final onboarding through one system.</p>
        </article>
      </div>
    </section>

    <section className="tspp-pricing" id="pricing">
      <div className="tspp-section-heading narrow">
        <p className="tspp-kicker">PRICING</p>
        <h2>Premium positioning for premium schools.</h2>
      </div>

      <div className="tspp-price-card">
        <div>
          <p className="tspp-price-label">TSPP platform</p>
          <h3>$150,000</h3>
          <p className="tspp-price-note">One-time premium license for a private school hiring platform experience.</p>
        </div>

        <ul>
          <li><ChevronRight size={15} /> Premium school + teacher workspace</li>
          <li><ChevronRight size={15} /> Verification and trust-first profiles</li>
          <li><ChevronRight size={15} /> Role management and workflow dashboards</li>
          <li><ChevronRight size={15} /> Branded onboarding and recruitment UX</li>
        </ul>

        <Link to="/register?theme=tspp&redirect=%2Fseller%2Fdashboard" className="tspp-primary-btn large">
          Get the platform <ArrowRight size={17} />
        </Link>
      </div>
    </section>

    <section className="tspp-cta-panel">
      <div>
        <p className="tspp-kicker">READY TO GROW THE TEAM?</p>
        <h2>Give your school brand a hiring system that feels like a premium platform.</h2>
      </div>

      <Link to="/register?theme=tspp&redirect=%2Fseller%2Fdashboard" className="tspp-primary-btn large">
        Start your TSPP setup <ArrowRight size={17} />
      </Link>
    </section>
  </main>
);

export default TsppLandingPage;
