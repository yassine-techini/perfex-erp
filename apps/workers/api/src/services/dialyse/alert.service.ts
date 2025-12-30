/**
 * Dialyse Alert Service
 * Manage clinical alerts for dialysis patients
 */

import { eq, and, desc, gte, lte, sql, or, isNull } from 'drizzle-orm';
import { drizzleDb } from '../../db';
import { clinicalAlerts, dialysePatients, labResults, vascularAccesses, contacts } from '@perfex/database';
import { safeJsonParse } from '../../utils/json';
import type {
  ClinicalAlert,
  ClinicalAlertWithPatient,
  CreateAlertInput,
  UpdateAlertInput,
} from '@perfex/shared';

// Alert types for automated generation
type AlertType =
  | 'serology_update_due'
  | 'vaccination_due'
  | 'vascular_access_control'
  | 'lab_out_of_range'
  | 'kt_v_low'
  | 'hemoglobin_low'
  | 'pth_abnormal'
  | 'prescription_expiring'
  | 'session_missed'
  | 'custom';

export class AlertService {
  /**
   * Create a new alert
   */
  async create(organizationId: string, data: CreateAlertInput): Promise<ClinicalAlert> {
    const now = new Date();
    const alertId = crypto.randomUUID();

    // Verify patient exists
    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(and(eq(dialysePatients.id, data.patientId), eq(dialysePatients.organizationId, organizationId)))
      .get() as any;

    if (!patient) {
      throw new Error('Patient not found');
    }

    await drizzleDb.insert(clinicalAlerts).values({
      id: alertId,
      organizationId,
      patientId: data.patientId,
      alertType: data.alertType,
      severity: data.severity,
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: 'active',
      assignedTo: data.assignedTo || null,
      relatedToType: data.relatedToType || null,
      relatedToId: data.relatedToId || null,
      createdAt: now,
      updatedAt: now,
    });

    const alert = await this.getById(organizationId, alertId);
    if (!alert) {
      throw new Error('Failed to create alert');
    }

    return alert;
  }

  /**
   * Get alert by ID
   */
  async getById(organizationId: string, alertId: string): Promise<ClinicalAlert | null> {
    const alert = await drizzleDb
      .select()
      .from(clinicalAlerts)
      .where(and(eq(clinicalAlerts.id, alertId), eq(clinicalAlerts.organizationId, organizationId)))
      .get() as any;

    return alert as ClinicalAlert | null;
  }

  /**
   * Get alert with patient details
   */
  async getByIdWithPatient(organizationId: string, alertId: string): Promise<ClinicalAlertWithPatient | null> {
    const alert = await this.getById(organizationId, alertId);
    if (!alert) return null;

    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(eq(dialysePatients.id, alert.patientId))
      .get() as any;

    if (!patient) return null;

    const contact = await drizzleDb
      .select()
      .from(contacts)
      .where(eq(contacts.id, patient.contactId))
      .get() as any;

    return {
      ...alert,
      patient: {
        ...patient,
        contact,
      },
    } as ClinicalAlertWithPatient;
  }

