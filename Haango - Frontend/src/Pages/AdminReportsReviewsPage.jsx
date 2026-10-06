import { useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, MessageSquareText, Star, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';
import HaangoDialog from '../Components/HaangoDialog';

export default function AdminReportsReviewsPage({ onNavigate, pageType }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState(null);
  const isReports = pageType === 'reports';

  useEffect(() => {
    let active = true;
    const loadItems = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await apiRequest(isReports ? '/admin/reports?limit=50' : '/admin/reviews?limit=50');
        if (active) setItems(Array.isArray(result) ? result : result?.data || []);
      } catch (loadError) {
        if (active) {
          setItems([]);
          setError(loadError.message || `Unable to load ${pageType}.`);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadItems();
    return () => { active = false; };
  }, [isReports, pageType, refreshKey]);

  const updateReport = async (report, status) => {
    try {
      await apiRequest(`/admin/reports/${report._id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setRefreshKey((value) => value + 1);
    } catch (updateError) {
      setError(updateError.message || 'Unable to update report.');
    }
  };

  const deleteReview = (review) => {
    setDialog({
      title: 'Delete this review?',
      description: 'The companion rating will be recalculated after deletion.',
      confirmLabel: 'Delete review',
      tone: 'danger',
      onConfirm: async () => {
        setDialog(null);
        try {
          await apiRequest(`/admin/reviews/${review._id}`, { method: 'DELETE' });
          setRefreshKey((value) => value + 1);
        } catch (deleteError) {
          setError(deleteError.message || 'Unable to delete review.');
        }
      },
    });
  };

  const pageTitle = isReports ? 'User reports' : 'Reviews';
  const pendingReports = items.filter((report) => !['RESOLVED', 'CLOSED'].includes(report.status)).length;
  const averageRating = items.length
    ? (items.reduce((total, review) => total + Number(review.rating || 0), 0) / items.length).toFixed(1)
    : '0.0';

  return (
    <AdminLayout activePage={pageType} onNavigate={onNavigate}>
      <main className="mx-auto w-full max-w-370 flex-1 px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-500">Moderation</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{pageTitle}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNavigate('/admin/reports')} className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${isReports ? 'border-blue-600 bg-blue-600 text-white' : 'border-[#e4ebf7] bg-white text-ink-600 hover:bg-blue-50'}`}><AlertCircle size={14} className="mr-1.5 inline" />Reports</button>
            <button onClick={() => onNavigate('/admin/reviews')} className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${!isReports ? 'border-blue-600 bg-blue-600 text-white' : 'border-[#e4ebf7] bg-white text-ink-600 hover:bg-blue-50'}`}><Star size={14} className="mr-1.5 inline" />Reviews</button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
          <article className="rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">{isReports ? <AlertCircle size={19} /> : <MessageSquareText size={19} />}</span><p className="font-display text-2xl font-extrabold text-ink-900">{items.length}</p><p className="mt-1 text-xs font-medium text-ink-500">{isReports ? 'Reports loaded' : 'Reviews loaded'}</p></article>
          {isReports ? <article className="rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-[#ff681f]"><BadgeCheck size={19} /></span><p className="font-display text-2xl font-extrabold text-ink-900">{pendingReports}</p><p className="mt-1 text-xs font-medium text-ink-500">Needs attention</p></article> : <article className="rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-[#ff681f]"><Star size={19} /></span><p className="font-display text-2xl font-extrabold text-ink-900">{averageRating}</p><p className="mt-1 text-xs font-medium text-ink-500">Average rating loaded</p></article>}
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
        <section className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(36,72,130,0.06)]" aria-label={pageTitle}>
          <div className="border-b border-[#edf1f7] px-5 py-4"><h2 className="font-display text-lg font-bold text-ink-900">{isReports ? 'Reported activity' : 'User reviews'}</h2></div>
          {loading ? <p className="px-5 py-12 text-center text-sm text-ink-500">Loading {pageTitle.toLowerCase()}...</p> : !items.length ? <p className="px-5 py-12 text-center text-sm text-ink-500">No {pageTitle.toLowerCase()} found.</p> : <div className="divide-y divide-[#edf1f7]">
            {isReports ? items.map((report) => <article key={report._id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink-900">{report.reason || 'Reported activity'}</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{report.status}</span></div><p className="mt-1 text-xs text-ink-500">{report.reporterId?.name || 'User'} reported {report.reportedUserId?.name || 'user'}</p>{report.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">{report.description}</p>}</div>
              <div className="flex shrink-0 gap-2"><button onClick={() => updateReport(report, 'REVIEWED')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Mark reviewed</button><button onClick={() => updateReport(report, 'RESOLVED')} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">Resolve</button></div>
            </article>) : items.map((review) => <article key={review._id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink-900">{review.buddyId?.name || 'Companion'}</h3><span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700"><Star size={12} fill="currentColor" />{review.rating}/5</span></div><p className="mt-1 text-xs text-ink-500">{review.customerId?.name || 'User'}</p><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">{review.comment || 'No comment'}</p></div>
              <button onClick={() => deleteReview(review)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50" aria-label="Delete review"><Trash2 size={16} /></button>
            </article>)}
          </div>}
        </section>
      </main>
      <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
    </AdminLayout>
  );
}