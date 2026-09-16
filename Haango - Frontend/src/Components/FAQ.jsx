import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
{
question: "What is Haango?",
answer:
"Haango is a real-world companionship platform that helps you find someone to go with. Whether you want to watch a movie, grab coffee, explore a new place, play a sport, attend an event, or simply spend some time with someone, Haango makes it easier to find the right companion.",
},
{
question: "Is Haango a dating app?",
answer:
"No. Haango is not a dating app. The focus is on companionship and shared experiences rather than romantic matching. You can find someone to join you for an activity, conversation, exploration, or simply to spend some time together.",
},
{
question: "What can I use Haango for?",
answer:
"Almost anything you would enjoy doing with someone else — going to a movie, exploring cafés, shopping, playing badminton or cricket, attending events, exploring a new city, going for a walk, having a conversation, trying something new, or simply hanging out.",
},
{
question: "How does Haango work?",
answer:
"Tell us what you want to do, when you want to do it, and the kind of companion you're looking for. Haango helps you discover people who are available and interested in joining you. Once you find a suitable companion, you can connect, discuss the plan, and enjoy your time together.",
},
{
question: "Who can become a Haango Buddy?",
answer:
"Anyone who enjoys meeting new people, sharing experiences, and spending time doing interesting things can become a Buddy, subject to Haango's eligibility and verification requirements.",
},
{
question: "What is a Buddy?",
answer:
"A Buddy is someone who is available to accompany others for activities and experiences through Haango. A Buddy could join you for a movie, coffee, a game, shopping, exploring a city, attending an event, or simply spending time together.",
},
{
question: "Can I earn money as a Buddy?",
answer:
"Yes. Buddies can earn by spending time with people and participating in experiences through Haango. Earnings can depend on factors such as the number of outings, availability, activity, duration, and bookings. Potential earnings of ₹15,000–₹20,000+ per month may be possible for active Buddies, but actual earnings are not guaranteed.",
},
{
question: "Do I need to be available every day to become a Buddy?",
answer:
"No. Haango is designed to give Buddies flexibility. You can choose when you are available and accept opportunities that fit your schedule.",
},
{
question: "Is Haango safe?",
answer:
"Safety is a core part of Haango. We use measures such as profile verification, platform guidelines, secure payments, reporting mechanisms, and support features to help create a safer experience. We also encourage users to meet in public places and follow basic personal-safety practices.",
},
{
question: "Are Haango profiles verified?",
answer:
"Haango can use identity and profile verification measures to help build trust between users and Buddies. Look for verification indicators when choosing someone to connect with.",
},
{
question: "Do I have to meet someone if I connect with them?",
answer:
"No. You are always in control of who you connect with and whether you want to proceed with an outing. If you don't feel comfortable, you can choose not to continue.",
},
{
question: "Can I choose what kind of person I want to spend time with?",
answer:
"Yes. You can explore companions based on the activity, availability, interests, location, and other relevant preferences available on Haango. The goal is to find someone who fits the experience you want to have.",
},
{
question: "Is Haango only for people who are new to a city?",
answer:
"Not at all. Haango can be useful whether you're new to a city, working remotely, looking to meet new people, looking for someone to join an activity, or simply don't want to do something alone.",
},
{
question: "Can I use Haango if I already have friends?",
answer:
"Absolutely. Sometimes your friends are busy, unavailable, or simply not interested in the same activity. Haango helps you find someone when you don't have anyone available to go with.",
},
{
question: "Can I cancel an outing?",
answer:
"Cancellation depends on the booking and cancellation policy associated with the experience. Always check the applicable terms before confirming a booking.",
},
{
question: "How are payments handled?",
answer:
"Payments can be handled securely through the Haango platform. Depending on the experience, the applicable price and payment details will be shown before you confirm.",
},
{
question: "Can I report someone?",
answer:
"Yes. If you experience inappropriate behavior, feel unsafe, or encounter a violation of Haango's guidelines, you should report the person through the available reporting tools or contact Haango Support.",
},
{
question: "What should I do if I feel unsafe during an outing?",
answer:
"Your safety comes first. If you feel uncomfortable or unsafe, leave the situation and move to a safe or public location. You can also use Haango's reporting and support channels to report the incident. For emergencies, contact your local emergency services.",
},
{
question: "Is Haango available everywhere?",
answer:
"Haango is being introduced city by city. Availability depends on where Haango currently operates and the experiences available in your area.",
},
{
question: "Why should I use Haango instead of a normal social-media app?",
answer:
"Traditional social apps are often built around scrolling, followers, likes, and online interaction. Haango is built around doing something in the real world. Instead of endlessly scrolling through people, you start with a simple idea: I want someone to go with.",
},
];

export default function FAQSection({ limit, onNavigate }) {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const displayedFaqs = limit
    ? faqs.slice(0, limit)
    : faqs;

  return (
    <section className="bg-[#FFF9F3] py-16 sm:pb-20 lg:pb-24">
      <div className="container-max px-5 sm:px-8">

        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full bg-[#FF6B35]/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#FF6B35]">
            Got questions?
          </div>

          <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-[#171717] sm:text-4xl lg:text-5xl">
            Everything you need to know
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#171717]/60 sm:text-lg">
            From finding a companion to becoming a Buddy, here's everything
            you need to know about Haango.
          </p>
        </div>

        {/* FAQ List */}
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="space-y-3">
            {displayedFaqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={faq.question}
                  className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isOpen
                      ? "border-[#FF6B35]/30 bg-white shadow-[0_8px_30px_rgba(255,107,53,0.08)]"
                      : "border-[#171717]/[0.08] bg-white/70 hover:border-[#4169E1]/30"
                  }`}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left sm:px-7 sm:py-6"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isOpen
                            ? "bg-[#FF6B35] text-white"
                            : "bg-[#4169E1]/10 text-[#4169E1]"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span
                        className={`font-display text-sm font-bold sm:text-base ${
                          isOpen
                            ? "text-[#FF6B35]"
                            : "text-[#171717]"
                        }`}
                      >
                        {faq.question}
                      </span>
                    </div>

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isOpen
                          ? "bg-[#FF6B35] text-white"
                          : "bg-[#FFF9F3] text-[#4169E1]"
                      }`}
                    >
                      {isOpen ? (
                        <Minus size={17} />
                      ) : (
                        <Plus size={17} />
                      )}
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-[#171717]/[0.06] px-5 pb-6 pt-4 pl-[4.5rem] sm:px-7 sm:pb-7 sm:pt-5 sm:pl-[5.75rem]">
                        <p className="text-sm leading-7 text-[#171717]/60 sm:text-base">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* View All FAQs */}
        {limit && limit < faqs.length && (
          <div className="mt-8 text-center">
            <button
              onClick={() => onNavigate("faq")}
              className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-3.5 font-display text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#FF6B35]"
            >
              View all FAQs
              <span>→</span>
            </button>
          </div>
        )}

        {/* Bottom CTA - only show on full FAQ page */}
        {!limit && (
          <div className="mx-auto mt-14 max-w-3xl rounded-[2rem] bg-[#171717] px-7 py-8 text-center sm:px-10 sm:py-10">
            <h3 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              Still have questions?
            </h3>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              We're here to help. Reach out to the Haango team and we'll be
              happy to help you get started.
            </p>

            <button
              onClick={() => onNavigate("support")}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FF6B35] px-6 py-3.5 font-display text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#e85b28]"
            >
              Contact Support
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
