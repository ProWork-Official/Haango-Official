import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, Clock3, Globe2, MapPin, RefreshCw, Users, UserRound } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const unwrap = (value) => value?.data ?? value ?? {};
const unwrapList = (value) => {
  const result = unwrap(value);
  return Array.isArray(result) ? result : [];
};
const sourceLabels = {
  DIRECT: 'Direct visit',
  GOOGLE_SEARCH: 'Google search',
  SOCIAL: 'Social media',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  X: 'X',
  TWITTER: 'X',
  LINKEDIN: 'LinkedIn',
  TELEGRAM: 'Telegram',
  DISCORD: 'Discord',
  REDDIT: 'Reddit',
  TIKTOK: 'TikTok',
  WHATSAPP: 'WhatsApp',
  CUSTOM_SHARE: 'Haango share link',
  EXTERNAL_REFERRAL: 'External referral',
  OTHER: 'Other tagged source',
};
const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');
const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
};
const formatVisitTime = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '—';
const normalizeSourceValue = (source, sourceDetail = '') => {
  const rawSource = String(source || '').trim().toUpperCase();
  const detail = String(sourceDetail || '').trim().toLowerCase();

  if (rawSource === 'SOCIAL' && /facebook|fb/.test(detail)) return 'FACEBOOK';
  if (rawSource === 'SOCIAL' && /instagram|ig\b|insta/.test(detail)) return 'INSTAGRAM';

  if (/FACEBOOK/.test(rawSource) || /facebook|fb/.test(detail)) return 'FACEBOOK';
  if (/INSTAGRAM/.test(rawSource) || /instagram|ig\b|insta/.test(detail)) return 'INSTAGRAM';
  if (/YOUTUBE/.test(rawSource) || /youtube|youtu\.be|yt\./.test(detail)) return 'YOUTUBE';
  if (/X|TWITTER/.test(rawSource) || /x\.com|twitter/.test(detail)) return 'X';
  if (/LINKEDIN/.test(rawSource) || /linkedin/.test(detail)) return 'LINKEDIN';
  if (/TELEGRAM/.test(rawSource) || /telegram|t\.me/.test(detail)) return 'TELEGRAM';
  if (/DISCORD/.test(rawSource) || /discord/.test(detail)) return 'DISCORD';
  if (/REDDIT/.test(rawSource) || /reddit|redd\.it/.test(detail)) return 'REDDIT';
  if (/TIKTOK/.test(rawSource) || /tiktok/.test(detail)) return 'TIKTOK';
  if (/WHATSAPP/.test(rawSource) || /whatsapp|wa\.me/.test(detail)) return 'WHATSAPP';
  if (/GOOGLE/.test(rawSource) || /google/.test(detail)) return 'GOOGLE_SEARCH';
  if (/CUSTOM_SHARE/.test(rawSource) || /share/.test(detail)) return 'CUSTOM_SHARE';
  if (/EXTERNAL_REFERRAL/.test(rawSource) || /referral/.test(detail)) return 'EXTERNAL_REFERRAL';
  if (rawSource === 'SOCIAL') return 'SOCIAL';
  return rawSource || 'DIRECT';
};
const formatSourceDetail = (source, sourceDetail = '') => {
  const detail = String(sourceDetail || '').trim();
  const normalized = normalizeSourceValue(source, sourceDetail);

  if (normalized === 'FACEBOOK') return 'www.facebook.com';
  if (normalized === 'INSTAGRAM') return 'www.instagram.com';

  if (!detail) {
    return sourceLabels[normalized] || 'Direct visit';
  }

  const host = detail
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
    .split('/')[0]
    .trim();

  if (!host) return detail;
  if (/^([a-z0-9-]+\.)+[a-z]{2,}(\.[a-z]{2,})?$/i.test(host)) {
    return `www.${host}`;
  }
  return host;
};
const getSourceBrand = (source, sourceDetail = '') => {
  const normalized = normalizeSourceValue(source, sourceDetail);
  if (normalized === 'GOOGLE_SEARCH') return { name: 'Google', tone: 'bg-white text-blue-600 border-[#e4ebf7]' };
  if (normalized === 'FACEBOOK') return { name: 'Facebook', tone: 'bg-blue-50 text-blue-700 border-[#d7e6ff]' };
  if (normalized === 'INSTAGRAM') return { name: 'Instagram', tone: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white border-transparent' };
  if (normalized === 'YOUTUBE') return { name: 'YouTube', tone: 'bg-red-50 text-red-600 border-[#ffd7d7]' };
  if (normalized === 'X' || normalized === 'TWITTER') return { name: 'X', tone: 'bg-slate-900 text-white border-slate-900' };
  if (normalized === 'LINKEDIN') return { name: 'LinkedIn', tone: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (normalized === 'TELEGRAM') return { name: 'Telegram', tone: 'bg-sky-50 text-sky-600 border-sky-200' };
  if (normalized === 'DISCORD') return { name: 'Discord', tone: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
  if (normalized === 'REDDIT') return { name: 'Reddit', tone: 'bg-orange-50 text-orange-600 border-orange-200' };
  if (normalized === 'TIKTOK') return { name: 'TikTok', tone: 'bg-black text-white border-black' };
  if (normalized === 'WHATSAPP') return { name: 'WhatsApp', tone: 'bg-emerald-50 text-emerald-700 border-[#d8f4e7]' };
  if (normalized === 'SOCIAL') return { name: 'Social', tone: 'bg-[#eef2f9] text-ink-700 border-[#e8edf6]' };
  if (normalized === 'EXTERNAL_REFERRAL') return { name: 'Referral', tone: 'bg-[#eef2f9] text-ink-700 border-[#e8edf6]' };
  if (normalized === 'CUSTOM_SHARE') return { name: 'Haango share', tone: 'bg-violet-50 text-violet-700 border-violet-200' };
  return { name: 'Direct', tone: 'bg-[#eef2f9] text-ink-700 border-[#e8edf6]' };
};
const SourceIcon = ({ source, sourceDetail }) => {
  const sourceValue = normalizeSourceValue(source, sourceDetail);
  const brand = getSourceBrand(sourceValue, sourceDetail);
  const common = 'flex h-8 w-8 items-center justify-center rounded-lg border text-lg shadow-sm';

  if (sourceValue === 'GOOGLE_SEARCH') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="Google logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.8 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.39a4.62 4.62 0 0 1-2 3.08v2.55h3.25c1.9-1.75 2.99-4.33 2.99-7.44Z" fill="#4285F4"/>
          <path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.25-2.55c-.9.6-2.09.97-3.38.97-2.6 0-4.8-1.75-5.58-4.09H.05v2.66A10 10 0 0 0 12 22Z" fill="#34A853"/>
          <path d="M6.42 19.86A6.06 6.06 0 0 1 6 16.7V14.1H2.62A9.96 9.96 0 0 0 2 12c0-1.62.39-3.16 1.08-4.52L6.57 10A5.97 5.97 0 0 1 6.42 12c0 .7.12 1.38.35 2.02l-.35.84Z" fill="#FBBC05"/>
          <path d="M12 4.98c1.17 0 2.23.4 3.06 1.18l2.25-2.25A9.95 9.95 0 0 0 12 2a10 10 0 0 0-9.95 8.1h3.96A6 6 0 0 1 12 4.98Z" fill="#EA4335"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'INSTAGRAM') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="Instagram logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="white" strokeWidth="1.7"/>
          <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.7"/>
          <circle cx="17.2" cy="6.8" r="1.2" fill="white"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'FACEBOOK') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="Facebook logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V7.5c0-.9.3-1.5 1.5-1.5H17V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V11H8v3.1h2.3v8h3.2Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'YOUTUBE') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="YouTube logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.6 7.2a2.9 2.9 0 0 0-2.03-2.04C17.8 4.8 12 4.8 12 4.8s-5.8 0-7.57.36A2.9 2.9 0 0 0 2.4 7.2 30.7 30.7 0 0 0 2 12a30.7 30.7 0 0 0 .4 4.8 2.9 2.9 0 0 0 2.03 2.04C6.2 19.2 12 19.2 12 19.2s5.8 0 7.57-.36a2.9 2.9 0 0 0 2.03-2.04A30.7 30.7 0 0 0 22 12a30.7 30.7 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'X' || sourceValue === 'TWITTER') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="X logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.9 2h3.4l-7.41 8.47L22.9 22h-6.7l-5.25-7.22L4.6 22H1.2l7.94-9.08L1.1 2h6.86l4.74 6.6L18.9 2Zm-1.2 18h1.86L7.14 3.9H5.2L17.7 20Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'LINKEDIN') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="LinkedIn logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.94 8.5A1.5 1.5 0 1 1 6.94 5.5a1.5 1.5 0 0 1 0 3Zm-1.25 2h2.5v8.5h-2.5V10.5Zm4.25 0h2.4v1.15h.03c.34-.64 1.15-1.32 2.36-1.32 2.53 0 2.99 1.66 2.99 3.82v6.85h-2.5v-6.4c0-1.52-.03-3.47-2.12-3.47-2.13 0-2.46 1.66-2.46 3.37v6.5h-2.5V10.5Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'TELEGRAM') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="Telegram logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.2 4.6 18.3 18.9c-.2 1-.9 1.3-1.8.8l-4.8-3.6-2.3 2.2a1.15 1.15 0 0 1-.9.4l.3-4.7 8.6-7.7c.4-.3-.1-.5-.6-.2L7.3 12.7l-4.7-1.5c-1-.3-1-1 .2-1.5l16.8-6.5c.8-.3 1.5.2 1.2 1.4Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'DISCORD') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="Discord logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.6 4.7A16.5 16.5 0 0 0 15.7 3l-.2.4a15.4 15.4 0 0 1-4.9 0L10.3 3A16.5 16.5 0 0 0 4.4 4.7C2.9 8.4 2.4 12 2.7 15.6a16.2 16.2 0 0 0 4.9 2.5l.6-.9c-.3-.2-.6-.4-.9-.7.2-.1.4-.2.6-.3.7-.3 1.4-.7 2-1.1.1 0 .2-.1.3-.2.1 0 .2 0 .3.1.5.3 1 .5 1.6.7.6-.2 1.1-.4 1.6-.7.1-.1.2-.1.3-.1.1.1.2.2.3.3.6.4 1.3.8 2 1.1.2.1.4.2.6.3-.3.3-.6.5-.9.7l.6.9a16.2 16.2 0 0 0 4.9-2.5c.3-3.6-.3-7.2-1.8-10.9ZM9.5 14.1c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7Zm5 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'REDDIT') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="Reddit logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.5 12.5a2 2 0 0 0-3.1-1.7l-1.4-1.4a.7.7 0 0 0-.9 0l-.1.1a.7.7 0 0 0 0 .9l1.5 1.5A2 2 0 1 0 18.5 12.5Zm-9.9 1.3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm2.6 4.1c-1.5 0-2.9-.9-3.2-2.2l-1.7.6c.7 2.7 3.4 4.6 6.4 4.6s5.7-1.9 6.4-4.6l-1.7-.6c-.3 1.3-1.7 2.2-3.2 2.2H11.2Zm4.6-5.4a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm-8.9 0a1.3 1.3 0 0 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'WHATSAPP') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="WhatsApp logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.05 4.95A9.86 9.86 0 0 0 12.1 2a9.9 9.9 0 0 0-8.72 15.15L2 22l4.96-1.3A9.9 9.9 0 1 0 19.05 4.95Zm-6.95 14.35c-1.14 0-2.27-.3-3.27-.86l-.23-.14-2.94.77.79-2.86-.15-.24A8.07 8.07 0 0 1 3.9 12a8.14 8.14 0 1 1 14.14 5.74l-.18.2-1.96 1.7.68 2.36-2.43-.66-.18-.12c-.94-.51-1.95-.77-2.98-.77Z"/>
          <path d="M15.9 13.8c-.2-.1-1.18-.58-1.36-.65-.18-.06-.31-.1-.44.1-.13.2-.5.65-.62.78-.12.13-.23.14-.43.05-.2-.1-.84-.31-1.6-.98-.59-.52-.98-1.16-1.1-1.36-.12-.2-.01-.31.09-.41.1-.1.2-.23.3-.35.1-.12.12-.2.18-.34.06-.14.03-.26-.02-.36-.05-.1-.44-1.06-.6-1.45-.16-.39-.32-.34-.44-.34h-.38c-.13 0-.34.05-.52.25-.18.2-.7.68-.7 1.67s.71 1.94.81 2.08c.1.14 1.4 2.13 3.39 2.99.47.2.84.32 1.13.41.47.15.9.13 1.24.08.38-.06 1.17-.48 1.34-.94.16-.46.16-.85.11-.94-.05-.09-.18-.14-.38-.24Z" fill="white"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'EXTERNAL_REFERRAL') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="X logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.9 2h3.4l-7.41 8.47L22.9 22h-6.7l-5.25-7.22L4.6 22H1.2l7.94-9.08L1.1 2h6.86l4.74 6.6L18.9 2Zm-1.2 18h1.86L7.14 3.9H5.2L17.7 20Z"/>
        </svg>
      </span>
    );
  }

  if (sourceValue === 'CUSTOM_SHARE') {
    return (
      <span className={`${common} ${brand.tone}`} aria-label="Haango share logo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 16a2.5 2.5 0 0 0-2 1.1l-7.1-4.1A2.5 2.5 0 0 0 8.5 12a2.5 2.5 0 0 0-.6-1.9L15.9 6A2.5 2.5 0 1 0 15 3.5a2.5 2.5 0 0 0 0 5l-7.4 4.3A2.5 2.5 0 0 0 7 14.5a2.5 2.5 0 1 0 1.1 4.3l7.5-4.3A2.5 2.5 0 1 0 18 16Z"/>
        </svg>
      </span>
    );
  }

  return (
    <span className={`${common} ${brand.tone}`} aria-label="Source logo">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3.75a8.25 8.25 0 1 0 8.25 8.25A8.26 8.26 0 0 0 12 3.75Zm0 14.5a6.25 6.25 0 1 1 6.25-6.25A6.26 6.26 0 0 1 12 18.25Zm5.7-10.95-2.48 2.49A3.7 3.7 0 0 0 12 9a3.7 3.7 0 0 0-3.22 1.79L6.3 8.3a5.94 5.94 0 0 1 11.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12.1v5.2M12 12.1l2.8-2.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
};
const formatPageLabel = (page) => {
  if (!page) return 'Unknown page';

  const cleanPage = String(page).split('?')[0].split('#')[0];
  const path = cleanPage.replace(/^\/+|\/+$/g, '');
  if (!path || path === '/') return 'Home';

  const routeMap = {
    '': 'Home',
    home: 'Home',
    explore: 'Explore',
    profile: 'Profile',
    booking: 'Booking',
    bookings: 'Bookings',
    dashboard: 'Dashboard',
    messages: 'Messages',
    'buddy-bookings': 'Buddy Bookings',
    'become-buddy': 'Become Buddy',
    'buddy-dashboard': 'Buddy Dashboard',
    experience: 'Experience',
    'how-it-works': 'How It Works',
    safety: 'Safety',
    about: 'About',
    admin: 'Admin',
    'platform-activity': 'Platform Activity',
    users: 'Users',
    buddies: 'Buddies',
    reports: 'Reports',
    reviews: 'Reviews',
    'email-campaigns': 'Email Campaigns',
    'support-requests': 'Support Requests',
    coupons: 'Coupons',
    login: 'Login',
    signup: 'Sign Up',
    faq: 'FAQ',
    contact: 'Contact',
    support: 'Support',
    'community-guidelines': 'Community Guidelines',
    'buddy-guidelines': 'Buddy Guidelines',
    'privacy-policy': 'Privacy Policy',
    terms: 'Terms',
    'cancellation-policy': 'Cancellation Policy',
    referrals: 'Referrals',
    'referral': 'Referrals',
  };

  const segments = path.split('/').filter(Boolean);
  const candidate = segments[segments.length - 1] || segments[0] || 'home';
  const normalized = String(candidate).toLowerCase();

  if (routeMap[normalized]) return routeMap[normalized];

  const decorated = normalized
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return decorated || 'Unknown page';
};
 const getPagePathDisplay = (page) => {
  if (!page) return '/';
  const cleanPage = String(page).split('?')[0].split('#')[0];
  const normalized = cleanPage.trim();
  return normalized && normalized !== '/' ? normalized : '/';
};
const getActivityQuery = (period) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const params = new URLSearchParams({ timezone });
  if (period === 'today' || period === 'yesterday') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (period === 'yesterday') start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    params.set('start', start.toISOString());
    params.set('end', end.toISOString());
  } else {
    params.set('days', period);
  }
  return params.toString();
};

