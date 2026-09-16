import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, MessageCircle, XCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import haangoLogo from '../Assets/Icon/S_Blue.png';
import { useAuth } from '../lib/auth';
import ReviewEditor from '../Components/ReviewEditor';
import LiveLocationMap from '../Components/LiveLocationMap';
import HaangoDialog from '../Components/HaangoDialog';

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function BookingsPage({ onBack, onMessage }) {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying] = useState(null);
  const [currentTime] = useState(() => Date.now());
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [locations, setLocations] = useState({});
  const [locationMessage, setLocationMessage] = useState('');
  const [openLocationMap, setOpenLocationMap] = useState(null);
  const [meetingOtp, setMeetingOtp] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [cancellationRequested, setCancellationRequested] = useState(() => JSON.parse(localStorage.getItem('haango_cancellation_requests') || '{}'));
  const locationWatches = useRef({});
  useEffect(() => () => Object.values(locationWatches.current).forEach((watchId) => navigator.geolocation?.clearWatch(watchId)), []);

  const openReview = async (booking) => {
    try {
      setReviewError('');
      const existing = await apiRequest(`/reviews/mine/${booking.buddyId?._id || booking.buddyId}`);
      if (existing) setReviewError('You have already written a review for this profile. Try editing it.');
      setReviewBooking({ booking, review: existing || null });
    } catch (reviewLoadError) {
      setReviewError(reviewLoadError.message || 'Unable to load your review.');
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError('');
      setBookings(await apiRequest('/bookings/my-bookings'));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');
        const nextBookings = await apiRequest('/bookings/my-bookings');
        if (active) setBookings(nextBookings);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load bookings.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchBookings();
    return () => { active = false; };
  }, []);

  const groupedBookings = useMemo(() => {
    return {
      upcoming: bookings.filter((booking) => new Date(booking.date).getTime() >= currentTime && !['CANCELLED', 'REJECTED'].includes(booking.bookingStatus)),
      past: bookings.filter((booking) => new Date(booking.date).getTime() < currentTime || ['CANCELLED', 'REJECTED'].includes(booking.bookingStatus)),
    };
  }, [bookings, currentTime]);

  const cancelBooking = async (bookingId) => {
    const booking = bookings.find((item) => item._id === bookingId);
    if (!booking || cancellationRequested[bookingId]) return;
    const [h, m] = String(booking.startTime || '').split(':').map(Number);
    const start = new Date(booking.date); start.setHours(h || 0, m || 0, 0, 0);
    const locked = currentTime >= start.getTime() - 7200000;
    setDialog({
      title: locked ? 'Request booking cancellation' : 'Cancel this booking?',
      description: locked ? 'This booking is inside the cancellation lock window. Customer support will review your request.' : 'This action will cancel your booking and begin any eligible refund process.',
      confirmLabel: locked ? 'Send request' : 'Cancel booking',
      tone: locked ? 'coral' : 'danger',
      fields: locked ? [
        { name: 'reason', label: 'Reason', type: 'select', options: [
          { value: 'EMERGENCY', label: 'Emergency' },
          { value: 'SAFETY', label: 'Safety concern' },
          { value: 'SCHEDULE_CHANGE', label: 'Schedule change' },
          { value: 'BUDDY_UNAVAILABLE', label: 'Companion unavailable' },
          { value: 'OTHER', label: 'Other' },
        ] },
        { name: 'details', label: 'Details (required for Other)', type: 'textarea', placeholder: 'Tell customer support what happened.' },
      ] : [],
      onConfirm: async (values) => {
        setDialog(null);
        await performCancellation(booking, locked, values);
      },
    });
  };

  const performCancellation = async (booking, locked, values = {}) => {
    try {
      setCancelling(booking._id);
      if (locked) {
        if (!values.reason || (values.reason === 'OTHER' && !values.details?.trim())) {
          setError('Choose a cancellation reason and provide details for Other.');
          return;
        }
        await apiRequest(`/bookings/${booking._id}/cancellation-request`, { method: 'POST', body: JSON.stringify({ reason: values.reason, details: values.details || '' }) });
        setCancellationRequested((current) => {
          const next = { ...current, [booking._id]: true };
          localStorage.setItem('haango_cancellation_requests', JSON.stringify(next));
          return next;
        });
      } else if (booking.paymentStatus === 'PAID' && booking.razorpayPaymentId) {
        await apiRequest('/payments/refund', {
          method: 'POST',
          body: JSON.stringify({ bookingId: booking._id }),
        });
      } else {
        await apiRequest(`/bookings/${booking._id}/cancel`, { method: 'PATCH' });
      }
      await loadBookings();
    } catch (cancelError) {
      setError(cancelError.message || 'Unable to cancel booking.');
    } finally {
      setCancelling(null);
    }
  };

  const verifyMeeting = async (booking, phase) => {
    try {
      const response = await apiRequest(`/bookings/${booking._id}/meeting/otp`, { method: 'POST', body: JSON.stringify({ phase }) });
      setMeetingOtp({ bookingId: booking._id, phase, code: response.code, expiresAt: response.expiresAt });
    } catch (meetingError) { setError(meetingError.message || 'Unable to confirm meeting.'); }
  };

  const meetingStartTime = (booking) => {
    const [hours, minutes] = String(booking.startTime || '').split(':').map(Number);
    const date = new Date(booking.date);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date.getTime();
  };

  const locationUnlocked = (booking) => Date.now() >= meetingStartTime(booking) - 2 * 60 * 60 * 1000;

  const showLiveMap = (booking) => {
    if (!locationUnlocked(booking)) {
      setLocationMessage('Location sharing unlocks 2 hours before the meeting.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage('Location sharing is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        await apiRequest(`/bookings/${booking._id}/location`, { method: 'POST', body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }) });
        const next = await apiRequest(`/bookings/${booking._id}/locations`);
        setLocations((current) => ({ ...current, [booking._id]: next }));
        setOpenLocationMap(booking._id);
        if (locationWatches.current[booking._id]) navigator.geolocation.clearWatch(locationWatches.current[booking._id]);
        locationWatches.current[booking._id] = navigator.geolocation.watchPosition(async ({ coords: liveCoords }) => {
          await apiRequest(`/bookings/${booking._id}/location`, { method: 'POST', body: JSON.stringify({ latitude: liveCoords.latitude, longitude: liveCoords.longitude, accuracy: liveCoords.accuracy }) });
          const refreshed = await apiRequest(`/bookings/${booking._id}/locations`);
          setLocations((current) => ({ ...current, [booking._id]: refreshed }));
        }, () => setLocationMessage('Live location permission was removed.'), { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
      } catch (locationError) {
        setLocationMessage(locationError.message || 'Unable to load live locations.');
      }
    }, () => setLocationMessage('Please allow location access to view the live map.'), { enableHighAccuracy: true, timeout: 15000 });
  };

  const extendMeeting = async (booking) => {
    setDialog({
      title: 'Extend meeting',
      description: 'Choose the additional meeting duration you want to pay for.',
      confirmLabel: 'Continue to payment',
      fields: [{ name: 'hours', label: 'Extra hours', type: 'number', defaultValue: '1', min: 1, max: 8 }],
      onConfirm: async (values) => {
        setDialog(null);
        const hours = Number(values.hours);
        if (!Number.isInteger(hours) || hours < 1 || hours > 8) {
          setError('Choose between 1 and 8 extra hours.');
          return;
        }
        await startExtensionPayment(booking, hours);
      },
    });
  };

  const startExtensionPayment = async (booking, hours) => {
    try {
      const order = await apiRequest('/payments/extension/create-order', { method: 'POST', body: JSON.stringify({ bookingId: booking._id, hours }) });
      if (!(await loadRazorpayScript())) throw new Error('Unable to load payment checkout.');
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.id,
        name: 'Haango', description: `${hours} hour meeting extension`,
        handler: async (paymentResponse) => {
          await apiRequest('/payments/extension/verify', { method: 'POST', body: JSON.stringify({ bookingId: booking._id, ...paymentResponse }) });
          await loadBookings();
        },
      });
      checkout.open();
    } catch (extensionError) { setError(extensionError.message || 'Unable to extend meeting.'); }
  };

  const payBooking = async (booking) => {
    try {
      setPaying(booking._id);
      setError('');
      const order = await apiRequest('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking._id }),
      });
      if (!(await loadRazorpayScript())) throw new Error('Unable to load Razorpay checkout.');

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Haango - Don't Go Alone",
        image: new URL(haangoLogo, window.location.origin).href,
        description: `${booking.activityId?.name || booking.activitySlug} booking`,
        order_id: order.id,
        prefill: {
          name: profile?.full_name || profile?.name || '',
          email: profile?.email || '',
        },
        theme: { color: '#ff6b4a', backdrop_color: '#fffaf5' },
        handler: async (paymentResponse) => {
          try {
            await apiRequest('/payments/verify', {
              method: 'POST',
              body: JSON.stringify({ bookingId: booking._id, ...paymentResponse }),
            });
            await loadBookings();
          } catch (paymentError) {
            setError(paymentError.message || 'Payment verification failed.');
          } finally {
            setPaying(null);
          }
        },
        modal: { confirm_close: true, ondismiss: () => setPaying(null) },
      });
      checkout.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed. Please try again.');
        setPaying(null);
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to start payment.');
      setPaying(null);
    }
  };

  const renderBooking = (booking) => {
    const buddy = booking.buddyProfileId;
    const activity = booking.activityId;
    return (
      <div key={booking._id} className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <img
              src={buddy?.profileImages?.[0] || ''}
              alt={buddy?.displayName || 'Buddy'}
              className="h-14 w-14 rounded-2xl bg-coral-50 object-cover"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-coral-500">{activity?.name || booking.activitySlug}</p>
              <h3 className="mt-1 font-display text-lg font-bold text-ink-900">{buddy?.displayName || 'Buddy booking'}</h3>
            </div>
          </div>
          <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600">{booking.bookingStatus}</span>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-ink-600 sm:grid-cols-2">
          <span className="flex items-center gap-2"><Calendar size={16} /> {formatDate(booking.date)}</span>
          <span className="flex items-center gap-2"><Clock size={16} /> {booking.startTime} · {booking.duration} hrs</span>
          <span className="flex items-center gap-2"><MapPin size={16} /> {booking.meetingLocation}</span>
          <span className="font-semibold text-ink-900">₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')} · {booking.paymentStatus}</span>
        </div>
        {!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {booking.paymentStatus === 'PENDING' && (
              <button onClick={() => payBooking(booking)} disabled={paying === booking._id} className="btn-primary text-sm disabled:opacity-50">
                {paying === booking._id ? 'Opening payment...' : `Pay ₹${Number(booking.totalAmount || 0).toLocaleString('en-IN')}`}
              </button>
            )}
            <button onClick={() => cancelBooking(booking._id)} disabled={cancelling === booking._id || paying === booking._id || cancellationRequested[booking._id]} className="inline-flex items-center gap-2 text-sm font-semibold text-error-500 disabled:opacity-50">
              <XCircle size={16} /> {cancellationRequested[booking._id] ? 'Request sent to customer support' : cancelling === booking._id ? 'Cancelling...' : 'Cancel booking'}
            </button>
          </div>
        )}
        {booking.paymentStatus === 'PAID' && booking.bookingStatus === 'CONFIRMED' && (
          <button onClick={() => verifyMeeting(booking, 'START')} disabled={currentTime < meetingStartTime(booking) - 60 * 60 * 1000} className="mt-3 btn-primary text-sm disabled:opacity-50">
            {currentTime < meetingStartTime(booking) - 60 * 60 * 1000 ? 'Start confirmation unlocks 1 hour before' : 'Show start OTP to companion'}
          </button>
        )}
        {booking.bookingStatus === 'ONGOING' && (
          <div className="mt-3 flex flex-wrap gap-3"><button onClick={() => verifyMeeting(booking, 'END')} className="btn-primary text-sm">Show end OTP to companion</button><button onClick={() => extendMeeting(booking)} className="btn-ghost text-sm">Extend after original end</button></div>
        )}
        {booking.paymentStatus === 'PAID' && !['CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
          <button onClick={() => onMessage(booking._id)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-coral-600">
            <MessageCircle size={16} /> Message buddy
          </button>
        )}
        {booking.paymentStatus === 'PAID' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
          <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <button onClick={() => showLiveMap(booking)} className="btn-ghost text-sm">Show companion location</button>
            {openLocationMap === booking._id && <LiveLocationMap locations={locations[booking._id]} onClose={() => {
              if (locationWatches.current[booking._id]) {
                navigator.geolocation.clearWatch(locationWatches.current[booking._id]);
                delete locationWatches.current[booking._id];
              }
              setOpenLocationMap(null);
            }} onRefresh={async () => {
              const refreshed = await apiRequest(`/bookings/${booking._id}/locations`);
              setLocations((current) => ({ ...current, [booking._id]: refreshed }));
            }} />}
          </div>
        )}
        {booking.bookingStatus === 'COMPLETED' && booking.paymentStatus === 'PAID' && (
          <button onClick={() => openReview(booking)} className="mt-4 text-sm font-semibold text-coral-600">
            {reviewBooking?.booking._id === booking._id && reviewBooking.review ? 'Edit your review' : 'Write a review'}
          </button>
        )}
        {reviewBooking?.booking._id === booking._id && <ReviewEditor bookingId={booking._id} review={reviewBooking.review} onClose={() => setReviewBooking(null)} onSaved={() => setReviewBooking(null)} onDeleted={() => setReviewBooking(null)} />}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-ink-50 pb-20 pt-20 md:pt-24">
      <div className="container-max section-pad">
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={16} /> Back to dashboard</button>
        <h1 className="font-display text-3xl font-extrabold text-ink-900">Your bookings</h1>
        <p className="mt-2 text-ink-500">Review your upcoming plans and booking history.</p>
        {error && <p className="mt-5 rounded-2xl bg-error-50 p-4 text-sm text-error-600">{error}</p>}
        {reviewError && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">{reviewError}</p>}
        {locationMessage && <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm text-sky-700">{locationMessage}</p>}
        {meetingOtp && (
          <div className="mt-5 rounded-2xl border border-coral-200 bg-coral-50 p-5">
            <h2 className="font-display text-lg font-bold text-ink-900">{meetingOtp.phase === 'START' ? 'Meeting start code' : 'Meeting end code'}</h2>
            <p className="mt-1 text-sm text-ink-600">Tell this code to your companion. They will enter it from their bookings dashboard.</p>
            <p className="mt-4 text-3xl font-extrabold tracking-[0.35em] text-coral-600">{meetingOtp.code}</p>
            <p className="mt-2 text-xs text-ink-500">This code expires in 10 minutes.</p>
            <button onClick={() => setMeetingOtp(null)} className="mt-4 btn-ghost text-sm">Close</button>
          </div>
        )}
        {loading ? <p className="mt-8 text-ink-500">Loading bookings...</p> : (
          <div className="mt-8 space-y-10">
            <section><h2 className="mb-4 font-display text-xl font-bold text-ink-900">Upcoming</h2><div className="space-y-4">{groupedBookings.upcoming.length ? groupedBookings.upcoming.map(renderBooking) : <p className="text-sm text-ink-500">No upcoming bookings.</p>}</div></section>
            <section><h2 className="mb-4 font-display text-xl font-bold text-ink-900">Past and cancelled</h2><div className="space-y-4">{groupedBookings.past.length ? groupedBookings.past.map(renderBooking) : <p className="text-sm text-ink-500">No past bookings.</p>}</div></section>
          </div>
        )}
      </div>
      <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
    </div>
  );
}