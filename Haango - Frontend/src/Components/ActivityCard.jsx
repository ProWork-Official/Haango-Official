export default function ActivityCard({
  activity,
  onClick,
  index = 0,
}) {
  return (
    <button
      onClick={onClick}
      className="no-tap group relative aspect-[4/3] rounded-3xl overflow-hidden shadow-card hover:shadow-lift transition-all duration-300 hover:-translate-y-1 text-left animate-fade-up"
      style={{
        animationDelay: `${index * 50}ms`,
        opacity: 0,
      }}
    >
      <img
        src={activity.image}
        alt={activity.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />

      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="text-2xl mb-1">
          {activity.emoji}
        </div>

        <h3 className="font-display font-bold text-base text-white leading-tight">
          {activity.name}
        </h3>

        <p className="text-xs text-white/70 mt-1 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-h-0 group-hover:max-h-12 overflow-hidden">
          {activity.description}
        </p>
      </div>
    </button>
  );
}