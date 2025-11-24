/**
 * useAuth Hook
 * Convenient hook to access auth store
 */

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

export function useAuth() {
  const store = useAuthStore();

  // Load user on mount if not already loaded
  useEffect(() => {
    if (!store.user && !store.isLoading) {
      store.loadUser();
    }
  }, [store]);

  return store;
}
