import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Music2, Radio, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';

type Mode = 'login' | 'register';

const safeReturnPath = (candidate: string | null) => {
  if (!candidate || !candidate.startsWith('/nlmsongs/') || candidate.startsWith('//') || candidate.includes('\\')) return '/nlmsongs/listen';
  const parsed = new URL(candidate, window.location.origin);
  if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/nlmsongs/') || /^\/nlmsongs\/(login|register|dashboard)(\/|$)/.test(parsed.pathname)) return '/nlmsongs/listen';
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

const NLMSongsAuthPage = ({ mode: initialMode }: { mode: Mode }) => {
  const { login, register, user, isInitializing, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const query = new URLSearchParams(location.search);
  const returnPath = safeReturnPath(query.get('redirect') || (location.state as { from?: string } | null)?.from || null);

  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    if (user && !isInitializing) navigate(returnPath, { replace: true });
  }, [user, isInitializing, navigate, returnPath]);

  const switchMode = (nextMode: Mode) => {
    setError('');
    setMode(nextMode);
    navigate(`/nlmsongs/${nextMode === 'login' ? 'login' : 'register'}${location.search}`, { replace: true });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        const name = `${firstName.trim()} ${lastName.trim()}`.trim();
        await register({
          email: email.trim(),
          password,
          name,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          role: 'customer',
        });
      }
      navigate(returnPath, { replace: true });
    } catch (submissionError) {
      const message = (submissionError as { response?: { data?: { message?: unknown } }; message?: unknown })?.response?.data?.message
        || (submissionError as { message?: unknown })?.message;
      setError(typeof message === 'string' ? message : mode === 'login' ? 'We could not sign you in. Check your details and try again.' : 'We could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !isInitializing) return <main className="nlm-auth-opening" role="status">Opening your listening space…</main>;

  const busy = submitting || isLoading;
  return (
    <main className="nlm-auth-page">
      <section className="nlm-auth-story" aria-label="NLM Songs">
        <a className="nlm-auth-brand" href="/nlmsongs/listen" onClick={(event) => { event.preventDefault(); navigate('/nlmsongs/listen'); }}>
          <span className="nlm-brand-mark"><Music2 size={19} strokeWidth={2.4} /></span>
          <span>nlm<span>songs</span></span>
        </a>
        <div className="nlm-auth-editorial">
          <span className="nlm-auth-kicker"><Sparkles size={13} /> YOUR LISTENING SPACE</span>
          <h1>Find a little room<br />for <em>good music.</em></h1>
          <p>Come back to the songs you love, build a library that feels like yours, and discover what’s next.</p>
          <div className="nlm-auth-soundmark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <span className="nlm-auth-footnote"><Radio size={13} /> MUSIC, MADE PERSONAL</span>
        </div>
      </section>

      <section className="nlm-auth-form-side" aria-labelledby="nlm-auth-title">
        <a className="nlm-auth-back" href="/nlmsongs/listen" onClick={(event) => { event.preventDefault(); navigate('/nlmsongs/listen'); }}>Back to listening</a>
        <div className="nlm-auth-form-wrap">
          <span className="nlm-auth-kicker">{mode === 'login' ? 'WELCOME BACK' : 'A NEW LISTENING SPACE'}</span>
          <h2 id="nlm-auth-title">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <p className="nlm-auth-lede">{mode === 'login' ? 'Pick up where the music left off.' : 'Join NLM Songs and make your library your own.'}</p>

          <div className="nlm-auth-mode" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => switchMode('register')}>Create account</button>
          </div>

          <form className="nlm-auth-form" onSubmit={submit}>
            {mode === 'register' && <div className="nlm-auth-name-fields">
              <label>First name<input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
              <label>Last name<input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
            </div>}
            {mode === 'register' && <label>Phone number<input type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required /></label>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<span className="nlm-auth-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'register' ? 8 : undefined} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
            {mode === 'register' && <label>Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label>}
            {error && <p className="nlm-auth-error" role="alert">{error}</p>}
            <button className="nlm-auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in to NLM Songs' : 'Create my account'}<span aria-hidden="true">↗</span></button>
          </form>
          <p className="nlm-auth-privacy">Your account keeps your saved music and playlists together.</p>
        </div>
        <span className="nlm-auth-copyright">NLM SONGS <i /> LISTEN A LITTLE CLOSER</span>
      </section>
    </main>
  );
};

export default NLMSongsAuthPage;
