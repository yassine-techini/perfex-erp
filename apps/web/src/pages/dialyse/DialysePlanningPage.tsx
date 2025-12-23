/**
 * Dialyse Planning Page
 * Interactive calendar for dialysis session scheduling
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface DialysisSession {
  id: string;
  sessionNumber: string;
  patientId: string;
  prescriptionId: string;
  machineId: string | null;
  slotId: string | null;
  sessionDate: Date;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduledStartTime: string | null;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  notes: string | null;
}

interface SessionSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  maxPatients: number;
  active: boolean;
}

export function DialysePlanningPage() {
  const { t: _t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Get week start and end dates
  const weekDates = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedDate]);

  // Fetch session slots
  const { data: slots } = useQuery({
    queryKey: ['dialyse-slots'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SessionSlot[]>>('/dialyse/slots');
      return response.data.data;
    },
  });

  // Fetch sessions for the selected period
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['dialyse-sessions', selectedDate.toISOString(), viewMode],
    queryFn: async () => {
      const dateFrom = viewMode === 'week'
        ? weekDates[0].toISOString()
        : selectedDate.toISOString();
      const dateTo = viewMode === 'week'
        ? weekDates[6].toISOString()
        : new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const response = await api.get<ApiResponse<DialysisSession[]>>(
        `/dialyse/sessions?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      return response.data.data;
    },
  });

  // Session workflow mutations
  const checkInMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.post(`/dialyse/sessions/${sessionId}/check-in`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-sessions'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: async ({ sessionId, machineId }: { sessionId: string; machineId?: string }) => {
      await api.post(`/dialyse/sessions/${sessionId}/start${machineId ? `?machineId=${machineId}` : ''}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-sessions'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.post(`/dialyse/sessions/${sessionId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialyse-sessions'] });
    },
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checked_in': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Planifiée',
      checked_in: 'Arrivé',
      in_progress: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
      no_show: 'Absent',
    };
    return labels[status] || status;
  };

  const getSessionsForSlot = (slotId: string, date: Date) => {
    if (!sessions) return [];
    return sessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return s.slotId === slotId &&
        sessionDate.toDateString() === date.toDateString();
    });
  };

  const getSessionsForDate = (date: Date) => {
    if (!sessions) return [];
    return sessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return sessionDate.toDateString() === date.toDateString();
    });
  };
  void getSessionsForDate; // Used for week view rendering

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planning des Séances</h1>
          <p className="text-muted-foreground">
            Planification et suivi des séances de dialyse
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/dialyse/sessions/new')}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nouvelle Séance
          </button>
          <button
            onClick={() => navigate('/dialyse/slots')}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Configurer Créneaux
          </button>
        </div>
      </div>

      {/* Navigation and View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-md border hover:bg-accent"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 rounded-md border text-sm font-medium hover:bg-accent"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-md border hover:bg-accent"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <h2 className="text-xl font-semibold">
            {viewMode === 'day' ? formatDate(selectedDate) : `Semaine du ${formatShortDate(weekDates[0])}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === 'day' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
          >
            Jour
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
          >
            Semaine
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Chargement du planning...</p>
            </div>
          </div>
        ) : viewMode === 'day' ? (
          /* Day View */
          <div>
            {/* Slots */}
            {slots && slots.length > 0 ? (
              <div className="divide-y">
                {slots.map((slot) => {
                  const slotSessions = getSessionsForSlot(slot.id, selectedDate);
                  const dayOfWeek = selectedDate.getDay();
                  const isActiveDay = slot.daysOfWeek.includes(dayOfWeek === 0 ? 6 : dayOfWeek - 1);

                  if (!isActiveDay) return null;

                  return (
                    <div key={slot.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{slot.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {slot.startTime} - {slot.endTime} | Capacité: {slot.maxPatients} patients
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {slotSessions.length}/{slot.maxPatients} occupé(s)
                        </span>
                      </div>

                      {slotSessions.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {slotSessions.map((session) => (
                            <div
                              key={session.id}
                              className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(session.status)}`}
                              onClick={() => navigate(`/dialyse/sessions/${session.id}`)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-sm">{session.sessionNumber}</span>
                                <span className="text-xs font-medium">{getStatusLabel(session.status)}</span>
                              </div>
                              <div className="mt-2 flex gap-2">
                                {session.status === 'scheduled' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); checkInMutation.mutate(session.id); }}
                                    className="text-xs px-2 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700"
                                  >
                                    Check-in
                                  </button>
                                )}
                                {session.status === 'checked_in' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startMutation.mutate({ sessionId: session.id }); }}
                                    className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                                  >
                                    Démarrer
                                  </button>
                                )}
                                {session.status === 'in_progress' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); completeMutation.mutate(session.id); }}
                                    className="text-xs px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
                                  >
                                    Terminer
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Aucune séance programmée pour ce créneau
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Aucun créneau configuré</p>
                <button className="mt-2 text-primary hover:underline text-sm">
                  Configurer les créneaux
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Week View */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase w-24">
                    Créneau
                  </th>
                  {weekDates.map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <th
                        key={i}
                        className={`p-3 text-center text-xs font-medium uppercase ${isToday ? 'bg-primary/10' : ''}`}
                      >
                        <div className={isToday ? 'text-primary' : 'text-muted-foreground'}>
                          {formatShortDate(date)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y">
                {slots?.map((slot) => (
                  <tr key={slot.id} className="divide-x">
                    <td className="p-3 bg-muted/30">
                      <div className="font-medium text-sm">{slot.name}</div>
                      <div className="text-xs text-muted-foreground">{slot.startTime}</div>
                    </td>
                    {weekDates.map((date, i) => {
                      const dayOfWeek = date.getDay();
                      const isActiveDay = slot.daysOfWeek.includes(dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                      const daySessions = getSessionsForSlot(slot.id, date);
                      const isToday = date.toDateString() === new Date().toDateString();

                      return (
                        <td
                          key={i}
                          className={`p-2 align-top min-h-[100px] ${isToday ? 'bg-primary/5' : ''} ${!isActiveDay ? 'bg-muted/20' : ''}`}
                        >
                          {isActiveDay && (
                            <div className="space-y-1">
                              {daySessions.map((session) => (
                                <div
                                  key={session.id}
                                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${getStatusColor(session.status)}`}
                                  onClick={() => navigate(`/dialyse/sessions/${session.id}`)}
                                >
                                  {session.scheduledStartTime || '--:--'}
                                </div>
                              ))}
                              {daySessions.length === 0 && (
                                <div className="text-xs text-muted-foreground text-center py-2">-</div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">Légende:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300"></div>
          <span>Planifiée</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300"></div>
          <span>Arrivé</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-200 border border-green-300"></div>
          <span>En cours</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300"></div>
          <span>Terminée</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-300"></div>
          <span>Annulée</span>
        </div>
      </div>
    </div>
  );
}
