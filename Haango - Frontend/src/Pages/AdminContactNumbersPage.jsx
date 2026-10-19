import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const pageSize = 20;

export default function AdminContactNumbersPage({ onNavigate }) {
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSubmissions = async (requestedPage = page) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/admin/contact-submissions?page=${requestedPage}&limit=${pageSize}`);
      setSubmissions(Array.isArray(result?.submissions) ? result.submissions : []);
      setTotal(Number(result?.total || 0));
      setPage(requestedPage);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load contact submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadInitialSubmissions = async () => {
      try {
        const result = await apiRequest(`/admin/contact-submissions?page=1&limit=${pageSize}`);
        if (!active) return;
        setSubmissions(Array.isArray(result?.submissions) ? result.submissions : []);
        setTotal(Number(result?.total || 0));
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load contact submissions.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInitialSubmissions();
    return () => { active = false; };
  }, []);

  return (
    <AdminLayout activePage="whatsapp" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-500">Contacts explicitly selected and submitted by visitors</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">Contact numbers</h1>
            </div>
            <button type="button" onClick={() => onNavigate('/admin/whatsapp')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-4 py-2.5 text-xs font-bold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> WhatsApp campaigns</button>
          </div>

          <section className="overflow-hidden rounded-xl border border-[#e8edf6] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f7] px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">Contact permission activity</h2>
                <p className="mt-1 text-xs text-ink-500">{total} event{total === 1 ? '' : 's'}</p>
              </div>
              <button type="button" onClick={() => loadSubmissions()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] px-3 py-2 text-xs font-bold text-ink-700 hover:bg-[#f7f9fd] disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</button>
            </div>

            {error && <p className="m-5 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
            {loading ? <p className="p-8 text-center text-sm text-ink-500">Loading contacts…</p> : submissions.length ? <div className="divide-y divide-[#edf1f7]">
              {submissions.map((submission) => <article key={submission.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {submission.status === 'DECLINED' ? <>
                      <p className="text-sm font-bold text-ink-800">Guest · Declined contact sharing</p>
                      <p className="mt-1 text-xs text-ink-500">Approximate location: {[submission.location?.city, submission.location?.region, submission.location?.country].filter(Boolean).join(', ') || 'Unavailable'}</p>
                    </> : <>
                      <p className="text-sm font-bold text-ink-800">{submission.userName || (submission.userEmail ? 'Signed-in user' : 'Guest visitor')} · Shared contacts</p>
                      <p className="mt-1 text-xs text-ink-500">{submission.userEmail || (submission.sessionId ? `Guest session ${submission.sessionId}` : 'Guest session')}</p>
                      {!submission.userEmail && <p className="mt-1 text-xs text-ink-500">Approximate location: {[submission.location?.city, submission.location?.region, submission.location?.country].filter(Boolean).join(', ') || 'Unavailable'}</p>}
                    </>}
                  </div>
                  <p className="text-xs text-ink-500">{submission.createdAt ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(submission.createdAt)) : '—'}</p>
                </div>
                {submission.status !== 'DECLINED' && <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(submission.contacts || []).map((contact, index) => <li key={`${submission.id}-${index}`} className="rounded-lg bg-[#f8faff] px-3 py-2 text-sm text-ink-700">{contact.name} · {contact.phone}</li>)}
                </ul>}
              </article>)}
            </div> : !error ? <p className="p-8 text-center text-sm text-ink-500">No contacts have been shared yet.</p> : null}

            {!loading && total > pageSize && <div className="flex items-center justify-between border-t border-[#edf1f7] px-5 py-3">
              <span className="text-xs text-ink-500">Page {page} of {Math.ceil(total / pageSize)}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => loadSubmissions(page - 1)} disabled={page <= 1} className="rounded-full border border-[#e4ebf7] px-3 py-1.5 text-xs font-bold text-ink-700 disabled:opacity-50">Previous</button>
                <button type="button" onClick={() => loadSubmissions(page + 1)} disabled={page >= Math.ceil(total / pageSize)} className="rounded-full border border-[#e4ebf7] px-3 py-1.5 text-xs font-bold text-ink-700 disabled:opacity-50">Next</button>
              </div>
            </div>}
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
