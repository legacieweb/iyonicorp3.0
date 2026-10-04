import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Book, FileText, LifeBuoy, Scale } from 'lucide-react';
import SEO from '../../components/SEO';
import { StaticPageLayout } from './StaticPageLayout';

const SectionHeading: React.FC<{ eyebrow?: string; title: string; children?: React.ReactNode }> = ({ eyebrow, title, children }) => (
  <div className="mb-8 max-w-3xl">
    {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>}
    <h2 className="text-2xl font-bold leading-tight text-gray-950 sm:text-3xl">{title}</h2>
    {children && <p className="mt-4 leading-7 text-gray-600">{children}</p>}
  </div>
);

const StaticPage: React.FC<{ title: string; description: string; eyebrow: string; icon: React.ComponentProps<typeof StaticPageLayout>['icon']; children: React.ReactNode }> = ({ title, description, eyebrow, icon, children }) => (
  <>
    <SEO title={title} description={description} />
    <StaticPageLayout title={title} description={description} eyebrow={eyebrow} icon={icon}>
      {children}
    </StaticPageLayout>
  </>
);

const stories = [
  {
    category: 'Commerce',
    title: 'A calmer way to launch your first online store',
    summary: 'A practical starting point for choosing a product, shaping a storefront, and getting the details right before launch.',
    body: 'Start with a focused catalog and a clear promise. Add accurate product details, set delivery expectations before checkout, and test the full buying journey on a phone. A small, dependable launch is easier to learn from than a crowded store with unfinished policies.',
  },
  {
    category: 'Payments',
    title: 'Make checkout feel like part of the experience',
    summary: 'Trust at checkout comes from clarity, consistency, and fewer surprises, not just another payment button.',
    body: 'Show the total cost early, explain which payment methods are available, and make confirmation easy to find. After launch, review customer questions and abandoned orders to discover where people need more reassurance.',
  },
  {
    category: 'Operations',
    title: 'Turn repeat questions into better workflows',
    summary: 'A simple system for handling common support requests while keeping the human conversation close.',
    body: 'Group incoming questions by topic, write a useful answer for each recurring issue, and make it easy for a customer to reach a person when the answer does not fit. Automation works best when it removes busywork without hiding the path to help.',
  },
];

