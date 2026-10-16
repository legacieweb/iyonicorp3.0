import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Database, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { getApiBaseUrl } from '../utils/apiUrl';
import './iyonicdb-access.css';

const IyonicDBAuth: React.FC = () => {
  const { user, login, register, isInitializing, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.pathname.endsWith('/register') ? 'register' : 'login';
  const requestedDestination = new URLSearchParams(location.search).get('redirect');
  const destination = requestedDestination && /^\/iyonicdb\/console(?:\?|$)/.test(requestedDestination)
    ? requestedDestination
    : '/iyonicdb/console';
  const destinationQuery = `?redirect=${encodeURIComponent(destination)}`;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  React.useEffect(() => {
    if (!isInitializing && user) navigate(destination, { replace: true });
  }, [destination, isInitializing, navigate, user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      if (mode === 'login') await login(email.trim(), password);
      else {
        const name = `${firstName.trim()} ${lastName.trim()}`.trim();
        await register({ firstName: firstName.trim(), lastName: lastName.trim(), name, email: email.trim(), password, phoneNumber: '', role: 'customer' });
        setNotice('Your account is ready. Opening your IyonicDB workspace…');
      }
      navigate(destination, { replace: true });
    } catch (requestError) {
      const value = requestError as { response?: { data?: { message?: string } }; message?: string };
      setError(value.response?.data?.message || value.message || 'We could not complete sign in. Please try again.');
    }
  };

  return <div className="idb-access">
    <SEO title={`${mode === 'login' ? 'Sign in' : 'Create account'} · IyonicDB`} description="Securely access your IyonicDB database projects, API keys, and usage." />
    <header className="idb-access-nav"><Link to="/iyonicdb" className="idb-access-brand"><span className="idb-access-mark"><i /><i /><i /></span>Iyonic<span>DB</span></Link><Link to="/iyonicdb/docs">Read the API docs <ArrowRight size={15} /></Link></header>
    <main className="idb-access-main">
      <section className="idb-access-story"><div className="idb-access-orbit"><Database size={34} /><span /><i /></div><p className="idb-access-eyebrow">YOUR DATA WORKSPACE</p><h1>Build with data<br /><em>that stays yours.</em></h1><p className="idb-access-lede">Sign in to manage isolated PostgreSQL projects, connect your app with secure API keys, and see usage as it happens.</p><div className="idb-access-promise"><span><ShieldCheck size={16} /> Project-isolated storage</span><span><KeyRound size={16} /> Keys shown once</span><span><LockKeyhole size={16} /> HTTPS API access</span></div><div className="idb-access-code"><span>QUICK CONNECT</span><code>Authorization: Bearer idb_live_••••••••</code></div></section>
      <section className="idb-access-card"><div className="idb-access-card-head"><span className="idb-access-card-icon"><LockKeyhole size={19} /></span><span>IONICDB CONSOLE <i /></span></div><p className="idb-access-overline">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</p><h2>{mode === 'login' ? 'Sign in to IyonicDB' : 'Create your account'}</h2><p className="idb-access-subtitle">{mode === 'login' ? 'Use your Iyonicorp account to continue.' : 'One account for your database and developer tools.'}</p>
        <div className="idb-access-toggle" role="tablist" aria-label="Account action"><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setError(''); navigate(`/iyonicdb/login${destinationQuery}`); }}>Sign in</button><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setError(''); navigate(`/iyonicdb/register${destinationQuery}`); }}>Create account</button></div>
        <form className="idb-access-form" onSubmit={submit}>
          {mode === 'register' && <div className="idb-access-name-fields"><label>First name<input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label>Last name<input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label></div>}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" /></label>
          <label>Password<span className="idb-access-password"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === 'register' ? 8 : undefined} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
          {error && <p className="idb-access-error" role="alert">{error}</p>}{notice && <p className="idb-access-success" role="status">{notice}</p>}
          <button className="idb-access-submit" type="submit" disabled={isLoading}>{isLoading ? 'Please wait…' : mode === 'login' ? 'Continue to workspace' : 'Create account'}<ArrowRight size={16} /></button>
        </form>
        <p className="idb-access-terms">By continuing, you agree to use IyonicDB responsibly and protect your account credentials.</p>
      </section>
    </main>
    <footer className="idb-access-footer"><span>IONICDB · SECURE DEVELOPER DATA</span><span>API {getApiBaseUrl()}/iyonicdb/v1</span><Link to="/iyonicdb">Back to IyonicDB</Link></footer>
  </div>;
};

export default IyonicDBAuth;
