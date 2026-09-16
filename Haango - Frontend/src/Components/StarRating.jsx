import { Star } from 'lucide-react';

export default function StarRating({
  rating,
  size = 16,
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-ink-200 fill-ink-200'
          }
        />
      ))}
    </div>
  );
}
