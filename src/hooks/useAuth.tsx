/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUserProfile, RoleCode, InitialAdminSetupPayload } from '../types/index.js';
import { supabase, isClientSupabaseConfigured } from '../lib/supabase.js';
import { api, setApiAuthToken, getStoredAuthToken } from '../lib/api.js';

interface AuthContextType {
  user: AuthUserProfile | null;
  token: string | null;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  needsAdminSetup: boolean;
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithDemo: (username: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  createInitialAdmin: (payload: InitialAdminSetupPayload) => Promise<{ success: boolean; message?: string }>;
  hasRole: (role: RoleCode) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseReady, setIsSupabaseReady] = useState<boolean>(false);
  const [needsAdminSetup, setNeedsAdminSetup] = useState<boolean>(false);

  // Check backend and Supabase status
  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get<{
        isSupabaseConfigured: boolean;
        adminStatus: { initialized: boolean; count: number };
      }>('/api/auth/status');

      if (res.success && res.data) {
        setIsSupabaseReady(res.data.isSupabaseConfigured);
        setNeedsAdminSetup(!res.data.adminStatus.initialized);
      }
    } catch (e) {
      console.warn('Status check warning:', e);
    }
  }, []);

  // Fetch current user profile with roles and permissions from backend
  const fetchCurrentUser = useCallback(async (authTokenToUse?: string) => {
    try {
      const tokenToUse = authTokenToUse || getStoredAuthToken();
      if (!tokenToUse) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      setApiAuthToken(tokenToUse);
      const res = await api.get<AuthUserProfile>('/api/auth/me');

      if (res.success && res.data) {
        setUser(res.data);
      } else {
        // Token expired or invalid
        setUser(null);
        setApiAuthToken(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to load current user profile:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkStatus();

    // If client Supabase is configured, listen to onAuthStateChange
    if (isClientSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setToken(session.access_token);
          fetchCurrentUser(session.access_token);
        } else {
          fetchCurrentUser();
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          setToken(session.access_token);
          await fetchCurrentUser(session.access_token);
        } else {
          // If no supabase session and no demo token
          const currentToken = getStoredAuthToken();
          if (!currentToken?.startsWith('demo-')) {
            setUser(null);
            setToken(null);
            setApiAuthToken(null);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Demo / Local storage token check
      fetchCurrentUser();
    }
  }, [checkStatus, fetchCurrentUser]);

  // Login via Supabase Auth
  const loginWithSupabase = async (email: string, password: string) => {
    if (!isClientSupabaseConfigured() || !supabase) {
      return {
        success: false,
        message: 'Supabase credentials are not configured in environment variables.',
      };
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.session) {
        setIsLoading(false);
        return {
          success: false,
          message: error?.message || 'Invalid email or password credentials',
        };
      }

      setToken(data.session.access_token);
      setApiAuthToken(data.session.access_token);

      // Sync user profile with public.users table via backend
      await api.post('/api/auth/profile', {
        authUserId: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata,
      });

      await fetchCurrentUser(data.session.access_token);
      await checkStatus();
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        message: err.message || 'Authentication failed',
      };
    }
  };

  // Demo quick-login for evaluation & fallback mode
  const loginWithDemo = async (username: string) => {
    try {
      setIsLoading(true);
      const res = await api.post<{ token: string; user: any }>('/api/auth/demo-login', { username });

      if (!res.success || !res.data) {
        setIsLoading(false);
        return {
          success: false,
          message: res.message || 'Demo authentication failed',
        };
      }

      setToken(res.data.token);
      setApiAuthToken(res.data.token);
      await fetchCurrentUser(res.data.token);
      await checkStatus();
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        message: err.message || 'Failed to login with demo credentials',
      };
    }
  };

  // Initial Admin Setup
  const createInitialAdmin = async (payload: InitialAdminSetupPayload) => {
    try {
      setIsLoading(true);
      const res = await api.post<{ user: any; token?: string }>('/api/auth/initial-admin', payload);

      if (!res.success) {
        setIsLoading(false);
        return { success: false, message: res.message || 'Setup failed' };
      }

      if (res.data?.token) {
        setToken(res.data.token);
        setApiAuthToken(res.data.token);
        await fetchCurrentUser(res.data.token);
      } else if (isClientSupabaseConfigured() && supabase) {
        // Try logging in with the newly created admin credentials
        return await loginWithSupabase(payload.email, payload.password);
      }

      setNeedsAdminSetup(false);
      await checkStatus();
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, message: err.message || 'Setup error' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.warn('Logout API notification error:', e);
    }

    if (isClientSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setToken(null);
    setApiAuthToken(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  // RBAC Helpers
  const hasRole = (role: RoleCode): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some((r) => r.code === role);
  };

  const isAdmin = Boolean(user && user.roles && user.roles.some((r) => r.code === 'ADMIN'));

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Admins bypass all granular permissions
    if (isAdmin) return true;
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSupabaseConfigured: isSupabaseReady,
        needsAdminSetup,
        loginWithSupabase,
        loginWithDemo,
        logout,
        refreshUser,
        createInitialAdmin,
        hasRole,
        hasPermission,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
