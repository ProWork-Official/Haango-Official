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

export function getCurrentLocation() {
  if (!navigator.geolocation) return Promise.reject({ code: 0 });

  return new Promise((resolve, reject) => {
    let permissionState = 'unknown';
    const standardOptions = {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 300000,
    };
    const finishWithError = (error) => {
      reject({ code: error.code, message: error.message, permissionState });
    };
    const retryWithStandardAccuracy = () => {
      navigator.geolocation.getCurrentPosition(resolve, finishWithError, standardOptions);
    };

    const requestPosition = () => navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if ([1, 2, 3].includes(error.code)) retryWithStandardAccuracy(error);
        else finishWithError(error);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
    );

    if (!navigator.permissions?.query) {
      requestPosition();
      return;
    }

    navigator.permissions.query({ name: 'geolocation' })
      .then((permission) => {
        permissionState = permission.state;
        if (permissionState === 'denied') {
          finishWithError({ code: 1 });
          return;
        }
        requestPosition();
      })
      .catch(requestPosition);
  });
}
