import React from 'react';
import { Hexagon, ArrowRight, FileText, Book, LifeBuoy, Scale } from 'lucide-react';
import SEO from '../../components/SEO';

const StaticPage: React.FC<{ title: string; description: string; icon: any; children: React.ReactNode }> = ({ title, description, icon: Icon, children }) => (
  <div className="min-h-screen bg-white">
    <SEO title={title} description={description} />
    <nav className="border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
            </div>
            <a href="/" className="text-xl font-black tracking-tighter">IYONICORP</a>
          </div>
          <a href="/" className="text-sm font-bold text-gray-600 hover:text-gray-900">Back to Home</a>
        </div>
      </div>
    </nav>
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="flex items-center space-x-4 mb-8">
        <Icon className="w-10 h-10 text-gray-900" />
        <h1 className="text-5xl font-black text-gray-900">{title}</h1>
      </div>
      <div className="prose prose-lg max-w-none text-gray-600">{children}</div>
    </div>
    <footer className="border-t border-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-sm">© 2026 Iyonicorp Inc. All rights reserved.</div>
    </footer>
  </div>
);

export const Blog: React.FC = () => (
  <StaticPage title="Blog" description="Latest news, updates, and insights from Iyonicorp." icon={FileText}>
    <p className="text-xl text-gray-600 mb-8">Latest news, updates, and insights from Iyonicorp.</p>
    <div className="space-y-8">
      {[
        { title: 'Introducing IyonicShop 2.0', date: 'April 2026', desc: 'The biggest update to our commerce platform yet.' },
        { title: 'Global Payments Are Here', date: 'March 2026', desc: 'Accept payments in 135+ currencies.' },
        { title: 'Launching IyonicBots', date: 'January 2026', desc: 'AI-powered agents for your business.' },
      ].map((post, i) => (
        <div key={i} className="border-b border-gray-100 pb-8">
          <p className="text-sm text-gray-400 mb-2">{post.date}</p>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
          <p className="text-gray-600">{post.desc}</p>
        </div>
      ))}
    </div>
  </StaticPage>
);

export const Press: React.FC = () => (
  <StaticPage title="Press" description="Press releases, media kit, and brand assets for Iyonicorp." icon={FileText}>
    <p className="text-xl text-gray-600 mb-8">Press releases, media kit, and brand assets.</p>
    <div className="bg-gray-50 p-8 rounded-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Media Inquiries</h2>
      <p className="text-gray-600">Contact us at press@iyonicorp.com for media inquiries.</p>
    </div>
  </StaticPage>
);

export const Documentation: React.FC = () => (
  <StaticPage title="Documentation" description="Everything you need to build with Iyonicorp." icon={Book}>
    <p className="text-xl text-gray-600 mb-8">Everything you need to build with Iyonicorp.</p>
    <div className="grid md:grid-cols-2 gap-6">
      {['Getting Started', 'API Reference', 'Themes Guide', 'Payment Setup', 'Shipping Config', 'Webhooks'].map((doc, i) => (
        <a key={i} href="#" className="block bg-gray-50 p-6 rounded-2xl hover:bg-gray-100 transition-colors">
          <h3 className="font-bold text-gray-900">{doc}</h3>
        </a>
      ))}
    </div>
  </StaticPage>
);

export const APIReference: React.FC = () => (
  <StaticPage title="API Reference" description="Complete API documentation for developers." icon={Book}>
    <p className="text-xl text-gray-600 mb-8">Complete API documentation for developers.</p>
    <div className="bg-gray-50 p-6 rounded-xl">
      <p className="text-gray-500 mb-4">API Reference documentation is available in our developer portal.</p>
      <a href="/documentation" className="text-indigo-600 font-bold hover:underline">View Full Documentation →</a>
    </div>
  </StaticPage>
);

export const HelpCenter: React.FC = () => (
  <StaticPage title="Help Center" description="Find answers to common questions about Iyonicorp." icon={LifeBuoy}>
    <p className="text-xl text-gray-600 mb-8">Find answers to common questions.</p>
    <div className="space-y-4">
      {['How do I set up my store?', 'How do I accept payments?', 'How do I customize my theme?', 'How do I add products?'].map((faq, i) => (
        <a key={i} href="#" className="block border border-gray-200 p-6 rounded-2xl hover:border-gray-400 transition-colors">
          <h3 className="font-bold text-gray-900">{faq}</h3>
        </a>
      ))}
    </div>
  </StaticPage>
);

export const Status: React.FC = () => (
  <StaticPage title="System Status" description="Real-time system status and uptime for Iyonicorp services." icon={LifeBuoy}>
    <div className="bg-green-50 border border-green-200 p-6 rounded-2xl mb-8">
      <div className="flex items-center space-x-3">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <h2 className="text-xl font-bold text-green-800">All Systems Operational</h2>
      </div>
    </div>
    <div className="space-y-4">
      {['API', 'Dashboard', 'Storefronts', 'Payments', 'Webhooks'].map((service, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <span className="font-bold">{service}</span>
          <span className="text-green-600 font-bold">Operational</span>
        </div>
      ))}
    </div>
  </StaticPage>
);

export const Privacy: React.FC = () => (
  <StaticPage title="Privacy Policy" description="Our privacy policy outlines how we collect, use, and protect your data." icon={Scale}>
    <p className="text-xl text-gray-600 mb-8">Last updated: April 2026</p>
    <p className="mb-4">At Iyonicorp, we take your privacy seriously. This policy outlines how we collect, use, and protect your data.</p>
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Data We Collect</h2>
    <p className="mb-4">We collect information you provide when creating an account, including your name, email, and payment information.</p>
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">How We Use Data</h2>
    <p className="mb-4">We use your data to provide our services, process payments, and improve your experience.</p>
  </StaticPage>
);

export const Terms: React.FC = () => (
  <StaticPage title="Terms of Service" description="Read our terms of service carefully before using Iyonicorp." icon={Scale}>
    <p className="text-xl text-gray-600 mb-8">Last updated: April 2026</p>
    <p className="mb-4">By using Iyonicorp, you agree to these terms. Please read them carefully.</p>
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Using Our Services</h2>
    <p className="mb-4">You must follow our acceptable use policy and not engage in illegal activities.</p>
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Account Responsibilities</h2>
    <p className="mb-4">You're responsible for maintaining the security of your account.</p>
  </StaticPage>
);

export const Cookies: React.FC = () => (
  <StaticPage title="Cookie Policy" description="How we use cookies to enhance your experience." icon={Scale}>
    <p className="text-xl text-gray-600 mb-8">How we use cookies</p>
    <p className="mb-4">We use cookies to enhance your experience, analyze traffic, and for security purposes.</p>
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Managing Cookies</h2>
    <p className="mb-4">You can control cookies through your browser settings.</p>
  </StaticPage>
);

export const Licenses: React.FC = () => (
  <StaticPage title="Open Source Licenses" description="Third-party libraries used in the Iyonicorp platform." icon={Scale}>
    <p className="text-xl text-gray-600 mb-8">Third-party libraries we use.</p>
    <div className="space-y-4">
      {['React - MIT License', 'Tailwind CSS - MIT License', 'Framer Motion - MIT License', 'Lucide Icons - ISC License'].map((license, i) => (
        <div key={i} className="border border-gray-200 p-4 rounded-xl">
          <span className="font-mono text-sm">{license}</span>
        </div>
      ))}
    </div>
  </StaticPage>
);

export default Blog;