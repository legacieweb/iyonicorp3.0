import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  ChevronDown,
  Code2,
  Database,
  FileJson2,
  KeyRound,
  Layers3,
  Menu,
  Plus,
  ShieldCheck,
  Table2,
  Terminal,
} from 'lucide-react';
import SEO from '../components/SEO';
import { HomepageFooter } from '../components/HomepageFooter';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './iyonicdb.css';

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  projectLimit: number;
  storageBytes: number;
  storageGb: number;
  requestsPerMonth: number;
  tableLimit: number;
  apiKeyLimit: number;
};
const formatPlanPrice = (plan: Pick<Plan, 'price' | 'currency'>) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency, maximumFractionDigits: 2 }).format(plan.price);
  } catch {
    return `${plan.currency} ${plan.price.toLocaleString()}`;
  }
};
const messageForError = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : 'The request could not be completed.';
};

const IyonicDBLogo = ({ compact = false }: { compact?: boolean }) => (
  <span className={`idb-logo${compact ? ' idb-logo-compact' : ''}`}>
    <span className="idb-logo-mark" aria-hidden="true"><i /><i /><i /></span>
    <span>Iyonic<span>DB</span></span>
  </span>
);

const scrollToIyonicDBSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const ProductHeader = ({ isAuthenticated }: { isAuthenticated: boolean }) => (
  <header className="idb-header">
    <Link className="idb-header-brand" to="/iyonicdb" aria-label="IyonicDB home"><IyonicDBLogo /><span>DATABASE PLATFORM</span></Link>
    <nav aria-label="IyonicDB navigation">
      <button type="button" onClick={() => scrollToIyonicDBSection('capabilities')}>Platform</button>
      <button type="button" onClick={() => scrollToIyonicDBSection('how-it-works')}>Data models</button>
      <button type="button" onClick={() => scrollToIyonicDBSection('plans')}>Plans</button>
      <button type="button" onClick={() => scrollToIyonicDBSection('faq')}>FAQ</button>
    </nav>
    <div className="idb-header-actions">
      <Link className="idb-header-docs" to="/iyonicdb/docs">Documentation</Link>
      {isAuthenticated ? <Link className="idb-button idb-button-small" to="/iyonicdb/console">Open console <ArrowUpRight size={15} /></Link> : <><Link className="idb-header-signin" to="/iyonicdb/login">Sign in</Link><Link className="idb-button idb-button-small" to="/iyonicdb/register">Create account <ArrowUpRight size={15} /></Link></>}
    </div>
    <Link className="idb-mobile-console" to={isAuthenticated ? '/iyonicdb/console' : '/iyonicdb/register'} aria-label={isAuthenticated ? 'Open console' : 'Create account'}>{isAuthenticated ? 'Console' : 'Sign up'}</Link>
  </header>
);

const ProductArchitecture = () => (
  <div className="idb-architecture" aria-label="IyonicDB live SQL and document service architecture">
    <div className="idb-architecture-head">
      <span><i className="idb-status-dot" /> IYONICDB SERVICE</span>
      <span>LIVE · ACCOUNT SCOPED</span>
    </div>
    <div className="idb-architecture-body">
      <div className="idb-code-pane">
        <div className="idb-code-title"><Terminal size={13} /> SQL + REST API <span>•••</span></div>
        <pre><code><span className="idb-code-purple">POST</span> /api/iyonicdb/v1{'\n'}<span className="idb-code-green">query</span>{'\n'}<span className="idb-code-purple">Authorization:</span>{'\n'}Bearer [API key]</code></pre>
        <div className="idb-query-result"><span>PARAMETERIZED SQL</span><span>HTTPS</span></div>
      </div>
      <div className="idb-architecture-bridge"><span /><ArrowRight size={14} /><span /></div>
      <div className="idb-databases">
        <div className="idb-engine-card"><span className="idb-engine-icon"><Table2 size={15} /></span><span><strong>SQL tables</strong><small>PostgreSQL · isolated</small></span><span className="idb-engine-mark">01</span></div>
        <div className="idb-engine-card"><span className="idb-engine-icon idb-doc-icon"><Braces size={15} /></span><span><strong>JSON documents</strong><small>Collections · JSONB</small></span><span className="idb-engine-mark">02</span></div>
        <div className="idb-connection-label"><i /> PROJECT SCOPED · API KEY AUTH</div>
      </div>
    </div>
    <div className="idb-architecture-foot"><span>REAL POSTGRESQL STORAGE · TENANT SCOPED</span><span>HTTPS <b>READY</b></span></div>
    <div className="idb-visual-index">FIG. 01 <span>/</span> ONE API SURFACE</div>
  </div>
);

