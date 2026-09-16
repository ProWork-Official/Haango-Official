import {
  ArrowRight,
  Sparkles,
  Clock,
  IndianRupee,
} from 'lucide-react';

export default function BecomeBuddyPage({ onNavigate }) {
  return (
    <div className="animate-fade-in pb-20 md:pb-8">
      
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/5319301/pexels-photo-5319301.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Friends celebrating together"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />

        </div>

        <div className="relative container-max section-pad  pt-20 md:pt-32 pb-10 md:pb-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 animate-fade-up">
              <Sparkles size={14} className="text-coral-400" />
              <span className="text-xs font-display font-semibold text-white">
                Earn ₹15,000+/month
              </span>
            </div>

            <h1
              className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight text-balance animate-fade-up"
              style={{ animationDelay: '80ms' }}
            >
              Your Time. Your Schedule.
              <br />
              <span className="bg-gradient-to-r from-coral-400 to-coral-500 bg-clip-text text-[#FF7C5D]">
                Your Haango Companion Journey.
              </span>
            </h1>

            <p
              className="mt-6 text-lg sm:text-xl text-white/80 leading-relaxed max-w-lg animate-fade-up"
              style={{ animationDelay: '160ms' }}
            >
              Meet people, share experiences and earn on your schedule. Turn
              your free time into something meaningful.
            </p>

            <button
              onClick={() => onNavigate('buddy-dashboard')}
              className="btn-primary mt-8 text-base px-8 py-4 animate-fade-up"
              style={{ animationDelay: '240ms' }}
            >
              Become a Companion
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-max section-pad py-16 md:py-24">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: Sparkles,
              title: 'Choose what you enjoy',
              desc: 'Movies, coffee, shopping, gaming, events and more. Pick the activities you actually love.',
              color: 'coral',
            },
            {
              icon: Clock,
              title: 'Set your availability',
              desc: "You decide when you're available. Full control over your calendar, every single day.",
              color: 'teal',
            },
            {
              icon: IndianRupee,
              title: 'Get paid',
              desc: 'Earn for your time and companionship. Secure payments through Haango, no chasing.',
              color: 'success',
            },
          ].map((b, i) => {
            const Icon = b.icon;

            const colorMap = {
              coral: 'bg-[#FFF4F0] text-[#FF6B4A]',
              teal: 'bg-teal-50 text-teal-600',
              success: 'bg-[#F0FDF4] text-[#1CA54F]',
            };

            return (
              <div
                key={i}
                className="card p-7 hover:shadow-lift hover:-translate-y-1 transition-all duration-300 animate-fade-up"
                style={{
                  animationDelay: `${i * 80}ms`,
                  
                }}
              >
                <div
                  className={`w-14 h-14 rounded-3xl flex items-center justify-center mb-5 ${colorMap[b.color]}`}
                >
                  <Icon size={28} />
                </div>

                <h3 className="font-display font-bold text-xl text-ink-900 mb-2">
                  {b.title}
                </h3>

                <p className="text-sm text-ink-500 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="container-max section-pad pb-16 md:pb-24">
        <div className="relative rounded-[40px] overflow-hidden bg-[#101219] from-ink-900 to-ink-800 p-8 md:p-16">
          <div className="absolute top-10 right-10 w-56 h-56 bg-[#FF7C5D]/25 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#34302f] rounded-full blur-3xl" />

          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                What could you earn?
              </h2>

              <p className="mt-4 text-[#B4B8C2] leading-relaxed">
                Here's an illustrative example based on average activity on
                Haango. Actual earnings vary based on your availability,
                activities, and city.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-sm text-[#B4B8C2]">
                    Outings per week
                  </span>
                  <span className="font-display font-bold text-white text-lg">
                    5
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-sm text-[#B4B8C2]">
                    Average per outing
                  </span>
                  <span className="font-display font-bold text-white text-lg">
                    ₹800
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-[#B4B8C2] mb-2">
                Estimated monthly earnings
              </p>

              <p className="font-display font-extrabold text-6xl text-[#FF7D5E]">
                ₹15,000
              </p>

              <p className="text-xs text-[#B4B8C2] mt-3 max-w-xs mx-auto">
                Illustrative example only. Not a guarantee of earnings.
              </p>

              <button
                onClick={() => onNavigate('buddy-dashboard')}
                className="btn-primary mt-6 text-base px-8 py-4"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-white py-8 md:py-10">
        <div className="container-max section-pad">
          <h2 className="Lato font-extrabold text-3xl sm:text-4xl text-ink-900 tracking-tight text-center mb-12">
            How it works
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Create your profile',
                desc: 'Add your interests, activities, and a few photos. Set your hourly rate.',
              },
              {
                step: '02',
                title: 'Get verified',
                desc: 'Complete identity verification. This builds trust with everyone on Haango.',
              },
              {
                step: '03',
                title: 'Receive bookings',
                desc: 'Users book you for activities. You accept, decline, or propose a new time.',
              },
              {
                step: '04',
                title: 'Meet & earn',
                desc: "Show up, have fun, and get paid securely through Haango. It's that simple.",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="relative animate-fade-up"
                style={{
                  animationDelay: `${i * 80}ms`,
                  
                }}
              >
                <div className="font-display font-extrabold text-5xl text-[#d9dadc]">
                  {s.step}
                </div>

                <h3 className="font-display font-bold text-lg text-ink-900 mt-2 mb-2">
                  {s.title}
                </h3>

                <p className="text-sm text-[#7e7e80] leading-relaxed">
                  {s.desc}
                </p>

                {i < 3 && (
                  <ArrowRight
                    size={20}
                    className="hidden md:block absolute top-6 -right-3 text-[#d9dadc]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      
      <section className="container-max section-pad py-12 md:py-16 text-center">
        <h2 className="Lato font-extrabold text-3xl sm:text-4xl lg:text-5xl text-ink-900 tracking-tight text-balance">
          Ready to start earning?
        </h2>

        <p className="mt-4 text-lg text-ink-500 max-w-md mx-auto">
          Join 2,400+ verified buddies already earning on Haango.
        </p>

        <button
          onClick={() => onNavigate('buddy-dashboard')}
          className="btn-primary mt-8 text-base px-8 py-4"
        >
          Become a Buddy
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
