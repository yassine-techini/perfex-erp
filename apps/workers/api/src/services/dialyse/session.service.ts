/**
 * Dialyse Session Service
 * Manage dialysis sessions, scheduling, and monitoring
 */

import { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm';
import { drizzleDb } from '../../db';
import {
  dialysisSessions,
  dialysisSessionSlots,
  sessionRecords,
  sessionIncidents,
  sessionMedications,
  sessionConsumables,
  sessionSignatures,
  dialysePatients,
  dialysePrescriptions,
  dialysisMachines,
  contacts,
} from '@perfex/database';
import type {
  DialysisSession,
  DialysisSessionWithDetails,
  DialysisSessionSlot,
  SessionRecord,
  SessionIncident,
  SessionMedication,
  SessionConsumable,
  SessionSignature,
  CreateSessionInput,
  UpdateSessionInput,
  CreateSessionSlotInput,
  UpdateSessionSlotInput,
  CreateSessionRecordInput,
  CreateSessionIncidentInput,
  CreateSessionMedicationInput,
  CreateSessionConsumableInput,
} from '@perfex/shared';
import { machineService } from './machine.service';

export class SessionService {
  // ============================================================================
  // SESSION SLOTS
  // ============================================================================

  /**
   * Create a session slot
   */
  async createSlot(organizationId: string, data: CreateSessionSlotInput): Promise<DialysisSessionSlot> {
    const now = new Date();
    const slotId = crypto.randomUUID();

    await drizzleDb.insert(dialysisSessionSlots).values({
      id: slotId,
      organizationId,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      daysOfWeek: JSON.stringify(data.daysOfWeek),
      maxPatients: data.maxPatients,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const slot = await this.getSlotById(organizationId, slotId);
    if (!slot) {
      throw new Error('Failed to create session slot');
    }

    return slot;
  }

  /**
   * Get session slot by ID
   */
  async getSlotById(organizationId: string, slotId: string): Promise<DialysisSessionSlot | null> {
    const slot = await drizzleDb
      .select()
      .from(dialysisSessionSlots)
      .where(and(eq(dialysisSessionSlots.id, slotId), eq(dialysisSessionSlots.organizationId, organizationId)))
      .get() as any;

    if (!slot) return null;

    return {
      ...slot,
      daysOfWeek: JSON.parse(slot.daysOfWeek),
    } as DialysisSessionSlot;
  }

  /**
   * List all session slots
   */
  async listSlots(organizationId: string, activeOnly: boolean = true): Promise<DialysisSessionSlot[]> {
    const conditions = [eq(dialysisSessionSlots.organizationId, organizationId)];
    if (activeOnly) {
      conditions.push(eq(dialysisSessionSlots.active, true));
    }

    const slots = await drizzleDb
      .select()
      .from(dialysisSessionSlots)
      .where(and(...conditions))
      .orderBy(dialysisSessionSlots.startTime)
      .all() as any[];

    return slots.map((slot) => ({
      ...slot,
      daysOfWeek: JSON.parse(slot.daysOfWeek),
    })) as DialysisSessionSlot[];
  }

  /**
   * Update session slot
   */
  async updateSlot(organizationId: string, slotId: string, data: UpdateSessionSlotInput): Promise<DialysisSessionSlot> {
    const existing = await this.getSlotById(organizationId, slotId);
    if (!existing) {
      throw new Error('Session slot not found');
    }

    const now = new Date();
    const updateData: any = { updatedAt: now };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.daysOfWeek !== undefined) updateData.daysOfWeek = JSON.stringify(data.daysOfWeek);
    if (data.maxPatients !== undefined) updateData.maxPatients = data.maxPatients;
    if (data.active !== undefined) updateData.active = data.active;

    await drizzleDb
      .update(dialysisSessionSlots)
      .set(updateData)
      .where(and(eq(dialysisSessionSlots.id, slotId), eq(dialysisSessionSlots.organizationId, organizationId)));

    const updated = await this.getSlotById(organizationId, slotId);
    if (!updated) {
      throw new Error('Failed to update session slot');
    }

    return updated;
  }

  // ============================================================================
  // SESSIONS
  // ============================================================================

  /**
   * Create a new session
   */
  async create(organizationId: string, userId: string, data: CreateSessionInput): Promise<DialysisSession> {
    const now = new Date();
    const sessionId = crypto.randomUUID();

    // Verify patient exists
    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(and(eq(dialysePatients.id, data.patientId), eq(dialysePatients.organizationId, organizationId)))
      .get() as any;

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Verify prescription exists
    const prescription = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(and(eq(dialysePrescriptions.id, data.prescriptionId), eq(dialysePrescriptions.organizationId, organizationId)))
      .get() as any;

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    // Generate session number
    const countResult = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(dialysisSessions)
      .where(eq(dialysisSessions.organizationId, organizationId))
      .get() as any;
    const count = (countResult?.count || 0) + 1;
    const sessionNumber = `SES-${now.getFullYear()}-${String(count).padStart(6, '0')}`;

    await drizzleDb.insert(dialysisSessions).values({
      id: sessionId,
      organizationId,
      patientId: data.patientId,
      prescriptionId: data.prescriptionId,
      machineId: data.machineId || null,
      slotId: data.slotId || null,
      sessionNumber,
      sessionDate: new Date(data.sessionDate),
      status: 'scheduled',
      scheduledStartTime: data.scheduledStartTime || null,
      isRecurring: data.isRecurring || false,
      recurrenceGroupId: data.recurrenceGroupId || null,
      primaryNurseId: data.primaryNurseId || null,
      supervisingDoctorId: data.supervisingDoctorId || null,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const session = await this.getById(organizationId, sessionId);
    if (!session) {
      throw new Error('Failed to create session');
    }

    return session;
  }

  /**
   * Create recurring sessions
   */
  async createRecurringSessions(
    organizationId: string,
    userId: string,
    data: CreateSessionInput,
    weeks: number = 4
  ): Promise<DialysisSession[]> {
    const recurrenceGroupId = crypto.randomUUID();
    const sessions: DialysisSession[] = [];

    // Get prescription to know frequency
    const prescription = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(eq(dialysePrescriptions.id, data.prescriptionId))
      .get() as any;

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    // Create sessions for the specified number of weeks
    const startDate = new Date(data.sessionDate);
    const daysToAdd = prescription.frequencyPerWeek === 3 ? [0, 2, 4] : prescription.frequencyPerWeek === 2 ? [0, 3] : [0];

    for (let week = 0; week < weeks; week++) {
      for (const dayOffset of daysToAdd) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(sessionDate.getDate() + week * 7 + dayOffset);

        const session = await this.create(organizationId, userId, {
          ...data,
          sessionDate: sessionDate.toISOString(),
          isRecurring: true,
          recurrenceGroupId,
        });

        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get session by ID
   */
  async getById(organizationId: string, sessionId: string): Promise<DialysisSession | null> {
    const session = await drizzleDb
      .select()
      .from(dialysisSessions)
      .where(and(eq(dialysisSessions.id, sessionId), eq(dialysisSessions.organizationId, organizationId)))
      .get() as any;

    return session as DialysisSession | null;
  }

  /**
   * Get session with full details
   */
  async getByIdWithDetails(organizationId: string, sessionId: string): Promise<DialysisSessionWithDetails | null> {
    const session = await this.getById(organizationId, sessionId);
    if (!session) return null;

    // Get patient with contact
    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(eq(dialysePatients.id, session.patientId))
      .get() as any;

    const contact = patient
      ? await drizzleDb
          .select()
          .from(contacts)
          .where(eq(contacts.id, patient.contactId))
          .get()
      : null;

    // Get prescription
    const prescription = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(eq(dialysePrescriptions.id, session.prescriptionId))
      .get() as any;

    // Get machine
    const machine = session.machineId
      ? await drizzleDb
          .select()
          .from(dialysisMachines)
          .where(eq(dialysisMachines.id, session.machineId))
          .get()
      : null;

    // Get slot
    const slot = session.slotId
      ? await this.getSlotById(organizationId, session.slotId)
      : null;

    // Get session records
    const records = await this.listRecords(sessionId);

    // Get incidents
    const incidents = await this.listIncidents(sessionId);

    // Get medications
    const medications = await this.listMedications(sessionId);

    // Get consumables
    const consumables = await this.listConsumables(sessionId);

    // Get signatures
    const signatures = await this.listSignatures(sessionId);

    return {
      ...session,
      patient: patient && contact ? { ...patient, contact } : null,
      prescription,
      machine,
      slot,
      records,
      incidents,
      medications,
      consumables,
      signatures,
    } as DialysisSessionWithDetails;
  }

  /**
   * List sessions by date range
   */
  async listByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: { patientId?: string; machineId?: string; slotId?: string; status?: string }
  ): Promise<DialysisSession[]> {
    const conditions = [
      eq(dialysisSessions.organizationId, organizationId),
      gte(dialysisSessions.sessionDate, startDate),
      lte(dialysisSessions.sessionDate, endDate),
    ];

    if (filters?.patientId) {
      conditions.push(eq(dialysisSessions.patientId, filters.patientId));
    }
    if (filters?.machineId) {
      conditions.push(eq(dialysisSessions.machineId, filters.machineId));
    }
    if (filters?.slotId) {
      conditions.push(eq(dialysisSessions.slotId, filters.slotId));
    }
    if (filters?.status) {
      conditions.push(eq(dialysisSessions.status, filters.status as any));
    }

    const sessions = await drizzleDb
      .select()
      .from(dialysisSessions)
      .where(and(...conditions))
      .orderBy(dialysisSessions.sessionDate, dialysisSessions.scheduledStartTime)
      .all() as any[];

    return sessions as DialysisSession[];
  }

  /**
   * List sessions for a patient
   */
  async listByPatient(organizationId: string, patientId: string): Promise<DialysisSession[]> {
    const sessions = await drizzleDb
      .select()
      .from(dialysisSessions)
      .where(
        and(eq(dialysisSessions.patientId, patientId), eq(dialysisSessions.organizationId, organizationId))
      )
      .orderBy(desc(dialysisSessions.sessionDate))
      .all() as any[];

    return sessions as DialysisSession[];
  }

  /**
   * Get today's sessions (for dashboard)
   */
  async getTodaySessions(organizationId: string): Promise<DialysisSession[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.listByDateRange(organizationId, today, tomorrow);
  }

  /**
   * Update session
   */
  async update(organizationId: string, sessionId: string, data: UpdateSessionInput): Promise<DialysisSession> {
    const existing = await this.getById(organizationId, sessionId);
    if (!existing) {
      throw new Error('Session not found');
    }

    const now = new Date();
    const updateData: any = { updatedAt: now };

    if (data.machineId !== undefined) updateData.machineId = data.machineId;
    if (data.slotId !== undefined) updateData.slotId = data.slotId;
    if (data.sessionDate !== undefined) updateData.sessionDate = new Date(data.sessionDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scheduledStartTime !== undefined) updateData.scheduledStartTime = data.scheduledStartTime;
    if (data.primaryNurseId !== undefined) updateData.primaryNurseId = data.primaryNurseId;
    if (data.supervisingDoctorId !== undefined) updateData.supervisingDoctorId = data.supervisingDoctorId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await drizzleDb
      .update(dialysisSessions)
      .set(updateData)
      .where(and(eq(dialysisSessions.id, sessionId), eq(dialysisSessions.organizationId, organizationId)));

    const updated = await this.getById(organizationId, sessionId);
    if (!updated) {
      throw new Error('Failed to update session');
    }

    return updated;
  }

  /**
   * Check in patient for session
   */
  async checkIn(organizationId: string, sessionId: string): Promise<DialysisSession> {
    const session = await this.getById(organizationId, sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'scheduled') {
      throw new Error('Session must be in scheduled status to check in');
    }

    await drizzleDb
      .update(dialysisSessions)
      .set({ status: 'checked_in', updatedAt: new Date() })
      .where(eq(dialysisSessions.id, sessionId));

    return (await this.getById(organizationId, sessionId))!;
  }

  /**
   * Start session
   */
  async start(organizationId: string, sessionId: string, machineId?: string): Promise<DialysisSession> {
    const session = await this.getById(organizationId, sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'checked_in') {
      throw new Error('Session must be checked in before starting');
    }

    const now = new Date();
    const updateData: any = {
      status: 'in_progress',
      actualStartTime: now,
      updatedAt: now,
    };

    // Assign machine if provided
    if (machineId) {
      updateData.machineId = machineId;

      // Mark machine as in use
      await drizzleDb
        .update(dialysisMachines)
        .set({ status: 'in_use', updatedAt: now })
        .where(eq(dialysisMachines.id, machineId));
    }

    await drizzleDb
      .update(dialysisSessions)
      .set(updateData)
      .where(eq(dialysisSessions.id, sessionId));

    return (await this.getById(organizationId, sessionId))!;
  }

  /**
   * Complete session
   */
  async complete(organizationId: string, sessionId: string): Promise<DialysisSession> {
    const session = await this.getById(organizationId, sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'in_progress') {
      throw new Error('Session must be in progress to complete');
    }

    const now = new Date();
    const actualDuration = session.actualStartTime
      ? Math.round((now.getTime() - new Date(session.actualStartTime).getTime()) / 60000)
      : null;

    await drizzleDb
      .update(dialysisSessions)
      .set({
        status: 'completed',
        actualEndTime: now,
        actualDurationMinutes: actualDuration,
        updatedAt: now,
      })
      .where(eq(dialysisSessions.id, sessionId));

    // Release machine and update counters
    if (session.machineId && actualDuration) {
      await machineService.updateCounters(organizationId, session.machineId, actualDuration);
      await drizzleDb
        .update(dialysisMachines)
        .set({ status: 'available', updatedAt: now })
        .where(eq(dialysisMachines.id, session.machineId));
    }

    return (await this.getById(organizationId, sessionId))!;
  }

  /**
   * Cancel session
   */
  async cancel(
    organizationId: string,
    sessionId: string,
    userId: string,
    reason: string
  ): Promise<DialysisSession> {
    const session = await this.getById(organizationId, sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new Error('Cannot cancel a completed or already cancelled session');
    }

    const now = new Date();

    await drizzleDb
      .update(dialysisSessions)
      .set({
        status: 'cancelled',
        cancellationReason: reason,
        cancelledBy: userId,
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(dialysisSessions.id, sessionId));

    // Release machine if assigned
    if (session.machineId && session.status === 'in_progress') {
      await drizzleDb
        .update(dialysisMachines)
        .set({ status: 'available', updatedAt: now })
        .where(eq(dialysisMachines.id, session.machineId));
    }

    return (await this.getById(organizationId, sessionId))!;
  }

  // ============================================================================
  // SESSION RECORDS (Per-dialytic monitoring)
  // ============================================================================

  /**
   * Create session record
   */
  async createRecord(sessionId: string, userId: string, data: CreateSessionRecordInput): Promise<SessionRecord> {
    const now = new Date();
    const recordId = crypto.randomUUID();

    await drizzleDb.insert(sessionRecords).values({
      id: recordId,
      sessionId,
      phase: data.phase,
      recordTime: data.recordTime ? new Date(data.recordTime) : now,
      weightKg: data.weightKg || null,
      systolicBp: data.systolicBp || null,
      diastolicBp: data.diastolicBp || null,
      heartRate: data.heartRate || null,
      temperature: data.temperature || null,
      arterialPressure: data.arterialPressure || null,
      venousPressure: data.venousPressure || null,
      transmembranePressure: data.transmembranePressure || null,
      bloodFlowRate: data.bloodFlowRate || null,
      dialysateFlowRate: data.dialysateFlowRate || null,
      cumulativeUf: data.cumulativeUf || null,
      clinicalState: data.clinicalState || null,
      vascularAccessState: data.vascularAccessState || null,
      compressionTime: data.compressionTime || null,
      ufAchieved: data.ufAchieved || null,
      ufPrescribed: data.ufPrescribed || null,
      hasIncident: data.hasIncident || false,
      recordedBy: userId,
      createdAt: now,
    });

    const record = await drizzleDb
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.id, recordId))
      .get() as any;

    return record as SessionRecord;
  }

  /**
   * List records for a session
   */
  async listRecords(sessionId: string): Promise<SessionRecord[]> {
    const records = await drizzleDb
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.sessionId, sessionId))
      .orderBy(sessionRecords.recordTime)
      .all() as any[];

    return records as SessionRecord[];
  }

  // ============================================================================
  // SESSION INCIDENTS
  // ============================================================================

  /**
   * Create session incident
   */
  async createIncident(sessionId: string, userId: string, data: CreateSessionIncidentInput): Promise<SessionIncident> {
    const now = new Date();
    const incidentId = crypto.randomUUID();

    await drizzleDb.insert(sessionIncidents).values({
      id: incidentId,
      sessionId,
      sessionRecordId: data.sessionRecordId || null,
      incidentTime: data.incidentTime ? new Date(data.incidentTime) : now,
      type: data.type,
      severity: data.severity,
      description: data.description || null,
      intervention: data.intervention || null,
      outcome: data.outcome || null,
      reportedBy: userId,
      createdAt: now,
    });

    // Mark the associated record as having an incident
    if (data.sessionRecordId) {
      await drizzleDb
        .update(sessionRecords)
        .set({ hasIncident: true })
        .where(eq(sessionRecords.id, data.sessionRecordId));
    }

    const incident = await drizzleDb
      .select()
      .from(sessionIncidents)
      .where(eq(sessionIncidents.id, incidentId))
      .get() as any;

    return incident as SessionIncident;
  }

  /**
   * List incidents for a session
   */
  async listIncidents(sessionId: string): Promise<SessionIncident[]> {
    const incidents = await drizzleDb
      .select()
      .from(sessionIncidents)
      .where(eq(sessionIncidents.sessionId, sessionId))
      .orderBy(sessionIncidents.incidentTime)
      .all() as any[];

    return incidents as SessionIncident[];
  }

  // ============================================================================
  // SESSION MEDICATIONS
  // ============================================================================

  /**
   * Create session medication
   */
  async createMedication(sessionId: string, userId: string, data: CreateSessionMedicationInput): Promise<SessionMedication> {
    const now = new Date();
    const medicationId = crypto.randomUUID();

    await drizzleDb.insert(sessionMedications).values({
      id: medicationId,
      sessionId,
      medicationName: data.medicationName,
      dose: data.dose,
      route: data.route,
      administeredAt: data.administeredAt ? new Date(data.administeredAt) : now,
      administeredBy: userId,
      lotId: data.lotId || null,
      notes: data.notes || null,
      createdAt: now,
    });

    const medication = await drizzleDb
      .select()
      .from(sessionMedications)
      .where(eq(sessionMedications.id, medicationId))
      .get() as any;

    return medication as SessionMedication;
  }

  /**
   * List medications for a session
   */
  async listMedications(sessionId: string): Promise<SessionMedication[]> {
    const medications = await drizzleDb
      .select()
      .from(sessionMedications)
      .where(eq(sessionMedications.sessionId, sessionId))
      .orderBy(sessionMedications.administeredAt)
      .all() as any[];

    return medications as SessionMedication[];
  }

  // ============================================================================
  // SESSION CONSUMABLES
  // ============================================================================

  /**
   * Create session consumable
   */
  async createConsumable(sessionId: string, data: CreateSessionConsumableInput): Promise<SessionConsumable> {
    const now = new Date();
    const consumableId = crypto.randomUUID();

    await drizzleDb.insert(sessionConsumables).values({
      id: consumableId,
      sessionId,
      inventoryItemId: data.inventoryItemId,
      lotId: data.lotId || null,
      quantity: data.quantity,
      unit: data.unit,
      createdAt: now,
    });

    const consumable = await drizzleDb
      .select()
      .from(sessionConsumables)
      .where(eq(sessionConsumables.id, consumableId))
      .get() as any;

    return consumable as SessionConsumable;
  }

  /**
   * List consumables for a session
   */
  async listConsumables(sessionId: string): Promise<SessionConsumable[]> {
    const consumables = await drizzleDb
      .select()
      .from(sessionConsumables)
      .where(eq(sessionConsumables.sessionId, sessionId))
      .all() as any[];

    return consumables as SessionConsumable[];
  }

  // ============================================================================
  // SESSION SIGNATURES
  // ============================================================================

  /**
   * Add signature to session
   */
  async addSignature(
    sessionId: string,
    userId: string,
    signatureType: 'nurse_start' | 'nurse_end' | 'doctor_review' | 'patient_consent',
    signatureData?: string
  ): Promise<SessionSignature> {
    const now = new Date();
    const signatureId = crypto.randomUUID();

    await drizzleDb.insert(sessionSignatures).values({
      id: signatureId,
      sessionId,
      signatureType,
      signedBy: userId,
      signedAt: now,
      signatureData: signatureData || null,
      createdAt: now,
    });

    const signature = await drizzleDb
      .select()
      .from(sessionSignatures)
      .where(eq(sessionSignatures.id, signatureId))
      .get() as any;

    return signature as SessionSignature;
  }

  /**
   * List signatures for a session
   */
  async listSignatures(sessionId: string): Promise<SessionSignature[]> {
    const signatures = await drizzleDb
      .select()
      .from(sessionSignatures)
      .where(eq(sessionSignatures.sessionId, sessionId))
      .orderBy(sessionSignatures.signedAt)
      .all() as any[];

    return signatures as SessionSignature[];
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get session statistics
   */
  async getStats(organizationId: string, startDate?: Date, endDate?: Date): Promise<{
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    inProgressSessions: number;
    scheduledSessions: number;
    averageDuration: number;
    incidentCount: number;
  }> {
    const conditions = [eq(dialysisSessions.organizationId, organizationId)];
    if (startDate) {
      conditions.push(gte(dialysisSessions.sessionDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(dialysisSessions.sessionDate, endDate));
    }

    const sessions = await drizzleDb
      .select()
      .from(dialysisSessions)
      .where(and(...conditions))
      .all() as any[];

    const completed = sessions.filter((s) => s.status === 'completed');
    const totalDuration = completed.reduce((sum, s) => sum + (s.actualDurationMinutes || 0), 0);

    // Count incidents
    const sessionIds = sessions.map((s) => s.id);
    let incidentCount = 0;
    if (sessionIds.length > 0) {
      const incidents = await drizzleDb
        .select({ count: sql<number>`count(*)` })
        .from(sessionIncidents)
        .where(sql`${sessionIncidents.sessionId} IN (${sessionIds.join(',')})`)
        .get() as any;
      incidentCount = incidents?.count || 0;
    }

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      cancelledSessions: sessions.filter((s) => s.status === 'cancelled').length,
      inProgressSessions: sessions.filter((s) => s.status === 'in_progress').length,
      scheduledSessions: sessions.filter((s) => s.status === 'scheduled').length,
      averageDuration: completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
      incidentCount,
    };
  }
}

export const sessionService = new SessionService();
