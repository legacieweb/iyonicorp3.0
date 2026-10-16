import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { getAuthErrorDetails } from '../../utils/authErrors';
import SEO from '../../components/SEO';
import './product-opt-in.css';

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

  return <main className="product-opt-in" style={{ '--product-tint': item.tint } as React.CSSProperties}>
    <SEO title={`Activate ${item.name} | IYONICORP`} description={`Use your existing IYONICORP account to activate ${item.name}.`} noIndex />
    <div className="product-opt-in-card">
      <section className="product-opt-in-story">
        <Link className="product-opt-in-brand" to="/" aria-label="Iyonicorp home"><span>I.</span> IYONICORP</Link>
        <div className="product-opt-in-story-copy">
          <p className="product-opt-in-kicker"><Sparkles size={14} /> {item.category} <span>·</span> CONNECTED TOOLS</p>
          <h1>One account.<br /><em>{item.name}.</em></h1>
          <p>{item.description} Sign in with your existing IYONICORP account to activate your workspace.</p>
        </div>
        <div className="product-opt-in-trust"><Check size={15} /> One secure sign-in across IYONICORP products</div>
      </section>

      <section className="product-opt-in-form-side">
        <div className="product-opt-in-form-wrap">
          <p className="product-opt-in-overline">ACCOUNT ACTIVATION</p>
          <h2>Welcome to {item.name}</h2>
          <p className="product-opt-in-intro">Use your existing account details. Your profile and password stay the same.</p>
          <form onSubmit={activate}>
            <label htmlFor="product-optin-username">Username or email
              <span className="product-opt-in-input"><input id="product-optin-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required placeholder="name@example.com" /></span>
            </label>
            <label htmlFor="product-optin-password">Password
              <span className="product-opt-in-input"><input id="product-optin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
            </label>
            {error && <div role="alert" className="product-opt-in-error"><span>{error}</span>{error.toLowerCase().includes('business workspace') && <Link to="/register?role=seller">Create a business account <ArrowRight size={13} /></Link>}</div>}
            <button type="submit" disabled={busy} className="product-opt-in-submit">{busy ? 'Activating workspace…' : `Continue to ${item.name}`} {busy ? <LockKeyhole size={16} /> : <ArrowRight size={17} />}</button>
          </form>
          <div className="product-opt-in-links"><Link to="/login">Sign in another way</Link><Link to="/">Back to IYONICORP</Link></div>
          <p className="product-opt-in-secure"><LockKeyhole size={14} /> Credentials are sent securely and never stored by this page.</p>
        </div>
      </section>
    </div>
  </main>;
};

export default ProductOptIn;
