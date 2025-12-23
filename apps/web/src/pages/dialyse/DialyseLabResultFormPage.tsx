/**
 * Dialyse Lab Result Form Page
 * Create/Edit laboratory results for dialysis patients
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

interface LabResultFormData {
  patientId: string;
  labDate: string;
  // Kidney function
  urea: number | null;
  creatinine: number | null;
  ktV: number | null;
  urr: number | null;
  // Electrolytes
  sodium: number | null;
  potassium: number | null;
  calcium: number | null;
  phosphorus: number | null;
  magnesium: number | null;
  bicarbonate: number | null;
  // Hematology
  hemoglobin: number | null;
  hematocrit: number | null;
  wbc: number | null;
  platelets: number | null;
  ferritin: number | null;
  tsat: number | null;
  // Metabolic
  albumin: number | null;
  pth: number | null;
  vitaminD: number | null;
  glucose: number | null;
  hba1c: number | null;
  // Lipids
  cholesterol: number | null;
  triglycerides: number | null;
  hdl: number | null;
  ldl: number | null;
  // Liver
  alt: number | null;
  ast: number | null;
  alp: number | null;
  bilirubin: number | null;
  // Inflammatory
  crp: number | null;
  // Notes
  notes: string;
}

const defaultFormData: LabResultFormData = {
  patientId: '',
  labDate: new Date().toISOString().split('T')[0],
  urea: null,
  creatinine: null,
  ktV: null,
  urr: null,
  sodium: null,
  potassium: null,
  calcium: null,
  phosphorus: null,
  magnesium: null,
  bicarbonate: null,
  hemoglobin: null,
  hematocrit: null,
  wbc: null,
  platelets: null,
  ferritin: null,
  tsat: null,
  albumin: null,
  pth: null,
  vitaminD: null,
  glucose: null,
  hba1c: null,
  cholesterol: null,
  triglycerides: null,
  hdl: null,
  ldl: null,
  alt: null,
  ast: null,
  alp: null,
  bilirubin: null,
  crp: null,
  notes: '',
};

// Normal ranges for reference
const normalRanges: Record<string, { min: number; max: number; unit: string }> = {
  urea: { min: 2.5, max: 7.1, unit: 'mmol/L' },
  creatinine: { min: 60, max: 110, unit: 'µmol/L' },
  ktV: { min: 1.2, max: 2.0, unit: '' },
  urr: { min: 65, max: 100, unit: '%' },
  sodium: { min: 136, max: 145, unit: 'mmol/L' },
  potassium: { min: 3.5, max: 5.0, unit: 'mmol/L' },
  calcium: { min: 2.1, max: 2.6, unit: 'mmol/L' },
  phosphorus: { min: 0.8, max: 1.5, unit: 'mmol/L' },
  magnesium: { min: 0.7, max: 1.0, unit: 'mmol/L' },
  bicarbonate: { min: 22, max: 29, unit: 'mmol/L' },
  hemoglobin: { min: 100, max: 120, unit: 'g/L' },
  hematocrit: { min: 30, max: 36, unit: '%' },
  wbc: { min: 4, max: 11, unit: 'G/L' },
  platelets: { min: 150, max: 400, unit: 'G/L' },
  ferritin: { min: 200, max: 500, unit: 'µg/L' },
  tsat: { min: 20, max: 50, unit: '%' },
  albumin: { min: 35, max: 50, unit: 'g/L' },
  pth: { min: 150, max: 300, unit: 'pg/mL' },
  vitaminD: { min: 75, max: 150, unit: 'nmol/L' },
  glucose: { min: 4, max: 7, unit: 'mmol/L' },
  hba1c: { min: 4, max: 6, unit: '%' },
  cholesterol: { min: 0, max: 5.2, unit: 'mmol/L' },
  triglycerides: { min: 0, max: 1.7, unit: 'mmol/L' },
  hdl: { min: 1.0, max: 3.0, unit: 'mmol/L' },
  ldl: { min: 0, max: 3.4, unit: 'mmol/L' },
  alt: { min: 0, max: 40, unit: 'U/L' },
  ast: { min: 0, max: 40, unit: 'U/L' },
  alp: { min: 40, max: 130, unit: 'U/L' },
  bilirubin: { min: 0, max: 21, unit: 'µmol/L' },
  crp: { min: 0, max: 5, unit: 'mg/L' },
};

export function DialyseLabResultFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<LabResultFormData>({
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

  // Fetch lab result if editing
  const { data: labResult } = useQuery({
    queryKey: ['dialyse-lab-result', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<LabResultFormData & { id: string }>>(`/dialyse/lab-results/${id}`);
      return response.data.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (labResult) {
      setFormData({
        patientId: labResult.patientId,
        labDate: new Date(labResult.labDate).toISOString().split('T')[0],
        urea: labResult.urea,
        creatinine: labResult.creatinine,
        ktV: labResult.ktV,
        urr: labResult.urr,
        sodium: labResult.sodium,
        potassium: labResult.potassium,
        calcium: labResult.calcium,
        phosphorus: labResult.phosphorus,
        magnesium: labResult.magnesium,
        bicarbonate: labResult.bicarbonate,
        hemoglobin: labResult.hemoglobin,
        hematocrit: labResult.hematocrit,
        wbc: labResult.wbc,
        platelets: labResult.platelets,
        ferritin: labResult.ferritin,
        tsat: labResult.tsat,
        albumin: labResult.albumin,
        pth: labResult.pth,
        vitaminD: labResult.vitaminD,
        glucose: labResult.glucose,
        hba1c: labResult.hba1c,
        cholesterol: labResult.cholesterol,
        triglycerides: labResult.triglycerides,
        hdl: labResult.hdl,
        ldl: labResult.ldl,
        alt: labResult.alt,
        ast: labResult.ast,
        alp: labResult.alp,
        bilirubin: labResult.bilirubin,
        crp: labResult.crp,
        notes: labResult.notes || '',
      });
    }
  }, [labResult]);

  // Create/Update mutation
  const saveLabResult = useMutation({
    mutationFn: async (data: LabResultFormData) => {
      // Build payload with only non-null values
      const payload: Record<string, unknown> = {
        patientId: data.patientId,
        labDate: data.labDate,
      };

      // Add all numeric fields that have values
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== '' && key !== 'patientId' && key !== 'labDate' && key !== 'notes') {
          payload[key] = value;
        }
      });

      if (data.notes) {
        payload.notes = data.notes;
      }

      if (isEditing) {
        const response = await api.put<ApiResponse<unknown>>(`/dialyse/lab-results/${id}`, payload);
        return response.data;
      } else {
        const response = await api.post<ApiResponse<unknown>>('/dialyse/lab-results', payload);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-lab-results'] });
      queryClient.invalidateQueries({ queryKey: ['dialyse-patient-labs'] });
      window.alert(isEditing ? 'Résultat mis à jour' : 'Résultat enregistré');
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
    saveLabResult.mutate(formData);
  };

  const handleChange = (field: keyof LabResultFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isOutOfRange = (field: string, value: number | null): boolean => {
    if (value === null) return false;
    const range = normalRanges[field];
    if (!range) return false;
    return value < range.min || value > range.max;
  };

  const renderLabField = (
    field: keyof LabResultFormData,
    label: string,
    step: number = 0.1
  ) => {
    const value = formData[field] as number | null;
    const range = normalRanges[field];
    const outOfRange = isOutOfRange(field, value);

    return (
      <div>
        <label className="block text-sm font-medium mb-1">
          {label}
          {range && <span className="text-xs text-muted-foreground ml-1">({range.unit})</span>}
        </label>
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => handleChange(field, e.target.value ? parseFloat(e.target.value) : null)}
          step={step}
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            outOfRange ? 'border-red-500 bg-red-50' : 'border-input bg-background'
          }`}
        />
        {range && (
          <p className={`text-xs mt-1 ${outOfRange ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
            Norme: {range.min} - {range.max}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Modifier le Bilan' : 'Nouveau Bilan de Laboratoire'}
          </h1>
          <p className="text-muted-foreground">
            {patient ? `Patient: ${patient.contact.firstName} ${patient.contact.lastName} (${patient.medicalId})` : 'Enregistrer les résultats de laboratoire'}
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
        {/* Patient & Date */}
        <div className="rounded-lg border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {!patientIdParam && (
              <div>
                <label className="block text-sm font-medium mb-2">Patient *</label>
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

            <div>
              <label className="block text-sm font-medium mb-2">Date du bilan *</label>
              <input
                type="date"
                value={formData.labDate}
                onChange={(e) => handleChange('labDate', e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Kidney Function */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Fonction rénale et dialyse</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {renderLabField('urea', 'Urée', 0.1)}
            {renderLabField('creatinine', 'Créatinine', 1)}
            {renderLabField('ktV', 'Kt/V', 0.01)}
            {renderLabField('urr', 'URR', 1)}
          </div>
        </div>

        {/* Electrolytes */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Électrolytes</h3>
          <div className="grid gap-4 md:grid-cols-6">
            {renderLabField('sodium', 'Sodium', 1)}
            {renderLabField('potassium', 'Potassium', 0.1)}
            {renderLabField('calcium', 'Calcium', 0.01)}
            {renderLabField('phosphorus', 'Phosphore', 0.01)}
            {renderLabField('magnesium', 'Magnésium', 0.01)}
            {renderLabField('bicarbonate', 'Bicarbonate', 1)}
          </div>
        </div>

        {/* Hematology */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Hématologie</h3>
          <div className="grid gap-4 md:grid-cols-6">
            {renderLabField('hemoglobin', 'Hémoglobine', 1)}
            {renderLabField('hematocrit', 'Hématocrite', 0.1)}
            {renderLabField('wbc', 'Leucocytes', 0.1)}
            {renderLabField('platelets', 'Plaquettes', 1)}
            {renderLabField('ferritin', 'Ferritine', 1)}
            {renderLabField('tsat', 'TSAT', 1)}
          </div>
        </div>

        {/* Metabolic */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Métabolisme phosphocalcique et nutrition</h3>
          <div className="grid gap-4 md:grid-cols-5">
            {renderLabField('albumin', 'Albumine', 0.1)}
            {renderLabField('pth', 'PTH', 1)}
            {renderLabField('vitaminD', 'Vitamine D', 1)}
            {renderLabField('glucose', 'Glucose', 0.1)}
            {renderLabField('hba1c', 'HbA1c', 0.1)}
          </div>
        </div>

        {/* Lipids */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Bilan lipidique</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {renderLabField('cholesterol', 'Cholestérol total', 0.1)}
            {renderLabField('triglycerides', 'Triglycérides', 0.1)}
            {renderLabField('hdl', 'HDL', 0.1)}
            {renderLabField('ldl', 'LDL', 0.1)}
          </div>
        </div>

        {/* Liver & Inflammatory */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Fonction hépatique et inflammation</h3>
          <div className="grid gap-4 md:grid-cols-5">
            {renderLabField('alt', 'ALT (SGPT)', 1)}
            {renderLabField('ast', 'AST (SGOT)', 1)}
            {renderLabField('alp', 'PAL', 1)}
            {renderLabField('bilirubin', 'Bilirubine', 1)}
            {renderLabField('crp', 'CRP', 0.1)}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Notes et commentaires</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            placeholder="Observations, valeurs additionnelles, contexte clinique..."
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
            disabled={saveLabResult.isPending}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saveLabResult.isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Enregistrer le bilan'}
          </button>
        </div>
      </form>
    </div>
  );
}
