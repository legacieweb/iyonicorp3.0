import React, { useMemo } from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import './tspp-theme.css';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'schools', label: 'Schools' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'finance', label: 'Finance' },
] as const;

const ownerMetrics = [
  { label: 'Active schools', value: '142', change: '+18 this quarter', icon: <Building2 size={18} /> },
  { label: 'Verified teachers', value: '3.8K', change: '+412 this month', icon: <Users size={18} /> },
  { label: 'Revenue run-rate', value: '$148K', change: '+24.6% MoM', icon: <DollarSign size={18} /> },
  { label: 'Hire success', value: '89%', change: 'Above target', icon: <TrendingUp size={18} /> },
];

const schoolAccounts = [
  { name: 'Oak Crest Academy', plan: 'Premium school', seats: '12 vacancies', status: 'Hiring strong' },
  { name: 'Bristol Prep', plan: 'Growth school', seats: '7 vacancies', status: '5 interviews live' },
  { name: 'Kingsbridge College', plan: 'Enterprise', seats: '3 vacancies', status: 'Compliance ready' },
];

const teacherNetwork = [
  { name: 'Amina Okafor', focus: 'Biology & STEM', score: '96%' },
  { name: 'Kwame Lewis', focus: 'ICT & Digital Learning', score: '94%' },
  { name: 'Nadia Yusuf', focus: 'Early Years', score: '92%' },
];

const platformAlerts = [
  'Four school onboarding packs need approval before Friday.',
  'Seven teacher documents are pending review and require action.',
  'Monthly subscription renewals are 86% collected and trending above goal.',
];

const TsppOwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = React.useState<(typeof tabs)[number]['id']>('overview');

  const content = useMemo(() => {
    if (activeTab === 'schools') {
      return {
        headline: 'School portfolio health',
        description: 'Monitor every school account, open vacancies, compliance status, and subscription health from a single owner dashboard.',
      };
    }
    if (activeTab === 'teachers') {
      return {
        headline: 'Teacher network view',
        description: 'Track talent quality, verification progress, and candidate pipeline health across the wider education network.',
      };
    }
    if (activeTab === 'finance') {
      return {
        headline: 'Platform revenue control',
        description: 'Keep a clear view of subscriptions, renewals, payouts, and business health for every school account on the platform.',
      };
    }
    return {
      headline: 'Platform owner command center',
      description: 'You own the TSPP platform, so every school account, teacher profile, hiring workflow, and renewal is visible in one strategic dashboard.',
    };
  }, [activeTab]);

  const ownerName = user?.name || 'School Owner';

  return (
    <div className="tspp-owner" style={{ minHeight: '100vh', backgroundColor: 'var(--tspp-paper-cool)' }}>
      <header className="tspp-topbar">
        <div className="tspp-topbar-inner">
          <Link to="/tspp" className="tspp-brand">
            <span className="tspp-brand-mark">T</span>
            <div className="tspp-brand-text">
              <strong>TSPP</strong>
              <small>Teachers &amp; Private Schools</small>
            </div>
          </Link>

          <nav className="tspp-tabs" role="tablist" aria-label="Owner navigation">
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
            <button type="button" className="tspp-btn tspp-btn-ghost" onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="tspp-section">
        <section className="tspp-card tspp-owner-hero">
          <div className="tspp-owner-hero-inner">
            <div>
              <p className="tspp-kicker"><Sparkles size={14} /> Admin dashboard</p>
              <h2>{content.headline}</h2>
              <p className="tspp-owner-copy">{content.description}</p>

              <div className="tspp-owner-meta">
                <span className="tspp-badge tspp-badge-premium">Owner admin</span>
                <span className="tspp-pill tspp-pill-muted">{ownerName}</span>
              </div>

              <div className="tspp-cta-row" style={{ justifyContent: 'flex-start', marginTop: '1.5rem' }}>
                <Link to="/tspp/admin" className="tspp-btn tspp-btn-primary">
                  Open school dashboard <ArrowRight size={16} />
                </Link>
                <Link to="/tspp/client" className="tspp-btn tspp-btn-ghost">Teacher client dashboard</Link>
              </div>
            </div>

            <div className="tspp-card-dark tspp-owner-overview-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Network health</span>
                <span className="tspp-badge tspp-badge-live">Live</span>
              </div>

              <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, color: 'var(--tspp-paper)' }}>94.2%</p>
              <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.76)' }}>Platform health score across schools, teacher verification, and renewals.</p>

              <div style={{ height: '0.7rem', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', marginTop: '1.5rem', overflow: 'hidden' }}>
                <div style={{ width: '94.2%', height: '100%', borderRadius: '999px', background: 'linear-gradient(135deg, #d4af37 0%, #f5d98b 100%)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', marginTop: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--tspp-radius-sm)', padding: '0.8rem' }}>
                  <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Schools</p>
                  <p style={{ margin: '0.45rem 0 0', color: 'var(--tspp-paper)', fontSize: '1.5rem', fontWeight: 700 }}>142</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--tspp-radius-sm)', padding: '0.8rem' }}>
                  <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Teachers</p>
                  <p style={{ margin: '0.45rem 0 0', color: 'var(--tspp-paper)', fontSize: '1.5rem', fontWeight: 700 }}>3.8K</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tspp-metrics">
          {ownerMetrics.map((metric) => (
            <div key={metric.label} className="tspp-metric">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--tspp-accent)' }}>{metric.icon}</div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tspp-slate)', marginBottom: '0.75rem' }}>{metric.label}</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--tspp-primary)' }}>{metric.value}</p>
              <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--tspp-slate)' }}>{metric.change}</p>
            </div>
          ))}
        </section>

        <section className="tspp-owner-grid">
          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.25rem', maxWidth: '100%' }}>
              <p className="tspp-kicker"><Building2 size={14} /> School accounts</p>
              <h2>Portfolio snapshot</h2>
            </div>

            <div className="tspp-owner-list">
              {schoolAccounts.map((school) => (
                <div key={school.name} className="tspp-card-warm tspp-owner-row">
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--tspp-primary)' }}>{school.name}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--tspp-slate)' }}>{school.plan}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--tspp-slate)' }}>{school.seats}</p>
                    <span className="tspp-badge tspp-badge-live" style={{ marginTop: '0.45rem' }}>{school.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.25rem', maxWidth: '100%' }}>
              <p className="tspp-kicker"><GraduationCap size={14} /> Teachers</p>
              <h2>Top talent</h2>
            </div>

            <div className="tspp-owner-list">
              {teacherNetwork.map((teacher) => (
                <div key={teacher.name} className="tspp-card-warm tspp-owner-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="tspp-avatar tspp-avatar-sm">{teacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--tspp-primary)' }}>{teacher.name}</p>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--tspp-slate)' }}>{teacher.focus}</p>
                    </div>
                  </div>
                  <span className="tspp-pill tspp-pill-muted">{teacher.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.25rem', maxWidth: '100%' }}>
              <p className="tspp-kicker"><CreditCard size={14} /> Finance</p>
              <h2>Monetisation</h2>
            </div>

            <div className="tspp-owner-summary-box">
              <div>
                <small>Monthly recurring revenue</small>
                <strong>$148,500</strong>
              </div>
              <span className="tspp-badge tspp-badge-live">+24.6%</span>
            </div>

            <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1.2rem' }}>
              <div className="tspp-card-warm" style={{ padding: '0.9rem' }}>
                <p style={{ margin: 0, color: 'var(--tspp-slate)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Renewals</p>
                <p style={{ margin: '0.4rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--tspp-primary)' }}>86%</p>
              </div>
              <div className="tspp-card-warm" style={{ padding: '0.9rem' }}>
                <p style={{ margin: 0, color: 'var(--tspp-slate)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Outstanding</p>
                <p style={{ margin: '0.4rem 0 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--tspp-primary)' }}>$12.9K</p>
              </div>
            </div>
          </div>
        </section>

        <section className="tspp-owner-lower-grid">
          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.4rem', maxWidth: '100%' }}>
              <p className="tspp-kicker"><ShieldCheck size={14} /> Compliance</p>
              <h2>Priority actions</h2>
            </div>

            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {platformAlerts.map((alert) => (
                <div key={alert} className="tspp-card-warm" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.85rem' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--tspp-success)' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--tspp-ink-muted)' }}>{alert}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="tspp-card">
            <div className="tspp-section-heading" style={{ marginBottom: '1.4rem', maxWidth: '100%' }}>
              <p className="tspp-kicker"><LayoutDashboard size={14} /> Daily operations</p>
              <h2>Performance mix</h2>
            </div>

            <div style={{ display: 'grid', gap: '0.95rem' }}>
              <div className="tspp-card-warm" style={{ padding: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--tspp-slate)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>School signups</span>
                  <span style={{ fontWeight: 700, color: 'var(--tspp-primary)' }}>58</span>
                </div>
                <div style={{ height: '0.55rem', borderRadius: '999px', background: '#dfe7ef', overflow: 'hidden' }}>
                  <div style={{ width: '72%', height: '100%', borderRadius: '999px', background: 'linear-gradient(135deg, #0a2633 0%, #1a3b4a 100%)' }} />
                </div>
              </div>

              <div className="tspp-card-warm" style={{ padding: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--tspp-slate)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Teacher verification</span>
                  <span style={{ fontWeight: 700, color: 'var(--tspp-primary)' }}>91%</span>
                </div>
                <div style={{ height: '0.55rem', borderRadius: '999px', background: '#dfe7ef', overflow: 'hidden' }}>
                  <div style={{ width: '91%', height: '100%', borderRadius: '999px', background: 'linear-gradient(135deg, #c6944a 0%, #d4af37 100%)' }} />
                </div>
              </div>

              <div className="tspp-card-warm" style={{ padding: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--tspp-slate)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Offer conversions</span>
                  <span style={{ fontWeight: 700, color: 'var(--tspp-primary)' }}>76%</span>
                </div>
                <div style={{ height: '0.55rem', borderRadius: '999px', background: '#dfe7ef', overflow: 'hidden' }}>
                  <div style={{ width: '76%', height: '100%', borderRadius: '999px', background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TsppOwnerDashboard;
