import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Clock3, Lock, MapPin, MessageCircle, ShieldCheck, Trash2, X, XCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { getCurrentLocation } from '../lib/location';
import ReviewEditor from '../Components/ReviewEditor';
import LiveLocationMap from '../Components/LiveLocationMap';
import HaangoDialog from '../Components/HaangoDialog';
import BookingListFilters from '../Components/BookingListFilters';
import { getBookingEndTime, getBookingList, getBookingStartTime, getIndiaDateKey, getIndiaDateOffset } from '../lib/bookingLists';

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function BookingsPage({ onBack, onMessage }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [upcomingFilter, setUpcomingFilter] = useState('newest');
  const [pastFilter, setPastFilter] = useState('newest');
  const [upcomingDate, setUpcomingDate] = useState('');
  const [pastDate, setPastDate] = useState('');
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [locations, setLocations] = useState({});
  const [locationMessage, setLocationMessage] = useState('');
  const [openLocationMap, setOpenLocationMap] = useState(null);
  const [meetingOtp, setMeetingOtp] = useState(null);
  const [startOtpLoading, setStartOtpLoading] = useState(null);
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

  useEffect(() => {
    const refreshBookingStatuses = async () => {
      try {
        const nextBookings = await apiRequest('/bookings/my-bookings');
        setBookings(nextBookings);
      } catch (_) {
        // Keep the current booking state when a background refresh is unavailable.
      }
    };
    const interval = window.setInterval(refreshBookingStatuses, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const groupedBookings = useMemo(() => {
    return {
      upcoming: getBookingList(bookings, { section: 'upcoming', filter: upcomingFilter, selectedDate: upcomingDate, now: currentTime }),
      past: getBookingList(bookings, { section: 'past', filter: pastFilter, selectedDate: pastDate, now: currentTime }),
    };
  }, [bookings, currentTime, upcomingFilter, upcomingDate, pastFilter, pastDate]);

  const cancelBooking = async (bookingId) => {
    const booking = bookings.find((item) => item._id === bookingId);
    if (!booking || cancellationRequested[bookingId]) return;
    const start = getBookingStartTime(booking);
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

  const clearPendingPaymentBooking = (booking) => {
    setDialog({
      title: 'Clear unpaid booking?',
      description: 'This removes the unpaid booking from your history. If your payment just succeeded, do not clear it; refresh your bookings first.',
      confirmLabel: 'Clear booking',
      tone: 'danger',
      onConfirm: async () => {
        setDialog(null);
        setCancelling(booking._id);
        try {
          await apiRequest(`/bookings/${booking._id}/payment-pending`, { method: 'DELETE' });
          setBookings((current) => current.filter((item) => item._id !== booking._id));
        } catch (clearError) {
          setError(clearError.message || 'Unable to clear this unpaid booking.');
        } finally {
          setCancelling(null);
        }
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
    if (phase === 'START') setStartOtpLoading(booking._id);
    try {
      const response = await apiRequest(`/bookings/${booking._id}/meeting/otp`, { method: 'POST', body: JSON.stringify({ phase }) });
      setMeetingOtp({ bookingId: booking._id, phase, code: response.code, expiresAt: response.expiresAt });
    } catch (meetingError) {
      setError(meetingError.message || 'Unable to confirm meeting.');
    } finally {
      if (phase === 'START') setStartOtpLoading(null);
    }
  };

  const locationUnlocked = (booking) => booking.bookingStatus === 'ONGOING' || (currentTime >= getBookingStartTime(booking) - 2 * 60 * 60 * 1000 && currentTime < getBookingEndTime(booking));
  const meetingHasStarted = (booking) => currentTime >= getBookingStartTime(booking);
  const meetingHasEnded = (booking) => currentTime >= getBookingEndTime(booking);
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

  const renderBooking = (booking) => {
    const buddy = booking.buddyProfileId;
    const activity = booking.activityId;
    if (booking.bookingStatus === 'PAYMENT_PENDING' && booking.payment?.status === 'PENDING') {
      return (
        <div key={booking._id} className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-amber-800">Payment pending</p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink-900">{buddy?.displayName || 'Buddy booking'}</h3>
              <p className="mt-1 text-sm text-ink-600">{activity?.name || booking.activitySlug} · {formatDate(booking.date)} · {booking.startTime} · {booking.duration} {booking.duration === 1 ? 'hour' : 'hours'}</p>
              <p className="mt-1 text-sm text-ink-600">The buddy won’t receive this request until payment succeeds.</p>
            </div>
            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
              <span className="font-display text-lg font-bold text-ink-900">₹{Number(booking.payment.amount || booking.totalAmount || 0).toLocaleString('en-IN')}</span>
              <button
                type="button"
                onClick={() => clearPendingPaymentBooking(booking)}
                disabled={cancelling === booking._id}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                {cancelling === booking._id ? 'Clearing...' : 'Clear booking'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const startOtpLocked = currentTime < getBookingStartTime(booking) - 60 * 60 * 1000;
    const locationLocked = !locationUnlocked(booking) || locationSharingEnded(booking);
    const locationWindowOpen = locationUnlocked(booking) && !locationSharingEnded(booking);
    const isConfirmed = booking.bookingStatus === 'CONFIRMED' || booking.bookingStatus === 'ONGOING';
    const totalAmount = Number(booking.totalAmount || 0);
    const paidAmount = Number(booking.payment?.amount ?? totalAmount);
    const hasDiscountedPayment = booking.payment?.status === 'PAID' && paidAmount < totalAmount;

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
              <span>{booking.bookingStatus === 'CANCELLED' ? 'Booking cancelled' : booking.bookingStatus === 'REJECTED' ? 'Booking rejected' : 'Booking Confirmed'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[#e9e1d9] pt-4 text-sm text-ink-700 sm:grid-cols-3 sm:items-center">
          <div className="flex items-center gap-2"><Calendar size={16} className="text-ink-500" /> <span>{formatDate(booking.date)}</span></div>
          <div className="flex items-center gap-2"><Clock3 size={16} className="text-ink-500" /> <span>{booking.startTime} · {booking.duration} hrs</span></div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="flex items-center gap-2"><MapPin size={16} className="text-ink-500" /> <span>{booking.meetingLocation}</span></div>
            <span className="flex flex-col items-end text-right text-base font-bold text-ink-900">
              {hasDiscountedPayment && <span className="text-sm font-medium text-ink-400 line-through">₹{totalAmount.toLocaleString('en-IN')}</span>}
              <span>{hasDiscountedPayment ? 'Paid ' : ''}₹{(hasDiscountedPayment ? paidAmount : totalAmount).toLocaleString('en-IN')}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#cfe5f7] bg-[#eaf3fb] px-3 py-3 text-sm text-[#426d9a] sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9ebfb] text-[#3b6ea8]">
                <ShieldCheck size={16} />
              </div>
              <p className="font-medium">Your contact details will be hidden from the worker for your safety.</p>
            </div>
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
            <button onClick={() => cancelBooking(booking._id)} disabled={cancelling === booking._id || cancellationRequested[booking._id]} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7c4d] px-4 py-3 text-base font-bold text-white shadow-[0_8px_20px_rgba(255,124,77,0.28)] transition hover:bg-[#f36f41] disabled:cursor-not-allowed disabled:opacity-60 sm:w-full">
              <XCircle size={18} /> {cancellationRequested[booking._id] ? 'Request sent to customer support' : cancelling === booking._id ? 'Cancelling...' : locationWindowOpen ? 'Request cancellation' : 'Cancel booking'}
            </button>
          </div>
        ) : null}

        {['CONFIRMED', 'ONGOING'].includes(booking.bookingStatus) && (
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

        {['CONFIRMED', 'ONGOING'].includes(booking.bookingStatus) && (
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

        {openLocationMap === booking._id && (
          <LiveLocationMap
            locations={locations[booking._id]}
            onClose={() => {
              if (locationWatches.current[booking._id]) {
                navigator.geolocation.clearWatch(locationWatches.current[booking._id]);
                delete locationWatches.current[booking._id];
              }
              setOpenLocationMap(null);
            }}
            onRefresh={async () => {
              const refreshed = await apiRequest(`/bookings/${booking._id}/locations`);
              setLocations((current) => ({ ...current, [booking._id]: refreshed }));
            }}
          />
        )}

        {booking.bookingStatus === 'CONFIRMED' && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => !startOtpLocked && verifyMeeting(booking, 'START')}
              disabled={startOtpLocked || startOtpLoading === booking._id}
              className="btn-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {startOtpLoading === booking._id ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Loading...
                </span>
              ) : startOtpLocked ? 'Start OTP unlocks 1 hour before meeting' : 'Show start OTP'}
            </button>
            {meetingOtp?.bookingId === booking._id && meetingOtp.phase === 'START' && (
              <div className="flex items-center gap-3 rounded-xl border border-coral-200 bg-coral-50 px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-coral-700">Start code</p>
                  <p className="font-mono text-lg font-extrabold tracking-[0.2em] text-coral-700">{meetingOtp.code}</p>
                </div>
                <button onClick={() => setMeetingOtp(null)} className="text-xs font-semibold text-coral-700 hover:text-coral-900">Close</button>
              </div>
            )}
          </div>
        )}

        {booking.bookingStatus === 'ONGOING' && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button onClick={() => verifyMeeting(booking, 'END')} className="btn-primary text-sm">Show end OTP to companion</button>
            {meetingOtp?.bookingId === booking._id && meetingOtp.phase === 'END' && (
              <div className="flex items-center gap-3 rounded-xl border border-coral-200 bg-coral-50 px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-coral-700">End code</p>
                  <p className="font-mono text-lg font-extrabold tracking-[0.2em] text-coral-700">{meetingOtp.code}</p>
                </div>
                <button onClick={() => setMeetingOtp(null)} className="text-xs font-semibold text-coral-700 hover:text-coral-900">Close</button>
              </div>
            )}
          </div>
        )}

        {booking.bookingStatus === 'COMPLETED' && (
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
        {loading ? <p className="mt-8 text-ink-500">Loading bookings...</p> : (
          <div className="mt-8 space-y-10">
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-ink-900">Upcoming bookings</h2>
              <BookingListFilters label="Upcoming bookings" value={upcomingFilter} onChange={setUpcomingFilter} dateValue={upcomingDate} onDateChange={setUpcomingDate} minDate={getIndiaDateKey(currentTime)} maxDate={getIndiaDateOffset(6, currentTime)} />
              <div className="mt-4 space-y-4">{groupedBookings.upcoming.length ? groupedBookings.upcoming.map(renderBooking) : <p className="text-sm text-ink-500">No upcoming bookings.</p>}</div>
            </section>
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-ink-900">Past / cancelled bookings</h2>
              <BookingListFilters label="Past and cancelled bookings" value={pastFilter} onChange={setPastFilter} dateValue={pastDate} onDateChange={setPastDate} />
              <div className="mt-4 space-y-4">{groupedBookings.past.length ? groupedBookings.past.map(renderBooking) : <p className="text-sm text-ink-500">No past bookings.</p>}</div>
            </section>
          </div>
        )}
      </div>
      <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
    </div>
  );
}