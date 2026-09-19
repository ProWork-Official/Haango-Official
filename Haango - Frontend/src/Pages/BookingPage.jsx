import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Calendar,
  Clock,
  MapPin,
  Film,
  ArrowRight,
  PartyPopper,
  CalendarDays,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { requestLocationPermission } from '../lib/location';
import haangoLogo from '../Assets/Icon/S_Blue.png';

const steps = ['Activity', 'Schedule', 'Location', 'Review', 'Confirm'];

const timeSlots = [
  '10:00 AM',
  '12:00 PM',
  '2:00 PM',
  '4:00 PM',
  '5:30 PM',
  '7:00 PM',
  '8:30 PM',
];

const bookingActivities = [
  { slug: 'movie', name: 'Movie Night', emoji: '🎬' },
  { slug: 'coffee', name: 'Coffee & Conversations', emoji: '☕' },
  { slug: 'dining', name: 'Lunch / Dinner', emoji: '🍽️' },
  { slug: 'gaming', name: 'Gaming', emoji: '🎮' },
  { slug: 'shopping', name: 'Shopping', emoji: '🛍️' },
  { slug: 'date', name: 'Date', emoji: '💐' },
  { slug: 'city-travel', name: 'City Travel', emoji: '🚶' },
];

function getDayOptions() {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return {
      label: index === 0
        ? 'Today'
        : index === 1
          ? 'Tomorrow'
          : date.toLocaleDateString('en-IN', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
      value: `${year}-${month}-${day}`,
    };
  });
}

const suggestedLocations = [
  { city: 'prayagraj', name: 'Triveni Sangam', type: 'Landmark' },
  { city: 'prayagraj', name: 'Civil Lines Market', type: 'Shopping' },
  { city: 'prayagraj', name: 'Sangam Cafe', type: 'Cafe' },
  { city: 'prayagraj', name: 'Allahabad Fort', type: 'Historic' },
  { city: 'prayagraj', name: 'Anand Vihar Park', type: 'Outdoors' },
  { city: 'prayagraj', name: 'Pioneer Chowk', type: 'Popular Spot' },
  { city: 'prayagraj', name: 'Regal Cinema', type: 'Cinema' },
  { city: 'prayagraj', name: 'Ganga Nagar', type: 'Walking Area' },
  { city: 'prayagraj', name: 'Minto Park', type: 'Park' },
  { city: 'prayagraj', name: 'Naini Bridge', type: 'Viewpoint' },
  { city: 'lucknow', name: 'Hazratganj Market', type: 'Shopping' },
  { city: 'lucknow', name: 'Ambedkar Park', type: 'Park' },
  { city: 'lucknow', name: 'Indira Gandhi Planetarium', type: 'Popular Spot' },
  { city: 'lucknow', name: 'Phoenix Mall', type: 'Mall' },
  { city: 'lucknow', name: 'Gomti Riverfront', type: 'Outdoors' },
  { city: 'lucknow', name: 'Rani Laxmi Bai Chowk', type: 'Landmark' },
  { city: 'lucknow', name: 'Café Coffee Day - Hazratganj', type: 'Cafe' },
  { city: 'lucknow', name: 'PVR Lucknow', type: 'Cinema' },
  { city: 'lucknow', name: 'Janeshwar Mishra Park', type: 'Park' },
  { city: 'lucknow', name: 'Royal Cafe', type: 'Restaurant' },
  { city: 'noida', name: 'The Great India Place', type: 'Mall' },
  { city: 'noida', name: 'Noida Sector 18 Market', type: 'Shopping' },
  { city: 'noida', name: 'Botanical Garden', type: 'Outdoors' },
  { city: 'noida', name: 'Worlds of Wonder', type: 'Entertainment' },
  { city: 'noida', name: 'DLF Mall of India', type: 'Mall' },
  { city: 'noida', name: 'Noida Film City', type: 'Landmark' },
  { city: 'noida', name: 'Sector 62 Cafes', type: 'Cafe' },
  { city: 'noida', name: 'KidZania', type: 'Family Spot' },
  { city: 'noida', name: 'Sky Garden', type: 'Park' },
  { city: 'noida', name: 'Connaught Plaza', type: 'Popular Spot' },
];

