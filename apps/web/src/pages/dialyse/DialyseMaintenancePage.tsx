/**
 * Dialyse Maintenance Page
 * Track machine maintenance and interventions
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

interface MaintenanceRecord {
  id: string;
  machineId: string;
  machine: {
    machineNumber: string;
    model: string;
  };
  type: 'preventive' | 'corrective' | 'calibration' | 'inspection';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: string;
  completedDate: string | null;
  technician: string | null;
  description: string;
  findings: string | null;
  partsReplaced: string | null;
  laborHours: number | null;
  cost: number | null;
  nextMaintenanceDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface MaintenanceStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
  thisMonth: number;
}

interface MaintenanceFormData {
  machineId: string;
  type: string;
  status: string;
  priority: string;
  scheduledDate: string;
  completedDate?: string;
  technician?: string;
  description: string;
  findings?: string;
  partsReplaced?: string;
  laborHours?: number;
  cost?: number;
  nextMaintenanceDate?: string;
  notes?: string;
}

interface Machine {
  id: string;
  machineNumber: string;
  model: string;
}

export function DialyseMaintenancePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState('');

  // Fetch maintenance records
  const { data: maintenanceData, isLoading, error } = useQuery({
    queryKey: ['dialyse-maintenance', statusFilter, typeFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      params.append('limit', '100');

      const url = `/dialyse/maintenance${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ApiResponse<MaintenanceRecord[]>>(url);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['dialyse-maintenance-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MaintenanceStats>>('/dialyse/maintenance/stats');
      return response.data.data;
    },
  });

  // Fetch machines for dropdown
  const { data: machinesData } = useQuery({
    queryKey: ['dialyse-machines-list'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ data: Machine[] }>>('/dialyse/machines?limit=100');
      return response.data.data?.data || [];
    },
  });

  // Create maintenance mutation
  const createMaintenance = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      await api.post('/dialyse/maintenance', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-machines'] });
      setIsModalOpen(false);
      resetForm();
      window.alert('Maintenance planifiée avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update maintenance mutation
  const updateMaintenance = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaintenanceFormData> }) => {
      await api.put(`/dialyse/maintenance/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-maintenance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-machines'] });
      setIsModalOpen(false);
      setEditingRecord(null);
      resetForm();
      window.alert('Maintenance mise à jour avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Delete maintenance mutation
  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dialyse/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-maintenance-stats'] });
      window.alert('Maintenance supprimée avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const resetForm = () => {
    setSelectedMachineId('');
  };

  const handleAddMaintenance = () => {
    setEditingRecord(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditMaintenance = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setSelectedMachineId(record.machineId);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette maintenance ?')) {
      deleteMaintenance.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: MaintenanceFormData = {
      machineId: selectedMachineId,
      type: formData.get('type') as string,
      status: formData.get('status') as string,
      priority: formData.get('priority') as string,
      scheduledDate: formData.get('scheduledDate') as string,
      completedDate: formData.get('completedDate') as string || undefined,
      technician: formData.get('technician') as string || undefined,
      description: formData.get('description') as string,
      findings: formData.get('findings') as string || undefined,
      partsReplaced: formData.get('partsReplaced') as string || undefined,
      laborHours: formData.get('laborHours') ? parseFloat(formData.get('laborHours') as string) : undefined,
      cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : undefined,
      nextMaintenanceDate: formData.get('nextMaintenanceDate') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };

    if (editingRecord) {
      updateMaintenance.mutate({ id: editingRecord.id, data });
    } else {
      createMaintenance.mutate(data);
    }
  };

  // Calculate paginated data
  const paginatedRecords = useMemo(() => {
    const records = maintenanceData?.data || [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = records.slice(startIndex, endIndex);
    const total = records.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [maintenanceData, currentPage, itemsPerPage]);

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      preventive: 'bg-blue-100 text-blue-800',
      corrective: 'bg-orange-100 text-orange-800',
      calibration: 'bg-purple-100 text-purple-800',
      inspection: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      preventive: 'Préventive',
      corrective: 'Corrective',
      calibration: 'Calibration',
      inspection: 'Inspection',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      scheduled: 'Planifiée',
      in_progress: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      low: 'Basse',
      medium: 'Moyenne',
      high: 'Haute',
      critical: 'Critique',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority] || 'bg-gray-100 text-gray-800'}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const isOverdue = (record: MaintenanceRecord): boolean => {
    if (record.status === 'completed' || record.status === 'cancelled') return false;
    return new Date(record.scheduledDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance des Machines</h1>
          <p className="text-muted-foreground">
            Suivi des interventions et maintenances préventives
          </p>
        </div>
        <button
          onClick={handleAddMaintenance}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nouvelle Maintenance
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total</div>
            <div className="mt-2 text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Planifiées</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">En cours</div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Terminées</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">En retard</div>
            <div className="mt-2 text-2xl font-bold text-red-600">{stats.overdue}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Ce mois</div>
            <div className="mt-2 text-2xl font-bold text-purple-600">{stats.thisMonth}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="scheduled">Planifiée</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminée</option>
          <option value="cancelled">Annulée</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les types</option>
          <option value="preventive">Préventive</option>
          <option value="corrective">Corrective</option>
          <option value="calibration">Calibration</option>
          <option value="inspection">Inspection</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Toutes les priorités</option>
          <option value="critical">Critique</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
      </div>

      {/* Maintenance List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement des maintenances...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Erreur: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedRecords.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Machine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Priorité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date prévue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Technicien</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Coût</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedRecords.data.map((record) => (
                    <tr key={record.id} className={`hover:bg-muted/50 ${isOverdue(record) ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium font-mono">{record.machine.machineNumber}</div>
                          <div className="text-sm text-muted-foreground">{record.machine.model}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getTypeBadge(record.type)}</td>
                      <td className="px-6 py-4">{getPriorityBadge(record.priority)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className={isOverdue(record) ? 'text-red-600 font-medium' : ''}>
                            {formatDate(record.scheduledDate)}
                          </div>
                          {isOverdue(record) && (
                            <div className="text-xs text-red-500">En retard</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{record.technician || '-'}</td>
                      <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                      <td className="px-6 py-4 text-sm">{formatCurrency(record.cost)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => handleEditMaintenance(record)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
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
              totalPages={paginatedRecords.totalPages}
              totalItems={paginatedRecords.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <EmptyState
            title="Aucune maintenance trouvée"
            description="Planifiez votre première maintenance"
            icon="box"
            action={{
              label: 'Nouvelle Maintenance',
              onClick: handleAddMaintenance,
            }}
          />
        )}
      </div>

      {/* Maintenance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingRecord ? 'Modifier la Maintenance' : 'Nouvelle Maintenance'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Machine Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">Machine *</label>
                  <select
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionner une machine</option>
                    {machinesData?.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.machineNumber} - {machine.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <select
                      name="type"
                      defaultValue={editingRecord?.type || 'preventive'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="preventive">Préventive</option>
                      <option value="corrective">Corrective</option>
                      <option value="calibration">Calibration</option>
                      <option value="inspection">Inspection</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priorité *</label>
                    <select
                      name="priority"
                      defaultValue={editingRecord?.priority || 'medium'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute</option>
                      <option value="critical">Critique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Statut *</label>
                    <select
                      name="status"
                      defaultValue={editingRecord?.status || 'scheduled'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="scheduled">Planifiée</option>
                      <option value="in_progress">En cours</option>
                      <option value="completed">Terminée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date prévue *</label>
                    <input
                      type="date"
                      name="scheduledDate"
                      defaultValue={editingRecord?.scheduledDate?.split('T')[0]}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date réalisée</label>
                    <input
                      type="date"
                      name="completedDate"
                      defaultValue={editingRecord?.completedDate?.split('T')[0] || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Technicien</label>
                  <input
                    type="text"
                    name="technician"
                    defaultValue={editingRecord?.technician || ''}
                    placeholder="Nom du technicien"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    name="description"
                    defaultValue={editingRecord?.description || ''}
                    required
                    rows={2}
                    placeholder="Description de l'intervention"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Constatations</label>
                  <textarea
                    name="findings"
                    defaultValue={editingRecord?.findings || ''}
                    rows={2}
                    placeholder="Observations et constatations"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Pièces remplacées</label>
                  <textarea
                    name="partsReplaced"
                    defaultValue={editingRecord?.partsReplaced || ''}
                    rows={2}
                    placeholder="Liste des pièces remplacées"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Heures de travail</label>
                    <input
                      type="number"
                      name="laborHours"
                      step="0.5"
                      min="0"
                      defaultValue={editingRecord?.laborHours || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Coût (EUR)</label>
                    <input
                      type="number"
                      name="cost"
                      step="0.01"
                      min="0"
                      defaultValue={editingRecord?.cost || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Proch. maintenance</label>
                    <input
                      type="date"
                      name="nextMaintenanceDate"
                      defaultValue={editingRecord?.nextMaintenanceDate?.split('T')[0] || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={editingRecord?.notes || ''}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingRecord(null); resetForm(); }}
                    className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedMachineId}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {editingRecord ? 'Mettre à jour' : 'Créer'}
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
