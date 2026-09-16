import { ArrowRight, Calendar, Camera, MapPin, MessageSquareQuote, Sparkles } from 'lucide-react';

const experienceCards = [
  {
    icon: Calendar,
    title: 'Coffee and conversation',
    description: 'A relaxed meet-up that feels easy, warm, and natural. Perfect for a calm first connection.',
  },
  {
    icon: Camera,
    title: 'Shopping and strolls',
    description: 'Browse new spots, discover hidden gems, and enjoy the company without pressure or awkwardness.',
  },
  {
    icon: MapPin,
    title: 'City exploration',
    description: 'Explore markets, cafés, parks, and local attractions with someone who matches your vibe.',
  },
  {
    icon: MessageSquareQuote,
    title: 'Events and dates',
    description: 'Go to concerts, exhibitions, or food spots with a companion who makes the experience more enjoyable.',
  },
];

export default function ExperiencePage({ onNavigate }) {
  return (
    <div className="pt-20 pb-20 animate-fade-in">
      <section className="container-max section-pad">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-coral-500">Experience</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">
            Create moments that feel easy and memorable.
          </h1>
          <p className="mt-4 text-lg text-ink-600">
            Haango is built for meaningful, low-pressure companionship. You can book a companion for a few hours or a planned outing, based on the vibe you want and the experience you are looking for.
          </p>
        </div>
      </section>

      <section className="container-max section-pad pt-0">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {experienceCards.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
                <Icon size={22} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-max section-pad pt-0">
        <div className="rounded-[2rem] bg-gradient-to-r from-ink-900 to-ink-800 p-8 text-white md:p-12">
          <div className="flex items-center gap-2 text-coral-300">
            <Sparkles size={18} />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Why it works</span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-display text-2xl font-bold">1. Match your vibe</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">Choose a companion whose personality, interests, and energy fit the moment.</p>
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold">2. Keep it safe</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">Every plan is designed around public, comfortable, and transparent meet-ups.</p>
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold">3. Enjoy without pressure</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">Companionship is about ease, friendship, and shared moments — never awkwardness.</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('explore')}
            className="btn-primary mt-8"
          >
            Explore companions
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
