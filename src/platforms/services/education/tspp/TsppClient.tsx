import React from 'react';
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, GraduationCap, MapPin, Search, ShieldCheck, Sparkles, Star, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import './tspp-theme.css';

const nearbyOpenings = [
  { id: 1, school: 'Oak Crest Academy', location: 'Lagos, Nigeria', role: 'Primary Science Teacher', badge: 'Verified', match: 94 },
  { id: 2, school: 'Greenfield College', location: 'Abuja, Nigeria', role: 'Biology (IGCSE)', badge: 'Verified', match: 88 },
  { id: 3, school: 'Nile Heights Academy', location: 'Lagos, Nigeria', role: 'Head of Early Years', badge: 'Verified', match: 82 },
];

const savedSearches = [
  { id: 1, label: 'Primary Science, Lagos', active: true },
  { id: 2, label: 'IGCSE Biology, Remote', active: false },
  { id: 3, label: 'Head of Department', active: false },
];

const TsppClient: React.FC = () => (
  <div className="tspp-client" style={{ minHeight: '100vh', backgroundColor: 'var(--tspp-cream)' }}>
    <header className="tspp-topbar-inner">
      <div className="tspp-brand" aria-label="TSPP home">
        <span className="tspp-brand-mark">T</span>
        <div className="tspp-brand-text">
          <strong>TSPP</strong>
          <small>Teachers &amp; Private Schools</small>
        </div>
      </div>

      <nav className="tspp-nav" aria-label="TSPP navigation">
        <a href="#openings">Openings</a>
        <a href="#profile">My profile</a>
        <a href="#saved">Saved searches</a>
        <Link to="/themes">Themes</Link>
      </nav>

      <div className="tspp-actions">
        <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-ghost">Sign in</Link>
        <Link to="/register?theme=tspp&role=customer&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-amber">
          Create teacher profile <ArrowRight size={16} />
        </Link>
      </div>
    </header>

    <main className="tspp-section" style={{ padding: '2rem 0' }}>
      <section className="tspp-hero" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
        <div className="tspp-hero-copy">
          <div className="tspp-kicker">
            <span className="tspp-badge tspp-badge-premium"><Sparkles size={14} /> Verified and visible</span>
          </div>

          <h1>Your credentials are verified. Your next school is here.</h1>
          <p className="tspp-subheading">
            TSPP removes the friction from teacher job hunting. One verified profile gets you in front of private schools that match your expertise — no more unverified applications or scattered inboxes.
          </p>

          <div className="tspp-cta-row">
            <Link to="/register?theme=tspp&role=customer&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-primary tspp-btn-primary-large">
              Create your teacher profile <ArrowRight size={16} />
            </Link>
            <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-ghost">
              Teacher sign in
            </Link>
          </div>

          <div className="tspp-proof-row">
            <div className="tspp-proof">
              <strong>1,200+</strong>
              <span>teachers verified</span>
            </div>
            <div className="tspp-proof">
              <strong>94%</strong>
              <span>of teachers find interviews</span>
            </div>
            <div className="tspp-proof">
              <strong>24 hrs</strong>
              <span>average first response</span>
            </div>
          </div>
        </div>

        <div className="tspp-hero-panel" aria-label="Verification status panel">
          <div className="tspp-panel-header">
            <span className="tspp-dot" />
            <span className="tspp-dot" />
            <span className="tspp-dot" />
          </div>

          <div className="tspp-panel-card" style={{ padding: '1.5rem' }}>
            <div className="tspp-card-topline">
              <span className="tspp-badge tspp-badge-live">You're verified</span>
              <span className="tspp-pill">6 months active</span>
            </div>

            <div className="tspp-card-main">
              <div>
                <p className="tspp-label">What's unlocked for you</p>
                <h2 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>Full platform access</h2>
              </div>
              <div className="tspp-avatar" style={{ width: '56px', height: '56px', fontSize: '1.1rem' }}>AO</div>
            </div>

            <ul className="tspp-list">
              <li><BadgeCheck size={14} style={{ color: 'var(--tspp-mint)' }} /> Appear in school searches</li>
              <li><BadgeCheck size={14} style={{ color: 'var(--tspp-mint)' }} /> See openings near you</li>
              <li><BadgeCheck size={14} style={{ color: 'var(--tspp-mint)' }} /> Message and interview schools</li>
            </ul>

            <div className="tspp-card-footer">
              <div>
                <small>Profile strength</small>
                <strong>87%</strong>
              </div>
              <button type="button" className="tspp-btn tspp-btn-mini">Complete profile</button>
            </div>
          </div>
        </div>
      </section>

      <section id="openings" className="tspp-section" style={{ paddingTop: 0 }}>
        <div className="tspp-section-heading">
          <p className="tspp-kicker">OPENINGS NEAR YOU</p>
          <h2>Recent roles from verified schools</h2>
          <p>These schools are actively hiring and match your verified profile.</p>
        </div>

        <div className="tspp-feature-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {nearbyOpenings.map((opening) => (
            <article key={opening.id} className="tspp-card" style={{ paddingTop: '1.25rem' }}>
              <div className="tspp-card-topline" style={{ marginBottom: '1rem' }}>
                <span className="tspp-pill">{opening.badge}</span>
                <span className="tspp-pill tspp-pill-muted">
                  <Star size={12} fill="currentColor" style={{ color: 'var(--tspp-amber)' }} />
                  {opening.match}% match
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>{opening.role}</h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Building2 size={16} style={{ color: 'var(--tspp-navy)' }} />
                <strong style={{ fontSize: '1rem' }}>{opening.school}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MapPin size={14} style={{ color: 'var(--tspp-slate-light)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--tspp-slate)' }}>{opening.location}</span>
              </div>

              <button type="button" className="tspp-btn tspp-btn-amber" style={{ width: '100%', padding: '0.6rem' }}>
                View details <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="tspp-section" style={{ paddingTop: 0, display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div className="tspp-card" style={{ flex: '1', minWidth: '300px' }}>
          <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
            <p className="tspp-kicker">YOUR PROFILE</p>
            <h2>Verification status</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--tspp-soft)', borderRadius: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--tspp-navy)' }}>KYC documents</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--tspp-mint)' }}><CheckCircle2 size={14} /> Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--tspp-soft)', borderRadius: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--tspp-navy)' }}>Teaching credentials</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--tspp-mint)' }}><CheckCircle2 size={14} /> Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--tspp-soft-2)', borderRadius: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--tspp-navy)' }}>Reference check</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--tspp-amber-deep)' }}>Pending</span>
            </div>
            <button type="button" className="tspp-btn tspp-btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Upload size={15} /> Upload more documents
            </button>
          </div>
        </div>

        <div className="tspp-card" style={{ flex: '1', minWidth: '300px' }}>
          <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
            <p className="tspp-kicker">SAVED SEARCHES</p>
            <h2>Your saved searches</h2>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {savedSearches.map((search) => (
              <div key={search.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: search.active ? 'rgba(185, 148, 69, 0.08)' : 'var(--tspp-paper-warm)', border: '1px solid var(--tspp-line)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: search.active ? 600 : 400, color: 'var(--tspp-navy)' }}>{search.label}</span>
                {search.active && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--tspp-amber)' }} />}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  </div>
);

export default TsppClient;
