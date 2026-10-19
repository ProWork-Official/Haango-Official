const SOCIAL_HOSTS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'telegram.org',
  't.me',
  'discord.com',
  'discordapp.com',
  'reddit.com',
  'redd.it',
];

const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

const classifySocialSource = (sourceHint = '', referrerHost = '') => {
  const hint = sourceHint.toLowerCase();
  const host = referrerHost ? referrerHost.replace(/^www\./, '') : '';

  if (/facebook/.test(hint) || hostMatches(referrerHost, 'facebook.com')) return { acquisitionSource: 'FACEBOOK', acquisitionDetail: host ? `www.${host}` : 'www.facebook.com' };
  if (/instagram|ig\b/.test(hint) || hostMatches(referrerHost, 'instagram.com')) return { acquisitionSource: 'INSTAGRAM', acquisitionDetail: host ? `www.${host}` : 'www.instagram.com' };
  if (/youtube|yt\b/.test(hint) || hostMatches(referrerHost, 'youtube.com')) return { acquisitionSource: 'YOUTUBE', acquisitionDetail: host ? `www.${host}` : 'www.youtube.com' };
  if (/twitter|x\.com|tweet/.test(hint) || hostMatches(referrerHost, 'twitter.com') || hostMatches(referrerHost, 'x.com')) return { acquisitionSource: 'X', acquisitionDetail: referrerHost || 'x.com' };
  if (/linkedin/.test(hint) || hostMatches(referrerHost, 'linkedin.com')) return { acquisitionSource: 'LINKEDIN', acquisitionDetail: 'linkedin.com' };
  if (/telegram|t\.me/.test(hint) || hostMatches(referrerHost, 'telegram.org') || hostMatches(referrerHost, 't.me')) return { acquisitionSource: 'TELEGRAM', acquisitionDetail: referrerHost || 'telegram' };
  if (/discord/.test(hint) || hostMatches(referrerHost, 'discord.com') || hostMatches(referrerHost, 'discordapp.com')) return { acquisitionSource: 'DISCORD', acquisitionDetail: referrerHost || 'discord.com' };
  if (/reddit|redd\.it/.test(hint) || hostMatches(referrerHost, 'reddit.com') || hostMatches(referrerHost, 'redd.it')) return { acquisitionSource: 'REDDIT', acquisitionDetail: referrerHost || 'reddit.com' };
  if (/tiktok/.test(hint) || hostMatches(referrerHost, 'tiktok.com')) return { acquisitionSource: 'TIKTOK', acquisitionDetail: 'tiktok.com' };
  if (/whatsapp|wa\.me/.test(hint) || hostMatches(referrerHost, 'whatsapp.com') || hostMatches(referrerHost, 'wa.me')) return { acquisitionSource: 'WHATSAPP', acquisitionDetail: referrerHost || 'whatsapp' };
  return { acquisitionSource: 'SOCIAL', acquisitionDetail: referrerHost || 'social' };
};

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

  if (/gmail|googlemail|mail\.google/.test(sourceHint)
    || hostMatches(referrerHost, 'gmail.com')
    || hostMatches(referrerHost, 'googlemail.com')
    || hostMatches(referrerHost, 'mail.google.com')) {
    return { acquisitionSource: 'GMAIL', acquisitionDetail: taggedSource || referrerHost };
  }

  if (/whatsapp|wa\.me/.test(sourceHint) || hostMatches(referrerHost, 'whatsapp.com') || hostMatches(referrerHost, 'wa.me')) {
    return { acquisitionSource: 'WHATSAPP', acquisitionDetail: taggedSource || referrerHost };
  }

  if (/haango.*share|share.*haango|custom.*share/.test(sourceHint) || taggedMedium === 'share') {
    return { acquisitionSource: 'CUSTOM_SHARE', acquisitionDetail: taggedSource || 'Haango share link' };
  }

  if (SOCIAL_HOSTS.some((domain) => hostMatches(referrerHost, domain)) || /facebook|instagram|linkedin|tiktok|twitter|youtube|telegram|discord|reddit|social/.test(sourceHint)) {
    return classifySocialSource(sourceHint, referrerHost);
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