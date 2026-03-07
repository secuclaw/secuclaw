/**
 * SecuClaw Authentication Store
 * 
 * Manages user authentication state using Lit signals
 */

import { signal, computed } from '@lit-labs/signals';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  permissions: string[];
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Auth state signal
const authState = signal<AuthState>({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
});

// Computed values
export const isAuthenticated = computed(() => authState.get().isAuthenticated);
export const currentUser = computed(() => authState.get().user);
export const authLoading = computed(() => authState.get().loading);
export const authError = computed(() => authState.get().error);

// Auth actions
export const authStore = {
  getState: () => authState.get(),
  
  login: async (username: string, password: string): Promise<boolean> => {
    authState.set({
      ...authState.get(),
      loading: true,
      error: null,
    });

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication - in real app, this would call the Gateway
      if (username === 'admin' && password === 'admin123') {
        const user: User = {
          id: '1',
          username: 'admin',
          email: 'admin@secuclaw.local',
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'admin'],
          avatar: undefined,
        };

        authState.set({
          isAuthenticated: true,
          user,
          token: 'mock-jwt-token-' + Date.now(),
          loading: false,
          error: null,
        });

        // Store token in localStorage
        localStorage.setItem('secuclaw_token', authState.get().token!);
        
        return true;
      } else {
        authState.set({
          ...authState.get(),
          loading: false,
          error: '用户名或密码错误',
        });
        return false;
      }
    } catch (error) {
      authState.set({
        ...authState.get(),
        loading: false,
        error: '登录失败，请稍后重试',
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('secuclaw_token');
    authState.set({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });
  },

  checkAuth: async (): Promise<boolean> => {
    const token = localStorage.getItem('secuclaw_token');
    
    if (!token) {
      return false;
    }

    // In real app, validate token with Gateway
    // For now, just check if token exists
    authState.set({
      ...authState.get(),
      token,
      isAuthenticated: true,
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@secuclaw.local',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
      },
    });

    return true;
  },

  clearError: () => {
    authState.set({
      ...authState.get(),
      error: null,
    });
  },

  hasPermission: (permission: string): boolean => {
    const user = authState.get().user;
    if (!user) return false;
    return user.permissions.includes(permission) || user.role === 'admin';
  },
};

export default authStore;
