const GEOLOCATION_URL = 'https://ipwho.is/?fields=success,country_code';

export async function checkIndiaAvailability() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(GEOLOCATION_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('The country lookup request failed.');

    const location = await response.json();
    if (location?.success !== true || typeof location.country_code !== 'string') {
      throw new Error('The country lookup returned an invalid response.');
    }

    return location.country_code.trim().toUpperCase() === 'IN';
  } finally {
    clearTimeout(timeout);
  }
}
