const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

let refreshPromise = null;

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('haango_refresh_token')
          ? { 'x-refresh-token': localStorage.getItem('haango_refresh_token') }
          : {}),
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new ApiError(payload?.message || 'Session refresh failed', response.status, payload);
        }

        const token = payload?.data?.token || payload?.data?.accessToken;
        if (!token) throw new ApiError('Session refresh returned no access token', response.status, payload);
        localStorage.setItem('haango_access_token', token);
        if (payload?.data?.refreshToken) {
          localStorage.setItem('haango_refresh_token', payload.data.refreshToken);
        }
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}, retryOnUnauthorized = true) {
  const { includeMetadata = false, ...requestOptions } = options;
  const accessToken = localStorage.getItem('haango_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(localStorage.getItem('haango_refresh_token')
        ? { 'x-refresh-token': localStorage.getItem('haango_refresh_token') }
        : {}),
      ...(requestOptions.headers || {}),
    },
    ...requestOptions,
  });

  const payload = await response.json().catch(() => null);

  const authRequestWithoutRefresh = /^\/auth\/(login|signup|logout|refresh|password\/)/.test(path);
  if (response.status === 401 && retryOnUnauthorized && !authRequestWithoutRefresh) {
    try {
      await refreshAccessToken();
      return apiRequest(path, options, false);
    } catch {
      // Keep the token for transient failures. The auth provider decides when a session is truly invalid.
    }
  }

  if (!response.ok) {
    throw new ApiError(payload?.message || payload?.error || 'Request failed', response.status, payload);
  }

  if (includeMetadata && payload?.pagination) {
    return { data: payload.data, pagination: payload.pagination };
  }

  return payload?.data ?? payload;
}
