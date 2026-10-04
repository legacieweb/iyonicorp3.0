import React from 'react';
import { ArrowRight, Code2, Headphones, Layers, Palette, Sparkles } from 'lucide-react';
import SEO from '../../components/SEO';
import { StaticPageLayout } from './StaticPageLayout';

const roleAreas = [
  { icon: Code2, title: 'Engineering', description: 'Build resilient product experiences, platform services, and integrations.' },
  { icon: Palette, title: 'Product and design', description: 'Make complex commerce workflows clear, coherent, and accessible.' },
  { icon: Headphones, title: 'Customer experience', description: 'Help sellers solve real problems and bring their feedback back to the team.' },
  { icon: Layers, title: 'Operations', description: 'Improve the systems that help a growing platform run reliably.' },
];

const Careers: React.FC = () => {
  return (
    <>
      <SEO title="Careers at Iyonicorp" description="Explore the kinds of work that shape Iyonicorp and how to reach our team about future opportunities." />
      <StaticPageLayout
        title="Build tools that make business feel possible."
        eyebrow="Company / Careers"
        description="We’re working on the connected systems behind modern commerce. Bring curiosity, care for the details, and a bias toward making useful things."
        icon={Sparkles}
      >
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">The work</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-gray-950">Good commerce software is a team sport.</h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">Every improvement touches more than a screen. It can change how a seller runs a day, how a customer gets help, or how a team understands its next decision. We value people who can connect those details and make the whole experience better.</p>
            </section>

            <section className="mt-16 border-t border-gray-200 pt-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Where you can contribute</p>
              <h2 className="mt-3 text-2xl font-bold text-gray-950">Explore the kinds of problems we work on</h2>
              <div className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
                {roleAreas.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="grid gap-4 py-5 sm:grid-cols-[2rem_12rem_1fr] sm:items-center">
                    <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                    <h3 className="font-bold text-gray-950">{title}</h3>
                    <p className="leading-6 text-gray-600">{description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-16">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">What matters here</p>
              <div className="mt-6 grid gap-x-10 divide-y divide-gray-200 border-y border-gray-200 sm:grid-cols-3 sm:divide-y-0">
                {[
                  { title: 'Useful over flashy', text: 'Solve a real problem clearly, then keep improving it.' },
                  { title: 'Own the outcome', text: 'Follow the work through details, delivery, and feedback.' },
                  { title: 'Make room for people', text: 'Build with care for the different people using the product.' },
                ].map((value) => <div key={value.title} className="py-6 sm:border-b sm:border-gray-200"><h3 className="font-bold text-gray-950">{value.title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{value.text}</p></div>)}
              </div>
            </section>

            <section className="mt-16 border-l-4 border-blue-700 bg-blue-50/70 p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Current openings</p>
              <h2 className="mt-2 text-xl font-bold text-gray-950">No roles are listed here right now.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">We’ll use this page to share opportunities when they’re open. For now, you can contact our team with a short note about the kind of work you do and the problems you care about.</p>
              <a href="mailto:support@iyonicorp.com?subject=Career%20inquiry" className="mt-5 inline-flex items-center gap-2 font-bold text-blue-800 hover:text-blue-950">Contact the team <ArrowRight className="h-4 w-4" /></a>
            </section>
          </div>

          <aside className="h-fit border-l-4 border-gray-950 bg-gray-50 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">A thoughtful application</p>
            <h2 className="mt-3 text-xl font-bold text-gray-950">Tell us what you’ve made.</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">Include the kind of role or problem you’re interested in, a few examples of your work, and how we can reach you.</p>
            <p className="mt-5 text-sm leading-6 text-gray-600">We’ll share specific expectations and working arrangements with each published role.</p>
          </aside>
        </div>
      </StaticPageLayout>
    </>
  );
};

export default Careers;