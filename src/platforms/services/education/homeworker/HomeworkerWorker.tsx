import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenText, Bot, Check, Clock3, CreditCard, ExternalLink, Globe2, LogOut, Loader2, Palette, Send, Settings, ShoppingBag, Store, Upload, UserRound, WalletCards } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Seller, sellersAPI, uploadAPI, userAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { defaultHomeworkerSettings, getHomeworkerSettings, HomeworkerMessage, HomeworkerSettings, isHomeworker, readHomeworkerOrder, saveHomeworkerSettings } from './homeworkerTypes';
import HomeworkerChat from './HomeworkerChat';
import './homeworker.css';

type Tab = 'available' | 'assigned';
type WorkspaceSection = 'orders' | 'settings' | 'billing' | 'profile' | 'website';

interface ProfileDraft {
  name: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface WebsiteDraft {
  storeName: string;
  description: string;
  currency: string;
  contactInfo: { email: string; phone: string; address: string; whatsapp: string };
}

interface BillingPlan {
  name: string;
  price: number;
  description?: string;
  features?: string[];
}

interface BillingData {
  subscription: Seller['subscription'];
  plans: Record<string, BillingPlan>;
  wallet: { balance: number; currency: string };
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'worker';
  text: string;
  timestamp: string;
}

const HomeworkerWorker: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('available');
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>('orders');
  const [settingsDraft, setSettingsDraft] = useState<HomeworkerSettings>(defaultHomeworkerSettings);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ name: '', firstName: '', lastName: '', phoneNumber: '' });
  const [websiteDraft, setWebsiteDraft] = useState<WebsiteDraft>({ storeName: '', description: '', currency: 'USD', contactInfo: { email: '', phone: '', address: '', whatsapp: '' } });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [websiteSaving, setWebsiteSaving] = useState(false);
  const [websiteError, setWebsiteError] = useState('');
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [autoRenewEnabled, setAutoRenewEnabled] = useState(false);
  const [autoRenewSaving, setAutoRenewSaving] = useState(false);
  const [billingAction, setBillingAction] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    if (!user?.sellerId) {
      navigate('/seller/dashboard', { replace: true });
      return;
    }
    setLoading(true); setError('');
    try {
      const [owner, allOrders] = await Promise.all([
        sellersAPI.getMe(),
        ordersAPI.getBySellerId(user.sellerId),
      ]);
      if (!isHomeworker(owner) || owner.id !== user.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setSeller(owner);
      setSettingsDraft(getHomeworkerSettings(owner));
      setWebsiteDraft({
        storeName: owner.storeName || '',
        description: owner.description || '',
        currency: owner.currency || 'USD',
        contactInfo: {
          email: owner.contactInfo?.email || '',
          phone: owner.contactInfo?.phone || '',
          address: owner.contactInfo?.address || '',
          whatsapp: owner.contactInfo?.whatsapp || '',
        },
      });
      setOrders(allOrders.filter((order) => readHomeworkerOrder(order)));
    } catch {
      setError('Could not load the worker workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    setProfileDraft({
      name: user.name || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
    });
  }, [user]);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    setBillingError('');
    try {
      const [billing, renewal] = await Promise.all([
        sellersAPI.getBilling(),
        sellersAPI.getAutoRenew(),
      ]);
      setBillingData(billing as BillingData);
      setAutoRenewEnabled(Boolean(renewal?.autoRenew?.iyonicshop?.enabled));
    } catch {
      setBillingError('Billing information could not be loaded. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (workspaceSection === 'billing' && seller) void loadBilling();
  }, [workspaceSection, seller?.id, loadBilling]);

  const settings = seller ? getHomeworkerSettings(seller) : null;

  const availableOrders = orders.filter((o) => !readHomeworkerOrder(o)?.workerId);
  const assignedOrders = orders.filter((o) => readHomeworkerOrder(o)?.workerId === seller?.id);

  const acceptOrder = async (order: Order) => {
    const hwData = readHomeworkerOrder(order);
    if (!hwData || !seller) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = await ordersAPI.update(order.id, {
        status: 'processing',
        deliveryLocation: JSON.stringify({ ...hwData, workerId: seller.id }),
      });
      setOrders((list) => list.map((item) => (item.id === order.id ? updated : item)));
      setNotice(`You accepted ${order.customerName}'s assignment.`);
    } catch {
      setError('Could not accept this order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (order: Order) => {
    const hwData = readHomeworkerOrder(order);
    if (!hwData || !seller) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = await ordersAPI.update(order.id, {
        status: 'shipped',
        deliveryLocation: JSON.stringify({ ...hwData, deliverableUrls: uploadFiles.length > 0 ? await uploadAPI.upload(uploadFiles) : hwData.deliverableUrls }),
      });
      setOrders((list) => list.map((item) => (item.id === order.id ? updated : item)));
      setUploadFiles([]);
      setNotice('Assignment marked as complete. The student will be notified.');
      if (selectedOrder?.id === order.id) setSelectedOrder(updated);
    } catch {
      setError('Could not mark this assignment as complete. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChat = (order: Order) => {
    setSelectedOrder(order);
    const hwData = readHomeworkerOrder(order);
    const savedMessages: ChatMessage[] = (hwData?.messages || []).map((m: HomeworkerMessage) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
    }));
    setMessages(savedMessages);
    setMessageDraft('');
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageDraft.trim() || !selectedOrder || !seller || sendingMessage) return;
    const newMessage: ChatMessage = {
      id: `sent-${Date.now()}`,
      sender: 'worker',
      text: messageDraft.trim(),
      timestamp: new Date().toISOString(),
    };
    const hwData = readHomeworkerOrder(selectedOrder);
    if (!hwData) return;
    setSendingMessage(true);
    setError('');
    try {
      const updatedMessages = [...(hwData.messages || []), { ...newMessage, id: newMessage.id } as HomeworkerMessage];
      const updatedOrder = await ordersAPI.update(selectedOrder.id, {
        deliveryLocation: JSON.stringify({ ...hwData, messages: updatedMessages }),
      });
      setMessages((current) => [...current, newMessage]);
      setMessageDraft('');
      setOrders((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
      setSelectedOrder(updatedOrder);
    } catch {
      setError('Your message could not be sent. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFiles(Array.from(event.target.files || []));
  };

  const openSection = (section: WorkspaceSection) => {
    setWorkspaceSection(section);
    setSelectedOrder(null);
    setError('');
    setNotice('');
  };

  const openInNewTab = (path: string) => {
    window.open(`${window.location.origin}/#${path}`, '_blank', 'noopener,noreferrer');
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    try {
      const updatedUser = await userAPI.updateProfile(profileDraft);
      setProfileDraft({
        name: updatedUser.name || '',
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        phoneNumber: updatedUser.phoneNumber || '',
      });
      setNotice('Profile updated successfully.');
    } catch {
      setProfileError('Your profile could not be updated. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveWebsite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seller) return;
    setWebsiteSaving(true);
    setWebsiteError('');
    try {
      const updatedSeller = await sellersAPI.updateMe({
        storeName: websiteDraft.storeName.trim(),
        description: websiteDraft.description.trim(),
        currency: websiteDraft.currency,
        contactInfo: websiteDraft.contactInfo,
      });
      setSeller(updatedSeller);
      setNotice('Website details saved. Your public Homeworker page now uses these settings.');
    } catch {
      setWebsiteError('Website settings could not be saved. Please try again.');
    } finally {
      setWebsiteSaving(false);
    }
  };

  const handleSaveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seller) return;
    setSettingsSaving(true);
    setSettingsError('');
    try {
      const updatedSeller = await sellersAPI.updateMe(saveHomeworkerSettings(seller, settingsDraft));
      setSeller(updatedSeller);
      setSettingsDraft(getHomeworkerSettings(updatedSeller));
      setNotice('Homeworker settings saved. Your storefront now uses these values.');
    } catch {
      setSettingsError('Settings could not be saved. Please try again.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAutoRenewChange = async (enabled: boolean) => {
    if (!billingData) return;
    const previousValue = autoRenewEnabled;
    setAutoRenewEnabled(enabled);
    setAutoRenewSaving(true);
    setBillingError('');
    try {
      await sellersAPI.updateAutoRenew('iyonicshop', enabled, billingData.subscription.plan);
    } catch {
      setAutoRenewEnabled(previousValue);
      setBillingError('Auto-renew could not be updated. Please try again.');
    } finally {
      setAutoRenewSaving(false);
    }
  };

  const handlePlanAction = async (planId: string) => {
    if (!billingData) return;
    if (planId !== 'basic') {
      navigate('/iyonicpay?tab=my-bills');
      return;
    }
    setBillingAction(planId);
    setBillingError('');
    try {
      const result = await sellersAPI.paySubscriptionWithWallet(planId);
      const updatedSeller = await sellersAPI.getMe();
      setSeller(updatedSeller);
      setNotice(result.message || 'Your plan has been updated.');
      await loadBilling();
    } catch {
      setBillingError('The plan could not be activated from your wallet. Check your balance and try again.');
    } finally {
      setBillingAction('');
    }
  };

  if (loading) {
    return (
      <div className="homeworker-worker-shell">
        <div className="homeworker-worker-loading"><Loader2 className="loading-spinner" /> Loading your worker workspace…</div>
      </div>
    );
  }
  if (!seller) {
    return (
      <div className="homeworker-worker-shell">
        <div className="homeworker-worker-loading" role="alert">{error || 'This worker workspace is unavailable.'}</div>
      </div>
    );
  }

  return (
    <div className="homeworker-worker-shell">
      <aside className="homeworker-worker-sidebar">
        <div className="homeworker-worker-brand"><span className="wordmark-mark"><ShoppingBag size={18} /></span><b>Homeworker</b><small>WORKER DESK</small></div>
        <nav aria-label="Worker workspace">
          <div className="homeworker-sidebar-group">
            <p className="homeworker-sidebar-label">WORK QUEUE</p>
            <button className={workspaceSection === 'orders' && tab === 'available' && !selectedOrder ? 'active' : ''} onClick={() => { setWorkspaceSection('orders'); setTab('available'); setSelectedOrder(null); }}>
              <span className="homeworker-nav-item-label"><ShoppingBag size={16} /> Available orders</span><span className="homeworker-nav-count">{availableOrders.length}</span>
            </button>
            <button className={workspaceSection === 'orders' && tab === 'assigned' && !selectedOrder ? 'active' : ''} onClick={() => { setWorkspaceSection('orders'); setTab('assigned'); setSelectedOrder(null); }}>
              <span className="homeworker-nav-item-label"><Send size={16} /> My assignments</span><span className="homeworker-nav-count">{assignedOrders.length}</span>
            </button>
          </div>
          <div className="homeworker-sidebar-group">
            <p className="homeworker-sidebar-label">ACCOUNT</p>
            <button className={workspaceSection === 'profile' ? 'active' : ''} onClick={() => openSection('profile')}><span className="homeworker-nav-item-label"><UserRound size={16} /> Profile</span></button>
            <button className={workspaceSection === 'website' ? 'active' : ''} onClick={() => openSection('website')}><span className="homeworker-nav-item-label"><Store size={16} /> Website settings</span></button>
            <button className={workspaceSection === 'settings' ? 'active' : ''} onClick={() => openSection('settings')}><span className="homeworker-nav-item-label"><Settings size={16} /> Platform settings</span></button>
            <button className={workspaceSection === 'billing' ? 'active' : ''} onClick={() => openSection('billing')}><span className="homeworker-nav-item-label"><CreditCard size={16} /> Billing</span></button>
          </div>
          <div className="homeworker-sidebar-group">
            <p className="homeworker-sidebar-label">PLATFORM</p>
            <button onClick={() => navigate('/themes', { state: { from: '/homeworker/worker' } })}><span className="homeworker-nav-item-label"><Palette size={16} /> Theme library</span></button>
            <button onClick={() => openInNewTab('/homeworker')}><span className="homeworker-nav-item-label"><BookOpenText size={16} /> Homeworker landing</span><ExternalLink size={14} /></button>
            <button onClick={() => openInNewTab(`/shop/${encodeURIComponent(seller.subdomain)}`)}><span className="homeworker-nav-item-label"><Globe2 size={16} /> My website</span><ExternalLink size={14} /></button>
            <button onClick={() => navigate('/iyonicpay')}><span className="homeworker-nav-item-label"><WalletCards size={16} /> IyonicPay</span></button>
            <button onClick={() => navigate('/iyonicbots')}><span className="homeworker-nav-item-label"><Bot size={16} /> IyonicBots</span></button>
          </div>
        </nav>
        <div className="homeworker-worker-side-bottom">
          <div className="homeworker-avatar">{seller.storeName?.slice(0, 1).toUpperCase() || 'W'}</div>
          <div>
            <strong>{seller.storeName}</strong>
            <small>Worker account</small>
          </div>
          <button onClick={logout} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="homeworker-worker-main">
        <header className="homeworker-worker-topbar">
          <div className="homeworker-worker-heading">
            <span className="homeworker-worker-eyebrow">HOMEWORKER <i>/</i> WORKER DESK</span>
            <h1>{workspaceSection === 'settings' ? 'Platform settings' : workspaceSection === 'billing' ? 'Plan & billing' : workspaceSection === 'profile' ? 'Your profile' : workspaceSection === 'website' ? 'Website settings' : selectedOrder ? 'Assignment conversation' : tab === 'available' ? 'Available orders' : 'My assignments'}</h1>
            <p>{workspaceSection === 'settings' ? 'Manage pricing and student deposits.' : workspaceSection === 'billing' ? 'Review your subscription and wallet.' : workspaceSection === 'profile' ? 'Keep your account details current.' : workspaceSection === 'website' ? 'Manage the details students see on your site.' : selectedOrder ? 'Coordinate the work and deliverables.' : 'Review new requests and your active work.'}</p>
          </div>
        </header>

        {error && <div className="homeworker-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
        {notice && <div className="homeworker-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

        {workspaceSection === 'settings' ? (
          <section className="homeworker-workspace-panel homeworker-settings-panel">
            <div className="homeworker-panel-intro">
              <p className="homeworker-kicker">YOUR HOMEWORKER PLATFORM</p>
              <h2>Set your rates and deposit.</h2>
              <p>These values update the public submission form and each student’s price estimate.</p>
            </div>
            <form className="homeworker-settings-form" onSubmit={handleSaveSettings}>
              <label className="homeworker-settings-field homeworker-settings-model">
                <span>Pricing model</span>
                <select value={settingsDraft.pricingModel} onChange={(event) => setSettingsDraft({ ...settingsDraft, pricingModel: event.target.value as HomeworkerSettings['pricingModel'] })}>
                  <option value="per-page">Charge per page</option>
                  <option value="per-question">Charge per question</option>
                </select>
              </label>
              <label className="homeworker-settings-field">
                <span>Price per page</span>
                <div className="homeworker-settings-input"><span>{seller.currency || 'USD'}</span><input type="number" min="0" step="0.01" value={settingsDraft.pricePerPage} onChange={(event) => setSettingsDraft({ ...settingsDraft, pricePerPage: Math.max(0, Number(event.target.value) || 0) })} /></div>
              </label>
              <label className="homeworker-settings-field">
                <span>Price per question</span>
                <div className="homeworker-settings-input"><span>{seller.currency || 'USD'}</span><input type="number" min="0" step="0.01" value={settingsDraft.pricePerQuestion} onChange={(event) => setSettingsDraft({ ...settingsDraft, pricePerQuestion: Math.max(0, Number(event.target.value) || 0) })} /></div>
              </label>
              <label className="homeworker-settings-field">
                <span>Deposit required</span>
                <div className="homeworker-settings-input"><input type="number" min="0" max="100" step="1" value={settingsDraft.depositPercent} onChange={(event) => setSettingsDraft({ ...settingsDraft, depositPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} /><span>%</span></div>
              </label>
              <div className="homeworker-settings-summary">
                <span>Students pay</span>
                <strong>{settingsDraft.depositPercent}% deposit</strong>
                <p>The remaining balance is due when their completed work is delivered.</p>
              </div>
              {settingsError && <p className="homeworker-section-error" role="alert">{settingsError}</p>}
              <div className="homeworker-settings-actions">
                <button type="button" className="homeworker-outline-button" onClick={() => setSettingsDraft(settings || defaultHomeworkerSettings)} disabled={settingsSaving}>Discard changes</button>
                <button type="submit" className="homeworker-button homeworker-button-primary" disabled={settingsSaving}>
                  {settingsSaving ? 'Saving…' : 'Save settings'} <Check size={15} />
                </button>
              </div>
            </form>
          </section>
        ) : workspaceSection === 'profile' ? (
          <section className="homeworker-workspace-panel">
            <div className="homeworker-panel-intro">
              <p className="homeworker-kicker">ACCOUNT DETAILS</p>
              <h2>Your profile</h2>
              <p>These details identify you to students and on account communications.</p>
            </div>
            <form className="homeworker-settings-form" onSubmit={handleSaveProfile}>
              <label className="homeworker-settings-field homeworker-settings-model"><span>Display name</span><input required value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} /></label>
              <label className="homeworker-settings-field"><span>First name</span><input value={profileDraft.firstName} onChange={(event) => setProfileDraft({ ...profileDraft, firstName: event.target.value })} /></label>
              <label className="homeworker-settings-field"><span>Last name</span><input value={profileDraft.lastName} onChange={(event) => setProfileDraft({ ...profileDraft, lastName: event.target.value })} /></label>
              <label className="homeworker-settings-field"><span>Phone number</span><input type="tel" autoComplete="tel" value={profileDraft.phoneNumber} onChange={(event) => setProfileDraft({ ...profileDraft, phoneNumber: event.target.value })} /></label>
              <label className="homeworker-settings-field"><span>Email address</span><input type="email" value={user?.email || ''} disabled /></label>
              {profileError && <p className="homeworker-section-error" role="alert">{profileError}</p>}
              <div className="homeworker-settings-actions"><button type="submit" className="homeworker-button homeworker-button-primary" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'} <Check size={15} /></button></div>
            </form>
          </section>
        ) : workspaceSection === 'website' ? (
          <section className="homeworker-workspace-panel">
            <div className="homeworker-panel-intro">
              <p className="homeworker-kicker">PUBLIC HOMEWORKER SITE</p>
              <h2>Website settings</h2>
              <p>Update your name, description, and contact details on the live storefront.</p>
            </div>
            <form className="homeworker-settings-form" onSubmit={handleSaveWebsite}>
              <label className="homeworker-settings-field"><span>Website name</span><input required value={websiteDraft.storeName} onChange={(event) => setWebsiteDraft({ ...websiteDraft, storeName: event.target.value })} /></label>
              <label className="homeworker-settings-field"><span>Store currency</span><select value={websiteDraft.currency} onChange={(event) => setWebsiteDraft({ ...websiteDraft, currency: event.target.value })}><option value="USD">USD - US Dollar</option><option value="KES">KES - Kenyan Shilling</option></select></label>
              <label className="homeworker-settings-field homeworker-settings-model"><span>Website description</span><textarea rows={4} value={websiteDraft.description} onChange={(event) => setWebsiteDraft({ ...websiteDraft, description: event.target.value })} /></label>
              <label className="homeworker-settings-field"><span>Public email</span><input type="email" value={websiteDraft.contactInfo.email} onChange={(event) => setWebsiteDraft({ ...websiteDraft, contactInfo: { ...websiteDraft.contactInfo, email: event.target.value } })} /></label>
              <label className="homeworker-settings-field"><span>Phone number</span><input type="tel" value={websiteDraft.contactInfo.phone} onChange={(event) => setWebsiteDraft({ ...websiteDraft, contactInfo: { ...websiteDraft.contactInfo, phone: event.target.value } })} /></label>
              <label className="homeworker-settings-field"><span>WhatsApp number</span><input type="tel" value={websiteDraft.contactInfo.whatsapp} onChange={(event) => setWebsiteDraft({ ...websiteDraft, contactInfo: { ...websiteDraft.contactInfo, whatsapp: event.target.value } })} /></label>
              <label className="homeworker-settings-field"><span>Business address</span><input value={websiteDraft.contactInfo.address} onChange={(event) => setWebsiteDraft({ ...websiteDraft, contactInfo: { ...websiteDraft.contactInfo, address: event.target.value } })} /></label>
              <div className="homeworker-website-preview">
                <Globe2 size={17} />
                <span>Current storefront</span>
                <button type="button" onClick={() => openInNewTab(`/shop/${encodeURIComponent(seller.subdomain)}`)}>View site <ExternalLink size={14} /></button>
              </div>
              {websiteError && <p className="homeworker-section-error" role="alert">{websiteError}</p>}
              <div className="homeworker-settings-actions"><button type="submit" className="homeworker-button homeworker-button-primary" disabled={websiteSaving}>{websiteSaving ? 'Saving…' : 'Save website settings'} <Check size={15} /></button></div>
            </form>
          </section>
        ) : workspaceSection === 'billing' ? (
          <section className="homeworker-workspace-panel homeworker-billing-panel">
            <div className="homeworker-panel-intro">
              <p className="homeworker-kicker">ACCOUNT & SUBSCRIPTION</p>
              <h2>Plan and billing</h2>
              <p>Review your current plan, wallet balance, and renewal preferences.</p>
            </div>
            {billingLoading ? (
              <div className="homeworker-billing-loading"><span className="loading-spinner" /> Loading billing details…</div>
            ) : billingError && !billingData ? (
              <div className="homeworker-billing-error" role="alert"><p>{billingError}</p><button className="homeworker-outline-button" onClick={() => void loadBilling()}>Try again</button></div>
            ) : billingData ? (
              <>
                <div className="homeworker-billing-overview">
                  <article className="homeworker-current-plan">
                    <span>Current plan</span>
                    <strong>{billingData.plans[billingData.subscription?.plan || 'starter']?.name || billingData.subscription?.plan || 'Starter'}</strong>
                    <small className={`homeworker-subscription-status status-${billingData.subscription?.status || 'active'}`}>{billingData.subscription?.status || 'active'}</small>
                    <p>{billingData.subscription?.endDate ? `Renews or expires ${new Date(billingData.subscription.endDate).toLocaleDateString()}` : 'No expiration date is set for this plan.'}</p>
                  </article>
                  <article className="homeworker-wallet-balance">
                    <span>Available wallet balance</span>
                    <strong>{formatPrice(Number(billingData.wallet?.balance || 0), billingData.wallet?.currency || seller.currency || 'USD')}</strong>
                    <small>Used for eligible plan payments</small>
                  </article>
                </div>
                {billingError && <p className="homeworker-section-error" role="alert">{billingError}</p>}
                <div className="homeworker-plan-heading"><div><p className="homeworker-kicker">CHOOSE YOUR PLAN</p><h3>Plans for your next stage.</h3></div></div>
                <div className="homeworker-plan-grid">
                  {Object.entries(billingData.plans || {}).map(([planId, plan]) => {
                    const isCurrentPlan = planId === billingData.subscription?.plan;
                    return (
                      <article key={planId} className={`homeworker-plan-card ${isCurrentPlan ? 'is-current' : ''}`}>
                        {isCurrentPlan && <span className="homeworker-plan-current-label">CURRENT PLAN</span>}
                        <h4>{plan.name}</h4>
                        <p className="homeworker-plan-price">{formatPrice(Number(plan.price || 0), billingData.wallet?.currency || 'USD')}<span> / month</span></p>
                        <p className="homeworker-plan-description">{plan.description || 'A flexible plan for your workspace.'}</p>
                        <ul>{(plan.features || []).map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul>
                        {isCurrentPlan && Number(plan.price) > 0 ? (
                          <label className="homeworker-renew-toggle">
                            <span><strong>Auto-renew</strong><small>Keep this plan active</small></span>
                            <input type="checkbox" role="switch" checked={autoRenewEnabled} disabled={autoRenewSaving} onChange={(event) => void handleAutoRenewChange(event.target.checked)} />
                          </label>
                        ) : (
                          <button className={isCurrentPlan ? 'homeworker-outline-button' : 'homeworker-button homeworker-button-primary'} disabled={isCurrentPlan || Boolean(billingAction)} onClick={() => void handlePlanAction(planId)}>
                            {billingAction === planId ? 'Updating…' : isCurrentPlan ? 'Current plan' : planId === 'basic' ? 'Pay with wallet' : 'Manage plan'}
                            {!isCurrentPlan && <ArrowRight size={15} />}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
        ) : selectedOrder ? (
          <div className="homeworker-worker-chat-view">
            <HomeworkerChat
              order={selectedOrder}
              messages={messages}
              onSendMessage={sendMessage}
              draft={messageDraft}
              onDraftChange={setMessageDraft}
              sending={sendingMessage}
              currentUser="worker"
              seller={seller}
            />

            <div className="homeworker-worker-deliverables">
              <h3>Upload completed work</h3>
              <div className="homeworker-upload-drop">
                <input
                  id="worker-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.png,.mp4"
                  hidden
                  onChange={handleFileUpload}
                />
                <label htmlFor="worker-upload" className="homeworker-upload-label">
                  <Upload size={18} />
                  <span>Choose deliverable files</span>
                </label>
                {uploadFiles.length > 0 && (
                  <div className="upload-preview-row">
                    {uploadFiles.map((file, i) => (
                      <div key={i} className="upload-preview-item">
                        <span>{file.name.slice(0, 20)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="homeworker-button homeworker-button-primary"
                onClick={() => markComplete(selectedOrder)}
                disabled={saving}
              >
                {saving ? 'Marking complete…' : 'Mark as complete'} <Check size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="homeworker-worker-orders">
            {(tab === 'available' ? availableOrders : assignedOrders).length ? (
              <div className="homeworker-worker-order-list">
                {(tab === 'available' ? availableOrders : assignedOrders).map((order) => {
                  const hwData = readHomeworkerOrder(order);
                  return (
                    <article key={order.id} className="homeworker-worker-order-card">
                      <div className="homeworker-worker-order-header">
                        <span className={`assignment-status status-${order.status}`}>{order.status === 'pending' ? 'New' : order.status === 'processing' ? 'In progress' : 'Ready'}</span>
                        <span className="homeworker-order-price">{formatPrice(order.total, order.currency || 'USD')}</span>
                      </div>
                      <div className="homeworker-worker-order-body">
                        <h3>{order.items[0]?.productName || 'Assignment'}</h3>
                        {hwData && (
                          <div className="homeworker-assignment-details">
                            <span><Clock3 size={14} /> {hwData.questionCount > 0 ? `${hwData.questionCount} questions` : `${hwData.pageCount} pages`} · {hwData.academicLevel}</span>
                            <span>Subject: {hwData.subject}</span>
                            <span>Deadline: {new Date(hwData.deadline).toLocaleString()}</span>
                          </div>
                        )}
                        {hwData?.instructions && <p className="homeworker-instructions">{hwData.instructions}</p>}
                        {hwData?.fileUrls && hwData.fileUrls.length > 0 && (
                          <div className="homeworker-file-list">
                            <span>Attached files:</span>
                            {hwData.fileUrls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <Upload size={12} /> File {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="homeworker-worker-order-actions">
                        {tab === 'available' && (
                          <button
                            className="homeworker-button homeworker-button-primary"
                            onClick={() => acceptOrder(order)}
                            disabled={saving}
                          >
                            {saving ? 'Accepting…' : 'Accept order'}
                          </button>
                        )}
                        {tab === 'assigned' && (
                          <button
                            className="homeworker-outline-button"
                            onClick={() => handleChat(order)}
                          >
                            <Send size={14} /> Message client
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="homeworker-empty">
                <ShoppingBag size={32} />
                <h3>{tab === 'available' ? 'No orders available right now.' : 'No assignments assigned to you.'}</h3>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomeworkerWorker;
