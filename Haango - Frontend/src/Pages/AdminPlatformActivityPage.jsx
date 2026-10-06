import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, Clock3, Globe2, MapPin, RefreshCw, Users, UserRound } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const unwrap = (value) => value?.data ?? value ?? {};
const unwrapList = (value) => {
  const result = unwrap(value);
  return Array.isArray(result) ? result : [];
};
const sourceLabels = {
  DIRECT: 'Direct visit',
  GOOGLE_SEARCH: 'Google search',
  SOCIAL: 'Social media',
  WHATSAPP: 'WhatsApp',
  CUSTOM_SHARE: 'Haango share link',
  EXTERNAL_REFERRAL: 'External referral',
  OTHER: 'Other tagged source',
};
const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
};
const formatVisitTime = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '—';
const getActivityQuery = (period) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const params = new URLSearchParams({ timezone });
  if (period === 'today' || period === 'yesterday') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (period === 'yesterday') start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    params.set('start', start.toISOString());
    params.set('end', end.toISOString());
  } else {
    params.set('days', period);
  }
  return params.toString();
};

function TrafficBars({ trend }) {
  const width = 720;
  const height = 180;
  const left = 34;
  const right = 8;
  const top = 12;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(1, ...trend.map((item) => Number(item.visits || 0)));
  const interval = Math.max(1, Math.ceil(trend.length / 7));
  const slotWidth = trend.length ? plotWidth / trend.length : plotWidth;
  const barWidth = Math.max(1, Math.min(8, slotWidth * 0.3));

  return (
    <div className="mt-4 min-w-0 overflow-hidden">
      <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily page visits and unique visitors">
        {[0, 1, 2, 3].map((step) => {
          const y = top + plotHeight * step / 3;
          return <g key={step}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#e8edf6" strokeDasharray="3 5" /><text x={left - 8} y={y + 4} textAnchor="end" fill="#71809a" fontSize="10">{Math.round(maximum * (3 - step) / 3)}</text></g>;
        })}
        {trend.map((item, index) => {
          const visits = Number(item.visits || 0);
          const visitors = Number(item.uniqueUsers || 0);
          const x = left + slotWidth * index + (slotWidth - barWidth * 2 - 2) / 2;
          const visitsHeight = plotHeight * visits / maximum;
          const visitorsHeight = plotHeight * visitors / maximum;
          const label = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${item.date}T00:00:00Z`));
          return <g key={item.date}>
            <title>{`${label}: ${visits} visits, ${visitors} visitors`}</title>
            <rect x={x} y={top + plotHeight - visitsHeight} width={barWidth} height={visitsHeight} rx="1" fill="#ff681f" />
            <rect x={x + barWidth + 2} y={top + plotHeight - visitorsHeight} width={barWidth} height={visitorsHeight} rx="1" fill="#2563eb" />
            {(index % interval === 0 || index === trend.length - 1) && <text x={left + slotWidth * index + slotWidth / 2} y={height - 7} textAnchor="middle" fill="#71809a" fontSize="9">{label}</text>}
          </g>;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-5 text-xs font-medium text-ink-600">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-[#ff681f]" />Page visits</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-blue-600" />Unique visitors</span>
      </div>
    </div>
  );
}

export default function AdminPlatformActivityPage({ onNavigate }) {
  const [period, setPeriod] = useState('30');
  const [activity, setActivity] = useState({ summary: {}, sources: [], pages: [], recentVisits: [] });
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      const query = getActivityQuery(period);
      setLoading(true);
      setError('');
      try {
        const [activityResponse, trendResponse] = await Promise.all([
          apiRequest(`/analytics/platform-activity?${query}`),
          apiRequest(`/analytics/traffic-trend?${query}`),
        ]);
        if (!active) return;
        setActivity(unwrap(activityResponse));
        setTrend(unwrapList(trendResponse));
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load platform activity.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadActivity();
    return () => { active = false; };
  }, [period]);

  const summary = activity.summary || {};
  const metrics = [
    { label: 'Page visits', value: summary.totalVisits, Icon: Activity, tone: 'orange' },
    { label: 'Unique visitors', value: summary.uniqueVisitors, Icon: Users, tone: 'blue' },
    { label: 'Guest visitors', value: summary.guestVisitors, Icon: Globe2, tone: 'green' },
    { label: 'Signed-in visitors', value: summary.signedInVisitors, Icon: UserRound, tone: 'violet' },
  ];

  return (
    <AdminLayout activePage="platform-activity" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-500">Traffic, acquisition sources, and visit activity</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">Platform activity</h1>
            </div>
            <button type="button" onClick={() => onNavigate('/admin')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-4 py-2.5 text-xs font-bold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Admin dashboard</button>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-[#e9eef7] p-1" aria-label="Activity date range">
              {[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
              ].map(({ value, label }) => <button key={value} type="button" onClick={() => setPeriod(value)} aria-pressed={period === value} className={`rounded-full px-4 py-2 text-xs font-bold transition ${period === value ? 'bg-white text-blue-700 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}>{label}</button>)}
            </div>
            <p className="text-xs text-ink-500">Visitor counts are based on anonymous browser identifiers.</p>
          </div>

          {error && <p className="mb-5 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
          {loading ? <p className="py-12 text-center text-sm text-ink-500">Loading platform activity…</p> : <>
            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {metrics.map(({ label, value, Icon, tone }) => {
                const colors = {
                  orange: 'bg-orange-100 text-[#e95718]',
                  blue: 'bg-blue-100 text-blue-700',
                  green: 'bg-emerald-100 text-emerald-700',
                  violet: 'bg-violet-100 text-violet-700',
                };
                return <section key={label} className="min-h-32 rounded-xl border border-[#e8edf6] bg-white p-4 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                  <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${colors[tone]}`}><Icon size={18} /></span>
                  <p className="font-display text-2xl font-extrabold text-ink-900">{formatNumber(value)}</p>
                  <p className="mt-1 text-xs font-medium text-ink-500">{label}</p>
                </section>;
              })}
            </div>

            <div className="mb-5 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
              <section className="min-w-0 rounded-xl border border-[#e8edf6] bg-white p-5 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-display text-lg font-bold text-ink-900">Traffic trend</h2><p className="mt-1 text-xs text-ink-500">Daily page views and unique visitors</p></div>
                  <div className="text-right"><p className="font-display text-xl font-extrabold text-ink-900">{formatDuration(summary.avgTimeSpent)}</p><p className="text-[11px] text-ink-500">Average visit</p></div>
                </div>
                {trend.length ? <TrafficBars trend={trend} /> : <p className="py-12 text-center text-sm text-ink-500">No traffic recorded in this period.</p>}
              </section>

              <section className="min-w-0 rounded-xl border border-[#e8edf6] bg-white p-5 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Globe2 size={18} /></span><div><h2 className="font-display text-lg font-bold text-ink-900">Acquisition sources</h2><p className="text-xs text-ink-500">Source and visitor type</p></div></div>
                {activity.sources?.length ? <div className="divide-y divide-[#edf1f7]">
                  {activity.sources.map((source) => <div key={source.source} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-ink-800">{sourceLabels[source.source] || source.source}</p><p className="mt-0.5 truncate text-[11px] text-ink-500">{source.source === 'DIRECT' ? 'No referring source' : source.source}</p></div><strong className="shrink-0 text-sm text-ink-900">{formatNumber(source.visits)} visits</strong></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf1f7]"><div className="h-full rounded-full bg-[#ff681f]" style={{ width: `${Math.min(100, source.visits / Math.max(1, summary.totalVisits) * 100)}%` }} /></div>
                    <p className="mt-1.5 text-[11px] text-ink-500">{formatNumber(source.uniqueVisitors)} visitors · {formatNumber(source.guestVisitors)} guests · {formatNumber(source.signedInVisitors)} signed in</p>
                  </div>)}
                </div> : <p className="py-10 text-center text-sm text-ink-500">No acquisition data recorded.</p>}
              </section>
            </div>

            <div className="mb-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <section className="min-w-0 rounded-xl border border-[#e8edf6] bg-white p-5 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink-900">Popular pages</h2><p className="mt-1 text-xs text-ink-500">Most visited paths in this period</p></div><ArrowRight size={17} className="text-blue-600" /></div>
                {activity.pages?.length ? <div className="divide-y divide-[#edf1f7]">
                  {activity.pages.map((page) => <div key={page.page} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><p className="min-w-0 truncate text-sm font-medium text-ink-700">{page.page}</p><div className="shrink-0 text-right"><p className="text-sm font-bold text-ink-900">{formatNumber(page.visits)}</p><p className="text-[10px] text-ink-500">{formatNumber(page.uniqueVisitors)} visitors</p></div></div>)}
                </div> : <p className="py-10 text-center text-sm text-ink-500">No popular pages recorded.</p>}
              </section>

              <section className="min-w-0 overflow-hidden rounded-xl border border-[#e8edf6] bg-white shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                <div className="border-b border-[#edf1f7] px-5 py-4"><h2 className="font-display text-lg font-bold text-ink-900">Recent visits</h2><p className="mt-1 text-xs text-ink-500">Latest 100 page visits · location estimated from IP</p></div>
                <div className="max-h-136 overflow-auto">
                  <table className="w-full min-w-190 border-collapse text-left">
                    <thead className="sticky top-0 bg-[#f6f8fc] text-[11px] font-semibold text-ink-500"><tr><th className="px-4 py-3">Source</th><th className="px-3 py-3">Visitor</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Landing page</th><th className="px-3 py-3">Visited</th><th className="px-3 py-3">Time</th></tr></thead>
                    <tbody className="divide-y divide-[#edf1f7]">
                      {activity.recentVisits?.length ? activity.recentVisits.map((visit) => <tr key={visit.id} className="hover:bg-[#fbfcff]">
                        <td className="max-w-44 px-4 py-3"><p className="text-xs font-semibold text-ink-800">{sourceLabels[visit.source] || visit.source}</p><p className="mt-0.5 truncate text-[10px] text-ink-500">{visit.sourceDetail || '—'}</p></td>
                        <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${visit.visitorType === 'SIGNED_IN' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{visit.visitorType === 'SIGNED_IN' ? 'Signed in' : 'Guest'}</span></td>
                        <td className="min-w-36 px-3 py-3 text-xs text-ink-600"><span className="inline-flex items-center gap-1.5"><MapPin size={12} className="shrink-0 text-ink-400" />{visit.location || 'Unknown'}</span></td>
                        <td className="max-w-52 truncate px-3 py-3 text-xs text-ink-700">{visit.page}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500">{formatVisitTime(visit.timestamp)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-600"><span className="inline-flex items-center gap-1"><Clock3 size={12} />{formatDuration(visit.timeSpent)}</span></td>
                      </tr>) : <tr><td colSpan="6" className="px-4 py-12 text-center text-sm text-ink-500">No page visits recorded in this period.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <p className="inline-flex items-center gap-2 text-[11px] text-ink-400"><RefreshCw size={12} /> Activity is based on browser visit records and may include repeat page views. IP locations can be approximate or unavailable.</p>
          </>}
        </div>
      </main>
    </AdminLayout>
  );
}