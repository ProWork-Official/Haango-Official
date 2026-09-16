import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Clapperboard,
  Coffee,
  ShoppingBag,
  Utensils,
  Ticket,
  MapPin,
  Sparkles,
} from 'lucide-react';
import BuddyCard from '../Components/BuddyCard';
import { GridSkeleton } from '../Components/Skeletons';
import { EmptyState } from '../Components/States';

const cityOptions = ['Prayagraj', 'Lucknow', 'Greater Noida', 'Noida', 'Kanpur'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

const hobbyIconMap = {
  'movie night': Clapperboard,
  'coffee & conversation': Coffee,
  shopping: ShoppingBag,
  'lunch / dinner': Utensils,
  events: Ticket,
  'explore the city': MapPin,
};

function getHobbyIcon(hobby) {
  const key = String(hobby || '').trim().toLowerCase();
  return hobbyIconMap[key] || Sparkles;
}

async function apiRequest(path, options = {}) {
  const accessToken = localStorage.getItem('haango_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload?.data || payload?.buddies || payload;
}

function isBuddyAvailableNow(buddy = {}) {
  const slots = Array.isArray(buddy.availability) ? buddy.availability : [];
  if (!slots.length) {
    return buddy.isAvailable !== false && buddy.available !== false;
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.some((slot) => {
    if (slot?.isAvailable === false) return false;

    const slotDay = String(slot?.day || '').toLowerCase();
    const matchesDay =
      slotDay === currentDay ||
      (slotDay === 'weekdays' && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(currentDay)) ||
      (slotDay === 'weekends' && ['saturday', 'sunday'].includes(currentDay));

    if (!matchesDay) return false;

    const [startHour, startMinute] = String(slot?.startTime || '00:00').split(':').map(Number);
    const [endHour, endMinute] = String(slot?.endTime || '23:59').split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    return Number.isFinite(start) && Number.isFinite(end) && currentMinutes >= start && currentMinutes <= end;
  });
}

const ExplorePage = ({ onSelectBuddy }) => {
  const [loading, setLoading] = useState(true);
  const [buddies, setBuddies] = useState([]);
  const [hobbyOptions, setHobbyOptions] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedHobbies, setSelectedHobbies] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedBuddyIds, setLikedBuddyIds] = useState([]);

  useEffect(() => {
    let active = true;

    const loadBuddies = async () => {
      setLoading(true);

      try {
        const response = await apiRequest('/buddies');
        const nextBuddies = Array.isArray(response) ? response : response?.buddies || [];

        if (!active) return;

        const mappedBuddies = nextBuddies.map((buddy) => {
          const hobbies = Array.isArray(buddy.hobbies) && buddy.hobbies.length
            ? buddy.hobbies
            : (Array.isArray(buddy.interests) ? buddy.interests : []);

          return {
            id: buddy.id || buddy._id,
            name: buddy.displayName || buddy.name || 'Buddy',
            age: Number(buddy.age || 25),
            tagline: buddy.summary || buddy.tagline || buddy.bio || 'Fun, easygoing, and always up for a good time.',
            image: buddy.profileImages?.[0] || buddy.userId?.profileImage || '',
            gallery: Array.isArray(buddy.profileImages) ? buddy.profileImages : [],
            rating: Number(buddy.rating || 0),
            outings: Number(buddy.completedBookings || buddy.outings || 0),
            pricePerHour: Number(buddy.hourlyRate || 300),
            location: buddy.city || buddy.location || 'Unknown city',
            hobbies,
            interests: hobbies,
            activities: Array.isArray(buddy.activities) ? buddy.activities : [],
            verified: buddy.verificationStatus === 'VERIFIED' || Boolean(buddy.verified),
            available: isBuddyAvailableNow({ availability: buddy.availability, isAvailable: buddy.isAvailable, available: buddy.available }),
            about: buddy.bio || buddy.about || 'A great companion for a memorable time out.',
            languages: Array.isArray(buddy.languages) ? buddy.languages : [],
            availability: Array.isArray(buddy.availability) ? buddy.availability : [],
            responseTime: buddy.responseTime || 'Usually replies in a few hours',
            reviews: Array.isArray(buddy.reviews) ? buddy.reviews : [],
            showOnFindCompanions: buddy.showOnFindCompanions !== false,
          };
        });

        setBuddies(mappedBuddies);
        setHobbyOptions(Array.from(new Set(mappedBuddies.flatMap((buddy) => buddy.hobbies))).sort((a, b) => a.localeCompare(b)));

        if (localStorage.getItem('haango_access_token')) {
          const liked = await apiRequest('/profile/liked-buddies');
          setLikedBuddyIds((Array.isArray(liked) ? liked : []).map((item) => String(item._id || item.id)));
        }
      } catch (error) {
        console.error('Failed to load buddies:', error);
        if (active) {
          setBuddies([]);
          setHobbyOptions([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBuddies();
    return () => { active = false; };
  }, []);

  const toggleLike = async (buddyId) => {
    if (!localStorage.getItem('haango_access_token')) return;
    const result = await apiRequest(`/profile/liked-buddies/${buddyId}/toggle`, { method: 'POST' });
    setLikedBuddyIds((current) => result.liked
      ? [...new Set([...current, String(buddyId)])]
      : current.filter((id) => id !== String(buddyId)));
  };

  const filtered = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return buddies.filter((buddy) => {
      const name = String(buddy.name || '').toLowerCase();
      const city = String(buddy.location || '').toLowerCase();
      const languages = Array.isArray(buddy.languages) ? buddy.languages.map((language) => String(language).toLowerCase()) : [];
      const hobbies = Array.isArray(buddy.hobbies) ? buddy.hobbies.map((hobby) => String(hobby).toLowerCase()) : [];

      if (selectedCity && city !== selectedCity.toLowerCase()) {
        return false;
      }

      if (selectedHobbies.length > 0 && !selectedHobbies.some((hobby) => hobbies.includes(String(hobby).toLowerCase()))) {
        return false;
      }

      if (Number(buddy.rating || 0) < minRating) {
        return false;
      }

      if (availableOnly && !buddy.available) {
        return false;
      }

      if (normalizedSearch) {
        const searchTargets = [
          name,
          city,
          String(buddy.tagline || ''),
          String(buddy.about || ''),
          ...languages,
          ...hobbies,
        ];

        const matchesSearch = searchTargets.some((value) => String(value).toLowerCase().includes(normalizedSearch));
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [buddies, selectedCity, selectedHobbies, minRating, availableOnly, searchQuery]);

  const toggleHobby = (hobby) => {
    setSelectedHobbies((current) => current.includes(hobby)
      ? current.filter((item) => item !== hobby)
      : [...current, hobby]);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
    console.log('Search submitted:', searchInput.trim());
  };

  const clearFilters = () => {
    setSelectedCity('');
    setSelectedHobbies([]);
    setMinRating(0);
    setAvailableOnly(false);
    setSearchQuery('');
    setSearchInput('');
  };

  const activeFilterCount =
    selectedHobbies.length +
    (selectedCity ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (availableOnly ? 1 : 0);

  return (
    <div className="pt-16 md:pt-18 animate-fade-in min-h-screen">
      <div className="bg-white border-b border-[#EDEDED]">
        <div className="container-max section-pad py-6">
          <h1 className="Lato font-extrabold text-3xl sm:text-4xl text-ink-900 tracking-tight">
            Find Your Haango
          </h1>

          <p className="mt-2 text-[#787b85] font-medium">
            People you'd actually enjoy spending time with.
          </p>

          <form className="flex gap-3 mt-6" onSubmit={submitSearch}>
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#787b85]" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    submitSearch(event);
                  }
                }}
                placeholder="Search by name, city, language, or hobby..."
                className="input-field !pl-12 font-semibold"
              />
            </div>
            <button type="submit" className="btn-primary shrink-0" aria-label="Search companions" onClick={submitSearch}>
              <Search size={17} />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              type="button"
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`chip border ${availableOnly ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]' : 'bg-white text-[#3F4454] border-[#b2b3ba] hover:border-[#5c5f6b]'}`}
            >
              Available now
            </button>

            {hobbyOptions.map((hobby) => {
              const Icon = getHobbyIcon(hobby);

              return (
                <button
                  key={hobby}
                  type="button"
                  onClick={() => toggleHobby(hobby)}
                  className={`chip border ${selectedHobbies.includes(hobby) ? 'bg-[#0F1117] text-white border-[#0F1117]' : 'bg-white text-[#3F4454] border-[#b2b3ba] hover:border-[#5c5f6b]'}`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={14} />
                    <span>{hobby}</span>
                  </span>
                </button>
              );
            })}

            <select
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="chip border bg-white text-[#3F4454] border-[#b2b3ba] hover:border-[#5c5f6b] cursor-pointer"
            >
              <option value="">All cities</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="chip text-[#3F4454] hover:text-error-500">
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container-max section-pad py-8">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-ink-500">
            {loading ? 'Searching...' : `${filtered.length} ${filtered.length === 1 ? 'Companion' : 'Companions'} Found`}
          </p>

          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-ink-400">Min rating:</span>
            {[0, 4, 4.5, 4.8].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setMinRating(rating)}
                className={`chip border ${minRating === rating ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-[#3F4454] border-[#b2b3ba] hover:border-[#5c5f6b]'}`}
              >
                {rating === 0 ? 'Any' : `${rating}+`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <GridSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={32} />}
            title="No buddy available"
            description="Try widening your search or clearing some filters."
            action={{ label: 'Clear filters', onClick: clearFilters }}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {filtered.map((buddy, index) => (
              <BuddyCard
                key={buddy.id}
                buddy={buddy}
                index={index}
                onClick={() => onSelectBuddy(buddy.id)}
                liked={likedBuddyIds.includes(String(buddy.id))}
                onLike={toggleLike}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
