import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import apiService, { setAuthToken, setRefreshToken, setRefreshHandler, setAuthFailedHandler } from '../services/api';
import type { Admin } from '../types';

const AUTH_STATE_KEY = 'bal_admin_auth_state';

type PersistedAuthState = {
  token: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: Admin;
};

export type AuthContextValue = {
  user: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const persistAuth = async (state: PersistedAuthState) => {
  await SecureStore.setItemAsync(AUTH_STATE_KEY, JSON.stringify(state));
};

const clearPersistedAuth = async () => {
  await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);

  const ensureAdminUser = useCallback((nextUser: Admin) => {
    if (!nextUser.role || !nextUser.role.includes('ADMIN')) {
      throw new Error('This account is not an admin account.');
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setRefreshToken(null);
    refreshTokenRef.current = null;
    setUser(null);
    setToken(null);
    await clearPersistedAuth();
  }, []);

  const hydrateAuth = useCallback(async (
    nextToken: string,
    nextRefreshToken: string,
    nextRefreshTokenExpiresAt: string,
    nextUser: Admin
  ) => {
    ensureAdminUser(nextUser);
    setAuthToken(nextToken);
    setRefreshToken(nextRefreshToken);
    refreshTokenRef.current = nextRefreshToken;
    setToken(nextToken);
    setUser(nextUser);
    await persistAuth({
      token: nextToken,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt: nextRefreshTokenExpiresAt,
      user: nextUser
    });
  }, [ensureAdminUser]);

  // Set up refresh handler
  useEffect(() => {
    setRefreshHandler(async (currentRefreshToken: string) => {
      try {
        const response = await apiService.refreshAdminToken(currentRefreshToken);
        if (user) {
          await persistAuth({
            token: response.accessToken,
            refreshToken: response.refreshToken,
            refreshTokenExpiresAt: response.accessTokenExpiresAt,
            user: response.user
          });
        }
        refreshTokenRef.current = response.refreshToken;
        setToken(response.accessToken);
        return {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        };
      } catch (error) {
        console.warn('Token refresh failed:', error);
        return null;
      }
    });

    setAuthFailedHandler(() => {
      logout();
    });

    return () => {
      setRefreshHandler(null);
      setAuthFailedHandler(null);
    };
  }, [user, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiService.loginAdmin(email, password);
      if (!response.accessToken) {
        throw new Error('Authentication response missing access token.');
      }
      await hydrateAuth(
        response.accessToken,
        response.refreshToken,
        response.accessTokenExpiresAt,
        response.user
      );
    },
    [hydrateAuth]
  );

  const restoreSession = useCallback(async () => {
    try {
      const storedAuth = await SecureStore.getItemAsync(AUTH_STATE_KEY);
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth) as Partial<PersistedAuthState> | null;
          if (parsed?.token && parsed.refreshToken && parsed.user) {
            const refreshExpiry = parsed.refreshTokenExpiresAt
              ? new Date(parsed.refreshTokenExpiresAt)
              : null;
            
            if (refreshExpiry && refreshExpiry <= new Date()) {
              await clearPersistedAuth();
              return;
            }

            ensureAdminUser(parsed.user);
            setAuthToken(parsed.token);
            setRefreshToken(parsed.refreshToken);
            refreshTokenRef.current = parsed.refreshToken;
            setToken(parsed.token);
            setUser(parsed.user);
            return;
          }
        } catch (parseError) {
          console.warn('Failed to parse stored auth state', parseError);
        }
      }
      await clearPersistedAuth();
    } catch (error) {
      console.warn('Failed to restore session', error);
      await clearPersistedAuth();
    } finally {
      setIsInitializing(false);
    }
  }, [ensureAdminUser]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isInitializing,
      login,
      logout,
      restoreSession,
    }),
    [user, token, isInitializing, login, logout, restoreSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
