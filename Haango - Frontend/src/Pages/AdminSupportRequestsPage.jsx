import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Headset, MessageSquareText, Search, Send, TicketCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const PAGE_SIZE = 10;
const REPLY_TEMPLATES = [
  { label: 'Investigating', text: 'Thanks for reaching out. We are looking into this and will update you shortly.' },
  { label: 'More details', text: 'We appreciate you bringing this to our attention. Could you share a little more detail so we can help?' },
  { label: 'Resolved', text: 'This has been taken care of. Please let us know if you need anything else.' },
];

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
  : 'Date unavailable';

const statusStyles = {
  PENDING: 'bg-orange-50 text-[#bd4a12]',
  IN_REVIEW: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
};

export default function AdminSupportRequestsPage({ onNavigate }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ totalTickets: 0, inReviewTickets: 0, resolvedTickets: 0, raisedTodayTickets: 0 });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [replies, setReplies] = useState({});
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (filter === 'inReview') params.set('status', 'IN_REVIEW');
      if (filter === 'resolved') params.set('status', 'RESOLVED');
      if (filter === 'today') params.set('raisedToday', 'true');
      if (appliedSearch) params.set('search', appliedSearch);

      try {
        const [ticketsResult, statsResult] = await Promise.allSettled([
          apiRequest(`/support-requests/admin/all?${params.toString()}`, { includeMetadata: true }),
          apiRequest('/support-requests/admin/stats'),
        ]);
        if (!active) return;
        if (ticketsResult.status === 'rejected') throw ticketsResult.reason;
        setTickets(Array.isArray(ticketsResult.value.data) ? ticketsResult.value.data : []);
        setPagination(ticketsResult.value.pagination || null);
        if (statsResult.status === 'fulfilled') setStats(statsResult.value || {});
        else setError(statsResult.reason.message || 'Tickets loaded, but summary counts are unavailable.');
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load support tickets.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [page, filter, appliedSearch, refreshKey]);

  const selectFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const updateTicket = async (ticket, status) => {
    setBusyId(ticket._id);
    setError('');
    try {
      await apiRequest(`/support-requests/admin/${ticket._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminReply: replies[ticket._id] ?? ticket.adminReply ?? '' }),
      });
      setReplies((current) => {
        const next = { ...current };
        delete next[ticket._id];
        return next;
      });
      setRefreshKey((value) => value + 1);
    } catch (updateError) {
      setError(updateError.message || 'Unable to update this support ticket.');
    } finally {
      setBusyId('');
    }
  };

  const summaryBlocks = [
    { key: 'all', label: 'Total support tickets', value: stats.totalTickets, Icon: TicketCheck, tone: 'text-blue-700 bg-blue-50' },
    { key: 'inReview', label: 'Tickets in review', value: stats.inReviewTickets, Icon: Clock3, tone: 'text-orange-700 bg-orange-50' },
    { key: 'resolved', label: 'Resolved tickets', value: stats.resolvedTickets, Icon: Check, tone: 'text-emerald-700 bg-emerald-50' },
    { key: 'today', label: 'Tickets raised today', value: stats.raisedTodayTickets, Icon: CalendarDays, tone: 'text-[#b34a20] bg-[#fff1e9]' },
  ];

  return (
    <AdminLayout activePage="support" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#e8edf6] bg-white/95 backdrop-blur">
          <div className="flex min-h-18 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:px-8">
            <div className="flex items-center gap-2 text-sm text-ink-500"><span className="font-semibold text-ink-900">Admin</span><ChevronRight size={15} /><span>Support tickets</span></div>
            <button onClick={() => onNavigate('/admin')} className="inline-flex items-center gap-2 rounded-full border border-[#e8edf6] px-4 py-2.5 text-xs font-semibold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Back to dashboard</button>
          </div>
        </header>

        <div className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-[#ff681f]">Haango care</p><h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900">Support tickets</h1><p className="mt-1 text-sm text-ink-500">Review and respond to user requests.</p></div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1e9] text-[#ff681f]"><Headset size={21} /></div>
          </div>

          {error && <p role="alert" className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Support ticket summary">
            {summaryBlocks.map(({ key, label, value, Icon, tone }) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => selectFilter(key)} className={`min-h-28 rounded-xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${filter === key ? 'border-blue-500 ring-2 ring-blue-100' : 'border-[#e8edf6]'}`}>
                <span className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon size={18} /></span>
                <span className="block font-display text-2xl font-extrabold text-ink-900">{value ?? 0}</span>
                <span className="mt-1 block text-sm font-medium text-ink-500">{label}</span>
              </button>
            ))}
          </section>

          <section className="overflow-hidden rounded-xl border border-[#e8edf6] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f7] p-4 sm:px-5">
              <div><h2 className="font-display text-lg font-bold text-ink-900">Requests</h2><p className="text-xs text-ink-500">{pagination?.total ?? 0} matching tickets</p></div>
              <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#dce4f0] px-3 text-ink-500 sm:w-80">
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or message" className="min-w-0 flex-1 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400" />
              </label>
            </div>

            <div aria-live="polite" aria-busy={loading}>
              {loading ? <p className="p-8 text-center text-sm text-ink-500">Loading support tickets...</p> : tickets.length ? (
                <div className="divide-y divide-[#edf1f7]">
                  {tickets.map((ticket) => {
                    const reply = replies[ticket._id] ?? ticket.adminReply ?? '';
                    const isBusy = busyId === ticket._id;
                    return (
                      <article key={ticket._id} className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink-900">{ticket.fullName}</h3><span className="rounded-full bg-[#f1f4f9] px-2.5 py-1 text-[11px] font-bold text-ink-600">{ticket.userType}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[ticket.status] || 'bg-ink-100 text-ink-700'}`}>{ticket.status?.replace('_', ' ')}</span></div>
                            <p className="mt-1 text-xs text-ink-500">{ticket.createdBy?.name || 'User'} · {ticket.createdBy?.email || 'No email'} · {formatDate(ticket.createdAt)}</p>
                          </div>
                          <MessageSquareText size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
                        </div>

                        <p className="mt-4 whitespace-pre-line rounded-lg bg-[#f7f9fc] p-3 text-sm leading-relaxed text-ink-700">{ticket.problemDescription}</p>
                        <form className="mt-4" onSubmit={(event) => { event.preventDefault(); updateTicket(ticket, ticket.status === 'PENDING' ? 'IN_REVIEW' : ticket.status); }}>
                          <label htmlFor={`reply-${ticket._id}`} className="mb-2 block text-xs font-bold text-ink-700">Admin reply</label>
                          <textarea id={`reply-${ticket._id}`} value={reply} onChange={(event) => setReplies((current) => ({ ...current, [ticket._id]: event.target.value }))} maxLength={4000} rows={3} placeholder="Write a reply to this user..." className="w-full resize-y rounded-lg border border-[#dce4f0] bg-white p-3 text-sm text-ink-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-xs font-semibold text-ink-500">Templates</span>
                            {REPLY_TEMPLATES.map((template) => <button key={template.label} type="button" onClick={() => setReplies((current) => ({ ...current, [ticket._id]: template.text }))} className="rounded-full border border-[#dce4f0] px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">{template.label}</button>)}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="submit" disabled={isBusy || !reply.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Send size={14} /> Send reply</button>
                            {ticket.status === 'PENDING' && <button type="button" disabled={isBusy} onClick={() => updateTicket(ticket, 'IN_REVIEW')} className="rounded-lg border border-[#dce4f0] px-3.5 py-2.5 text-xs font-bold text-ink-700 transition hover:bg-[#f7f9fc] disabled:opacity-50">Move to review</button>}
                            {ticket.status !== 'RESOLVED' && <button type="button" disabled={isBusy} onClick={() => updateTicket(ticket, 'RESOLVED')} className="rounded-lg bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">Resolve ticket</button>}
                            {isBusy && <span className="self-center text-xs text-ink-500">Saving...</span>}
                          </div>
                        </form>
                      </article>
                    );
                  })}
                </div>
              ) : <div className="px-5 py-14 text-center"><span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1e9] text-[#ff681f]"><Headset size={20} /></span><p className="font-semibold text-ink-800">No support tickets found</p><p className="mt-1 text-sm text-ink-500">Try another search or summary filter.</p></div>}
            </div>

            {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-[#edf1f7] px-4 py-3 sm:px-5"><p className="text-xs text-ink-500">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dce4f0] text-ink-600 hover:bg-[#f7f9fc] disabled:opacity-40"><ChevronLeft size={17} /></button><button type="button" aria-label="Next page" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dce4f0] text-ink-600 hover:bg-[#f7f9fc] disabled:opacity-40"><ChevronRight size={17} /></button></div></div>}
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}