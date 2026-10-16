import React, { useState } from 'react';
import { Mail, Send, Shield, Settings } from 'lucide-react';
import SEO from '../components/SEO';

const ApiMethod: React.FC<{ method: string; endpoint: string; description?: string; children?: React.ReactNode }> = ({ method, endpoint, description, children }) => {
  const methodColors = {
    GET: 'bg-blue-100 text-blue-800',
    POST: 'bg-emerald-100 text-emerald-800',
    PATCH: 'bg-amber-100 text-amber-800',
    DELETE: 'bg-red-100 text-red-800'
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center space-x-3 mb-2">
        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${methodColors[method as keyof typeof methodColors]}`}>
          {method}
        </span>
        <code className="text-gray-800 font-mono text-sm bg-gray-50 px-2 py-1 rounded">{endpoint}</code>
      </div>
      {description && <p className="text-sm text-gray-600 mb-2">{description}</p>}
      {children}
    </div>
  );
};

export const IyonicMailerDocs: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'getting-started' | 'api' | 'environment' | 'billing'>('getting-started');

  const endpoints = [
    {
      method: 'POST',
      endpoint: '/api/mailer/v1/send',
      description: 'Send one email. Authenticate with an IyonicMailer API key created in Console → API keys.',
      example: `curl "$IYONIC_MAILER_API_URL/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $IYONIC_MAILER_API_KEY" \\
  -d '{
    "to": "customer@example.com",
    "subject": "Welcome",
    "html": "<h1>Hello</h1><p>Welcome to our service.</p>",
    "text": "Hello. Welcome to our service."
  }'`
    }
  ];

  const getStartedSteps = [
    {
      title: 'Create an account',
      description: 'Sign up for an Iyonicorp account and open IyonicMailer from your console.',
      icon: Mail
    },
    {
      title: 'Create an API key',
      description: 'Open Console → API keys. Create a named key and copy it once; the secret is only shown at creation.',
      icon: Shield
    },
    {
      title: 'Set up email delivery',
      description: 'Add and verify an email provider in your IyonicMailer email settings before sending.',
      icon: Settings
    },
    {
      title: 'Connect your app',
      description: 'Save the key in a server-side .env file, then call the send endpoint from your backend.',
      icon: Send
    }
  ];

  const embeddingSteps = [
    {
      title: 'Add server environment variables',
      description: 'IyonicMailer API keys are private server credentials. Do not put them in HTML or browser JavaScript.',
      code: `# .env (keep this file out of source control)
IYONIC_MAILER_API_URL=https://api.iyonicorp.com/api/mailer/v1
IYONIC_MAILER_API_KEY=im_sk_replace_with_your_secret_key`
    },
    {
      title: 'Load your environment',
      description: 'Load environment variables on your server (for example, with dotenv in Node.js).',
      code: `# Install dotenv once in your Node.js project:
npm install dotenv

# Load your .env values in your server entry file:
import 'dotenv/config';

if (!process.env.IYONIC_MAILER_API_KEY) {
  throw new Error('Missing IYONIC_MAILER_API_KEY');
}`
    },
    {
      title: 'Send an email from your backend',
      description: 'Send from your backend. The secret is read from the environment and never returned to the browser.',
      code: `const response = await fetch(
  process.env.IYONIC_MAILER_API_URL + '/send',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.IYONIC_MAILER_API_KEY,
    },
    body: JSON.stringify({
      to: 'customer@example.com',
      subject: 'Welcome',
      text: 'Welcome to our service.',
      html: '<h1>Welcome</h1>',
    }),
  },
);

if (!response.ok) throw new Error(await response.text());
console.log(await response.json());`
    },
    {
      title: 'Protect the secret',
      description: 'Use the base URL and endpoint below. Set both values in local development and your production secret manager.',
      code: `# .gitignore
.env
.env.*
!.env.example

# .env.example (safe to commit; no real secret)
IYONIC_MAILER_API_URL=https://api.iyonicorp.com/api/mailer/v1
IYONIC_MAILER_API_KEY=`
    }
  ];

  const quickStartCode = `# 1. Add these values to your server's .env file.
IYONIC_MAILER_API_URL=https://api.iyonicorp.com/api/mailer/v1
IYONIC_MAILER_API_KEY=im_sk_your_secret_key

# 2. Send from a server terminal (after loading .env).
curl "$IYONIC_MAILER_API_URL/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $IYONIC_MAILER_API_KEY" \\
  -d '{"to":"customer@example.com","subject":"Hello","text":"Welcome!"}'

# Keep .env out of Git and never expose this key in browser code.`;

  return (
    <>
      <SEO
        title="IyonicMailer API Documentation | Iyonicorp"
        description="IyonicMailer API setup, server-side .env examples, email endpoint reference, plan limits, and billing."
      />

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">IyonicMailer</h1>
                <p className="text-sm text-gray-500">API Documentation</p>
              </div>
            </div>
            <nav className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {(['getting-started', 'api', 'environment', 'billing'] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSection === section
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {{ 'getting-started': 'Getting started', api: 'API reference', environment: 'Environment setup', billing: 'Plans & billing' }[section]}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
          {/* Getting Started */}
          {activeSection === 'getting-started' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Getting Started</h2>
              <p className="text-lg text-gray-600 mb-8">
                IyonicMailer is a white-label email marketing platform that lets you send
                transactional and marketing emails at any scale. This guide will help you
                get up and running in minutes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {getStartedSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="border border-gray-200 rounded-xl p-6 bg-gray-50/50">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{index + 1}. {step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3">Quick Start</h3>
                <div className="bg-white rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <code className="text-gray-800">{quickStartCode}</code>
                </div>
              </div>
            </div>
          )}

          {/* API Reference */}
          {activeSection === 'api' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">REST API Reference</h2>
              <p className="text-lg text-gray-600 mb-8">Send one transactional email per request. The API key is accepted in the <code className="bg-gray-100 px-2 py-1 rounded">x-api-key</code> header or as a Bearer token. Keep it on your server.</p>

              <div className="space-y-6">
                {endpoints.map((endpoint) => (
                  <ApiMethod
                    key={endpoint.endpoint}
                    method={endpoint.method}
                    endpoint={endpoint.endpoint}
                    description={endpoint.description}
                  >
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm mt-2">
                      <code>{endpoint.example}</code>
                    </pre>
                  </ApiMethod>
                ))}
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Request Bodies</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 border-b font-medium">Field</th>
                      <th className="text-left p-3 border-b font-medium">Type</th>
                      <th className="text-left p-3 border-b font-medium">Required</th>
                      <th className="text-left p-3 border-b font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-b"><code>to</code></td>
                      <td className="p-3 border-b">string</td>
                      <td className="p-3 border-b">Yes</td>
                      <td className="p-3 border-b">One recipient email address</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b"><code>subject</code></td>
                      <td className="p-3 border-b">string</td>
                      <td className="p-3 border-b">Yes</td>
                      <td className="p-3 border-b">Email subject, 1–255 characters</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b"><code>html</code></td>
                      <td className="p-3 border-b">string</td>
                      <td className="p-3 border-b">One of html or text</td>
                      <td className="p-3 border-b">HTML message body</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b"><code>text</code></td>
                      <td className="p-3 border-b">string</td>
                      <td className="p-3 border-b">One of html or text</td>
                      <td className="p-3 border-b">Plain-text message body; may be sent alongside html</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-gray-500">Example success response</p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm"><code>{`{\n  "accepted": true,\n  "messageId": "provider-message-id",\n  "usage": { "sentThisMonth": 1, "monthlyLimit": 1000 }\n}`}</code></pre>
                <p className="text-sm text-gray-600">Common status codes: 400 invalid request, 401 invalid or revoked key, 403 account unavailable, 409 verified email provider required, 429 monthly plan limit reached, 502 provider send failed.</p>
              </div>
            </div>
          )}

          {/* Environment setup */}
          {activeSection === 'environment' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Connect with a server-side .env file</h2>
              <p className="text-lg text-gray-600 mb-8">Create your secret in Console → API keys. Copy it once, store it in your backend environment, and send requests from your server only. Never put this key in a public website or mobile app.</p>

              <div className="space-y-6">
                {embeddingSteps.map((step, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Step {index + 1}: {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{step.code}</code>
                    </pre>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Plans & billing */}
          {activeSection === 'billing' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Plans, API key limits & billing</h2>
              <p className="text-lg text-gray-600 mb-8">Each plan sets the maximum number of active API keys and API email sends in a calendar month. Key limits apply account-wide; revoking a key frees a slot immediately.</p>
              <table className="w-full border-collapse mb-8">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-4 border-b font-medium">Plan</th>
                    <th className="text-left p-4 border-b font-medium">Price / 30 days</th>
                    <th className="text-left p-4 border-b font-medium">Active API keys</th>
                    <th className="text-left p-4 border-b font-medium">API emails / month</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="p-4 border-b">Free</td><td className="p-4 border-b">$0</td><td className="p-4 border-b">2</td><td className="p-4 border-b">1,000</td></tr>
                  <tr><td className="p-4 border-b">Launch</td><td className="p-4 border-b">$10</td><td className="p-4 border-b">10</td><td className="p-4 border-b">10,000</td></tr>
                  <tr><td className="p-4 border-b">Growth</td><td className="p-4 border-b">$35</td><td className="p-4 border-b">25</td><td className="p-4 border-b">100,000</td></tr>
                  <tr><td className="p-4 border-b">Scale</td><td className="p-4 border-b">$70</td><td className="p-4 border-b">100</td><td className="p-4 border-b">500,000</td></tr>
                </tbody>
              </table>
              <div className="bg-gray-50 rounded-xl p-6"><h3 className="text-lg font-semibold text-gray-900 mb-2">Pay for a plan</h3><p className="text-sm text-gray-600">Subscribe in Console → Plans & billing using your IyonicPay wallet or Paystack checkout. Paid subscriptions run for 30 days. IyonicPay converts plan prices from USD for supported wallet currencies; the checkout shows the charge before payment.</p></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
