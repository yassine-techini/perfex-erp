/**
 * Integrations Page
 * Manage integration providers for the Tunisian market
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plug,
  CreditCard,
  Building2,
  MessageSquare,
  Truck,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website?: string;
  requiredCredentials: string[];
}

interface IntegrationConfig {
  id: string;
  providerId: string;
  providerCategory: string;
  name: string;
  environment: string;
  isEnabled: boolean;
  isDefault: boolean;
  status: string;
  lastTestedAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
}

interface ProvidersData {
  payment: Provider[];
  fiscal: Provider[];
  sms: Provider[];
  shipping: Provider[];
}

const API_URL = import.meta.env.VITE_API_URL;

const categoryIcons = {
  payment: CreditCard,
  fiscal: Building2,
  sms: MessageSquare,
  shipping: Truck,
};

const categoryLabels = {
  payment: 'Paiements',
  fiscal: 'Fiscal & Social',
  sms: 'SMS',
  shipping: 'Livraison',
};

const categoryDescriptions = {
  payment: 'Solutions de paiement mobile et en ligne tunisiennes',
  fiscal: 'Déclarations CNSS et impôts',
  sms: 'Services SMS professionnels',
  shipping: 'Services de livraison et expédition',
};

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>('payment');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [editingConfig, setEditingConfig] = useState<IntegrationConfig | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    environment: 'production' as 'sandbox' | 'production',
    isDefault: false,
    credentials: {} as Record<string, string>,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const token = localStorage.getItem('accessToken');

  // Fetch available providers
  const { data: providers } = useQuery({
    queryKey: ['integration-providers'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/integrations/providers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch providers');
      const data = await response.json();
      return data.data as ProvidersData;
    },
  });

  // Fetch configurations
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ['integration-configs'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/integrations/configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch configs');
      const data = await response.json();
      return data.data as IntegrationConfig[];
    },
  });

  // Fetch stats (prepared for future dashboard use)
  const { data: _stats } = useQuery({
    queryKey: ['integration-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/integrations/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.data;
    },
  });
  void _stats; // Prevents TS6133 - will be used in dashboard

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await fetch(`${API_URL}/integrations/configs/${configId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Test failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs'] });
    },
  });

  // Delete config mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await fetch(`${API_URL}/integrations/configs/${configId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs'] });
      queryClient.invalidateQueries({ queryKey: ['integration-stats'] });
    },
  });

  // Toggle enabled mutation
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ configId, isEnabled }: { configId: string; isEnabled: boolean }) => {
      const response = await fetch(`${API_URL}/integrations/configs/${configId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled }),
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs'] });
    },
  });

  // Create/Update config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      providerId: string;
      providerCategory: string;
      name: string;
      credentials: Record<string, string>;
      environment: string;
      isDefault: boolean;
    }) => {
      const url = data.id
        ? `${API_URL}/integrations/configs/${data.id}`
        : `${API_URL}/integrations/configs`;
      const method = data.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: data.providerId,
          providerCategory: data.providerCategory,
          name: data.name,
          credentials: data.credentials,
          environment: data.environment,
          isDefault: data.isDefault,
          isEnabled: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Save failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs'] });
      queryClient.invalidateQueries({ queryKey: ['integration-stats'] });
      setShowConfigModal(false);
      resetForm();
    },
  });

  // Reset form helper
  const resetForm = () => {
    setFormData({
      name: '',
      environment: 'production',
      isDefault: false,
      credentials: {},
    });
    setFormError(null);
    setSelectedProvider(null);
    setEditingConfig(null);
  };

  // Open modal for new config
  const openNewConfigModal = (provider: Provider) => {
    setSelectedProvider(provider);
    setEditingConfig(null);
    setFormData({
      name: `${provider.name} - Production`,
      environment: 'production',
      isDefault: false,
      credentials: {},
    });
    setFormError(null);
    setShowConfigModal(true);
  };

  // Open modal for editing
  const openEditModal = (config: IntegrationConfig, provider: Provider | undefined) => {
    setEditingConfig(config);
    setSelectedProvider(provider || null);
    setFormData({
      name: config.name,
      environment: config.environment as 'sandbox' | 'production',
      isDefault: config.isDefault,
      credentials: {}, // Don't pre-fill credentials for security
    });
    setFormError(null);
    setShowConfigModal(true);
  };

  // Handle form submission
  const handleSaveConfig = async () => {
    if (!selectedProvider && !editingConfig) {
      setFormError('Veuillez sélectionner un fournisseur');
      return;
    }

    if (!formData.name.trim()) {
      setFormError('Le nom est requis');
      return;
    }

    // Validate credentials for new configs
    if (!editingConfig && selectedProvider) {
      const missingCreds = selectedProvider.requiredCredentials.filter(
        cred => !formData.credentials[cred]?.trim()
      );
      if (missingCreds.length > 0) {
        setFormError(`Champs requis: ${missingCreds.join(', ')}`);
        return;
      }
    }

    setFormError(null);
    setIsSaving(true);

    try {
      await saveConfigMutation.mutateAsync({
        id: editingConfig?.id,
        providerId: selectedProvider?.id || editingConfig?.providerId || '',
        providerCategory: activeCategory,
        name: formData.name,
        credentials: formData.credentials,
        environment: formData.environment,
        isDefault: formData.isDefault,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (config: IntegrationConfig) => {
    if (!config.isEnabled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          Désactivé
        </span>
      );
    }

    switch (config.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Actif
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Erreur
          </span>
        );
      case 'pending_setup':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            À configurer
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryConfigs = (category: string) => {
    return configs?.filter(c => c.providerCategory === category) || [];
  };

  const categories = ['payment', 'fiscal', 'sms', 'shipping'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plug className="h-7 w-7" />
            Intégrations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Connectez vos services de paiement, SMS et livraison tunisiens
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categories.map(category => {
          const Icon = categoryIcons[category];
          const categoryConfigs = getCategoryConfigs(category);
          const activeCount = categoryConfigs.filter(c => c.isEnabled && c.status === 'active').length;

          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`p-4 rounded-lg border text-left transition-all ${
                activeCategory === category
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  activeCategory === category
                    ? 'bg-blue-100 dark:bg-blue-900/40'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    activeCategory === category
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {categoryLabels[category]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeCount} actif{activeCount > 1 ? 's' : ''} / {categoryConfigs.length}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Category Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Category Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {categoryLabels[activeCategory as keyof typeof categoryLabels]}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {categoryDescriptions[activeCategory as keyof typeof categoryDescriptions]}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedProvider(null);
                setEditingConfig(null);
                setShowConfigModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Available Providers */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Fournisseurs disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {providers?.[activeCategory as keyof ProvidersData]?.map(provider => {
              const isConfigured = configs?.some(
                c => c.providerId === provider.id && c.providerCategory === activeCategory
              );

              return (
                <div
                  key={provider.id}
                  className={`p-4 border rounded-lg ${
                    isConfigured
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {provider.description}
                      </p>
                    </div>
                    {isConfigured && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {provider.website && (
                      <a
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Site web
                      </a>
                    )}
                    {!isConfigured && (
                      <button
                        onClick={() => openNewConfigModal(provider)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Configurer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configured Integrations */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Intégrations configurées
          </h3>

          {configsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : getCategoryConfigs(activeCategory).length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucune intégration configurée pour cette catégorie
            </div>
          ) : (
            <div className="space-y-4">
              {getCategoryConfigs(activeCategory).map(config => {
                const provider = providers?.[activeCategory as keyof ProvidersData]?.find(
                  p => p.id === config.providerId
                );

                return (
                  <div
                    key={config.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {config.name}
                            </h4>
                            {config.isDefault && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                Par défaut
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {provider?.name} • {config.environment === 'production' ? 'Production' : 'Sandbox'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {getStatusBadge(config)}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => testConnectionMutation.mutate(config.id)}
                            disabled={testConnectionMutation.isPending}
                            className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                            title="Tester la connexion"
                          >
                            <RefreshCw className={`h-4 w-4 ${
                              testConnectionMutation.isPending ? 'animate-spin' : ''
                            }`} />
                          </button>

                          <button
                            onClick={() => openEditModal(config, provider)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Modifier"
                          >
                            <Settings className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm('Supprimer cette intégration ?')) {
                                deleteConfigMutation.mutate(config.id);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.isEnabled}
                              onChange={(e) => toggleEnabledMutation.mutate({
                                configId: config.id,
                                isEnabled: e.target.checked,
                              })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {config.lastErrorMessage && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                        {config.lastErrorMessage}
                      </div>
                    )}

                    {config.lastTestedAt && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Dernière vérification : {new Date(config.lastTestedAt).toLocaleString('fr-TN')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => { setShowConfigModal(false); resetForm(); }} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingConfig ? 'Modifier l\'intégration' : 'Nouvelle intégration'}
                {selectedProvider && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({selectedProvider.name})
                  </span>
                )}
              </h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveConfig(); }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom de l'intégration *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: D17 - Production"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Environnement
                  </label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value as 'sandbox' | 'production' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="sandbox">Sandbox (Test)</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                {selectedProvider?.requiredCredentials.map(credential => (
                  <div key={credential}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {credential} {!editingConfig && '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showCredentials[credential] ? 'text' : 'password'}
                        value={formData.credentials[credential] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          credentials: { ...prev.credentials, [credential]: e.target.value }
                        }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={editingConfig ? '(laisser vide pour garder)' : `Entrez votre ${credential}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCredentials(prev => ({
                          ...prev,
                          [credential]: !prev[credential]
                        }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCredentials[credential] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">
                    Définir comme intégration par défaut
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowConfigModal(false); resetForm(); }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    disabled={isSaving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {editingConfig ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
