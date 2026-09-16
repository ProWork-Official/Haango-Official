import { ArrowRight, CheckCircle2, ClipboardCheck, ShieldCheck, UserRoundPlus } from 'lucide-react';

const stepsForUsers = [
  {
    title: 'Choose the kind of companion you want',
    description: 'Pick an activity, city, and your preferred vibe. Browse profiles that match your interest and comfort level.',
  },
  {
    title: 'Review the profile carefully',
    description: 'Check interests, availability, and public details before you book. Good trust begins with clear information.',
  },
  {
    title: 'Book safely through the app',
    description: 'Pay on the platform, confirm the plan, and keep all conversation and booking details inside Haango.',
  },
  {
    title: 'Meet in a public place',
    description: 'Always choose a safe public meeting point and let someone close know where you are going.',
  },
];

const stepsForCompanions = [
  {
    title: 'Create a profile that feels trustworthy',
    description: 'Use a clear profile photo, honest description, and a few details about your personality and interests.',
  },
  {
    title: 'Show your real interests',
    description: 'Add the activities you enjoy and the kind of outings you like to host. This helps better matching.',
  },
  {
    title: 'Keep availability and plans clear',
    description: 'Be specific about your available times and the type of experiences you can offer.',
  },
  {
    title: 'Build trust through consistency',
    description: 'Be respectful, punctual, polite, and clear in communication so more people feel comfortable booking with you.',
  },
];

export default function HowItWorksPage({ onNavigate }) {
  return (
    <div className="pt-20 pb-20 animate-fade-in">
      <section className="container-max section-pad">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-coral-500">How it works</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">
          Two simple paths, one safer experience.
        </h1>
      </section>

      <section className="container-max section-pad pt-0">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
                <UserRoundPlus size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral-500">For users</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">How to book a companion</h2>
              </div>
            </div>

            <div className="space-y-5">
              {stepsForUsers.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink-900">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <ClipboardCheck size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">For companions</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">How to create a profile that attracts better matches</h2>
              </div>
            </div>

            <div className="space-y-5">
              {stepsForCompanions.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink-900">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-max section-pad pt-0">
        <div className="rounded-[2rem] bg-gradient-to-r from-coral-50 to-orange-50 p-8 md:p-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-coral-600" size={24} />
            <h3 className="font-display text-2xl font-bold text-ink-900">Safety built into the journey</h3>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {[
              'Transparent profile information',
              'Public meeting recommendations',
              'Payments through the app for safer bookings',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-soft">
                <CheckCircle2 className="mt-0.5 text-teal-600" size={18} />
                <p className="text-sm font-medium text-ink-700">{item}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('safety')}
            className="btn-primary mt-8"
          >
            Learn safety rules
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
