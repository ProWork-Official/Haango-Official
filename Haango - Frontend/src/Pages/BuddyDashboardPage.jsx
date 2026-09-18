import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  IndianRupee,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Loader2,
  Plus,
  Save,
  Trash2,
  ImagePlus,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import WalletPanel from '../Components/WalletPanel';
import { requestLocationPermission } from '../lib/location';

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getGreetingByTime() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

const demoBuddy = {
  name: 'Aarav Sharma',
  rating: 0,
  profileCompletion: 88,
};

const emptyProfile = {
  displayName: '',
  age: '',
  gender: 'PREFER_NOT_TO_SAY',
  about: '',
  summary: '',
  city: '',
  languages: '',
  hobbies: [],
  hobbiesText: '',
  hourlyRate: 300,
  responseTime: '',
  profileImages: [],
  girlsOnly: false,
  availability: [{ day: 'monday', startTime: '09:00', endTime: '18:00', isAvailable: true }],
};

const cityOptions = ['Prayagraj', 'Lucknow', 'Greater Noida', 'Noida', 'Kanpur'];
const languageOptions = ['English', 'Hindi', 'Bengali', 'Marathi', 'Tamil', 'Telugu', 'Urdu'];
const responseTimeOptions = [
  'Usually replies within 15 minutes',
  'Usually replies within 30 minutes',
  'Usually replies within 45 minutes',
  'Usually replies within 1 hour',
];
const hobbyOptions = ['Movie Night', 'Coffee & Conversation', 'Shopping', 'Lunch / Dinner', 'Events', 'Explore the City'];

function profileToForm(profile, user) {
  return {
    ...emptyProfile,
    displayName: profile?.displayName || user?.name || '',
    age: profile?.age || '',
    gender: profile?.gender || user?.gender || 'PREFER_NOT_TO_SAY',
    about: profile?.about || '',
    summary: profile?.summary || '',
    city: profile?.city || user?.city || '',
    languages: Array.isArray(profile?.languages) ? profile.languages.join(', ') : '',
    hobbies: Array.isArray(profile?.hobbies) ? profile.hobbies : [],
    hobbiesText: Array.isArray(profile?.hobbies) ? profile.hobbies.join(', ') : '',
    hourlyRate: profile?.hourlyRate ?? 300,
    responseTime: profile?.responseTime || '',
    profileImages: Array.isArray(profile?.profileImages) ? profile.profileImages : [],
    girlsOnly: Boolean(profile?.girlsOnly),
    availability: Array.isArray(profile?.availability) && profile.availability.length
      ? profile.availability
      : emptyProfile.availability,
  };
}

