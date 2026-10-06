import { isIP } from 'node:net';

const cache = new Map();
const pendingLookups = new Map();
const cacheTtlMs = 6 * 60 * 60 * 1000;
const failedLookupCacheTtlMs = 5 * 60 * 1000;
const cacheLimit = 5000;
const lookupTimeoutMs = 3000;

function isPublicIpv4(ipAddress) {
  const [first, second, third] = ipAddress.split('.').map(Number);
  return !(
    first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && (second === 0 || second === 168))
    || (first === 198 && (second === 18 || second === 19 || second === 51))
    || (first === 203 && second === 0 && third === 113)
    || first >= 224
  );
}

export function isPublicIp(ipAddress) {
  const address = String(ipAddress || '').trim().toLowerCase();
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;

  const mappedIpv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPublicIpv4(mappedIpv4);
  return !(
    address === '::'
    || address === '::1'
    || address.startsWith('fc')
    || address.startsWith('fd')
    || /^fe[89ab]/.test(address)
    || address.startsWith('ff')
    || address.startsWith('2001:db8:')
  );
}

export function normalizeLocation(payload) {
  if (!payload?.success) return null;
  const location = {
    country: String(payload.country || '').trim().slice(0, 80),
    region: String(payload.region || '').trim().slice(0, 80),
    city: String(payload.city || '').trim().slice(0, 80),
  };
  return Object.values(location).some(Boolean) ? location : null;
}

function cacheLocation(ipAddress, location) {
  if (cache.size >= cacheLimit) cache.delete(cache.keys().next().value);
  const ttl = location ? cacheTtlMs : failedLookupCacheTtlMs;
  cache.set(ipAddress, { location, expiresAt: Date.now() + ttl });
}

export async function lookupIpLocation(ipAddress) {
  const address = String(ipAddress || '').trim().toLowerCase();
  if (!isPublicIp(address)) return null;

  const cached = cache.get(address);
  if (cached && cached.expiresAt > Date.now()) return cached.location;
  if (pendingLookups.has(address)) return pendingLookups.get(address);

  const lookup = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), lookupTimeoutMs);
    try {
      const response = await fetch(`https://ipwho.is/${encodeURIComponent(address)}?fields=success,country,region,city`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return normalizeLocation(await response.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  })();

  pendingLookups.set(address, lookup);
  try {
    const location = await lookup;
    cacheLocation(address, location);
    return location;
  } finally {
    pendingLookups.delete(address);
  }
}