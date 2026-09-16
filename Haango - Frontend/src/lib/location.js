export function requestLocationPermission() {
  if (!navigator.geolocation) {
    return Promise.resolve({ granted: false, reason: 'unsupported' });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve({ granted: true }),
      (error) => resolve({ granted: false, reason: error.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
