import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { authApi, AuthUser, refreshStore, userStore } from '../api/authApi';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Custom event names — used to communicate with the shell ───────────────────
// The shell (and other MFEs) can listen to these window events to react to
// auth changes without direct imports between MFEs.
export const AUTH_EVENTS = {
  LOGIN:  'bw:auth:login',
  LOGOUT: 'bw:auth:logout',
} as const;

// ── How long before access-token expiry we proactively refresh (ms) ──────────
// Access tokens expire in 15 min (900 s). We refresh 60 s early so no request
// ever uses an expired token. Adjust if JWT_EXPIRES_IN changes.
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_BEFORE_MS   =      60 * 1000; // refresh 1 minute early

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Holds the proactive-refresh timer so we can cancel it on logout / unmount
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule a proactive refresh before the access token expires ─────────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      const result = await authApi.refresh();
      if (result) {
        // Token rotated — re-broadcast so every bundle and the Navbar stay current
        window.dispatchEvent(new CustomEvent('bw:auth:login', {
          detail: { user: result.user, accessToken: result.accessToken },
        }));
        // Schedule the next refresh cycle
        scheduleRefresh();
      } else {
        // Refresh token expired — treat as a logout
        setUser(null);
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
      }
    }, ACCESS_TOKEN_TTL_MS - REFRESH_BEFORE_MS);
  }, []);

// On mount — restore session from localStorage if refresh token exists
useEffect(() => {
  const restoreSession = async () => {
    if (refreshStore.get()) {
      const result = await authApi.refresh();
      if (result) {
        // Restore user state in this context
        setUser(result.user);
        // Fire bw:auth:login so shell Navbar + all other MFE bundles
        // receive the access token and show the logged-in state
        window.dispatchEvent(new CustomEvent('bw:auth:login', {
          detail: { user: result.user, accessToken: result.accessToken },
        }));
        // Keep the session alive proactively for the lifetime of this tab
        scheduleRefresh();
      }
    } else {
      // No refresh token — check localStorage for user (belt-and-suspenders)
      const savedUser = userStore.get();
      if (savedUser) setUser(savedUser);
    }
    setIsLoading(false);
  };

  // Shell's "Sign out" button fires this — mfe-auth owns the actual logout logic
  const handleTriggerLogout = () => { logout(); };

  window.addEventListener('bw:auth:trigger:logout', handleTriggerLogout);
  restoreSession();

  return () => {
    window.removeEventListener('bw:auth:trigger:logout', handleTriggerLogout);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    // Broadcast to shell and other MFEs
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENTS.LOGIN, { detail: { user: data.user, accessToken: data.accessToken } })
    );
    // Start the keep-alive refresh cycle
    scheduleRefresh();
  }, [scheduleRefresh]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.register(name, email, password);
    setUser(data.user);
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENTS.LOGIN, { detail: { user: data.user, accessToken: data.accessToken } })
    );
    // Start the keep-alive refresh cycle
    scheduleRefresh();
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    // Cancel any pending refresh timer before clearing credentials
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
    await authApi.logout();
    setUser(null);
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
