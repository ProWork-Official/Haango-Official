import { useEffect } from 'react';

function project(latitude, longitude, zoom) {
  const scale = 256 * (2 ** zoom);
  const x = ((longitude + 180) / 360) * scale;
  const sine = Math.sin((latitude * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export default function LiveLocationMap({ locations, onClose, onRefresh }) {
  useEffect(() => {
    if (!onRefresh) return undefined;
    const interval = window.setInterval(onRefresh, 10000);
    return () => window.clearInterval(interval);
  }, [onRefresh]);
  if (!locations?.length) return null;
  const minLatitude = Math.min(...locations.map((item) => item.latitude));
  const maxLatitude = Math.max(...locations.map((item) => item.latitude));
  const minLongitude = Math.min(...locations.map((item) => item.longitude));
  const maxLongitude = Math.max(...locations.map((item) => item.longitude));
  const centerLatitude = (minLatitude + maxLatitude) / 2;
  const centerLongitude = (minLongitude + maxLongitude) / 2;
  const spread = Math.max(maxLatitude - minLatitude, maxLongitude - minLongitude, 0.002);
  const zoom = Math.max(11, Math.min(17, Math.floor(Math.log2(360 / (spread * 3)))));
  const center = project(centerLatitude, centerLongitude, zoom);
  const markers = locations.map((location) => {
    const point = project(location.latitude, location.longitude, zoom);
    return {
      ...location,
      left: (point.x - center.x),
      top: (point.y - center.y),
    };
  });
  const tileX = Math.floor(center.x / 256);
  const tileY = Math.floor(center.y / 256);
  const tiles = [];
  for (let x = tileX - 2; x <= tileX + 2; x += 1) {
    for (let y = tileY - 2; y <= tileY + 2; y += 1) {
      tiles.push({ x, y, left: (x - tileX) * 256 - (center.x % 256), top: (y - tileY) * 256 - (center.y % 256) });
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">Live meeting locations</p>
          <p className="text-xs text-ink-500">Blue: you · Green: companion</p>
        </div>
        <button onClick={onClose} className="text-sm font-semibold text-ink-500">Close map</button>
      </div>
      <div className="relative mt-3 h-80 overflow-hidden rounded-xl bg-sky-100">
        {tiles.map((tile) => (
          <img key={`${tile.x}:${tile.y}`} alt="" src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} className="pointer-events-none absolute max-w-none" style={{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)`, width: 256, height: 256 }} />
        ))}
        {markers.map((marker) => (
          <span key={String(marker.userId)} title={marker.isCurrent ? 'Your live location' : 'Companion live location'} className={`absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-full rounded-full border-2 border-white shadow-lg ${marker.isCurrent ? 'bg-blue-600' : 'bg-green-600'}`} style={{ left: `calc(50% + ${marker.left}px)`, top: `calc(50% + ${marker.top}px)` }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-600">
        {markers.map((marker) => <span key={String(marker.userId)}>{marker.isCurrent ? 'Your location' : 'Companion location'} · {marker.isStale ? 'Stale · ' : ''}{new Date(marker.updatedAt).toLocaleTimeString()}</span>)}
      </div>
    </div>
  );
}
