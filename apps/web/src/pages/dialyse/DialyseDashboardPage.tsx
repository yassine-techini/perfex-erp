/**
 * Dialyse Dashboard Page
 * Main dashboard for dialysis center management
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, type ApiResponse } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardData {
  patients: {
    totalPatients: number;
    activePatients: number;
    isolationPatients: number;
    recentlyAdded: number;
  };
  machines: {
    totalMachines: number;
    availableMachines: number;
    inUseMachines: number;
    maintenanceMachines: number;
    outOfServiceMachines: number;
    isolationMachines: number;
  };
  sessions: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    inProgressSessions: number;
    scheduledSessions: number;
    averageDuration: number;
    incidentCount: number;
  };
  alerts: {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  todaySessions: Array<{
    id: string;
    sessionNumber: string;
    patientId: string;
    status: string;
    scheduledStartTime: string | null;
    machineId: string | null;
  }>;
  criticalAlerts: Array<{
    id: string;
    title: string;
    severity: string;
    alertType: string;
    patient?: {
      contact?: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

export function DialyseDashboardPage() {
  const { t: _t } = useLanguage();

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dialyse-dashboard'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<DashboardData>>('/dialyse/dashboard');
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Erreur lors du chargement du tableau de bord</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'checked_in': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  void getSeverityColor; // Used in future alerts rendering

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centre de Dialyse</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de l'activité du centre de dialyse
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/dialyse/patients/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nouveau Patient
          </Link>
          <Link
            to="/dialyse/sessions/new"
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Nouvelle Séance
          </Link>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {dashboard?.criticalAlerts && dashboard.criticalAlerts.length > 0 && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-semibold text-red-800">Alertes Critiques ({dashboard.criticalAlerts.length})</h3>
          </div>
          <div className="space-y-2">
            {dashboard.criticalAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between bg-white rounded p-2 border border-red-100">
                <div>
                  <span className="font-medium">{alert.title}</span>
                  {alert.patient?.contact && (
                    <span className="text-sm text-muted-foreground ml-2">
                      - {alert.patient.contact.firstName} {alert.patient.contact.lastName}
                    </span>
                  )}
                </div>
                <Link
                  to={`/dialyse/alerts/${alert.id}`}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Voir
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Patients */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Patients Actifs</div>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="mt-2 text-2xl font-bold">{dashboard?.patients.activePatients || 0}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span className="text-orange-600 font-medium">{dashboard?.patients.isolationPatients || 0}</span>
            <span className="ml-1">en isolation</span>
          </div>
        </div>

        {/* Today's Sessions */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Séances Aujourd'hui</div>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="mt-2 text-2xl font-bold">{dashboard?.todaySessions?.length || 0}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span className="text-green-600 font-medium">{dashboard?.sessions.inProgressSessions || 0}</span>
            <span className="ml-1">en cours</span>
          </div>
        </div>

        {/* Machines */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Machines Disponibles</div>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div className="mt-2 text-2xl font-bold text-green-600">{dashboard?.machines.availableMachines || 0}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>sur {dashboard?.machines.totalMachines || 0} machines</span>
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Alertes Actives</div>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="mt-2 text-2xl font-bold">{dashboard?.alerts.active || 0}</div>
          <div className="flex items-center gap-2 text-xs mt-1">
            {(dashboard?.alerts.critical || 0) > 0 && (
              <span className="text-red-600 font-medium">{dashboard?.alerts.critical} critiques</span>
            )}
            {(dashboard?.alerts.high || 0) > 0 && (
              <span className="text-orange-600 font-medium">{dashboard?.alerts.high} hautes</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Sessions */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Séances du Jour</h3>
            <Link to="/dialyse/planning" className="text-sm text-primary hover:underline">
              Voir le planning
            </Link>
          </div>
          <div className="p-4">
            {dashboard?.todaySessions && dashboard.todaySessions.length > 0 ? (
              <div className="space-y-3">
                {dashboard.todaySessions.slice(0, 8).map((session) => (
                  <div key={session.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        {session.scheduledStartTime || '--:--'}
                      </span>
                      <span className="font-medium">{session.sessionNumber}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status === 'scheduled' && 'Planifiée'}
                      {session.status === 'checked_in' && 'Arrivé'}
                      {session.status === 'in_progress' && 'En cours'}
                      {session.status === 'completed' && 'Terminée'}
                      {session.status === 'cancelled' && 'Annulée'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucune séance programmée aujourd'hui</p>
              </div>
            )}
          </div>
        </div>

        {/* Machine Status */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">État des Machines</h3>
            <Link to="/dialyse/machines" className="text-sm text-primary hover:underline">
              Gérer les machines
            </Link>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{dashboard?.machines.availableMachines || 0}</div>
                <div className="text-sm text-green-700">Disponibles</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{dashboard?.machines.inUseMachines || 0}</div>
                <div className="text-sm text-blue-700">En Utilisation</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{dashboard?.machines.maintenanceMachines || 0}</div>
                <div className="text-sm text-yellow-700">En Maintenance</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="text-2xl font-bold text-red-600">{dashboard?.machines.outOfServiceMachines || 0}</div>
                <div className="text-sm text-red-700">Hors Service</div>
              </div>
            </div>
            {(dashboard?.machines.isolationMachines || 0) > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700">Machines d'isolation</span>
                  <span className="font-bold text-orange-600">{dashboard?.machines.isolationMachines}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-4">Accès Rapide</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <Link
            to="/dialyse/patients"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Patients</div>
              <div className="text-xs text-muted-foreground">Gérer les patients</div>
            </div>
          </Link>

          <Link
            to="/dialyse/planning"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Planning</div>
              <div className="text-xs text-muted-foreground">Séances et créneaux</div>
            </div>
          </Link>

          <Link
            to="/dialyse/machines"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Machines</div>
              <div className="text-xs text-muted-foreground">Équipements</div>
            </div>
          </Link>

          <Link
            to="/dialyse/alerts"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Alertes</div>
              <div className="text-xs text-muted-foreground">Alertes cliniques</div>
            </div>
          </Link>

          <Link
            to="/dialyse/consumables"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-orange-100">
              <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Consommables</div>
              <div className="text-xs text-muted-foreground">Stocks et inventaire</div>
            </div>
          </Link>

          <Link
            to="/dialyse/reports"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-teal-100">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Rapports</div>
              <div className="text-xs text-muted-foreground">Statistiques</div>
            </div>
          </Link>

          <Link
            to="/dialyse/maintenance"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-yellow-100">
              <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Maintenance</div>
              <div className="text-xs text-muted-foreground">Interventions</div>
            </div>
          </Link>

          <Link
            to="/dialyse/protocols"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-indigo-100">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Protocoles</div>
              <div className="text-xs text-muted-foreground">Modèles traitement</div>
            </div>
          </Link>

          <Link
            to="/dialyse/staff"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-pink-100">
              <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Personnel</div>
              <div className="text-xs text-muted-foreground">Médecins & staff</div>
            </div>
          </Link>

          <Link
            to="/dialyse/billing"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Facturation</div>
              <div className="text-xs text-muted-foreground">Paiements</div>
            </div>
          </Link>

          <Link
            to="/dialyse/transport"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="p-2 rounded-lg bg-cyan-100">
              <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <div className="font-medium">Transport</div>
              <div className="text-xs text-muted-foreground">VSL & ambulances</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
