import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Clock,
  Clapperboard,
  Coffee,
  Gamepad2,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  Utensils,
  Footprints,
  TrendingUp,
  CreditCard,
  Headphones,
} from 'lucide-react';

import BuddyCard from '../Components/BuddyCard';
import { apiRequest } from '../lib/api';
import HeroImage from '../Assets/HeroImageTrans.png';
import Playb from '../Assets/Icon/play.png';
import FAQSection from '../Components/FAQ';
const moodCards = [
  {
    id: 'movie',
    name: 'Movies',
    desc: 'Grab popcorn. Find company.',
    icon: Clapperboard,
    image:
      'https://images.pexels.com/photos/7991258/pexels-photo-7991258.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    desc: 'Your shopping trip just got better.',
    icon: ShoppingBag,
    image:
      'https://images.pexels.com/photos/7155936/pexels-photo-7155936.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
  {
    id: 'coffee',
    name: 'Coffee',
    desc: 'Good coffee. Better company.',
    icon: Coffee,
    image:
      'https://images.pexels.com/photos/5709521/pexels-photo-5709521.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
  {
    id: 'dining',
    name: 'Lunch & Dinner',
    desc: 'Make dinner a plan.',
    icon: Utensils,
    image:
      'https://images.pexels.com/photos/8921578/pexels-photo-8921578.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
  {
    id: 'events',
    name: 'Events',
    desc: 'Concerts, festivals & more.',
    icon: Ticket,
    image:
      'https://images.pexels.com/photos/14364670/pexels-photo-14364670.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
  {
    id: 'explore-city',
    name: 'Explore the City',
    desc: 'Wander like a tourist.',
    icon: Footprints,
    image:
      'https://images.pexels.com/photos/4881146/pexels-photo-4881146.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    desc: 'Co-op, competitive or chill.',
    icon: Gamepad2,
    image:
      'https://images.pexels.com/photos/9068963/pexels-photo-9068963.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
  {
    id: 'sports',
    name: 'Activities',
    desc: 'Badminton, tennis & more.',
    icon: Plane,
    image:
      'https://images.pexels.com/photos/8007500/pexels-photo-8007500.jpeg?auto=compress&cs=tinysrgb&h=400&w=600',
  },
];

const trustItems = [
  { icon: BadgeCheck, label: 'Identity verified' },
  { icon: LockKeyhole, label: 'Secure booking' },
  { icon: MapPin, label: 'Public meetup recommendations' },
  { icon: MessageCircle, label: 'In-app messaging' },
  { icon: Star, label: 'Ratings & reviews' },
  { icon: ShieldCheck, label: 'Report & block' },
  { icon: Sparkles, label: 'Haango support' },
];

const steps = [
  {
    num: '01',
    title: 'Pick an activity.',
    desc: 'Movie, coffee, shopping — whatever the plan.',
  },
  {
    num: '02',
    title: 'Find your buddy.',
    desc: 'Browse verified companions who match your energy.',
  },
  {
    num: '03',
    title: 'Go Haango.',
    desc: 'Meet up and enjoy. Plans are better together.',
  },
];

const buddyBenefits = [
  {
    icon: Sparkles,
    title: 'Choose your activities',
    desc: 'Offer the plans you actually enjoy.',
  },
  {
    icon: CalendarCheck,
    title: 'Set your availability',
    desc: 'Work when it suits you. No fixed hours.',
  },
  {
    icon: Clock,
    title: 'Earn on your schedule',
    desc: 'Turn free time into meaningful earnings.',
  },
];

function HomePage({ onNavigate, onSelectActivity, onSelectBuddy }) {
  const [liveFeaturedBuddies, setLiveFeaturedBuddies] = useState([]);
  const [loadingFeaturedBuddies, setLoadingFeaturedBuddies] = useState(true);
  const [likedBuddyIds, setLikedBuddyIds] = useState([]);

  useEffect(() => {
    let active = true;
    apiRequest('/buddies/featured')
      .then((response) => {
        if (active) {
          setLiveFeaturedBuddies(Array.isArray(response?.buddies) ? response.buddies : []);
          setLoadingFeaturedBuddies(false);
        }
      })
      .catch(() => {
        if (active) {
          setLiveFeaturedBuddies([]);
          setLoadingFeaturedBuddies(false);
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    const loadLikedBuddies = async () => {
      const token = localStorage.getItem('haango_access_token');
      if (!token) {
        if (active) setLikedBuddyIds([]);
        return;
      }

      try {
        const liked = await apiRequest('/profile/liked-buddies');
        if (active) {
          setLikedBuddyIds((Array.isArray(liked) ? liked : []).map((item) => String(item._id || item.id)));
        }
      } catch {
        if (active) setLikedBuddyIds([]);
      }
    };

    loadLikedBuddies();
    return () => { active = false; };
  }, []);

  const toggleLike = async (buddyId) => {
    const token = localStorage.getItem('haango_access_token');
    if (!token) return;

    try {
      const result = await apiRequest(`/profile/liked-buddies/${buddyId}/toggle`, { method: 'POST' });
      setLikedBuddyIds((current) => (result.liked
        ? [...new Set([...current, String(buddyId)])]
        : current.filter((id) => id !== String(buddyId))));
    } catch (error) {
      console.error('Failed to toggle liked buddy:', error);
    }
  };

  const featuredBuddies = liveFeaturedBuddies.map((buddy) => ({
    ...buddy,
    id: buddy.id || buddy._id,
    name: buddy.name || buddy.displayName || 'Buddy',
    tagline: buddy.tagline || buddy.summary || buddy.about || 'A great companion for a memorable plan.',
    image: buddy.image || buddy.profileImages?.[0] || '',
    gallery: buddy.gallery || buddy.profileImages || [],
    rating: Number(buddy.rating || 0),
    outings: Number(buddy.outings || buddy.completedBookings || 0),
    pricePerHour: Number(buddy.pricePerHour || buddy.hourlyRate || 300),
    location: buddy.location || buddy.city || 'Unknown city',
    interests: Array.isArray(buddy.interests) && buddy.interests.length ? buddy.interests : (Array.isArray(buddy.hobbies) ? buddy.hobbies : []),
    verified: buddy.verified ?? buddy.verificationStatus === 'VERIFIED',
    available: buddy.available ?? buddy.isAvailable !== false,
  }));

  return (
    <div className="bg-[#fffaf5] text-[#102038] animate-fade-in">
      {/* ===== HERO ===== */}
     <section className="relative overflow-hidden pt-24 sm:pt-20">
  <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#e9f0ff] blur-3xl" />
  <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#fff0e3] blur-3xl" />

  <div className="container-max pl-[2rem] relative flex min-h-[540px] items-center gap-6">

   
 {/* Left */}
    <div className="relative z-10 w-full max-w-xl shrink-0 lg:w-[38%]">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#fff0e3] px-4 py-2 text-xs font-display font-semibold text-[#d96512]">
        <MapPin
          size={14}
          className="fill-[#ff7a18] text-[#ff7a18]"
        />
        Now live in Prayagraj
      </div>

      <h1 className="Lato font-display text-[2rem] font-extrabold leading-[1.04] tracking-[-0.04em] text-[#102038] sm:text-5xl lg:text-[3rem]">
        Plans are better
        <br />
        when you have
        <br />
        <span className="text-[#f26d21] BackBones tracking-wider">someone to </span>
        <span className="text-[#3c70d9] BackBones tracking-wider">Haango.</span>
      </h1>

      <p className="mt-6 max-w-md text-base leading-relaxed text-[#425066] sm:text-lg">
        Find a verified buddy for movies, shopping, coffee, dinner,
        events and more — Safe. Simple. Social.
      </p>
      <p className=" max-w-md text-base leading-relaxed text-[#425066] sm:text-lg">
       
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => onNavigate('explore')}
          className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#ff7418] px-7 py-4 font-display text-sm font-bold text-white shadow-[0_12px_28px_rgba(255,116,24,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#ed5c07]"
        >
          Find a Campanion
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1">
            <ArrowRight size={17} />
          </span>
        </button>

        <button
          onClick={() => onNavigate('how-it-works')}
          className="inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-[#4d79d8] px-7 py-3.5 font-display text-sm font-bold  transition-all hover:bg-[#edf3ff]"
        >
          How it works
          <img src={Playb} alt="play" className="w-[26px] h-[26px]" /> 
        </button>
      </div>


       <div className="w-screen mt-8 flex flex-wrap items-start justify-start gap-x-6 gap-y-4">
  <div className="flex items-start justify-items-start gap-2">
    <BadgeCheck
      size={18}
      className="shrink-0 text-[#2da556]"
    />
    <span className="whitespace-nowrap text-sm font-semibold text-[#425066]">
      Verified Profiles
    </span>
  </div>

  <div className="flex items-start gap-2">
    <CreditCard
      size={18}
      className="shrink-0 text-[#3c70d9]"
    />
    <span className="whitespace-nowrap text-sm font-semibold text-[#425066]">
      Secure Payments
    </span>
  </div>

  <div className="flex items-center gap-2">
    <ShieldCheck
      size={18}
      className="shrink-0 text-[#ff7418]"
    />
    <span className="whitespace-nowrap text-sm font-semibold text-[#425066]">
      Safety First
    </span>
  </div>

  <div className="flex items-center gap-2">
    <Headphones
      size={18}
      className="shrink-0 text-[#7a5cff]"
    />
    <span className="whitespace-nowrap text-sm font-semibold text-[#425066]">
      24/7 Support
    </span>
  </div>
</div>
    </div>

    {/* Right — visual */}
<div className="relative w-[60vw] max-w-none shrink-0 -ml-6">
  <img
    src={HeroImage}
    alt="Friends enjoying a casual hangout at a café"
    className="block h-auto w-full object-cover"
  />

  {/* Floating cards */}
  <div
    className="absolute -left-3 top-2 flex items-center gap-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(16,30,62,0.12)] backdrop-blur-sm animate-fade-up sm:-left-6"
    style={{ animationDelay: '200ms' }}
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf6ee]">
      <BadgeCheck size={18} className="text-[#2da556]" />
    </span>

    <div>
      <p className="font-display text-xs font-bold text-[#102038]">
        Verified Buddy
      </p>
      <p className="text-[10px] text-[#7a8898]">
        Identity checked
      </p>
    </div>
  </div>

  <div
    className="absolute top-1/5 right-4 flex items-center gap-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(16,30,62,0.12)] backdrop-blur-sm animate-fade-up"
    style={{ animationDelay: '300ms' }}
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0e3]">
      <Star
        size={16}
        className="fill-[#ff7418] text-[#ff7418]"
      />
    </span>

    <div>
      <p className="font-display text-xs font-bold text-[#102038]">
        4.9 ★
      </p>
      <p className="text-[10px] text-[#7a8898]">
        Avg rating
      </p>
    </div>
  </div>

  <div
    className="absolute bottom-6 left-1/5 flex items-center gap-2 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(16,30,62,0.12)] backdrop-blur-sm animate-fade-up"
    style={{ animationDelay: '400ms' }}
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf0ff]">
      <CalendarCheck
        size={16}
        className="text-[#3c70d9]"
      />
    </span>

    <div>
      <p className="font-display text-xs font-bold text-[#102038]">
        87 outings
      </p>
      <p className="text-[10px] text-[#7a8898]">
        Completed
      </p>
    </div>
  </div>

 
   

</div>


  </div>
</section>


      {/* ===== WHAT ARE YOU UP TO ===== */}
      <section className="container-max section-pad py-8 sm:py-10">
        <div className="mb-10 text-center">
          <h2 className="Lato text-3xl font-extrabold tracking-tight sm:text-4xl">
            What do <span className="text-[#ff7418]">you</span> have in mind?
          </h2>

          <p className="mt-3 text-base text-[#607089]">
            Whatever the plan, find someone to join you.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {moodCards.map((card, i) => {
            const Icon = card.icon;

            return (
              <button
                key={card.id}
                onClick={() => {
                  onSelectActivity(card.id);
                  onNavigate('explore');
                }}
                className="no-tap group relative overflow-hidden rounded-3xl text-left shadow-[0_6px_20px_rgba(83,67,43,0.07)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(83,67,43,0.14)] animate-fade-up"
                style={{
                  animationDelay: `${i * 50}ms`,
                  
                }}
              >
                <div className="relative aspect-[5/4] overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#102038]/80 via-[#102038]/20 to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm">
                    <Icon size={20} className="text-[#ff7418]" />
                  </div>

                  <h3 className="font-display text-lg font-bold text-white">
                    {card.name}
                  </h3>

                  <p className="mt-0.5 text-xs text-white/75">
                    {card.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== BUDDY MARKETPLACE ===== */}
      <section className="bg-white py-12 sm:py-10">
        <div className="container-max section-pad">
          <div className="mb-10 text-center">
            <h2 className="Lato text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-[#3c70d9]">Buddies</span> you might vibe with
            </h2>

            <p className="mt-3 text-base text-[#607089]">
              Verified people. Different interests. One easy way to make
              plans.
            </p>
          </div>

          {loadingFeaturedBuddies ? (
            <p className="text-center text-sm text-[#607089]">Loading buddies...</p>
          ) : featuredBuddies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfe6f5] bg-[#f9faff] px-6 py-10 text-center text-sm text-[#607089]">
              No buddy available.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {featuredBuddies.map((buddy, i) => (
                <BuddyCard
                  key={buddy.id}
                  buddy={buddy}
                  index={i}
                  liked={likedBuddyIds.includes(String(buddy.id))}
                  onLike={toggleLike}
                  onClick={() => {
                    onSelectBuddy(buddy.id);
                    onNavigate('profile');
                  }}
                />
              ))}
            </div>
          )}

          {!loadingFeaturedBuddies && featuredBuddies.length > 0 && (
            <div className="mt-10 text-center">
              <button
                onClick={() => onNavigate('explore')}
                className="group inline-flex items-center gap-2.5 rounded-full border-2 border-[#ff7418] px-6 py-3.5 font-display text-sm font-bold text-[#ff7418] transition-all hover:bg-[#ff7418] hover:text-white"
              >
                View all buddies
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="container-max section-pad py-10 sm:py-12">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your next plan is three steps away.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="rounded-3xl bg-white p-8 shadow-[0_6px_20px_rgba(83,67,43,0.06)] animate-fade-up"
              style={{
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div className="font-display text-5xl font-extrabold text-[#ff7418]/20">
                {step.num}
              </div>

              <h3 className="mt-3 font-display text-xl font-bold text-[#102038]">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-[#607089]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => onNavigate('explore')}
            className="group inline-flex items-center gap-2.5 rounded-full bg-[#ff7418] px-7 py-4 font-display text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,116,24,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#ed5c07]"
          >
            Find a Buddy
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </div>
      </section>

      {/* ===== TRUST SECTION ===== */}
      <section className="bg-[#102038] py-16 sm:py-20">
        <div className="container-max section-pad">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Good vibes. Real people. Safer outings.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map((item, i) => {
              const Icon = item.icon;

              return (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 px-5 py-4 backdrop-blur-sm transition-all hover:bg-white/10 animate-fade-up"
                  style={{
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff7418]/15">
                    <Icon
                      size={22}
                      className="text-[#ff9c5f]"
                    />
                  </span>

                  <span className="font-display text-sm font-semibold text-white">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => onNavigate('safety')}
              className="group inline-flex items-center gap-2.5 rounded-full border-2 border-white/20 px-6 py-3.5 font-display text-sm font-bold text-white transition-all hover:bg-white/10"
            >
              Explore Safety
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </div>
        </div>
      </section>

      {/* ===== BECOME A BUDDY CTA ===== */}
     <section className="container-max section-pad py-16 sm:py-20"> <div className="rounded-[2.5rem] bg-gradient-to-br from-[#fff0e3] to-[#fef5ed] p-8 sm:p-12 lg:p-16"> <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
  {/* Left */}
  <div className="max-w-2xl">
    <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
      Got good vibes to share?
    </h2>

    <p className="mt-4 text-sm leading-relaxed text-[#607089] sm:text-base">
          Meet new people, share experiences, enjoy great conversations
          and earn while doing what you already love.
        </p>

    <div className="mt-8 space-y-4">
      {buddyBenefits.map((benefit) => {
        const Icon = benefit.icon;

        return (
          <div
            key={benefit.title}
            className="flex items-start gap-4"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_4px_12px_rgba(83,67,43,0.06)]">
              <Icon
                size={22}
                className="text-[#ff7418]"
              />
            </span>

            <div>
              <h3 className="font-display text-base font-bold text-[#102038]">
                {benefit.title}
              </h3>

              <p className="mt-0.5 text-sm text-[#607089]">
                {benefit.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>

    <button
      onClick={() => onNavigate('experience')}
      className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#ff7418] px-7 py-4 font-display text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,116,24,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#ed5c07]"
    >
      Explore experiences
      <ArrowRight
        size={17}
        className="transition-transform group-hover:translate-x-1"
      />
    </button>
  </div>

  {/* Right — Earnings Card */}
  <div className="relative">
    <div className="relative overflow-hidden rounded-[2rem] bg-[#102038] p-7 text-white shadow-[0_20px_50px_rgba(16,32,56,0.18)] sm:p-9">

      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#3c70d9]/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-[#ff7418]/30 blur-2xl" />

      <div className="relative z-10">

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-[#ffd2b3] backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-[#ff7418]" />
          Earn while you enjoy
        </div>

        <h3 className="Lato text-xl font-extrabold leading-tight sm:text-2xl">
          Your time can be
          <span className="text-[#ff8b45]"> worth more.</span>
        </h3>

        

        {/* Earnings */}
        <div className="mt-7 rounded-2xl bg-white p-5 text-[#102038] shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7a8898]">
            Potential monthly earnings
          </p>

          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-3xl font-extrabold text-[#ff7418] sm:text-4xl">
              ₹15,000
            </span>

            <span className="pb-1 font-display text-lg font-bold text-[#425066]">
              – ₹20,000+
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[#7a8898]">
            Depending on your availability, outings and bookings.
          </p>
        </div>

        {/* Fun earning points */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-xl">🤝</div>
            <p className="mt-2 text-xs font-semibold text-white">
              Meet new people
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-xl">💰</div>
            <p className="mt-2 text-xs font-semibold text-white">
              Earn on your time
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-xl">✨</div>
            <p className="mt-2 text-xs font-semibold text-white">
              Share experiences
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <div className="text-xl">🎉</div>
            <p className="mt-2 text-xs font-semibold text-white">
              Have fun doing it
            </p>
          </div>
        </div>

        <p className="mt-6 text-center font-display text-sm font-semibold text-[#ffb58c]">
          With Haango, earning money is fun. ✨
        </p>

      </div>
    </div>
  </div>

</div>

</div> </section>

<FAQSection
  limit={5}
  onNavigate={onNavigate}
/>

    </div>
  );
}
export default HomePage