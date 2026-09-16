import { ArrowRight, Sparkles, Users, ShieldCheck, HeartHandshake } from 'lucide-react';

const values = [
  {
    icon: Users,
    title: 'Human connection',
    description: 'Haango was created for real, easy companionship that feels warm, respectful, and stress-free.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust and safety',
    description: 'We focus on safer meet-ups, transparent profiles, and responsible platform behavior.',
  },
  {
    icon: HeartHandshake,
    title: 'Meaningful experiences',
    description: 'Every outing should be enjoyable, comfortable, and refreshing — not awkward or pressured.',
  },
];

export default function AboutPage({ onNavigate }) {
  return (
    <div className="pt-20 pb-20 animate-fade-in">
      <section className="container-max section-pad">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-coral-500">About us</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">
            We help people share better experiences with trusted companions.
          </h1>
          <p className="mt-5 text-lg text-ink-600">
            Haango is a companionship platform designed to help people spend time with someone who matches their vibe — whether it is for coffee, errands, events, city exploration, or simply having meaningful company.
          </p>
        </div>
      </section>

      <section className="container-max section-pad pt-0">
        <div className="grid gap-5 md:grid-cols-3">
          {values.map(({ icon: Icon, title, description }) => (
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
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Our mission</span>
          </div>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-200">
            Our goal is simple: create a safer, more comfortable social space where people can connect without pressure, awkwardness, or confusion. We focus on companionship, trust, and better shared experiences.
          </p>

          <button
            onClick={() => onNavigate('explore')}
            className="btn-primary mt-8"
          >
            Start exploring
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
