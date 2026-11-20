export function isIndiaCountry(country) {
  return String(country || '').trim().toLowerCase() === 'india';
}
