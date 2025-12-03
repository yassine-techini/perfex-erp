/**
 * Modules Settings Page
 * Manage which modules are enabled for the organization
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Package,
  Factory,
  ChefHat,
  ScanLine,
  Store,
  ClipboardCheck,
  Wrench,
  CalendarClock,
  Sparkles,
  Shield,
  Banknote,
  BarChart3,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string | null;
  category: 'core' | 'industry' | 'advanced';
  icon: string;
  isDefault: boolean;
  sortOrder: number;
  enabled: boolean;
  settings: Record<string, unknown> | null;
  dependencies: string[] | null;
}

const ICON_MAP: Record<string, typeof Settings> = {
  LayoutDashboard: Settings,
  DollarSign: Settings,
  Users: Settings,
  Package: Package,
  Briefcase: Settings,
  ShoppingCart: Settings,
  TrendingUp: Settings,
  FolderKanban: Settings,
  Building2: Settings,
  Workflow: Settings,
  HelpCircle: Settings,
  Factory: Factory,
  ChefHat: ChefHat,
  ScanLine: ScanLine,
  Store: Store,
  ClipboardCheck: ClipboardCheck,
  Wrench: Wrench,
  CalendarClock: CalendarClock,
  Sparkles: Sparkles,
  Shield: Shield,
  Banknote: Banknote,
  BarChart3: BarChart3,
};

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Modules de Base',
  industry: 'Modules Métier',
  advanced: 'Modules Avancés',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  core: 'Fonctionnalités essentielles de l\'ERP, activées par défaut.',
  industry: 'Modules spécialisés pour boulangeries, usines et industries alimentaires.',
  advanced: 'Fonctionnalités avancées comme l\'IA et l\'audit automatisé.',
};

export function ModulesSettingsPage() {
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  // For now, use a mock organization ID - in production this would come from context
  const organizationId = 'default-org';
  const token = localStorage.getItem('accessToken');

  // Fetch modules
  const { data: modules, isLoading, error } = useQuery({
    queryKey: ['modules', organizationId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/modules/organization/${organizationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch modules');
      }

      return response.json() as Promise<Module[]>;
    },
  });

  // Update module mutation
  const updateModule = useMutation({
    mutationFn: async ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/modules/organization/${organizationId}/${moduleId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ enabled }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update module');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['enabledModules'] });
    },
  });

  // Handle toggle
  const handleToggle = async (moduleId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setPendingChanges(prev => new Map(prev).set(moduleId, newEnabled));

    try {
      await updateModule.mutateAsync({ moduleId, enabled: newEnabled });
    } finally {
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(moduleId);
        return next;
      });
    }
  };

  // Group modules by category
  const modulesByCategory = modules?.reduce((acc, mod) => {
    if (!acc[mod.category]) {
      acc[mod.category] = [];
    }
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, Module[]>) || {};

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Settings;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Erreur de chargement
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              Impossible de charger les modules. Veuillez réessayer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Modules
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Activez ou désactivez les modules selon les besoins de votre organisation.
          Les modules désactivés n'apparaîtront pas dans la navigation.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-start">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-blue-800 dark:text-blue-200">
            Modules Métier pour Boulangeries et Usines
          </h3>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            Activez les modules Recettes, Traçabilité HACCP et Paie pour bénéficier
            de fonctionnalités spécialisées pour l'industrie alimentaire.
          </p>
        </div>
      </div>

      {/* Modules by Category */}
      {(['core', 'industry', 'advanced'] as const).map((category) => {
        const categoryModules = modulesByCategory[category] || [];
        if (categoryModules.length === 0) return null;

        return (
          <div key={category} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {CATEGORY_LABELS[category]}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {CATEGORY_DESCRIPTIONS[category]}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {categoryModules.map((mod) => {
                const Icon = getIcon(mod.icon);
                const isUpdating = pendingChanges.has(mod.id);
                const displayEnabled = pendingChanges.has(mod.id)
                  ? pendingChanges.get(mod.id)
                  : mod.enabled;

                return (
                  <div
                    key={mod.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-2 transition-colors ${
                      displayEnabled
                        ? 'border-green-500'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-lg ${
                            displayEnabled
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {mod.name}
                          </h3>
                          {mod.description && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {mod.description}
                            </p>
                          )}
                          {mod.isDefault && (
                            <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Par défaut
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggle(mod.id, mod.enabled)}
                        disabled={isUpdating}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          displayEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                        } ${isUpdating ? 'opacity-50' : ''}`}
                      >
                        <span className="sr-only">
                          {displayEnabled ? 'Désactiver' : 'Activer'} {mod.name}
                        </span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            displayEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        >
                          {isUpdating && (
                            <Loader2 className="h-3 w-3 m-1 animate-spin text-gray-400" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty State if no modules */}
      {modules?.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Package className="h-12 w-12 mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Aucun module disponible
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Les modules seront disponibles une fois le système initialisé.
          </p>
        </div>
      )}
    </div>
  );
}
