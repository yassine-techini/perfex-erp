/**
 * Dialyse Vascular Access Form Page
 * Create/Edit vascular access for dialysis patients
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';

interface Patient {
  id: string;
  medicalId: string;
  contact: {
    firstName: string;
    lastName: string;
  };
}

interface VascularAccessFormData {
  patientId: string;
  type: 'fav' | 'catheter_permanent' | 'catheter_temporary' | 'graft';
  location: string;
  side: 'left' | 'right' | 'bilateral';
  status: 'active' | 'maturing' | 'failed' | 'removed';
  creationDate: string;
  firstUseDate: string;
  surgeon: string;
  hospital: string;
  lastControlDate: string;
  nextControlDate: string;
  flowRate: number | null;
  complications: string;
  notes: string;
}

const defaultFormData: VascularAccessFormData = {
  patientId: '',
  type: 'fav',
  location: '',
  side: 'left',
  status: 'maturing',
  creationDate: new Date().toISOString().split('T')[0],
  firstUseDate: '',
  surgeon: '',
  hospital: '',
  lastControlDate: '',
  nextControlDate: '',
  flowRate: null,
  complications: '',
  notes: '',
};

// Common locations by access type
const locationsByType: Record<string, string[]> = {
  fav: [
    'Avant-bras gauche (radio-céphalique)',
    'Avant-bras droit (radio-céphalique)',
    'Bras gauche (brachio-céphalique)',
    'Bras droit (brachio-céphalique)',
    'Bras gauche (brachio-basilique)',
    'Bras droit (brachio-basilique)',
    'Cuisse gauche',
    'Cuisse droite',
  ],
  catheter_permanent: [
    'Jugulaire interne droite',
    'Jugulaire interne gauche',
    'Sous-clavière droite',
    'Sous-clavière gauche',
    'Fémorale droite',
    'Fémorale gauche',
  ],
  catheter_temporary: [
    'Jugulaire interne droite',
    'Jugulaire interne gauche',
    'Fémorale droite',
    'Fémorale gauche',
  ],
  graft: [
    'Avant-bras gauche',
    'Avant-bras droit',
    'Bras gauche',
    'Bras droit',
    'Cuisse gauche',
    'Cuisse droite',
  ],
};

export function DialyseVascularAccessFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<VascularAccessFormData>({
    ...defaultFormData,
    patientId: patientIdParam || '',
  });

  // Fetch patient if patientId is provided
  const { data: patient } = useQuery({
    queryKey: ['dialyse-patient', patientIdParam],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Patient>>(`/dialyse/patients/${patientIdParam}`);
      return response.data.data;
    },
    enabled: !!patientIdParam,
  });

  // Fetch patients for selection if no patientId
  const { data: patients } = useQuery({
    queryKey: ['dialyse-patients-list'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Patient[]>>('/dialyse/patients?status=active&limit=100');
      return response.data.data;
    },
    enabled: !patientIdParam,
  });

  // Fetch vascular access if editing
  const { data: vascularAccess } = useQuery({
    queryKey: ['dialyse-vascular-access', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<VascularAccessFormData & { id: string }>>(`/dialyse/vascular-accesses/${id}`);
      return response.data.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (vascularAccess) {
      setFormData({
        patientId: vascularAccess.patientId,
        type: vascularAccess.type,
        location: vascularAccess.location || '',
        side: vascularAccess.side || 'left',
        status: vascularAccess.status,
        creationDate: vascularAccess.creationDate ? new Date(vascularAccess.creationDate).toISOString().split('T')[0] : '',
        firstUseDate: vascularAccess.firstUseDate ? new Date(vascularAccess.firstUseDate).toISOString().split('T')[0] : '',
        surgeon: vascularAccess.surgeon || '',
        hospital: vascularAccess.hospital || '',
        lastControlDate: vascularAccess.lastControlDate ? new Date(vascularAccess.lastControlDate).toISOString().split('T')[0] : '',
        nextControlDate: vascularAccess.nextControlDate ? new Date(vascularAccess.nextControlDate).toISOString().split('T')[0] : '',
        flowRate: vascularAccess.flowRate,
        complications: vascularAccess.complications || '',
        notes: vascularAccess.notes || '',
      });
    }
  }, [vascularAccess]);

  // Create/Update mutation
  const saveVascularAccess = useMutation({
    mutationFn: async (data: VascularAccessFormData) => {
      const payload = {
        patientId: data.patientId,
        type: data.type,
        location: data.location || undefined,
        side: data.side,
        status: data.status,
        creationDate: data.creationDate || undefined,
        firstUseDate: data.firstUseDate || undefined,
        surgeon: data.surgeon || undefined,
        hospital: data.hospital || undefined,
        lastControlDate: data.lastControlDate || undefined,
        nextControlDate: data.nextControlDate || undefined,
        flowRate: data.flowRate || undefined,
        complications: data.complications || undefined,
        notes: data.notes || undefined,
      };

      if (isEditing) {
        const response = await api.put<ApiResponse<unknown>>(`/dialyse/vascular-accesses/${id}`, payload);
        return response.data;
      } else {
        const response = await api.post<ApiResponse<unknown>>('/dialyse/vascular-accesses', payload);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-vascular-accesses'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-patient-accesses'] });
      window.alert(isEditing ? 'Accès vasculaire mis à jour' : 'Accès vasculaire créé');
      if (patientIdParam) {
        navigate(`/dialyse/patients/${patientIdParam}`);
      } else {
        navigate('/dialyse/patients');
      }
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) {
      window.alert('Veuillez sélectionner un patient');
      return;
    }
    saveVascularAccess.mutate(formData);
  };

  const handleChange = (field: keyof VascularAccessFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fav: 'Fistule Artério-Veineuse (FAV)',
      catheter_permanent: 'Cathéter Tunnelisé Permanent',
      catheter_temporary: 'Cathéter Temporaire',
      graft: 'Greffon (Pontage)',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Modifier l\'Accès Vasculaire' : 'Nouvel Accès Vasculaire'}
          </h1>
          <p className="text-muted-foreground">
            {patient ? `Patient: ${patient.contact.firstName} ${patient.contact.lastName} (${patient.medicalId})` : 'Enregistrer un accès vasculaire'}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Retour
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        {!patientIdParam && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">Patient</h3>
            <select
              value={formData.patientId}
              onChange={(e) => handleChange('patientId', e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sélectionner un patient</option>
              {patients?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.contact.firstName} {p.contact.lastName} ({p.medicalId})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Access Type */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Type d'accès</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  handleChange('type', e.target.value);
                  handleChange('location', ''); // Reset location when type changes
                }}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="fav">{getTypeLabel('fav')}</option>
                <option value="catheter_permanent">{getTypeLabel('catheter_permanent')}</option>
                <option value="catheter_temporary">{getTypeLabel('catheter_temporary')}</option>
                <option value="graft">{getTypeLabel('graft')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Statut *</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="maturing">En maturation</option>
                <option value="active">Actif / Fonctionnel</option>
                <option value="failed">Échec / Thrombose</option>
                <option value="removed">Retiré / Abandonné</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Localisation</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Site anatomique</label>
              <select
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Sélectionner ou saisir manuellement</option>
                {locationsByType[formData.type]?.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Ou saisir manuellement..."
                className="w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Côté</label>
              <select
                value={formData.side}
                onChange={(e) => handleChange('side', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="left">Gauche</option>
                <option value="right">Droit</option>
                <option value="bilateral">Bilatéral</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Dates</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date de création</label>
              <input
                type="date"
                value={formData.creationDate}
                onChange={(e) => handleChange('creationDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Première utilisation</label>
              <input
                type="date"
                value={formData.firstUseDate}
                onChange={(e) => handleChange('firstUseDate', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dernier contrôle</label>
              <input
                type="date"
                value={formData.lastControlDate}
                onChange={(e) => handleChange('lastControlDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Prochain contrôle</label>
              <input
                type="date"
                value={formData.nextControlDate}
                onChange={(e) => handleChange('nextControlDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Medical Info */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Informations médicales</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Chirurgien</label>
              <input
                type="text"
                value={formData.surgeon}
                onChange={(e) => handleChange('surgeon', e.target.value)}
                placeholder="Dr. ..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Établissement</label>
              <input
                type="text"
                value={formData.hospital}
                onChange={(e) => handleChange('hospital', e.target.value)}
                placeholder="Hôpital / Clinique"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Débit (mL/min)</label>
              <input
                type="number"
                value={formData.flowRate ?? ''}
                onChange={(e) => handleChange('flowRate', e.target.value ? parseInt(e.target.value) : null)}
                min={0}
                max={3000}
                step={50}
                placeholder="Ex: 500"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.type === 'fav' || formData.type === 'graft' ? 'Débit de la fistule' : 'Débit du cathéter'}
              </p>
            </div>
          </div>
        </div>

        {/* Complications */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Complications / Historique</h3>
          <textarea
            value={formData.complications}
            onChange={(e) => handleChange('complications', e.target.value)}
            rows={3}
            placeholder="Thromboses, infections, sténoses, révisions chirurgicales..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Notes */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            placeholder="Observations complémentaires..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saveVascularAccess.isPending}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saveVascularAccess.isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer l\'accès vasculaire'}
          </button>
        </div>
      </form>
    </div>
  );
}
