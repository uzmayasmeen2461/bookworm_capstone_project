import { post, tokenStore } from '../../../shared/src/apiClient';

// ── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  giftPoints: number;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// ── Token & user storage ──────────────────────────────────────────────────────
// Refresh token + user in localStorage so user stays logged in until explicit logout.
// Access token stays in memory only (never persisted — short-lived).
const REFRESH_KEY = 'bw_refresh';
const USER_KEY    = 'bw_user';

export const refreshStore = {
  get:   ()              => localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY),
  set:   (t: string)     => { localStorage.setItem(REFRESH_KEY, t); sessionStorage.setItem(REFRESH_KEY, t); },
  clear: ()              => { localStorage.removeItem(REFRESH_KEY); sessionStorage.removeItem(REFRESH_KEY); },
};

export const userStore = {
  get:   (): AuthUser | null => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  set:   (u: AuthUser) => {
    const val = JSON.stringify(u);
    localStorage.setItem(USER_KEY, val);
    sessionStorage.setItem(USER_KEY, val);
  },
  clear: ()            => {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

// ── API calls ─────────────────────────────────────────────────────────────────
export const authApi = {
  // POST /auth/login
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await post<AuthResponse>('/auth/login', { email, password });
    tokenStore.set(data.accessToken);
    refreshStore.set(data.refreshToken);
    userStore.set(data.user);
    return data;
  },

  // POST /auth/register
  register: async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    const data = await post<AuthResponse>('/auth/register', { name, email, password });
    tokenStore.set(data.accessToken);
    refreshStore.set(data.refreshToken);
    userStore.set(data.user);
    return data;
  },

  // POST /auth/refresh — silently get a new access token
  // Returns { accessToken, user } so the caller can re-broadcast bw:auth:login
  refresh: async (): Promise<{ accessToken: string; user: AuthUser } | null> => {
    const refreshToken = refreshStore.get();
    if (!refreshToken) return null;

    try {
      const data = await post<RefreshResponse>('/auth/refresh', { refreshToken });
      tokenStore.set(data.accessToken);
      refreshStore.set(data.refreshToken);
      // Restore user from sessionStorage (set during last login)
      const user = userStore.get();
      return user ? { accessToken: data.accessToken, user } : null;
    } catch {
      // Refresh token expired — clear everything and force re-login
      refreshStore.clear();
      userStore.clear();
      tokenStore.clear();
      return null;
    }
  },

  // POST /auth/logout
  logout: async (): Promise<void> => {
    const refreshToken = refreshStore.get();
    try {
      await post('/auth/logout', { refreshToken });
    } catch {
      // Best-effort — clear local state regardless
    } finally {
      tokenStore.clear();
      refreshStore.clear();
      userStore.clear();
    }
  },
};
