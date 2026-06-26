import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authApi, registerLogoutHandler } from '../services/api';
import { User } from '../types';
import { formatAuthApiError } from '../utils/authErrors';
import { clearTokens, loadTokens, saveTokens } from '../security/secureStorage';
import { safeLog } from '../security/safeLog';
import { registerForPushNotificationsAsync } from '../services/notifications/push';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Schedules account deletion (30-day grace); clears local session after success. */
  requestAccountDeletion: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateStoredUser: (patch: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function normalizeAuthResponseBody(data: {
    data?: { user?: User; accessToken?: string; refreshToken?: string };
    user?: User;
    token?: string;
    accessToken?: string;
    refreshToken?: string;
  }): { user: User; accessToken: string; refreshToken?: string } {
    const accessToken = data?.data?.accessToken ?? data?.token ?? data?.accessToken;
    const rawUser = data?.data?.user ?? data?.user;
    if (rawUser && accessToken) {
      const id = (rawUser as { id?: string; _id?: string }).id || (rawUser as { _id?: string })._id;
      if (!id) throw new Error('Unexpected auth response from server (missing user id)');
      const user = { ...(rawUser as object), id } as User;
      return {
        user,
        accessToken,
        refreshToken: data?.data?.refreshToken ?? data?.refreshToken,
      };
    }
    throw new Error('Unexpected auth response from server');
  }

  const applyAuthPayload = useCallback(async (payload: { user: User; accessToken: string; refreshToken?: string }) => {
    await saveTokens({
      accessToken: payload.accessToken,
      ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
    });
    await AsyncStorage.setItem('user', JSON.stringify(payload.user));
    setAccessToken(payload.accessToken);
    setUser(payload.user);
    void registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    registerLogoutHandler(() => {
      setUser(null);
      setAccessToken(null);
      AsyncStorage.removeItem('user').catch(() => {});
    });
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [tokens, storedUser] = await Promise.all([loadTokens(), AsyncStorage.getItem('user')]);
      if (Platform.OS === 'web' && storedUser && !tokens?.accessToken) {
        await AsyncStorage.removeItem('user');
        setIsLoading(false);
        return;
      }

      if (tokens?.accessToken) {
        setAccessToken(tokens.accessToken);
        try {
          const { data } = await authApi.me();
          setUser(data.data);
          await AsyncStorage.setItem('user', JSON.stringify(data.data));
          void registerForPushNotificationsAsync();
        } catch (error: any) {
          if (error?.response?.status === 401 || error?.response?.status === 404) {
            safeLog.error('Token expired or invalid during auth check (401/404), clearing auth state');
            await clearTokens();
            setUser(null);
            setAccessToken(null);
            await AsyncStorage.removeItem('user');
          } else {
            safeLog.error('Failed to load profile from server', error);
            await AsyncStorage.removeItem('user');
            setUser(null);
          }
        }
      } else {
        setAccessToken(null);
        setUser(null);
        if (storedUser) await AsyncStorage.removeItem('user');
      }
    } catch (e) {
      safeLog.error('loadStoredAuth error', e);
      await clearTokens();
      setUser(null);
      setAccessToken(null);
      await AsyncStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const { user, accessToken, refreshToken } = normalizeAuthResponseBody(data);
    await applyAuthPayload({ user, accessToken, refreshToken });
  }, [applyAuthPayload]);

  const loginWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      const { data } = await authApi.googleSignIn(idToken);
      const { user, accessToken, refreshToken } = normalizeAuthResponseBody(data);
      await applyAuthPayload({ user, accessToken, refreshToken });
    },
    [applyAuthPayload]
  );

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    const { data } = await authApi.register({ name, email, password, phone });
    const { user, accessToken, refreshToken } = normalizeAuthResponseBody(data);
    await applyAuthPayload({ user, accessToken, refreshToken });
  }, [applyAuthPayload]);

  const logout = useCallback(async () => {
    try {
      const tokens = await loadTokens();
      await authApi.logout(tokens?.refreshToken);
    } catch {}
    await clearTokens();
    await AsyncStorage.removeItem('user');
    setUser(null);
    setAccessToken(null);
  }, []);

  const requestAccountDeletion = useCallback(async () => {
    await authApi.deleteAccount();
    await clearTokens();
    await AsyncStorage.removeItem('user');
    setUser(null);
    setAccessToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data.data);
      await AsyncStorage.setItem('user', JSON.stringify(data.data));
    } catch (error: any) {
      safeLog.error('refreshUser failed', error);
      if (error?.response?.status === 401 || error?.response?.status === 404) {
        await logout();
      }
    }
  }, [logout]);

  const updateStoredUser = useCallback(async (patch: Partial<User>) => {
    if (!user) return;

    const nextUser = { ...user, ...patch };
    setUser(nextUser);
    await AsyncStorage.setItem('user', JSON.stringify(nextUser));
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, accessToken, isLoading,
      isAuthenticated: !!user,
      login, loginWithGoogleIdToken, register, logout, requestAccountDeletion, refreshUser, updateStoredUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
