import { useEffect, useState } from 'react';
import { Activity, AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, Calendar, Check, ChevronRight, Headset, IndianRupee, Shield, Ticket, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const currency = (value = 0) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const unwrap = (value) => value?.data ?? value ?? {};
const unwrapList = (value) => {
  const result = unwrap(value);
  return Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
};
const unwrapArray = (value) => {
  const result = unwrap(value);
  return Array.isArray(result) ? result : [];
};
const unwrapDashboard = (value) => {
  const result = unwrap(value);
  return result?.stats ?? result;
};
function PlatformActivityChart({ trend }) {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(utcToday);
    date.setUTCDate(utcToday.getUTCDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    const item = trend.find((entry) => entry.date === key);
    return {
      key,
      label: new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date),
      visits: Number(item?.visits || 0),
      visitors: Number(item?.uniqueUsers || 0),
    };
  });
  const maxValue = Math.max(4, ...days.flatMap(({ visits, visitors }) => [visits, visitors]));
  const tickSize = Math.ceil(maxValue / 4);
  const chartMax = tickSize * 4;
  const width = 720;
  const height = 250;
  const left = 42;
  const right = 12;
  const top = 14;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const point = (value, index) => ({
    x: left + (plotWidth * index) / (days.length - 1),
    y: top + plotHeight - (value / chartMax) * plotHeight,
  });
  const pointsFor = (key) => days.map((day, index) => point(day[key], index));
  const visitsPoints = pointsFor('visits');
  const visitorsPoints = pointsFor('visitors');
  const toPolyline = (points) => points.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <div className="mt-5 min-w-0">
      <div className="overflow-hidden">
        <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Platform visits and unique visitors over the last seven days">
          {[0, 1, 2, 3, 4].map((step) => {
            const y = top + (plotHeight * step) / 4;
            return (
              <g key={step}>
                <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e8edf6" strokeDasharray="3 5" />
                <text x={left - 12} y={y + 4} textAnchor="end" fill="#71809a" fontSize="10">{chartMax - step * tickSize}</text>
              </g>
            );
          })}
          <polyline points={toPolyline(visitsPoints)} fill="none" stroke="#ff681f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={toPolyline(visitorsPoints)} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {visitsPoints.map(({ x, y }, index) => <circle key={`visit-${days[index].key}`} cx={x} cy={y} r="3.5" fill="#ff681f" />)}
          {visitorsPoints.map(({ x, y }, index) => <circle key={`visitor-${days[index].key}`} cx={x} cy={y} r="3.5" fill="#2563eb" />)}
          {days.map((day, index) => {
            const x = left + (plotWidth * index) / (days.length - 1);
            return <text key={day.key} x={x} y={height - 8} textAnchor="middle" fill="#71809a" fontSize="10">{day.label}</text>;
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-ink-600">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#ff681f]" />Page visits</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-600" />Unique visitors</span>
      </div>
    </div>
  );
}

export default function AdminPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [analytics, setAnalytics] = useState({ daily: null, trend: [], pages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboard, cancellationsData, daily, trend, pages] = await Promise.all([
        apiRequest('/admin/dashboard'),
        apiRequest('/admin/cancellation-requests'),
        apiRequest('/analytics/daily-traffic'),
        apiRequest('/analytics/traffic-trend?days=7'),
        apiRequest('/analytics/popular-pages?days=7'),
      ]);
      setStats(unwrapDashboard(dashboard));
      setCancellationRequests(unwrapList(cancellationsData));
      setAnalytics({ daily: unwrap(daily), trend: unwrapArray(trend), pages: unwrapArray(pages) });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboard, cancellationsData, daily, trend, pages] = await Promise.all([
          apiRequest('/admin/dashboard'),
          apiRequest('/admin/cancellation-requests'),
          apiRequest('/analytics/daily-traffic'),
          apiRequest('/analytics/traffic-trend?days=7'),
          apiRequest('/analytics/popular-pages?days=7'),
        ]);
        if (!active) return;
        setStats(unwrapDashboard(dashboard));
        setCancellationRequests(unwrapList(cancellationsData));
        setAnalytics({ daily: unwrap(daily), trend: unwrapArray(trend), pages: unwrapArray(pages) });
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load admin data.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  const reviewCancellation = async (request, status) => {
    try {
      await apiRequest(`/admin/cancellation-requests/${request._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes: status === 'APPROVED' ? 'Approved by admin' : '' }),
      });
      await loadData();
    } catch (reviewError) { setError(reviewError.message || 'Unable to review cancellation request.'); }
  };

  const metrics = [
    ['Users', stats?.totalUsers, Users],
    ['Admins', stats?.totalAdmins, Shield],
    ['Buddies', stats?.totalBuddies, BadgeCheck],
    ['Bookings', stats?.totalBookings, Calendar],
    ['Completed bookings', stats?.completedBookings, Check],
    ['Revenue', currency(stats?.totalRevenue), IndianRupee],
    ['Platform revenue', currency(stats?.platformRevenue), Shield],
    ['Haango earnings', currency(stats?.haangoEarnings), IndianRupee],
  ];

  return (
    <AdminLayout activePage="dashboard" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#e8edf6] bg-white/95 backdrop-blur">
          <div className="flex min-h-18 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:px-8">
            <div className="flex items-center gap-2 text-sm text-ink-500"><span className="font-semibold text-ink-900">Admin</span><ChevronRight size={15} /><span>Dashboard</span></div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => onNavigate('/admin/support-requests')} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"><Headset size={15} /> Support tickets</button>
              <button onClick={() => onNavigate('/admin/coupons')} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><Ticket size={15} /> Manage coupons</button>
              <button onClick={() => onNavigate('home')} className="inline-flex items-center gap-2 rounded-full border border-[#e8edf6] px-4 py-2.5 text-xs font-semibold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Back to Haango</button>
            </div>
          </div>
        </header>
        <div id="admin-dashboard" className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-ink-500">Welcome back,</p><h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Here’s what’s happening <span className="text-[#ff681f]">today</span></h1></div>
          <p className="rounded-full border border-[#e4ebf7] bg-white px-4 py-2 text-xs font-semibold text-ink-600">{new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</p>
        </div>
        {error && <p className="mb-6 rounded-2xl bg-error-50 p-4 text-sm text-error-600">{error}</p>}
        {loading ? <p className="text-ink-500">Loading live admin data...</p> : <>
          <div id="admin-metrics" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(([label, value, Icon], index) => <div key={label} className="relative isolate min-h-36 overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]"><span className={`absolute -bottom-10 -right-7 -z-10 h-28 w-28 rounded-full ${index === 4 ? 'bg-emerald-50' : index === 5 ? 'bg-violet-50' : index % 2 ? 'bg-orange-50' : 'bg-blue-50'}`} /><span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${index === 4 ? 'bg-emerald-100 text-emerald-600' : index === 5 ? 'bg-violet-100 text-violet-600' : index % 2 ? 'bg-orange-100 text-[#ff681f]' : 'bg-blue-100 text-blue-600'}`}><Icon size={20} /></span><p className="font-display text-2xl font-extrabold text-ink-900">{value ?? 0}</p><p className="mt-1 text-sm font-medium text-ink-500">{label}</p><ArrowRight size={17} className={`absolute bottom-5 right-5 ${index % 2 ? 'text-[#ff681f]' : 'text-blue-600'}`} /></div>)}</div>
          <div className="mb-6 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <section
                role="link"
                tabIndex={0}
                aria-label="Open full platform activity details"
                onClick={() => onNavigate('/admin/platform-activity')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onNavigate('/admin/platform-activity');
                  }
                }}
                className="min-w-0 cursor-pointer rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)] outline-none transition hover:border-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Activity size={18} /></span><h2 className="font-display text-lg font-bold text-ink-900">Platform Activity</h2></div><p className="mt-2 text-sm text-ink-500">Traffic and engagement over the last seven days.</p></div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition group-hover:bg-blue-50">View details <ArrowRight size={14} /></span>
                </div>
                <PlatformActivityChart trend={analytics.trend} />
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#edf1f7] pt-4 sm:gap-4">
                  <div><p className="font-display text-lg font-bold text-ink-900">{analytics.daily?.totalVisits || 0}</p><p className="text-[11px] text-ink-500 sm:text-xs">Visits today</p></div>
                  <div><p className="font-display text-lg font-bold text-ink-900">{analytics.daily?.uniqueUsers || 0}</p><p className="text-[11px] text-ink-500 sm:text-xs">Visitors today</p></div>
                  <div><p className="font-display text-lg font-bold text-ink-900">{Math.round(analytics.daily?.avgTimePerVisit || 0)}s</p><p className="text-[11px] text-ink-500 sm:text-xs">Avg. visit</p></div>
                </div>
                {analytics.pages.length > 0 && <div className="mt-4 border-t border-[#edf1f7] pt-3"><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Popular pages</h3><div className="flex flex-wrap gap-x-5 gap-y-2">{analytics.pages.slice(0, 3).map((item) => <p key={item.page} className="max-w-full truncate text-xs text-ink-600">{item.page} <span className="font-bold text-ink-900">· {item.visits}</span></p>)}</div></div>}
              </section>
              <section className="min-w-0 overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)] sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#ff681f]"><AlertCircle size={18} /></span><h2 className="font-display text-lg font-bold text-ink-900">Cancellation requests</h2></div><p className="mt-2 text-sm text-ink-500">Requests submitted after the call unlock window.</p></div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{cancellationRequests.filter((item) => item.status === 'PENDING').length} pending</span>
                </div>
                {cancellationRequests.length ? <div className="max-h-102.5 space-y-3 overflow-y-auto pr-1">{cancellationRequests.map((request) => <div key={request._id} className="rounded-xl bg-[#f6f8fc] p-3"><div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{request.reason} · {request.bookingId?.bookingId || 'Booking'}</p><p className="mt-1 text-xs text-ink-500">{request.requesterId?.name || 'User'} · {request.details || 'No additional details'} · {request.status}</p></div>{request.status === 'PENDING' && <div className="flex flex-wrap gap-2"><button onClick={() => reviewCancellation(request, 'APPROVED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Approve</button><button onClick={() => reviewCancellation(request, 'REJECTED')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">Reject</button><button onClick={() => reviewCancellation(request, 'CANCELLED')} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100">Cancel</button></div>}</div></div>)}</div> : <div className="flex min-h-56 flex-col items-center justify-center rounded-xl bg-[#f8faff] px-4 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-[#ff681f]"><Check size={22} /></span><p className="font-semibold text-ink-900">No cancellation requests</p><p className="mt-1 text-xs text-ink-500">New requests will appear here.</p></div>}
              </section>
          </div>
        </>}
      </div>
      </main>
    </AdminLayout>
  );
}
