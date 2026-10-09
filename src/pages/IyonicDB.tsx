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

const ProductHeader = () => (
  <header className="idb-header">
    <Link to="/iyonicdb" aria-label="IyonicDB home"><IyonicDBLogo /></Link>
    <nav aria-label="IyonicDB navigation">
      <a href="#capabilities">Capabilities</a>
      <a href="#how-it-works">How it works</a>
      <a href="#plans">Plans</a>
    </nav>
    <div className="idb-header-actions">
      <Link className="idb-quiet-link" to="/iyonicdb/console">Console</Link>
      <Link className="idb-button idb-button-small" to="/iyonicdb/console">Open console <ArrowUpRight size={15} /></Link>
    </div>
    <Link className="idb-mobile-console" to="/iyonicdb/console" aria-label="Open console"><Terminal size={19} /></Link>
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
        <pre><code><span className="idb-code-purple">POST</span> /api/iyonicdb/v1{'\n'}<span className="idb-code-green">projects/:id/query</span>{'\n'}<span className="idb-code-purple">Authorization:</span>{'\n'}Bearer [project key]</code></pre>
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
    <div className="idb-site">
      <SEO
        title="IyonicDB — Relational and document data, together"
        description="Create isolated PostgreSQL projects with SQL tables, JSON document collections, project-scoped API keys, and enforced monthly plans."
        keywords="IyonicDB, SQL database, document database, developer database"
        canonical="https://iyonicorp.com/iyonicdb"
      />
      <ProductHeader />
      <div className="idb-mobile-nav-wrap">
        <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={17} /> Explore IyonicDB <ChevronDown size={15} /></button>
        {menuOpen && <div className="idb-mobile-nav"><a href="#capabilities" onClick={() => setMenuOpen(false)}>Capabilities</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#plans" onClick={() => setMenuOpen(false)}>Plans</a></div>}
      </div>
      <main>
        <section className="idb-hero">
          <div className="idb-hero-copy">
            <p className="idb-eyebrow"><span /> DATA, WITH ROOM TO GROW <span className="idb-eyebrow-rule" /></p>
            <h1>One home for your<br /><em>many kinds</em> of data.</h1>
            <p className="idb-hero-lede">Relational SQL and flexible documents, brought into one developer-friendly workspace. Begin with a clear model. Keep your options open.</p>
            <div className="idb-hero-actions">
              <Link className="idb-button" to="/iyonicdb/console">Explore the console <ArrowRight size={16} /></Link>
              <a className="idb-text-link" href="#capabilities">See what fits <ArrowDown size={15} /></a>
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
            <Link to="/iyonicdb/console" className="idb-underlined-link">Take a look inside <ArrowUpRight size={15} /></Link>
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
              <pre className="idb-json-sample"><code><span>POST</span>{'\n'}  <b>/projects/:id/</b>{'\n'}  <i>documents/:collection</i>{'\n\n'}API key header: [project key]</code></pre>
            </article>
          </div>
          <p className="idb-model-caption"><ShieldCheck size={14} /> SQL tables and JSON document collections are backed by PostgreSQL.</p>
        </section>

        <section className="idb-onboarding">
          <div className="idb-onboarding-intro"><p className="idb-kicker">FROM IDEA TO INTEGRATION</p><h2>Just enough structure<br />to get <em>moving.</em></h2><p>Create a project, define a SQL table or document collection, then connect securely with a project-scoped API key.</p></div>
          <div className="idb-steps">
            <article><span>STEP 01</span><Code2 size={20} /><h3>Create a project</h3><p>Provision a database namespace isolated to your account.</p></article>
            <article><span>STEP 02</span><Terminal size={20} /><h3>Store real data</h3><p>Create typed SQL tables, or write JSON documents.</p></article>
            <article><span>STEP 03</span><KeyRound size={20} /><h3>Connect securely</h3><p>Issue a project-scoped API key that is shown only once.</p></article>
          </div>
          <Link className="idb-code-link" to="/iyonicdb/console"><span><Terminal size={15} /> Open database console</span><ArrowRight size={16} /></Link>
        </section>

        <section className="idb-plans" id="plans">
          <div className="idb-plan-heading"><div><p className="idb-kicker">CLEAR MONTHLY LIMITS</p><h2>A plan should feel<br /><em>easy to understand.</em></h2></div><p>Live USD subscriptions. Request and storage caps are enforced with no automatic overages.</p></div>
          {plansError && <p className="idb-api-error" role="alert">{plansError}</p>}
          {!plansError && !plans.length && <p className="idb-api-loading">Loading current plan rates…</p>}
          <div className="idb-plan-list">
            {plans.map((plan) => <article className={`idb-plan${plan.id === 'growth' ? ' idb-plan-featured' : ''}`} key={plan.id}>
              <div className="idb-plan-name">{plan.name}{plan.id === 'growth' && <span>POPULAR</span>}</div>
              <p className="idb-plan-price">${plan.price}<small> / month</small></p>
              <p className="idb-plan-intro">{plan.projectLimit} projects · {plan.tableLimit} tables per project</p>
              <ul><li><ShieldCheck size={14} />{plan.storageGb} GB storage</li><li><ShieldCheck size={14} />{new Intl.NumberFormat('en-US').format(plan.requestsPerMonth)} requests/month</li><li><ShieldCheck size={14} />Hard cap · no surprise overages</li></ul>
              <Link to="/iyonicdb/console?section=billing" className={plan.id === 'growth' ? 'idb-plan-cta idb-plan-cta-dark' : 'idb-plan-cta'}>Choose {plan.name} <ArrowUpRight size={14} /></Link>
            </article>)}
          </div>
        </section>

        <section className="idb-faq">
          <div><p className="idb-kicker">GOOD QUESTIONS</p><h2>A little clarity<br /><em>goes a long way.</em></h2></div>
          <div className="idb-faq-list">
            {[
              ['How are databases isolated?', 'Each account receives its own PostgreSQL schema. Project APIs verify ownership and scope requests to that project.'],
              ['How do I connect from my app?', 'Create a project API key and send it in the bearer authorization header or the x-api-key header. Key secrets are hashed at rest and shown once.'],
              ['What happens at a plan limit?', 'Requests stop at the monthly quota and writes are rejected when storage is full. There are no automatic overage charges.'],
            ].map(([question, answer], index) => (
              <article className={`idb-faq-item${faqOpen === index ? ' is-open' : ''}`} key={question}>
                <button type="button" aria-expanded={faqOpen === index} onClick={() => setFaqOpen(faqOpen === index ? null : index)}><span>{question}</span><Plus size={17} /></button>
                {faqOpen === index && <p>{answer}</p>}
              </article>
            ))}
          </div>
        </section>
        <section className="idb-closing">
          <div className="idb-closing-top"><span>IONICDB / LIVE DATABASE SERVICE</span><span>GOOD DATA STARTS WITH A GOOD MODEL</span></div>
          <h2>Make room for<br /><em>what comes next.</em></h2>
          <p>Provision a project, connect your app, and manage real SQL and document data.</p>
          <Link to="/iyonicdb/console" className="idb-button idb-button-light">Open the database console <ArrowRight size={16} /></Link>
          <span className="idb-closing-seal"><Layers3 size={20} /><b>ONE<br />WORKSPACE</b></span>
        </section>
      </main>
      <HomepageFooter />
    </div>
  );
};

export default IyonicDB;
