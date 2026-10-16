export const buddyCityOptions = ['Prayagraj', 'Lucknow', 'Greater Noida', 'Noida', 'Kanpur'];

export const indianStateOptions = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export function getBuddyCitySelection(city = '') {
  const cityName = String(city || '').trim();
  const matchedCity = buddyCityOptions.find((option) => option.toLowerCase() === cityName.toLowerCase());
  if (matchedCity) return { city: matchedCity, otherCity: '' };
  if (cityName) return { city: 'Other', otherCity: cityName };
  return { city: '', otherCity: '' };
}

export function resolveBuddyCity(city, otherCity) {
  return city === 'Other' ? String(otherCity || '').trim() : city;
}
