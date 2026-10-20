import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Menu,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { EmailCampaignManager } from '../components/marketing/EmailCampaignManager';
import { EmailSettingsManager } from '../components/marketing/EmailSettingsManager';
import { EmailTemplateEditor } from '../components/marketing/EmailTemplateEditor';
import { MailerApiKeysPanel, MailerBillingPanel } from '../components/marketing/MailerAccountSections';
import './iyonic-mailer-dashboard.css';

type DashboardTab = 'overview' | 'email-settings' | 'campaigns' | 'templates' | 'api-keys' | 'billing' | 'account';

const tabs: Array<{ id: DashboardTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'email-settings', label: 'Email account', icon: Settings2 },
  { id: 'campaigns', label: 'Campaigns', icon: Send },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'api-keys', label: 'API keys', icon: KeyRound },
  { id: 'billing', label: 'Plans & billing', icon: CreditCard },
];

export const IyonicMailerDashboard: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const {
    emailSettings,
    emailCampaigns,
    emailTemplates,
    refreshData,
  } = useData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
  });

  const requestedTab = searchParams.get('tab') as DashboardTab | null;
  const activeTab: DashboardTab = requestedTab && (
    requestedTab === 'overview' ||
    requestedTab === 'email-settings' ||
    requestedTab === 'campaigns' ||
    requestedTab === 'templates' ||
    requestedTab === 'api-keys' ||
    requestedTab === 'billing' ||
    requestedTab === 'account'
  ) ? requestedTab : 'overview';

  useEffect(() => {
    setProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
    });
  }, [user?.firstName, user?.lastName, user?.phoneNumber]);

  useEffect(() => {
    let mounted = true;
    refreshData().finally(() => {
      if (mounted) setIsRefreshing(false);
    });
    return () => {
      mounted = false;
    };
  }, [refreshData]);

  const sentCampaigns = useMemo(
    () => emailCampaigns.filter((campaign) => campaign.status === 'sent').length,
    [emailCampaigns],
  );
  const drafts = useMemo(
    () => emailCampaigns.filter((campaign) => campaign.status === 'draft').length,
    [emailCampaigns],
  );
  const configured = Boolean(emailSettings?.isActive && emailSettings?.isVerified);
  const initials = (user?.name || user?.email || 'M')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const chooseTab = (tab: DashboardTab) => {
    setSearchParams(tab === 'overview' ? {} : { tab });
    setMobileNavOpen(false);
    setProfileMenuOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      await updateProfile({
        ...profile,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
      });
      setProfileSaved(true);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save your profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/iyonic-mailer/login', { replace: true });
  };

  const renderSection = () => {
    if (activeTab === 'billing') return <MailerBillingPanel />;
    if (activeTab === 'api-keys') return <MailerApiKeysPanel />;
    if (activeTab === 'account') {
      return (
        <section className="mailer-panel mailer-account-panel">
          <div className="mailer-panel-heading">
            <div className="mailer-section-icon"><UserRound size={19} /></div>
            <div>
              <h2>Personal profile</h2>
              <p>Update the profile details connected to your Iyonic account.</p>
            </div>
          </div>
          <form onSubmit={handleProfileSave} className="mailer-profile-form">
            <div className="mailer-profile-email">
              <span className="mailer-field-label">Sign-in email</span>
              <span className="mailer-profile-email-value">{user?.email}</span>
              <span className="mailer-field-note">Email changes are managed through account support.</span>
            </div>
            <div className="mailer-form-grid">
              <label>
                <span className="mailer-field-label">First name</span>
                <input
                  value={profile.firstName}
                  onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label>
                <span className="mailer-field-label">Last name</span>
                <input
                  value={profile.lastName}
                  onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                  autoComplete="family-name"
                  required
                />
              </label>
              <label className="mailer-profile-phone">
                <span className="mailer-field-label">Phone number</span>
                <input
                  type="tel"
                  value={profile.phoneNumber}
                  onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })}
                  autoComplete="tel"
                  placeholder="Add a contact number"
                />
              </label>
            </div>
            {profileError && <p className="mailer-form-error" role="alert">{profileError}</p>}
            {profileSaved && <p className="mailer-form-success" role="status"><Check size={16} /> Profile saved.</p>}
            <div className="mailer-form-footer">
              <span>Your changes are saved to your Iyonic account profile.</span>
              <button type="submit" className="mailer-primary-button" disabled={profileSaving}>
                {profileSaving ? <Loader2 className="mailer-spin" size={17} /> : <Check size={17} />}
                {profileSaving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </section>
      );
    }

    if (!user?.sellerId) {
      return (
        <section className="mailer-notice" role="status">
          <div className="mailer-notice-icon"><HelpCircle size={21} /></div>
          <div>
            <h2>Mailer workspace unavailable</h2>
            <p>
              Email tools are connected to a seller workspace on this account. No workspace is linked yet,
              so campaign and email-account changes cannot be loaded or saved here.
            </p>
          </div>
        </section>
      );
    }

    if (activeTab === 'email-settings') return <EmailSettingsManager />;
    if (activeTab === 'campaigns') return <EmailCampaignManager />;
    if (activeTab === 'templates') return <EmailTemplateEditor />;

    return (
      <>
        <section className="mailer-welcome">
          <div>
            <div className="mailer-eyebrow"><span className="mailer-eyebrow-dot" /> MAILER WORKSPACE</div>
            <h1>Good to have you back{user?.firstName ? `, ${user.firstName}` : ''}.</h1>
            <p>Get your email program ready, then build your next campaign.</p>
          </div>
          <button className="mailer-refresh-button" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'mailer-spin' : ''} />
            Refresh
          </button>
        </section>

        <section className="mailer-metrics" aria-label="Email account summary">
          <article className="mailer-metric-card mailer-metric-primary">
            <div className="mailer-metric-top">
              <span>Account status</span>
              <span className={`mailer-status-mark ${configured ? 'is-ready' : ''}`}>
                {configured ? <CheckCircle2 size={18} /> : <Activity size={18} />}
              </span>
            </div>
            <strong>{isRefreshing ? 'Checking…' : configured ? 'Verified' : 'Needs setup'}</strong>
            <p>{configured ? 'Provider is active and verified' : 'Connect and verify an email provider'}</p>
            <button onClick={() => chooseTab('email-settings')}>
              {configured ? 'Review account' : 'Set up email'} <ArrowRight size={14} />
            </button>
          </article>
          <article className="mailer-metric-card">
            <div className="mailer-metric-top">
              <span>Campaigns sent</span>
              <span className="mailer-metric-icon"><Send size={17} /></span>
            </div>
            <strong>{isRefreshing ? '—' : sentCampaigns}</strong>
            <p>Campaigns marked as sent</p>
            <button onClick={() => chooseTab('campaigns')}>View campaigns <ArrowRight size={14} /></button>
          </article>
          <article className="mailer-metric-card">
            <div className="mailer-metric-top">
              <span>Campaign drafts</span>
              <span className="mailer-metric-icon"><FileText size={17} /></span>
            </div>
            <strong>{isRefreshing ? '—' : drafts}</strong>
            <p>{emailCampaigns.length} total campaign{emailCampaigns.length === 1 ? '' : 's'}</p>
            <button onClick={() => chooseTab('campaigns')}>Continue a draft <ArrowRight size={14} /></button>
          </article>
          <article className="mailer-metric-card">
            <div className="mailer-metric-top">
              <span>Saved templates</span>
              <span className="mailer-metric-icon"><BarChart3 size={17} /></span>
            </div>
            <strong>{isRefreshing ? '—' : emailTemplates.length}</strong>
            <p>Ready to use in a campaign</p>
            <button onClick={() => chooseTab('templates')}>Browse templates <ArrowRight size={14} /></button>
          </article>
        </section>

        <div className="mailer-overview-grid">
          <section className="mailer-next-step">
            <div className="mailer-next-copy">
              <div className="mailer-next-label">YOUR NEXT STEP</div>
              <h2>{configured ? 'Create a campaign that feels personal.' : 'Connect your email provider.'}</h2>
              <p>
                {configured
                  ? 'Choose a saved template or start with a blank campaign. Your campaign activity will appear here.'
                  : 'Add your sending details and verify them before preparing a campaign.'}
              </p>
              <button
                className="mailer-primary-button"
                onClick={() => chooseTab(configured ? 'campaigns' : 'email-settings')}
              >
                {configured ? 'Open campaigns' : 'Configure email'}
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="mailer-mail-art" aria-hidden="true">
              <div className="mailer-mail-orbit mailer-orbit-one" />
              <div className="mailer-mail-orbit mailer-orbit-two" />
              <div className="mailer-mail-window">
                <div className="mailer-mail-window-top"><span /><span /><span /></div>
                <div className="mailer-envelope"><Mail size={40} strokeWidth={1.4} /></div>
                <div className="mailer-mail-line mailer-line-wide" />
                <div className="mailer-mail-line" />
              </div>
              <div className="mailer-art-chip"><Send size={15} /> READY TO SEND</div>
            </div>
          </section>

          <section className="mailer-activity-panel">
            <div className="mailer-activity-heading">
              <div>
                <span className="mailer-eyebrow">ACCOUNT CHECK</span>
                <h2>Sending readiness</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="mailer-check-row">
              <span className={`mailer-check-icon ${configured ? 'is-ready' : ''}`}>
                {configured ? <Check size={15} /> : <ArrowDownRight size={15} />}
              </span>
              <div><strong>Email provider</strong><small>{configured ? 'Verified and active' : 'Setup required'}</small></div>
              <button aria-label="Open email account settings" onClick={() => chooseTab('email-settings')}><ArrowRight size={16} /></button>
            </div>
            <div className="mailer-check-row">
              <span className={`mailer-check-icon ${emailTemplates.length ? 'is-ready' : ''}`}>
                {emailTemplates.length ? <Check size={15} /> : <FileText size={15} />}
              </span>
              <div><strong>Campaign templates</strong><small>{emailTemplates.length ? `${emailTemplates.length} available` : 'No saved templates yet'}</small></div>
              <button aria-label="Open templates" onClick={() => chooseTab('templates')}><ArrowRight size={16} /></button>
            </div>
            <div className="mailer-check-row">
              <span className={`mailer-check-icon ${emailCampaigns.length ? 'is-ready' : ''}`}>
                {emailCampaigns.length ? <Check size={15} /> : <Send size={15} />}
              </span>
              <div><strong>First campaign</strong><small>{emailCampaigns.length ? `${emailCampaigns.length} in your workspace` : 'Create a campaign to begin'}</small></div>
              <button aria-label="Open campaigns" onClick={() => chooseTab('campaigns')}><ArrowRight size={16} /></button>
            </div>
          </section>
        </div>
      </>
    );
  };

  const pageTitle = activeTab === 'overview'
    ? 'Overview'
    : activeTab === 'email-settings'
      ? 'Email account'
      : activeTab === 'campaigns'
        ? 'Campaigns'
        : activeTab === 'templates'
          ? 'Templates'
        : activeTab === 'api-keys'
          ? 'API keys'
          : activeTab === 'billing'
            ? 'Plans & billing'
          : 'Account settings';

  return (
    <div className="mailer-dashboard">
      <aside className={`mailer-sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <div className="mailer-brand">
          <div className="mailer-brand-mark"><Mail size={20} strokeWidth={2.4} /></div>
          <div><strong>iyonic</strong><span>MAILER</span></div>
          <button className="mailer-mobile-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="mailer-workspace-label">WORKSPACE</div>
        <nav className="mailer-nav" aria-label="Mailer navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`mailer-nav-item ${activeTab === id ? 'is-active' : ''}`}
              onClick={() => chooseTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.8} />
              <span>{label}</span>
              {id === 'email-settings' && !configured && <span className="mailer-nav-indicator" aria-label="Setup required" />}
            </button>
          ))}
        </nav>
        <div className="mailer-sidebar-spacer" />
        <div className="mailer-sidebar-help">
          <div className="mailer-help-icon"><HelpCircle size={17} /></div>
          <div><strong>Need a hand?</strong><Link to="/iyonic-mailer/docs">Read the docs <ArrowRight size={12} /></Link></div>
        </div>
        <div className="mailer-sidebar-foot"><span className="mailer-live-dot" /> Service status <span>Operational</span></div>
      </aside>

      <main className="mailer-main">
        <header className="mailer-topbar">
          <div className="mailer-topbar-left">
            <button className="mailer-menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
            <div className="mailer-breadcrumb"><span>Iyonic Mailer</span><span className="mailer-breadcrumb-slash">/</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="mailer-topbar-actions">
            <button className="mailer-help-link" onClick={() => navigate('/iyonic-mailer/docs')}><HelpCircle size={16} /><span>Help center</span></button>
            <div className="mailer-profile-wrap">
              <button
                className="mailer-profile-trigger"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              >
                <span className="mailer-avatar">{initials}</span>
                <span className="mailer-profile-name">{user?.firstName || user?.name || 'Account'}</span>
                <ChevronDown size={15} />
              </button>
              {profileMenuOpen && (
                <div className="mailer-profile-menu" role="menu">
                  <div className="mailer-menu-account">{user?.email}</div>
                  <button role="menuitem" onClick={() => chooseTab('account')}><UserRound size={16} /> Personal profile</button>
                  <button role="menuitem" onClick={handleSignOut}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mailer-page-content">
          {activeTab === 'overview' ? renderSection() : (
            <>
              {activeTab !== 'account' && (
                <div className="mailer-page-heading">
                  <div>
                    <div className="mailer-eyebrow"><span className="mailer-eyebrow-dot" /> IYONIC MAILER</div>
                    <h1>{pageTitle}</h1>
                    <p>
                      {activeTab === 'email-settings' && 'Connect the email service you use to send campaigns.'}
                      {activeTab === 'campaigns' && 'Create, organize, and send email campaigns.'}
                      {activeTab === 'templates' && 'Build reusable email layouts for your campaigns.'}
                      {activeTab === 'api-keys' && 'Create credentials for server-side email integrations.'}
                      {activeTab === 'billing' && 'Review usage, choose a plan, and manage payment.'}
                    </p>
                  </div>
                  <div className={`mailer-header-status ${configured ? 'is-ready' : ''}`}>
                    <span />{configured ? 'Provider verified' : 'Provider setup required'}
                  </div>
                </div>
              )}
              {renderSection()}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
