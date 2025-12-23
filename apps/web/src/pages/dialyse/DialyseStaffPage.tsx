/**
 * Dialyse Staff Page
 * Manage medical staff for dialysis center
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  role: 'nephrologist' | 'nurse' | 'technician' | 'dietitian' | 'social_worker' | 'administrator';
  specialization: string | null;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  licenseNumber: string | null;
  licenseExpiry: string | null;
  hireDate: string | null;
  schedule: StaffSchedule[] | null;
  assignedPatientCount: number;
  sessionsThisMonth: number;
  notes: string | null;
  createdAt: string;
}

interface StaffSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  shift: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface StaffStats {
  total: number;
  active: number;
  byRole: Record<string, number>;
  onLeave: number;
  expiringLicenses: number;
}

interface StaffFormData {
  employeeId: string;
  firstName: string;
  lastName: string;
  role: string;
  specialization?: string;
  email: string;
  phone?: string;
  status: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  hireDate?: string;
  notes?: string;
}

export function DialyseStaffPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState<StaffMember | null>(null);

  // Fetch staff
  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ['dialyse-staff', searchTerm, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', '100');

      const url = `/dialyse/staff${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ApiResponse<StaffMember[]>>(url);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['dialyse-staff-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<StaffStats>>('/dialyse/staff/stats');
      return response.data.data;
    },
  });

  // Create staff mutation
  const createStaff = useMutation({
    mutationFn: async (data: StaffFormData) => {
      await api.post('/dialyse/staff', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-staff'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-staff-stats'] });
      setIsModalOpen(false);
      window.alert('Personnel créé avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update staff mutation
  const updateStaff = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffFormData> }) => {
      await api.put(`/dialyse/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-staff'] });
      setIsModalOpen(false);
      setEditingStaff(null);
      window.alert('Personnel mis à jour avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Delete staff mutation
  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dialyse/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-staff'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-staff-stats'] });
      window.alert('Personnel supprimé avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update schedule mutation
  const updateSchedule = useMutation({
    mutationFn: async ({ id, schedule }: { id: string; schedule: StaffSchedule[] }) => {
      await api.put(`/dialyse/staff/${id}/schedule`, { schedule });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-staff'] });
      setIsScheduleModalOpen(false);
      setScheduleStaff(null);
      window.alert('Horaires mis à jour avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const handleAddStaff = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  const handleViewStaff = (staff: StaffMember) => {
    setViewingStaff(staff);
  };

  const handleManageSchedule = (staff: StaffMember) => {
    setScheduleStaff(staff);
    setIsScheduleModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${name}" ?`)) {
      deleteStaff.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: StaffFormData = {
      employeeId: formData.get('employeeId') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      role: formData.get('role') as string,
      specialization: formData.get('specialization') as string || undefined,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || undefined,
      status: formData.get('status') as string,
      licenseNumber: formData.get('licenseNumber') as string || undefined,
      licenseExpiry: formData.get('licenseExpiry') as string || undefined,
      hireDate: formData.get('hireDate') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };

    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data });
    } else {
      createStaff.mutate(data);
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scheduleStaff) return;

    const formData = new FormData(e.currentTarget);
    const schedule: StaffSchedule[] = [];

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    days.forEach((day, index) => {
      const enabled = formData.get(`${day}_enabled`) === 'on';
      if (enabled) {
        schedule.push({
          dayOfWeek: index,
          startTime: formData.get(`${day}_start`) as string,
          endTime: formData.get(`${day}_end`) as string,
          shift: formData.get(`${day}_shift`) as StaffSchedule['shift'],
        });
      }
    });

    updateSchedule.mutate({ id: scheduleStaff.id, schedule });
  };

  // Calculate paginated data
  const paginatedStaff = useMemo(() => {
    const staff = staffData?.data || [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = staff.slice(startIndex, endIndex);
    const total = staff.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [staffData, currentPage, itemsPerPage]);

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      nephrologist: 'bg-purple-100 text-purple-800',
      nurse: 'bg-blue-100 text-blue-800',
      technician: 'bg-green-100 text-green-800',
      dietitian: 'bg-orange-100 text-orange-800',
      social_worker: 'bg-teal-100 text-teal-800',
      administrator: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      nephrologist: 'Néphrologue',
      nurse: 'Infirmier(e)',
      technician: 'Technicien',
      dietitian: 'Diététicien(ne)',
      social_worker: 'Assistant(e) social(e)',
      administrator: 'Administrateur',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      active: 'Actif',
      inactive: 'Inactif',
      on_leave: 'En congé',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const isLicenseExpiringSoon = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const threeMonths = 90 * 24 * 60 * 60 * 1000;
    return expiry.getTime() - now.getTime() < threeMonths;
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnel Médical</h1>
          <p className="text-muted-foreground">
            Gestion des médecins, infirmiers et personnel du centre
          </p>
        </div>
        <button
          onClick={handleAddStaff}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nouveau Personnel
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
            <div className="text-sm font-medium text-muted-foreground">Actifs</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Néphrologues</div>
            <div className="mt-2 text-2xl font-bold text-purple-600">{stats.byRole?.nephrologist || 0}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Infirmiers</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.byRole?.nurse || 0}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">En congé</div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{stats.onLeave}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Licences à renouveler</div>
            <div className="mt-2 text-2xl font-bold text-red-600">{stats.expiringLicenses}</div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Rechercher (nom, email, ID)..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les rôles</option>
          <option value="nephrologist">Néphrologue</option>
          <option value="nurse">Infirmier(e)</option>
          <option value="technician">Technicien</option>
          <option value="dietitian">Diététicien(ne)</option>
          <option value="social_worker">Assistant(e) social(e)</option>
          <option value="administrator">Administrateur</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="on_leave">En congé</option>
        </select>
      </div>

      {/* Staff List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement du personnel...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Erreur: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedStaff.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Licence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Patients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedStaff.data.map((staff) => (
                    <tr key={staff.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 font-mono text-sm">{staff.employeeId}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{staff.firstName} {staff.lastName}</div>
                          {staff.specialization && (
                            <div className="text-sm text-muted-foreground">{staff.specialization}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(staff.role)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div>{staff.email}</div>
                          {staff.phone && <div className="text-muted-foreground">{staff.phone}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {staff.licenseNumber ? (
                          <div className="text-sm">
                            <div className="font-mono">{staff.licenseNumber}</div>
                            <div className={isLicenseExpiringSoon(staff.licenseExpiry) ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              Exp: {formatDate(staff.licenseExpiry)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium">{staff.assignedPatientCount} patients</div>
                          <div className="text-muted-foreground">{staff.sessionsThisMonth} séances/mois</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(staff.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-1">
                        <button
                          onClick={() => handleViewStaff(staff)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => handleManageSchedule(staff)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Horaires
                        </button>
                        <button
                          onClick={() => handleEditStaff(staff)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(staff.id, `${staff.firstName} ${staff.lastName}`)}
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
              totalPages={paginatedStaff.totalPages}
              totalItems={paginatedStaff.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <EmptyState
            title="Aucun personnel trouvé"
            description="Ajoutez votre premier membre du personnel"
            icon="users"
            action={{
              label: 'Nouveau Personnel',
              onClick: handleAddStaff,
            }}
          />
        )}
      </div>

      {/* View Staff Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{viewingStaff.firstName} {viewingStaff.lastName}</h2>
                    {getStatusBadge(viewingStaff.status)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(viewingStaff.role)}
                    <span className="text-muted-foreground font-mono">{viewingStaff.employeeId}</span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingStaff(null)}
                  className="p-2 hover:bg-accent rounded-md"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Contact Info */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Coordonnées</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd>{viewingStaff.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Téléphone</dt>
                      <dd>{viewingStaff.phone || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Spécialisation</dt>
                      <dd>{viewingStaff.specialization || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Date embauche</dt>
                      <dd>{formatDate(viewingStaff.hireDate)}</dd>
                    </div>
                  </dl>
                </div>

                {/* License Info */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Licence</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Numéro</dt>
                      <dd className="font-mono">{viewingStaff.licenseNumber || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Expiration</dt>
                      <dd className={isLicenseExpiringSoon(viewingStaff.licenseExpiry) ? 'text-red-600 font-medium' : ''}>
                        {formatDate(viewingStaff.licenseExpiry)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Activity */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Activité</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Patients assignés</dt>
                      <dd className="font-medium">{viewingStaff.assignedPatientCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Séances ce mois</dt>
                      <dd className="font-medium">{viewingStaff.sessionsThisMonth}</dd>
                    </div>
                  </dl>
                </div>

                {/* Schedule */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Horaires</h3>
                  {viewingStaff.schedule && viewingStaff.schedule.length > 0 ? (
                    <div className="space-y-1 text-sm">
                      {viewingStaff.schedule.map((s, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-muted-foreground">{dayNames[s.dayOfWeek]}</span>
                          <span>{s.startTime} - {s.endTime}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Aucun horaire défini</p>
                  )}
                </div>
              </div>

              {viewingStaff.notes && (
                <div className="mt-6 rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingStaff.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => { setViewingStaff(null); handleEditStaff(viewingStaff); }}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setViewingStaff(null)}
                  className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingStaff ? 'Modifier le Personnel' : 'Nouveau Personnel'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">ID Employé *</label>
                    <input
                      type="text"
                      name="employeeId"
                      defaultValue={editingStaff?.employeeId}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rôle *</label>
                    <select
                      name="role"
                      defaultValue={editingStaff?.role || 'nurse'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="nephrologist">Néphrologue</option>
                      <option value="nurse">Infirmier(e)</option>
                      <option value="technician">Technicien</option>
                      <option value="dietitian">Diététicien(ne)</option>
                      <option value="social_worker">Assistant(e) social(e)</option>
                      <option value="administrator">Administrateur</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Prénom *</label>
                    <input
                      type="text"
                      name="firstName"
                      defaultValue={editingStaff?.firstName}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom *</label>
                    <input
                      type="text"
                      name="lastName"
                      defaultValue={editingStaff?.lastName}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Spécialisation</label>
                  <input
                    type="text"
                    name="specialization"
                    defaultValue={editingStaff?.specialization || ''}
                    placeholder="Néphrologie pédiatrique, Dialyse péritonéale..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingStaff?.email}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={editingStaff?.phone || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Statut *</label>
                    <select
                      name="status"
                      defaultValue={editingStaff?.status || 'active'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="on_leave">En congé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date embauche</label>
                    <input
                      type="date"
                      name="hireDate"
                      defaultValue={editingStaff?.hireDate?.split('T')[0] || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">N° Licence</label>
                    <input
                      type="text"
                      name="licenseNumber"
                      defaultValue={editingStaff?.licenseNumber || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiration licence</label>
                    <input
                      type="date"
                      name="licenseExpiry"
                      defaultValue={editingStaff?.licenseExpiry?.split('T')[0] || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={editingStaff?.notes || ''}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingStaff(null); }}
                    className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    {editingStaff ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && scheduleStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Horaires de {scheduleStaff.firstName} {scheduleStaff.lastName}
              </h2>
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                {dayNames.map((day, index) => {
                  const existing = scheduleStaff.schedule?.find(s => s.dayOfWeek === index);
                  const dayKey = day.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                  return (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                      <label className="flex items-center gap-2 w-28">
                        <input
                          type="checkbox"
                          name={`${dayKey}_enabled`}
                          defaultChecked={!!existing}
                          className="rounded border-input"
                        />
                        <span className="text-sm font-medium">{day}</span>
                      </label>
                      <input
                        type="time"
                        name={`${dayKey}_start`}
                        defaultValue={existing?.startTime || '08:00'}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="time"
                        name={`${dayKey}_end`}
                        defaultValue={existing?.endTime || '16:00'}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                      <select
                        name={`${dayKey}_shift`}
                        defaultValue={existing?.shift || 'morning'}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        <option value="morning">Matin</option>
                        <option value="afternoon">Après-midi</option>
                        <option value="evening">Soir</option>
                        <option value="night">Nuit</option>
                      </select>
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsScheduleModalOpen(false); setScheduleStaff(null); }}
                    className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    Enregistrer
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
