import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Check,
  Mail,
  Settings,
  KeyRound,
  CreditCard,
  ArrowRight,
  Menu,
  Lock,
  Globe,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useToast } from '../context/ToastContext';
import './iyonic-mailer-docs.css';

type SectionId = 'overview' | 'authentication' | 'api' | 'providers' | 'plans';

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const colorMap: Record<string, string> = {
    GET: 'get',
    POST: 'post',
    PATCH: 'patch',
    DELETE: 'delete',
  };
  const cls = `im-method ${colorMap[method.toUpperCase()] || 'post'}`;
  return <span className={cls}>{method}</span>;
};

const ApiEndpoint: React.FC<{
  method: string;
  path: string;
  description?: string;
  children?: React.ReactNode;
}> = ({ method, path, description, children }) => (
  <div className="im-endpoint">
    <div className="im-endpoint-head">
      <MethodBadge method={method} />
      <code>{path}</code>
    </div>
    {description && <div className="im-endpoint-desc"><p>{description}</p></div>}
    {children}
  </div>
);

interface CodeBlockProps {
  label: string;
  text: string;
  language?: string;
}
const CodeBlock: React.FC<CodeBlockProps> = ({ label, text, language = 'bash' }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Could not copy. Select the text manually.', 'error');
    }
  };

  return (
    <div className="im-doc-code">
      <div className="im-code-head">
        <span>{label}</span>
        <button type="button" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? (<><Check size={13} /> Copied</>) : (<><Copy size={13} /> Copy</>)}
        </button>
      </div>
      <pre className={`language-${language}`}><code className={`language-${language}`}>{text}</code></pre>
    </div>
  );
};

const getStartedSteps: Array<{ title: string; description: string }> = [
  { title: 'Create an account', description: 'Sign up for an Iyonicorp account and open IyonicMailer in your console.' },
  { title: 'Verify an email provider', description: 'Configure and verify an SMTP or supported provider in Console → IyonicMailer → Email account before sending.' },
  { title: 'Create an API key', description: 'Open Console → IyonicMailer → API keys. Create a named key and copy it once; the secret is only shown at creation.' },
  { title: 'Send from your server', description: 'Store the key in a server-side .env file and call the send endpoint from your backend.' },
];

const statusCodes = [
  { code: '202', label: 'Accepted', description: 'The email was accepted and queued for delivery.' },
  { code: '400', label: 'Bad Request', description: 'One or more required fields are missing, empty, or invalid.' },
  { code: '401', label: 'Unauthorized', description: 'The API key is missing, invalid, or revoked.' },
  { code: '403', label: 'Forbidden', description: 'Your account is suspended or unavailable.' },
  { code: '409', label: 'Conflict', description: 'A verified email provider is required before you can send.' },
  { code: '429', label: 'Too Many Requests', description: 'Your plan has reached its monthly email limit. Upgrade to send more.' },
  { code: '502', label: 'Bad Gateway', description: 'The email could not be sent. Check your provider settings and try again.' },
];

const providers = [
  { name: 'SMTP', description: 'Your own mail server' },
  { name: 'SendGrid', description: 'Cloud email API' },
  { name: 'Mailgun', description: 'API-first email platform' },
  { name: 'AWS SES', description: 'Amazon Simple Email Service' },
  { name: 'Sendinblue', description: 'Email & marketing automation' },
  { name: 'Postmark', description: 'Transactional email' },
];

const tocItems: Array<{ id: SectionId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'api', label: 'API reference' },
  { id: 'providers', label: 'Providers' },
  { id: 'plans', label: 'Plans & billing' },
];

