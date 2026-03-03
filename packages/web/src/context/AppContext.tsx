import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../api/client';
import { WebSocketProvider } from './WebSocketContext';

interface User {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  roleIds: string[];
}

interface AppState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AppContextValue extends AppState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: React.ReactNode;
}

function AppProviderInner({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>({
    user: null,
    authenticated: false,
    loading: true,
    error: null,
  });

  const refreshUser = useCallback(async () => {
    const api = getApiClient();
    const res = await api.getCurrentUser();
    if (res.success && res.data) {
      setState(prev => ({
        ...prev,
        user: res.data!,
        authenticated: true,
        loading: false,
      }));
    } else {
      setState(prev => ({
        ...prev,
        user: null,
        authenticated: false,
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const api = getApiClient();
    const res = await api.login({ email, password });
    
    if (res.success && res.data) {
      api.setToken(res.data.token);
      setState(prev => ({
        ...prev,
        user: res.data!.user,
        authenticated: true,
        loading: false,
      }));
      return true;
    } else {
      setState(prev => ({
        ...prev,
        error: res.error || 'Login failed',
        loading: false,
      }));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    const api = getApiClient();
    await api.logout();
    api.setToken(null);
    setState(prev => ({
      ...prev,
      user: null,
      authenticated: false,
    }));
  }, []);

  return (
    <AppContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <WebSocketProvider>
      <AppProviderInner>{children}</AppProviderInner>
    </WebSocketProvider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function useAuth() {
  const { user, authenticated, loading, error, login, logout } = useApp();
  return { user, authenticated, loading, error, login, logout };
}

export default {
  AppProvider,
  useApp,
  useAuth,
};
