import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, CreditCard, KeyRound, Loader2, LockKeyhole, Send, ShieldCheck, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';

type MailerPlan = { id: string; name: string; price: number; currency: string; apiKeyLimit: number; monthlyEmailLimit: number };
type BillingData = { plans: MailerPlan[]; subscription: MailerPlan & { currentPeriodEnd: string | null; paymentMethod: string | null }; usage: { emailsSent: number; emailLimit: number }; wallet: { available: boolean; balance: number; currency: string; planCharges: Record<string, number> } };
type MailerApiKey = { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
type PaystackPopupCallbacks = { onSuccess: (transaction: { reference: string }) => void; onCancel: () => void; onError: (error: { message?: string }) => void };
type PaystackPopup = { resumeTransaction: (accessCode: string, callbacks: PaystackPopupCallbacks) => void };
declare global { interface Window { PaystackPop?: new () => PaystackPopup } }
let paystackInlineScript: Promise<void> | null = null;
const loadPaystackInline = () => {
  if (window.PaystackPop) return Promise.resolve();
  if (!paystackInlineScript) {
    paystackInlineScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.async = true;
      script.dataset.paystackInline = 'true';
      script.onload = () => window.PaystackPop ? resolve() : reject(new Error('Paystack popup did not initialize.'));
      script.onerror = () => reject(new Error('Could not load the Paystack popup. Check your connection and try again.'));
      document.head.appendChild(script);
    }).catch((error) => { paystackInlineScript = null; throw error; });
  }
  return paystackInlineScript;
};
const messageFrom = (error: unknown) => typeof error === 'object' && error !== null && 'response' in error && (error as { response?: { data?: { message?: string } } }).response?.data?.message || (error instanceof Error ? error.message : 'Could not complete the request.');
const money = (amount: number, currency: string) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); } catch { return `${currency} ${amount.toFixed(2)}`; } };

