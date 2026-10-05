import React from 'react';
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, Clock3, GraduationCap, MapPin, Search, ShieldCheck, Sparkles, Star, Trophy, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import './tspp-theme.css';

const nearbyOpenings = [
  { id: 1, school: 'Oak Crest Academy', location: 'Lagos, Nigeria', role: 'Primary Science Teacher', badge: 'Verified', match: 94, icon: <GraduationCap size={16} /> },
  { id: 2, school: 'Greenfield College', location: 'Abuja, Nigeria', role: 'Biology (IGCSE)', badge: 'Verified', match: 88, icon: <GraduationCap size={16} /> },
  { id: 3, school: 'Nile Heights Academy', location: 'Lagos, Nigeria', role: 'Head of Early Years', badge: 'Verified', match: 82, icon: <GraduationCap size={16} /> },
];

const savedSearches = [
  { id: 1, label: 'Primary Science, Lagos', active: true },
  { id: 2, label: 'IGCSE Biology, Remote', active: false },
  { id: 3, label: 'Head of Department', active: false },
];

const verificationItems = [
  { label: 'KYC documents', status: 'Verified', icon: <BadgeCheck size={14} /> },
  { label: 'Teaching credentials', status: 'Verified', icon: <BadgeCheck size={14} /> },
  { label: 'Reference check', status: 'Pending', icon: <Clock3 size={14} /> },
];

const TsppClient: React.FC = () => (
  <div className="tspp-client" style={{ minHeight: '100vh', backgroundColor: 'var(--tspp-paper-cool)' }}>
    <header className="tspp-topbar">
      <div className="tspp-topbar-inner">
        <Link to="/tspp" className="tspp-brand">
          <span className="tspp-brand-mark">T</span>
          <div className="tspp-brand-text">
            <strong>TSPP</strong>
            <small>Teachers &amp; Private Schools</small>
          </div>
        </Link>

        <nav className="tspp-nav" aria-label="TSPP navigation">
          <a href="#openings">Openings</a>
          <a href="#profile">My profile</a>
          <a href="#saved">Saved searches</a>
          <Link to="/themes">Themes</Link>
        </nav>

        <div className="tspp-actions">
          <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-ghost">Sign in</Link>
          <Link to="/register?theme=tspp&role=customer&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-primary">
            Create teacher profile <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>

    <main className="tspp-section tspp-client-content">
      <section className="tspp-hero tspp-hero-shell">
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
            <Link to="/login?theme=tspp&redirect=%2Ftspp%2Fclient" className="tspp-btn tspp-btn-ghost">Teacher sign in</Link>
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

          <div className="tspp-panel-card">
            <div className="tspp-card-topline">
              <span className="tspp-badge tspp-badge-live">You're verified</span>
              <span className="tspp-pill"><Trophy size={12} /> 6 months active</span>
            </div>

            <div className="tspp-card-main">
              <div>
                <p className="tspp-label">What's unlocked for you</p>
                <h2 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>Full platform access</h2>
              </div>
              <div className="tspp-avatar" style={{ width: '56px', height: '56px', fontSize: '1.1rem' }}>AO</div>
            </div>

            <ul className="tspp-list">
              <li><BadgeCheck size={14} style={{ color: 'var(--tspp-success)' }} /> Appear in school searches</li>
              <li><BadgeCheck size={14} style={{ color: 'var(--tspp-success)' }} /> See openings near you</li>
              <li><BadgeCheck size={14} style={{ color: 'var(--tspp-success)' }} /> Message and interview schools</li>
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
          <p className="tspp-kicker"><Search size={14} /> OPENINGS NEAR YOU</p>
          <h2>Recent roles from verified schools</h2>
          <p>These schools are actively hiring and match your verified profile.</p>
        </div>

        <div className="tspp-feature-grid tspp-three-column-grid">
          {nearbyOpenings.map((opening) => (
            <article key={opening.id} className="tspp-card">
              <div className="tspp-card-topline" style={{ marginBottom: '1rem' }}>
                <span className="tspp-pill tspp-pill-muted">{opening.badge}</span>
                <span className="tspp-pill">
                  <Star size={12} fill="currentColor" style={{ color: 'var(--tspp-accent)' }} />
                  {opening.match}% match
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>{opening.role}</h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Building2 size={16} style={{ color: 'var(--tspp-primary)' }} />
                <strong style={{ fontSize: '1rem', color: 'var(--tspp-primary)' }}>{opening.school}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MapPin size={14} style={{ color: 'var(--tspp-slate)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--tspp-slate)' }}>{opening.location}</span>
              </div>

              <button type="button" className="tspp-btn tspp-btn-amber" style={{ width: '100%', padding: '0.6rem' }}>
                View details <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="tspp-client-panels">
        <div className="tspp-card">
          <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
            <p className="tspp-kicker"><ShieldCheck size={14} /> YOUR PROFILE</p>
            <h2>Verification status</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {verificationItems.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', backgroundColor: 'var(--tspp-paper-cool)', borderRadius: 'var(--tspp-radius-sm)', border: '1px solid var(--tspp-line)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--tspp-primary)' }}>{item.label}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: item.status === 'Verified' ? 'var(--tspp-success)' : 'var(--tspp-warning)' }}>
                  {item.icon} {item.status}
                </span>
              </div>
            ))}
            <button type="button" className="tspp-btn tspp-btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Upload size={15} /> Upload more documents
            </button>
          </div>
        </div>

        <div className="tspp-card">
          <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
            <p className="tspp-kicker"><Search size={14} /> SAVED SEARCHES</p>
            <h2>Your saved searches</h2>
          </div>

          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {savedSearches.map((search) => (
              <div key={search.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', borderRadius: 'var(--tspp-radius-sm)', backgroundColor: search.active ? 'rgba(196,148,74,0.06)' : 'var(--tspp-paper-cool)', border: '1px solid var(--tspp-line)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: search.active ? 600 : 400, color: 'var(--tspp-primary)' }}>{search.label}</span>
                {search.active && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--tspp-accent)' }} />}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  </div>
);

export default TsppClient;
