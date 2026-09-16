import {
  Heart,
  Instagram,
  Linkedin,
  Shield,
  Twitter,
} from 'lucide-react';
import WTextLogo from '../Assets/F_Transparent_W.png';

const socialLinks = [
  { label: 'Instagram', Icon: Instagram, href: 'https://www.instagram.com/haango_offical/' },
  { label: 'Download Haango on Google Play', Icon: Twitter, href: 'https://play.google.com/store/apps/details?id=com.haango.app' },
  { label: 'Download Haango on Google Play', Icon: Linkedin, href: 'https://play.google.com/store/apps/details?id=com.haango.app' },
];

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#102038] text-[#9aacc4]">
      <div className="container-max section-pad py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">

          {/* Brand */}
          <div className="lg:col-span-2">
            {/* <Logo size="lg" className="mb-5" /> */}
            <img src={WTextLogo} alt="footer image" className="mb-5 -ml-6 h-20" />

            <p className="max-w-xs text-sm leading-relaxed text-[#7d92b0]">
              Plans are better when you have someone to Haango.
            </p>

            <div className="mt-5 flex gap-3">
              {socialLinks.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#7d92b0] transition-all hover:bg-[#ff7418] hover:text-white"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="mb-4 font-display text-sm font-bold text-white">
              Explore
            </h4>

            <ul className="space-y-3 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="transition-colors hover:text-[#ff9c5f]"
                >
                  Find a Companion
                </button>
              </li>

              <li>
                <button
                  onClick={() => onNavigate('experience')}
                  className="transition-colors hover:text-[#ff9c5f]"
                >
                  Experiences
                </button>
              </li>

              <li>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="transition-colors hover:text-[#ff9c5f]"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* For Buddies */}
          <div>
            <h4 className="mb-4 font-display text-sm font-bold text-white">For Buddies</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={() => onNavigate('become-buddy')} className="transition-colors hover:text-[#ff9c5f]">Become a Buddy</button></li>
              <li><button onClick={() => onNavigate('buddy-guidelines')} className="transition-colors hover:text-[#ff9c5f]">Buddy Guidelines</button></li>
              <li><button onClick={() => onNavigate('safety')} className="transition-colors hover:text-[#ff9c5f]">Safety</button></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 font-display text-sm font-bold text-white">
              Company
            </h4>

            <ul className="space-y-3 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="transition-colors hover:text-[#ff9c5f]"
                >
                  About
                </button>
              </li>

              <li><button onClick={() => onNavigate('contact')} className="transition-colors hover:text-[#ff9c5f]">Contact</button></li>
              <li><button onClick={() => onNavigate('support')} className="transition-colors hover:text-[#ff9c5f]">Support</button></li>
              <li><button onClick={() => onNavigate('community-guidelines')} className="transition-colors hover:text-[#ff9c5f]">Community Guidelines</button></li>
            </ul>
          </div>
        </div>

        {/* Legal row */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#6c84a6]">
            <button onClick={() => onNavigate('privacy-policy')} className="transition-colors hover:text-[#ff9c5f]">Privacy Policy</button>
            <button onClick={() => onNavigate('terms')} className="transition-colors hover:text-[#ff9c5f]">Terms</button>
            <button onClick={() => onNavigate('cancellation-policy')} className="transition-colors hover:text-[#ff9c5f]">Cancellation Policy</button>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#6c84a6]">
            <span className="flex items-center gap-1.5">
              <Shield
                size={14}
                className="text-[#4ade80]"
              />
              Verified Platform
            </span>

            <span className="flex items-center gap-1.5">
              <Heart
                size={14}
                className="text-[#ff7418]"
              />
              Platonic Social
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#6c84a6] md:text-left">
          © 2026 Haango By Prowork Ventures Pvt. Ltd. Made in India.
        </p>
      </div>
    </footer>
  );
}
