/**
 * Auth Store
 * Global authentication state management with Zustand
 */

import { create } from 'zustand';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type {
  SafeUser,
  AuthResponse,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@perfex/shared';

interface AuthState {
  user: SafeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: UpdateProfileInput) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: LoginInput) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      const { user, tokens } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterInput) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
      const { user, tokens } = response.data.data;

      // Store tokens
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      // Call logout endpoint to invalidate session
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API success
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('organizationId');
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  loadUser: async () => {
    try {
      // Check if we have tokens
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      set({ isLoading: true });

      // Load user from API
      const response = await api.get<ApiResponse<SafeUser>>('/auth/me');
      const user = response.data.data;

      // Update local storage
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      // Token invalid or expired, clear auth state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data: UpdateProfileInput) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.put<ApiResponse<SafeUser>>('/auth/me', data);
      const user = response.data.data;

      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isLoading: false });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