  /**
   * List alerts with filters
   */
  async list(
    organizationId: string,
    filters?: {
      patientId?: string;
      status?: string;
      severity?: string;
      alertType?: string;
      assignedTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: ClinicalAlert[]; total: number }> {
    const { patientId, status, severity, alertType, assignedTo, limit = 50, offset = 0 } = filters || {};

    const conditions = [eq(clinicalAlerts.organizationId, organizationId)];

    if (patientId) {
      conditions.push(eq(clinicalAlerts.patientId, patientId));
    }
    if (status) {
      conditions.push(eq(clinicalAlerts.status, status as any));
    }
    if (severity) {
      conditions.push(eq(clinicalAlerts.severity, severity as any));
    }
    if (alertType) {
      conditions.push(eq(clinicalAlerts.alertType, alertType as any));
    }
    if (assignedTo) {
      conditions.push(eq(clinicalAlerts.assignedTo, assignedTo));
    }

    const alerts = await drizzleDb
      .select()
      .from(clinicalAlerts)
      .where(and(...conditions))
      .orderBy(desc(clinicalAlerts.createdAt))
      .limit(limit)
      .offset(offset)
      .all() as any[];

    const countResult = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(clinicalAlerts)
      .where(and(...conditions))
      .get() as any;

    return {
      data: alerts as ClinicalAlert[],
      total: countResult?.count || 0,
    };
  }

  /**
   * Get active alerts for a patient
   */
  async getActiveByPatient(organizationId: string, patientId: string): Promise<ClinicalAlert[]> {
    const alerts = await drizzleDb
      .select()
      .from(clinicalAlerts)
      .where(
        and(
          eq(clinicalAlerts.patientId, patientId),
          eq(clinicalAlerts.organizationId, organizationId),
          eq(clinicalAlerts.status, 'active')
        )
      )
      .orderBy(desc(clinicalAlerts.severity), desc(clinicalAlerts.createdAt))
      .all() as any[];

    return alerts as ClinicalAlert[];
  }

  /**
   * Get critical and high priority alerts
   * Optimized with JOINs to avoid N+1 query pattern
   */
  async getCriticalAlerts(organizationId: string): Promise<ClinicalAlertWithPatient[]> {
    // Single query with JOINs - replaces N+1 pattern (was 1 + N*2 queries, now 1 query)
    const results = await drizzleDb
      .select({
        alert: clinicalAlerts,
        patient: dialysePatients,
        contact: contacts,
      })
      .from(clinicalAlerts)
      .innerJoin(dialysePatients, eq(clinicalAlerts.patientId, dialysePatients.id))
      .leftJoin(contacts, eq(dialysePatients.contactId, contacts.id))
      .where(
        and(
          eq(clinicalAlerts.organizationId, organizationId),
          eq(clinicalAlerts.status, 'active'),
          or(eq(clinicalAlerts.severity, 'critical'), eq(clinicalAlerts.severity, 'high'))
        )
      )
      .orderBy(desc(clinicalAlerts.severity), desc(clinicalAlerts.createdAt))
      .all() as any[];

    // Transform joined results into expected structure
    return results.map((row) => ({
      ...row.alert,
      patient: { ...row.patient, contact: row.contact },
    })) as ClinicalAlertWithPatient[];
  }

  /**
   * Update alert
   */
  async update(organizationId: string, alertId: string, data: UpdateAlertInput): Promise<ClinicalAlert> {
    const existing = await this.getById(organizationId, alertId);
    if (!existing) {
      throw new Error('Alert not found');
    }

    const now = new Date();
    const updateData: any = { updatedAt: now };

    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

    await drizzleDb
      .update(clinicalAlerts)
      .set(updateData)
      .where(and(eq(clinicalAlerts.id, alertId), eq(clinicalAlerts.organizationId, organizationId)));

    const updated = await this.getById(organizationId, alertId);
    if (!updated) {
      throw new Error('Failed to update alert');
    }

    return updated;
  }

  /**
   * Acknowledge alert
   */
  async acknowledge(organizationId: string, alertId: string, userId: string): Promise<ClinicalAlert> {
    const existing = await this.getById(organizationId, alertId);
    if (!existing) {
      throw new Error('Alert not found');
    }

    const now = new Date();

    await drizzleDb
      .update(clinicalAlerts)
      .set({
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: now,
        updatedAt: now,
      })
      .where(eq(clinicalAlerts.id, alertId));

    return (await this.getById(organizationId, alertId))!;
  }

  /**
   * Resolve alert
   */
  async resolve(organizationId: string, alertId: string, userId: string, notes?: string): Promise<ClinicalAlert> {
    const existing = await this.getById(organizationId, alertId);
    if (!existing) {
      throw new Error('Alert not found');
    }

    const now = new Date();

    await drizzleDb
      .update(clinicalAlerts)
      .set({
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: now,
        resolutionNotes: notes || null,
        updatedAt: now,
      })
      .where(eq(clinicalAlerts.id, alertId));

    return (await this.getById(organizationId, alertId))!;
  }

  /**
   * Dismiss alert
   */
  async dismiss(organizationId: string, alertId: string): Promise<ClinicalAlert> {
    const existing = await this.getById(organizationId, alertId);
    if (!existing) {
      throw new Error('Alert not found');
    }

    await drizzleDb
      .update(clinicalAlerts)
      .set({
        status: 'dismissed',
        updatedAt: new Date(),
      })
      .where(eq(clinicalAlerts.id, alertId));

    return (await this.getById(organizationId, alertId))!;
  }

  // ============================================================================
  // AUTOMATED ALERT GENERATION
  // ============================================================================

  /**
   * Generate alerts for serology updates due
   */
  async generateSerologyAlerts(organizationId: string): Promise<number> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Get patients with outdated serology
    const patients = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(
        and(
          eq(dialysePatients.organizationId, organizationId),
          eq(dialysePatients.patientStatus, 'active'),
          or(
            isNull(dialysePatients.serologyLastUpdate),
            lte(dialysePatients.serologyLastUpdate, threeMonthsAgo)
          )
        )
      )
      .all() as any[];

    let created = 0;
    for (const patient of patients) {
      // Check if alert already exists
      const existingAlert = await drizzleDb
        .select()
        .from(clinicalAlerts)
        .where(
          and(
            eq(clinicalAlerts.patientId, patient.id),
            eq(clinicalAlerts.alertType, 'serology_update_due'),
            eq(clinicalAlerts.status, 'active')
          )
        )
        .get() as any;

      if (!existingAlert) {
        await this.create(organizationId, {
          patientId: patient.id,
          alertType: 'serology_update_due',
          severity: 'medium',
          title: 'Mise à jour sérologie requise',
          description: `La dernière mise à jour sérologique date de plus de 3 mois.`,
          relatedToType: 'patient',
          relatedToId: patient.id,
        });
        created++;
      }
    }

    return created;
  }

