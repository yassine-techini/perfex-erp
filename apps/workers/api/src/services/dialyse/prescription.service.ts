/**
 * Dialyse Prescription Service
 * Manage dialysis prescriptions
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { drizzleDb } from '../../db';
import { dialysePrescriptions, dialysePatients, contacts } from '@perfex/database';
import type {
  DialysePrescription,
  DialysePrescriptionWithPatient,
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
} from '@perfex/shared';

export class PrescriptionService {
  /**
   * Create a new prescription
   */
  async create(organizationId: string, userId: string, data: CreatePrescriptionInput): Promise<DialysePrescription> {
    const now = new Date();
    const prescriptionId = crypto.randomUUID();

    // Verify patient exists
    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(and(eq(dialysePatients.id, data.patientId), eq(dialysePatients.organizationId, organizationId)))
      .get() as any;

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Deactivate any existing active prescriptions for this patient
    await drizzleDb
      .update(dialysePrescriptions)
      .set({ status: 'superseded', updatedAt: now })
      .where(
        and(
          eq(dialysePrescriptions.patientId, data.patientId),
          eq(dialysePrescriptions.organizationId, organizationId),
          eq(dialysePrescriptions.status, 'active')
        )
      );

    // Generate prescription number
    const countResult = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(dialysePrescriptions)
      .where(eq(dialysePrescriptions.organizationId, organizationId))
      .get() as any;
    const count = (countResult?.count || 0) + 1;
    const prescriptionNumber = `RX-${now.getFullYear()}-${String(count).padStart(5, '0')}`;

    await drizzleDb.insert(dialysePrescriptions).values({
      id: prescriptionId,
      organizationId,
      patientId: data.patientId,
      prescribedBy: userId,
      prescriptionNumber,
      type: data.type,
      isPermanent: data.isPermanent ?? true,
      durationMinutes: data.durationMinutes,
      frequencyPerWeek: data.frequencyPerWeek,
      dryWeight: data.dryWeight || null,
      bloodFlowRate: data.bloodFlowRate || null,
      dialysateFlowRate: data.dialysateFlowRate || null,
      dialyzerType: data.dialyzerType || null,
      membraneSurface: data.membraneSurface || null,
      anticoagulationType: data.anticoagulationType || null,
      anticoagulationDose: data.anticoagulationDose || null,
      anticoagulationProtocol: data.anticoagulationProtocol || null,
      sessionMedications: data.sessionMedications ? JSON.stringify(data.sessionMedications) : null,
      dialysateType: data.dialysateType || null,
      dialysateSodium: data.dialysateSodium || null,
      dialysatePotassium: data.dialysatePotassium || null,
      dialysateBicarbonate: data.dialysateBicarbonate || null,
      dialysateCalcium: data.dialysateCalcium || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: 'active',
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    });

    const prescription = await this.getById(organizationId, prescriptionId);
    if (!prescription) {
      throw new Error('Failed to create prescription');
    }

    return prescription;
  }

  /**
   * Get prescription by ID
   */
  async getById(organizationId: string, prescriptionId: string): Promise<DialysePrescription | null> {
    const prescription = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(and(eq(dialysePrescriptions.id, prescriptionId), eq(dialysePrescriptions.organizationId, organizationId)))
      .get() as any;

    return prescription as DialysePrescription || null;
  }

  /**
   * Get prescription with patient details
   */
  async getByIdWithPatient(organizationId: string, prescriptionId: string): Promise<DialysePrescriptionWithPatient | null> {
    const prescription = await this.getById(organizationId, prescriptionId);
    if (!prescription) {
      return null;
    }

    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(eq(dialysePatients.id, prescription.patientId))
      .get() as any;

    if (!patient) {
      return null;
    }

    const contact = await drizzleDb
      .select()
      .from(contacts)
      .where(eq(contacts.id, patient.contactId))
      .get() as any;

    if (!contact) {
      return null;
    }

    return {
      ...prescription,
      patient: {
        ...patient,
        contact,
      },
    } as DialysePrescriptionWithPatient;
  }

  /**
   * Get active prescription for a patient
   */
  async getActiveByPatient(organizationId: string, patientId: string): Promise<DialysePrescription | null> {
    const prescription = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(
        and(
          eq(dialysePrescriptions.patientId, patientId),
          eq(dialysePrescriptions.organizationId, organizationId),
          eq(dialysePrescriptions.status, 'active')
        )
      )
      .get() as any;

    return prescription as DialysePrescription || null;
  }

  /**
   * List prescriptions for a patient
   */
  async listByPatient(organizationId: string, patientId: string): Promise<DialysePrescription[]> {
    const prescriptions = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(
        and(
          eq(dialysePrescriptions.patientId, patientId),
          eq(dialysePrescriptions.organizationId, organizationId)
        )
      )
      .orderBy(desc(dialysePrescriptions.createdAt))
      .all() as any[];

    return prescriptions as DialysePrescription[];
  }

  /**
   * List all prescriptions
   */
  async list(
    organizationId: string,
    filters?: { status?: string; patientId?: string; limit?: number; offset?: number }
  ): Promise<{ data: DialysePrescription[]; total: number }> {
    const { status, patientId, limit = 25, offset = 0 } = filters || {};

    const conditions = [eq(dialysePrescriptions.organizationId, organizationId)];
    if (status) {
      conditions.push(eq(dialysePrescriptions.status, status as any));
    }
    if (patientId) {
      conditions.push(eq(dialysePrescriptions.patientId, patientId));
    }

    const prescriptions = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(and(...conditions))
      .orderBy(desc(dialysePrescriptions.createdAt))
      .limit(limit)
      .offset(offset)
      .all() as any[];

    const countResult = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(dialysePrescriptions)
      .where(and(...conditions))
      .get() as any;

    return {
      data: prescriptions as DialysePrescription[],
      total: countResult?.count || 0,
    };
  }

  /**
   * Update prescription
   */
  async update(organizationId: string, prescriptionId: string, data: UpdatePrescriptionInput): Promise<DialysePrescription> {
    const existing = await this.getById(organizationId, prescriptionId);
    if (!existing) {
      throw new Error('Prescription not found');
    }

    const now = new Date();
    const updateData: any = { updatedAt: now };

    if (data.type !== undefined) updateData.type = data.type;
    if (data.isPermanent !== undefined) updateData.isPermanent = data.isPermanent;
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.frequencyPerWeek !== undefined) updateData.frequencyPerWeek = data.frequencyPerWeek;
    if (data.dryWeight !== undefined) updateData.dryWeight = data.dryWeight;
    if (data.bloodFlowRate !== undefined) updateData.bloodFlowRate = data.bloodFlowRate;
    if (data.dialysateFlowRate !== undefined) updateData.dialysateFlowRate = data.dialysateFlowRate;
    if (data.dialyzerType !== undefined) updateData.dialyzerType = data.dialyzerType;
    if (data.membraneSurface !== undefined) updateData.membraneSurface = data.membraneSurface;
    if (data.anticoagulationType !== undefined) updateData.anticoagulationType = data.anticoagulationType;
    if (data.anticoagulationDose !== undefined) updateData.anticoagulationDose = data.anticoagulationDose;
    if (data.anticoagulationProtocol !== undefined) updateData.anticoagulationProtocol = data.anticoagulationProtocol;
    if (data.sessionMedications !== undefined) updateData.sessionMedications = JSON.stringify(data.sessionMedications);
    if (data.dialysateType !== undefined) updateData.dialysateType = data.dialysateType;
    if (data.dialysateSodium !== undefined) updateData.dialysateSodium = data.dialysateSodium;
    if (data.dialysatePotassium !== undefined) updateData.dialysatePotassium = data.dialysatePotassium;
    if (data.dialysateBicarbonate !== undefined) updateData.dialysateBicarbonate = data.dialysateBicarbonate;
    if (data.dialysateCalcium !== undefined) updateData.dialysateCalcium = data.dialysateCalcium;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await drizzleDb
      .update(dialysePrescriptions)
      .set(updateData)
      .where(and(eq(dialysePrescriptions.id, prescriptionId), eq(dialysePrescriptions.organizationId, organizationId)));

    const updated = await this.getById(organizationId, prescriptionId);
    if (!updated) {
      throw new Error('Failed to update prescription');
    }

    return updated;
  }

  /**
   * Renew prescription (create new from existing)
   */
  async renew(organizationId: string, prescriptionId: string, userId: string): Promise<DialysePrescription> {
    const existing = await this.getById(organizationId, prescriptionId);
    if (!existing) {
      throw new Error('Prescription not found');
    }

    // Create new prescription based on existing one
    const newPrescription = await this.create(organizationId, userId, {
      patientId: existing.patientId,
      type: existing.type as any,
      isPermanent: existing.isPermanent,
      durationMinutes: existing.durationMinutes,
      frequencyPerWeek: existing.frequencyPerWeek,
      dryWeight: existing.dryWeight,
      bloodFlowRate: existing.bloodFlowRate,
      dialysateFlowRate: existing.dialysateFlowRate,
      dialyzerType: existing.dialyzerType,
      membraneSurface: existing.membraneSurface,
      anticoagulationType: existing.anticoagulationType,
      anticoagulationDose: existing.anticoagulationDose,
      anticoagulationProtocol: existing.anticoagulationProtocol,
      sessionMedications: existing.sessionMedications ? JSON.parse(existing.sessionMedications) : undefined,
      dialysateType: existing.dialysateType,
      dialysateSodium: existing.dialysateSodium,
      dialysatePotassium: existing.dialysatePotassium,
      dialysateBicarbonate: existing.dialysateBicarbonate,
      dialysateCalcium: existing.dialysateCalcium,
      startDate: new Date().toISOString(),
      notes: `Renewed from prescription ${existing.prescriptionNumber}`,
    });

    // Update old prescription with reference to new one
    await drizzleDb
      .update(dialysePrescriptions)
      .set({ supersededById: newPrescription.id, updatedAt: new Date() })
      .where(eq(dialysePrescriptions.id, prescriptionId));

    return newPrescription;
  }

  /**
   * Cancel prescription
   */
  async cancel(organizationId: string, prescriptionId: string): Promise<DialysePrescription> {
    const existing = await this.getById(organizationId, prescriptionId);
    if (!existing) {
      throw new Error('Prescription not found');
    }

    await drizzleDb
      .update(dialysePrescriptions)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(dialysePrescriptions.id, prescriptionId), eq(dialysePrescriptions.organizationId, organizationId)));

    const updated = await this.getById(organizationId, prescriptionId);
    if (!updated) {
      throw new Error('Failed to cancel prescription');
    }

    return updated;
  }
}

export const prescriptionService = new PrescriptionService();
