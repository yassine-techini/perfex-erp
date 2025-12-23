/**
 * Dialyse Protocols Page
 * Manage dialysis treatment protocols/templates
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

interface Protocol {
  id: string;
  name: string;
  code: string;
  type: 'hemodialysis' | 'hemodiafiltration' | 'hemofiltration' | 'peritoneal';
  status: 'active' | 'inactive' | 'draft';
  category: string | null;
  description: string | null;
  // Session parameters
  defaultDurationMinutes: number;
  defaultFrequencyPerWeek: number;
  // Dialyzer settings
  dialyzerType: string | null;
  dialyzerSurfaceArea: number | null;
  bloodFlowRateMin: number | null;
  bloodFlowRateMax: number | null;
  dialysateFlowRate: number | null;
  // Dialysate composition
  dialysateSodium: number | null;
  dialysatePotassium: number | null;
  dialysateCalcium: number | null;
  dialysateBicarbonate: number | null;
  dialysateTemperature: number | null;
  // Anticoagulation
  anticoagulationType: 'heparin' | 'lmwh' | 'citrate' | 'none' | null;
  anticoagulationDose: string | null;
  // Ultrafiltration
  maxUfRate: number | null;
  // Indications
  indications: string | null;
  contraindications: string | null;
  specialInstructions: string | null;
  // Usage
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProtocolStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
  byType: Record<string, number>;
}

interface ProtocolFormData {
  name: string;
  code: string;
  type: string;
  status: string;
  category?: string;
  description?: string;
  defaultDurationMinutes: number;
  defaultFrequencyPerWeek: number;
  dialyzerType?: string;
  dialyzerSurfaceArea?: number;
  bloodFlowRateMin?: number;
  bloodFlowRateMax?: number;
  dialysateFlowRate?: number;
  dialysateSodium?: number;
  dialysatePotassium?: number;
  dialysateCalcium?: number;
  dialysateBicarbonate?: number;
  dialysateTemperature?: number;
  anticoagulationType?: string;
  anticoagulationDose?: string;
  maxUfRate?: number;
  indications?: string;
  contraindications?: string;
  specialInstructions?: string;
}

export function DialyseProtocolsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [viewingProtocol, setViewingProtocol] = useState<Protocol | null>(null);

  // Fetch protocols
  const { data: protocolsData, isLoading, error } = useQuery({
    queryKey: ['dialyse-protocols', searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', '100');

      const url = `/dialyse/protocols${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ApiResponse<Protocol[]>>(url);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['dialyse-protocols-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ProtocolStats>>('/dialyse/protocols/stats');
      return response.data.data;
    },
  });

  // Create protocol mutation
  const createProtocol = useMutation({
    mutationFn: async (data: ProtocolFormData) => {
      await api.post('/dialyse/protocols', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-protocols'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-protocols-stats'] });
      setIsModalOpen(false);
      window.alert('Protocole créé avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update protocol mutation
  const updateProtocol = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProtocolFormData> }) => {
      await api.put(`/dialyse/protocols/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-protocols'] });
      setIsModalOpen(false);
      setEditingProtocol(null);
      window.alert('Protocole mis à jour avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Delete protocol mutation
  const deleteProtocol = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dialyse/protocols/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-protocols'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-protocols-stats'] });
      window.alert('Protocole supprimé avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Duplicate protocol mutation
  const duplicateProtocol = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/dialyse/protocols/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-protocols'] });
      window.alert('Protocole dupliqué avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const handleAddProtocol = () => {
    setEditingProtocol(null);
    setIsModalOpen(true);
  };

  const handleEditProtocol = (protocol: Protocol) => {
    setEditingProtocol(protocol);
    setIsModalOpen(true);
  };

  const handleViewProtocol = (protocol: Protocol) => {
    setViewingProtocol(protocol);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le protocole "${name}" ?`)) {
      deleteProtocol.mutate(id);
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateProtocol.mutate(id);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: ProtocolFormData = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      type: formData.get('type') as string,
      status: formData.get('status') as string,
      category: formData.get('category') as string || undefined,
      description: formData.get('description') as string || undefined,
      defaultDurationMinutes: parseInt(formData.get('defaultDurationMinutes') as string) || 240,
      defaultFrequencyPerWeek: parseInt(formData.get('defaultFrequencyPerWeek') as string) || 3,
      dialyzerType: formData.get('dialyzerType') as string || undefined,
      dialyzerSurfaceArea: formData.get('dialyzerSurfaceArea') ? parseFloat(formData.get('dialyzerSurfaceArea') as string) : undefined,
      bloodFlowRateMin: formData.get('bloodFlowRateMin') ? parseInt(formData.get('bloodFlowRateMin') as string) : undefined,
      bloodFlowRateMax: formData.get('bloodFlowRateMax') ? parseInt(formData.get('bloodFlowRateMax') as string) : undefined,
      dialysateFlowRate: formData.get('dialysateFlowRate') ? parseInt(formData.get('dialysateFlowRate') as string) : undefined,
      dialysateSodium: formData.get('dialysateSodium') ? parseFloat(formData.get('dialysateSodium') as string) : undefined,
      dialysatePotassium: formData.get('dialysatePotassium') ? parseFloat(formData.get('dialysatePotassium') as string) : undefined,
      dialysateCalcium: formData.get('dialysateCalcium') ? parseFloat(formData.get('dialysateCalcium') as string) : undefined,
      dialysateBicarbonate: formData.get('dialysateBicarbonate') ? parseFloat(formData.get('dialysateBicarbonate') as string) : undefined,
      dialysateTemperature: formData.get('dialysateTemperature') ? parseFloat(formData.get('dialysateTemperature') as string) : undefined,
      anticoagulationType: formData.get('anticoagulationType') as string || undefined,
      anticoagulationDose: formData.get('anticoagulationDose') as string || undefined,
      maxUfRate: formData.get('maxUfRate') ? parseInt(formData.get('maxUfRate') as string) : undefined,
      indications: formData.get('indications') as string || undefined,
      contraindications: formData.get('contraindications') as string || undefined,
      specialInstructions: formData.get('specialInstructions') as string || undefined,
    };

    if (editingProtocol) {
      updateProtocol.mutate({ id: editingProtocol.id, data });
    } else {
      createProtocol.mutate(data);
    }
  };

  // Calculate paginated data
  const paginatedProtocols = useMemo(() => {
    const protocols = protocolsData?.data || [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = protocols.slice(startIndex, endIndex);
    const total = protocols.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [protocolsData, currentPage, itemsPerPage]);

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      hemodialysis: 'bg-blue-100 text-blue-800',
      hemodiafiltration: 'bg-purple-100 text-purple-800',
      hemofiltration: 'bg-indigo-100 text-indigo-800',
      peritoneal: 'bg-teal-100 text-teal-800',
    };
    const labels: Record<string, string> = {
      hemodialysis: 'Hémodialyse',
      hemodiafiltration: 'Hémodiafiltration',
      hemofiltration: 'Hémofiltration',
      peritoneal: 'Péritonéale',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      active: 'Actif',
      inactive: 'Inactif',
      draft: 'Brouillon',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Protocoles de Dialyse</h1>
          <p className="text-muted-foreground">
            Modèles de traitement et paramètres standardisés
          </p>
        </div>
        <button
          onClick={handleAddProtocol}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nouveau Protocole
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Protocoles</div>
            <div className="mt-2 text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Actifs</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Brouillons</div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Inactifs</div>
            <div className="mt-2 text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Rechercher un protocole..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="draft">Brouillon</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les types</option>
          <option value="hemodialysis">Hémodialyse</option>
          <option value="hemodiafiltration">Hémodiafiltration</option>
          <option value="hemofiltration">Hémofiltration</option>
          <option value="peritoneal">Péritonéale</option>
        </select>
      </div>

      {/* Protocols List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement des protocoles...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Erreur: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedProtocols.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Durée</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fréquence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Utilisations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedProtocols.data.map((protocol) => (
                    <tr key={protocol.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 font-mono text-sm font-medium">{protocol.code}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{protocol.name}</div>
                          {protocol.category && (
                            <div className="text-sm text-muted-foreground">{protocol.category}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getTypeBadge(protocol.type)}</td>
                      <td className="px-6 py-4 text-sm">{protocol.defaultDurationMinutes} min</td>
                      <td className="px-6 py-4 text-sm">{protocol.defaultFrequencyPerWeek}x/sem</td>
                      <td className="px-6 py-4 text-sm">{protocol.usageCount}</td>
                      <td className="px-6 py-4">{getStatusBadge(protocol.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => handleViewProtocol(protocol)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => handleEditProtocol(protocol)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDuplicate(protocol.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Dupliquer
                        </button>
                        <button
                          onClick={() => handleDelete(protocol.id, protocol.name)}
                          className="text-destructive hover:text-destructive/80 font-medium"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={paginatedProtocols.totalPages}
              totalItems={paginatedProtocols.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <EmptyState
            title="Aucun protocole trouvé"
            description="Créez votre premier protocole de dialyse"
            icon="document"
            action={{
              label: 'Nouveau Protocole',
              onClick: handleAddProtocol,
            }}
          />
        )}
      </div>

      {/* View Protocol Modal */}
      {viewingProtocol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{viewingProtocol.name}</h2>
                    {getStatusBadge(viewingProtocol.status)}
                  </div>
                  <p className="text-muted-foreground font-mono">{viewingProtocol.code}</p>
                </div>
                <button
                  onClick={() => setViewingProtocol(null)}
                  className="p-2 hover:bg-accent rounded-md"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* General Info */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Informations Générales</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>{getTypeBadge(viewingProtocol.type)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Catégorie</dt>
                      <dd>{viewingProtocol.category || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Durée</dt>
                      <dd className="font-medium">{viewingProtocol.defaultDurationMinutes} min</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Fréquence</dt>
                      <dd className="font-medium">{viewingProtocol.defaultFrequencyPerWeek}x/semaine</dd>
                    </div>
                  </dl>
                </div>

                {/* Dialyzer Settings */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Dialyseur</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>{viewingProtocol.dialyzerType || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Surface</dt>
                      <dd>{viewingProtocol.dialyzerSurfaceArea ? `${viewingProtocol.dialyzerSurfaceArea} m²` : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Débit sanguin</dt>
                      <dd>{viewingProtocol.bloodFlowRateMin && viewingProtocol.bloodFlowRateMax
                        ? `${viewingProtocol.bloodFlowRateMin}-${viewingProtocol.bloodFlowRateMax} mL/min` : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Débit dialysat</dt>
                      <dd>{viewingProtocol.dialysateFlowRate ? `${viewingProtocol.dialysateFlowRate} mL/min` : '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Dialysate Composition */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Composition Dialysat</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Sodium</dt>
                      <dd>{viewingProtocol.dialysateSodium ? `${viewingProtocol.dialysateSodium} mmol/L` : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Potassium</dt>
                      <dd>{viewingProtocol.dialysatePotassium ? `${viewingProtocol.dialysatePotassium} mmol/L` : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Calcium</dt>
                      <dd>{viewingProtocol.dialysateCalcium ? `${viewingProtocol.dialysateCalcium} mmol/L` : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Bicarbonate</dt>
                      <dd>{viewingProtocol.dialysateBicarbonate ? `${viewingProtocol.dialysateBicarbonate} mmol/L` : '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Température</dt>
                      <dd>{viewingProtocol.dialysateTemperature ? `${viewingProtocol.dialysateTemperature}°C` : '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Anticoagulation */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Anticoagulation</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="capitalize">{viewingProtocol.anticoagulationType || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Dose</dt>
                      <dd>{viewingProtocol.anticoagulationDose || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Max UF Rate</dt>
                      <dd>{viewingProtocol.maxUfRate ? `${viewingProtocol.maxUfRate} mL/h` : '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Clinical Notes */}
              {(viewingProtocol.description || viewingProtocol.indications || viewingProtocol.contraindications || viewingProtocol.specialInstructions) && (
                <div className="mt-6 space-y-4">
                  {viewingProtocol.description && (
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground">{viewingProtocol.description}</p>
                    </div>
                  )}
                  {viewingProtocol.indications && (
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-2">Indications</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingProtocol.indications}</p>
                    </div>
                  )}
                  {viewingProtocol.contraindications && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <h3 className="font-semibold mb-2 text-red-800">Contre-indications</h3>
                      <p className="text-sm text-red-700 whitespace-pre-wrap">{viewingProtocol.contraindications}</p>
                    </div>
                  )}
                  {viewingProtocol.specialInstructions && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <h3 className="font-semibold mb-2 text-yellow-800">Instructions Spéciales</h3>
                      <p className="text-sm text-yellow-700 whitespace-pre-wrap">{viewingProtocol.specialInstructions}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => { setViewingProtocol(null); handleEditProtocol(viewingProtocol); }}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setViewingProtocol(null)}
                  className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Protocol Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingProtocol ? 'Modifier le Protocole' : 'Nouveau Protocole'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-medium border-b pb-2">Informations de base</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Code *</label>
                      <input
                        type="text"
                        name="code"
                        defaultValue={editingProtocol?.code}
                        required
                        placeholder="HD-STD-01"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom *</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingProtocol?.name}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Type *</label>
                      <select
                        name="type"
                        defaultValue={editingProtocol?.type || 'hemodialysis'}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="hemodialysis">Hémodialyse</option>
                        <option value="hemodiafiltration">Hémodiafiltration</option>
                        <option value="hemofiltration">Hémofiltration</option>
                        <option value="peritoneal">Péritonéale</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Statut *</label>
                      <select
                        name="status"
                        defaultValue={editingProtocol?.status || 'draft'}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="draft">Brouillon</option>
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Catégorie</label>
                      <input
                        type="text"
                        name="category"
                        defaultValue={editingProtocol?.category || ''}
                        placeholder="Standard, Intensive..."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      name="description"
                      defaultValue={editingProtocol?.description || ''}
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Session Parameters */}
                <div className="space-y-4">
                  <h3 className="font-medium border-b pb-2">Paramètres de séance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Durée (min) *</label>
                      <input
                        type="number"
                        name="defaultDurationMinutes"
                        defaultValue={editingProtocol?.defaultDurationMinutes || 240}
                        required
                        min="60"
                        max="480"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fréquence/semaine *</label>
                      <input
                        type="number"
                        name="defaultFrequencyPerWeek"
                        defaultValue={editingProtocol?.defaultFrequencyPerWeek || 3}
                        required
                        min="1"
                        max="7"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Dialyzer Settings */}
                <div className="space-y-4">
                  <h3 className="font-medium border-b pb-2">Dialyseur</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Type dialyseur</label>
                      <input
                        type="text"
                        name="dialyzerType"
                        defaultValue={editingProtocol?.dialyzerType || ''}
                        placeholder="FX80, Polyflux..."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Surface (m²)</label>
                      <input
                        type="number"
                        name="dialyzerSurfaceArea"
                        step="0.1"
                        defaultValue={editingProtocol?.dialyzerSurfaceArea || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Débit sang min (mL/min)</label>
                      <input
                        type="number"
                        name="bloodFlowRateMin"
                        defaultValue={editingProtocol?.bloodFlowRateMin || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Débit sang max (mL/min)</label>
                      <input
                        type="number"
                        name="bloodFlowRateMax"
                        defaultValue={editingProtocol?.bloodFlowRateMax || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Débit dialysat (mL/min)</label>
                      <input
                        type="number"
                        name="dialysateFlowRate"
                        defaultValue={editingProtocol?.dialysateFlowRate || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Dialysate Composition */}
                <div className="space-y-4">
                  <h3 className="font-medium border-b pb-2">Composition du dialysat</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Na+ (mmol/L)</label>
                      <input
                        type="number"
                        name="dialysateSodium"
                        step="0.1"
                        defaultValue={editingProtocol?.dialysateSodium || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">K+ (mmol/L)</label>
                      <input
                        type="number"
                        name="dialysatePotassium"
                        step="0.1"
                        defaultValue={editingProtocol?.dialysatePotassium || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ca++ (mmol/L)</label>
                      <input
                        type="number"
                        name="dialysateCalcium"
                        step="0.1"
                        defaultValue={editingProtocol?.dialysateCalcium || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">HCO3- (mmol/L)</label>
                      <input
                        type="number"
                        name="dialysateBicarbonate"
                        step="0.1"
                        defaultValue={editingProtocol?.dialysateBicarbonate || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        name="dialysateTemperature"
                        step="0.1"
                        defaultValue={editingProtocol?.dialysateTemperature || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Anticoagulation */}
                <div className="space-y-4">
                  <h3 className="font-medium border-b pb-2">Anticoagulation</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select
                        name="anticoagulationType"
                        defaultValue={editingProtocol?.anticoagulationType || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Non spécifié</option>
                        <option value="heparin">Héparine</option>
                        <option value="lmwh">HBPM</option>
                        <option value="citrate">Citrate</option>
                        <option value="none">Aucune</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Dose</label>
                      <input
                        type="text"
                        name="anticoagulationDose"
                        defaultValue={editingProtocol?.anticoagulationDose || ''}
                        placeholder="5000 UI bolus + 1000 UI/h"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Max UF (mL/h)</label>
                      <input
                        type="number"
                        name="maxUfRate"
                        defaultValue={editingProtocol?.maxUfRate || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical Notes */}
                <div className="space-y-4">
                  <h3 className="font-medium border-b pb-2">Notes cliniques</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1">Indications</label>
                    <textarea
                      name="indications"
                      defaultValue={editingProtocol?.indications || ''}
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contre-indications</label>
                    <textarea
                      name="contraindications"
                      defaultValue={editingProtocol?.contraindications || ''}
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Instructions spéciales</label>
                    <textarea
                      name="specialInstructions"
                      defaultValue={editingProtocol?.specialInstructions || ''}
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingProtocol(null); }}
                    className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    {editingProtocol ? 'Mettre à jour' : 'Créer'}
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
