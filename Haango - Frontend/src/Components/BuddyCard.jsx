import {
  Star,
  BadgeCheck,
  MapPin,
  Heart,
  Share2,
} from 'lucide-react';

export default function BuddyCard({
  buddy,
  onClick,
  index = 0,
  liked = false,
  onLike,
}) {
  const shareBuddy = async (event) => {
    event.stopPropagation();
    const shareUrl = `${window.location.origin}/profile?buddyId=${encodeURIComponent(buddy.id)}`;
    const shareData = {
      title: `${buddy.name} on Haango`,
      text: buddy.tagline || `Meet ${buddy.name} on Haango.`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') {
        console.error('Failed to share buddy profile:', shareError);
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className="card group cursor-pointer overflow-hidden hover:shadow-lift hover:-translate-y-1 animate-fade-up"
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={buddy.image}
          alt={buddy.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />

        <div className="absolute top-3 right-3 flex gap-2">
          <button
            type="button"
            onClick={shareBuddy}
            title="Share buddy profile"
            aria-label={`Share ${buddy.name}'s profile`}
            className="no-tap flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <Share2 size={16} className="text-[#878D9C]" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onLike?.(buddy.id);
            }}
            title={liked ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
            className="no-tap flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-soft backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <Heart
              size={18}
              className={`transition-all duration-200 ${
                liked
                  ? 'text-[#FF6B4A] fill-[#FF6B4A]'
                  : 'text-[#878D9C]'
              }`}
            />
          </button>
        </div>

        {/* Verified badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-soft">
          {buddy.verified && (
            <BadgeCheck
              size={14}
              className="shrink-0 text-[#45C3B6]"
            />
          )}

          <span className="text-xs font-display font-semibold text-ink-800">
            Verified
          </span>
        </div>

        {/* Availability */}
        {buddy.available && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#28BC60] backdrop-blur-sm shadow-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />

            <span className="text-xs font-display font-semibold text-white">
              Available
            </span>
          </div>
        )}

        {/* Buddy information overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-white leading-tight">
                {buddy.name}, {buddy.age}
              </h3>

              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-0.5">
                  <Star
                    size={13}
                    className="text-amber-400 fill-amber-400"
                  />

                  <span className="text-xs font-semibold text-white">
                    {buddy.rating}
                  </span>
                </div>

                <span className="text-xs text-white/60">
                  ·
                </span>

                <span className="text-xs text-white/80">
                  {buddy.outings} outings
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4">
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          "{buddy.tagline}"
        </p>

        {/* Interests */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(Array.isArray(buddy.interests) ? buddy.interests : [])
            .slice(0, 3)
            .map((interest, interestIndex) => (
              <span
                key={interest}
                className={`px-2.5 py-1 rounded-full bg-[#f6f6f6] text-xs font-medium text-ink-600 ${interestIndex === 2 ? 'sm:hidden' : ''}`}
              >
                {interest}
              </span>
            ))}
        </div>

        {/* Location and price */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#EDEDED]">
          <div className="flex items-center gap-1 text-xs text-[#878D9C] Lato">
            <MapPin size={13} className="text-[#878D9C]" />
            {buddy.location}
          </div>

          <div className="font-display font-bold text-ink-900">
            ₹{buddy.pricePerHour}
            <span className="text-xs font-normal text-[#878D9C]">
              /hr
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
