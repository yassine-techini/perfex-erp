/**
 * Dialyse Billing Page
 * Manage billing for dialysis sessions
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

interface BillingRecord {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patient: {
    medicalId: string;
    contact: {
      firstName: string;
      lastName: string;
    };
  };
  sessionId: string | null;
  session: {
    sessionNumber: string;
    sessionDate: string;
  } | null;
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid';
  billingType: 'session' | 'monthly' | 'package' | 'other';
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  // Amounts
  baseAmount: number;
  consumablesAmount: number;
  medicationsAmount: number;
  additionalCharges: number;
  discountAmount: number;
  totalAmount: number;
  insuranceCoverage: number;
  patientResponsibility: number;
  paidAmount: number;
  // Dates
  serviceDate: string;
  billingDate: string;
  dueDate: string | null;
  paidDate: string | null;
  // Items
  lineItems: BillingLineItem[];
  notes: string | null;
  createdAt: string;
}

interface BillingLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'session' | 'consumable' | 'medication' | 'service' | 'other';
  code: string | null;
}

interface BillingStats {
  total: number;
  draft: number;
  pending: number;
  submitted: number;
  paid: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  thisMonth: number;
}

interface BillingFormData {
  patientId: string;
  sessionId?: string;
  billingType: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  baseAmount: number;
  consumablesAmount: number;
  medicationsAmount: number;
  additionalCharges: number;
  discountAmount: number;
  insuranceCoverage: number;
  serviceDate: string;
  dueDate?: string;
  notes?: string;
}

interface Patient {
  id: string;
  medicalId: string;
  contact: {
    firstName: string;
    lastName: string;
  };
}

export function DialyseBillingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<BillingRecord | null>(null);
  const [viewingBilling, setViewingBilling] = useState<BillingRecord | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Fetch billing records
  const { data: billingData, isLoading, error } = useQuery({
    queryKey: ['dialyse-billing', searchTerm, statusFilter, typeFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      params.append('limit', '100');

      const url = `/dialyse/billing${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ApiResponse<BillingRecord[]>>(url);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['dialyse-billing-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<BillingStats>>('/dialyse/billing/stats');
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

  // Create billing mutation
  const createBilling = useMutation({
    mutationFn: async (data: BillingFormData) => {
      await api.post('/dialyse/billing', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing-stats'] });
      setIsModalOpen(false);
      resetForm();
      window.alert('Facture créée avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update billing mutation
  const updateBilling = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BillingFormData & { status: string }> }) => {
      await api.put(`/dialyse/billing/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing-stats'] });
      setIsModalOpen(false);
      setEditingBilling(null);
      resetForm();
      window.alert('Facture mise à jour avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Delete billing mutation
  const deleteBilling = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dialyse/billing/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing-stats'] });
      window.alert('Facture supprimée avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Mark as paid mutation
  const markAsPaid = useMutation({
    mutationFn: async ({ id, paidAmount }: { id: string; paidAmount: number }) => {
      await api.post(`/dialyse/billing/${id}/pay`, { paidAmount, paidDate: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-billing-stats'] });
      window.alert('Paiement enregistré avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const resetForm = () => {
    setSelectedPatientId('');
  };

  const handleAddBilling = () => {
    setEditingBilling(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditBilling = (billing: BillingRecord) => {
    setEditingBilling(billing);
    setSelectedPatientId(billing.patientId);
    setIsModalOpen(true);
  };

  const handleViewBilling = (billing: BillingRecord) => {
    setViewingBilling(billing);
  };

  const handleDelete = (id: string, invoiceNumber: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la facture "${invoiceNumber}" ?`)) {
      deleteBilling.mutate(id);
    }
  };

  const handleMarkAsPaid = (billing: BillingRecord) => {
    const outstanding = billing.totalAmount - billing.paidAmount;
    const amount = prompt(`Montant payé (restant dû: ${formatCurrency(outstanding)}):`, outstanding.toString());
    if (amount !== null) {
      const paidAmount = parseFloat(amount);
      if (!isNaN(paidAmount) && paidAmount > 0) {
        markAsPaid.mutate({ id: billing.id, paidAmount: billing.paidAmount + paidAmount });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const baseAmount = parseFloat(formData.get('baseAmount') as string) || 0;
    const consumablesAmount = parseFloat(formData.get('consumablesAmount') as string) || 0;
    const medicationsAmount = parseFloat(formData.get('medicationsAmount') as string) || 0;
    const additionalCharges = parseFloat(formData.get('additionalCharges') as string) || 0;
    const discountAmount = parseFloat(formData.get('discountAmount') as string) || 0;
    const insuranceCoverage = parseFloat(formData.get('insuranceCoverage') as string) || 0;

    const data: BillingFormData = {
      patientId: selectedPatientId,
      sessionId: formData.get('sessionId') as string || undefined,
      billingType: formData.get('billingType') as string,
      insuranceProvider: formData.get('insuranceProvider') as string || undefined,
      insurancePolicyNumber: formData.get('insurancePolicyNumber') as string || undefined,
      baseAmount,
      consumablesAmount,
      medicationsAmount,
      additionalCharges,
      discountAmount,
      insuranceCoverage,
      serviceDate: formData.get('serviceDate') as string,
      dueDate: formData.get('dueDate') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };

    if (editingBilling) {
      updateBilling.mutate({
        id: editingBilling.id,
        data: {
          ...data,
          status: formData.get('status') as string,
        },
      });
    } else {
      createBilling.mutate(data);
    }
  };

  // Calculate paginated data
  const paginatedBilling = useMemo(() => {
    const records = billingData?.data || [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = records.slice(startIndex, endIndex);
    const total = records.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [billingData, currentPage, itemsPerPage]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-emerald-100 text-emerald-800',
    };
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      pending: 'En attente',
      submitted: 'Soumise',
      approved: 'Approuvée',
      rejected: 'Rejetée',
      paid: 'Payée',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      session: 'bg-blue-100 text-blue-800',
      monthly: 'bg-purple-100 text-purple-800',
      package: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      session: 'Séance',
      monthly: 'Mensuelle',
      package: 'Forfait',
      other: 'Autre',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const isOverdue = (billing: BillingRecord): boolean => {
    if (billing.status === 'paid' || !billing.dueDate) return false;
    return new Date(billing.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturation</h1>
          <p className="text-muted-foreground">
            Gestion des factures et paiements des séances de dialyse
          </p>
        </div>
        <button
          onClick={handleAddBilling}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nouvelle Facture
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Facturé</div>
            <div className="mt-2 text-2xl font-bold">{formatCurrency(stats.totalBilled)}</div>
            <div className="text-xs text-muted-foreground">{stats.total} factures</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Payé</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
            <div className="text-xs text-muted-foreground">{stats.paid} factures payées</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">En Attente</div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalOutstanding)}</div>
            <div className="text-xs text-muted-foreground">{stats.pending} en attente</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Ce Mois</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.thisMonth}</div>
            <div className="text-xs text-muted-foreground">factures générées</div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Rechercher (N° facture, patient)..."
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
          <option value="draft">Brouillon</option>
          <option value="pending">En attente</option>
          <option value="submitted">Soumise</option>
          <option value="approved">Approuvée</option>
          <option value="rejected">Rejetée</option>
          <option value="paid">Payée</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les types</option>
          <option value="session">Séance</option>
          <option value="monthly">Mensuelle</option>
          <option value="package">Forfait</option>
          <option value="other">Autre</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => { setDateRange(e.target.value as typeof dateRange); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Toutes les dates</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
        </select>
      </div>

      {/* Billing List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement des factures...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Erreur: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedBilling.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">N° Facture</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Assurance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedBilling.data.map((billing) => (
                    <tr key={billing.id} className={`hover:bg-muted/50 ${isOverdue(billing) ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm font-medium">{billing.invoiceNumber}</div>
                        {billing.session && (
                          <div className="text-xs text-muted-foreground">Séance: {billing.session.sessionNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{billing.patient.contact.firstName} {billing.patient.contact.lastName}</div>
                        <div className="text-sm text-muted-foreground font-mono">{billing.patient.medicalId}</div>
                      </td>
                      <td className="px-6 py-4">{getTypeBadge(billing.billingType)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{formatDate(billing.serviceDate)}</div>
                        {billing.dueDate && (
                          <div className={`text-xs ${isOverdue(billing) ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            Éch: {formatDate(billing.dueDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{formatCurrency(billing.totalAmount)}</div>
                        {billing.paidAmount > 0 && billing.paidAmount < billing.totalAmount && (
                          <div className="text-xs text-muted-foreground">
                            Payé: {formatCurrency(billing.paidAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {billing.insuranceProvider ? (
                          <div className="text-sm">
                            <div>{billing.insuranceProvider}</div>
                            <div className="text-muted-foreground">{formatCurrency(billing.insuranceCoverage)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(billing.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-1">
                        <button
                          onClick={() => handleViewBilling(billing)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Voir
                        </button>
                        {billing.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkAsPaid(billing)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Payer
                          </button>
                        )}
                        <button
                          onClick={() => handleEditBilling(billing)}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(billing.id, billing.invoiceNumber)}
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
              totalPages={paginatedBilling.totalPages}
              totalItems={paginatedBilling.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <EmptyState
            title="Aucune facture trouvée"
            description="Créez votre première facture"
            icon="invoice"
            action={{
              label: 'Nouvelle Facture',
              onClick: handleAddBilling,
            }}
          />
        )}
      </div>

      {/* View Billing Modal */}
      {viewingBilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Facture {viewingBilling.invoiceNumber}</h2>
                    {getStatusBadge(viewingBilling.status)}
                  </div>
                  <p className="text-muted-foreground">
                    {viewingBilling.patient.contact.firstName} {viewingBilling.patient.contact.lastName} ({viewingBilling.patient.medicalId})
                  </p>
                </div>
                <button
                  onClick={() => setViewingBilling(null)}
                  className="p-2 hover:bg-accent rounded-md"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Billing Info */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Informations</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>{getTypeBadge(viewingBilling.billingType)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Date service</dt>
                      <dd>{formatDate(viewingBilling.serviceDate)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Date facturation</dt>
                      <dd>{formatDate(viewingBilling.billingDate)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Échéance</dt>
                      <dd className={isOverdue(viewingBilling) ? 'text-red-600 font-medium' : ''}>
                        {formatDate(viewingBilling.dueDate)}
                      </dd>
                    </div>
                    {viewingBilling.session && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Séance</dt>
                        <dd>{viewingBilling.session.sessionNumber}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Insurance */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Assurance</h3>
                  {viewingBilling.insuranceProvider ? (
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Fournisseur</dt>
                        <dd>{viewingBilling.insuranceProvider}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">N° Police</dt>
                        <dd className="font-mono">{viewingBilling.insurancePolicyNumber}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Couverture</dt>
                        <dd className="font-medium">{formatCurrency(viewingBilling.insuranceCoverage)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-muted-foreground text-sm">Pas d'assurance</p>
                  )}
                </div>
              </div>

              {/* Amounts Breakdown */}
              <div className="mt-6 rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Détail des montants</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Montant de base</span>
                    <span>{formatCurrency(viewingBilling.baseAmount)}</span>
                  </div>
                  {viewingBilling.consumablesAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Consommables</span>
                      <span>{formatCurrency(viewingBilling.consumablesAmount)}</span>
                    </div>
                  )}
                  {viewingBilling.medicationsAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Médicaments</span>
                      <span>{formatCurrency(viewingBilling.medicationsAmount)}</span>
                    </div>
                  )}
                  {viewingBilling.additionalCharges > 0 && (
                    <div className="flex justify-between">
                      <span>Frais supplémentaires</span>
                      <span>{formatCurrency(viewingBilling.additionalCharges)}</span>
                    </div>
                  )}
                  {viewingBilling.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Remise</span>
                      <span>-{formatCurrency(viewingBilling.discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 font-semibold flex justify-between">
                    <span>Total</span>
                    <span>{formatCurrency(viewingBilling.totalAmount)}</span>
                  </div>
                  {viewingBilling.insuranceCoverage > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Prise en charge assurance</span>
                      <span>-{formatCurrency(viewingBilling.insuranceCoverage)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Reste à charge patient</span>
                    <span>{formatCurrency(viewingBilling.patientResponsibility)}</span>
                  </div>
                  {viewingBilling.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Déjà payé</span>
                        <span>{formatCurrency(viewingBilling.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Restant dû</span>
                        <span className={viewingBilling.totalAmount - viewingBilling.paidAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(viewingBilling.totalAmount - viewingBilling.paidAmount)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Line Items */}
              {viewingBilling.lineItems && viewingBilling.lineItems.length > 0 && (
                <div className="mt-6 rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Lignes de facturation</h3>
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">Description</th>
                        <th className="text-center py-2">Qté</th>
                        <th className="text-right py-2">P.U.</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingBilling.lineItems.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2">
                            {item.description}
                            {item.code && <span className="text-muted-foreground ml-2">({item.code})</span>}
                          </td>
                          <td className="text-center py-2">{item.quantity}</td>
                          <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right py-2 font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewingBilling.notes && (
                <div className="mt-6 rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingBilling.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                {viewingBilling.status !== 'paid' && (
                  <button
                    onClick={() => { setViewingBilling(null); handleMarkAsPaid(viewingBilling); }}
                    className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                  >
                    Enregistrer paiement
                  </button>
                )}
                <button
                  onClick={() => { setViewingBilling(null); handleEditBilling(viewingBilling); }}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setViewingBilling(null)}
                  className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingBilling ? 'Modifier la Facture' : 'Nouvelle Facture'}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <select
                      name="billingType"
                      defaultValue={editingBilling?.billingType || 'session'}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="session">Séance</option>
                      <option value="monthly">Mensuelle</option>
                      <option value="package">Forfait</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  {editingBilling && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Statut *</label>
                      <select
                        name="status"
                        defaultValue={editingBilling.status}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="draft">Brouillon</option>
                        <option value="pending">En attente</option>
                        <option value="submitted">Soumise</option>
                        <option value="approved">Approuvée</option>
                        <option value="rejected">Rejetée</option>
                        <option value="paid">Payée</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date service *</label>
                    <input
                      type="date"
                      name="serviceDate"
                      defaultValue={editingBilling?.serviceDate?.split('T')[0] || new Date().toISOString().split('T')[0]}
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date échéance</label>
                    <input
                      type="date"
                      name="dueDate"
                      defaultValue={editingBilling?.dueDate?.split('T')[0] || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Insurance */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Assurance</label>
                    <input
                      type="text"
                      name="insuranceProvider"
                      defaultValue={editingBilling?.insuranceProvider || ''}
                      placeholder="Nom de l'assurance"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">N° Police</label>
                    <input
                      type="text"
                      name="insurancePolicyNumber"
                      defaultValue={editingBilling?.insurancePolicyNumber || ''}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-medium">Montants</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Base (EUR) *</label>
                      <input
                        type="number"
                        name="baseAmount"
                        step="0.01"
                        min="0"
                        defaultValue={editingBilling?.baseAmount || ''}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Consommables</label>
                      <input
                        type="number"
                        name="consumablesAmount"
                        step="0.01"
                        min="0"
                        defaultValue={editingBilling?.consumablesAmount || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Médicaments</label>
                      <input
                        type="number"
                        name="medicationsAmount"
                        step="0.01"
                        min="0"
                        defaultValue={editingBilling?.medicationsAmount || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Frais suppl.</label>
                      <input
                        type="number"
                        name="additionalCharges"
                        step="0.01"
                        min="0"
                        defaultValue={editingBilling?.additionalCharges || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Remise</label>
                      <input
                        type="number"
                        name="discountAmount"
                        step="0.01"
                        min="0"
                        defaultValue={editingBilling?.discountAmount || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Couverture assurance</label>
                      <input
                        type="number"
                        name="insuranceCoverage"
                        step="0.01"
                        min="0"
                        defaultValue={editingBilling?.insuranceCoverage || ''}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={editingBilling?.notes || ''}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setEditingBilling(null); resetForm(); }}
                    className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPatientId}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {editingBilling ? 'Mettre à jour' : 'Créer'}
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