export const MailerBillingPanel: React.FC = () => {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [params, setParams] = useSearchParams();
  const refresh = async () => { const result = await api.get<BillingData>('/iyonicmailer/billing'); setData(result.data); };

  useEffect(() => { refresh().catch((err) => setError(messageFrom(err))).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (params.get('billing') !== 'verify' || !reference) return;
    setBusyPlan('verify');
    api.post('/iyonicmailer/billing/paystack/verify', { reference })
      .then(async ({ data: result }) => { setNotice(result.message || 'Payment confirmed. Your plan is active.'); await refresh(); })
      .catch((err) => setError(messageFrom(err)))
      .finally(() => { setBusyPlan(''); setParams({ tab: 'billing' }, { replace: true }); });
  }, [params, setParams]);

  const choosePlan = async (plan: MailerPlan, method: 'iyonicpay' | 'paystack') => {
    setBusyPlan(`${plan.id}-${method}`); setError(''); setNotice('');
    try {
      if (method === 'iyonicpay') {
        const result = await api.post('/iyonicmailer/billing/wallet/subscribe', { planId: plan.id });
        setNotice(result.data.message); await refresh();
      } else {
        const result = await api.post<{ accessCode: string }>('/iyonicmailer/billing/paystack/initialize', { planId: plan.id });
        await loadPaystackInline();
        if (!window.PaystackPop) throw new Error('Paystack popup is unavailable. Please try again.');
        const popup = new window.PaystackPop();
        popup.resumeTransaction(result.data.accessCode, {
          onSuccess: ({ reference }) => {
            setBusyPlan('verify');
            api.post('/iyonicmailer/billing/paystack/verify', { reference })
              .then(async ({ data: verification }) => { setNotice(verification.message || 'Payment confirmed. Your plan is active.'); await refresh(); })
              .catch((err) => setError(messageFrom(err)))
              .finally(() => setBusyPlan(''));
          },
          onCancel: () => { setBusyPlan(''); setNotice('Payment was cancelled. Your plan has not changed.'); },
          onError: (popupError) => { setBusyPlan(''); setError(popupError.message || 'Paystack could not open the payment popup.'); },
        });
      }
    } catch (err) { setError(messageFrom(err)); setBusyPlan(''); }
  };

  if (loading) return <section className="mailer-account-loading"><Loader2 className="mailer-spin" size={20} /> Loading plan and billing details…</section>;
  if (!data) return <section className="mailer-account-message" role="alert">{error || 'Billing information is unavailable.'}</section>;
  const current = data.subscription;
  return <div className="mailer-account-sections">
    {error && <p className="mailer-form-error" role="alert">{error}</p>}{notice && <p className="mailer-form-success" role="status"><Check size={15} />{notice}</p>}
    <section className="mailer-account-hero"><span className="mailer-section-icon"><CreditCard size={20} /></span><div><span className="mailer-eyebrow">SUBSCRIPTION</span><h2>{current.name} plan</h2><p>{current.id === 'free' ? 'Your free workspace is active. Upgrade when you need more API keys or email sends.' : `Active through ${current.currentPeriodEnd ? new Date(current.currentPeriodEnd).toLocaleDateString() : 'the current billing period'} · paid with ${current.paymentMethod || 'online checkout'}.`}</p></div><span className="mailer-plan-active"><i /> ACTIVE</span></section>
    <div className="mailer-account-usage-grid"><article><span>API EMAILS THIS MONTH</span><b>{data.usage.emailsSent.toLocaleString()} <small>/ {data.usage.emailLimit.toLocaleString()}</small></b><div className="mailer-plan-meter"><i style={{ width: `${Math.min(100, data.usage.emailsSent / Math.max(1, data.usage.emailLimit) * 100)}%` }} /></div></article><article><span>API KEYS INCLUDED</span><b>{current.apiKeyLimit} <small>active keys</small></b><p>Limits apply across your IyonicMailer account.</p></article><article><span>IYONICPAY WALLET</span><b>{data.wallet.available ? money(data.wallet.balance, data.wallet.currency) : 'Not linked'}</b><p>{data.wallet.available ? 'Available for plan checkout' : 'Link a wallet in IyonicPay to pay here.'}</p></article></div>
    <section className="mailer-plan-list"><div className="mailer-account-section-heading"><div><span className="mailer-eyebrow">PLANS & BILLING</span><h2>Choose your plan</h2></div><a href="/iyonicpay">Manage IyonicPay <ArrowRight size={14} /></a></div><div className="mailer-plan-cards">{data.plans.map((plan) => { const isCurrent = plan.id === current.id; const walletCharge = data.wallet.planCharges[plan.id]; const walletReady = data.wallet.available && walletCharge !== undefined && data.wallet.balance >= walletCharge; return <article className={`mailer-plan-card${isCurrent ? ' is-current' : ''}`} key={plan.id}><div className="mailer-plan-title"><b>{plan.name}</b>{isCurrent && <span>Current plan</span>}</div><strong>{plan.price === 0 ? 'Free' : money(plan.price, plan.currency)}<small>{plan.price ? ' / 30 days' : ' forever'}</small></strong><ul><li><KeyRound size={14} /> {plan.apiKeyLimit} active API keys</li><li><Send size={14} /> {plan.monthlyEmailLimit.toLocaleString()} API emails / month</li></ul>{plan.price > 0 && <p className="mailer-plan-wallet-quote">{walletCharge === undefined ? 'Wallet currency is not supported.' : `IyonicPay charge: ${money(walletCharge, data.wallet.currency)}`}</p>}{plan.price === 0 ? <button disabled>{isCurrent ? 'Included with your account' : 'Free plan'}</button> : <div className="mailer-plan-actions"><button disabled={busyPlan !== '' || isCurrent || !walletReady} onClick={() => choosePlan(plan, 'iyonicpay')}>{busyPlan === `${plan.id}-iyonicpay` ? 'Processing…' : !data.wallet.available ? 'Wallet not linked' : !walletReady ? 'Insufficient balance' : 'Pay with IyonicPay'}</button><button disabled={busyPlan !== '' || isCurrent} onClick={() => choosePlan(plan, 'paystack')}>{busyPlan === `${plan.id}-paystack` ? 'Opening checkout…' : 'Pay with Paystack'}</button></div>}</article>; })}</div></section>
    {(busyPlan === 'verify' || busyPlan.endsWith('-paystack')) && <p className="mailer-account-loading"><Loader2 className="mailer-spin" size={16} /> {busyPlan === 'verify' ? 'Verifying Paystack payment…' : 'Complete payment in the Paystack popup…'}</p>}
  </div>;
};