export const Blog: React.FC = () => (
  <StaticPage title="Ideas for building better commerce" description="Practical notes on storefronts, payments, and the systems behind growing businesses." eyebrow="Field notes / Blog" icon={FileText}>
    <section aria-labelledby="blog-latest">
      <SectionHeading eyebrow="The latest" title="Useful thinking for your next move" >Short, practical reads for people building and running digital businesses.</SectionHeading>
      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {stories.map((story, index) => (
          <article key={story.title} className="grid gap-5 py-8 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-10">
            <p className="pt-1 text-xs font-bold uppercase tracking-wider text-blue-700">0{index + 1} / {story.category}</p>
            <div className="max-w-3xl">
              <h3 className="text-xl font-bold text-gray-950 sm:text-2xl">{story.title}</h3>
              <p className="mt-3 text-lg leading-7 text-gray-600">{story.summary}</p>
              <p className="mt-4 leading-7 text-gray-600">{story.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="mt-16 grid gap-6 border-l-4 border-blue-700 bg-blue-50/70 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Keep learning</p>
        <h2 className="mt-2 text-xl font-bold text-gray-950">Ready to put an idea into practice?</h2>
        <p className="mt-2 leading-6 text-gray-600">Explore the product guides and setup steps in our documentation.</p>
      </div>
      <Link to="/documentation" className="inline-flex min-h-11 items-center gap-2 font-bold text-blue-800 hover:text-blue-950">Explore docs <ArrowRight className="h-4 w-4" /></Link>
    </section>
  </StaticPage>
);

export const Press: React.FC = () => (
  <StaticPage title="Press and media" description="Company background, brand resources, and a direct route for media questions." eyebrow="Company / Press" icon={FileText}>
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <SectionHeading eyebrow="Company overview" title="Commerce tools, connected around the work">
          Iyonicorp brings storefront management, payments, and business automation into a connected platform for sellers and the teams that support them.
        </SectionHeading>
        <div className="space-y-6 leading-7 text-gray-600">
          <p>Our products are designed to help businesses manage the everyday work of selling online, from setting up a store to keeping customer operations moving.</p>
          <p>For accurate product details, current availability, or interview requests, please contact the press team before publication.</p>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="text-xl font-bold text-gray-950">Media contact</h2>
          <p className="mt-2 leading-7 text-gray-600">For press inquiries, interviews, and company information:</p>
          <a href="mailto:press@iyonicorp.com" className="mt-3 inline-flex items-center gap-2 font-semibold text-blue-800 hover:text-blue-950">
            press@iyonicorp.com <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
      <aside className="h-fit border-t-2 border-gray-950 pt-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Brand resources</h2>
        <a href="/logo.png" download className="mt-5 flex items-center justify-between gap-4 border-b border-gray-200 py-4 font-semibold text-gray-900 hover:text-blue-800">
          Iyonicorp logo <span className="text-sm font-normal text-gray-500">PNG</span>
        </a>
        <p className="mt-4 text-sm leading-6 text-gray-500">Please keep the logo proportions intact and contact us if you need alternate formats or usage guidance.</p>
      </aside>
    </div>
  </StaticPage>
);

export const Documentation: React.FC = () => (
  <StaticPage title="Build your business on a stronger foundation" description="Guides for setting up your store, managing products, configuring payments, and connecting your workflows." eyebrow="Resources / Documentation" icon={Book}>
    <section id="quickstart">
      <SectionHeading eyebrow="Quick start" title="From account to first order">
        Work through the essentials in order. You can refine your catalog and storefront as you learn what customers need.
      </SectionHeading>
      <ol className="grid gap-x-10 divide-y divide-gray-200 border-y border-gray-200 md:grid-cols-3 md:divide-y-0">
        {[
          { number: '01', title: 'Create your account', text: 'Choose a seller or manager account and complete your business profile.', to: '/register?role=seller', link: 'Create account' },
          { number: '02', title: 'Shape your store', text: 'Add products or services, set your store details, and review your customer-facing pages.', to: '/iyonicshop', link: 'Explore IyonicShop' },
          { number: '03', title: 'Prepare to sell', text: 'Review checkout, payment, delivery, and return information before sharing your store.', to: '/help-center', link: 'Visit help center' },
        ].map((step) => (
          <li key={step.number} className="py-6 md:py-8">
            <p className="font-mono text-sm font-bold text-blue-700">{step.number}</p>
            <h3 className="mt-4 text-lg font-bold text-gray-950">{step.title}</h3>
            <p className="mt-2 min-h-14 leading-6 text-gray-600">{step.text}</p>
            <Link to={step.to} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950">{step.link} <ArrowRight className="h-4 w-4" /></Link>
          </li>
        ))}
      </ol>
    </section>
    <section className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <SectionHeading eyebrow="Guides" title="Find your next step" />
        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {[
            { title: 'Store setup and product catalog', text: 'Store identity, product details, categories, and customer-facing information.', to: '/iyonicshop' },
            { title: 'Payments and checkout', text: 'Understand the checkout options available in your account and prepare for payment setup.', to: '/iyonicpay' },
            { title: 'Seller and manager workflows', text: 'Learn how sellers and managers work together across the platform.', to: '/register?role=seller_manager' },
            { title: 'Troubleshooting and common questions', text: 'Browse answers to setup, account, store, and order questions.', to: '/help-center' },
          ].map((item) => (
            <Link key={item.title} to={item.to} className="group flex items-center justify-between gap-5 py-5">
              <span><span className="block font-bold text-gray-950 group-hover:text-blue-800">{item.title}</span><span className="mt-1 block text-sm leading-6 text-gray-600">{item.text}</span></span>
              <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700" />
            </Link>
          ))}
        </div>
      </div>
      <aside id="integration" className="h-fit border-l-4 border-blue-700 bg-blue-50/70 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">For developers</p>
        <h2 className="mt-3 text-2xl font-bold text-gray-950">Connect through the API</h2>
        <p className="mt-3 leading-7 text-gray-600">Review request conventions, authentication, and the API endpoints currently used by the platform.</p>
        <Link to="/api-reference" className="mt-6 inline-flex items-center gap-2 font-bold text-blue-800 hover:text-blue-950">Open API reference <ArrowRight className="h-4 w-4" /></Link>
      </aside>
    </section>
  </StaticPage>
);

export const APIReference: React.FC = () => (
  <StaticPage title="API reference" description="A practical reference for the API conventions and account endpoints currently used by Iyonicorp." eyebrow="Resources / Developers" icon={Book}>
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="max-w-4xl">
        <section>
          <SectionHeading eyebrow="Getting connected" title="Requests, authentication, and responses">
            The web client sends JSON requests to the API base URL configured with <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">VITE_API_URL</code>. When unset in local development, the client uses <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">http://localhost:2823/api</code>.
          </SectionHeading>
          <div className="grid gap-6 border-y border-gray-200 py-6 sm:grid-cols-2">
            <div><h2 className="font-bold text-gray-950">Content type</h2><p className="mt-2 text-sm leading-6 text-gray-600">Send JSON with <code>Content-Type: application/json</code> for standard requests.</p></div>
            <div><h2 className="font-bold text-gray-950">Authentication</h2><p className="mt-2 text-sm leading-6 text-gray-600">Authenticated requests include the session token in the <code>x-auth-token</code> header.</p></div>
          </div>
        </section>
        <section className="mt-14">
          <SectionHeading eyebrow="Account endpoints" title="Start with authentication" />
          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {[
              { method: 'POST', path: '/auth/register', purpose: 'Create a seller, manager, or customer account.' },
              { method: 'POST', path: '/auth/login', purpose: 'Authenticate with an email address and password.' },
              { method: 'GET', path: '/auth/me', purpose: 'Get the current authenticated account.' },
              { method: 'PATCH', path: '/sellers/me', purpose: 'Update the current seller profile.' },
            ].map((endpoint) => (
              <div key={endpoint.path} className="grid gap-2 py-4 sm:grid-cols-[5rem_14rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                <span className="w-fit rounded bg-blue-50 px-2 py-1 font-mono text-xs font-bold text-blue-800">{endpoint.method}</span>
                <code className="text-sm font-semibold text-gray-950">{endpoint.path}</code>
                <p className="text-sm leading-6 text-gray-600">{endpoint.purpose}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-14">
          <SectionHeading eyebrow="Example" title="Log in with JSON" />
          <pre className="overflow-x-auto rounded-lg bg-gray-950 p-5 text-sm leading-6 text-gray-100"><code>{`curl -X POST "$API_BASE_URL/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your-password"}'`}</code></pre>
          <p className="mt-4 text-sm leading-6 text-gray-600">A successful login returns an account and token. Keep credentials and tokens private; never include real secrets in client-side source code or public issue reports.</p>
        </section>
      </div>
      <aside className="h-fit border-t-2 border-gray-950 pt-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Reference notes</h2>
        <p className="mt-4 text-sm leading-6 text-gray-600">This page documents the endpoints currently called by the web client. It is not a complete schema or a guarantee that every backend route is a supported public API.</p>
        <Link to="/documentation" className="mt-5 inline-flex items-center gap-2 font-semibold text-blue-800 hover:text-blue-950">Back to documentation <ArrowRight className="h-4 w-4" /></Link>
      </aside>
    </div>
  </StaticPage>
);

const helpArticles = [
  { question: 'How do I create a seller account?', answer: 'Choose Seller on the registration page, enter your contact details, and provide a store name. A manager account is available from the same role selector.', keywords: 'seller signup registration account' },
  { question: 'How do I set up my store?', answer: 'After signing in, complete your store profile, add products or services, review your theme, and check your delivery and return information before launch.', keywords: 'store setup products theme launch' },
  { question: 'Where do I manage payments?', answer: 'IyonicPay is the platform’s payment area. Availability and configuration can depend on your account and enabled payment options.', keywords: 'payments checkout iyonicpay' },
  { question: 'How do I update my products?', answer: 'Open your seller dashboard and use the product management tools to add items, update descriptions, adjust pricing, and manage availability.', keywords: 'products catalog seller dashboard' },
  { question: 'How can I request a refund?', answer: 'Open the Refund Center and search for your order using its order ID and the email used at checkout. A refund request may require signing in and meeting the eligibility checks shown there.', keywords: 'refund return order' },
  { question: 'How do managers work with sellers?', answer: 'Seller managers can invite and support sellers, then follow their account’s manager dashboard for the tools available to that relationship.', keywords: 'manager team sellers invitation' },
  { question: 'I cannot sign in. What should I do?', answer: 'Check that you are using the email associated with your account. Use the password reset option on the sign-in page if you no longer know your password.', keywords: 'login sign in password reset' },
];

export const HelpCenter: React.FC = () => {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredArticles = helpArticles.filter((article) => `${article.question} ${article.answer} ${article.keywords}`.toLowerCase().includes(normalizedQuery));

  return (
    <StaticPage title="Help that moves your business forward" description="Find practical answers for accounts, stores, payments, orders, and seller teams." eyebrow="Resources / Help center" icon={LifeBuoy}>
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section>
          <SectionHeading eyebrow="Common questions" title="What can we help you with?">Search the help topics or open a question to see the steps.</SectionHeading>
          <label htmlFor="help-search" className="sr-only">Search help articles</label>
          <input id="help-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search accounts, stores, refunds..." className="mb-6 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {filteredArticles.map((article) => (
              <details key={article.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-gray-950 marker:hidden focus-visible:outline-2 focus-visible:outline-blue-600">
                  {article.question}<span className="text-xl font-normal text-blue-700 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pt-4 leading-7 text-gray-600">{article.answer}</p>
              </details>
            ))}
            {filteredArticles.length === 0 && <p className="py-8 text-gray-600">No topics match that search. Try a shorter phrase or browse the documentation.</p>}
          </div>
        </section>
        <aside className="h-fit border-t-2 border-gray-950 pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Still looking?</p>
          <h2 className="mt-4 text-xl font-bold text-gray-950">Explore the guides</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">Step-by-step starting points for your store and integrations.</p>
          <Link to="/documentation" className="mt-5 inline-flex items-center gap-2 font-semibold text-blue-800 hover:text-blue-950">Open documentation <ArrowRight className="h-4 w-4" /></Link>
        </aside>
      </div>
    </StaticPage>
  );
};

export const Status: React.FC = () => (
  <StaticPage title="Service information" description="See which parts of the platform this page covers and where to go if you need help." eyebrow="Resources / Status" icon={LifeBuoy}>
    <section className="max-w-4xl">
      <div className="border-l-4 border-amber-500 bg-amber-50 px-5 py-5 sm:px-7">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-900">Live monitoring unavailable</p>
        <h2 className="mt-2 text-xl font-bold text-gray-950">This page does not currently receive live service telemetry.</h2>
        <p className="mt-2 leading-7 text-gray-700">We don’t want to label a service operational without current monitoring data. If you’re experiencing a problem, use the Help Center to find the right next step.</p>
        <Link to="/help-center" className="mt-4 inline-flex items-center gap-2 font-bold text-blue-800 hover:text-blue-950">Visit Help Center <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="mt-14">
        <SectionHeading eyebrow="Platform areas" title="Services covered by Iyonicorp" >These are the product areas customers may use; this list is informational and does not indicate current uptime.</SectionHeading>
        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {[
            { title: 'Storefronts and catalog', text: 'Public shops, product and service listings, and customer browsing.' },
            { title: 'Seller and manager dashboards', text: 'Account tools for running a store and supporting seller teams.' },
            { title: 'Payments and checkout', text: 'Checkout experiences and connected payment services.' },
            { title: 'Integrations and automation', text: 'API connections and business automation features.' },
          ].map((item) => <div key={item.title} className="grid gap-1 py-5 sm:grid-cols-[15rem_1fr] sm:gap-6"><h3 className="font-bold text-gray-950">{item.title}</h3><p className="leading-6 text-gray-600">{item.text}</p></div>)}
        </div>
      </div>
    </section>
  </StaticPage>
);

export const Privacy: React.FC = () => (
  <StaticPage title="Privacy policy" description="How account and service information may be collected, used, and protected when you use Iyonicorp." eyebrow="Legal / Privacy" icon={Scale}>
    <article className="max-w-3xl">
      <p className="mb-10 border-l-4 border-blue-700 bg-blue-50/70 px-5 py-4 text-sm leading-6 text-gray-700">This policy describes the general data practices for the platform. Review it against your actual services, vendors, and applicable privacy laws before relying on it as a final legal notice.</p>
      <p className="mb-10 text-sm font-medium text-gray-500">Last reviewed: October 2, 2026</p>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Information you provide</h2><p className="mt-3 leading-7 text-gray-600">Depending on how you use Iyonicorp, this may include account and contact details, store and product information, messages you send, order information, and details submitted to support.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">How information is used</h2><p className="mt-3 leading-7 text-gray-600">Information is used to create and maintain accounts, operate storefront and seller features, process requested transactions, provide support, protect the platform, and improve service reliability.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Payments and service providers</h2><p className="mt-3 leading-7 text-gray-600">Payment and infrastructure providers may process information needed to deliver their services. Their own privacy notices apply to the processing they perform. Avoid sending full payment credentials through support messages.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Sharing and retention</h2><p className="mt-3 leading-7 text-gray-600">Information may be shared with service providers, parties involved in a transaction, or authorities where required by law. It is retained for as long as needed to operate the service, meet legal obligations, resolve disputes, and enforce agreements.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Your choices and requests</h2><p className="mt-3 leading-7 text-gray-600">You can review and update some account information from your dashboard. For a privacy question or a request relating to your information, contact the team through the <Link to="/help-center" className="font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4">Help Center</Link>.</p></section>
      <section><h2 className="text-xl font-bold text-gray-950">Security</h2><p className="mt-3 leading-7 text-gray-600">We use technical and organizational measures intended to protect information. No online service can guarantee absolute security, so keep account credentials private and notify us if you suspect unauthorized access.</p></section>
    </article>
  </StaticPage>
);

export const Terms: React.FC = () => (
  <StaticPage title="Terms of service" description="The basic responsibilities and expectations for using Iyonicorp services." eyebrow="Legal / Terms" icon={Scale}>
    <article className="max-w-3xl">
      <p className="mb-10 border-l-4 border-blue-700 bg-blue-50/70 px-5 py-4 text-sm leading-6 text-gray-700">These terms are a general platform draft. Confirm the contracting entity, product-specific terms, consumer protections, and governing law with qualified counsel before publication as binding terms.</p>
      <p className="mb-10 text-sm font-medium text-gray-500">Last reviewed: October 2, 2026</p>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Using the services</h2><p className="mt-3 leading-7 text-gray-600">Use Iyonicorp lawfully and in line with these terms and any product-specific requirements. Do not misuse the services, interfere with their operation, attempt unauthorized access, or use the platform to violate another person’s rights.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Accounts and security</h2><p className="mt-3 leading-7 text-gray-600">Provide accurate account information, protect your sign-in credentials, and promptly address suspicious activity. Account holders are responsible for activity carried out through their accounts, subject to applicable law.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Seller responsibilities</h2><p className="mt-3 leading-7 text-gray-600">Sellers are responsible for their listings, prices, fulfillment, customer communications, required disclosures, and compliance with laws that apply to their business. Iyonicorp provides tools; it does not replace a seller’s own obligations to customers.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Content and intellectual property</h2><p className="mt-3 leading-7 text-gray-600">You retain rights to content you provide. You grant the permissions needed to host, display, and process that content to operate the features you use. The platform and its product branding remain subject to their respective intellectual-property rights.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Availability and changes</h2><p className="mt-3 leading-7 text-gray-600">Features may change as the services develop. We may suspend access when needed to protect users, comply with law, or address misuse. Any mandatory notice or consumer rights under applicable law remain unaffected.</p></section>
      <section><h2 className="text-xl font-bold text-gray-950">Questions</h2><p className="mt-3 leading-7 text-gray-600">For questions about these terms, contact the team through the <Link to="/help-center" className="font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4">Help Center</Link>.</p></section>
    </article>
  </StaticPage>
);

export const Cookies: React.FC = () => (
  <StaticPage title="Cookie policy" description="A clear guide to browser storage and similar technologies used by a web application." eyebrow="Legal / Cookies" icon={Scale}>
    <article className="max-w-3xl">
      <p className="mb-10 border-l-4 border-blue-700 bg-blue-50/70 px-5 py-4 text-sm leading-6 text-gray-700">The technologies actually used can change as the application evolves. This policy should be checked against the current production configuration and consent requirements in each region.</p>
      <p className="mb-10 text-sm font-medium text-gray-500">Last reviewed: October 2, 2026</p>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">What these technologies do</h2><p className="mt-3 leading-7 text-gray-600">Cookies and browser storage can help a site remember a session, preserve preferences, support security, and understand how features are used. The specific technologies depend on the features enabled in your environment.</p></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Categories</h2><ul className="mt-3 space-y-4 leading-7 text-gray-600"><li><strong className="text-gray-900">Essential:</strong> needed for sign-in, security, and core site functions.</li><li><strong className="text-gray-900">Preferences:</strong> remember choices that improve your experience.</li><li><strong className="text-gray-900">Analytics:</strong> help understand usage where these tools are enabled and permitted.</li></ul></section>
      <section className="mb-10"><h2 className="text-xl font-bold text-gray-950">Manage your browser settings</h2><p className="mt-3 leading-7 text-gray-600">Most browsers let you review, block, or clear stored data. Blocking essential storage may prevent sign-in or other core features from working correctly.</p></section>
      <section><h2 className="text-xl font-bold text-gray-950">Policy updates</h2><p className="mt-3 leading-7 text-gray-600">We may update this page when technologies or legal requirements change. For questions, visit the <Link to="/help-center" className="font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4">Help Center</Link>.</p></section>
    </article>
  </StaticPage>
);

export const Licenses: React.FC = () => (
  <StaticPage title="Open-source licenses" description="Selected open-source packages used by the web application and their license families." eyebrow="Legal / Open source" icon={Scale}>
    <section className="max-w-4xl">
      <SectionHeading eyebrow="Acknowledgements" title="Built with open-source software">
        We’re grateful to the maintainers and contributors whose work makes this application possible. This summary lists selected direct dependencies; it is not a complete software bill of materials or a substitute for the license texts distributed with each package.
      </SectionHeading>
      <div className="grid gap-x-10 divide-y divide-gray-200 border-y border-gray-200 sm:grid-cols-2 sm:divide-y-0">
        {[
          { name: 'React', license: 'MIT' },
          { name: 'React Router', license: 'MIT' },
          { name: 'Vite', license: 'MIT' },
          { name: 'TypeScript', license: 'Apache-2.0' },
          { name: 'Tailwind CSS', license: 'MIT' },
          { name: 'Framer Motion', license: 'MIT' },
          { name: 'Lucide React', license: 'ISC' },
          { name: 'Axios', license: 'MIT' },
        ].map((item) => <div key={item.name} className="flex items-center justify-between gap-4 border-gray-200 py-5 sm:border-b"><h2 className="font-bold text-gray-950">{item.name}</h2><span className="font-mono text-sm text-gray-500">{item.license}</span></div>)}
      </div>
      <p className="mt-6 text-sm leading-6 text-gray-500">For exact versions and complete third-party notices, consult the dependency manifests and package distributions included with the application release.</p>
    </section>
  </StaticPage>
);

export default Blog;