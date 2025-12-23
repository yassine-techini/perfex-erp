/**
 * Dialyse Patient Detail Page
 * View and manage a single dialysis patient
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';

interface DialysePatient {
  id: string;
  medicalId: string;
  patientStatus: 'active' | 'transferred' | 'deceased' | 'transplanted' | 'recovered';
  bloodType: string | null;
  dryWeight: number | null;
  renalFailureEtiology: string | null;
  hivStatus: 'negative' | 'positive' | 'unknown';
  hbvStatus: 'negative' | 'positive' | 'unknown';
  hcvStatus: 'negative' | 'positive' | 'unknown';
  serologyLastUpdate: Date | null;
  requiresIsolation: boolean;
  hepatitisBVaccinated: boolean;
  dialysisStartDate: Date | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  notes: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: Date | null;
    address: string | null;
  };
}

interface VascularAccess {
  id: string;
  type: string;
  location: string;
  status: string;
  creationDate: Date | null;
  lastControlDate: Date | null;
  nextControlDate: Date | null;
}

interface Prescription {
  id: string;
  prescriptionNumber: string;
  type: string;
  status: string;
  durationMinutes: number;
  frequencyPerWeek: number;
  startDate: Date;
  endDate: Date | null;
}

interface DialysisSession {
  id: string;
  sessionNumber: string;
  sessionDate: Date;
  status: string;
  actualDurationMinutes: number | null;
}

interface LabResult {
  id: string;
  labDate: Date;
  ktV: number | null;
  hemoglobin: number | null;
  hasOutOfRangeValues: boolean;
}

export function DialysePatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'labs' | 'prescriptions' | 'accesses'>('overview');

  // Fetch patient details
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['dialyse-patient', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<DialysePatient>>(`/dialyse/patients/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch vascular accesses
  const { data: accesses } = useQuery({
    queryKey: ['dialyse-patient-accesses', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<VascularAccess[]>>(`/dialyse/patients/${id}/vascular-accesses`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch prescriptions
  const { data: prescriptions } = useQuery({
    queryKey: ['dialyse-patient-prescriptions', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Prescription[]>>(`/dialyse/patients/${id}/prescriptions`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch recent sessions
  const { data: sessions } = useQuery({
    queryKey: ['dialyse-patient-sessions', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<DialysisSession[]>>(`/dialyse/sessions?patientId=${id}&limit=10`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Fetch recent labs
  const { data: labs } = useQuery({
    queryKey: ['dialyse-patient-labs', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<LabResult[]>>(`/dialyse/patients/${id}/lab-results?limit=5`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/dialyse/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-patients'] });
      navigate('/dialyse/patients');
    },
    onError: (error) => {
      alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const handleDelete = () => {
    if (patient && confirm(`Êtes-vous sûr de vouloir supprimer "${patient.contact.firstName} ${patient.contact.lastName}" ? Cette action est irréversible.`)) {
      deleteMutation.mutate();
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      transferred: 'bg-blue-100 text-blue-800',
      deceased: 'bg-gray-100 text-gray-800',
      transplanted: 'bg-purple-100 text-purple-800',
      recovered: 'bg-teal-100 text-teal-800',
    };
    const labels: Record<string, string> = {
      active: 'Actif',
      transferred: 'Transféré',
      deceased: 'Décédé',
      transplanted: 'Transplanté',
      recovered: 'Guéri',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSerologyBadge = (status: string) => {
    if (status === 'positive') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Positif</span>;
    if (status === 'negative') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Négatif</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inconnu</span>;
  };

  const getAccessTypeName = (type: string) => {
    const names: Record<string, string> = {
      fav: 'FAV',
      catheter_permanent: 'Cathéter permanent',
      catheter_temporary: 'Cathéter temporaire',
      graft: 'Greffon',
    };
    return names[type] || type;
  };

  const getSessionStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      checked_in: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      scheduled: 'Planifiée',
      checked_in: 'Arrivé',
      in_progress: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
      no_show: 'Absent',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Chargement du patient...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Patient non trouvé</p>
        <Link to="/dialyse/patients" className="text-primary mt-4 inline-block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dialyse/patients"
            className="p-2 rounded-md hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {patient.contact.firstName} {patient.contact.lastName}
              </h1>
              {getStatusBadge(patient.patientStatus)}
              {patient.requiresIsolation && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Isolation requise
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              ID Médical: {patient.medicalId} | {patient.contact.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/dialyse/patients/${id}/edit`)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Modifier
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {[
            { key: 'overview', label: 'Vue générale' },
            { key: 'sessions', label: 'Séances' },
            { key: 'labs', label: 'Laboratoire' },
            { key: 'prescriptions', label: 'Prescriptions' },
            { key: 'accesses', label: 'Accès vasculaires' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Patient Info */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Informations Patient</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Groupe sanguin</dt>
                <dd className="font-medium">{patient.bloodType || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Poids sec</dt>
                <dd className="font-medium">{patient.dryWeight ? `${patient.dryWeight} kg` : '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Début dialyse</dt>
                <dd className="font-medium">{formatDate(patient.dialysisStartDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Étiologie</dt>
                <dd className="font-medium">{patient.renalFailureEtiology || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Téléphone</dt>
                <dd className="font-medium">{patient.contact.phone || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* Serology */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Sérologie</h3>
            <dl className="space-y-3">
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">VIH</dt>
                <dd>{getSerologyBadge(patient.hivStatus)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">VHB</dt>
                <dd>{getSerologyBadge(patient.hbvStatus)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">VHC</dt>
                <dd>{getSerologyBadge(patient.hcvStatus)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dernière mise à jour</dt>
                <dd className="font-medium">{formatDate(patient.serologyLastUpdate)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Vacciné Hépatite B</dt>
                <dd>
                  {patient.hepatitisBVaccinated ? (
                    <span className="text-green-600">Oui</span>
                  ) : (
                    <span className="text-red-600">Non</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Emergency Contact */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Contact d'urgence</h3>
            {patient.emergencyContactName ? (
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Nom</dt>
                  <dd className="font-medium">{patient.emergencyContactName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Téléphone</dt>
                  <dd className="font-medium">{patient.emergencyContactPhone || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Relation</dt>
                  <dd className="font-medium">{patient.emergencyContactRelation || '-'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">Aucun contact d'urgence renseigné</p>
            )}
          </div>

          {/* Active Access */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Accès vasculaire actif</h3>
            {accesses && accesses.filter(a => a.status === 'active').length > 0 ? (
              <dl className="space-y-3">
                {accesses.filter(a => a.status === 'active').map((access) => (
                  <div key={access.id}>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="font-medium">{getAccessTypeName(access.type)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Localisation</dt>
                      <dd className="font-medium">{access.location}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Prochain contrôle</dt>
                      <dd className="font-medium">{formatDate(access.nextControlDate)}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground">Aucun accès vasculaire actif</p>
            )}
          </div>

          {/* Notes */}
          {patient.notes && (
            <div className="rounded-lg border bg-card p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{patient.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Séances récentes</h3>
            <button
              onClick={() => navigate(`/dialyse/sessions/new?patientId=${id}`)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nouvelle séance
            </button>
          </div>
          {sessions && sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">N° Séance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Durée</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm font-mono">{session.sessionNumber}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(session.sessionDate)}</td>
                      <td className="px-6 py-4 text-sm">
                        {session.actualDurationMinutes ? `${session.actualDurationMinutes} min` : '-'}
                      </td>
                      <td className="px-6 py-4">{getSessionStatusBadge(session.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Aucune séance enregistrée
            </div>
          )}
        </div>
      )}

      {activeTab === 'labs' && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Résultats de laboratoire</h3>
            <button
              onClick={() => navigate(`/dialyse/lab-results/new?patientId=${id}`)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nouveau résultat
            </button>
          </div>
          {labs && labs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Kt/V</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Hémoglobine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Alertes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {labs.map((lab) => (
                    <tr key={lab.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm">{formatDate(lab.labDate)}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {lab.ktV ? lab.ktV.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {lab.hemoglobin ? `${lab.hemoglobin} g/dL` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {lab.hasOutOfRangeValues ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Valeurs hors normes
                          </span>
                        ) : (
                          <span className="text-green-600 text-sm">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Aucun résultat de laboratoire
            </div>
          )}
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Prescriptions</h3>
            <button
              onClick={() => navigate(`/dialyse/prescriptions/new?patientId=${id}`)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nouvelle prescription
            </button>
          </div>
          {prescriptions && prescriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">N°</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Durée</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fréquence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date début</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {prescriptions.map((rx) => (
                    <tr key={rx.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm font-mono">{rx.prescriptionNumber}</td>
                      <td className="px-6 py-4 text-sm capitalize">{rx.type.replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-sm">{rx.durationMinutes} min</td>
                      <td className="px-6 py-4 text-sm">{rx.frequencyPerWeek}x/semaine</td>
                      <td className="px-6 py-4 text-sm">{formatDate(rx.startDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rx.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rx.status === 'active' ? 'Active' : rx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Aucune prescription
            </div>
          )}
        </div>
      )}

      {activeTab === 'accesses' && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Historique des accès vasculaires</h3>
            <button
              onClick={() => navigate(`/dialyse/vascular-accesses/new?patientId=${id}`)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nouvel accès
            </button>
          </div>
          {accesses && accesses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Localisation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date création</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Dernier contrôle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accesses.map((access) => (
                    <tr key={access.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm font-medium">{getAccessTypeName(access.type)}</td>
                      <td className="px-6 py-4 text-sm">{access.location}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(access.creationDate)}</td>
                      <td className="px-6 py-4 text-sm">{formatDate(access.lastControlDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          access.status === 'active' ? 'bg-green-100 text-green-800' :
                          access.status === 'maturing' ? 'bg-blue-100 text-blue-800' :
                          access.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {access.status === 'active' ? 'Actif' :
                           access.status === 'maturing' ? 'Maturation' :
                           access.status === 'failed' ? 'Échec' :
                           access.status === 'removed' ? 'Retiré' : access.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Aucun accès vasculaire enregistré
            </div>
          )}
        </div>
      )}
    </div>
  );
}
