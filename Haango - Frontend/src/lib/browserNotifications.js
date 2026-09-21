export function hasBrowserNotificationSupport() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestBrowserNotificationPermission() {
  if (!hasBrowserNotificationSupport()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  return Notification.requestPermission();
}

function decodeBase64Url(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value.replace(/-/g, '+').replace(/_/g, '/')}${padding}`;
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export async function registerPushSubscription(apiRequest) {
  if (!hasBrowserNotificationSupport() || !('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return false;
  }

  const keyResponse = await apiRequest('/push-subscriptions/public-key');
  const publicKey = keyResponse?.publicKey;
  if (!publicKey) return false;

  const registration = await navigator.serviceWorker.register('/sw.js');
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(publicKey),
  });

  await apiRequest('/push-subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON()),
  });

  return true;
}

export function triggerBrowserNotification({ title, body, tag }) {
  if (!hasBrowserNotificationSupport() || Notification.permission !== 'granted') return false;

  new Notification(title || 'Haango update', {
    body: body || 'New update from Haango',
    tag: tag || 'haango-notification',
    icon: '/favicon.ico',
  });

  return true;
}