const features = [
  {
    num: '01',
    icon: Database,
    title: 'Two data shapes. One place.',
    copy: 'Model structured, relational records alongside flexible JSON documents. Start with the shape your product needs.',
    tags: ['SQL tables', 'JSON documents'],
  },
  {
    num: '02',
    icon: Code2,
    title: 'A developer-first path in.',
    copy: 'A clear API-oriented workflow, approachable query examples, and SDK-ready onboarding concepts get you from idea to integration.',
    tags: ['REST concepts', 'SDK quick starts'],
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'Know what is happening.',
    copy: 'Bring workspace health, request volume, and plan context together in one readable view, without losing sight of the details.',
    tags: ['Usage visibility', 'Workspace controls'],
  },
];

export const IyonicDB: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const consolePath = isAuthenticated ? '/iyonicdb/console' : '/iyonicdb/register';
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansError, setPlansError] = useState('');

  useEffect(() => {
    api.get<Plan[]>('/iyonicdb/plans')
      .then(({ data }) => setPlans(data))
      .catch((error: unknown) => setPlansError(messageForError(error)));
  }, []);

  return (
    <div className="idb-site" id="top">
      <SEO
        title="IyonicDB — Relational and document data, together"
        description="Create isolated PostgreSQL projects with SQL tables, JSON document collections, project-scoped API keys, and enforced monthly plans."
        keywords="IyonicDB, SQL database, document database, developer database"
        canonical="https://iyonicorp.com/iyonicdb"
      />
      <ProductHeader isAuthenticated={isAuthenticated} />
      <div className="idb-mobile-nav-wrap">
        <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={17} /> Explore IyonicDB <ChevronDown size={15} /></button>
        {menuOpen && <div className="idb-mobile-nav"><button type="button" onClick={() => { scrollToIyonicDBSection('capabilities'); setMenuOpen(false); }}>Platform</button><button type="button" onClick={() => { scrollToIyonicDBSection('how-it-works'); setMenuOpen(false); }}>Data models</button><button type="button" onClick={() => { scrollToIyonicDBSection('plans'); setMenuOpen(false); }}>Plans</button><button type="button" onClick={() => { scrollToIyonicDBSection('faq'); setMenuOpen(false); }}>FAQ</button><Link to="/iyonicdb/docs" onClick={() => setMenuOpen(false)}>Documentation</Link><Link to={consolePath} onClick={() => setMenuOpen(false)}>{isAuthenticated ? 'Open console' : 'Create account'}</Link></div>}
      </div>
      <main>
        <section className="idb-hero">
          <div className="idb-hero-copy">
            <p className="idb-eyebrow"><span /> DATA, WITH ROOM TO GROW <span className="idb-eyebrow-rule" /></p>
            <h1>One home for your<br /><em>many kinds</em> of data.</h1>
            <p className="idb-hero-lede">Relational SQL and flexible documents, brought into one developer-friendly workspace. Begin with a clear model. Keep your options open.</p>
            <div className="idb-hero-actions">
              <Link className="idb-button" to={consolePath}>{isAuthenticated ? 'Open console' : 'Create free account'} <ArrowRight size={16} /></Link>
                <button className="idb-text-link" type="button" onClick={() => scrollToIyonicDBSection('capabilities')}>See what fits <ArrowDown size={15} /></button>
            </div>
            <p className="idb-honesty-note"><ShieldCheck size={14} /> Live PostgreSQL-backed projects. Sign in to create your database.</p>
          </div>
          <ProductArchitecture />
          <div className="idb-hero-side-note"><span>DATA SYSTEMS, RECONSIDERED</span><b>01—02</b></div>
        </section>

        <div className="idb-signal-rail" aria-label="Product concepts">
          <span>LIVE DATABASE SERVICE</span><i />
          <span><Table2 size={14} /> RELATIONAL SQL</span><i />
          <span><FileJson2 size={14} /> DOCUMENT DATA</span><i />
          <span><Activity size={14} /> USAGE IN VIEW</span>
        </div>

        <section className="idb-capabilities" id="capabilities">
          <div className="idb-section-intro">
            <p className="idb-kicker">THE WORKSPACE</p>
            <h2>Start with the data.<br /><em>Stay in control.</em></h2>
            <p>A database experience should make the next step feel obvious — whether you are shaping your first table or checking how a project is behaving.</p>
            <Link to={consolePath} className="idb-underlined-link">{isAuthenticated ? 'Open your workspace' : 'Create an account to get started'} <ArrowUpRight size={15} /></Link>
          </div>
          <div className="idb-feature-list">
            {features.map(({ num, icon: Icon, title, copy, tags }) => (
              <article className="idb-feature-row" key={num}>
                <span className="idb-feature-number">{num}</span>
                <span className="idb-feature-icon"><Icon size={20} strokeWidth={1.65} /></span>
                <div className="idb-feature-copy"><h3>{title}</h3><p>{copy}</p><div>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
                <ArrowUpRight className="idb-feature-arrow" size={17} />
              </article>
            ))}
          </div>
        </section>

        <section className="idb-dual-section" id="how-it-works">
          <div className="idb-dual-heading"><p className="idb-kicker">PICK THE RIGHT SHAPE</p><h2>Different structures.<br /><em>Shared workspace.</em></h2></div>
          <div className="idb-models">
            <article className="idb-model idb-model-sql">
              <div className="idb-model-top"><span>01 / RELATIONAL</span><Table2 size={18} /></div>
              <h3>When relationships matter.</h3>
              <p>Create isolated PostgreSQL tables with typed columns and query them through parameterized SQL.</p>
              <div className="idb-mini-table"><div className="idb-mini-row idb-mini-heading"><span>CREATE TABLE</span><span>typed fields</span><span>SQL</span></div><div className="idb-mini-row"><span>TEXT</span><span>INTEGER</span><span>JSONB</span></div></div>
            </article>
            <article className="idb-model idb-model-doc">
              <div className="idb-model-top"><span>02 / DOCUMENT</span><Braces size={18} /></div>
              <h3>When your model moves.</h3>
              <p>Store flexible JSON in project-scoped document collections with a simple API.</p>
              <pre className="idb-json-sample"><code><span>POST</span>{'\n'}  <b>/</b><i>documents/:collection</i>{'\n\n'}API key header: [API key]</code></pre>
            </article>
          </div>
          <p className="idb-model-caption"><ShieldCheck size={14} /> SQL tables and JSON document collections are backed by PostgreSQL.</p>
        </section>

        <section className="idb-onboarding">
          <div className="idb-onboarding-intro"><p className="idb-kicker">FROM IDEA TO INTEGRATION</p><h2>Just enough structure<br />to get <em>moving.</em></h2><p>Create a project, define a SQL table or document collection, then connect securely with an API key that selects its project automatically.</p></div>
          <div className="idb-steps">
            <article><span>STEP 01</span><Code2 size={20} /><h3>Create a project</h3><p>Provision a database namespace isolated to your account.</p></article>
            <article><span>STEP 02</span><Terminal size={20} /><h3>Store real data</h3><p>Create typed SQL tables, or write JSON documents.</p></article>
            <article><span>STEP 03</span><KeyRound size={20} /><h3>Connect securely</h3><p>Issue a project-scoped API key. Your app only needs the key, never a project ID.</p></article>
          </div>
          <Link className="idb-code-link" to={consolePath}><span><Terminal size={15} /> {isAuthenticated ? 'Open database console' : 'Create your IyonicDB account'}</span><ArrowRight size={16} /></Link>
        </section>

        <section className="idb-plans" id="plans">
          <div className="idb-plan-heading"><div><p className="idb-kicker">START FREE · GROW WHEN READY</p><h2>A plan should feel<br /><em>easy to understand.</em></h2></div><p>Every account starts with 5 GB free storage. Paid plans add projects, storage, and monthly requests for 30 days per payment. Renew manually; there are no automatic overages.</p></div>
          {plansError && <p className="idb-api-error" role="alert">{plansError}</p>}
          {!plansError && !plans.length && <p className="idb-api-loading">Loading current plan rates…</p>}
          <div className="idb-plan-list">
            {plans.map((plan) => <article className={`idb-plan${plan.id === 'growth' ? ' idb-plan-featured' : ''}`} key={plan.id}>
              <div className="idb-plan-name">{plan.name}{plan.id === 'growth' && <span>POPULAR</span>}</div>
              <p className="idb-plan-price">{plan.price === 0 ? 'Free' : formatPlanPrice(plan)}<small>{plan.price === 0 ? ' forever' : ' / 30 days'}</small></p>
              <p className="idb-plan-intro">{plan.projectLimit} projects · {plan.tableLimit} tables per project</p>
              <ul><li><ShieldCheck size={14} />{plan.apiKeyLimit} active API keys</li><li><ShieldCheck size={14} />{plan.storageGb} GB storage</li><li><ShieldCheck size={14} />{new Intl.NumberFormat('en-US').format(plan.requestsPerMonth)} requests/month</li><li><ShieldCheck size={14} />Hard cap · no surprise overages</li></ul>
              <Link to={isAuthenticated ? (plan.id === 'free' ? '/iyonicdb/console?section=overview' : '/iyonicdb/console?section=billing') : '/iyonicdb/register'} className={plan.id === 'growth' ? 'idb-plan-cta idb-plan-cta-dark' : 'idb-plan-cta'}>{isAuthenticated ? (plan.id === 'free' ? 'Open console' : `Choose ${plan.name}`) : 'Sign up to get started'} <ArrowUpRight size={14} /></Link>
            </article>)}
          </div>
        </section>

        <section className="idb-faq" id="faq">
          <div className="idb-faq-intro"><p className="idb-kicker">GOOD QUESTIONS <span>·</span> CLEAR ANSWERS</p><h2>Know before<br /><em>you build.</em></h2><p>Quick answers on privacy, API access, and staying within your plan.</p><Link to="/iyonicdb/docs" className="idb-faq-docs">Explore the API docs <ArrowRight size={14} /></Link></div>
          <div className="idb-faq-list">
            {[
              { question: 'How are databases isolated?', answer: 'Every project gets its own PostgreSQL schema. Requests are checked against the project attached to your API key, so a key cannot reach another project.', icon: Database, link: 'Learn about project security', href: '/iyonicdb/docs#authentication' },
              { question: 'How do I connect from my app?', answer: 'Create a project key in the console, then send it as a Bearer token from your server. The secret is shown once and stored as a hash.', icon: KeyRound, link: 'Read the quickstart', href: '/iyonicdb/docs#quickstart' },
              { question: 'What happens at a plan limit?', answer: 'Requests pause when the monthly quota is reached. Writes stop when storage is full. There are no automatic overage charges; upgrade your plan to continue.', icon: Activity, link: 'Compare plans', href: '#plans' },
            ].map(({ question, answer, icon: Icon, link, href }, index) => (
              <article className={`idb-faq-item${faqOpen === index ? ' is-open' : ''}`} key={question}>
                <button type="button" aria-expanded={faqOpen === index} onClick={() => setFaqOpen(faqOpen === index ? null : index)}><span className="idb-faq-number">0{index + 1}</span><span className="idb-faq-question">{question as string}</span><Plus size={17} /></button>
                {faqOpen === index && <div className="idb-faq-answer"><Icon size={16} /><div><p>{answer as string}</p>{String(href).startsWith('#') ? <button type="button" onClick={() => scrollToIyonicDBSection(String(href).slice(1))}>{link} <ArrowRight size={13} /></button> : <Link to={href}>{link} <ArrowRight size={13} /></Link>}</div></div>}
              </article>
            ))}
          </div>
        </section>
        <section className="idb-closing">
          <div className="idb-closing-top"><span>IYONICDB / LIVE DATABASE SERVICE</span><span>GOOD DATA STARTS WITH A GOOD MODEL</span></div>
          <h2>Make room for<br /><em>what comes next.</em></h2>
          <p>Provision a project, connect your app, and manage real SQL and document data.</p>
          <Link to={consolePath} className="idb-button idb-button-light">{isAuthenticated ? 'Open IyonicDB console' : 'Sign up for IyonicDB'} <ArrowRight size={16} /></Link>
          <span className="idb-closing-seal"><Layers3 size={20} /><b>ONE<br />WORKSPACE</b></span>
        </section>
      </main>
      <HomepageFooter />
    </div>
  );
};

export default IyonicDB;
