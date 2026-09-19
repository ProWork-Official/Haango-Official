import { useEffect, useRef, useState } from 'react';

let googleMapsPromise;

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Google Maps API key is missing.'));

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.dataset.googleMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Google Maps failed to load. Check the API key and referrer restrictions.'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function LiveLocationMap({ locations, onClose, onRefresh }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const directionsRendererRef = useRef(null);
  const [mapError, setMapError] = useState('');
  const [routeError, setRouteError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    if (!onRefresh) return undefined;
    const interval = window.setInterval(onRefresh, 10000);
    return () => window.clearInterval(interval);
  }, [onRefresh]);

  useEffect(() => {
    if (!locations?.length || !mapElement.current) return undefined;
    let active = true;

    loadGoogleMaps().then((maps) => {
      if (!active || !mapElement.current) return;
      if (!mapRef.current) {
        mapRef.current = new maps.Map(mapElement.current, {
          center: { lat: Number(locations[0].latitude), lng: Number(locations[0].longitude) },
          zoom: 14, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        });
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = locations.map((location) => {
        return new maps.Marker({
          map: mapRef.current,
          position: { lat: Number(location.latitude), lng: Number(location.longitude) },
          title: location.isCurrent ? 'Your live location' : 'Companion live location',
          label: location.isCurrent ? 'Y' : 'C',
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: location.isCurrent ? '#2563eb' : '#16a34a',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
      });
      const bounds = new maps.LatLngBounds();
      locations.forEach((location) => bounds.extend({ lat: Number(location.latitude), lng: Number(location.longitude) }));
      mapRef.current.fitBounds(bounds, 80);
      if (locations.length === 1) mapRef.current.setZoom(15);

      if (locations.length >= 2) {
        setRouteError('');
        const currentLocation = locations.find((location) => location.isCurrent) || locations[0];
        const companionLocation = locations.find((location) => !location.isCurrent) || locations[1];
        const directionsService = new maps.DirectionsService();
        if (!directionsRendererRef.current) {
          directionsRendererRef.current = new maps.DirectionsRenderer({
            map: mapRef.current,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#ff6b4a', strokeOpacity: 0.9, strokeWeight: 5 },
          });
        }
        directionsService.route({
          origin: { lat: Number(currentLocation.latitude), lng: Number(currentLocation.longitude) },
          destination: { lat: Number(companionLocation.latitude), lng: Number(companionLocation.longitude) },
          travelMode: maps.TravelMode.WALKING,
        }, (result, status) => {
          if (!active) return;
          if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
            directionsRendererRef.current.setDirections(result);
            const leg = result.routes[0].legs[0];
            setRouteInfo({ distance: leg.distance?.text || '', duration: leg.duration?.text || '' });
          } else {
            setRouteInfo(null);
            setRouteError('Walking directions are unavailable here, but you can still use the blue and green dots to reach each other.');
          }
        });
      } else {
        directionsRendererRef.current?.setDirections({ routes: [] });
        setRouteInfo(null);
        setRouteError('');
      }
      setMapError('');
    }).catch((error) => {
      if (active) setMapError(error.message || 'Unable to load Google Maps.');
    });

    return () => { active = false; };
  }, [locations]);

  if (!locations?.length) return null;

  return (
    <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">Live meeting locations</p>
          <p className="text-xs text-ink-500">Blue: you · Green: companion</p>
        </div>
        <button onClick={onClose} className="text-sm font-semibold text-ink-500">Close map</button>
      </div>
      <div ref={mapElement} className="relative mt-3 h-80 overflow-hidden rounded-xl bg-sky-100" />
      {mapError && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{mapError}</p>}
      {routeError && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{routeError}</p>}
      {routeInfo && <p className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-700">Route to companion: {routeInfo.distance} · about {routeInfo.duration} walking</p>}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-600">
        {locations.map((location) => <span key={String(location.userId)}>{location.isCurrent ? 'Your location' : 'Companion location'} · {location.isStale ? 'Stale · ' : ''}{new Date(location.updatedAt).toLocaleTimeString()}</span>)}
      </div>
    </div>
  );
}
