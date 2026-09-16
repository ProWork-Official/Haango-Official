import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, UserRoundCheck } from 'lucide-react';

const safetyTips = [
  'Always meet in public places and avoid private homes or isolated locations.',
  'Inform one close person before the outing and share the meeting location and timing.',
  'Prefer daytime or early evening plans, and avoid late-night meetings when possible.',
  'Trust your instincts. If something feels wrong, leave immediately and report it.',
  'Keep your personal details private and avoid sharing your address, phone number, or travel details too early.',
  'Never share your bank details or payment links outside Haango.',
];

const fraudWarnings = [
  'Pay only through the Haango app. Do not make payments outside the platform.',
  'Double-check the profile, photos, and activity details before confirming a booking.',
  'Avoid anyone who rushes you to move the conversation off-platform or to a private location.',
  'Report suspicious behavior immediately so we can review and protect others.',
  'If someone asks for cash, personal data, or unofficial alternatives, stop and report them.',
];

export default function SafetyPage() {
  return (
    <div className="pt-20 pb-20 animate-fade-in">
      <section className="container-max section-pad">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-coral-500">Safety</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">
          Your safety is the priority.
        </h1>
      </section>

      <section className="container-max section-pad pt-0">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-gradient-to-r from-amber-50 to-orange-50 p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <UserRoundCheck size={22} />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-900">For girls</h2>
            </div>

            <div className="mb-5 rounded-2xl border border-amber-200 bg-white/70 p-4 text-sm text-ink-700">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <AlertTriangle size={16} />
                Please be cautious and take every step seriously.
              </div>
            </div>

            <ul className="space-y-4">
              {safetyTips.map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-teal-600" size={18} />
                  <span className="text-sm leading-relaxed text-ink-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] bg-gradient-to-r from-sky-50 to-blue-50 p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ShieldAlert size={22} />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-900">For fraudsters and unsafe behavior</h2>
            </div>

            <ul className="space-y-4">
              {fraudWarnings.map((warning) => (
                <li key={warning} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 text-sky-700" size={18} />
                  <span className="text-sm leading-relaxed text-ink-700">{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-max section-pad pt-0">
        <div className="rounded-[2rem] bg-ink-900 p-8 text-white md:p-10">
          <h3 className="font-display text-2xl font-bold">Quick rule: stay on-platform</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-200">
            Keep communication and payment inside Haango. If someone tries to move away from the app, asks for personal details, or suggests a private arrangement, stop, trust your instincts, and report it immediately.
          </p>
        </div>
      </section>
    </div>
  );
}
