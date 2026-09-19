import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock3, Lock, MapPin, MessageCircle, ShieldCheck, X, XCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { getCurrentLocation } from '../lib/location';
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

function getIndiaCalendarDate(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
}

export default function BookingsPage({ onBack, onMessage }) {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [locations, setLocations] = useState({});
  const [locationMessage, setLocationMessage] = useState('');
  const [openLocationMap, setOpenLocationMap] = useState(null);
  const [meetingOtp, setMeetingOtp] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [cancellationRequested, setCancellationRequested] = useState(() => JSON.parse(localStorage.getItem('haango_cancellation_requests') || '{}'));
  const locationWatches = useRef({});
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
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
    const start = meetingStartTime(booking);
    const locked = currentTime >= start - 7200000 && currentTime < start;
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
    const timeValue = String(booking.startTime || '').trim().toUpperCase();
    const twelveHourMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(timeValue);
    const twentyFourHourMatch = /^(\d{1,2}):(\d{2})$/.exec(timeValue);
    const match = twelveHourMatch || twentyFourHourMatch;
    if (!match) return Number.NaN;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (twelveHourMatch) {
      if (hours === 12) hours = 0;
      if (match[3] === 'PM') hours += 12;
    }

    const date = getIndiaCalendarDate(booking.date);
    date.setUTCHours(hours, minutes, 0, 0);
    date.setTime(date.getTime() - 330 * 60 * 1000);
    return date.getTime();
  };

  const locationUnlocked = (booking) => booking.bookingStatus === 'ONGOING' || (currentTime >= meetingStartTime(booking) - 2 * 60 * 60 * 1000 && currentTime < meetingEndTime(booking));
  const meetingEndTime = (booking) => meetingStartTime(booking) + Number(booking.duration || 0) * 60 * 60 * 1000;
  const meetingHasStarted = (booking) => currentTime >= meetingStartTime(booking);
  const meetingHasEnded = (booking) => currentTime >= meetingEndTime(booking);
  const locationSharingEnded = (booking) => booking.bookingStatus === 'COMPLETED' || (booking.bookingStatus !== 'ONGOING' && meetingHasEnded(booking));

  useEffect(() => {
    bookings.forEach((booking) => {
      if (!locationSharingEnded(booking) || !locationWatches.current[booking._id]) return;
      navigator.geolocation?.clearWatch(locationWatches.current[booking._id]);
      delete locationWatches.current[booking._id];
    });
  }, [bookings, currentTime]);

  const showLiveMap = (booking) => {
    if (!locationUnlocked(booking) || locationSharingEnded(booking)) {
      setLocationMessage('Location sharing unlocks 2 hours before the meeting.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage('Location sharing is not supported by this browser.');
      return;
    }
    const handlePositionError = (positionError) => {
      const messages = {
        1: positionError.permissionState === 'denied'
          ? 'Location permission is blocked for this site. Allow location access, then try again.'
          : 'The site permission is allowed, but your browser or Windows location service did not return a location. Turn on device location services and try again.',
        2: 'Your device could not determine its location. Check that device location services are enabled, then try again.',
        3: 'Location lookup timed out. Check your connection and device location services, then try again.',
      };
      setLocationMessage(messages[positionError.code] || 'Unable to read your location. Check your browser and device location settings.');
    };
    getCurrentLocation().then(async ({ coords }) => {
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
    }).catch(handlePositionError);
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
    const startOtpLocked = currentTime < meetingStartTime(booking) - 60 * 60 * 1000;
    const locationLocked = !locationUnlocked(booking) || locationSharingEnded(booking);
    const locationWindowOpen = locationUnlocked(booking) && !locationSharingEnded(booking);
    const isConfirmed = booking.bookingStatus === 'CONFIRMED' || booking.paymentStatus === 'PAID';

    return (
      <div key={booking._id} className="rounded-[28px] border border-[#e6ddd4] bg-[#f7f5f2] p-3 shadow-[0_4px_18px_rgba(17,24,39,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl bg-[#efe6dc] ring-2 ring-white sm:h-18 sm:w-18">
              <img
                src={buddy?.profileImages?.[0] || ''}
                alt={buddy?.displayName || 'Buddy'}
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5a7a9e]">{activity?.name || booking.activitySlug || 'CITY TRAVEL'}</p>
              <h3 className="mt-1 font-display text-2xl font-black tracking-[-0.04em] text-ink-900 sm:text-[2.2rem]">
                {buddy?.displayName || 'Buddy booking'}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#1d9d68]">
                <CheckCircle2 size={16} className="fill-[#1d9d68] text-white" />
                <span>{isConfirmed ? 'Confirmed' : booking.bookingStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-start sm:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#bfe8d6] bg-[#eafaf1] px-3 py-2 text-sm font-semibold text-[#1d9d68]">
              <CheckCircle2 size={16} className="fill-[#1d9d68] text-white" />
              <span>Booking Confirmed</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[#e9e1d9] pt-4 text-sm text-ink-700 sm:grid-cols-3 sm:items-center">
          <div className="flex items-center gap-2"><Calendar size={16} className="text-ink-500" /> <span>{formatDate(booking.date)}</span></div>
          <div className="flex items-center gap-2"><Clock3 size={16} className="text-ink-500" /> <span>{booking.startTime} · {booking.duration} hrs</span></div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="flex items-center gap-2"><MapPin size={16} className="text-ink-500" /> <span>{booking.meetingLocation}</span></div>
            <span className="text-base font-bold text-ink-900">₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')} · <span className="text-[#1d9d68]">{booking.paymentStatus}</span></span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#cfe5f7] bg-[#eaf3fb] px-3 py-3 text-sm text-[#426d9a] sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9ebfb] text-[#3b6ea8]">
                <ShieldCheck size={16} />
              </div>
              <p className="font-medium">Your contact details will be hidden from the worker for your safety.</p>
            </div>
            <button type="button" className="hidden items-center gap-1 text-sm font-semibold text-[#3b6ea8] sm:inline-flex">
              Learn more <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {booking.bookingStatus === 'COMPLETED' ? (
          <div className="mt-4">
            <button disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#d9d4ce] px-4 py-3 text-base font-bold text-ink-600 sm:w-full">
              <CheckCircle2 size={18} /> Booking completed
            </button>
          </div>
        ) : !['CANCELLED', 'REJECTED', 'ONGOING'].includes(booking.bookingStatus) && !meetingHasStarted(booking) ? (
          <div className="mt-4">
            <button onClick={() => cancelBooking(booking._id)} disabled={cancelling === booking._id || paying === booking._id || cancellationRequested[booking._id]} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7c4d] px-4 py-3 text-base font-bold text-white shadow-[0_8px_20px_rgba(255,124,77,0.28)] transition hover:bg-[#f36f41] disabled:cursor-not-allowed disabled:opacity-60 sm:w-full">
              <XCircle size={18} /> {cancellationRequested[booking._id] ? 'Request sent to customer support' : cancelling === booking._id ? 'Cancelling...' : locationWindowOpen ? 'Request cancellation' : 'Cancel booking'}
            </button>
          </div>
        ) : null}

        {booking.paymentStatus === 'PAID' && !['CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-[20px] border border-[#eadfce] bg-[#f8f2ec] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5e2d2] text-[#d9864b]">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-ink-900">{locationSharingEnded(booking) ? 'Location locked' : 'Location unlocks'}</p>
                <p className="text-sm text-ink-600">{booking.bookingStatus === 'COMPLETED' ? 'Meeting successfully completed' : locationSharingEnded(booking) ? 'Meeting time ended' : locationLocked ? '2h before meeting' : 'Unlocked now'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-[20px] border border-[#dbe9f7] bg-[#edf6ff] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeeff] text-[#3a6fb5]">
                <Lock size={20} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-ink-900">Start OTP unlocks</p>
                <p className="text-sm text-ink-600">{startOtpLocked ? '1h before meeting' : 'Ready now'}</p>
              </div>
            </div>
          </div>
        )}

        {booking.paymentStatus === 'PAID' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={() => onMessage(booking._id)} className="inline-flex items-center justify-center gap-3 rounded-[18px] border border-[#d6d2cd] bg-white px-4 py-3 text-base font-semibold text-ink-800 transition hover:bg-ink-50">
              <MessageCircle size={18} /> Message buddy
            </button>
            <button
              onClick={() => locationWindowOpen && showLiveMap(booking)}
              disabled={locationLocked}
              className={`inline-flex items-center justify-center gap-3 rounded-[18px] border px-4 py-3 text-base font-semibold transition ${locationLocked ? 'cursor-not-allowed border-[#e5dfd7] bg-[#f3efe9] text-ink-400' : 'border-[#d6d2cd] bg-white text-ink-800 hover:bg-ink-50'}`}
            >
              <MapPin size={18} /> {locationSharingEnded(booking) ? 'Location locked' : 'Show companion location'}
            </button>
          </div>
        )}

        {booking.bookingStatus === 'ONGOING' && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button onClick={() => verifyMeeting(booking, 'END')} className="btn-primary text-sm">Show end OTP to companion</button>
            <button onClick={() => extendMeeting(booking)} className="btn-ghost text-sm">Extend after original end</button>
          </div>
        )}

        {booking.bookingStatus === 'COMPLETED' && booking.paymentStatus === 'PAID' && (
          <button onClick={() => openReview(booking)} className="mt-5 text-sm font-semibold text-coral-600">
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