  /**
   * Generate alerts for vascular access control due
   */
  async generateVascularAccessAlerts(organizationId: string): Promise<number> {
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // Get accesses with control due soon or overdue
    const accesses = await drizzleDb
      .select()
      .from(vascularAccesses)
      .where(
        and(
          eq(vascularAccesses.organizationId, organizationId),
          eq(vascularAccesses.status, 'active'),
          lte(vascularAccesses.nextControlDate, oneWeekFromNow)
        )
      )
      .all() as any[];

    let created = 0;
    for (const access of accesses) {
      const existingAlert = await drizzleDb
        .select()
        .from(clinicalAlerts)
        .where(
          and(
            eq(clinicalAlerts.relatedToType, 'vascular_access'),
            eq(clinicalAlerts.relatedToId, access.id),
            eq(clinicalAlerts.alertType, 'vascular_access_control'),
            eq(clinicalAlerts.status, 'active')
          )
        )
        .get() as any;

      if (!existingAlert) {
        const isOverdue = access.nextControlDate && new Date(access.nextControlDate) < today;
        await this.create(organizationId, {
          patientId: access.patientId,
          alertType: 'vascular_access_control',
          severity: isOverdue ? 'high' : 'medium',
          title: isOverdue ? 'Contrôle abord vasculaire en retard' : 'Contrôle abord vasculaire à programmer',
          description: `Contrôle de l'abord vasculaire (${access.type}) prévu le ${access.nextControlDate}`,
          dueDate: access.nextControlDate ? new Date(access.nextControlDate).toISOString() : undefined,
          relatedToType: 'vascular_access',
          relatedToId: access.id,
        });
        created++;
      }
    }

    return created;
  }

  /**
   * Generate alerts for abnormal lab values
   */
  async generateLabAlerts(organizationId: string): Promise<number> {
    // Get recent lab results with out-of-range values
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const results = await drizzleDb
      .select()
      .from(labResults)
      .where(
        and(
          eq(labResults.organizationId, organizationId),
          eq(labResults.hasOutOfRangeValues, true),
          gte(labResults.labDate, oneWeekAgo),
          isNull(labResults.reviewedBy)
        )
      )
      .all() as any[];

    let created = 0;
    for (const result of results) {
      const existingAlert = await drizzleDb
        .select()
        .from(clinicalAlerts)
        .where(
          and(
            eq(clinicalAlerts.relatedToType, 'lab_result'),
            eq(clinicalAlerts.relatedToId, result.id),
            eq(clinicalAlerts.status, 'active')
          )
        )
        .get() as any;

      if (!existingAlert) {
        const outOfRangeMarkers = safeJsonParse<string[]>(result.outOfRangeMarkers, [], 'alert.generateLabAlerts.outOfRangeMarkers');
        const hasCritical = outOfRangeMarkers.some((m: string) => ['potassium', 'hemoglobin'].includes(m));

        await this.create(organizationId, {
          patientId: result.patientId,
          alertType: 'lab_out_of_range',
          severity: hasCritical ? 'high' : 'medium',
          title: 'Résultats de laboratoire anormaux',
          description: `Valeurs hors normes: ${outOfRangeMarkers.join(', ')}`,
          relatedToType: 'lab_result',
          relatedToId: result.id,
        });
        created++;
      }
    }

    return created;
  }

  /**
   * Run all automated alert generators
   */
  async runAutomatedAlertGeneration(organizationId: string): Promise<{
    serologyAlerts: number;
    vascularAccessAlerts: number;
    labAlerts: number;
    total: number;
  }> {
    const serologyAlerts = await this.generateSerologyAlerts(organizationId);
    const vascularAccessAlerts = await this.generateVascularAccessAlerts(organizationId);
    const labAlerts = await this.generateLabAlerts(organizationId);

    return {
      serologyAlerts,
      vascularAccessAlerts,
      labAlerts,
      total: serologyAlerts + vascularAccessAlerts + labAlerts,
    };
  }

  /**
   * Get alert statistics
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byType: Record<string, number>;
  }> {
    const alerts = await drizzleDb
      .select()
      .from(clinicalAlerts)
      .where(eq(clinicalAlerts.organizationId, organizationId))
      .all() as any[];

    const byType: Record<string, number> = {};
    for (const alert of alerts) {
      byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
    }

    return {
      total: alerts.length,
      active: alerts.filter((a) => a.status === 'active').length,
      acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      high: alerts.filter((a) => a.severity === 'high').length,
      medium: alerts.filter((a) => a.severity === 'medium').length,
      low: alerts.filter((a) => a.severity === 'low').length,
      byType,
    };
  }
}

export const alertService = new AlertService();
