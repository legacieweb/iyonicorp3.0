import React from 'react';
import { ArrowRight, Layers, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { StaticPageLayout } from './StaticPageLayout';

const About: React.FC = () => {
  return (
    <>
      <SEO title="About Iyonicorp" description="Learn how Iyonicorp connects the tools businesses need to build, sell, and grow online." />
      <StaticPageLayout
        title="Commerce should help you move forward."
        eyebrow="Company / About"
        description="Iyonicorp brings storefronts, payments, and automation into one connected toolkit, built around the real work of running a business."
        icon={Layers}
      >
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <section className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Our mission</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight text-gray-950 sm:text-4xl">Make the complicated parts of commerce feel connected.</h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">The tools businesses rely on are often scattered across separate systems. We bring the important pieces closer together so sellers can spend less time stitching tools together and more time serving customers.</p>
            </section>

            <section className="mt-16 border-t border-gray-200 pt-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">One platform, useful building blocks</p>
              <h2 className="mt-3 text-2xl font-bold text-gray-950">Start with what you need. Grow into what’s next.</h2>
              <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
                {[
                  { icon: Layers, name: 'IyonicShop', description: 'Create a storefront, manage products or services, and shape the customer experience.' },
                  { icon: ShieldCheck, name: 'IyonicPay', description: 'Connect payment experiences with the rest of your commerce workflow.' },
                  { icon: Sparkles, name: 'IyonicBots', description: 'Explore automation tools designed to help businesses handle repeat work.' },
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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">How we work</p>
              <div className="mt-6 grid gap-x-10 divide-y divide-gray-200 border-y border-gray-200 sm:grid-cols-2 sm:divide-y-0">
                {[
                  { icon: TrendingUp, title: 'Build for real growth', text: 'Make the next step easier without making today harder.' },
                  { icon: ShieldCheck, title: 'Earn trust every day', text: 'Treat security, clarity, and dependable experiences as foundations.' },
                  { icon: Layers, title: 'Keep systems connected', text: 'Design tools that work better together and remain useful on their own.' },
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

          <aside className="h-fit border-l-4 border-blue-700 bg-blue-50/70 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-800">Build with us</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-gray-950">Bring your next business idea to life.</h2>
            <p className="mt-4 leading-7 text-gray-600">Start with a seller account and explore the tools built for your workflow.</p>
            <Link to="/register?role=seller" className="mt-7 inline-flex items-center gap-2 font-bold text-blue-800 hover:text-blue-950">Get started <ArrowRight className="h-4 w-4" /></Link>
          </aside>
        </div>
      </StaticPageLayout>
    </>
  );
};

export default About;