function ProfileEditor({ profile, user, loading, onSaved }) {
  const [form, setForm] = useState(() => profileToForm(profile, user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const syncProfileForm = () => setForm(profileToForm(profile, user));
    queueMicrotask(syncProfileForm);
  }, [profile, user]);

  const updateField = (field, value) => {
    setSaved(false);
    if (field === 'hourlyRate') {
      if (value === '') {
        setError('');
      } else {
        const rawValue = String(value).replace(/[^\d]/g, '');
        const numericRate = Number(rawValue);
        setError(Number.isFinite(numericRate) && (numericRate < 300 || numericRate > 400)
          ? 'Hourly rate must be between ₹300 and ₹400.'
          : '');
        setForm((current) => ({
          ...current,
          [field]: rawValue,
          ...(field === 'gender' && value !== 'FEMALE' ? { girlsOnly: false } : {}),
        }));
        return;
      }
    }
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'gender' && value !== 'FEMALE' ? { girlsOnly: false } : {}),
    }));
  };

  const toggleLanguage = (language) => {
    const selectedLanguages = form.languages.split(',').map((item) => item.trim()).filter(Boolean);
    const nextLanguages = selectedLanguages.includes(language)
      ? selectedLanguages.filter((item) => item !== language)
      : [...selectedLanguages, language];
    updateField('languages', nextLanguages.join(', '));
  };
  const toggleHobby = (hobby) => {
    const typedHobbies = form.hobbiesText.split(',').map((item) => item.trim()).filter(Boolean);
    const nextHobbies = typedHobbies.includes(hobby)
      ? typedHobbies.filter((item) => item !== hobby)
      : [...typedHobbies, hobby];
    updateField('hobbies', nextHobbies);
    updateField('hobbiesText', nextHobbies.join(', '));
  };

  const addPhotoFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;

    try {
      const images = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => {
            const maxSide = 1200;
            const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * ratio));
            canvas.height = Math.max(1, Math.round(image.height * ratio));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
          };
          image.onerror = () => reject(new Error('Image upload failed'));
          image.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error('Image upload failed'));
        reader.readAsDataURL(file);
      })));
      updateField('profileImages', [...form.profileImages, ...images]);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      event.target.value = '';
    }
  };

  const updateAvailability = (index, field, value) => {
    setSaved(false);
    setForm((current) => ({
      ...current,
      availability: current.availability.map((slot, slotIndex) => (
        slotIndex === index ? { ...slot, [field]: value } : slot
      )),
    }));
  };

  const addAvailability = () => {
    setForm((current) => ({
      ...current,
      availability: [...current.availability, { day: 'monday', startTime: '09:00', endTime: '18:00', isAvailable: true }],
    }));
  };

  const removeAvailability = (index) => {
    setForm((current) => ({
      ...current,
      availability: current.availability.filter((_, slotIndex) => slotIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);

    if (form.about.trim().length < 20) {
      setError('Tell customers a little more about you with at least 20 characters.');
      return;
    }
    if (form.summary.trim().length < 10) {
      setError('Add a short summary of at least 10 characters.');
      return;
    }
    if (!form.availability.length) {
      setError('Add at least one availability slot.');
      return;
    }
    if (Number(form.hourlyRate) < 300 || Number(form.hourlyRate) > 400) {
      setError('Hourly rate must be between ₹300 and ₹400.');
      return;
    }
    if (!profile && form.profileImages.length < 2) {
      setError('Upload at least 2 photos to create your buddy profile.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        hourlyRate: Number(form.hourlyRate),
        languages: form.languages.split(',').map((language) => language.trim()).filter(Boolean),
          hobbies: form.hobbiesText.split(',').map((hobby) => hobby.trim()).filter(Boolean),
        profileImages: form.profileImages,
      };
      if (!profile) await requestLocationPermission();
      const response = profile?._id
        ? await apiRequest('/buddies/profile/me', { method: 'PATCH', body: JSON.stringify(payload) })
        : await apiRequest('/buddies/profile', { method: 'POST', body: JSON.stringify(payload) });
      onSaved(response);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'input-field mt-1';

  return (
    <div className="card p-6 mb-8" id="buddy-profile-editor">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-coral-500">
            Profile details
          </p>
          <h2 className="font-display font-bold text-xl text-ink-900 mt-1">
            Update your buddy profile
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            Complete these details so customers know what to expect.
          </p>
        </div>
        {profile?.verificationStatus && (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            {profile.verificationStatus === 'VERIFIED' ? 'Verified' : 'Pending review'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-500 py-8">
          <Loader2 size={18} className="animate-spin" /> Loading your profile...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm font-medium text-ink-700">
              Display name
              <input className={inputClass} value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} required minLength={2} maxLength={100} />
            </label>
            <label className="text-sm font-medium text-ink-700">
              Age
              <input className={`${inputClass} appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} type="number" min="18" max="120" value={form.age} onChange={(event) => updateField('age', event.target.value)} required />
            </label>
            <label className="text-sm font-medium text-ink-700">
              Gender
              <select className={inputClass} value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink-700">Hobbies</p>
                        <p className="mt-1 text-xs text-ink-400">Choose the experiences you enjoy offering.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {hobbyOptions.map((hobby) => (
                            <button key={hobby} type="button" onClick={() => toggleHobby(hobby)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${form.hobbiesText.split(',').map((item) => item.trim()).includes(hobby) ? 'border-coral-500 bg-coral-500 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-coral-300'}`}>
                              {hobby}
                            </button>
                          ))}
                        </div>
                        <input
                          className={inputClass}
                          value={form.hobbiesText}
                          onChange={(event) => updateField('hobbiesText', event.target.value)}
                          placeholder="Add another hobby, separated by commas"
                          aria-label="Custom hobbies"
                        />
                      </div>
            <label className="text-sm font-medium text-ink-700">
              City
              <select className={inputClass} value={form.city} onChange={(event) => updateField('city', event.target.value)} required>
                <option value="">Select your city</option>
                {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-ink-700">
              Languages <span className="font-normal text-ink-400">(select all that apply)</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {languageOptions.map((language) => {
                  const selected = form.languages.split(',').map((item) => item.trim()).filter(Boolean).includes(language);
                  return (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggleLanguage(language)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected ? 'border-coral-500 bg-coral-500 text-white' : 'border-ink-200 bg-white text-ink-600 hover:border-coral-300'}`}
                    >
                      {language}
                    </button>
                  );
                })}
              </div>
            </label>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-ink-900">Profile photos</h3>
                <p className="mt-1 text-xs text-ink-400">Upload at least 2 photos to create your profile. You can add more anytime.</p>
              </div>
              <label className="btn-ghost cursor-pointer text-xs">
                <ImagePlus size={15} /> Add photos
                <input type="file" accept="image/*" multiple onChange={addPhotoFiles} className="hidden" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {form.profileImages.map((image, index) => (
                <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
                  <img src={image} alt={`Profile ${index + 1}`} className="h-28 w-full object-cover" />
                  <button type="button" onClick={() => updateField('profileImages', form.profileImages.filter((_, photoIndex) => photoIndex !== index))} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-ink-700 shadow-sm" aria-label={`Remove profile photo ${index + 1}`}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-ink-700">
              Short summary
              <input className={inputClass} value={form.summary} onChange={(event) => updateField('summary', event.target.value)} required minLength={10} maxLength={300} />
            </label>
            <label className="text-sm font-medium text-ink-700">
              About you
              <textarea className={`${inputClass} min-h-28 resize-y`} value={form.about} onChange={(event) => updateField('about', event.target.value)} required minLength={20} maxLength={2000} />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-ink-700">
              Hourly rate (INR)
              <input className={`${inputClass} appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} type="number" min="300" max="400" step="10" value={form.hourlyRate} onChange={(event) => updateField('hourlyRate', event.target.value)} required />
              <p className="mt-1 text-xs text-ink-400">Choose a rate between ₹300 and ₹400.</p>
            </label>
            <label className="text-sm font-medium text-ink-700">
              Response time
              <select className={inputClass} value={form.responseTime} onChange={(event) => updateField('responseTime', event.target.value)} required>
                <option value="">Select response time</option>
                {responseTimeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold text-ink-900">Availability</h3>
                <p className="text-xs text-ink-400 mt-1">Customers can request bookings during these times.</p>
              </div>
              <button type="button" className="btn-ghost text-xs" onClick={addAvailability}>
                <Plus size={15} /> Add slot
              </button>
            </div>
            <div className="space-y-3">
              {form.availability.map((slot, index) => (
                <div key={`${slot.day}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <label className="text-xs text-ink-500">
                    Day
                    <select className={inputClass} value={slot.day} onChange={(event) => updateAvailability(index, 'day', event.target.value)}>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => <option key={day} value={day}>{day[0].toUpperCase() + day.slice(1)}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-ink-500">
                    From
                    <input className={inputClass} type="time" value={slot.startTime} onChange={(event) => updateAvailability(index, 'startTime', event.target.value)} />
                  </label>
                  <label className="text-xs text-ink-500">
                    To
                    <input className={inputClass} type="time" value={slot.endTime} onChange={(event) => updateAvailability(index, 'endTime', event.target.value)} />
                  </label>
                  {form.availability.length > 1 && (
                    <button type="button" className="btn-ghost !px-2 text-ink-400 hover:text-coral-500" onClick={() => removeAvailability(index)} aria-label="Remove availability slot">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-5 border-t border-ink-100 pt-5">
            {(form.gender === 'FEMALE' ? [['girlsOnly', 'Girls-only bookings']] : []).map(([field, label]) => (
              <label key={field} className="inline-flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
                <input type="checkbox" checked={form[field]} onChange={(event) => updateField(field, event.target.checked)} className="accent-coral-500" />
                {label}
              </label>
            ))}
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {saved && <p className="rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">Profile saved successfully.</p>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {saving ? 'Saving...' : profile ? 'Save changes' : 'Create profile'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function BuddyDashboardPage({ onNavigate }) {
  const { user, profile: authProfile } = useAuth();
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [buddyProfile, setBuddyProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [buddyBookings, setBuddyBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [becameBuddy, setBecameBuddy] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState('profile');
  const [editingPanel, setEditingPanel] = useState(null);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const isBuddyAccount = becameBuddy || authProfile?.role === 'BUDDY' || authProfile?.user_type === 'buddy' || authProfile?.is_buddy;

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await apiRequest('/buddies/profile/me');
        if (active) {
          setBuddyProfile(response);
          if (response?._id) setBecameBuddy(true);
          const hasCompleteProfile = Boolean(response?._id && Array.isArray(response.profileImages) && response.profileImages.length >= 2);

          if (!hasCompleteProfile) {
            setOnboardingStep('profile');
          } else {
            try {
              const walletSummary = await apiRequest('/wallet');
              setOnboardingStep(walletSummary?.wallet ? 'dashboard' : 'payout');
            } catch (walletError) {
              console.error('Failed to load payout details:', walletError);
              setOnboardingStep('payout');
            }
          }
        }
      } catch (error) {
        console.error('Failed to load buddy profile:', error);
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => { active = false; };
  }, [authProfile?.role, authProfile?.user_type]);

  useEffect(() => {
    let active = true;
    const loadBookings = async () => {
      if (!isBuddyAccount) return;
      try {
        const response = await apiRequest('/bookings/buddy');
        if (active) setBuddyBookings(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to load buddy bookings:', error);
      }
    };
    loadBookings();
    return () => { active = false; };
  }, [isBuddyAccount]);

  useEffect(() => {
    const buddyUserId = buddyProfile?.userId?._id || buddyProfile?.userId;
    if (!buddyUserId) return undefined;
    let active = true;
    apiRequest(`/reviews/buddy/${buddyUserId}`)
      .then((response) => { if (active) setReviews(Array.isArray(response) ? response : []); })
      .catch((error) => console.error('Failed to load buddy reviews:', error));
    return () => { active = false; };
  }, [buddyProfile?.userId]);

  const activeBuddy = {
    ...demoBuddy,
    name: buddyProfile?.displayName || authProfile?.full_name || demoBuddy.name,
    rating: Number(buddyProfile?.rating ?? 0),
    profileCompletion: Number(buddyProfile?.profileCompletion || 0),
    image: buddyProfile?.profileImages?.[0] || '',
  };

  const upcomingBookings = useMemo(() => {
    return buddyBookings
      .filter((booking) => new Date(booking.date).getTime() >= currentTime && !['CANCELLED', 'REJECTED'].includes(booking.bookingStatus))
      .slice(0, 3);
  }, [buddyBookings, currentTime]);

  const totalMonthEarnings = useMemo(() => {
    return buddyBookings
      .filter((booking) => booking.paymentStatus === 'PAID')
      .reduce((sum, booking) => sum + ((Number(booking.totalAmount || 0) - Number(booking.platformFee || 0)) * 0.8), 0);
  }, [buddyBookings]);

  const todayBookings = buddyBookings.filter((booking) => new Date(booking.date).toDateString() === new Date().toDateString()).length;
  const earningsByMonth = Array.from({ length: 12 }, (_, index) => buddyBookings
    .filter((booking) => booking.paymentStatus === 'PAID' && new Date(booking.date).getMonth() === index)
    .reduce((sum, booking) => sum + ((Number(booking.totalAmount || 0) - Number(booking.platformFee || 0)) * 0.8), 0));
  const maxMonthlyEarnings = Math.max(...earningsByMonth, 1);

  const greeting = getGreetingByTime();

  const updateExploreVisibility = async (isVisible) => {
    if (!buddyProfile || visibilitySaving) return;
    setVisibilitySaving(true);
    try {
      const updatedProfile = await apiRequest('/buddies/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ showOnFindCompanions: isVisible }),
      });
      setBuddyProfile(updatedProfile);
    } catch (visibilityError) {
      console.error('Failed to update Explore visibility:', visibilityError);
    } finally {
      setVisibilitySaving(false);
    }
  };

  if (!isBuddyAccount || onboardingStep === 'profile') {
    return (
      <div className="min-h-screen bg-ink-50 pb-20 pt-16 md:pt-18">
        <div className="container-max section-pad py-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-coral-500">Become a companion</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900">Create your buddy profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">Complete your profile to start offering companionship on Haango.</p>
          </div>
          <ProfileEditor
            profile={null}
            user={{
              ...user,
              name: authProfile?.full_name,
              gender: authProfile?.gender,
              city: authProfile?.address,
            }}
            loading={profileLoading}
            onSaved={(nextProfile) => {
              setBuddyProfile(nextProfile);
              setBecameBuddy(true);
              setOnboardingStep('payout');
            }}
          />
        </div>
      </div>
    );
  }

  if (onboardingStep === 'payout') {
    return (
      <div className="min-h-screen bg-ink-50 pb-20 pt-16 md:pt-18">
        <div className="container-max section-pad py-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-coral-500">Almost ready</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900">Payout details</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">Add either your bank account or UPI ID to receive your earnings.</p>
          </div>
          <WalletPanel onboardingOnly onSaved={() => setOnboardingStep('dashboard')} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-18 animate-fade-in min-h-screen pb-20 md:pb-8">
      <div className="container-max section-pad py-8">
        <div className="flex items-center flex-wrap gap-3 mb-8">
          {activeBuddy.image ? (
            <img
              src={activeBuddy.image}
              alt={activeBuddy.name}
              className="w-12 h-12 rounded-2xl object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-2xl bg-coral-100 text-coral-700 flex items-center justify-center font-display font-bold"
              aria-label={`${activeBuddy.name} initials`}
            >
              {getInitials(activeBuddy.name)}
            </div>
          )}

          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-900 tracking-tight">
              {greeting}, {activeBuddy.name}
            </h1>
            <p className="text-sm text-ink-500">Here’s your companion dashboard.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[
            {
              label: "Today's Bookings",
              value: String(todayBookings),
              icon: Calendar,
              color: 'coral',
            },
            {
              label: 'Earned This Month',
              value: formatCurrency(totalMonthEarnings),
              icon: IndianRupee,
              color: 'success',
            },
            {
              label: 'Rating',
              value: `${activeBuddy.rating.toFixed(1)}`,
              icon: Star,
              color: 'amber',
            },
            {
              label: 'Completion Rate',
              value: `${activeBuddy.profileCompletion}%`,
              icon: CheckCircle2,
              color: 'teal',
            },
          ].map((item) => {
            const Icon = item.icon;
            const colorMap = {
              coral: 'text-coral-500 bg-coral-50',
              success: 'text-success-600 bg-success-50',
              amber: 'text-amber-500 bg-amber-50',
              teal: 'text-teal-600 bg-teal-50',
            };

            return (
              <div key={item.label} className="card p-4 md:p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[item.color]}`}>
                  <Icon size={20} />
                </div>
                <p className="font-display font-extrabold text-xl md:text-2xl text-ink-900">{item.value}</p>
                <p className="text-xs text-ink-400 mt-0.5">{item.label}</p>
              </div>
            );
          })}
        </div>

        {editingPanel === 'profile' && (
          <ProfileEditor
            profile={buddyProfile}
            user={{
              ...user,
              name: authProfile?.full_name,
              gender: authProfile?.gender,
              city: authProfile?.address,
            }}
            loading={profileLoading}
            onSaved={(nextProfile) => {
              setBuddyProfile(nextProfile);
              setEditingPanel(null);
            }}
          />
        )}

        {editingPanel === 'payout' ? (
          <div className="mb-8">
            <WalletPanel onboardingOnly onSaved={() => setEditingPanel(null)} />
          </div>
        ) : (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setEditingPanel('profile')} className="btn-secondary w-full sm:w-auto">Update buddy details</button>
              <button type="button" onClick={() => setEditingPanel('payout')} className="btn-secondary w-full sm:w-auto">Update bank detail</button>
            <label className="ml-0 inline-flex w-full cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-ink-700 sm:ml-auto sm:w-auto">
              <span>Show me in Explore</span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={buddyProfile?.showOnFindCompanions !== false}
                disabled={visibilitySaving}
                onChange={(event) => updateExploreVisibility(event.target.checked)}
              />
                <span className="relative h-6 w-11 rounded-full bg-red-500 transition peer-checked:bg-green-500 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-display font-bold text-lg text-ink-900 mb-4">Upcoming bookings</h2>
              <div className="space-y-3">
                {upcomingBookings.length ? upcomingBookings.map((booking) => (
                  <div key={booking._id} className="card p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-coral-50 flex items-center justify-center shrink-0">
                        <Calendar size={20} className="text-coral-500" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-display font-bold text-ink-900">
                            {booking.activityId?.name || booking.activitySlug} with {booking.customerId?.name || 'Customer'}
                          </p>
                          <span className="font-display font-bold text-ink-900">
                            {formatCurrency(booking.totalAmount)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-ink-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            {new Date(booking.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={13} />
                            {booking.startTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={13} />
                            {booking.duration} hrs
                          </span>
                        </div>

                        <p className="text-xs text-ink-400 mt-1">{booking.meetingLocation}</p>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-ink-500">No upcoming bookings.</p>}
              </div>
              <button type="button" onClick={() => onNavigate('buddy-bookings')} className="btn-secondary mt-4 w-full">
                View all bookings
              </button>
              <button type="button" onClick={() => onNavigate('messages')} className="btn-primary mt-3 w-full">
                Open messages
              </button>
            </div>

            <div>
              <h2 className="font-display font-bold text-lg text-ink-900 mb-4">Earnings</h2>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm text-ink-400">This month</p>
                    <p className="font-display font-extrabold text-3xl text-ink-900">
                      {formatCurrency(totalMonthEarnings)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-50 text-success-600 text-sm font-medium">
                    <TrendingUp size={16} />
                    + recent bookings
                  </div>
                </div>

                <div className="flex items-end gap-2 h-32">
                  {earningsByMonth.map((value, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-coral-400 to-coral-500"
                      style={{ height: `${Math.max(4, (value / maxMonthlyEarnings) * 100)}%` }}
                    />
                  ))}
                </div>

                <div className="flex justify-between mt-2 text-[10px] text-ink-400">
                  <span>Jan</span>
                  <span>Mar</span>
                  <span>May</span>
                  <span>Jul</span>
                  <span>Sep</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-display font-bold text-lg text-ink-900 mb-4">Recent reviews</h2>
              <div className="space-y-3">
                {reviews.length ? reviews.map((review) => (
                  <div key={review._id} className="card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-coral-100 flex items-center justify-center font-display font-bold text-coral-600 text-sm">
                          {(review.customerId?.name || review.customerName || 'C').charAt(0)}
                        </div>
                        <span className="font-display font-semibold text-ink-900 text-sm">
                            {review.customerId?.name || review.customerName || 'Customer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={12}
                            className={`text-amber-400 ${index < review.rating ? 'fill-amber-400' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-ink-600 leading-relaxed">{review.comment}</p>
                    <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-ink-50 text-xs font-medium text-ink-500">
                      {review.activityName}
                    </span>
                  </div>
                )) : <p className="text-sm text-ink-500">No reviews yet.</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-display font-bold text-ink-900 mb-4">Profile strength</h3>
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#EEEFF2" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#FF6B4A"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${activeBuddy.profileCompletion * 2.64} 264`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display font-extrabold text-xl text-ink-900">
                    {activeBuddy.profileCompletion}%
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm text-ink-500 bg-amber-50 rounded-2xl p-3">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p>Your profile is strong and active for bookings.</p>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-display font-bold text-ink-900 mb-4">Your availability</h3>
              <div className="space-y-3">
                {(buddyProfile?.availability || []).map((slot) => (
                  <div key={`${slot.day}-${slot.startTime}`} className="flex items-center justify-between">
                    <span className="text-sm text-ink-600">{slot.day}: {slot.startTime} - {slot.endTime}</span>
                    <div className="relative w-11 h-6 rounded-full bg-success-500 cursor-pointer">
                      <span className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white shadow-soft transition-all" />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn-secondary w-full mt-4 text-xs"
                onClick={() => setAvailabilityOpen((current) => !current)}
              >
                Manage availability
              </button>

              {availabilityOpen && (
                <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50 p-4">
                  <p className="text-sm text-ink-600">Availability is managed from your profile settings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
