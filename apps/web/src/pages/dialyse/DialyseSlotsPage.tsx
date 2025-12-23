/**
 * Dialyse Slots Configuration Page
 * Manage dialysis session time slots
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';

interface SessionSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  maxPatients: number;
  active: boolean;
  createdAt: string;
}

interface SlotFormData {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  maxPatients: number;
  active: boolean;
}

const defaultSlotForm: SlotFormData = {
  name: '',
  startTime: '06:00',
  endTime: '10:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5], // Mon-Sat
  maxPatients: 6,
  active: true,
};

const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function DialyseSlotsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SessionSlot | null>(null);
  const [formData, setFormData] = useState<SlotFormData>(defaultSlotForm);

  // Fetch slots
  const { data: slots, isLoading } = useQuery({
    queryKey: ['dialyse-slots'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SessionSlot[]>>('/dialyse/slots');
      return response.data.data;
    },
  });

  // Create slot mutation
  const createSlot = useMutation({
    mutationFn: async (data: SlotFormData) => {
      const response = await api.post<ApiResponse<SessionSlot>>('/dialyse/slots', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-slots'] });
      setShowModal(false);
      resetForm();
      window.alert('Créneau créé avec succès');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Update slot mutation
  const updateSlot = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SlotFormData }) => {
      const response = await api.put<ApiResponse<SessionSlot>>(`/dialyse/slots/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-slots'] });
      setShowModal(false);
      resetForm();
      window.alert('Créneau mis à jour');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Delete slot mutation
  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dialyse/slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-slots'] });
      window.alert('Créneau supprimé');
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  // Toggle slot active status
  const toggleSlotActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await api.patch<ApiResponse<SessionSlot>>(`/dialyse/slots/${id}`, { active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-slots'] });
    },
    onError: (error) => {
      window.alert(`Erreur: ${getErrorMessage(error)}`);
    },
  });

  const resetForm = () => {
    setFormData(defaultSlotForm);
    setEditingSlot(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (slot: SessionSlot) => {
    setEditingSlot(slot);
    setFormData({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      daysOfWeek: slot.daysOfWeek,
      maxPatients: slot.maxPatients,
      active: slot.active,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      window.alert('Veuillez saisir un nom pour le créneau');
      return;
    }
    if (formData.daysOfWeek.length === 0) {
      window.alert('Veuillez sélectionner au moins un jour');
      return;
    }

    if (editingSlot) {
      updateSlot.mutate({ id: editingSlot.id, data: formData });
    } else {
      createSlot.mutate(formData);
    }
  };

  const handleDelete = (slot: SessionSlot) => {
    if (window.confirm(`Supprimer le créneau "${slot.name}" ? Cette action est irréversible.`)) {
      deleteSlot.mutate(slot.id);
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const getDaysDisplay = (days: number[]) => {
    if (days.length === 7) return 'Tous les jours';
    if (days.length === 6 && !days.includes(6)) return 'Lun-Sam';
    if (days.length === 5 && !days.includes(5) && !days.includes(6)) return 'Lun-Ven';
    return days.map(d => dayNames[d]).join(', ');
  };

  // Sort slots by start time
  const sortedSlots = slots?.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration des Créneaux</h1>
          <p className="text-muted-foreground">
            Gérer les créneaux horaires pour les séances de dialyse
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/dialyse/planning')}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Retour au Planning
          </button>
          <button
            onClick={openCreateModal}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nouveau Créneau
          </button>
        </div>
      </div>

      {/* Slots List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement des créneaux...</p>
            </div>
          </div>
        ) : sortedSlots && sortedSlots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Horaire</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Jours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Capacité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedSlots.map((slot) => (
                  <tr key={slot.id} className={`hover:bg-muted/50 ${!slot.active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-medium">{slot.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <span
                            key={day}
                            className={`px-1.5 py-0.5 text-xs rounded ${
                              slot.daysOfWeek.includes(day)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {dayNames[day]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{slot.maxPatients} patients</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleSlotActive.mutate({ id: slot.id, active: !slot.active })}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          slot.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {slot.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(slot)}
                          className="text-sm text-primary hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(slot)}
                          className="text-sm text-destructive hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium">Aucun créneau configuré</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Créez des créneaux pour organiser les séances de dialyse
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Créer un créneau
            </button>
          </div>
        )}
      </div>

      {/* Suggested Slots */}
      {slots && slots.length === 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Créneaux suggérés</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configuration typique d'un centre de dialyse avec 3 créneaux par jour :
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Matin</h4>
              <p className="text-sm text-muted-foreground">06:00 - 10:00</p>
              <p className="text-xs text-muted-foreground">Premier créneau de la journée</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Après-midi</h4>
              <p className="text-sm text-muted-foreground">11:00 - 15:00</p>
              <p className="text-xs text-muted-foreground">Créneau central</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium">Soir</h4>
              <p className="text-sm text-muted-foreground">16:00 - 20:00</p>
              <p className="text-xs text-muted-foreground">Dernier créneau</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingSlot ? 'Modifier le Créneau' : 'Nouveau Créneau'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Nom du créneau *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Matin, Après-midi, Soir..."
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Times */}
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Heure de début *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Heure de fin *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Days of week */}
              <div>
                <label className="block text-sm font-medium mb-2">Jours de la semaine *</label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        formData.daysOfWeek.includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sélectionné: {getDaysDisplay(formData.daysOfWeek)}
                </p>
              </div>

              {/* Max patients */}
              <div>
                <label className="block text-sm font-medium mb-2">Capacité maximale</label>
                <input
                  type="number"
                  value={formData.maxPatients}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPatients: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={50}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nombre maximum de patients par créneau
                </p>
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="slotActive"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="slotActive" className="text-sm">
                  Créneau actif
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createSlot.isPending || updateSlot.isPending}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {(createSlot.isPending || updateSlot.isPending) ? 'Enregistrement...' : editingSlot ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
