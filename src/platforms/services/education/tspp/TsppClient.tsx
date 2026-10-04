import React from 'react';
import { ArrowRight, BadgeCheck, BookOpenText, Building2, GraduationCap, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  'Verified teacher profiles',
  'School fit and curriculum matching',
  'Fast shortlist and interview flow',
];

const schools = [
  { name: 'Oak Crest Academy', focus: 'Primary & middle school', seats: '4 roles open' },
  { name: 'Greenfield College', focus: 'STEM and business studies', seats: '3 roles open' },
  { name: 'Nile Heights Academy', focus: 'Early years leadership', seats: '2 roles open' },
];

const teachers = [
  { name: 'Ruth M.', label: 'English specialist', meta: '15 years • DBS cleared' },
  { name: 'Jude A.', label: 'Biology teacher', meta: 'IGCSE expertise • 4.9 rating' },
  { name: 'Aisha K.', label: 'Head of primary', meta: 'Leadership track • Available now' },
];

const TsppClient: React.FC = () => (
  <div className="min-h-screen bg-[#f5efe8] text-[#1d2430]">
    <header className="mx-auto max-w-6xl px-5 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#e0d5bf] bg-[#fffdf9]/80 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d2430] text-base font-semibold text-[#f8f6f1]">T</div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5d6c62]">Teachers & Private Schools</p>
            <p className="text-xl font-semibold">TSPP</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-sm text-[#475a53]">
          <a href="#platform" className="hover:text-[#1d2430]">Platform</a>
          <a href="#schools" className="hover:text-[#1d2430]">Schools</a>
          <a href="#teachers" className="hover:text-[#1d2430]">Teachers</a>
          <Link to="/themes" className="hover:text-[#1d2430]">Themes</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login?redirect=%2Ftspp%2Fclient" className="rounded-full border border-[#d5c7af] bg-white px-4 py-2 text-sm font-medium text-[#1d2430]">
            Sign in
          </Link>
          <Link to="/register?theme=tspp&redirect=%2Ftspp%2Fadmin" className="inline-flex items-center gap-2 rounded-full bg-[#1d2430] px-4 py-2 text-sm font-medium text-white">
            Create school account <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-6xl space-y-8 px-5 pb-14 pt-2 sm:px-6 lg:px-8">
      <section className="grid gap-6 rounded-[30px] border border-[#e7dcc2] bg-[#fffdf9] p-6 shadow-[0_18px_55px_rgba(29,36,48,0.04)] lg:grid-cols-[1.3fr_0.9fr] lg:p-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#f5efe8] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-[#5d6f5e]">
            <Sparkles size={13} /> Premium school hiring
          </div>
          <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.05em] md:text-6xl">Build the right school team—without the noise.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#4a5d59]">
            TSPP connects schools with verified teachers, trusted school profiles, and streamlined hiring workflows designed for premium education brands.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/register?theme=tspp&redirect=%2Ftspp%2Fadmin" className="inline-flex items-center gap-2 rounded-full bg-[#1d2430] px-5 py-3 text-sm font-medium text-white">
              Find qualified teachers <ArrowRight size={16} />
            </Link>
            <Link to="/login?redirect=%2Ftspp%2Fclient" className="rounded-full border border-[#d5c7af] bg-[#f5efe8] px-5 py-3 text-sm font-medium text-[#1d2430]">
              Teacher sign in
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#475a53]">
            {highlights.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full bg-[#f6f1ea] px-3 py-2">
                <BadgeCheck size={15} className="text-[#1a6f5c]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] bg-[#1d2430] p-5 text-white shadow-[0_18px_60px_rgba(29,36,48,0.18)]">
          <div className="mb-4 flex items-center justify-between text-sm text-[#e0dfd8]">
            <span className="inline-flex items-center gap-2"><Search size={15} /> Search talent</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.18em]">Live</span>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#d6cab4]">Focus</p>
              <p className="mt-2 text-xl font-semibold">Mathematics teacher</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#d6cab4]">Location</p>
              <p className="mt-2 text-xl font-semibold">Lagos / Remote hybrid</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#d6cab4]">Criteria</p>
              <p className="mt-2 text-xl font-semibold">IGCSE + safeguarding cleared</p>
            </div>
          </div>
        </div>
      </section>

      <section id="schools" className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[#e7dcc2] bg-[#fffdf9] p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6a7d6c]">Schools</p>
              <h2 className="mt-2 text-2xl font-semibold">Active hiring opportunities</h2>
            </div>
            <Building2 className="text-[#1d2430]" size={22} />
          </div>

          <div className="space-y-3">
            {schools.map((school) => (
              <div key={school.name} className="flex items-center justify-between rounded-2xl border border-[#ebdfc9] bg-white p-3">
                <div>
                  <p className="font-medium text-[#1d2430]">{school.name}</p>
                  <p className="text-sm text-[#586b63]">{school.focus}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#1d2430]">{school.seats}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-[#1a6f5c]"><ShieldCheck size={12} /> verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#e7dcc2] bg-[#1d2430] p-5 text-white shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#dbe5db]">
            <BookOpenText size={14} />
            Why schools choose TSPP
          </div>
          <ul className="space-y-3 text-sm text-[#e8efe9]">
            <li className="flex gap-2"><BadgeCheck size={16} className="mt-0.5 text-[#cfae71]" /> Clear candidate screening and verification</li>
            <li className="flex gap-2"><BadgeCheck size={16} className="mt-0.5 text-[#cfae71]" /> Branded employer pages and school profile visibility</li>
            <li className="flex gap-2"><BadgeCheck size={16} className="mt-0.5 text-[#cfae71]" /> Smooth interview, offer, and onboarding management</li>
          </ul>
        </div>
      </section>

      <section id="teachers" className="rounded-[28px] border border-[#e7dcc2] bg-[#fffdf9] p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#677b6d]">Teachers</p>
            <h2 className="mt-2 text-2xl font-semibold">Featured teacher profiles</h2>
          </div>
          <GraduationCap className="text-[#1d2430]" size={23} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {teachers.map((teacher) => (
            <article key={teacher.name} className="rounded-[24px] border border-[#eadfc5] bg-white p-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5efe8] text-sm font-semibold text-[#1d2430]">
                {teacher.name.split(' ').map((part) => part[0]).join('')}
              </div>
              <p className="text-xl font-semibold text-[#1d2430]">{teacher.name}</p>
              <p className="mt-1 text-sm text-[#586d62]">{teacher.label}</p>
              <p className="mt-4 text-sm leading-6 text-[#41524f]">{teacher.meta}</p>
              <button type="button" className="mt-5 rounded-full bg-[#1d2430] px-3 py-2 text-sm font-medium text-white">
                View profile
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  </div>
);

export default TsppClient;
