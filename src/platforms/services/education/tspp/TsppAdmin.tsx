import React, { useMemo, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, ChevronRight, Clock3, LayoutDashboard, MessageSquareText, ShieldCheck, Sparkles, Users } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'roles', label: 'School roles' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'onboarding', label: 'Onboarding' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const metrics = [
  { label: 'Live roles', value: '18', change: '+6 this week', tone: 'bg-[#1d2430]' },
  { label: 'Shortlisted', value: '94', change: '18 pending review', tone: 'bg-[#cfae71]' },
  { label: 'Offer rate', value: '76%', change: 'Above market norm', tone: 'bg-[#e7efe9]' },
  { label: 'Avg. response', value: '9 hrs', change: 'Across all schools', tone: 'bg-[#f5efe8]' },
];

const pipeline = [
  { title: 'Primary English teacher', status: 'New applicants', count: '23', accent: 'bg-[#1d2430]' },
  { title: 'Biology lead', status: 'Interviews booked', count: '9', accent: 'bg-[#cfae71]' },
  { title: 'School counselor', status: 'Reference check', count: '4', accent: 'bg-[#dfe7de]' },
];

const talent = [
  { name: 'Amina Okafor', focus: 'Primary Science', score: '96%', label: 'Fully verified', availability: 'Available this term' },
  { name: 'Kwame Lewis', focus: 'ICT & STEM', score: '94%', label: 'Curriculum aligned', availability: 'Open for contract' },
  { name: 'Nadia Yusuf', focus: 'Early years', score: '92%', label: 'Safeguarding cleared', availability: 'Shortlist ready' },
];

const tasks = [
  'Refresh school profile and values statement',
  'Approve verified teacher shortlist',
  'Confirm interview slots for 3 applicants',
  'Publish updated role briefing pack',
];

const TsppAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const content = useMemo(() => {
    if (activeTab === 'roles') {
      return {
        headline: 'Role pipeline',
        description: 'Prioritize hiring needs, streamline school briefs, and keep every vacancy moving toward a final decision.',
      };
    }
    if (activeTab === 'teachers') {
      return {
        headline: 'Teacher marketplace',
        description: 'Review verified candidates, compare subject fit, and coordinate interview flow from one dashboard.',
      };
    }
    if (activeTab === 'onboarding') {
      return {
        headline: 'Onboarding workspace',
        description: 'Track references, safeguarding checks, offer approval, and final school onboarding steps.',
      };
    }
    return {
      headline: 'Premium hiring overview',
      description: 'Your private school hiring workspace is active. Use the workspace to review school roles, compare teachers, and close top-quality hires faster.',
    };
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#f5efe8] text-[#1d2430]">
      <header className="mx-auto max-w-7xl px-5 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[28px] border border-[#d7c9b4] bg-[#fffdf9]/90 p-4 shadow-[0_18px_55px_rgba(29,36,48,0.06)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1d2430] text-lg font-semibold text-[#f9f5ef]">T</div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#5b6b5f]">Teachers & Private Schools</p>
              <p className="text-xl font-semibold">TSPP</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm text-[#42504d]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-2 transition ${activeTab === tab.id ? 'bg-[#1d2430] text-white' : 'bg-[#f5efe8] hover:bg-[#ebe3d6]'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full border border-[#d7c9b4] bg-white px-4 py-2 text-sm font-medium text-[#1d2430]">
              Invite school
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#1d2430] px-4 py-2 text-sm font-medium text-white">
              Launch hiring <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-5 pb-12 pt-2 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-[1.7fr_1fr]">
          <div className="rounded-[28px] border border-[#e1d4bb] bg-[#fffdf9] p-6 shadow-[0_18px_50px_rgba(29,36,48,0.04)]">
            <div className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6d7c6b]">
              <Sparkles size={14} />
              Platform dashboard
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-[#1d2430] md:text-5xl">{content.headline}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4f5a55]">{content.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#1d2430] px-4 py-2.5 text-sm font-medium text-white">
                Review shortlist <ChevronRight size={16} />
              </button>
              <button type="button" className="rounded-full border border-[#d9cab1] bg-[#f5efe8] px-4 py-2.5 text-sm font-medium text-[#1d2430]">
                Manage school profile
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e4d9c3] bg-[#1d2430] p-5 text-white shadow-[0_20px_60px_rgba(29,36,48,0.2)]">
            <div className="mb-4 flex items-center justify-between text-sm text-[#d9e3d3]">
              <span>School health</span>
              <span className="rounded-full bg-white/10 px-2 py-1">Live</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-semibold">89%</p>
                <p className="mt-1 text-sm text-[#d0d8d3]">Hiring momentum across six active vacancies</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[89%] rounded-full bg-[#cfae71]" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-sm text-[#ebf0ea]">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[#d2c4a6]">Top fit</p>
                  <p className="mt-2 font-semibold">96%</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[#d2c4a6]">Offers</p>
                  <p className="mt-2 font-semibold">11</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[24px] border border-[#e7dcc2] bg-white p-4 shadow-sm">
              <div className={`mb-4 inline-flex rounded-full px-3 py-1.5 text-xs font-medium text-[#1d2430] ${metric.tone}`}>
                {metric.label}
              </div>
              <p className="text-3xl font-semibold text-[#1d2430]">{metric.value}</p>
              <p className="mt-2 text-sm text-[#5c685d]">{metric.change}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-[28px] border border-[#e7dcc2] bg-[#fffdf9] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#687c6f]">Hiring pipeline</p>
                <h2 className="mt-2 text-2xl font-semibold">School roles and status</h2>
              </div>
              <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#f5efe8] px-3 py-2 text-sm text-[#1d2430]">
                <LayoutDashboard size={15} /> Dashboard
              </button>
            </div>

            <div className="space-y-3">
              {pipeline.map((entry) => (
                <div key={entry.title} className="flex items-center justify-between rounded-2xl border border-[#ebdfc9] bg-[#fbf8f3] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white ${entry.accent}`}>
                      {entry.title[0]}
                    </span>
                    <div>
                      <p className="font-medium text-[#1d2430]">{entry.title}</p>
                      <p className="text-sm text-[#5b675d]">{entry.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#1d2430]">{entry.count}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#6f7d72]">applicants</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e7dcc2] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#65756b]">
              <Briefcase size={14} />
              Actions
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task} className="flex items-start gap-3 rounded-2xl bg-[#f7f3ed] p-3 text-[#24302e]">
                  <CheckCircle2 size={18} className="mt-0.5 text-[#1a6f5c]" />
                  <p className="text-sm leading-6">{task}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-[#e7dcc2] bg-[#fffdf9] p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#6d7d70]">Teachers</p>
                <h2 className="mt-2 text-2xl font-semibold">Verified candidates</h2>
              </div>
              <button type="button" className="rounded-full bg-[#f5efe8] px-3 py-2 text-sm text-[#1d2430]">
                View all
              </button>
            </div>

            <div className="space-y-3">
              {talent.map((person) => (
                <div key={person.name} className="flex flex-col gap-3 rounded-2xl border border-[#ebdfc9] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d2430] text-sm font-semibold text-white">
                      {person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1d2430]">{person.name}</p>
                        <span className="rounded-full bg-[#e7efe9] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#1a6f5c]">{person.label}</span>
                      </div>
                      <p className="text-sm text-[#586a62]">{person.focus}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-[#44514b]">
                    <div className="rounded-full bg-[#f7f3ed] px-3 py-1.5 font-medium text-[#1d2430]">Match {person.score}</div>
                    <div className="inline-flex items-center gap-2 text-[#4d5d58]">
                      <Clock3 size={15} />
                      {person.availability}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e7dcc2] bg-[#1d2430] p-5 text-white shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#d1d7d0]">
              <ShieldCheck size={14} />
              Trust layer
            </div>
            <h2 className="text-2xl font-semibold">School trust checks</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-sm text-[#dfeae2]">Safeguarding verification</p>
                <p className="mt-2 text-xl font-semibold">96% complete</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-sm text-[#dfeae2]">Reference compliance</p>
                <p className="mt-2 text-xl font-semibold">12 pending</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-sm text-[#dfeae2]">Interviews scheduled</p>
                <p className="mt-2 text-xl font-semibold">9 slots</p>
              </div>
            </div>
            <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#cfae71] px-4 py-2.5 text-sm font-medium text-[#1d2430]">
              Review compliance <MessageSquareText size={15} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TsppAdmin;
