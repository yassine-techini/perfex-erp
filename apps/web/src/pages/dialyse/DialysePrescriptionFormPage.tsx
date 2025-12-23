/**
 * Dialyse Prescription Form Page
 * Create/Edit dialysis prescriptions
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

interface PrescriptionFormData {
  patientId: string;
  prescribedById: string;
  type: 'hemodialysis' | 'hemodiafiltration' | 'hemofiltration';
  durationMinutes: number;
  frequencyPerWeek: number;
  dialyzerType: string;
  dialyzerSurface: number | null;
  bloodFlowRate: number | null;
  dialysateFlowRate: number | null;
  dialysateCalcium: number | null;
  dialysatePotassium: number | null;
  dialysateBicarbonate: number | null;
  anticoagulationType: 'heparin' | 'lmwh' | 'citrate' | 'none';
  anticoagulationDose: string;
  dryWeight: number | null;
  ufGoal: number | null;
  sodiumProfile: string;
  notes: string;
}

const defaultFormData: PrescriptionFormData = {
  patientId: '',
  prescribedById: '',
  type: 'hemodialysis',
  durationMinutes: 240,
  frequencyPerWeek: 3,
  dialyzerType: '',
  dialyzerSurface: null,
  bloodFlowRate: 300,
  dialysateFlowRate: 500,
  dialysateCalcium: 1.5,
  dialysatePotassium: 2.0,
  dialysateBicarbonate: 35,
  anticoagulationType: 'heparin',
  anticoagulationDose: '',
  dryWeight: null,
  ufGoal: null,
  sodiumProfile: 'constant',
  notes: '',
};

export function DialysePrescriptionFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<PrescriptionFormData>({
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

  // Fetch prescription if editing
  const { data: prescription } = useQuery({
    queryKey: ['dialyse-prescription', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PrescriptionFormData & { id: string }>>(`/dialyse/prescriptions/${id}`);
      return response.data.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (prescription) {
      setFormData({
        patientId: prescription.patientId,
        prescribedById: prescription.prescribedById,
        type: prescription.type,
        durationMinutes: prescription.durationMinutes,
        frequencyPerWeek: prescription.frequencyPerWeek,
        dialyzerType: prescription.dialyzerType || '',
        dialyzerSurface: prescription.dialyzerSurface,
        bloodFlowRate: prescription.bloodFlowRate,
        dialysateFlowRate: prescription.dialysateFlowRate,
        dialysateCalcium: prescription.dialysateCalcium,
        dialysatePotassium: prescription.dialysatePotassium,
        dialysateBicarbonate: prescription.dialysateBicarbonate,
        anticoagulationType: prescription.anticoagulationType,
        anticoagulationDose: prescription.anticoagulationDose || '',
        dryWeight: prescription.dryWeight,
        ufGoal: prescription.ufGoal,
        sodiumProfile: prescription.sodiumProfile || 'constant',
        notes: prescription.notes || '',
      });
    }
  }, [prescription]);

  // Create/Update mutation
  const savePrescription = useMutation({
    mutationFn: async (data: PrescriptionFormData) => {
      const payload = {
        ...data,
        dialyzerSurface: data.dialyzerSurface || undefined,
        bloodFlowRate: data.bloodFlowRate || undefined,
        dialysateFlowRate: data.dialysateFlowRate || undefined,
        dialysateCalcium: data.dialysateCalcium || undefined,
        dialysatePotassium: data.dialysatePotassium || undefined,
        dialysateBicarbonate: data.dialysateBicarbonate || undefined,
        dryWeight: data.dryWeight || undefined,
        ufGoal: data.ufGoal || undefined,
        notes: data.notes || undefined,
      };

      if (isEditing) {
        const response = await api.put<ApiResponse<unknown>>(`/dialyse/prescriptions/${id}`, payload);
        return response.data;
      } else {
        const response = await api.post<ApiResponse<unknown>>('/dialyse/prescriptions', payload);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-patient-prescriptions'] });
      window.alert(isEditing ? 'Prescription mise à jour' : 'Prescription créée');
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
    savePrescription.mutate(formData);
  };

  const handleChange = (field: keyof PrescriptionFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Modifier la Prescription' : 'Nouvelle Prescription de Dialyse'}
          </h1>
          <p className="text-muted-foreground">
            {patient ? `Patient: ${patient.contact.firstName} ${patient.contact.lastName} (${patient.medicalId})` : 'Définir les paramètres de dialyse'}
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

        {/* Basic Parameters */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Paramètres de base</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Type de dialyse *</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="hemodialysis">Hémodialyse</option>
                <option value="hemodiafiltration">Hémodiafiltration</option>
                <option value="hemofiltration">Hémofiltration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Durée (minutes) *</label>
              <input
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => handleChange('durationMinutes', parseInt(e.target.value))}
                required
                min={60}
                max={480}
                step={15}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fréquence (par semaine) *</label>
              <select
                value={formData.frequencyPerWeek}
                onChange={(e) => handleChange('frequencyPerWeek', parseInt(e.target.value))}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={2}>2x par semaine</option>
                <option value={3}>3x par semaine</option>
                <option value={4}>4x par semaine</option>
                <option value={5}>5x par semaine</option>
                <option value={6}>6x par semaine</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dialyzer Parameters */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Dialyseur</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Type de dialyseur</label>
              <input
                type="text"
                value={formData.dialyzerType}
                onChange={(e) => handleChange('dialyzerType', e.target.value)}
                placeholder="Ex: FX800, Polyflux 210H"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Surface (m²)</label>
              <input
                type="number"
                value={formData.dialyzerSurface || ''}
                onChange={(e) => handleChange('dialyzerSurface', e.target.value ? parseFloat(e.target.value) : null)}
                step={0.1}
                min={0.5}
                max={3}
                placeholder="1.8"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Débit sanguin (mL/min)</label>
              <input
                type="number"
                value={formData.bloodFlowRate || ''}
                onChange={(e) => handleChange('bloodFlowRate', e.target.value ? parseInt(e.target.value) : null)}
                min={100}
                max={500}
                step={10}
                placeholder="300"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Dialysate Parameters */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Dialysat</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-2">Débit (mL/min)</label>
              <input
                type="number"
                value={formData.dialysateFlowRate || ''}
                onChange={(e) => handleChange('dialysateFlowRate', e.target.value ? parseInt(e.target.value) : null)}
                min={300}
                max={800}
                step={50}
                placeholder="500"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Calcium (mmol/L)</label>
              <input
                type="number"
                value={formData.dialysateCalcium || ''}
                onChange={(e) => handleChange('dialysateCalcium', e.target.value ? parseFloat(e.target.value) : null)}
                step={0.25}
                min={1}
                max={2}
                placeholder="1.5"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Potassium (mmol/L)</label>
              <input
                type="number"
                value={formData.dialysatePotassium || ''}
                onChange={(e) => handleChange('dialysatePotassium', e.target.value ? parseFloat(e.target.value) : null)}
                step={0.5}
                min={0}
                max={4}
                placeholder="2.0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bicarbonate (mmol/L)</label>
              <input
                type="number"
                value={formData.dialysateBicarbonate || ''}
                onChange={(e) => handleChange('dialysateBicarbonate', e.target.value ? parseInt(e.target.value) : null)}
                min={25}
                max={40}
                placeholder="35"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Anticoagulation */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Anticoagulation</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={formData.anticoagulationType}
                onChange={(e) => handleChange('anticoagulationType', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="heparin">Héparine non fractionnée</option>
                <option value="lmwh">HBPM (Héparine bas poids moléculaire)</option>
                <option value="citrate">Citrate</option>
                <option value="none">Sans anticoagulation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Posologie</label>
              <input
                type="text"
                value={formData.anticoagulationDose}
                onChange={(e) => handleChange('anticoagulationDose', e.target.value)}
                placeholder="Ex: 50 UI/kg bolus puis 1000 UI/h"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Ultrafiltration */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Ultrafiltration</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Poids sec (kg)</label>
              <input
                type="number"
                value={formData.dryWeight || ''}
                onChange={(e) => handleChange('dryWeight', e.target.value ? parseFloat(e.target.value) : null)}
                step={0.1}
                min={30}
                max={200}
                placeholder="70.0"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Objectif UF (mL)</label>
              <input
                type="number"
                value={formData.ufGoal || ''}
                onChange={(e) => handleChange('ufGoal', e.target.value ? parseInt(e.target.value) : null)}
                min={0}
                max={5000}
                step={100}
                placeholder="2000"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Profil sodium</label>
              <select
                value={formData.sodiumProfile}
                onChange={(e) => handleChange('sodiumProfile', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="constant">Constant</option>
                <option value="linear_decreasing">Linéaire décroissant</option>
                <option value="step">Par paliers</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            placeholder="Instructions particulières, précautions..."
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
            disabled={savePrescription.isPending}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {savePrescription.isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer la prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}
