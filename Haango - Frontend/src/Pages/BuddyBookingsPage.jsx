import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, MessageCircle } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { getCurrentLocation } from '../lib/location';
import LiveLocationMap from '../Components/LiveLocationMap';

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

export default function BuddyBookingsPage({ onBack, onMessage }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [locations, setLocations] = useState({});
  const [locationError, setLocationError] = useState('');
  const [openLocationMap, setOpenLocationMap] = useState(null);
  const [otpForm, setOtpForm] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const locationWatches = useRef({});
  useEffect(() => () => Object.values(locationWatches.current).forEach((watchId) => navigator.geolocation?.clearWatch(watchId)), []);

  useEffect(() => {
    let active = true;
    apiRequest('/bookings/buddy')
      .then((response) => { if (active) setBookings(Array.isArray(response) ? response : []); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load bookings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateBooking = async (bookingId, action) => {
    try {
      setUpdating(`${bookingId}:${action}`);
      if (action === 'start' || action === 'complete') {
        const phase = action === 'start' ? 'START' : 'END';
        setOtpCode('');
        setOtpForm({ bookingId, phase });
      } else {
        await apiRequest(`/bookings/${bookingId}/${action}`, { method: 'PATCH' });
      }
      const nextBookings = await apiRequest('/bookings/buddy');
      setBookings(Array.isArray(nextBookings) ? nextBookings : nextBookings?.data || []);
    } catch (updateError) {
      setError(updateError.message || 'Unable to update booking.');
    } finally {
      setUpdating(null);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    if (!otpForm || !/^\d{6}$/.test(otpCode)) {
      setError('Enter the six-digit code shown on the customer booking page.');
      return;
    }
    try {
      setUpdating(`${otpForm.bookingId}:otp`);
      await apiRequest(`/bookings/${otpForm.bookingId}/meeting/verify`, {
        method: 'POST',
        body: JSON.stringify({ phase: otpForm.phase, code: otpCode }),
      });
      setOtpForm(null);
      setOtpCode('');
      const nextBookings = await apiRequest('/bookings/buddy');
      setBookings(Array.isArray(nextBookings) ? nextBookings : nextBookings?.data || []);
    } catch (otpError) {
      setError(otpError.message || 'Unable to verify meeting code.');
    } finally {
      setUpdating(null);
    }
  };

  const meetingStart = (booking) => {
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
  const locationUnlocked = (booking) => {
    if (booking.bookingStatus === 'ONGOING') return true;
    const start = meetingStart(booking);
    const end = start + Number(booking.duration || 0) * 60 * 60 * 1000;
    return Date.now() >= start - 2 * 60 * 60 * 1000 && Date.now() < end;
  };
  const showLiveMap = (booking) => {
    if (!locationUnlocked(booking)) {
      setLocationError('Location sharing unlocks 2 hours before the meeting.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Location sharing is not supported by this browser.');
      return;
    }
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
        }, () => setLocationError('Live location permission was removed.'), { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
      } catch (locationLoadError) {
        setLocationError(locationLoadError.message || 'Unable to load live locations.');
      }
    }).catch((positionError) => {
      const messages = {
        1: positionError.permissionState === 'denied'
          ? 'Location permission is blocked for this site. Allow location access, then try again.'
          : 'The site permission is allowed, but your browser or Windows location service did not return a location. Turn on device location services and try again.',
        2: 'Your device could not determine its location. Check that device location services are enabled, then try again.',
        3: 'Location lookup timed out. Check your connection and device location services, then try again.',
      };
      setLocationError(messages[positionError.code] || 'Unable to read your location. Check your browser and device location settings.');
    });
  };

  return (
    <div className="min-h-screen bg-ink-50 pb-20 pt-20 md:pt-24">
      <div className="container-max section-pad">
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={16} /> Back to dashboard</button>
        <h1 className="font-display text-3xl font-extrabold text-ink-900">All bookings</h1>
        <p className="mt-2 text-ink-500">Your complete companion booking schedule.</p>
        {error && <p className="mt-5 rounded-2xl bg-error-50 p-4 text-sm text-error-600">{error}</p>}
        {locationError && <p className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm text-sky-700">{locationError}</p>}
        {otpForm && (
          <form onSubmit={submitOtp} className="mt-5 rounded-2xl border border-coral-200 bg-coral-50 p-5">
            <h2 className="font-display text-lg font-bold text-ink-900">{otpForm.phase === 'START' ? 'Confirm meeting start' : 'Confirm meeting end'}</h2>
            <p className="mt-1 text-sm text-ink-600">Ask the customer for the six-digit OTP shown on their booking page.</p>
            <input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} autoFocus className="mt-4 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.35em]" placeholder="000000" />
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={updating === `${otpForm.bookingId}:otp`} className="btn-primary text-sm">{updating === `${otpForm.bookingId}:otp` ? 'Verifying...' : 'Verify OTP'}</button>
              <button type="button" onClick={() => setOtpForm(null)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </form>
        )}
        {loading ? <p className="mt-8 text-ink-500">Loading bookings...</p> : (
          <div className="mt-8 space-y-4">
            {bookings.length ? bookings.map((booking) => (
              <div key={booking._id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-coral-500">{booking.activityId?.name || booking.activitySlug}</p><h2 className="mt-1 font-display text-lg font-bold text-ink-900">{booking.customerId?.name || 'Customer'}</h2></div>
                  <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600">{booking.bookingStatus}</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-ink-600 sm:grid-cols-3"><span className="flex items-center gap-2"><Calendar size={16} /> {new Date(booking.date).toLocaleDateString('en-IN')}</span><span className="flex items-center gap-2"><Clock size={16} /> {booking.startTime} · {booking.duration} hrs</span><span className="flex items-center gap-2"><MapPin size={16} /> {booking.meetingLocation}</span></div>
                {booking.paymentStatus === 'PAID' && !['CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
                  <button onClick={() => onMessage(booking._id)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-coral-600">
                    <MessageCircle size={16} /> Message customer
                  </button>
                )}
                {booking.paymentStatus === 'PAID' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
                  <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
                    <button onClick={() => showLiveMap(booking)} className="btn-ghost text-sm">Show user location</button>
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.bookingStatus === 'PENDING' && <>
                    <button onClick={() => updateBooking(booking._id, 'accept')} disabled={updating} className="btn-primary text-sm">Accept booking</button>
                    <button onClick={() => updateBooking(booking._id, 'reject')} disabled={updating} className="btn-ghost text-sm">Reject</button>
                  </>}
                  {booking.bookingStatus === 'CONFIRMED' && <button onClick={() => updateBooking(booking._id, 'start')} disabled={updating} className="btn-primary text-sm">Start plan</button>}
                  {booking.bookingStatus === 'ONGOING' && <button onClick={() => updateBooking(booking._id, 'complete')} disabled={updating} className="btn-primary text-sm">Mark completed</button>}
                </div>
              </div>
            )) : <p className="text-sm text-ink-500">No bookings yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}