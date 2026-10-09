import React, { useEffect, useState } from 'react';
import {
  Activity,
  Building2,
  GraduationCap,
  School,
  Search,
  Users,
  Wallet,
  BarChart3,
  PieChart,
  ExternalLink,
} from 'lucide-react';
import { smsAPI } from './smsApi';
import type { SmsPlatformOwnerAnalytics, SmsSubscriptionPlan } from './smsTypes';
import GlobalPreloader from '../../../../components/GlobalPreloader';
import SmsLayout from './SmsLayout';

const numberFormatter = new Intl.NumberFormat();
const moneyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const SmsPlatformOwnerDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<SmsPlatformOwnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState('');

  useEffect(() => {
    let active = true;

    smsAPI.dashboard.getPlatformOwnerAnalytics()
      .then((data) => {
        if (active) setAnalytics(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load platform analytics.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <GlobalPreloader message="Loading platform analytics…" />;

  const schools = (analytics?.schools || []).filter((school) => {
    const query = schoolSearch.trim().toLowerCase();
    return !query || [
      school.storeName,
      school.subdomain,
      school.ownerEmail,
      school.contactDetails?.city,
      school.contactDetails?.country,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const maxRevenue = Math.max(1, ...(analytics?.revenueTrend || []).map((item) => item.revenueUsd));
  const presentRate = analytics && analytics.attendanceRecordsToday > 0
    ? Math.round((analytics.studentsPresentToday / analytics.attendanceRecordsToday) * 100)
    : 0;

  const planLabels = {
    starter: 'Starter',
    growth: 'Growth',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  const planColors = {
    starter: 'bg-slate-400',
    growth: 'bg-blue-500',
    pro: 'bg-violet-500',
    enterprise: 'bg-amber-500',
  };

  const cards = [
    { label: 'SMS schools', value: analytics?.totalSchools ?? 0, icon: <School size={20} />, color: 'text-emerald-600' },
    { label: 'Students', value: analytics?.totalStudents ?? 0, icon: <Users size={20} />, color: 'text-sky-600' },
    { label: 'Teachers', value: analytics?.totalTeachers ?? 0, icon: <GraduationCap size={20} />, color: 'text-violet-600' },
    { label: 'Live schools', value: analytics?.liveSchools ?? 0, icon: <Building2 size={20} />, color: 'text-amber-600' },
  ];

  const planDistribution = analytics?.planDistribution || {};
  const totalSubscribers = Object.values(planDistribution).reduce((sum, v) => sum + v, 0);
  const planEntries = Object.entries(planDistribution).sort((a, b) => {
    const order = { starter: 0, growth: 1, pro: 2, enterprise: 3 };
    return (order[a[0] as keyof typeof order] ?? 99) - (order[b[0] as keyof typeof order] ?? 99);
  });

  return (
    <SmsLayout role="owner">
      <div className="mx-auto w-full max-w-[1520px] space-y-8">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute inset-0 opacity-5" />
          <div className="relative">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  SMS platform owner
                </p>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-5xl">
                  Platform overview
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100/75 sm:text-base">
                  Monitor every school using the platform, combined academic activity, and verified SMS license and subscription revenue.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 sm:self-auto sm:min-w-60">
                <div>
                  <p className="text-xs text-emerald-200/60">Paid licenses</p>
                  <p className="mt-1 text-xl font-bold">{numberFormatter.format(analytics?.paidLicenses ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-200/60">Attendance today</p>
                  <p className="mt-1 text-xl font-bold">{presentRate}% present</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {analytics && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="sms-card flex items-center gap-4 p-5">
                  <div className={`rounded-xl bg-opacity-15 p-2.5 ${card.color}`}>{card.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                      {numberFormatter.format(card.value)}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="sms-card p-5 sm:p-6 lg:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Revenue breakdown</h2>
                    <p className="mt-1 text-sm text-gray-500">License sales and school subscriptions, USD</p>
                  </div>
                  <div className="flex items-center gap-4 text-right text-sm">
                    <div>
                      <p className="text-xs text-gray-500">License revenue</p>
                      <p className="font-bold text-gray-900">{moneyFormatter.format(analytics.licenseRevenueUsd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Subscription MRR</p>
                      <p className="font-bold text-gray-900">{moneyFormatter.format(analytics.subscriptionRevenueUsd)}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex gap-6 overflow-x-auto">
                  {analytics.revenueTrend.map((item) => {
                    const date = new Date(`${item.month}T12:00:00`);
                    const barHeight = Math.max((item.revenueUsd / maxRevenue) * 140, item.revenueUsd > 0 ? 4 : 2);
                    return (
                      <div key={item.month} className="flex min-w-[44px] flex-col items-center gap-1">
                        <div className="flex h-44 w-full flex-col-reverse">
                          <div
                            className="mx-auto w-full max-w-8 rounded-t-sm bg-emerald-500 transition-opacity hover:bg-emerald-600"
                            style={{ height: `${barHeight}px` }}
                            title={`${moneyFormatter.format(item.revenueUsd)} · ${item.purchases} licenses`}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 sm:text-xs">
                          {Number.isNaN(date.getTime()) ? item.month : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>License revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Subscription MRR</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    Total platform revenue: {moneyFormatter.format(analytics.totalPlatformRevenue)}
                  </span>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:col-span-1">
                <div className="sms-card p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Active classes</p>
                    <Activity size={18} className="text-emerald-600" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                    {numberFormatter.format(analytics.totalClasses)}
                  </p>
                </div>
                <div className="sms-card p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Attendance today</p>
                    <Users size={18} className="text-sky-600" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {numberFormatter.format(analytics.attendanceRecordsToday)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {numberFormatter.format(analytics.studentsPresentToday)} marked present
                  </p>
                </div>
                <div className="sms-card p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Live schools</p>
                    <Building2 size={18} className="text-amber-600" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {analytics.totalSchools
                      ? `${Math.round((analytics.liveSchools / analytics.totalSchools) * 100)}%`
                      : '0%'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {numberFormatter.format(analytics.liveSchools)} of {numberFormatter.format(analytics.totalSchools)} schools
                  </p>
                </div>
              </div>
            </div>

            <section className="sms-card overflow-hidden rounded-xl">
              <div className="border-b border-gray-200 px-5 py-4 sm:px-6 sm:py-5 sm:flex sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">All schools</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {numberFormatter.format(analytics.schools.length)} schools on the platform
                  </p>
                </div>
                <label className="relative block w-full sm:max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={schoolSearch}
                    onChange={(event) => setSchoolSearch(event.target.value)}
                    placeholder="Search schools"
                    aria-label="Search schools"
                    className="sms-input pl-10"
                  />
                </label>
              </div>
              {schools.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/80">
                        <th className="px-5 py-2.5 text-left font-semibold text-gray-600">School</th>
                        <th className="px-5 py-2.5 text-left font-semibold text-gray-600">Owner account</th>
                        <th className="px-5 py-2.5 text-left font-semibold text-gray-600">Location</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-gray-600">Students</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-gray-600">Staff</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-gray-600">Classes</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-gray-600">Attendance</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-gray-600">Revenue</th>
                        <th className="px-5 py-2.5 text-left font-semibold text-gray-600">Plan</th>
                        <th className="px-5 py-2.5 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {schools.map((school) => (
                        <tr key={school.id} className="transition-colors hover:bg-gray-50/60">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-gray-900">{school.storeName}</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {school.subdomain}
                              {school.academicYear ? ` · ${school.academicYear}` : ''}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-600">{school.ownerEmail || 'Not provided'}</td>
                          <td className="px-5 py-3.5 text-sm text-gray-500">
                            {[school.contactDetails?.city, school.contactDetails?.country].filter(Boolean).join(', ') || 'Not provided'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-gray-900">{numberFormatter.format(school.totalStudents)}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-gray-900">{numberFormatter.format(school.totalTeachers)}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-gray-900">{numberFormatter.format(school.totalClasses)}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-gray-900">{numberFormatter.format(school.attendanceToday)}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-gray-900">{moneyFormatter.format(school.licenseRevenueUsd)}</td>
                          <td className="px-5 py-3.5 capitalize text-gray-900">
                            {school.plan || 'Starter'}
                            <span className="block text-xs capitalize text-gray-400">{school.subscriptionStatus || 'active'}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${school.isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              <i className={`h-1.5 w-1.5 rounded-full ${school.isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {school.isLive ? 'Live' : 'Setup'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center">
                  <School size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    {analytics.schools.length ? 'No schools match your search.' : 'No schools have activated the SMS platform yet.'}
                  </p>
                </div>
              )}
            </section>

            {totalSubscribers > 0 && (
              <section className="sms-card overflow-hidden rounded-xl p-5 sm:p-6">
                <h2 className="mb-1 text-lg font-semibold text-gray-900">Plan distribution</h2>
                <p className="mb-5 text-sm text-gray-500">How schools are distributed across subscription plans</p>
                <div className="space-y-3">
                  {planEntries.map(([planKey, count]) => {
                    const label = (planLabels as Record<string, string>)[planKey] || planKey;
                    const colorClass = (planColors as Record<string, string>)[planKey] || 'bg-gray-400';
                    const percentage = totalSubscribers > 0 ? Math.round((count / totalSubscribers) * 100) : 0;
                    return (
                      <div key={planKey} className="flex items-center gap-3 text-sm">
                        <span className="w-24 min-w-[96px] text-xs font-medium text-gray-600">{label}</span>
                        <div className="relative flex-1">
                          <div className="h-6 w-full rounded-full bg-gray-100">
                            <div
                              className={`h-6 rounded-full ${colorClass} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="mt-0.5 block text-xs text-gray-400">
                            {numberFormatter.format(count)} schools · {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </SmsLayout>
  );
};

export default SmsPlatformOwnerDashboard;
