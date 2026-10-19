import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Clock3, MapPin, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const PAGE_SIZE = 20;
const bookingStatuses = ['PAYMENT_PENDING', 'PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'REJECTED'];
const settledPaymentStatuses = new Set(['PAID', 'REFUND_PENDING', 'REFUNDED']);
const currency = (value = 0) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
};

const formatTimestamp = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

const prettifyStatus = (value) => String(value || 'UNKNOWN').replaceAll('_', ' ');

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-ink-900">{value || '—'}</dd>
    </div>
  );
}

function BookingCard({ booking }) {
  const payment = booking.payment || {};
  const walletUsed = payment.walletStatus === 'CAPTURED' ? Number(payment.walletAmount || 0) : 0;
  const onlinePaid = settledPaymentStatuses.has(payment.status) ? Number(payment.amount || 0) : 0;
  const totalPaid = walletUsed + onlinePaid;
  const buddyName = booking.buddyProfileId?.displayName || booking.buddyId?.name || 'Buddy';
  const activityName = booking.activityId?.name || booking.activitySlug || 'Service not specified';

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e8edf6] bg-white shadow-[0_8px_24px_rgba(36,72,130,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1f7] px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-ink-900">{booking.bookingId || 'Booking'}</p>
          <p className="mt-1 text-xs text-ink-500">Created {formatTimestamp(booking.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{prettifyStatus(booking.bookingStatus)}</span>
          <span className="rounded-full bg-[#f6f8fc] px-3 py-1.5 text-xs font-bold text-ink-600">Payment: {prettifyStatus(payment.status)}</span>
        </div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
        <section aria-label="Booking participants and schedule">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900"><Users size={17} className="text-blue-600" /> People and service</div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="Customer" value={booking.customerId?.name || 'Customer'} />
            <Detail label="Customer email" value={booking.customerId?.email} />
            <Detail label="Buddy" value={buddyName} />
            <Detail label="Service / reason" value={activityName} />
            <Detail label="Buddy email" value={booking.buddyId?.email} />
          </dl>
          <div className="mt-5 rounded-xl bg-[#f8faff] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink-900"><Calendar size={16} className="text-blue-600" /> Appointment</div>
            <p className="mt-2 text-sm font-semibold text-ink-900">{formatDate(booking.date)} · {booking.startTime || 'Time unavailable'}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500"><Clock3 size={14} /> {Number(booking.duration || 0)} hour{Number(booking.duration) === 1 ? '' : 's'}</p>
            {booking.meetingLocation && <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-600"><MapPin size={14} className="mt-0.5 shrink-0" />{booking.meetingLocation}</p>}
          </div>
          {booking.customerNotes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#f8faff] p-4 text-sm text-ink-600"><span className="font-semibold text-ink-900">Customer notes: </span>{booking.customerNotes}</p>}
        </section>

        <section aria-label="Booking pricing and payment">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900">Pricing and payment</div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label="Booking price" value={currency(booking.totalAmount)} />
            <Detail label="Buddy rate" value={currency(booking.buddyRate)} />
            <Detail label="Platform fee" value={currency(booking.platformFee)} />
            <Detail label="Coupon" value={booking.couponCode || 'None'} />
            <Detail label="Coupon discount" value={currency(booking.couponDiscount)} />
            <Detail label="Wallet balance used" value={`${currency(walletUsed)}${payment.walletStatus ? ` · ${prettifyStatus(payment.walletStatus)}` : ''}`} />
            <Detail label="Amount paid" value={currency(totalPaid)} />
            <Detail label="Online payment" value={`${currency(onlinePaid)} · ${payment.provider || '—'}`} />
            <Detail label="Payment date" value={formatTimestamp(payment.paidAt)} />
            <Detail label="Buddy payout" value={currency(booking.buddyPayoutAmount)} />
            <Detail label="Payout status" value={prettifyStatus(booking.payoutStatus)} />
            <Detail label="Platform share" value={currency(booking.platformShareAmount)} />
          </dl>
          {payment.failureReason && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700"><span className="font-semibold">Payment note: </span>{payment.failureReason}</p>}
        </section>
      </div>
    </article>
  );
}

export default function AdminBookingsPage({ onNavigate }) {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadBookings = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) params.set('status', status);
      try {
        const result = await apiRequest(`/bookings/admin/all?${params.toString()}`, { includeMetadata: true });
        if (!active) return;
        setBookings(Array.isArray(result.data) ? result.data : []);
        setPagination(result.pagination || null);
      } catch (loadError) {
        if (active) {
          setBookings([]);
          setPagination(null);
          setError(loadError.message || 'Unable to load bookings.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadBookings();
    return () => { active = false; };
  }, [page, status]);

  const changeStatus = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  return (
    <AdminLayout activePage="bookings" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[#e8edf6] bg-white/95 backdrop-blur">
          <div className="flex min-h-18 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:px-8">
            <div className="flex items-center gap-2 text-sm text-ink-500"><button type="button" onClick={() => onNavigate('/admin')} className="font-semibold text-ink-900 hover:text-blue-700">Admin</button><ChevronRight size={15} /><span>Bookings</span></div>
            <button type="button" onClick={() => onNavigate('/admin')} className="inline-flex items-center gap-2 rounded-full border border-[#e8edf6] px-4 py-2.5 text-xs font-semibold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Dashboard</button>
          </div>
        </header>
        <div className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-ink-500">Administration</p><h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Bookings</h1><p className="mt-2 text-sm text-ink-500">Booking details, participants, pricing, discounts and payment status.</p></div>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">Filter by status
              <select value={status} onChange={changeStatus} className="rounded-xl border border-[#dfe6f1] bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="">All bookings</option>
                {bookingStatuses.map((bookingStatus) => <option key={bookingStatus} value={bookingStatus}>{prettifyStatus(bookingStatus)}</option>)}
              </select>
            </label>
          </div>
          {error && <p role="alert" className="mb-5 rounded-xl bg-error-50 p-4 text-sm text-error-600">{error}</p>}
          {loading ? <p className="py-12 text-center text-sm text-ink-500">Loading bookings…</p> : bookings.length ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
                <p>{pagination?.total ?? bookings.length} booking{(pagination?.total ?? bookings.length) === 1 ? '' : 's'}{status ? ` · ${prettifyStatus(status)}` : ''}</p>
                <p>Page {pagination?.page ?? page} of {pagination?.totalPages ?? 1}</p>
              </div>
              <div className="space-y-4">{bookings.map((booking) => <BookingCard key={booking._id} booking={booking} />)}</div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6f1] bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><ArrowLeft size={16} /> Previous</button>
                <button type="button" onClick={() => setPage((current) => current + 1)} disabled={!pagination || page >= pagination.totalPages} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6f1] bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Next <ArrowRight size={16} /></button>
              </div>
            </>
          ) : !error ? <div className="rounded-2xl border border-dashed border-[#dfe6f1] bg-white px-5 py-16 text-center"><p className="font-semibold text-ink-900">No bookings found</p><p className="mt-1 text-sm text-ink-500">{status ? `There are no ${prettifyStatus(status).toLowerCase()} bookings.` : 'Booking records will appear here.'}</p></div> : null}
        </div>
      </main>
    </AdminLayout>
  );
}
