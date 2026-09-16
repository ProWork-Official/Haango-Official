const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

export async function apiRequest(path, options = {}) {
  const accessToken = localStorage.getItem('haango_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Request failed');
  }

  return payload?.data ?? payload;
}