function normalizeLocationCity(cityName) {
  const value = String(cityName || '').trim().toLowerCase();

  if (value.includes('greater noida') || value.includes('noida')) return 'noida';
  if (value.includes('lucknow')) return 'lucknow';
  if (value.includes('prayagraj') || value.includes('allahabad')) return 'prayagraj';

  return 'prayagraj';
}

function getCityLocationPool(cityName) {
  return suggestedLocations.filter((place) => place.city === normalizeLocationCity(cityName));
}

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

export default function BookingPage({
  buddyId,
  onNavigate,
  onBack,
  onRequireLogin,
}) {
  const { user, profile } = useAuth();
  const [buddy, setBuddy] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dayOptions = getDayOptions();

  const [step, setStep] = useState(() => (
    new URLSearchParams(window.location.search).get('resume') === 'confirm' ? 4 : 0
  ));
  const [activity, setActivity] = useState(null);
  const [day, setDay] = useState(dayOptions[0].label);
  const [bookingDate, setBookingDate] = useState(dayOptions[0].value);
  const [time, setTime] = useState(timeSlots[5]);
  const [duration, setDuration] = useState(2);
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [visibleLocations, setVisibleLocations] = useState([]);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!buddy) return;

    const cityPool = getCityLocationPool(buddy.location);
    const shuffled = [...cityPool].sort(() => Math.random() - 0.5);
    const nextVisible = shuffled.slice(0, 5);
    const firstPick = nextVisible[0]?.name || '';

    setVisibleLocations(nextVisible);
    setCustomLocation('');
    setShowCustomLocation(false);
    setLocation(firstPick);
  }, [buddy]);

  const refreshSuggestedLocations = () => {
    if (!buddy) return;

    const cityPool = getCityLocationPool(buddy.location);
    const shuffled = [...cityPool].sort(() => Math.random() - 0.5);
    const nextVisible = shuffled.slice(0, 5);
    const firstPick = nextVisible[0]?.name || '';

    setVisibleLocations(nextVisible);
    setLocation(firstPick);
    setShowCustomLocation(false);
  };

  useEffect(() => {
    let active = true;

    const loadBookingData = async () => {
      setLoading(true);
      setError('');

      try {
        const [buddyData, activityData] = await Promise.all([
          apiRequest(`/buddies/${buddyId}`),
          apiRequest('/activities'),
        ]);

        if (!active) return;

        const user = buddyData?.userId && typeof buddyData.userId === 'object'
          ? buddyData.userId
          : buddyData?.user;
        const profileImages = Array.isArray(buddyData?.profileImages)
          ? buddyData.profileImages
          : [];

        setBuddy({
          id: buddyData.id || buddyData._id || buddyId,
          ownerUserId: typeof buddyData.userId === 'object'
            ? buddyData.userId?._id || buddyData.userId?.id
            : buddyData.userId || buddyData.user?._id || buddyData.user?.id,
          name: buddyData.name || buddyData.displayName || user?.name || 'Buddy',
          age: buddyData.age || 0,
          image: profileImages[0] || user?.profileImage || 'https://images.pexels.com/photos/6338266/pexels-photo-6338266.jpeg?auto=compress&cs=tinysrgb&h=800&w=600',
          location: buddyData.city || user?.city || user?.address || 'Unknown',
          pricePerHour: Number(buddyData.hourlyRate || 300),
          activities: Array.isArray(buddyData.activities) ? buddyData.activities : [],
        });

        const apiActivities = Array.isArray(activityData) ? activityData : [];
        const availableActivities = bookingActivities.map((catalogActivity) => {
          const apiActivity = apiActivities.find((item) => item.slug === catalogActivity.slug);
          return {
            ...catalogActivity,
            id: apiActivity?.id || apiActivity?._id,
          };
        });
        setActivities(availableActivities);

        const firstActivity = availableActivities[0];
        setActivity(firstActivity?.slug || null);
      } catch (loadError) {
        console.error('Failed to load booking data:', loadError);
        if (active) setError(loadError.message || 'Unable to load this booking.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBookingData();
    return () => { active = false; };
  }, [buddyId]);

  useEffect(() => {
    if (!user) return undefined;
    apiRequest('/customer-wallet')
      .then((wallet) => setWalletBalance(Number(wallet?.balance || 0)))
      .catch(() => setWalletBalance(0));
    return undefined;
  }, [user]);

  if (loading) {
    return <div className="pt-20 text-center text-ink-500">Loading booking details...</div>;
  }

  if (error || !buddy) {
    return (
      <div className="pt-20 text-center text-ink-500">
        {error || 'Buddy not found.'}
      </div>
    );
  }

  const activityObj = activities.find((item) => item.slug === activity);
  const isSelfBooking = Boolean(buddy.ownerUserId && user?.id && String(buddy.ownerUserId) === String(user.id));
  const buddyFee = buddy.pricePerHour * duration;
  const hangoFee = Math.round((buddyFee * 3) / 100);
  const total = buddyFee + hangoFee;
  const payableTotal = Math.max(0, total - couponDiscount);
  const showPricingBreakdown = step > 0;

  if (isSelfBooking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
          <h2 className="font-display text-2xl font-extrabold text-ink-900">You can't book yourself</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            This is your own buddy profile. Choose another buddy to create a booking.
          </p>
          <button onClick={onBack} className="btn-primary mt-6 w-full">Choose another buddy</button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="pt-16 md:pt-18 min-h-screen flex items-center justify-center section-pad animate-fade-in">
        <div className="max-w-lg w-full text-center">

          {/* Confetti */}
          <div className="relative mb-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-3 rounded-sm animate-confetti"
                style={{
                  left: `${15 + i * 6}%`,
                  top: '0',
                  backgroundColor: [
                    '#FF6B4A',
                    '#FBBF24',
                    '#2DD4BF',
                    '#4ADE80',
                    '#F87171',
                  ][i % 5],
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}

            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-coral-400 to-coral-600 flex items-center justify-center shadow-glow animate-pop">
              <PartyPopper size={48} className="text-white" />
            </div>
          </div>

          <h1 className="font-display font-extrabold text-4xl text-ink-900 tracking-tight">
            You're Haango'd!
          </h1>

          <p className="mt-4 text-lg text-ink-500">
            Your plan with {buddy.name} is confirmed.
          </p>

          <div className="card p-6 mt-8 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-[#EEEEEF]">
              <img
                src={buddy.image}
                alt={buddy.name}
                className="w-12 h-12 rounded-2xl object-cover"
              />

              <div>
                <p className="font-display font-bold text-ink-900">
                  {buddy.name}
                </p>
                <p className="text-xs text-ink-400">
                  {buddy.location}
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-3 text-sm">
                <Film size={18} className="text-ink-400" />
                <span className="text-ink-700">
                  {activityObj?.name}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar size={18} className="text-ink-400" />
                <span className="text-ink-700">
                  {day} · {time}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <MapPin size={18} className="text-ink-400" />
                <span className="text-ink-700">
                  {location}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock size={18} className="text-ink-400" />
                <span className="text-ink-700">
                  {duration} {duration === 1 ? 'hour' : 'hours'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#EEEEEF] flex items-center justify-between">
              <span className="text-sm text-ink-500">
                Total paid
              </span>

              <span className="font-display font-bold text-lg text-ink-900">
                ₹{payableTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={() => onNavigate('dashboard')}
              className="btn-secondary w-full"
            >
              <CalendarDays size={18} />
              View Booking
            </button>
          </div>

          <p className="mt-6 text-sm text-ink-400">
            Have a great time!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-18 animate-fade-in min-h-screen pb-24 md:pb-8">

      {/* Header / Progress */}
      <div className="bg-white border-b border-[#EEEEEF]">
        <div className="container-max section-pad py-4">

          <button
            onClick={onBack}
            className="no-tap inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-1 sm:gap-2 Lato">
            {steps.map((label, i) => (
              <div
                key={label}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all duration-300 ${
                      i < step
                        ? 'bg-[#22C55E] text-white'
                        : i === step
                        ? 'bg-[#FF6B4A] text-white shadow-glow scale-110'
                        : 'bg-[#EEEFF2] text-[#9A9FAB]'
                    }`}
                  >
                    {i < step ? <Check size={16} /> : i + 1}
                  </div>

                  <span
                    className={`hidden sm:block text-xs font-display font-semibold transition-colors duration-200 ${
                      i <= step ? 'text-ink-900' : 'text-ink-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${
                      i < step
                        ? 'bg-[#22C55E]'
                        : 'bg-[#EEEFF2]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container-max section-pad py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-2">

            {/* Step 0: Activity */}
            {step === 0 && (
              <div className="animate-fade-in">
                <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-2">
                  What are you planning?
                </h2>

                <p className="text-[#808287] font-medium mb-6">
                  Pick an activity and let's make a plan.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activities
                    .map((a) => (
                      <button
                        key={a.slug}
                        onClick={() => setActivity(a.slug)}
                        className={`no-tap relative p-4 rounded-3xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                          activity === a.slug
                            ? 'border-[#FF6B4A] carrd bg-[#FFF4F0] shadow-glow'
                            : 'border-[#EEEFF2] bg-white hover:border-ink-200'
                        }`}
                      >
                        <div className="text-3xl mb-2">
                          {a.emoji}
                        </div>

                        <p className="font-display font-semibold text-sm text-ink-900">
                          {a.name}
                        </p>

                        {activity === a.slug && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#FF6B4A] flex items-center justify-center">
                            <Check
                              size={12}
                              className="text-white"
                            />
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Step 1: Schedule */}
            {step === 1 && (
              <div className="animate-fade-in space-y-6">

                <div>
                  <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-2">
                    When?
                  </h2>

                  <p className="text-[#808287] font-medium mb-4">
                    Choose a day that works for you.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {dayOptions.map((dayOption) => (
                      <button
                        key={dayOption.value}
                        onClick={() => {
                          setDay(dayOption.label);
                          setBookingDate(dayOption.value);
                        }}
                        className={`no-tap px-4 py-3 rounded-2xl border-2 text-sm Lato font-semibold transition-all duration-200 ${
                          day === dayOption.label
                            ? 'border-[#FF6B4A] text-[#FF6B4A] carrd bg-[#FFF4F0] shadow-glow'
                            : 'border-[#EEEFF2] text-[#898c94] bg-white hover:border-ink-200'
                        }`}
                      >
                        {dayOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-ink-900 mb-3">
                    What time?
                  </h3>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={`no-tap px-3 py-3 rounded-2xl border-2 text-sm Lato font-medium transition-all duration-200 ${
                          time === t
                             ? 'border-[#FF6B4A] carrd bg-[#FFF4F0] text-[#FF6B4A] shadow-glow'
                            : 'border-[#EEEFF2] text-[#898c94] bg-white hover:border-ink-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-ink-900 mb-3">
                    For how long?
                  </h3>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() =>
                        setDuration(Math.max(1, duration - 1))
                      }
                      className="no-tap w-12 h-12 rounded-2xl bg-ink-50 text-ink-600 font-display font-bold text-xl hover:bg-[#eff0f2] transition-colors"
                    >
                      −
                    </button>

                    <div className="text-center min-w-[80px]">
                      <span className="font-display font-extrabold text-3xl text-ink-900">
                        {duration}
                      </span>

                      <span className="text-sm text-ink-400 ml-1">
                        {duration === 1 ? 'hour' : 'hours'}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setDuration(Math.min(8, duration + 1))
                      }
                      className="no-tap w-12 h-12 rounded-2xl bg-ink-50 text-ink-600 font-display font-bold text-xl hover:bg-[#eff0f2] transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="animate-fade-in">
                <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-2">
                  Where?
                </h2>

                <p className="text-[#808287] font-medium mb-6">
                  Select a public meeting location. Safety first.
                </p>

                <div className="space-y-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Popular places in {normalizeLocationCity(buddy.location)}
                    </p>
                    <button
                      type="button"
                      onClick={refreshSuggestedLocations}
                      className="btn-ghost text-xs"
                    >
                      Refresh
                    </button>
                  </div>

                  {visibleLocations.map((loc) => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => {
                        setLocation(loc.name);
                        setShowCustomLocation(false);
                        setCustomLocation('');
                      }}
                      className={`no-tap w-full flex items-center gap-4 p-4 rounded-2xl  border-2 text-left transition-all duration-200 ${
                        location === loc.name
                          ? 'border-[#FF6B4A] text-[#898c94] carrd bg-[#FFF4F0] shadow-glow'
                            : 'border-[#EEEFF2] text-[#898c94] bg-white hover:border-ink-200'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          location === loc.name
                            ? 'bg-[#FF6B4A]'
                            : 'bg-ink-50'
                        }`}
                      >
                        <MapPin
                          size={18}
                          className={
                            location === loc.name
                              ? 'text-white'
                              : 'text-ink-400'
                          }
                        />
                      </div>

                      <div className="flex-1">
                        <p className="font-display font-semibold text-black">
                          {loc.name}
                        </p>

                        <p className="text-xs text-ink-400">
                          {loc.type}
                        </p>
                      </div>

                      {location === loc.name && (
                        <Check
                          size={20}
                          className="text-[#FF6B4A]"
                        />
                      )}
                    </button>
                  ))}

                  <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display font-semibold text-ink-900">Other place</p>
                      <button
                        type="button"
                        onClick={() => setShowCustomLocation((current) => !current)}
                        className="btn-ghost text-xs"
                      >
                        {showCustomLocation ? 'Hide' : 'Write your own'}
                      </button>
                    </div>

                    {showCustomLocation && (
                      <textarea
                        value={customLocation}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setCustomLocation(nextValue);
                          setLocation(nextValue.trim());
                        }}
                        rows={3}
                        placeholder="Type your preferred public meeting place..."
                        className="input-field mt-3 min-h-[88px] resize-y"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-6">
                  Review your plan
                </h2>

                <div className="card p-6 space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-[#EEEEEF]">
                    <img
                      src={buddy.image}
                      alt={buddy.name}
                      className="w-14 h-14 rounded-2xl object-cover"
                    />

                    <div>
                      <p className="font-display font-bold text-ink-900">
                        {buddy.name}, {buddy.age}
                      </p>

                      <p className="text-xs font-medium text-[#898c94]">
                        {buddy.location}
                      </p>
                    </div>
                  </div>

                  {[
                    {
                      icon: Film,
                      label: 'Activity',
                      value: activityObj?.name ?? '',
                    },
                    {
                      icon: Calendar,
                      label: 'Date',
                      value: `${day} · ${time}`,
                    },
                    {
                      icon: Clock,
                      label: 'Duration',
                      value: `${duration} ${
                        duration === 1 ? 'hour' : 'hours'
                      }`,
                    },
                    {
                      icon: MapPin,
                      label: 'Location',
                      value: location,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#f6f6f8] flex items-center justify-center">
                          <Icon
                            size={18}
                            className="text-[#898c94]"
                          />
                        </div>

                        <div>
                          <p className="text-xs text-[#898c94] font-medium">
                            {item.label}
                          </p>

                          <p className="font-display font-semibold text-ink-900">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Confirm / Pay */}
            {step === 4 && (
              <div className="animate-fade-in">
                <h2 className="font-display font-extrabold text-2xl text-ink-900 mb-2">
                  Confirm & Pay
                </h2>

                <p className="text-[#808287] font-medium mb-6">
                  You're booking {buddy.name} for {activityObj?.name}.
                  Ready?
                </p>

                <div className="card p-6">
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-ink-700">Add coupon code</label>
                    <div className="mt-1 flex gap-2">
                      <input className="input-field !mt-0 flex-1" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponDiscount(0); setCouponMessage(''); }} placeholder="Enter coupon code" />
                      <button type="button" disabled={applyingCoupon || !couponCode.trim()} onClick={async () => {
                        setApplyingCoupon(true);
                        setCouponMessage('');
                        try {
                          const result = await apiRequest('/coupons/validate', { method: 'POST', body: JSON.stringify({ code: couponCode.trim(), totalAmount: total }) });
                          setCouponDiscount(Number(result?.amount || 0));
                          setCouponMessage(`Coupon applied. You save ₹${Number(result?.amount || 0).toLocaleString('en-IN')}.`);
                        } catch (couponError) {
                          setCouponDiscount(0);
                          setCouponMessage(couponError.message || 'Invalid coupon code.');
                        } finally {
                          setApplyingCoupon(false);
                        }
                      }} className="btn-secondary mt-0 shrink-0 disabled:opacity-50">{applyingCoupon ? 'Checking...' : 'Apply'}</button>
                    </div>
                    {couponMessage && <p className={`mt-2 text-xs ${couponDiscount > 0 ? 'text-success-600' : 'text-red-500'}`}>{couponMessage}</p>}
                  </div>
                  {walletBalance > 0 && <p className="mb-5 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-700">Wallet balance available: ₹{walletBalance.toLocaleString('en-IN')}</p>}
                  {showPricingBreakdown && (
                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#808287] font-medium">
                          Buddy fee ({duration} hrs × ₹
                          {buddy.pricePerHour})
                        </span>

                        <span className="font-medium text-ink-900">
                          ₹{buddyFee.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-[#808287] font-medium">
                          Haango fee
                        </span>

                        <span className="font-medium text-ink-900">
                          ₹{hangoFee.toLocaleString('en-IN')}
                        </span>
                      </div>

                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-[#f6f6f8]">
                    <span className="font-display font-bold text-ink-900">
                      Total
                    </span>

                    <span className="text-right">
                      {couponDiscount > 0 && <span className="block text-sm font-medium text-ink-400 line-through">₹{total.toLocaleString('en-IN')}</span>}
                      <span className="font-display text-2xl font-extrabold text-ink-900">₹{payableTotal.toLocaleString('en-IN')}</span>
                    </span>
                  </div>
                  {couponDiscount > 0 && <div className="mt-3 flex justify-between text-sm text-success-600"><span>Coupon discount</span><span>-₹{couponDiscount.toLocaleString('en-IN')}</span></div>}
                </div>

                <button
                  onClick={async () => {
                    if (!user) {
                      onRequireLogin?.();
                      return;
                    }

                    setSubmitting(true);
                    setError('');
                    setPaymentError('');

                    try {
                      await requestLocationPermission();
                      const booking = await apiRequest('/bookings', {
                        method: 'POST',
                        body: JSON.stringify({
                          buddyId: buddy.id,
                          activityId: activityObj?.id,
                          date: bookingDate,
                          startTime: time,
                          duration,
                          meetingLocation: location,
                          couponCode: couponCode.trim(),
                        }),
                      });

                      const order = await apiRequest('/payments/create-order', {
                        method: 'POST',
                        body: JSON.stringify({ bookingId: booking._id || booking.id }),
                      });
                      if (order.walletOnly) {
                        setConfirmed(true);
                        setSubmitting(false);
                        return;
                      }
                      const scriptLoaded = await loadRazorpayScript();
                      if (!scriptLoaded) throw new Error('Unable to load the Razorpay checkout.');

                      const razorpay = new window.Razorpay({
                        key: order.keyId,
                        amount: order.amount,
                        currency: order.currency,
                        name: "Haango - Don't Go Alone",
                        image: new URL(haangoLogo, window.location.origin).href,
                        description: `${activityObj.name} with ${buddy.name}`,
                        order_id: order.id,
                        prefill: {
                          name: profile?.full_name || profile?.name || user?.name || '',
                          email: profile?.email || user?.email || '',
                        },
                        handler: async (paymentResponse) => {
                          try {
                            await apiRequest('/payments/verify', {
                              method: 'POST',
                              body: JSON.stringify({
                                bookingId: booking._id || booking.id,
                                ...paymentResponse,
                              }),
                            });
                            setConfirmed(true);
                          } catch (verificationError) {
                            setPaymentError(verificationError.message || 'Payment verification failed.');
                          } finally {
                            setSubmitting(false);
                          }
                        },
                        modal: {
                          confirm_close: true,
                          ondismiss: () => setSubmitting(false),
                        },
                        theme: {
                          color: '#ff6b4a',
                          backdrop_color: '#fffaf5',
                        },
                      });
                      razorpay.on('payment.failed', (response) => {
                        setPaymentError(response.error?.description || 'Payment failed. Please try again.');
                        setSubmitting(false);
                      });
                      razorpay.open();
                    } catch (submitError) {
                      setError(submitError.message || 'Unable to create booking.');
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="btn-primary w-full mt-6 text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating booking...' : `Confirm & Pay ₹${payableTotal.toLocaleString('en-IN')}`}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="btn-secondary mt-3 w-full"
                >
                  <ArrowLeft size={16} />
                  Go back
                </button>

                {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
                {paymentError && <p className="mt-3 text-sm text-red-500">{paymentError}</p>}
              </div>
            )}

            {/* Navigation Buttons */}
            {step < 4 && (
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="btn-secondary"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}

                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 0 && !activity}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 card p-6 shadow-card">
              <h3 className="font-display font-bold text-ink-900 mb-4">
                Booking Summary
              </h3>

              <div className="flex items-center gap-3 pb-4 border-b border-[#EEEEEF]">
                <img
                  src={buddy.image}
                  alt={buddy.name}
                  className="w-12 h-12 rounded-2xl object-cover"
                />

                <div>
                  <p className="font-display font-semibold text-ink-900 text-sm">
                    {buddy.name}
                  </p>

                  <p className="text-xs text-[#808287] font-medium">
                    {activityObj?.name ?? 'Select activity'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 mt-4 text-sm ">
                <div className="flex justify-between">
                  <span className="text-[#808287] font-medium">Date</span>
                  <span className="font-medium text-ink-700">
                    {step > 0 ? day : '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#808287] font-medium">Time</span>
                  <span className="font-medium text-ink-700">
                    {step > 0 ? time : '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#808287] font-medium">Duration</span>
                  <span className="font-medium text-ink-700">
                    {step > 0 ? `${duration} hrs` : '—'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#808287] font-medium">Location</span>
                  <span className="font-medium text-ink-700 text-right max-w-[140px]">
                    {step > 1 ? location : '—'}
                  </span>
                </div>
              </div>

              {showPricingBreakdown && (
                <div className="mt-4 pt-4 border-t border-[#EEEEEF] space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#808287] font-medium">
                      Buddy fee
                    </span>

                    <span className="font-medium text-ink-900">
                      ₹{buddyFee.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-[#808287] font-medium">
                      Haango fee
                    </span>

                    <span className="font-medium text-ink-900">
                      ₹{hangoFee.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {couponDiscount > 0 && <div className="flex justify-between text-sm text-success-600"><span>Coupon discount</span><span>-₹{couponDiscount.toLocaleString('en-IN')}</span></div>}

                  <div className="flex justify-between items-center pt-2">
                    <span className="font-display font-bold text-ink-900">
                      Total
                    </span>

                    <span className="font-display font-extrabold text-xl text-ink-900">
                      ₹{payableTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
