import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { getAuthErrorDetails } from '../../utils/authErrors';
import SEO from '../../components/SEO';

const products: Record<string, { name: string; category: string; description: string; destination: string; tint: string }> = {
  bizhub: { name: 'BizHub', category: 'Commerce', description: 'Bring your business online and manage the work behind it.', destination: '/bizhub', tint: '#b6e3cb' },
  iyonicpay: { name: 'IyonicPay', category: 'Payments', description: 'Set up your payments workspace and get ready to accept and manage payments.', destination: '/iyonicpay', tint: '#a9c2ff' },
  iyonicintelligence: { name: 'Iyonic Intelligence', category: 'Automation', description: 'Open your workspace for customer conversations and business workflows.', destination: '/iyonicintelligence', tint: '#c6b6ff' },
  iyonicdb: { name: 'IyonicDB', category: 'Data', description: 'Activate your workspace for projects, databases, and API keys.', destination: '/iyonicdb/console', tint: '#a8ded9' },
  'iyonic-mailer': { name: 'IyonicMailer', category: 'Customer communication', description: 'Set up your campaigns, customer updates, and email workflows.', destination: '/iyonic-mailer/dashboard', tint: '#f0b6c5' },
};

export const ProductOptIn: React.FC = () => {
  const { product = '' } = useParams();
  const item = products[product.toLowerCase()];
  const { setAuthenticatedUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!item) return <Navigate to="/" replace />;

  const activate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await authAPI.optInToProduct(username.trim(), password, product.toLowerCase());
      setAuthenticatedUser(result.user, result.token);
      navigate(item.destination, { replace: true });
    } catch (err: any) {
      const details = getAuthErrorDetails(err, 'We could not activate this product.');
      setError(details.message);
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-[#f5f4ee] px-5 py-8 text-[#172d25] sm:px-8 sm:py-12">
    <SEO title={`Activate ${item.name} | IYONICORP`} description={`Use your existing IYONICORP account to activate ${item.name}.`} noIndex />
    <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_100px_rgba(31,54,41,.12)] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative flex min-h-[340px] flex-col justify-between overflow-hidden bg-[#203b30] p-8 text-white sm:p-12 lg:p-14">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/10 shadow-[0_0_0_45px_rgba(255,255,255,.035),0_0_0_100px_rgba(255,255,255,.025)]" />
        <div className="relative z-10 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 font-extrabold">I.</span><span className="font-bold tracking-tight">IYONICORP</span></div>
        <div className="relative z-10 max-w-lg py-14 lg:py-20">
          <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-white/65"><Sparkles size={14} style={{ color: item.tint }} /> {item.category} · connected tools</p>
          <h1 className="text-5xl font-semibold leading-[.98] tracking-[-.065em] sm:text-6xl">One account.<br /><span style={{ color: item.tint }}>{item.name}.</span></h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/70">{item.description} Sign in with your existing IYONICORP username and password to add it to your account.</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/55"><Check size={15} style={{ color: item.tint }} /> Your account details stay the same across products.</div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
        <div className="w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#698071]">Add a product to your account</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Activate {item.name}</h2>
          <p className="mt-3 text-sm leading-6 text-[#69766e]">Enter the username and password you already use with IYONICORP. No new account or profile to create.</p>
          <form className="mt-9 space-y-5" onSubmit={activate}>
            <label className="block text-sm font-semibold" htmlFor="product-optin-username">Username or email
              <input id="product-optin-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required className="mt-2 block h-12 w-full rounded-xl border border-[#dce3dc] bg-[#fbfcfa] px-4 py-3 font-normal outline-none transition focus:border-[#4768ed] focus:ring-4 focus:ring-[#4768ed]/10" placeholder="Your IYONICORP username" />
            </label>
            <label className="block text-sm font-semibold" htmlFor="product-optin-password">Password
              <span className="relative mt-2 block"><input id="product-optin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="block h-12 w-full rounded-xl border border-[#dce3dc] bg-[#fbfcfa] px-4 py-3 pr-12 font-normal outline-none transition focus:border-[#4768ed] focus:ring-4 focus:ring-[#4768ed]/10" placeholder="Your password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 grid place-items-center text-[#748178]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#203b30] px-5 font-semibold text-white transition hover:bg-[#2c5742] disabled:cursor-wait disabled:opacity-65">{busy ? 'Activating your product…' : `Continue to ${item.name}`} {busy ? <LockKeyhole size={16} /> : <ArrowRight size={17} />}</button>
          </form>
          <div className="mt-7 flex items-center justify-between border-t border-[#edf0eb] pt-5 text-sm"><Link className="font-semibold text-[#3c604b] hover:underline" to="/login">Sign in another way</Link><Link className="text-[#78857d] hover:text-[#203b30]" to="/">Back to IYONICORP</Link></div>
          <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#829087]"><LockKeyhole size={14} className="mt-0.5 shrink-0" /> We verify your details securely and never ask you to create a second account.</p>
        </div>
      </section>
    </div>
  </main>;
};

export default ProductOptIn;
