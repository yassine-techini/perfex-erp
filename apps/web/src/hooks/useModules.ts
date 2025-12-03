/**
 * Hook to fetch and manage enabled modules
 */

import { useQuery } from '@tanstack/react-query';

interface EnabledModulesResponse {
  modules: string[];
}

/**
 * Get enabled modules for the current organization
 */
export function useEnabledModules() {
  // For now, use a default organization ID
  const organizationId = 'default-org';

  return useQuery({
    queryKey: ['enabledModules', organizationId],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          return { modules: [] as string[] };
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/modules/organization/${organizationId}/enabled`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          // If API fails, return all modules as enabled (fallback)
          return { modules: [] as string[] };
        }

        const data = await response.json() as EnabledModulesResponse;
        return data;
      } catch {
        // If API fails, return empty (will use defaults)
        return { modules: [] as string[] };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if a specific module is enabled
 */
export function useModuleEnabled(moduleId: string): boolean {
  const { data, isLoading } = useEnabledModules();

  // If still loading or no data, check default modules
  if (isLoading || !data || data.modules.length === 0) {
    // Default enabled modules
    const defaultModules = [
      'dashboard', 'finance', 'crm', 'inventory', 'hr',
      'procurement', 'sales', 'projects', 'assets', 'workflows', 'help'
    ];
    return defaultModules.includes(moduleId);
  }

  return data.modules.includes(moduleId);
}

/**
 * Get all enabled module IDs
 */
export function useModuleIds(): string[] {
  const { data, isLoading } = useEnabledModules();

  // If still loading or no data, return default modules
  if (isLoading || !data || data.modules.length === 0) {
    return [
      'dashboard', 'finance', 'crm', 'inventory', 'hr',
      'procurement', 'sales', 'projects', 'assets', 'workflows', 'help'
    ];
  }

  return data.modules;
}
