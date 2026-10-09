import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  BarChart3,
  Send,
  Settings,
  Code,
  Rocket,
  Globe,
  Zap,
  ArrowRight,
  ExternalLink,
  Users,
  CheckCircle
} from 'lucide-react';
import SEO from '../components/SEO';

interface IyonicMailerProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
}

export const IyonicMailer: React.FC<IyonicMailerProps> = ({ onGetStarted }) => {
  const navigate = useNavigate();

   const handleGetStarted = () => {
     navigate('/iyonic-mailer/register');
   };

   const handleSignIn = () => {
     navigate('/iyonic-mailer/login');
   };

  const handleLearnMore = () => {
    const featuresSection = document.getElementById('features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: Send,
      title: 'Campaign Management',
      description: 'Design, schedule, and send email campaigns with powerful automation. Track opens, clicks, bounces, and conversions in real time.',
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: Settings,
      title: 'SMTP & Provider Integration',
      description: 'Connect your own SMTP server, SendGrid, Mailgun, AWS SES, Sendinblue, or Postmark. Or use our reliable default provider.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    {
      icon: Code,
      title: 'API & Webhooks',
      description: 'Send emails programmatically with our REST API. Integrate webhooks for real-time delivery tracking and event notifications.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      description: 'Detailed analytics on campaign performance, revenue attribution, and customer engagement. Export data for your own reporting.',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100'
    },
    {
      icon: Users,
      title: 'Customer Segmentation',
      description: 'Segment your audience by behavior, purchase history, location, and more. Target the right customers with the right message.',
      color: 'text-pink-600',
      bg: 'bg-pink-100'
    }
  ];

  const providers = [
    { name: 'SMTP', description: 'Your own mail server' },
    { name: 'SendGrid', description: 'Cloud email API' },
    { name: 'Mailgun', description: 'API-first email platform' },
    { name: 'AWS SES', description: 'Amazon Simple Email Service' },
    { name: 'Sendinblue', description: 'Email & marketing automation' },
    { name: 'Postmark', description: 'Transactional email' }
  ];

  return (
    <>
      <SEO
        title="IyonicMailer — Email Marketing Platform | Iyonicorp"
        description="White-label email marketing platform with SMTP integration, campaign management, API access, and reseller program. Create, send, and track email campaigns."
      />

      <div className="min-h-screen bg-white text-gray-900 antialiased">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Mail className="w-8 h-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-900">IyonicMailer</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">by Iyonicorp</span>
              </div>
              <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
                <a href="#features" className="text-gray-700 hover:text-indigo-600 transition-colors">Features</a>
                <a href="#pricing" className="text-gray-700 hover:text-indigo-600 transition-colors">Pricing</a>
                <a href="#docs" className="text-gray-700 hover:text-indigo-600 transition-colors">Documentation</a>
                <button
                  onClick={handleSignIn}
                  className="text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </button>
              </nav>
              <button
                onClick={handleGetStarted}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-20 pb-32">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium mb-6">
                <Rocket className="w-3.5 h-3.5 mr-1" />
                White-label email marketing for businesses & resellers
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
                Supercharge Your Email Marketing
              </h1>

              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                IyonicMailer gives you everything you need to create stunning email campaigns,
                manage subscribers, track performance, and grow your business — all with your own
                branding and custom SMTP provider.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGetStarted}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLearnMore}
                  className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center space-x-2"
                >
                  <span>Learn More</span>
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                No credit card required. Cancel anytime.
              </p>
            </div>

            <div className="mt-20 relative">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center space-x-2">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono">app.iyonicorp.com/mailer</span>
                </div>
                <div className="p-8 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div>
                      <div className="text-3xl font-bold text-indigo-600 mb-1">99.2%</div>
                      <div className="text-sm text-gray-500">Delivery Rate</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-indigo-600 mb-1">2.4M</div>
                      <div className="text-sm text-gray-500">Emails Sent</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-indigo-600 mb-1">15s</div>
                      <div className="text-sm text-gray-500">Avg. Setup</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center max-w3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Everything you need for powerful email marketing
              </h2>
              <p className="text-lg text-gray-600">
                Built for teams that need reliability, flexibility, and scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Providers Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Integrates with all major email providers
            </h2>
            <p className="text-lg text-gray-600 mb-12">
              Use your own provider credentials or our default. Full control over delivery.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {providers.map((provider) => (
                <div
                  key={provider.name}
                  className="bg-white rounded-xl p-5 border border-gray-100 text-center hover:shadow-md transition-shadow"
                >
                  <div className="font-semibold text-gray-900 mb-1">{provider.name}</div>
                  <div className="text-xs text-gray-500">{provider.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-gray-600">
                Pay as you grow. No hidden fees, no surprise charges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Starter</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">$29<span className="text-lg text-gray-500 font-medium">/mo</span></div>
                <p className="text-gray-500 mb-6">500 emails/day, 3 templates, basic analytics</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Up to 500 emails/day</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> 3 email templates</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Basic analytics</li>
                </ul>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium transition-colors">
                  Get Started
                </button>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-indigo-600 shadow-lg">
                <div className="text-center mb-4">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">Most Popular</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Professional</h3>
                <div className="text-4xl font-bold text-center text-gray-900 mb-1">$79<span className="text-lg text-gray-500 font-medium">/mo</span></div>
                <p className="text-gray-500 text-center mb-6">5,000 emails/day, unlimited templates, advanced analytics</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Up to 5,000 emails/day</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Unlimited templates</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Advanced analytics</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> A/B testing</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> API access</li>
                </ul>
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-all shadow-md">
                  Get Started
                </button>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">Custom</div>
                <p className="text-gray-500 mb-6">Unlimited everything, dedicated support, custom features</p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Unlimited emails</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Dedicated IP addresses</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> Custom integrations</li>
                  <li className="flex items-center text-sm"><CheckCircle className="w-4 h-4 text-emerald-500 mr-2" /> 24/7 priority support</li>
                </ul>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to elevate your email marketing?
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses and resellers who trust IyonicMailer for their email campaigns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-white text-indigo-600 hover:bg-gray-50 px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate('/documentation')}
                className="border-2 border-white text-white hover:bg-white/10 px-8 py-4 rounded-2xl font-semibold text-lg transition-all flex items-center space-x-2"
              >
                <span>View Documentation</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center space-x-2 mb-4">
              <Mail className="w-6 h-6 text-indigo-400" />
              <span className="text-xl font-bold text-white">IyonicMailer</span>
            </div>
            <p className="text-sm text-gray-500">
              A product of Iyonicorp. Built for reliable, scalable email marketing.
            </p>
          </div>
      </footer>
    </div>
    </>
  );
};
