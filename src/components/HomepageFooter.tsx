import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronUp, Github, Instagram, Linkedin, Twitter } from 'lucide-react';
import { Button } from './ui';

const footerGroups = [
  {
    title: 'Platform',
    links: [
      { name: 'IyonicShop', href: '/iyonicshop' },
      { name: 'IyonicPay', href: '/iyonicpay' },
      { name: 'IyonicBots', href: '/iyonicbots' },
      { name: 'Pricing', href: '/register?role=seller' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Blog', href: '/blog' },
      { name: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Docs', href: '/documentation' },
      { name: 'API', href: '/api-reference' },
      { name: 'Help', href: '/help-center' },
      { name: 'Status', href: '/status' },
      { name: 'Refunds', href: '/refunds' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Privacy', href: '/privacy' },
      { name: 'Terms', href: '/terms' },
      { name: 'Cookie', href: '/cookies' },
      { name: 'Licenses', href: '/licenses' },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, label: 'Twitter' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Github, label: 'GitHub' },
];

export const HomepageFooter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsSubscribed(true);
    setEmail('');
    window.setTimeout(() => setIsSubscribed(false), 3000);
  };

  return (
    <footer className="relative overflow-hidden border-t border-gray-100 bg-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30" aria-hidden="true">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-y-1/2 rounded-full bg-blue-50 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 translate-y-1/2 rounded-full bg-purple-50 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-20 lg:pt-24">
        <div className="mb-16 grid grid-cols-1 gap-12 lg:mb-20 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link to="/" className="group mb-6 inline-flex items-center gap-3">
              <img src="/logo.png" alt="iyonicweb" className="h-12 w-12 object-contain transition-transform duration-500 group-hover:scale-110" />
              <span className="text-2xl font-black tracking-tight text-gray-900">iyonicweb</span>
            </Link>
            <p className="mb-8 max-w-sm text-lg leading-relaxed text-gray-500">
              The next generation modular commerce platform. Engineered for growth, scale, and intelligence.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  aria-label={`${label} coming soon`}
                  title={`${label} coming soon`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400"
                >
                  <Icon className="h-5 w-5" />
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:col-span-8">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-gray-900">{group.title}</h2>
                <ul className="space-y-4">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link to={item.href} className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-10">
          <div className="flex flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left">
            <div className="flex-1">
              <h2 className="mb-2 text-xl font-bold text-gray-900">Join our newsletter</h2>
              <p className="font-medium text-gray-500">Get the latest updates on new features and product releases.</p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto" aria-label="Newsletter signup">
              <label htmlFor="footer-newsletter-email" className="sr-only">Email address</label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 sm:w-80"
                required
              />
              <Button type="submit" className="rounded-2xl bg-gray-900 px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-black">
                {isSubscribed ? 'Subscribed!' : 'Subscribe'}
              </Button>
              <span className="sr-only" aria-live="polite">{isSubscribed ? 'Thanks for subscribing.' : ''}</span>
            </form>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-gray-50 pt-8 md:flex-row">
            <p className="text-sm font-medium text-gray-400">© 2026 iyonicweb Inc. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
              <span>Global Commerce</span>
              <span>Carbon Neutral</span>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Back to top"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronUp className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomepageFooter;