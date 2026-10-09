import React from 'react';
import { ArrowRight, Layers, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { StaticPageLayout } from './StaticPageLayout';

const About: React.FC = () => {
  return (
    <>
      <SEO title="About Iyoni" description="Learn about Iyoni’s modular business platform: one technology foundation for distinct business experiences." />
      <StaticPageLayout
        title="Every business is different. The technology behind it shouldn’t have to be."
        eyebrow="Company / About"
        description="Iyoni is a modular Business Operating System: one technology foundation for distinct business platforms, with shared services for commerce, payments, and automation."
        icon={Layers}
      >
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <section className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Our point of view</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-gray-950 sm:text-4xl">One foundation. Different ways to do business.</h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">A restaurant, a school, and a retailer do different work. Iyoni brings business-specific platform experiences together with shared services, so each business can start with relevant tools instead of a one-size-fits-all workflow.</p>
            </section>

            <section className="mt-16 border-t border-gray-200 pt-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Shared platform services</p>
              <h2 className="mt-3 text-2xl font-bold text-gray-950">Core services, within a wider platform.</h2>
              <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
                {[
                  { icon: Layers, name: 'IyonicShop', description: 'The commerce engine for storefront and product experiences.' },
                  { icon: ShieldCheck, name: 'IyonicPay', description: 'Payment infrastructure and experiences within the Iyoni platform.' },
                  { icon: Sparkles, name: 'IyonicBots', description: 'Iyoni’s AI and automation engine.' },
                ].map(({ icon: Icon, name, description }) => (
                  <div key={name} className="grid gap-4 py-6 sm:grid-cols-[2.5rem_10rem_1fr] sm:items-start">
                    <Icon className="h-6 w-6 text-blue-700" aria-hidden="true" />
                    <h3 className="font-bold text-gray-950">{name}</h3>
                    <p className="leading-6 text-gray-600">{description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-16">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">How we work</p>
              <div className="mt-6 grid gap-x-10 divide-y divide-gray-200 border-y border-gray-200 sm:grid-cols-2 sm:divide-y-0">
                {[
                  { icon: TrendingUp, title: 'Build for different needs', text: 'Make space for the work each kind of business does.' },
                  { icon: ShieldCheck, title: 'Earn trust every day', text: 'Treat security, clarity, and dependable experiences as foundations.' },
                  { icon: Layers, title: 'Share a foundation', text: 'Bring business-specific experiences together on one modular platform.' },
                  { icon: Sparkles, title: 'Stay curious', text: 'Learn from the people using the platform and keep improving the work.' },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="py-6 sm:border-b sm:border-gray-200">
                    <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                    <h3 className="mt-4 font-bold text-gray-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit border-l-4 border-emerald-800 bg-emerald-50/70 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-900">Start with your business</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-gray-950">Find a platform that fits.</h2>
            <p className="mt-4 leading-7 text-gray-600">Explore dedicated experiences and storefront themes across the Iyoni catalog.</p>
            <Link to="/themes" className="mt-7 inline-flex items-center gap-2 font-bold text-emerald-900 hover:text-emerald-950">Find your platform <ArrowRight className="h-4 w-4" /></Link>
          </aside>
        </div>
      </StaticPageLayout>
    </>
  );
};

export default About;