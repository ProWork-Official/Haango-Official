const SOCIAL_HOSTS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'youtube.com',
];

const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

export function normalizeReferrerOrigin(referrer = '') {
  try {
    const url = new URL(referrer);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
  } catch {
    return '';
  }
}

export function classifyAcquisitionSource(referrer = '', landingUrl = '', siteOrigin = '') {
  let referrerHost = '';
  let siteHost = '';
  let parameters;

  try {
    referrerHost = referrer ? new URL(referrer).hostname.toLowerCase() : '';
  } catch {
    referrerHost = '';
  }

  try {
    siteHost = siteOrigin ? new URL(siteOrigin).hostname.toLowerCase() : '';
  } catch {
    siteHost = '';
  }

  if (referrerHost && referrerHost === siteHost) referrerHost = '';

  try {
    parameters = new URL(landingUrl, 'https://haango.invalid').searchParams;
  } catch {
    parameters = new URLSearchParams();
  }

  const taggedSource = String(parameters.get('utm_source') || '').trim().toLowerCase().slice(0, 80);
  const taggedMedium = String(parameters.get('utm_medium') || '').trim().toLowerCase().slice(0, 80);
  const sourceHint = `${taggedSource} ${taggedMedium}`;

  if (/whatsapp|wa\.me/.test(sourceHint) || hostMatches(referrerHost, 'whatsapp.com') || hostMatches(referrerHost, 'wa.me')) {
    return { acquisitionSource: 'WHATSAPP', acquisitionDetail: taggedSource || referrerHost };
  }

  if (/haango.*share|share.*haango|custom.*share/.test(sourceHint) || taggedMedium === 'share') {
    return { acquisitionSource: 'CUSTOM_SHARE', acquisitionDetail: taggedSource || 'Haango share link' };
  }

  if (SOCIAL_HOSTS.some((domain) => hostMatches(referrerHost, domain)) || /facebook|instagram|linkedin|tiktok|twitter|youtube|social/.test(sourceHint)) {
    return { acquisitionSource: 'SOCIAL', acquisitionDetail: taggedSource || referrerHost };
  }

  if (hostMatches(referrerHost, 'google.com') || /(^|\.)google\.[a-z.]+$/.test(referrerHost) || taggedSource === 'google' && /organic|search/.test(taggedMedium)) {
    return { acquisitionSource: 'GOOGLE_SEARCH', acquisitionDetail: taggedSource || referrerHost };
  }

  if (referrerHost) {
    return { acquisitionSource: 'EXTERNAL_REFERRAL', acquisitionDetail: referrerHost.slice(0, 120) };
  }

  if (taggedSource) {
    return { acquisitionSource: 'OTHER', acquisitionDetail: taggedSource };
  }

  return { acquisitionSource: 'DIRECT', acquisitionDetail: '' };
}