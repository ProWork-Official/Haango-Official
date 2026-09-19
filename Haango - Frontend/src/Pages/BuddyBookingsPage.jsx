import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, Lock, MapPin, MessageCircle, ShieldCheck, XCircle } from 'lucide-react';
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

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
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
        {loading ? <p className="mt-8 text-ink-500">Loading bookings...</p> : (
          <div className="mt-8 space-y-4">
            {bookings.length ? bookings.map((booking) => (
              <div key={booking._id} className="rounded-[28px] border border-[#e6ddd4] bg-[#f7f5f2] p-3 shadow-[0_4px_18px_rgba(17,24,39,0.04)] sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5a7a9e]">{booking.activityId?.name || booking.activitySlug || 'HAANGO PLAN'}</p>
                    <h2 className="mt-1 font-display text-2xl font-black tracking-[-0.04em] text-ink-900">{booking.customerId?.name || 'Customer'}</h2>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#1d9d68]"><CheckCircle2 size={16} className="fill-[#1d9d68] text-white" /><span>{booking.bookingStatus}</span></div>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#bfe8d6] bg-[#eafaf1] px-3 py-2 text-sm font-semibold text-[#1d9d68]"><CheckCircle2 size={16} className="fill-[#1d9d68] text-white" /><span>{booking.paymentStatus === 'PAID' ? 'Booking Confirmed' : booking.bookingStatus}</span></div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-[#e9e1d9] pt-4 text-sm text-ink-700 sm:grid-cols-3 sm:items-center">
                  <div className="flex items-center gap-2"><Calendar size={16} className="text-ink-500" /><span>{formatDate(booking.date)}</span></div>
                  <div className="flex items-center gap-2"><Clock size={16} className="text-ink-500" /><span>{booking.startTime || 'Scheduled'} · {booking.duration} hrs</span></div>
                  <div className="flex items-center gap-2"><MapPin size={16} className="text-ink-500" /><span>{booking.meetingLocation}</span></div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#cfe5f7] bg-[#eaf3fb] px-3 py-3 text-sm text-[#426d9a] sm:px-4">
                  <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9ebfb] text-[#3b6ea8]"><ShieldCheck size={16} /></div><p className="font-medium">Customer contact details stay hidden until the meetup for everyone&apos;s safety.</p><ChevronRight size={16} className="ml-auto" /></div>
                </div>

                {booking.paymentStatus === 'PAID' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-[20px] border border-[#eadfce] bg-[#f8f2ec] p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5e2d2] text-[#d9864b]"><MapPin size={20} /></div><div><p className="text-xl font-extrabold text-ink-900">Location sharing</p><p className="text-sm text-ink-600">Available 2h before meeting</p></div></div>
                    <div className="flex items-center gap-3 rounded-[20px] border border-[#dbe9f7] bg-[#edf6ff] p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeeff] text-[#3a6fb5]"><Lock size={20} /></div><div><p className="text-xl font-extrabold text-ink-900">Meeting status</p><p className="text-sm text-ink-600">{booking.bookingStatus === 'ONGOING' ? 'In progress' : booking.bookingStatus === 'CONFIRMED' ? 'Ready to start' : 'Awaiting acceptance'}</p></div></div>
                  </div>
                )}

                {booking.paymentStatus === 'PAID' && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus) && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button onClick={() => onMessage(booking._id)} className="inline-flex items-center justify-center gap-3 rounded-[18px] border border-[#d6d2cd] bg-white px-4 py-3 text-base font-semibold text-ink-800 transition hover:bg-ink-50"><MessageCircle size={18} /> Message customer</button>
                    <button onClick={() => showLiveMap(booking)} className="inline-flex items-center justify-center gap-3 rounded-[18px] border border-[#d6d2cd] bg-white px-4 py-3 text-base font-semibold text-ink-800 transition hover:bg-ink-50"><MapPin size={18} /> Show customer location</button>
                  </div>
                )}

                {openLocationMap === booking._id && <LiveLocationMap locations={locations[booking._id]} onClose={() => { if (locationWatches.current[booking._id]) { navigator.geolocation.clearWatch(locationWatches.current[booking._id]); delete locationWatches.current[booking._id]; } setOpenLocationMap(null); }} onRefresh={async () => { const refreshed = await apiRequest(`/bookings/${booking._id}/locations`); setLocations((current) => ({ ...current, [booking._id]: refreshed })); }} />}

                <div className="mt-5 flex flex-wrap gap-2">
                  {booking.bookingStatus === 'PENDING' && <><button onClick={() => updateBooking(booking._id, 'accept')} disabled={Boolean(updating)} className="btn-primary text-sm"><CheckCircle2 size={16} /> Accept booking</button><button onClick={() => updateBooking(booking._id, 'reject')} disabled={Boolean(updating)} className="btn-ghost text-sm"><XCircle size={16} /> Reject</button></>}
                  {booking.bookingStatus === 'CONFIRMED' && <button onClick={() => updateBooking(booking._id, 'start')} disabled={Boolean(updating)} className="btn-primary text-sm"><Lock size={16} /> Enter start OTP</button>}
                  {booking.bookingStatus === 'ONGOING' && <button onClick={() => updateBooking(booking._id, 'complete')} disabled={Boolean(updating)} className="btn-primary text-sm"><CheckCircle2 size={16} /> Enter end OTP</button>}
                  {booking.bookingStatus === 'COMPLETED' && <button disabled className="btn-ghost text-sm"><CheckCircle2 size={16} /> Booking completed</button>}
                </div>

                {otpForm?.bookingId === booking._id && (
                  <form onSubmit={submitOtp} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-coral-200 bg-coral-50 p-3">
                    <div className="mr-1"><p className="text-xs font-bold text-coral-700">{otpForm.phase === 'START' ? 'Meeting start OTP' : 'Meeting end OTP'}</p><p className="text-[11px] text-ink-600">Enter the customer&apos;s six-digit code.</p></div>
                    <input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} autoFocus className="w-32 rounded-lg border border-ink-200 bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.2em]" placeholder="000000" />
                    <button type="submit" disabled={updating === `${otpForm.bookingId}:otp`} className="btn-primary text-sm">{updating === `${otpForm.bookingId}:otp` ? 'Verifying...' : 'Verify OTP'}</button>
                    <button type="button" onClick={() => setOtpForm(null)} className="btn-ghost text-sm">Cancel</button>
                  </form>
                )}
              </div>
            )) : <p className="text-sm text-ink-500">No bookings yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}