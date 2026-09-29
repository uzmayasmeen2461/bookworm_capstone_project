// Base API client — used by all MFEs to talk to the backend.
// Centralises: base URL, auth header injection, token refresh, error handling.

// API_BASE_URL is injected at build time by webpack DefinePlugin.
// Development default: http://127.0.0.1:5000
// Production:          https://<DOMAIN>/api  (set via MFE build args in docker-compose.prod.yml)
declare const process: { env: { API_BASE_URL?: string } };
const API_BASE: string = (typeof process !== 'undefined' && process.env.API_BASE_URL)
  ? process.env.API_BASE_URL
  : 'http://127.0.0.1:5000';

// ── Token storage (in-memory — safer than localStorage for JWTs) ─────────────
// Each MFE webpack bundle gets its own module instance, so in-memory state is
// NOT shared between bundles. We bridge this by listening to the bw:auth:login
// CustomEvent fired by mfe-auth, which crosses bundle boundaries via window.
let accessToken: string | null = null;

export const tokenStore = {
  get: ()              => accessToken,
  set: (token: string) => { accessToken = token; },
  clear: ()            => { accessToken = null; },
};

// ── Cross-bundle token sync ───────────────────────────────────────────────────
// mfe-auth fires bw:auth:login with { accessToken } after every login/refresh.
// Every other MFE's apiClient instance listens here and caches the token so
// postAuth / getAuth calls include the Bearer header.
if (typeof window !== 'undefined') {
  window.addEventListener('bw:auth:login', (e: Event) => {
    const token = (e as CustomEvent).detail?.accessToken;
    if (token) accessToken = token;
  });
  window.addEventListener('bw:auth:logout', () => {
    accessToken = null;
  });
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  requiresAuth?: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Silent token refresh (used by both ensureToken and the 401 interceptor) ──
// Returns true if a new access token was successfully obtained, false otherwise.
// Fires bw:auth:login so all bundles and the Navbar receive the fresh token.
const silentRefresh = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('bw_refresh') || sessionStorage.getItem('bw_refresh');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // Refresh token expired or revoked — clear storage so Navbar shows Sign in
      localStorage.removeItem('bw_refresh');
      localStorage.removeItem('bw_user');
      sessionStorage.removeItem('bw_refresh');
      sessionStorage.removeItem('bw_user');
      accessToken = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bw:auth:logout'));
      }
      return false;
    }
    const data = await res.json();
    accessToken = data.accessToken;
    localStorage.setItem('bw_refresh', data.refreshToken);
    sessionStorage.setItem('bw_refresh', data.refreshToken);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bw:auth:login', {
        detail: { accessToken: data.accessToken },
      }));
    }
    return true;
  } catch {
    return false;
  }
};

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = 'GET', body, requiresAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach JWT if available
  if (requiresAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // ── 401 interceptor — silently refresh and retry once ────────────────────
  // When the 15-min access token has expired the server returns 401.
  // We attempt a silent refresh; if it succeeds we retry the original request
  // with the fresh token so the user never sees an auth error.
  if (response.status === 401 && requiresAuth) {
    const refreshed = await silentRefresh();
    if (refreshed && accessToken) {
      const retryHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      };
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: retryHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      const retryData = await retryResponse.json().catch(() => ({}));
      if (!retryResponse.ok) {
        const message = retryData?.error || retryData?.errors?.[0]?.msg || 'Request failed';
        throw new ApiError(retryResponse.status, message);
      }
      return retryData as T;
    }
  }

  // Parse response — always expect JSON from our API
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Extract the error message our backend returns
    const message = data?.error || data?.errors?.[0]?.msg || 'Request failed';
    throw new ApiError(response.status, message);
  }

  return data as T;
};

// ── ensureToken() — shared across all MFE bundles ────────────────────────────
// Each MFE webpack bundle has its own tokenStore copy in memory.
// If a bundle mounts AFTER the bw:auth:login event fired (lazy-loaded MFEs),
// its tokenStore will be null. This function silently re-hydrates the token
// from the refresh endpoint so auth'd API calls work on first render.
export const ensureToken = async (): Promise<boolean> => {
  if (accessToken) return true;
  return silentRefresh();
};

// ── Convenience helpers ───────────────────────────────────────────────────────
export const get  = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'GET' });

export const getAuth = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'GET', requiresAuth: true });

export const post = <T>(endpoint: string, body: unknown) =>
  apiRequest<T>(endpoint, { method: 'POST', body });

export const postAuth = <T>(endpoint: string, body: unknown) =>
  apiRequest<T>(endpoint, { method: 'POST', body, requiresAuth: true });

export const patchAuth = <T>(endpoint: string, body: unknown) =>
  apiRequest<T>(endpoint, { method: 'PATCH', body, requiresAuth: true });

export const deleteAuth = <T>(endpoint: string) =>
  apiRequest<T>(endpoint, { method: 'DELETE', requiresAuth: true });
