import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  BadgeCheck,
  MapPin,
  Clock,
  Shield,
  ChevronRight,
  Globe,
  Calendar,
} from 'lucide-react';

import StarRating from '../Components/StarRating';
import { ProfileSkeleton } from '../Components/Skeletons';
import { apiRequest as sharedApiRequest } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

async function apiRequest(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload?.data ?? payload;
}

function getAgeFromDate(dateValue) {
  if (!dateValue) return 0;
  const birthDate = new Date(dateValue);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasNotReachedBirthday = today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

  if (hasNotReachedBirthday) age -= 1;
  return age;
}

export default function ProfilePage({
  buddyId,
  onBack,
  onBook,
}) {
  const [buddy, setBuddy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewFilter, setReviewFilter] = useState('0');
  const [profileReviews, setProfileReviews] = useState([]);

  useEffect(() => {
    let active = true;

    const loadBuddy = async () => {
      setLoading(true);
      setActiveImage(0);

      try {
        const response = await apiRequest(`/buddies/${buddyId}`);
        if (!active) return;

        const buddyData = response || {};
        const normalizedBuddy = {
          id: buddyData.id || buddyData._id || buddyId,
          name: buddyData.name || buddyData.displayName || 'Buddy',
          age: buddyData.age || getAgeFromDate(buddyData.dateOfBirth || buddyData.user?.dateOfBirth),
          tagline: buddyData.summary || buddyData.tagline || 'A fun and easygoing companion.',
          image: (Array.isArray(buddyData.profileImages) && buddyData.profileImages[0]) || buddyData.userId?.profileImage || buddyData.user?.profileImage || '',
          gallery: Array.isArray(buddyData.profileImages) && buddyData.profileImages.length
            ? buddyData.profileImages
            : [buddyData.userId?.profileImage || buddyData.user?.profileImage].filter(Boolean),
          rating: Number(buddyData.rating || 0),
          outings: Number(buddyData.completedBookings || buddyData.outings || 0),
          pricePerHour: Number(buddyData.hourlyRate || 300),
          location: buddyData.city || 'Unknown',
          interests: Array.isArray(buddyData.interests) && buddyData.interests.length ? buddyData.interests : (Array.isArray(buddyData.hobbies) ? buddyData.hobbies : []),
          activities: Array.isArray(buddyData.activities) ? buddyData.activities : [],
          verified: buddyData.verificationStatus === 'VERIFIED',
          available: buddyData.isAvailable !== false,
          about: buddyData.bio || buddyData.about || 'A great companion for memorable experiences.',
          languages: Array.isArray(buddyData.languages) ? buddyData.languages : [],
          availability: Array.isArray(buddyData.availability) ? buddyData.availability.map((slot) => `${slot.day || 'Weekday'} ${slot.startTime || ''} - ${slot.endTime || ''}`.trim()) : ['Weekdays after 5 PM'],
          responseTime: buddyData.responseTime || 'Usually replies in a few hours',
          reviews: Array.isArray(buddyData.reviews) ? buddyData.reviews : [],
          gender: buddyData.gender || 'PREFER_NOT_TO_SAY',
          showOnFindCompanions: buddyData.showOnFindCompanions !== false,
        };

        setBuddy(normalizedBuddy);
        try {
          const reviewOwnerId = buddyData.userId?._id || buddyData.userId || buddyData.user?._id || buddyId;
          const reviewsResponse = await sharedApiRequest(`/reviews/buddy/${reviewOwnerId}?limit=50&minRating=${reviewFilter}`);
          if (active) setProfileReviews(Array.isArray(reviewsResponse) ? reviewsResponse : reviewsResponse?.data || []);
        } catch {
          if (active) setProfileReviews([]);
        }
      } catch (error) {
        console.error('Failed to load buddy profile:', error);
        if (active) setBuddy(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBuddy();
    return () => { active = false; };
  }, [buddyId, reviewFilter]);

  if (loading) {
    return (
      <div className="pt-16 md:pt-18">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!buddy) {
    return (
      <div className="pt-20 text-center text-ink-500">
        Buddy not found.
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-18 animate-fade-in pb-24 md:pb-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="no-tap fixed top-20 left-4 z-30 md:top-24 md:left-8 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-soft flex items-center justify-center hover:scale-110 transition-transform duration-200"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Gallery */}
      <div className="relative h-[28rem] sm:mx-auto sm:w-[375px] sm:rounded-3xl md:h-96 overflow-hidden ">
        <img
          src={buddy.gallery[activeImage]}
          alt={buddy.name}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {buddy.gallery.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className={`no-tap w-2 h-2 rounded-full transition-all duration-200 ${
                i === activeImage
                  ? 'bg-white w-6'
                  : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="container-max section-pad mt-4 flex gap-3">
        {buddy.gallery.map((img, i) => (
          <button
            key={i}
            onClick={() => setActiveImage(i)}
            className={`no-tap w-20 h-20 rounded-2xl overflow-hidden transition-all duration-200 ${
              i === activeImage
                ? 'ring-2 ring-coral-500 ring-offset-2'
                : 'opacity-60 hover:opacity-100'
            }`}
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="container-max section-pad mt-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink-900">
                  {buddy.name}, {buddy.age}
                </h1>

                {buddy.verified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-display font-semibold">
                    <BadgeCheck size={15} />
                    Identity Verified
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <Star
                    size={18}
                    className="text-amber-400 fill-amber-400"
                  />

                  <span className="font-display font-bold text-ink-900">
                    {buddy.rating}
                  </span>
                </div>

                <span className="text-ink-300">·</span>

                <span className="text-sm text-ink-500">
                  {buddy.outings} outings
                </span>

                <span className="text-ink-300">·</span>

                <span className="flex items-center gap-1 text-sm text-ink-500">
                  <MapPin size={14} />
                  {buddy.location}
                </span>
              </div>

              <p className="mt-4 text-lg text-ink-600 leading-relaxed">
                "{buddy.tagline}"
              </p>
            </div>

            {/* About */}
            <div>
              <h2 className="font-display font-bold text-xl text-ink-900 mb-3">
                About {buddy.name}
              </h2>

              <p className="text-ink-600 leading-relaxed">
                {buddy.about}
              </p>
            </div>

            {/* Things I Enjoy */}
            <div>
              <h2 className="font-display font-bold text-xl text-ink-900 mb-4">
                Things I Enjoy
              </h2>

              <div className="flex flex-wrap gap-2">
                {buddy.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-4 py-2.5 rounded-2xl bg-ink-50 text-sm font-medium text-ink-700"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Good To Know */}
            <div>
              <h2 className="font-display font-bold text-xl text-ink-900 mb-4">
                Good To Know
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Languages */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 text-ink-400 mb-2">
                    <Globe size={18} />

                    <span className="text-xs font-display font-semibold uppercase tracking-wide">
                      Languages
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {buddy.languages.map((lang, i) => (
                      <span
                        key={lang}
                        className="flex items-center gap-1.5 text-sm text-ink-700 font-medium"
                      >
                        {i > 0 && (
                          <span className="text-ink-300">·</span>
                        )}
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Response Time */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 text-ink-400 mb-2">
                    <Clock size={18} />

                    <span className="text-xs font-display font-semibold uppercase tracking-wide">
                      Response Time
                    </span>
                  </div>

                  <p className="text-sm text-ink-700">
                    {buddy.responseTime}
                  </p>
                </div>

                {/* Availability */}
                <div className="card p-5 sm:col-span-2">
                  <div className="flex items-center gap-2 text-ink-400 mb-2">
                    <Calendar size={18} />

                    <span className="text-xs font-display font-semibold uppercase tracking-wide">
                      Availability
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {buddy.availability.map((slot) => (
                      <span
                        key={slot}
                        className="px-3 py-1.5 rounded-full bg-[#F0FDF4] text-success-700 text-sm font-medium"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-display font-bold text-xl text-ink-900">
                  Reviews
                </h2>

                <div className="flex items-center gap-1.5">
                  <Star
                    size={16}
                    className="text-amber-400 fill-amber-400"
                  />

                  <span className="font-display font-bold text-ink-900">
                    {buddy.rating}
                  </span>

                  <span className="text-sm text-ink-400">
                    ({buddy.outings} outings)
                  </span>
                </div>
                <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)} className="input-field w-auto py-2 text-sm">
                  <option value="0">All ratings</option>
                  <option value="4.5">4.5+ stars</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                </select>
              </div>

              <div className="space-y-4">
                {(profileReviews.length ? profileReviews : buddy.reviews).map((review) => (
                  <div
                    key={review.id || review._id}
                    className="card p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFE3D9] flex items-center justify-center font-display font-bold text-[#E85A3D]">
                          {(review.author || review.customerId?.name || 'U')[0]}
                        </div>

                        <div>
                          <p className="font-display font-semibold text-ink-900 text-sm">
                            {review.author || review.customerId?.name || 'User'}
                          </p>

                          <p className="text-xs text-ink-400">
                            {review.date || new Date(review.createdAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <StarRating
                        rating={Number(review.rating)}
                        size={14}
                      />
                    </div>

                    <p className="text-sm text-ink-600 leading-relaxed">
                      "{review.text || review.comment}"
                    </p>

                    <span className="inline-block mt-3 px-2.5 py-1 rounded-full bg-ink-50 text-xs font-medium text-ink-500">
                      {review.activity || review.activityName}
                    </span>
                    {Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="mt-4 flex gap-2">
                        {review.images.map((image) => <img key={image} src={image} alt="Review" className="h-20 w-20 rounded-xl object-cover" />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Booking Card */}
              <div className="card p-6 shadow-lift">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-display font-extrabold text-3xl text-ink-900">
                    ₹{buddy.pricePerHour}
                  </span>

                  <span className="text-sm text-ink-400">
                    /hour
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {buddy.available ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[#39c768] animate-pulse" />

                      <span className="text-sm font-medium text-[#39c768]">
                        Available to book
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-ink-300" />

                      <span className="text-sm font-medium text-ink-400">
                        Currently unavailable
                      </span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => onBook(buddy.id)}
                  disabled={!buddy.available}
                  className="btn-primary w-full mt-5 text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Book {buddy.name}
                  <ChevronRight size={18} />
                </button>

                <div className="mt-5 pt-5 border-t border-ink-100 space-y-3">
                  <div className="flex items-center gap-2.5 text-sm text-ink-500">
                    <Shield
                      size={16}
                      className="text-teal-500"
                    />
                    Identity verified by Haango
                  </div>

                  <div className="flex items-center gap-2.5 text-sm text-ink-500">
                    <BadgeCheck
                      size={16}
                      className="text-teal-500"
                    />
                    {buddy.outings} completed outings
                  </div>

                  <div className="flex items-center gap-2.5 text-sm text-ink-500">
                    <Star
                      size={16}
                      className="text-amber-400"
                    />
                    {buddy.rating} average rating
                  </div>
                </div>
              </div>

              {/* Safety Card */}
              <div className="card p-5">
                <div className="flex items-start gap-3  ">
                  <Shield
                    size={20}
                    className="text-teal-600 shrink-0 mt-0.5"
                  />

                  <div>
                    <p className="font-display font-semibold text-sm text-teal-800">
                      Your safety is priority
                    </p>

                    <p className="text-xs text-teal-600 mt-1 leading-relaxed">
                      Always meet in public places. Never share
                      payment outside Haango. Report any concerns
                      immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile booking bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden glass border-t border-ink-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-display font-bold text-lg text-ink-900">
              ₹{buddy.pricePerHour}
              <span className="text-xs font-normal text-ink-400">
                /hr
              </span>
            </div>

            {buddy.available && (
              <div className="text-xs text-success-600 font-medium">
                Available
              </div>
            )}
          </div>

          <button
            onClick={() => onBook(buddy.id)}
            disabled={!buddy.available}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            Book {buddy.name}
          </button>
        </div>
      </div>
    </div>
  );
}
