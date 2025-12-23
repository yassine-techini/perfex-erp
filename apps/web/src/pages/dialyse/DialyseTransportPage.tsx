/**
 * Dialyse Transport Page
 * Manage patient transport for dialysis sessions
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

interface TransportRecord {
  id: string;
  patientId: string;
  patient: {
    medicalId: string;
    contact: {
      firstName: string;
      lastName: string;
      phone: string | null;
      address: string | null;
    };
  };
  sessionId: string | null;
  session: {
    sessionNumber: string;
    sessionDate: string;
    scheduledStartTime: string | null;
  } | null;
  transportType: 'ambulance' | 'vsl' | 'taxi' | 'personal' | 'family' | 'public';
  direction: 'pickup' | 'dropoff' | 'both';
  status: 'scheduled' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled' | 'no_show';
  scheduledDate: string;
  scheduledTime: string;
  actualPickupTime: string | null;
  actualDropoffTime: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  transportProvider: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  distance: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  wheelchairRequired: boolean;
  stretcherRequired: boolean;
  oxygenRequired: boolean;
  escortRequired: boolean;
  specialInstructions: string | null;
  notes: string | null;
  createdAt: string;
}

interface TransportStats {
  total: number;
  scheduled: number;
  confirmed: number;
  inTransit: number;
  completed: number;
  cancelled: number;
  todayTransports: number;
  ambulanceCount: number;
  vslCount: number;
}

interface TransportFormData {
  patientId: string;
  sessionId?: string;
  transportType: string;
  direction: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  transportProvider?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  distance?: number;
  estimatedCost?: number;
  wheelchairRequired: boolean;
  stretcherRequired: boolean;
  oxygenRequired: boolean;
  escortRequired: boolean;
  specialInstructions?: string;
  notes?: string;
}

interface Patient {
  id: string;
  medicalId: string;
  contact: {
    firstName: string;
    lastName: string;
    address: string | null;
  };
}

export function DialyseTransportPage() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<TransportRecord | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Fetch transport records
  const { data: transportData, isLoading, error } = useQuery({
    queryKey: ['dialyse-transport', dateFilter, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', '100');

      const url = `/dialyse/transport${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ApiResponse<TransportRecord[]>>(url);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['dialyse-transport-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<TransportStats>>('/dialyse/transport/stats');
      return response.data.data;
    },
  });

  // Fetch patients for dropdown
  const { data: patientsData } = useQuery({
    queryKey: ['dialyse-patients-list'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Patient[]>>('/dialyse/patients?status=active&limit=200');
      return response.data.data || [];
    },
  });

  // Create transport mutation
  const createTransport = useMutation({
    mutationFn: async (data: TransportFormData) => {
      await api.post('/dialyse/transport', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport-stats'] });
      setIsModalOpen(false);
      resetForm();
      window.alert('Transport planifié avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update transport mutation
  const updateTransport = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TransportFormData> }) => {
      await api.put(`/dialyse/transport/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport-stats'] });
      setIsModalOpen(false);
      setEditingTransport(null);
      resetForm();
      window.alert('Transport mis à jour avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, actualTime }: { id: string; status: string; actualTime?: string }) => {
      await api.patch(`/dialyse/transport/${id}/status`, { status, actualTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport-stats'] });
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Delete transport mutation
  const deleteTransport = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dialyse/transport/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-transport-stats'] });
      window.alert('Transport supprimé avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const resetForm = () => {
    setSelectedPatientId('');
  };

  const handleAddTransport = () => {
    setEditingTransport(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditTransport = (transport: TransportRecord) => {
    setEditingTransport(transport);
    setSelectedPatientId(transport.patientId);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce transport ?')) {
      deleteTransport.mutate(id);
    }
  };

  const handleStatusChange = (transport: TransportRecord, newStatus: string) => {
    const now = new Date().toISOString();
    updateStatus.mutate({ id: transport.id, status: newStatus, actualTime: now });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: TransportFormData = {
      patientId: selectedPatientId,
      sessionId: formData.get('sessionId') as string || undefined,
      transportType: formData.get('transportType') as string,
      direction: formData.get('direction') as string,
      status: formData.get('status') as string || 'scheduled',
      scheduledDate: formData.get('scheduledDate') as string,
      scheduledTime: formData.get('scheduledTime') as string,
      pickupAddress: formData.get('pickupAddress') as string,
      dropoffAddress: formData.get('dropoffAddress') as string,
      transportProvider: formData.get('transportProvider') as string || undefined,
      driverName: formData.get('driverName') as string || undefined,
      driverPhone: formData.get('driverPhone') as string || undefined,
      vehicleNumber: formData.get('vehicleNumber') as string || undefined,
      distance: formData.get('distance') ? parseFloat(formData.get('distance') as string) : undefined,
      estimatedCost: formData.get('estimatedCost') ? parseFloat(formData.get('estimatedCost') as string) : undefined,
      wheelchairRequired: formData.get('wheelchairRequired') === 'on',
      stretcherRequired: formData.get('stretcherRequired') === 'on',
      oxygenRequired: formData.get('oxygenRequired') === 'on',
      escortRequired: formData.get('escortRequired') === 'on',
      specialInstructions: formData.get('specialInstructions') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };

    if (editingTransport) {
      updateTransport.mutate({ id: editingTransport.id, data });
    } else {
      createTransport.mutate(data);
    }
  };

  // Calculate paginated data
  const paginatedTransport = useMemo(() => {
    const records = transportData?.data || [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = records.slice(startIndex, endIndex);
    const total = records.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [transportData, currentPage, itemsPerPage]);

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      ambulance: 'bg-red-100 text-red-800',
      vsl: 'bg-blue-100 text-blue-800',
      taxi: 'bg-yellow-100 text-yellow-800',
      personal: 'bg-gray-100 text-gray-800',
      family: 'bg-green-100 text-green-800',
      public: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      ambulance: 'Ambulance',
      vsl: 'VSL',
      taxi: 'Taxi',
      personal: 'Personnel',
      family: 'Famille',
      public: 'Transport public',
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
      confirmed: 'bg-green-100 text-green-800',
      in_transit: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      scheduled: 'Planifié',
      confirmed: 'Confirmé',
      in_transit: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'Absent',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDirectionBadge = (direction: string) => {
    const labels: Record<string, string> = {
      pickup: 'Aller',
      dropoff: 'Retour',
      both: 'Aller-Retour',
    };
    return labels[direction] || direction;
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getSpecialNeeds = (transport: TransportRecord): string[] => {
    const needs: string[] = [];
    if (transport.wheelchairRequired) needs.push('Fauteuil');
    if (transport.stretcherRequired) needs.push('Brancard');
    if (transport.oxygenRequired) needs.push('O2');
    if (transport.escortRequired) needs.push('Accompagnant');
    return needs;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transport Patients</h1>
          <p className="text-muted-foreground">
            Gestion des transports sanitaires des patients
          </p>
        </div>
        <button
          onClick={handleAddTransport}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nouveau Transport
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Aujourd'hui</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.todayTransports}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Planifiés</div>
            <div className="mt-2 text-2xl font-bold">{stats.scheduled}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">En cours</div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{stats.inTransit}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Ambulances</div>
            <div className="mt-2 text-2xl font-bold text-red-600">{stats.ambulanceCount}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">VSL</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.vslCount}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="scheduled">Planifié</option>
          <option value="confirmed">Confirmé</option>
          <option value="in_transit">En cours</option>
          <option value="completed">Terminé</option>
          <option value="cancelled">Annulé</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les types</option>
          <option value="ambulance">Ambulance</option>
          <option value="vsl">VSL</option>
          <option value="taxi">Taxi</option>
          <option value="personal">Personnel</option>
          <option value="family">Famille</option>
        </select>
        <button
          onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Transport List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement des transports...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Erreur: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedTransport.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Heure</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Direction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trajet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Besoins</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedTransport.data.map((transport) => (
                    <tr key={transport.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{transport.scheduledTime}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(transport.scheduledDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {transport.patient.contact.firstName} {transport.patient.contact.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">{transport.patient.medicalId}</div>
                      </td>
                      <td className="px-6 py-4">{getTypeBadge(transport.transportType)}</td>
                      <td className="px-6 py-4 text-sm">{getDirectionBadge(transport.direction)}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs max-w-[200px]">
                          <div className="truncate text-muted-foreground">De: {transport.pickupAddress}</div>
                          <div className="truncate">À: {transport.dropoffAddress}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getSpecialNeeds(transport).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {getSpecialNeeds(transport).map((need, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                                {need}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {getStatusBadge(transport.status)}
                          {transport.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusChange(transport, 'confirmed')}
                              className="block text-xs text-green-600 hover:underline"
                            >
                              Confirmer
                            </button>
                          )}
                          {transport.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(transport, 'in_transit')}
                              className="block text-xs text-blue-600 hover:underline"
                            >
                              Départ
                            </button>
                          )}
                          {transport.status === 'in_transit' && (
                            <button
                              onClick={() => handleStatusChange(transport, 'completed')}
                              className="block text-xs text-gray-600 hover:underline"
                            >
                              Terminé
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => handleEditTransport(transport)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(transport.id)}
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
              totalPages={paginatedTransport.totalPages}
              totalItems={paginatedTransport.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <EmptyState
            title="Aucun transport trouvé"
            description="Planifiez votre premier transport"
            icon="box"
            action={{
              label: 'Nouveau Transport',
              onClick: handleAddTransport,
            }}
          />
        )}
      </div>

      {/* Transport Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingTransport ? 'Modifier le Transport' : 'Nouveau Transport'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">Patient *</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionner un patient</option>
                    {patientsData?.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.contact.firstName} {patient.contact.lastName} ({patient.medicalId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <select
                      name="transportType"
                      defaultValue={editingTransport?.transportType || 'vsl'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="ambulance">Ambulance</option>
                      <option value="vsl">VSL</option>
                      <option value="taxi">Taxi</option>
                      <option value="personal">Personnel</option>
                      <option value="family">Famille</option>
                      <option value="public">Transport public</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Direction *</label>
                    <select
                      name="direction"
                      defaultValue={editingTransport?.direction || 'both'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="pickup">Aller</option>
                      <option value="dropoff">Retour</option>
                      <option value="both">Aller-Retour</option>
                    </select>
                  </div>
                  {editingTransport && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Statut</label>
                      <select
                        name="status"
                        defaultValue={editingTransport.status}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="scheduled">Planifié</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="in_transit">En cours</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                        <option value="no_show">Absent</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <input
                      type="date"
                      name="scheduledDate"
                      defaultValue={editingTransport?.scheduledDate?.split('T')[0] || dateFilter}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Heure *</label>
                    <input
                      type="time"
                      name="scheduledTime"
                      defaultValue={editingTransport?.scheduledTime || '08:00'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Adresse de départ *</label>
                  <input
                    type="text"
                    name="pickupAddress"
                    defaultValue={editingTransport?.pickupAddress || ''}
                    required
                    placeholder="Adresse complète"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Adresse d'arrivée *</label>
                  <input
                    type="text"
                    name="dropoffAddress"
                    defaultValue={editingTransport?.dropoffAddress || 'Centre de Dialyse'}
                    required
                    placeholder="Adresse complète"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* Transport Provider */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Société de transport</label>
                    <input
                      type="text"
                      name="transportProvider"
                      defaultValue={editingTransport?.transportProvider || ''}
                      placeholder="Nom de la société"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">N° Véhicule</label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      defaultValue={editingTransport?.vehicleNumber || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom du chauffeur</label>
                    <input
                      type="text"
                      name="driverName"
                      defaultValue={editingTransport?.driverName || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tél chauffeur</label>
                    <input
                      type="tel"
                      name="driverPhone"
                      defaultValue={editingTransport?.driverPhone || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Distance (km)</label>
                    <input
                      type="number"
                      name="distance"
                      step="0.1"
                      min="0"
                      defaultValue={editingTransport?.distance || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Coût estimé (EUR)</label>
                    <input
                      type="number"
                      name="estimatedCost"
                      step="0.01"
                      min="0"
                      defaultValue={editingTransport?.estimatedCost || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Special Needs */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-medium">Besoins spéciaux</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="wheelchairRequired"
                        defaultChecked={editingTransport?.wheelchairRequired}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Fauteuil roulant</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="stretcherRequired"
                        defaultChecked={editingTransport?.stretcherRequired}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Brancard</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="oxygenRequired"
                        defaultChecked={editingTransport?.oxygenRequired}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Oxygène</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="escortRequired"
                        defaultChecked={editingTransport?.escortRequired}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Accompagnant</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Instructions spéciales</label>
                  <textarea
                    name="specialInstructions"
                    defaultValue={editingTransport?.specialInstructions || ''}
                    rows={2}
                    placeholder="Instructions pour le chauffeur..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={editingTransport?.notes || ''}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingTransport(null); resetForm(); }}
                    className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPatientId}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {editingTransport ? 'Mettre à jour' : 'Créer'}
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
