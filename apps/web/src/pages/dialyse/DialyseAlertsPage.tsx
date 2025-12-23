/**
 * Dialyse Alerts Page
 * Clinical alerts management for dialysis patients
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { Pagination } from '@/components/Pagination';

interface ClinicalAlert {
  id: string;
  patientId: string;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  patient?: {
    medicalId: string;
    contact: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function DialyseAlertsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  // Fetch alerts
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['dialyse-alerts', statusFilter, severityFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', '100');

      const url = `/dialyse/alerts${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ApiResponse<ClinicalAlert[]>>(url);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['dialyse-alerts-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AlertStats>>('/dialyse/alerts/stats');
      return response.data.data;
    },
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await api.post(`/dialyse/alerts/${alertId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-alerts-stats'] });
    },
    onError: (error) => {
      alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      await api.post(`/dialyse/alerts/${alertId}/resolve`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-alerts-stats'] });
      setResolvingAlertId(null);
      setResolutionNotes('');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Generate automated alerts mutation
  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      await api.post('/dialyse/alerts/generate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-alerts-stats'] });
      window.alert('Alertes automatiques générées avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Calculate paginated data
  const paginatedAlerts = useMemo(() => {
    const alerts = alertsData?.data || [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = alerts.slice(startIndex, endIndex);
    const total = alerts.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [alertsData, currentPage, itemsPerPage]);

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-orange-100 text-orange-800 border-orange-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    const labels: Record<string, string> = {
      critical: 'Critique',
      warning: 'Attention',
      info: 'Info',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[severity] || 'bg-gray-100 text-gray-800'}`}>
        {labels[severity] || severity}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-red-100 text-red-800',
      acknowledged: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      active: 'Active',
      acknowledged: 'Prise en compte',
      resolved: 'Résolue',
      dismissed: 'Ignorée',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getAlertTypeName = (type: string) => {
    const names: Record<string, string> = {
      prescription_renewal: 'Renouvellement prescription',
      lab_due: 'Bilan à faire',
      vaccination: 'Vaccination',
      vascular_access: 'Accès vasculaire',
      serology_update: 'Mise à jour sérologie',
      weight_deviation: 'Écart de poids',
      custom: 'Personnalisée',
    };
    return names[type] || type;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (date: Date | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR');
  };

  const handleResolve = (alertId: string) => {
    if (resolvingAlertId === alertId) {
      resolveMutation.mutate({ alertId, notes: resolutionNotes });
    } else {
      setResolvingAlertId(alertId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertes Cliniques</h1>
          <p className="text-muted-foreground">
            Gestion des alertes et rappels pour les patients dialysés
          </p>
        </div>
        <button
          onClick={() => generateAlertsMutation.mutate()}
          disabled={generateAlertsMutation.isPending}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {generateAlertsMutation.isPending ? 'Génération en cours...' : 'Générer les alertes automatiques'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Alertes actives</div>
            <div className="mt-2 text-2xl font-bold text-red-600">{stats.active}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Critiques</div>
            <div className="mt-2 text-2xl font-bold text-red-600">{stats.critical}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Prises en compte</div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{stats.acknowledged}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Résolues</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.resolved}</div>
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
          <option value="active">Actives</option>
          <option value="acknowledged">Prises en compte</option>
          <option value="resolved">Résolues</option>
          <option value="dismissed">Ignorées</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Toutes sévérités</option>
          <option value="critical">Critique</option>
          <option value="warning">Attention</option>
          <option value="info">Info</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Tous les types</option>
          <option value="prescription_renewal">Renouvellement prescription</option>
          <option value="lab_due">Bilan à faire</option>
          <option value="vaccination">Vaccination</option>
          <option value="vascular_access">Accès vasculaire</option>
          <option value="serology_update">Mise à jour sérologie</option>
          <option value="weight_deviation">Écart de poids</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement des alertes...</p>
            </div>
          </div>
        ) : paginatedAlerts.data.length > 0 ? (
          <>
            <div className="divide-y">
              {paginatedAlerts.data.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                        <span className="text-xs text-muted-foreground">
                          {getAlertTypeName(alert.alertType)}
                        </span>
                      </div>
                      <Link to={`/dialyse/alerts/${alert.id}`} className="font-medium hover:text-primary hover:underline">
                        {alert.title}
                      </Link>
                      {alert.description && (
                        <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {alert.patient && (
                          <Link
                            to={`/dialyse/patients/${alert.patientId}`}
                            className="text-primary hover:underline"
                          >
                            {alert.patient.contact.firstName} {alert.patient.contact.lastName}
                            <span className="text-muted-foreground ml-1">({alert.patient.medicalId})</span>
                          </Link>
                        )}
                        {alert.dueDate && (
                          <span className="text-muted-foreground">
                            Échéance: {formatDate(alert.dueDate)}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          Créée: {formatDateTime(alert.createdAt)}
                        </span>
                      </div>

                      {/* Resolution notes input */}
                      {resolvingAlertId === alert.id && (
                        <div className="mt-3">
                          <textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Notes de résolution (optionnel)..."
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            rows={2}
                          />
                        </div>
                      )}

                      {/* Resolution info */}
                      {alert.status === 'resolved' && alert.resolutionNotes && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                          <span className="font-medium">Résolution:</span> {alert.resolutionNotes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
                        >
                          Prendre en compte
                        </button>
                      )}
                      {(alert.status === 'active' || alert.status === 'acknowledged') && (
                        <>
                          <button
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolveMutation.isPending}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                          >
                            {resolvingAlertId === alert.id ? 'Confirmer' : 'Résoudre'}
                          </button>
                          {resolvingAlertId === alert.id && (
                            <button
                              onClick={() => { setResolvingAlertId(null); setResolutionNotes(''); }}
                              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
                            >
                              Annuler
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={paginatedAlerts.totalPages}
              totalItems={paginatedAlerts.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium">Aucune alerte</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {statusFilter === 'active'
                ? 'Aucune alerte active pour le moment'
                : 'Aucune alerte correspondant aux filtres'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
