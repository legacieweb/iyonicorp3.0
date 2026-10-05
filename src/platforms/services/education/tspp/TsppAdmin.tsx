import React, { useMemo, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, ChevronRight, Clock3, MessageSquareText, Search, ShieldCheck, Sparkles, TrendingUp, UserCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import './tspp-theme.css';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'roles', label: 'School roles' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'onboarding', label: 'Onboarding' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const metrics = [
  { label: 'Live roles', value: '18', change: '+6 this week', icon: <Briefcase size={18} /> },
  { label: 'Shortlisted', value: '94', change: '18 pending review', icon: <Users size={18} /> },
  { label: 'Offer rate', value: '76%', change: 'Above market norm', icon: <TrendingUp size={18} /> },
  { label: 'Avg. response', value: '9 hrs', change: 'Across all schools', icon: <Clock3 size={18} /> },
];

const pipeline = [
  { title: 'Primary English teacher', status: 'New applicants', count: '23', icon: <Clock3 size={16} /> },
  { title: 'Biology lead', status: 'Interviews booked', count: '9', icon: <MessageSquareText size={16} /> },
  { title: 'School counselor', status: 'Reference check', count: '4', icon: <UserCheck size={16} /> },
];

const talent = [
  { name: 'Amina Okafor', focus: 'Primary Science', score: '96%', label: 'Fully verified', availability: 'Available this term' },
  { name: 'Kwame Lewis', focus: 'ICT & STEM', score: '94%', label: 'Curriculum aligned', availability: 'Open for contract' },
  { name: 'Nadia Yusuf', focus: 'Early years', score: '92%', label: 'Safeguarding cleared', availability: 'Shortlist ready' },
];

const tasks = [
  'Refresh school profile and values statement',
  'Approve verified teacher shortlist',
  'Confirm interview slots for 3 applicants',
  'Publish updated role briefing pack',
];

const TsppAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const content = useMemo(() => {
    if (activeTab === 'roles') {
      return {
        headline: 'Role pipeline',
        description: 'Prioritize hiring needs, streamline school briefs, and keep every vacancy moving toward a final decision.',
      };
    }
    if (activeTab === 'teachers') {
      return {
        headline: 'Teacher marketplace',
        description: 'Review verified candidates, compare subject fit, and coordinate interview flow from one dashboard.',
      };
    }
    if (activeTab === 'onboarding') {
      return {
        headline: 'Onboarding workspace',
        description: 'Track references, safeguarding checks, offer approval, and final school onboarding steps.',
      };
    }
    return {
      headline: 'Premium hiring overview',
      description: 'Your private school hiring workspace is active. Use the workspace to review school roles, compare teachers, and close top-quality hires faster.',
    };
  }, [activeTab]);

  return (
    <div className="tspp-admin" style={{ minHeight: '100vh', backgroundColor: 'var(--tspp-paper-cool)' }}>
      <header className="tspp-topbar">
        <div className="tspp-topbar-inner">
          <Link to="/tspp" className="tspp-brand">
            <span className="tspp-brand-mark">T</span>
            <div className="tspp-brand-text">
              <strong>TSPP</strong>
              <small>Teachers &amp; Private Schools</small>
            </div>
          </Link>

          <nav className="tspp-tabs" role="tablist" aria-label="Admin navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tspp-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tspp-actions">
            <button type="button" className="tspp-btn tspp-btn-ghost"><Search size={16} /> Search</button>
            <button type="button" className="tspp-btn tspp-btn-ghost">Invite school</button>
            <button type="button" className="tspp-btn tspp-btn-primary">
              Launch hiring <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="tspp-section tspp-admin-content">
        <section className="tspp-card tspp-admin-welcome">
          <div>
            <div className="tspp-section-heading" style={{ marginBottom: 0, maxWidth: '100%' }}>
              <p className="tspp-kicker"><Sparkles size={14} /> {tabs.find(t => t.id === activeTab)?.label ?? 'Platform dashboard'}</p>
              <h2>{content.headline}</h2>
              <p style={{ marginTop: '1rem', color: 'var(--tspp-slate)', fontSize: '1.06rem' }}>{content.description}</p>
            </div>

            <div className="tspp-cta-row" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="tspp-btn tspp-btn-primary">
                Review shortlist <ChevronRight size={16} />
              </button>
              <button type="button" className="tspp-btn tspp-btn-ghost">Manage school profile</button>
            </div>
          </div>

          <div className="tspp-card-dark">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              <span>School health</span>
              <span className="tspp-badge tspp-badge-live">Live</span>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '2.25rem', fontWeight: 600, margin: 0, color: 'var(--tspp-paper)' }}>89%</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>Hiring momentum across six active vacancies</p>
            </div>

            <div style={{ height: '0.625rem', overflow: 'hidden', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: '1.25rem' }}>
              <div style={{ width: '89%', height: '100%', borderRadius: '999px', backgroundColor: 'var(--tspp-accent)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1.25rem' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--tspp-radius-sm)', padding: '0.85rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Top fit</p>
                <p style={{ marginTop: '0.35rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--tspp-paper)' }}>96%</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--tspp-radius-sm)', padding: '0.85rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Offers</p>
                <p style={{ marginTop: '0.35rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--tspp-paper)' }}>11</p>
              </div>
            </div>
          </div>
        </section>

        <section className="tspp-metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="tspp-metric">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--tspp-accent)' }}>{metric.icon}</div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tspp-slate)', marginBottom: '0.75rem' }}>{metric.label}</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tspp-primary)' }}>{metric.value}</p>
              <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--tspp-slate)' }}>{metric.change}</p>
            </div>
          ))}
        </section>

        <section className="tspp-feature-grid tspp-admin-columns">
          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
              <p className="tspp-kicker">Hiring pipeline</p>
              <h2>School roles and status</h2>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {pipeline.map((entry) => (
                <div key={entry.title} className="tspp-card-warm" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem' }}>
                  <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', borderRadius: '0.7rem', background: 'var(--tspp-gradient-primary)', color: 'var(--tspp-paper)', fontSize: '1rem', fontWeight: 600, flexShrink: 0 }}>{entry.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--tspp-primary)', margin: 0 }}>{entry.title}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tspp-slate)' }}>{entry.status}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--tspp-primary)' }}>{entry.count}</p>
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--tspp-slate-light)' }}>applicants</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
              <p className="tspp-kicker"><Briefcase size={14} /> Actions</p>
              <h2>Quick actions</h2>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {tasks.map((task) => (
                <div key={task} className="tspp-card-warm" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.85rem' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--tspp-success)' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--tspp-ink-muted)', margin: 0 }}>{task}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="tspp-feature-grid tspp-admin-columns tspp-admin-candidates">
          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
              <p className="tspp-kicker">Teachers</p>
              <h2>Verified candidates</h2>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {talent.map((person) => (
                <div key={person.name} className="tspp-card-warm" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="tspp-avatar tspp-avatar-sm">{person.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 600, color: 'var(--tspp-primary)', margin: 0 }}>{person.name}</p>
                        <span className="tspp-pill tspp-pill-muted" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>{person.label}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--tspp-slate)' }}>{person.focus}</p>
                    </div>
                    <Link to="/tspp/client" className="tspp-btn tspp-btn-mini">View</Link>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--tspp-slate)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(196,148,74,0.08)', borderRadius: '999px', padding: '0.35rem 0.7rem', fontWeight: 600, color: 'var(--tspp-primary)' }}>Match {person.score}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock3 size={14} style={{ color: 'var(--tspp-slate-light)' }} />
                      {person.availability}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tspp-card-dark">
            <div className="tspp-section-heading" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
              <p className="tspp-kicker" style={{ color: 'rgba(255,255,255,0.6)' }}><ShieldCheck size={14} /> Trust layer</p>
              <h2 style={{ color: 'var(--tspp-paper)' }}>School trust checks</h2>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--tspp-radius-sm)', padding: '0.85rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Safeguarding verification</p>
                <p style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--tspp-paper)' }}>96% complete</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--tspp-radius-sm)', padding: '0.85rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Reference compliance</p>
                <p style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--tspp-paper)' }}>12 pending</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--tspp-radius-sm)', padding: '0.85rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Interviews scheduled</p>
                <p style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--tspp-paper)' }}>9 slots</p>
              </div>
            </div>

            <button type="button" className="tspp-btn tspp-btn-amber" style={{ marginTop: '1.25rem' }}>
              Review compliance <MessageSquareText size={15} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TsppAdmin;