export const MailerApiKeysPanel: React.FC = () => {
  const [keys, setKeys] = useState<MailerApiKey[]>([]);
  const [plan, setPlan] = useState<MailerPlan | null>(null);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    const [keyResponse, billingResponse] = await Promise.all([api.get<MailerApiKey[]>('/iyonicmailer/keys'), api.get<BillingData>('/iyonicmailer/billing')]);
    setKeys(keyResponse.data); setPlan(billingResponse.data.subscription);
  };
  useEffect(() => { load().catch((err) => setError(messageFrom(err))).finally(() => setLoading(false)); }, []);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { const result = await api.post('/iyonicmailer/keys', { name }); setSecret(result.data.secret); setName(''); await load(); } catch (err) { setError(messageFrom(err)); } finally { setBusy(false); } };
  const revoke = async (id: string) => { setBusy(true); setError(''); try { await api.post(`/iyonicmailer/keys/${id}/revoke`); await load(); } catch (err) { setError(messageFrom(err)); } finally { setBusy(false); } };
  const active = keys.filter((key) => !key.revoked_at).length;
  if (loading) return <section className="mailer-account-loading"><Loader2 className="mailer-spin" size={20} /> Loading API keys…</section>;
  return <div className="mailer-account-sections">
    {error && <p className="mailer-form-error" role="alert">{error}</p>}
    <section className="mailer-account-hero"><span className="mailer-section-icon"><KeyRound size={20} /></span><div><span className="mailer-eyebrow">SERVER API ACCESS</span><h2>Your API keys</h2><p>Use a key in your server environment to send email through IyonicMailer.</p></div><span className="mailer-plan-active">{active} / {plan?.apiKeyLimit ?? '—'} active</span></section>
    {secret && <section className="mailer-key-reveal"><div><ShieldCheck size={17} /><span><b>Copy your key now.</b> For your security, it will not be shown again.</span></div><code>{secret}</code><button onClick={() => navigator.clipboard.writeText(secret).then(() => setSecret('')).catch(() => setError('Clipboard access failed. Select and copy the key manually.'))}><Copy size={14} /> Copy and dismiss</button></section>}
    <section className="mailer-key-manager"><div className="mailer-account-section-heading"><div><span className="mailer-eyebrow">CREDENTIALS</span><h2>Manage keys</h2></div><span>{active} active · {keys.length - active} revoked</span></div><form onSubmit={create}><label htmlFor="mailer-key-name">Key name</label><input id="mailer-key-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={64} required placeholder="production server" /><button disabled={busy || active >= (plan?.apiKeyLimit ?? 2)}>Create API key <KeyRound size={15} /></button>{active >= (plan?.apiKeyLimit ?? 2) && <p>Your {plan?.name || 'Free'} plan allows {plan?.apiKeyLimit ?? 2} active keys. Revoke a key or upgrade to continue.</p>}</form>{keys.map((key) => <article className="mailer-key-row" key={key.id}><span><KeyRound size={16} /></span><div><b>{key.name}</b><small>{key.key_prefix}… · created {new Date(key.created_at).toLocaleDateString()}{key.last_used_at ? ` · used ${new Date(key.last_used_at).toLocaleDateString()}` : ''}</small></div><em className={key.revoked_at ? 'revoked' : ''}>{key.revoked_at ? 'REVOKED' : 'ACTIVE'}</em>{!key.revoked_at && <button aria-label={`Revoke ${key.name}`} disabled={busy} onClick={() => revoke(key.id)}><X size={15} /></button>}</article>)}{!keys.length && <p className="mailer-key-empty">No API keys yet. Create one for your server app.</p>}</section>
    <p className="mailer-key-security"><LockKeyhole size={15} /> Keep secret keys in server-side environment variables. Never expose them in browser JavaScript or commit them to source control.</p>
  </div>;
};
