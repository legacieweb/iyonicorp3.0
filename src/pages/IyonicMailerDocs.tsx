import React, { useState } from 'react';
import { Copy, Mail, Send, BarChart3, Users, Shield, Settings, Code, ExternalLink, CheckCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { useToast } from '../context/ToastContext';

const ApiMethod: React.FC<{ method: string; endpoint: string; description?: string; children?: React.ReactNode }> = ({ method, endpoint, description, children }) => {
  const { showToast } = useToast();
  const methodColors = {
    GET: 'bg-blue-100 text-blue-800',
    POST: 'bg-emerald-100 text-emerald-800',
    PATCH: 'bg-amber-100 text-amber-800',
    DELETE: 'bg-red-100 text-red-800'
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
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
  const [activeSection, setActiveSection] = useState<'getting-started' | 'api' | 'embedding' | 'webhooks'>('getting-started');

  const webhookExamplePayload = JSON.stringify({
    event: "email.opened",
    timestamp: "2026-10-07T12:00:00Z",
    data: {
      messageId: "msg_abc123",
      to: "customer@example.com",
      subject: "Welcome!",
      openedAt: "2026-10-07T12:30:00Z"
    }
  }, null, 2);

  const endpoints = [
    {
      method: 'POST',
      endpoint: '/api/embed/send',
      description: 'Send a transactional email to a single recipient.',
      example: `curl https://api.iyonicorp.com/api/embed/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: im_sk_YOUR_API_KEY" \\
  -d '{
    "to": "customer@example.com",
    "subject": "Welcome!",
    "html": "<h1>Hello</h1><p>Welcome to our service.</p>"
  }'`
    },
    {
      method: 'POST',
      endpoint: '/api/embed/send/bulk',
      description: 'Send emails to multiple recipients (up to 100 per request).',
      example: `curl https://api.iyonicorp.com/api/embed/send/bulk \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: im_sk_YOUR_API_KEY" \\
  -d '{
    "to": ["user1@example.com", "user2@example.com"],
    "subject": "Newsletter",
    "html": "<h1>Latest updates</h1><p>Here is what is new...</p>"
  }'`
    },
    {
      method: 'POST',
      endpoint: '/api/embed/send/template',
      description: 'Send an email using a saved template with variable substitution.',
      example: `curl https://api.iyonicorp.com/api/embed/send/template \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: im_sk_YOUR_API_KEY" \\
  -d '{
    "to": "customer@example.com",
    "templateSlug": "welcome-email",
    "variables": {
      "customerName": "Alice",
      "storeName": "My Store"
    }
  }'`
    },
    {
      method: 'GET',
      endpoint: '/api/embed/status/{messageId}',
      description: 'Check the delivery status of a sent email.',
      example: `curl https://api.iyonicorp.com/api/embed/status/abc123 \\
  -H "x-api-key: im_sk_YOUR_API_KEY"`
    },
    {
      method: 'GET',
      endpoint: '/api/user/api-key',
      description: 'Get or create your personal API key (requires authentication).',
      example: `curl https://api.iyonicorp.com/api/user/api-key \\
  -H "x-auth-token: YOUR_JWT_TOKEN"`
    },
    {
      method: 'POST',
      endpoint: '/api/user/api-key/regenerate',
      description: 'Regenerate your API key.',
      example: `curl -X POST https://api.iyonicorp.com/api/user/api-key/regenerate \\
  -H "x-auth-token: YOUR_JWT_TOKEN"`
    }
  ];

  const getStartedSteps = [
    {
      title: 'Create an Account',
      description: 'Sign up as a reseller or standard user to get started with IyonicMailer.',
      icon: Mail
    },
    {
      title: 'Get Your API Key',
      description: 'Navigate to Settings > API Keys or call GET /api/user/api-key.',
      icon: Shield
    },
    {
      title: 'Configure SMTP or Use Default',
      description: 'Set up your own SMTP provider or use our reliable default delivery.',
      icon: Settings
    },
    {
      title: 'Send Your First Email',
      description: 'Use the REST API or embedded HTML widget to start sending emails.',
      icon: Send
    }
  ];

  const embeddingSteps = [
    {
      title: 'Add the Script Tag',
      description: 'Include the IyonicMailer widget script in your HTML:',
      code: `<script src="https://cdn.iyonicorp.com/mailer.js"></script>`
    },
    {
      title: 'Create an Embed Container',
      description: 'Add a container element where you want the form to appear:',
      code: `<div id="iyonic-mailer-form" data-template="newsletter-signup"></div>`
    },
    {
      title: 'Initialize the Widget',
      description: 'Configure and mount the widget:',
      code: `<script>
  IyonicMailer.init({
    container: '#iyonic-mailer-form',
    apiKey: 'im_sk_YOUR_API_KEY',
    template: 'newsletter-signup',
    onSuccess: function(data) {
      console.log('Subscriber added:', data);
    }
  });
</script>`
    },
    {
      title: 'Customize with CSS',
      description: 'Style the widget with your own CSS variables:',
      code: `.iyonic-mailer-widget {
  --im-primary-color: #4f46e5;
  --im-border-radius: 12px;
  --im-font-family: 'Inter', sans-serif;
}`
    }
  ];

  const quickStartCode = `# Step 1: Get your API key
curl https://api.iyonicorp.com/api/user/api-key \\
  -H "x-auth-token: YOUR_JWT_TOKEN"

# Step 2: Send an email
curl https://api.iyonicorp.com/api/embed/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: im_sk_YOUR_API_KEY" \\
  -d '{"to": "customer@example.com", "subject": "Hello", "html": "<h1>Welcome!</h1>"}'
`;

  const webhookEvents = [
    { event: 'email.delivered', description: 'Email was delivered to the recipient SMTP server.' },
    { event: 'email.opened', description: 'Recipient opened the email.' },
    { event: 'email.clicked', description: 'Recipient clicked a link in the email.' },
    { event: 'email.bounced', description: 'Email was rejected by the recipient server.' },
    { event: 'email.complaint', description: 'Recipient marked the email as spam.' },
    { event: 'email.unsubscribed', description: 'Recipient unsubscribed from future emails.' }
  ];

  return (
    <>
      <SEO
        title="IyonicMailer API Documentation | Iyonicorp"
        description="Complete API documentation for IyonicMailer email marketing platform. Includes REST API reference, embedding guide, and webhook documentation."
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
              {(['getting-started', 'api', 'embedding', 'webhooks'] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSection === section
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1).replace('-', ' ')}
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
              <p className="text-lg text-gray-600 mb-8">
                All API requests must include your API key in the <code className="bg-gray-100 px-2 py-1 rounded">x-api-key</code> header.
              </p>

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
                      <td className="p-3 border-b">string | array</td>
                      <td className="p-3 border-b">Yes</td>
                      <td className="p-3 border-b">Recipient email(s)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b"><code>subject</code></td>
                      <td className="p-3 border-b">string</td>
                      <td className="p-3 border-b">No*</td>
                      <td className="p-3 border-b">Email subject (required if no template)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b"><code>html</code></td>
                      <td className="p-3 border-b">string</td>
                      <td className="p-3 border-b">No*</td>
                      <td className="p-3 border-b">HTML email body (required if no template)</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b"><code>templateSlug</code></td>
                      <td className="p-3 border-b">string</td>
                      <td className="p-3 border-b">No*</td>
                      <td className="p-3 border-b">Template slug to use</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b"><code>variables</code></td>
                      <td className="p-3 border-b">object</td>
                      <td className="p-3 border-b">No</td>
                      <td className="p-3 border-b">Template variable substitutions</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-gray-500">* Either html+subject or templateSlug must be provided.</p>
              </div>
            </div>
          )}

          {/* Embedding */}
          {activeSection === 'embedding' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">HTML Embedding Guide</h2>
              <p className="text-lg text-gray-600 mb-8">
                Embed IyonicMailer forms directly into any website using our lightweight widget.
                No build tools or frameworks required.
              </p>

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

              <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Pre-built Templates</h3>
                <ul className="space-y-2 text-sm text-yellow-800">
                  <li><code>newsletter-signup</code> — Email collection form</li>
                  <li><code>abandoned-cart</code> — Cart recovery prompt</li>
                  <li><code>feedback-survey</code> — Customer feedback form</li>
                  <li><code>product-update</code> — Product announcement banner</li>
                </ul>
              </div>
            </div>
          )}

          {/* Webhooks */}
          {activeSection === 'webhooks' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Webhooks</h2>
              <p className="text-lg text-gray-600 mb-8">
                IyonicMailer can send real-time event notifications to a webhook URL of your choice.
                Configure your webhook endpoint in the IyonicMailer dashboard under Settings.
              </p>

              <table className="w-full border-collapse mb-8">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-4 border-b font-medium">Event</th>
                    <th className="text-left p-4 border-b font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookEvents.map((event) => (
                    <tr key={event.event}>
                      <td className="p-4 border-b"><code className="bg-gray-100 px-2 py-1 rounded">{event.event}</code></td>
                      <td className="p-4 border-b text-sm text-gray-600">{event.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Webhook Payload Example</h3>
                <pre className="bg-white p-4 rounded-lg border overflow-x-auto text-sm">
                  <code>{webhookExamplePayload}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
