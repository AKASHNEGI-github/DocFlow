const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const STORAGE_KEY = 'docflow.auth';

/**
 * Tokens live in localStorage as one JSON blob (access token, refresh
 * token, and the user object login/register/refresh already returned) -
 * simplest thing that works across tabs and page reloads, and matches
 * how the backend actually hands tokens back (in the response body, not
 * a cookie, so there's no server-side session for the frontend to rely
 * on instead).
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

class ApiClientError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let refreshPromise = null;

/**
 * Exchanges the stored refresh token for a new pair exactly once even if
 * several requests 401 at the same moment - later callers await the same
 * in-flight promise instead of each firing their own /auth/refresh call.
 */
async function refreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = getSession();
    if (!session?.refreshToken) throw new ApiClientError('No refresh token available.', 401);

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setSession(null);
      throw new ApiClientError(body?.message || 'Session expired.', res.status);
    }

    setSession(body.data);
    return body.data;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Core request function every api/*.api.js module calls through.
 * `auth: false` skips attaching a token (used by login/register/forgot-
 * password); everything else attaches the current access token and, on
 * a 401, attempts exactly one silent refresh-and-retry before giving up
 * and clearing the session (AuthContext reacts to that by redirecting to
 * Login).
 */
export async function apiRequest(path, { method = 'GET', body, auth = true, isRetry = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const session = getSession();

  if (auth && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !isRetry && session?.refreshToken) {
    try {
      await refreshSession();
      return apiRequest(path, { method, body, auth, isRetry: true });
    } catch {
      setSession(null);
      window.dispatchEvent(new CustomEvent('docflow:session-expired'));
      throw new ApiClientError('Your session expired. Please sign in again.', 401);
    }
  }

  const responseBody = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiClientError(responseBody?.message || `Request failed (${res.status}).`, res.status, responseBody?.data);
  }

  return responseBody?.data;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body, opts) => apiRequest(path, { method: 'POST', body, ...opts }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
