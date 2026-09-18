import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import BuddyCard from '../Components/BuddyCard';

const hobbyOptions = [
  'Travel', 'Coffee', 'Movies', 'Fitness', 'Shopping', 'Dining', 'Photography',
  'Art', 'Gaming', 'Music', 'Books', 'Adventure', 'Food', 'Culture', 'Wellness',
];

function getDraftState(profile, passedDraft = null) {
  const draft = passedDraft || {};

  return {
    name: draft.name || profile?.name || profile?.full_name || '',
    dob: draft.dob || profile?.dob || profile?.dateOfBirth || '',
    hobbiesText: draft.hobbiesText || (profile?.hobbies || []).join(', '),
    address: draft.address || profile?.address || '',
  };
}

export default function DashboardPage({ onNavigate, onSelectBuddy, onMessage }) {
  const { profile, updateProfile, dismissProfilePrompt } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState(profile?.name || profile?.full_name || '');
  const [dob, setDob] = useState(profile?.dob || '');
  const [hobbiesText, setHobbiesText] = useState((profile?.hobbies || []).join(', '));
  const [address, setAddress] = useState(profile?.address || '');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [likedBuddies, setLikedBuddies] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [editingField, setEditingField] = useState(null);

  const completion = useMemo(() => {
    const totalSteps = 3;
    const stepStatus = [
      Boolean(name.trim() && dob),
      Boolean(hobbiesText.trim()),
      Boolean(address.trim()),
    ];

    return Math.round((stepStatus.filter(Boolean).length / totalSteps) * 100);
  }, [address, dob, hobbiesText, name]);

  const isCompanionUser = profile?.user_type === 'buddy' || profile?.role === 'BUDDY';
  const isProfileComplete = completion >= 100;
  const quickWinTasks = [
    { label: 'Add your name', complete: Boolean(name.trim()) },
    { label: 'Set your date of birth', complete: Boolean(dob) },
    { label: 'Share your hobbies', complete: Boolean(hobbiesText.trim()) },
  ];
  const allQuickWinsComplete = quickWinTasks.every((task) => task.complete);

  const earliestUpcomingBooking = useMemo(() => {
    const now = Date.now();
    return upcomingBookings
      .filter((booking) => new Date(booking.date).getTime() >= now && !['CANCELLED', 'REJECTED'].includes(booking.bookingStatus))
      .sort((first, second) => {
        const firstTime = new Date(first.date).getTime();
        const secondTime = new Date(second.date).getTime();
        return firstTime - secondTime || String(first.startTime).localeCompare(String(second.startTime));
      })[0] || null;
  }, [upcomingBookings]);

  useEffect(() => {
    let active = true;
    apiRequest('/blocks')
      .then((data) => { if (active) setBlockedUsers(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (active) setBlockedLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest('/bookings/my-bookings')
      .then((data) => { if (active) setUpcomingBookings(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest('/profile/liked-buddies')
      .then((data) => { if (active) setLikedBuddies(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const toggleLikedBuddy = async (buddyId) => {
    const result = await apiRequest(`/profile/liked-buddies/${buddyId}/toggle`, { method: 'POST' });
    if (!result.liked) setLikedBuddies((current) => current.filter((buddy) => String(buddy._id) !== String(buddyId)));
  };

  const unblockUser = async (userId) => {
    try {
      await apiRequest(`/blocks/${userId}`, { method: 'DELETE' });
      setBlockedUsers((current) => current.filter((item) => String(item.blockedUserId?._id || item.blockedUserId) !== String(userId)));
    } catch (unblockError) {
      setMessage(unblockError.message || 'Unable to unblock this person.');
    }
  };

  useEffect(() => {
    if (!profile) return;

    const savedDraft = localStorage.getItem(`haango-profile-draft-${profile.id}`);
    const draft = savedDraft ? JSON.parse(savedDraft) : null;
    const next = getDraftState(profile, draft);

    setName(next.name);
    setDob(next.dob);
    setHobbiesText(next.hobbiesText);
    setAddress(next.address);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const draft = {
      name,
      dob,
      hobbiesText,
      address,
    };

    localStorage.setItem(`haango-profile-draft-${profile.id}`, JSON.stringify(draft));
  }, [profile, name, dob, hobbiesText, address]);

  const saveProfile = async () => {
    if (!profile || saving) return;

    const hasAllRequiredFields = Boolean(name.trim() && dob && hobbiesText.trim() && address.trim());
    if (!hasAllRequiredFields) {
      setMessage('Please complete all profile steps before saving.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      name: name.trim(),
      dateOfBirth: dob || null,
      hobbies: hobbiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      address: address.trim(),
    };

    const result = await updateProfile(payload);
    setSaving(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    localStorage.removeItem(`haango-profile-draft-${profile.id}`);
    setMessage('Profile saved successfully.');
    setEditingField(null);
    if (typeof dismissProfilePrompt === 'function') {
      await dismissProfilePrompt();
    }
  };

  const toggleHobby = (hobby) => {
    const selected = hobbiesText.split(',').map((item) => item.trim()).filter(Boolean);
    const nextSelected = selected.includes(hobby)
      ? selected.filter((item) => item !== hobby)
      : [...selected, hobby];
    setHobbiesText(nextSelected.join(', '));
  };

  return (
    <div className="pt-16 md:pt-18 animate-fade-in min-h-screen pb-20 md:pb-8">
      <div className="container-max section-pad py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#F25C3A] to-[#f07559] flex items-center justify-center text-white font-display font-bold text-lg">
              {(profile?.full_name || profile?.name || 'H').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
                Hey, {profile?.full_name || profile?.name || 'there'}
              </h1>
              <p className="text-sm text-[#425066] font-medium">Your Haango dashboard is ready.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isCompanionUser && (
              <button className="btn-secondary w-full sm:w-auto" onClick={() => onNavigate('buddy-dashboard')}>
                Open buddy dashboard
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {!isProfileComplete && (
          <div className="mb-8 rounded-3xl border border-amber-100 bg-linear-to-r from-amber-50 to-orange-50 p-5 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Profile progress</p>
                <p className="mt-2 text-2xl font-display font-extrabold text-ink-900">{completion}% complete</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-40 overflow-hidden rounded-full bg-white/80">
                  <div className="h-full rounded-full bg-linear-to-r from-coral-500 to-orange-500" style={{ width: `${completion}%` }} />
                </div>
                <span className="text-sm font-semibold text-ink-600">{completion}/100</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-ink-900">Liked profiles</h2>
                <span className="text-xs text-ink-400">{likedBuddies.length} saved</span>
              </div>
              {likedBuddies.length ? (
                <div className="grid grid-cols sm:grid-cols-2 gap-3">
                  {likedBuddies.map((buddy) => (
                    <BuddyCard
                      key={buddy._id}
                      buddy={{
                        id: buddy._id,
                        name: buddy.displayName || buddy.userId?.name || 'Buddy',
                        age: buddy.age,
                        image: buddy.profileImages?.[0] || '',
                        rating: Number(buddy.rating || 0),
                        outings: Number(buddy.completedBookings || 0),
                        tagline: buddy.summary || buddy.about || '',
                        interests: buddy.hobbies || [],
                        location: buddy.city,
                        pricePerHour: buddy.hourlyRate,
                        verified: buddy.verificationStatus === 'VERIFIED',
                        available: buddy.isAvailable !== false,
                      }}
                      liked
                      onLike={toggleLikedBuddy}
                      onClick={() => onSelectBuddy?.(buddy._id)}
                    />
                  ))}
                </div>
              ) : <p className="text-sm text-ink-500">Profiles you like will appear here.</p>}
            </div>

            <div className="card p-5">
              <h2 className="font-display text-xl font-bold text-ink-900">Profile snapshot</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-ink-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Name</p>
                    <button type="button" className="btn-ghost px-2 py-1 text-[10px]" onClick={() => setEditingField('name')}>Update</button>
                  </div>
                  {editingField === 'name' ? (
                    <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 font-display text-lg font-bold text-ink-900 outline-none focus:border-coral-400" placeholder="Add your name" />
                  ) : <p className="mt-2 font-display text-lg font-bold text-ink-900">{name || 'Not added yet'}</p>}
                </div>
                <div className="rounded-2xl bg-ink-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-400">DOB</p>
                    <button type="button" className="btn-ghost px-2 py-1 text-[10px]" onClick={() => setEditingField('dob')}>Update</button>
                  </div>
                  {editingField === 'dob' ? (
                    <input type="date" value={dob ? String(dob).slice(0, 10) : ''} onChange={(event) => setDob(event.target.value)} className="mt-2 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 font-display text-lg font-bold text-ink-900 outline-none focus:border-coral-400" />
                  ) : <p className="mt-2 font-display text-lg font-bold text-ink-900">{dob ? new Date(dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set yet'}</p>}
                </div>
                <div className="rounded-2xl bg-ink-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Email</p>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400">Locked</span>
                  </div>
                  <p className="mt-2 font-display text-lg font-bold text-ink-900">{profile?.email || 'Not added yet'}</p>
                </div>
                <div className="rounded-2xl bg-ink-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Phone</p>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-ink-400">Locked</span>
                  </div>
                  <p className="mt-2 font-display text-lg font-bold text-ink-900">{profile?.phone || 'Not added yet'}</p>
                </div>
                <div className="rounded-2xl bg-ink-50 p-4 sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Hobbies</p>
                    <button type="button" className="btn-ghost px-2 py-1 text-[10px]" onClick={() => setEditingField('hobbies')}>Update</button>
                  </div>
                  {editingField === 'hobbies' ? (
                    <>
                      <textarea value={hobbiesText} onChange={(event) => setHobbiesText(event.target.value)} rows={2} className="mt-2 w-full resize-y rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-coral-400" placeholder="Travel, coffee, movies..." />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {hobbyOptions.map((hobby) => {
                          const selected = hobbiesText.split(',').map((item) => item.trim()).filter(Boolean).includes(hobby);
                          return <button key={hobby} type="button" onClick={() => toggleHobby(hobby)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected ? 'border-[#FF6B4A] bg-[#FF6B4A] text-white shadow-glow' : 'border-[#EEEFF2] text-[#898c94] bg-white hover:border-ink-200'}`}>{hobby}</button>;
                        })}
                      </div>
                    </>
                  ) : <p className="mt-2 font-display text-lg font-bold text-ink-900">{hobbiesText || 'Add your interests'}</p>}
                </div>
                <div className="rounded-2xl bg-ink-50 p-4 sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Address</p>
                    <button type="button" className="btn-ghost px-2 py-1 text-[10px]" onClick={() => setEditingField('address')}>Update</button>
                  </div>
                  {editingField === 'address' ? (
                    <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-coral-400" placeholder="Tell people where you usually hang out" />
                  ) : <p className="mt-2 font-display text-lg font-bold text-ink-900">{address || 'Tell people where you usually hang out'}</p>}
                  {editingField && (
                    <button type="button" onClick={saveProfile} disabled={saving} className="btn-primary mt-4 w-full disabled:opacity-60">
                      {saving ? 'Saving...' : 'Save profile changes'}
                    </button>
                  )}
                  {message && <p className="mt-3 text-sm text-coral-600">{message}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {allQuickWinsComplete ? (
              <div className="card p-5">
                <div className="mb-4 flex items-center gap-2 text-coral-600">
                  <Calendar size={18} />
                  <p className="font-display text-lg font-bold text-ink-900">Upcoming booking</p>
                </div>
                {earliestUpcomingBooking ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={earliestUpcomingBooking.buddyProfileId?.profileImages?.[0] || ''}
                        alt={earliestUpcomingBooking.buddyProfileId?.displayName || 'Buddy'}
                        className="h-14 w-14 rounded-2xl bg-coral-50 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-ink-900">{earliestUpcomingBooking.activityId?.name || earliestUpcomingBooking.activitySlug}</p>
                        <p className="mt-1 text-sm text-ink-600">with {earliestUpcomingBooking.buddyProfileId?.displayName || 'your buddy'}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-ink-500">
                      <p>{new Date(earliestUpcomingBooking.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} {earliestUpcomingBooking.startTime}</p>
                      <p>{earliestUpcomingBooking.meetingLocation}</p>
                    </div>
                    <button type="button" onClick={() => onMessage?.(earliestUpcomingBooking._id)} className="btn-primary w-full">
                      View booking
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ) : <p className="text-sm text-ink-500">No upcoming bookings yet.</p>}
              </div>
            ) : (
              <div className="card p-5">
                <div className="mb-4 flex items-center gap-2 text-coral-600">
                  <Sparkles size={18} />
                  <p className="font-display text-lg font-bold text-ink-900">Quick wins</p>
                </div>

                <div className="space-y-3 text-sm text-ink-600">
                  {quickWinTasks.map((task) => (
                    <div key={task.label} className={`flex items-center gap-2 ${task.complete ? 'text-success-600' : 'text-ink-600'}`}>
                      {task.complete ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      {task.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('bookings')}
              className="btn-primary w-full"
            >
              View all bookings
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('messages')}
              className="btn-secondary w-full"
            >
              Open messages
            </button>

            {['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role) && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="btn-primary w-full"
              >
                Admin Dashboard
                <ChevronRight size={16} />
              </button>
            )}

            <div className="card p-5">
              <p className="font-display text-lg font-bold text-ink-900">Blocked people</p>
              {blockedLoading ? (
                <p className="mt-3 text-sm text-ink-500">Loading blocked people...</p>
              ) : blockedUsers.length ? (
                <div className="mt-4 space-y-3">
                  {blockedUsers.map((blocked) => {
                    const person = blocked.blockedUserId;
                    const personId = person?._id || person;
                    return (
                      <div key={blocked._id} className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3">
                        <p className="truncate text-sm font-semibold text-ink-800">{person?.name || 'Blocked user'}</p>
                        <button type="button" onClick={() => unblockUser(personId)} className="text-xs font-semibold text-coral-600 hover:text-coral-700">Unblock</button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-500">You have not blocked anyone.</p>
              )}
            </div>

            <div className="card p-5">
              <p className="font-display text-lg font-bold text-ink-900">Ready to grow?</p>
              <p className="mt-2 text-sm text-ink-600">A complete profile helps you get the best Haango matches and richer conversations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
