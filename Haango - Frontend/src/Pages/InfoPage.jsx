import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';

export default function InfoPage({ eyebrow, title, intro, sections = [], onNavigate, action }) {
  return (
    <div className="animate-fade-in pb-20 pt-20">
      <section className="container-max section-pad">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-coral-500">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-600">{intro}</p>}
      </section>

      <section className="container-max section-pad pt-0">
        <div className="grid gap-5 md:grid-cols-2">
          {sections.map(({ title: sectionTitle, body, items }) => (
            <article key={sectionTitle} className="card p-6 md:p-8">
              <h2 className="font-display text-2xl font-bold text-ink-900">{sectionTitle}</h2>
              {body && <p className="mt-3 text-sm leading-relaxed text-ink-600">{body}</p>}
              {items && <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-600">{items.map((item) => <li key={item} className="flex gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-teal-600" /><span>{item}</span></li>)}</ul>}
            </article>
          ))}
        </div>
      </section>

      {action && (
        <section className="container-max section-pad pt-0">
          <div className="rounded-[2rem] bg-ink-900 p-8 text-white md:p-10">
            <div className="flex items-center gap-3"><Mail size={20} className="text-coral-300" /><h2 className="font-display text-2xl font-bold">{action.title}</h2></div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-200">{action.body}</p>
            <button onClick={() => onNavigate(action.route)} className="btn-primary mt-6">{action.label}<ArrowRight size={16} /></button>
          </div>
        </section>
      )}
    </div>
  );
}