export const IyonicMailerDocs: React.FC = () => {
  const navigate = useNavigate();
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && sectionRefs.current[hash as SectionId]) {
        setMobileTocOpen(false);
        sectionRefs.current[hash as SectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const elements = tocItems
      .map((item) => sectionRefs.current[item.id])
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = (visible.target as HTMLElement).getAttribute('id') as SectionId;
          setActiveSection(id);
        }
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <SEO
        title="IyonicMailer API Documentation | Iyonicorp"
        description="IyonicMailer API documentation. Send transactional and marketing email via the REST API, manage verified sending providers, and review plan limits and billing."
        canonical="https://iyonicorp.com/iyonic-mailer/docs"
        keywords="IyonicMailer, email API, email marketing API, SMTP, transactional email, API keys, billing"
      />

      <div className="im-docs">
        <header className="im-docs-nav">
          <Link to="/iyonic-mailer" className="im-docs-brand" aria-label="IyonicMailer home">
            <span className="im-docs-brand-icon"><Mail size={19} strokeWidth={2.2} /></span>
            <span>Iyonic<span>Mailer</span></span>
          </Link>
          <nav className="im-docs-nav-center" aria-label="Documentation">
            {tocItems.map((item) => (
              <a key={item.id} href={`#${item.id}`}>{item.label}</a>
            ))}
          </nav>
          <div className="im-docs-nav-actions">
            <button
              type="button"
              className="im-console-btn"
              onClick={() => navigate('/iyonic-mailer/dashboard')}
              aria-label="Open the IyonicMailer console"
            >
              <KeyRound size={15} /> Open console
            </button>
            <button
              type="button"
              className="im-mobile-menu-btn"
              aria-label="Open documentation menu"
              aria-expanded={mobileTocOpen}
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        <div className={`im-toc-overlay ${mobileTocOpen ? 'is-open' : ''}`} onClick={() => setMobileTocOpen(false)} aria-hidden="true" />

        <div className="im-docs-layout">
          <aside className={`im-docs-toc ${mobileTocOpen ? 'is-open' : ''}`} aria-label="On-page navigation">
            <p className="im-toc-eyebrow">DOCUMENTATION</p>
            <nav className="im-toc-list" role="tablist">
              {tocItems.map((item) => (
                <span className={`im-toc-item ${activeSection === item.id ? 'is-active' : ''}`} key={item.id}>
                  <a href={`#${item.id}`} onClick={() => setMobileTocOpen(false)}>{item.label}</a>
                </span>
              ))}
            </nav>
          </aside>

          <main className="im-docs-main">
            <section id="overview" ref={(el) => (sectionRefs.current.overview = el)} className="im-doc-section">
              <div className="im-doc-heading">
                <span className="im-doc-num">01</span>
                <div>
                  <h2>Overview</h2>
                  <p>IyonicMailer sends transactional and marketing email through your verified email provider.</p>
                </div>
              </div>

              <p className="im-docs-eyebrow"><span /> REST API</p>
              <h1 className="im-docs-title">Send your first<br /><em>transactional email.</em></h1>
              <p className="im-docs-intro">
                IyonicMailer lets you send email from your backend using a single secret API key. Create a verified
                provider in your workspace, then call <code>POST /api/mailer/v1/send</code> to deliver to one recipient.
              </p>

              <ol className="im-doc-steps">
                {getStartedSteps.map((step, index) => (
                  <li key={step.title}>
                    <span>{index + 1}</span>
                    <div>
                      <b>{step.title}</b>
                      <p>{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <CodeBlock
                label="QUICK START"
                text={`# 1. Save your secret server-side (keep this out of source control)
IYONIC_MAILER_API_URL=https://api.iyonicorp.com/api/mailer/v1
IYONIC_MAILER_API_KEY=im_sk_replace_with_your_secret_key

# 2. Send from your backend (after loading .env)
curl "$IYONIC_MAILER_API_URL/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $IYONIC_MAILER_API_KEY" \\
  -d '{"to":"customer@example.com","subject":"Hello","text":"Welcome!","html":"<h1>Welcome</h1>"}'
`}
                language="bash"
              />
            </section>

            <section id="authentication" ref={(el) => (sectionRefs.current.authentication = el)} className="im-doc-section">
              <div className="im-doc-heading">
                <span className="im-doc-num">02</span>
                <div>
                  <h2>Authentication</h2>
                  <p>Every request is authenticated with a secret API key.</p>
                </div>
              </div>

              <p>
                IyonicMailer keys are private server credentials prefixed with <code>im_sk_</code>. Send the key in the
                <code> x-api-key </code> header or as a Bearer token. Never put a live key in browser JavaScript, a mobile
                app, or source control.
              </p>

              <CodeBlock
                label="HEADER · KEEP THIS SECRET"
                text={`x-api-key: im_sk_your_secret_key
# or
Authorization: Bearer im_sk_your_secret_key`}
                language="http"
              />

              <div className="im-doc-callout">
                <Lock size={17} />
                <p>
                  <b>Keep your key on the server.</b> API keys bypass your workspace login. If a key is exposed, revoke it
                  in Console → IyonicMailer → API keys and create a new one immediately. Keys are hashed at rest and shown
                  only once at creation.
                </p>
              </div>

              <h3 className="im-doc-sub">Key management (Console)</h3>
              <p>
                Manage keys from your IyonicMailer workspace. The endpoints below require your authenticated session cookie
                from the console, not an API key.
              </p>

              <ApiEndpoint method="GET" path="/api/iyonicmailer/keys" description="List the API keys for your IyonicMailer workspace." />
              <ApiEndpoint
                method="POST"
                path="/api/iyonicmailer/keys"
                description="Create a new key. Send a JSON body with a name. The full secret is returned once in the response."
              >
                <CodeBlock
                  label="REQUEST"
                  text={`curl https://api.iyonicorp.com/api/iyonicmailer/keys \\
  -H "Content-Type: application/json" \\
  -H "x-auth-token: $JWT_OR_COOKIE" \\
  -d '{"name":"production-server"}'

# Response (secret shown only here)
{"id":"key_abc123","name":"production-server","key_prefix":"im_sk_...","secret":"im_sk_live_..."}`}
                  language="bash"
                />
              </ApiEndpoint>
              <ApiEndpoint
                method="POST"
                path="/api/iyonicmailer/keys/:keyId/revoke"
                description="Revoke an active key. It stops sending immediately and frees a plan slot."
              >
                <CodeBlock
                  label="REVOKE A KEY"
                  text={`curl -X POST https://api.iyonicorp.com/api/iyonicmailer/keys/$KEY_ID/revoke \\
  -H "x-auth-token: $JWT_OR_COOKIE"`}
                  language="bash"
                />
              </ApiEndpoint>
            </section>

            <section id="api" ref={(el) => (sectionRefs.current.api = el)} className="im-doc-section">
              <div className="im-doc-heading">
                <span className="im-doc-num">03</span>
                <div>
                  <h2>API reference</h2>
                  <p>Send a single transactional email to one recipient per request.</p>
                </div>
              </div>

              <ApiEndpoint
                method="POST"
                path="https://api.iyonicorp.com/api/mailer/v1/send"
                description="Send one email to a single recipient. The API key is accepted in the x-api-key header or as a Bearer token."
              />

              <h3 className="im-doc-sub">Request body</h3>
              <table className="im-doc-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>to</code></td>
                    <td>string</td>
                    <td>Yes</td>
                    <td>One recipient email address.</td>
                  </tr>
                  <tr>
                    <td><code>subject</code></td>
                    <td>string</td>
                    <td>Yes</td>
                    <td>Email subject, 1–255 characters.</td>
                  </tr>
                  <tr>
                    <td><code>html</code></td>
                    <td>string</td>
                    <td>One of html or text</td>
                    <td>HTML message body.</td>
                  </tr>
                  <tr>
                    <td><code>text</code></td>
                    <td>string</td>
                    <td>One of html or text</td>
                    <td>Plain-text body. May be sent alongside html.</td>
                  </tr>
                </tbody>
              </table>

              <CodeBlock
                label="SEND AN EMAIL"
                text={`curl https://api.iyonicorp.com/api/mailer/v1/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: im_sk_YOUR_API_KEY" \\
  -d '{
    "to": "customer@example.com",
    "subject": "Welcome",
    "html": "<h1>Hello</h1><p>Welcome to our service.</p>",
    "text": "Hello. Welcome to our service."
  }'`}
                language="bash"
              />

              <h3 className="im-doc-sub">Response</h3>
              <CodeBlock
                label="202 ACCEPTED"
                text={`{
  "accepted": true,
  "messageId": "provider-message-id",
  "usage": {
    "sentThisMonth": 1,
    "monthlyLimit": 1000
  }
}`}
                language="json"
              />

              <h3 className="im-doc-sub">Status codes</h3>
              <table className="im-doc-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {statusCodes.map((item) => (
                    <tr key={item.code}>
                      <td><code>{item.code}</code></td>
                      <td>{item.label}</td>
                      <td>{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section id="providers" ref={(el) => (sectionRefs.current.providers = el)} className="im-doc-section">
              <div className="im-doc-heading">
                <span className="im-doc-num">04</span>
                <div>
                  <h2>Verified providers</h2>
                  <p>Configure a sending provider before your first send.</p>
                </div>
              </div>

              <p>
                IyonicMailer sends through an email provider you verify in your workspace. Set your credentials in
                Console → IyonicMailer → Email account, then verify deliverability. Sending fails with a
                <code> 409 </code> until a provider is verified.
              </p>

              <div className="im-doc-callout">
                <Globe size={17} />
                <p><b>Provider choice is yours.</b> Bring your own SMTP or connect a supported provider. The address
                your messages send from is set by your verified provider, not by the API request.</p>
              </div>

              <div className="im-doc-grid cards">
                {providers.map((provider) => (
                  <div className="im-provider" key={provider.name}>
                    <div className="im-provider-head"><Settings size={16} /> <strong>{provider.name}</strong></div>
                    <small>{provider.description}</small>
                  </div>
                ))}
              </div>
            </section>

            <section id="plans" ref={(el) => (sectionRefs.current.plans = el)} className="im-doc-section">
              <div className="im-doc-heading">
                <span className="im-doc-num">05</span>
                <div>
                  <h2>Plans & billing</h2>
                  <p>Each plan sets active API-key and monthly email limits.</p>
                </div>
              </div>

              <p>
                Key and email limits apply account-wide. Revoking a key frees a slot immediately. Subscriptions run for
                30 days. Pay in USD with your IyonicPay wallet or via Paystack checkout.
              </p>

              <table className="im-doc-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price / 30 days</th>
                    <th>Active API keys</th>
                    <th>API emails / month</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Free</td><td>$0</td><td>2</td><td>1,000</td></tr>
                  <tr><td>Launch</td><td>$10</td><td>10</td><td>10,000</td></tr>
                  <tr><td>Growth</td><td>$35</td><td>25</td><td>100,000</td></tr>
                  <tr><td>Scale</td><td>$70</td><td>100</td><td>500,000</td></tr>
                </tbody>
              </table>

              <div className="im-doc-callout warning">
                <KeyRound size={17} />
                <p><b>Subscribe in your console.</b> Open Console → IyonicMailer → Plans & billing. IyonicPay converts
                plan prices from USD for supported wallet currencies; the checkout shows the charge before payment.</p>
              </div>
            </section>

            <div className="im-doc-bottom">
              <CreditCard size={38} />
              <div>
                <b>Ready to send?</b>
                <span>Open your IyonicMailer console to create a key and verify a provider.</span>
              </div>
              <a href="/iyonic-mailer/dashboard">
                Open console <ArrowRight size={15} />
              </a>
            </div>
          </main>
        </div>

        <footer className="im-docs-footer">
          <span><Mail size={16} /> IYONICMAILER · DEVELOPER DOCUMENTATION</span>
          <span><KeyRound size={13} /> One secret key · HTTPS only</span>
          <Link to="/iyonic-mailer">Product overview</Link>
        </footer>
      </div>
    </>
  );
};

export default IyonicMailerDocs;