function normalizeHourlyTrend(trend) {
  if (!Array.isArray(trend) || !trend.length) return trend;
  if (!trend.some((item) => String(item.date || '').includes('T'))) return trend;

  const buckets = new Map();
  trend.forEach((item) => {
    const raw = String(item.date || '');
    if (!raw) return;
    const baseDate = new Date(raw);
    if (Number.isNaN(baseDate.getTime())) return;
    const bucketHour = Math.floor(baseDate.getHours() / 2) * 2;
    const normalizedDate = new Date(baseDate);
    normalizedDate.setMinutes(0, 0, 0);
    normalizedDate.setHours(bucketHour);
    const key = normalizedDate.toISOString();
    if (!buckets.has(key)) {
      buckets.set(key, { date: key, visits: 0, uniqueUsers: 0 });
    }
    const bucket = buckets.get(key);
    bucket.visits += Number(item.visits || 0);
    bucket.uniqueUsers += Number(item.uniqueUsers || 0);
  });

  const ordered = [...buckets.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!ordered.length) return trend;

  const referenceDate = new Date(ordered[0].date);
  const start = new Date(referenceDate);
  start.setMinutes(0, 0, 0);
  start.setHours(0);

  const output = [];
  for (let slot = 0; slot < 12; slot += 1) {
    const bucket = new Date(start);
    bucket.setHours(slot * 2);
    const key = bucket.toISOString();
    const match = ordered.find((entry) => new Date(entry.date).toISOString() === key);
    output.push(match || { date: key, visits: 0, uniqueUsers: 0 });
  }

  return output;
}

function TrafficBars({ trend }) {
  const chartTrend = normalizeHourlyTrend(trend);
  const width = 720;
  const height = 180;
  const left = 34;
  const right = 8;
  const top = 12;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(1, ...chartTrend.map((item) => Number(item.visits || 0)));
  const interval = Math.max(1, Math.ceil(chartTrend.length / 7));
  const slotWidth = chartTrend.length ? plotWidth / chartTrend.length : plotWidth;
  const barWidth = Math.max(1, Math.min(8, slotWidth * 0.3));

  return (
    <div className="mt-4 min-w-0 overflow-hidden">
      <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Page visits and unique visitors over time">
        {[0, 1, 2, 3].map((step) => {
          const y = top + plotHeight * step / 3;
          return <g key={step}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#e8edf6" strokeDasharray="3 5" /><text x={left - 8} y={y + 4} textAnchor="end" fill="#71809a" fontSize="10">{Math.round(maximum * (3 - step) / 3)}</text></g>;
        })}
        {chartTrend.map((item, index) => {
          const visits = Number(item.visits || 0);
          const visitors = Number(item.uniqueUsers || 0);
          const x = left + slotWidth * index + (slotWidth - barWidth * 2 - 2) / 2;
          const visitsHeight = plotHeight * visits / maximum;
          const visitorsHeight = plotHeight * visitors / maximum;
          const label = new Date(item.date).toLocaleString('en-US', { hour: 'numeric', hour12: true });
          return <g key={item.date || index}>
            <title>{`${label}: ${visits} visits, ${visitors} visitors`}</title>
            <rect x={x} y={top + plotHeight - visitsHeight} width={barWidth} height={visitsHeight} rx="1" fill="#ff681f" />
            <rect x={x + barWidth + 2} y={top + plotHeight - visitorsHeight} width={barWidth} height={visitorsHeight} rx="1" fill="#2563eb" />
            {(index % interval === 0 || index === chartTrend.length - 1) && <text x={left + slotWidth * index + slotWidth / 2} y={height - 7} textAnchor="middle" fill="#71809a" fontSize="9">{label}</text>}
          </g>;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-5 text-xs font-medium text-ink-600">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-[#ff681f]" />Page visits</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-blue-600" />Unique visitors</span>
      </div>
    </div>
  );
}

export default function AdminPlatformActivityPage({ onNavigate }) {
  const [period, setPeriod] = useState('today');
  const [activity, setActivity] = useState({ summary: {}, sources: [], pages: [], recentVisits: [] });
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLivePopup, setShowLivePopup] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const recentVisitSessions = useMemo(() => {
    const groups = new Map();

    (Array.isArray(activity.recentVisits) ? activity.recentVisits : []).forEach((visit) => {
      const sessionKey = visit?.visitId || visit?.visitorId || visit?.id || `${visit?.displayName || 'guest'}-${visit?.lastSeenAt || visit?.timestamp || Date.now()}`;
      if (!groups.has(sessionKey)) {
        groups.set(sessionKey, {
          sessionKey,
          source: visit?.source,
          sourceDetail: visit?.sourceDetail,
          displayName: visit?.displayName || visit?.userName || 'Guest visitor',
          visitorType: visit?.visitorType || 'GUEST',
          location: visit?.location || 'Unknown',
          page: visit?.page,
          timestamp: visit?.timestamp,
          lastSeenAt: visit?.lastSeenAt || visit?.timestamp,
          pagesVisited: [],
          visitorId: visit?.visitorId,
          userName: visit?.userName,
        });
      }

      const group = groups.get(sessionKey);
      const entries = Array.isArray(visit?.pagesVisited) && visit.pagesVisited.length
        ? visit.pagesVisited.map((pageStep) => ({
            page: pageStep?.page || visit?.page,
            timestamp: pageStep?.timestamp || visit?.timestamp,
            timeSpent: Number(pageStep?.timeSpent || 0),
          }))
        : [{ page: visit?.page, timestamp: visit?.timestamp, timeSpent: Number(visit?.timeSpent || 0) }];

      group.pagesVisited.push(...entries);
      group.pagesVisited = [...group.pagesVisited]
        .filter((entry) => entry?.page)
        .sort((left, right) => new Date(left.timestamp || 0) - new Date(right.timestamp || 0));
      group.lastSeenAt = group.pagesVisited.length
        ? new Date(Math.max(...group.pagesVisited.map((entry) => new Date(entry.timestamp || 0).getTime())))
        : new Date(group.lastSeenAt || group.timestamp || Date.now());
      group.timestamp = group.pagesVisited.length ? group.pagesVisited[0].timestamp : group.timestamp;
      group.page = group.pagesVisited.length ? group.pagesVisited[0].page : group.page;
    });

    return [...groups.values()].map((session) => {
      const normalizedPages = (session.pagesVisited || []).map((entry) => ({
        page: entry.page,
        timestamp: entry.timestamp || session.timestamp,
        timeSpent: Number(entry.timeSpent || 0),
      }));
      const totalTimeSpent = normalizedPages.reduce((sum, entry) => sum + Number(entry.timeSpent || 0), 0);
      return {
        ...session,
        pagesVisited: normalizedPages,
        totalTimeSpent,
        landingPage: normalizedPages[0]?.page || session.page,
        sessionStartedAt: normalizedPages[0]?.timestamp || session.timestamp,
        sessionEndedAt: normalizedPages[normalizedPages.length - 1]?.timestamp || session.lastSeenAt,
      };
    }).sort((left, right) => new Date(right.sessionEndedAt || right.lastSeenAt || right.timestamp || 0) - new Date(left.sessionEndedAt || left.lastSeenAt || left.timestamp || 0));
  }, [activity.recentVisits]);

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      const query = getActivityQuery(period);
      setLoading(true);
      setError('');
      try {
        const [activityResponse, trendResponse] = await Promise.all([
          apiRequest(`/analytics/platform-activity?${query}`),
          apiRequest(`/analytics/traffic-trend?${query}`),
        ]);
        if (!active) return;
        setActivity(unwrap(activityResponse));
        setTrend(unwrapList(trendResponse));
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load platform activity.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadActivity();
    return () => { active = false; };
  }, [period]);

  const summary = activity.summary || {};
  const liveMinutes = 5;
  const liveVisits = Array.isArray(activity.recentVisits)
    ? activity.recentVisits.filter((visit) => {
        const timestamp = visit?.lastSeenAt ? new Date(visit.lastSeenAt).getTime() : visit?.timestamp ? new Date(visit.timestamp).getTime() : 0;
        return Number.isFinite(timestamp) && Date.now() - timestamp <= liveMinutes * 60 * 1000;
      })
    : [];
  const liveVisitDetails = liveVisits.slice(0, 5);
  const metrics = [
    { label: 'Page visits', value: summary.totalVisits, Icon: Activity, tone: 'orange' },
    { label: 'Unique visitors', value: summary.uniqueVisitors, Icon: Users, tone: 'blue' },
    { label: 'Guest visitors', value: summary.guestVisitors, Icon: Globe2, tone: 'green' },
    { label: 'Signed-in visitors', value: summary.signedInVisitors, Icon: UserRound, tone: 'violet' },
  ];

  return (
    <AdminLayout activePage="platform-activity" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-500">Traffic, acquisition sources, and visit activity</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">Platform activity</h1>
            </div>
            <button type="button" onClick={() => onNavigate('/admin')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-4 py-2.5 text-xs font-bold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Admin dashboard</button>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-[#e9eef7] p-1" aria-label="Activity date range">
              {[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
              ].map(({ value, label }) => <button key={value} type="button" onClick={() => setPeriod(value)} aria-pressed={period === value} className={`rounded-full px-4 py-2 text-xs font-bold transition ${period === value ? 'bg-white text-blue-700 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}>{label}</button>)}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setShowLivePopup((open) => !open)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold transition ${liveVisits.length ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-[#e8edf6] bg-white text-ink-500 hover:bg-[#f8fafe]'}`} aria-expanded={showLivePopup} aria-label="Toggle live activity details">
                <span className={`h-2.5 w-2.5 rounded-full ${liveVisits.length ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                {liveVisits.length ? `Live session active • ${liveVisits.length} active now` : 'No live sessions right now'}
              </button>

              {showLivePopup && (
                <div className="absolute right-0 top-full z-20 mt-2 w-[320px] rounded-xl border border-[#e8edf6] bg-white p-3 shadow-[0_14px_30px_rgba(16,24,40,0.12)]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">Live visitors</p>
                    <button type="button" onClick={() => setShowLivePopup(false)} className="text-[10px] font-semibold text-ink-500 hover:text-ink-800">Close</button>
                  </div>
                  {liveVisitDetails.length ? (
                    <div className="space-y-2">
                      {liveVisitDetails.map((visit) => (
                        <div key={visit.id || `${visit.page}-${visit.lastSeenAt || visit.timestamp}`} className="rounded-lg border border-[#edf1f7] bg-[#fafcff] px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-ink-800">{visit.displayName || visit.userName || 'Guest visitor'}</p>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${visit.visitorType === 'SIGNED_IN' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {visit.visitorType === 'SIGNED_IN' ? 'Signed in' : 'Guest'}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-ink-600">
                            <p className="truncate">Current page: {formatPageLabel(visit.page)}</p>
                            {Array.isArray(visit.pagesVisited) && visit.pagesVisited.length > 0 && (
                              <div className="mt-2 border-l border-[#dfe6f3] pl-2">
                                {visit.pagesVisited.slice(-5).map((pageStep, stepIndex) => (
                                  <div key={`${visit.id || visit.page}-step-${stepIndex}`} className="relative mb-1.5 pl-2 last:mb-0 before:absolute before:left-[-0.45rem] before:top-[0.45rem] before:h-2 before:w-2 before:rounded-full before:bg-emerald-500">
                                    <p className="text-[9px] font-semibold text-ink-700">{formatPageLabel(pageStep?.page)}</p>
                                    <p className="text-[8px] text-ink-400">{pageStep?.timestamp ? formatVisitTime(pageStep.timestamp) : 'Now'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-ink-500">
                            <span>{formatSourceDetail(visit.source, visit.sourceDetail)}</span>
                            <span>{visit.lastSeenAt ? formatVisitTime(visit.lastSeenAt) : visit.timestamp ? formatVisitTime(visit.timestamp) : 'Now'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-center text-xs text-ink-500">No active visitors in the last 5 minutes.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <p className="mb-5 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
          {loading ? <p className="py-12 text-center text-sm text-ink-500">Loading platform activity…</p> : <>
            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {metrics.map(({ label, value, Icon, tone }) => {
                const colors = {
                  orange: 'bg-orange-100 text-[#e95718]',
                  blue: 'bg-blue-100 text-blue-700',
                  green: 'bg-emerald-100 text-emerald-700',
                  violet: 'bg-violet-100 text-violet-700',
                };
                return <section key={label} className="min-h-32 rounded-xl border border-[#e8edf6] bg-white p-4 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                  <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${colors[tone]}`}><Icon size={18} /></span>
                  <p className="font-display text-2xl font-extrabold text-ink-900">{formatNumber(value)}</p>
                  <p className="mt-1 text-xs font-medium text-ink-500">{label}</p>
                </section>;
              })}
            </div>

            <section className="mb-5 min-w-0 rounded-xl border border-[#e8edf6] bg-white p-5 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-display text-lg font-bold text-ink-900">Traffic trend</h2><p className="mt-1 text-xs text-ink-500">Daily page views and unique visitors</p></div>
                <div className="text-right"><p className="font-display text-xl font-extrabold text-ink-900">{formatDuration(summary.avgTimeSpent)}</p><p className="text-[11px] text-ink-500">Average visit</p></div>
              </div>
              {trend.length ? <TrafficBars trend={trend} /> : <p className="py-12 text-center text-sm text-ink-500">No traffic recorded in this period.</p>}
            </section>

            <section className="mb-5 min-w-0 overflow-hidden rounded-xl border border-[#e8edf6] bg-white shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
              <div className="flex items-center justify-between gap-3 border-b border-[#edf1f7] px-5 py-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink-900">Recent Page Visits</h2>
                  <p className="mt-1 text-xs text-ink-500">Latest visits across Haango</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[#e8edf6] bg-[#f8faff] px-3 py-1.5 font-semibold text-ink-600">All visitors</button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[#e8edf6] bg-[#f8faff] px-3 py-1.5 font-semibold text-ink-600">Today</button>
                </div>
              </div>
              <div className="max-h-136 overflow-auto">
                <table className="w-full min-w-190 border-collapse text-left">
                  <thead className="sticky top-0 bg-[#f6f8fc] text-[11px] font-semibold text-ink-500"><tr><th className="px-4 py-3">Source</th><th className="px-3 py-3">Visitor</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Landing Page</th><th className="px-3 py-3">Time</th></tr></thead>
                  <tbody className="divide-y divide-[#edf1f7]">
                    {recentVisitSessions.length ? recentVisitSessions.map((visit) => (
                      <tr key={visit.sessionKey} className="cursor-pointer hover:bg-[#fbfcff]" onClick={() => setSelectedSession(visit)}>
                        <td className="max-w-48 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <SourceIcon source={visit.source} sourceDetail={visit.sourceDetail} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink-800">{getSourceBrand(visit.source, visit.sourceDetail).name}</p>
                              {/* <p className="mt-0.5 truncate text-[10px] text-ink-500">{formatSourceDetail(visit.source, visit.sourceDetail)}</p> */}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${visit.visitorType === 'SIGNED_IN' ? 'bg-orange-100 text-[#e95718]' : 'bg-blue-50 text-blue-700'}`}>{visit.displayName || visit.userName || 'Guest visitor'}</span>
                            {/* <span className={`inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-bold ${visit.visitorType === 'SIGNED_IN' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{visit.visitorType === 'SIGNED_IN' ? 'Signed in' : 'Guest'}</span> */}
                          </div>
                        </td>
                        <td className="min-w-36 px-3 py-3 text-xs text-ink-600"><span className="inline-flex items-center gap-1.5"><MapPin size={12} className="shrink-0 text-ink-400" />{visit.location || 'Unknown'}</span></td>
                        <td className="max-w-52 px-3 py-3 text-xs text-ink-700">
                          <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedSession(visit); }} className="flex min-w-0 flex-col text-left transition hover:text-blue-700">
                            <span className="truncate font-semibold text-ink-700">{formatPageLabel(visit.landingPage || visit.page)}</span>
                            <span className="truncate text-[10px] text-ink-400">{getPagePathDisplay(visit.landingPage || visit.page)}</span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-600">
                          <div className="flex items-center justify-end gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#ff681f]" />
                            <span>{formatDuration(visit.totalTimeSpent || 0)}</span>
                          </div>
                        </td>
                      </tr>
                    )) : <tr><td colSpan="5" className="px-4 py-12 text-center text-sm text-ink-500">No page visits recorded in this period.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mb-5 grid gap-4 xl:grid-cols-2">
              <section className="min-w-0 rounded-xl border border-[#e8edf6] bg-white p-5 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink-900">Popular Pages</h2><p className="mt-1 text-xs text-ink-500">Most visited paths in this period</p></div><ArrowRight size={17} className="text-blue-600" /></div>
                {activity.pages?.length ? <div className="space-y-3">
                  {(() => {
                    const maxVisits = Math.max(1, ...activity.pages.map((page) => Number(page.visits || 0)));
                    return activity.pages.map((page, index) => {
                      const title = formatPageLabel(page.page);
                      const rawPath = getPagePathDisplay(page.page);
                      const width = Math.max(8, ((Number(page.visits || 0) / maxVisits) * 100));

                      return (
                        <div key={`${page.page}-${index}`} className="rounded-xl border border-[#edf1f7] bg-[#f9fbff] p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-xs font-extrabold text-orange-600">{String(index + 1).padStart(2, '0')}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-ink-800">{title}</p>
                                  <p className="truncate text-[10px] text-ink-500">{rawPath}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-bold text-ink-900">{formatNumber(page.visits)}</p>
                                  <p className="text-[10px] text-ink-500">{formatNumber(page.uniqueVisitors)} visitors</p>
                                </div>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf1f7]">
                                <div className="h-full rounded-full bg-[#ff681f]" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div> : <p className="py-10 text-center text-sm text-ink-500">No popular pages recorded.</p>}
              </section>

              <section className="min-w-0 rounded-xl border border-[#e8edf6] bg-white p-5 shadow-[0_4px_16px_rgba(36,72,130,0.04)]">
                <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Globe2 size={18} /></span><div><h2 className="font-display text-lg font-bold text-ink-900">Acquisition sources</h2><p className="text-xs text-ink-500">Source and visitor type</p></div></div>
                {activity.sources?.length ? <div className="divide-y divide-[#edf1f7]">
                  {activity.sources.map((source) => <div key={source.source} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-ink-800">{sourceLabels[normalizeSourceValue(source.source, source.sourceDetail)] || formatSourceDetail(source.source, source.sourceDetail)}</p><p className="mt-0.5 truncate text-[11px] text-ink-500">{normalizeSourceValue(source.source, source.sourceDetail) === 'DIRECT' ? 'No referring source' : formatSourceDetail(source.source, source.sourceDetail)}</p></div><strong className="shrink-0 text-sm text-ink-900">{formatNumber(source.visits)} visits</strong></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf1f7]"><div className="h-full rounded-full bg-[#ff681f]" style={{ width: `${Math.min(100, source.visits / Math.max(1, summary.totalVisits) * 100)}%` }} /></div>
                    <p className="mt-1.5 text-[11px] text-ink-500">{formatNumber(source.uniqueVisitors)} visitors · {formatNumber(source.guestVisitors)} guests · {formatNumber(source.signedInVisitors)} signed in</p>
                  </div>)}
                </div> : <p className="py-10 text-center text-sm text-ink-500">No acquisition data recorded.</p>}
              </section>
            </div>
            <p className="inline-flex items-center gap-2 text-[11px] text-ink-400"><RefreshCw size={12} /> Activity is based on browser visit records and may include repeat page views. IP locations can be approximate or unavailable.</p>
          </>}

          {selectedSession && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]" onClick={() => setSelectedSession(null)}>
              <div className="w-full max-w-2xl rounded-2xl border border-[#e8edf6] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Session details</p>
                    <h3 className="mt-1 font-display text-xl font-bold text-ink-900">{selectedSession.displayName || 'Guest visitor'}</h3>
                  </div>
                  <button type="button" onClick={() => setSelectedSession(null)} className="rounded-full border border-[#e8edf6] bg-[#f8faff] px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-[#eef4ff]">Close</button>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#edf1f7] bg-[#f8faff] p-3">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-ink-500">Source</p>
                    <div className="mt-2 flex items-center gap-2">
                      <SourceIcon source={selectedSession.source} sourceDetail={selectedSession.sourceDetail} />
                      <span className="text-sm font-semibold text-ink-800">{getSourceBrand(selectedSession.source, selectedSession.sourceDetail).name}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#edf1f7] bg-[#f8faff] p-3">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-ink-500">Started</p>
                    <p className="mt-2 text-sm font-semibold text-ink-800">{formatVisitTime(selectedSession.sessionStartedAt || selectedSession.timestamp)}</p>
                  </div>
                  <div className="rounded-xl border border-[#edf1f7] bg-[#f8faff] p-3">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-ink-500">Session time</p>
                    <p className="mt-2 text-sm font-semibold text-ink-800">{formatDuration(selectedSession.totalTimeSpent || 0)}</p>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-auto rounded-xl border border-[#edf1f7] bg-[#fafcff]">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-[#f5f8fd] text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">
                      <tr>
                        <th className="px-4 py-3">Page</th>
                        <th className="px-4 py-3">Time on page</th>
                        <th className="px-4 py-3">Visited at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf1f7]">
                      {(selectedSession.pagesVisited || []).map((pageStep, index) => (
                        <tr key={`${selectedSession.sessionKey || selectedSession.displayName}-${pageStep.page}-${index}`} className="bg-white">
                          <td className="px-4 py-3 text-sm font-semibold text-ink-800">
                            <div className="min-w-0">
                              <p className="truncate">{formatPageLabel(pageStep.page)}</p>
                              <p className="truncate text-[10px] text-ink-500">{getPagePathDisplay(pageStep.page)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-ink-700">{formatDuration(pageStep.timeSpent || 0)}</td>
                          <td className="px-4 py-3 text-sm text-ink-600">{formatVisitTime(pageStep.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}