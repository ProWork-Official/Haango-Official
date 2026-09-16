export function BuddyCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/5] skeleton" />

      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded-lg skeleton" />

        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-full skeleton" />
          <div className="h-6 w-16 rounded-full skeleton" />
          <div className="h-6 w-16 rounded-full skeleton" />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-ink-100">
          <div className="h-3 w-20 rounded-lg skeleton" />
          <div className="h-5 w-16 rounded-lg skeleton" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="h-72 w-full skeleton" />

      <div className="container-max section-pad -mt-20 relative">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-32 h-32 rounded-4xl skeleton" />

          <div className="flex-1 space-y-4 mt-4">
            <div className="h-8 w-48 rounded-lg skeleton" />
            <div className="h-4 w-32 rounded-lg skeleton" />
            <div className="h-4 w-64 rounded-lg skeleton" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-2 space-y-4">
            <div className="h-6 w-40 rounded-lg skeleton" />
            <div className="h-24 w-full rounded-2xl skeleton" />
            <div className="h-6 w-32 rounded-lg skeleton" />
            <div className="h-24 w-full rounded-2xl skeleton" />
          </div>

          <div className="h-64 w-full rounded-3xl skeleton" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <BuddyCardSkeleton key={i} />
      ))}
    </div>
  );
}
