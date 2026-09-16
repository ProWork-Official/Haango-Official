import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Menu,
  X,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

import Logo from './Logo';

const primaryNav = [
  { id: 'explore', label: 'Find Companions' },
  { id: 'become-buddy', label: 'Become a Companion' },
  { id: 'experience', label: 'Experience' },
];

const secondaryNav = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'safety', label: 'Safety' },
  { id: 'about', label: 'About Us' },
];

export default function Navbar({
  current,
  onNavigate,
  isLoggedIn,
  userName,
  onSignOut,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    onScroll();

    window.addEventListener('scroll', onScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleNav = (page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const isActive = (item) =>
    item.id === current ||
    (current === 'home' && item.label === 'Home');

  return (
    <>
      {/* Header */}
      <header
        className={`fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? 'border-[#f1ece6] bg-white/80 backdrop-blur-xl'
            : 'border-transparent bg-white/95 backdrop-blur-md'
        }`}
      >
        <div className="container-max px-[2rem] py-[1.5rem] flex h-[72px] items-center justify-between">

          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="no-tap shrink-0"
          >
            <Logo size="lg" />
          </button>

          {/* Center navigation */}
          <nav className="hidden items-center gap-1 lg:flex">

            {/* Primary navigation */}
            {primaryNav.map((item) => (
              <button
                key={`p-${item.label}`}
                onClick={() => handleNav(item.id)}
                className={`no-tap rounded-full px-4 py-2 Lato text-[14px] font-bold transition-all duration-200 ${
                  isActive(item)
                    ? 'bg-[#fff0e3] text-[#f26d21]'
                    : 'text-[#172237] hover:bg-[#fff5ed] hover:text-[#f26d21]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Secondary navigation */}
            {secondaryNav.map((item) => (
              <button
                key={`s-${item.label}`}
                onClick={() => handleNav(item.id)}
                className={`no-tap rounded-full px-4 py-2 Lato text-[13px] font-semibold transition-all duration-200 ${
                  isActive(item)
                    ? 'text-[#f26d21]'
                    : 'text-[#5a6a80] hover:text-[#172237]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden items-center gap-4 lg:flex">
            {isLoggedIn ? (
              <>
                {/* Logged-in user */}
                <button
                className="cursor-pointer"
                  onClick={() => onNavigate("dashboard")}
                >

                
                <span className="flex items-center gap-2 font-display text-[13px] font-semibold text-[#172237]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0e3] text-sm font-bold text-[#ff7418]">
                    {userName?.[0]?.toUpperCase() ?? (
                      <UserIcon size={16} />
                    )}
                  </span>

                  {userName?.split(' ')[0]}
                </span>
                </button>

                {/* Logout */}
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-2 rounded-full border border-[#dce5f7] px-4 py-2.5 font-display text-[13px] font-bold text-[#315dbb] transition-all hover:bg-[#edf3ff]"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </>
            ) : (
              <>
                {/* Login */}
                <button
                  onClick={() => handleNav('login')}
                  className="font-display text-[13px] font-semibold text-[#172237] transition-colors hover:text-[#f26d21]"
                >
                  Log in
                </button>

                {/* Signup */}
                <button
                  onClick={() => handleNav('signup')}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-[#ff7418] px-5 py-2.5 font-display text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,116,24,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#ed5c07]"
                >
                  Sign up

                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
                    <ArrowRight size={12} />
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="no-tap rounded-xl p-2 text-[#172237] lg:hidden"
          >
            {mobileOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#102038]/20 backdrop-blur-sm animate-fade-in" />

          {/* Menu */}
          <div
            className="absolute left-0 right-0 top-0 rounded-b-3xl bg-white px-5 pb-6 pt-20 shadow-lift animate-slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <nav className="flex flex-col gap-1.5">

              {/* Primary navigation */}
              {primaryNav.map((item) => (
                <button
                  key={`m-p-${item.label}`}
                  onClick={() => handleNav(item.id)}
                  className={`no-tap flex items-center justify-between rounded-2xl px-4 py-4 font-display text-base font-bold transition-all ${
                    isActive(item)
                      ? 'bg-[#fff0e3] text-[#f26d21]'
                      : 'bg-[#fffaf5] text-[#172237]'
                  }`}
                >
                  {item.label}

                  <ArrowRight
                    size={18}
                    className="text-[#ff7418]"
                  />
                </button>
              ))}

              {/* Secondary navigation */}
              {secondaryNav.map((item) => (
                <button
                  key={`m-s-${item.label}`}
                  onClick={() => handleNav(item.id)}
                  className="no-tap rounded-2xl px-4 py-3.5 text-left font-display text-base font-semibold text-[#5a6a80] transition-colors hover:bg-[#fff5ed] hover:text-[#f26d21]"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Auth actions */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {isLoggedIn ? (
                <>
                  {/* Dashboard */}
                  <button
                    onClick={() => handleNav('dashboard')}
                    className="rounded-full border border-[#dce5f7] px-4 py-3 font-display text-sm font-bold text-[#315dbb]"
                  >
                    Dashboard
                  </button>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      onSignOut();
                      setMobileOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#ff7418] px-4 py-3 font-display text-sm font-bold text-white"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  {/* Login */}
                  <button
                    onClick={() => handleNav('login')}
                    className="rounded-full border border-[#dce5f7] px-4 py-3 font-display text-sm font-bold text-[#315dbb]"
                  >
                    Log in
                  </button>

                  {/* Signup */}
                  <button
                    onClick={() => handleNav('signup')}
                    className="rounded-full bg-[#ff7418] px-4 py-3 font-display text-sm font-bold text-white"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
