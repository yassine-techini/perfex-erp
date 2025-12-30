/**
 * Dialyse Lab Service
 * Manage laboratory results and Kt/V calculations
 */

import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { drizzleDb } from '../../db';
import { labResults, dialysePatients } from '@perfex/database';
import { safeJsonParse } from '../../utils/json';
import type {
  LabResult,
  LabResultWithPatient,
  CreateLabResultInput,
  UpdateLabResultInput,
} from '@perfex/shared';

// Reference ranges for common lab values
const REFERENCE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  urea: { min: 2.5, max: 7.5, unit: 'mmol/L' },
  creatinine: { min: 60, max: 120, unit: 'µmol/L' },
  ktV: { min: 1.2, max: 2.0, unit: '' },
  hemoglobin: { min: 100, max: 120, unit: 'g/L' },
  hematocrit: { min: 0.33, max: 0.38, unit: '%' },
  pth: { min: 150, max: 600, unit: 'pg/mL' },
  calcium: { min: 2.1, max: 2.6, unit: 'mmol/L' },
  phosphorus: { min: 0.8, max: 1.45, unit: 'mmol/L' },
  potassium: { min: 3.5, max: 5.5, unit: 'mmol/L' },
  sodium: { min: 135, max: 145, unit: 'mmol/L' },
  bicarbonate: { min: 22, max: 28, unit: 'mmol/L' },
  albumin: { min: 35, max: 50, unit: 'g/L' },
  ferritin: { min: 100, max: 500, unit: 'ng/mL' },
  transferrinSaturation: { min: 20, max: 50, unit: '%' },
  crp: { min: 0, max: 5, unit: 'mg/L' },
};

export class LabService {
  /**
   * Create a new lab result
   */
  async create(organizationId: string, userId: string, data: CreateLabResultInput): Promise<LabResult> {
    const now = new Date();
    const labId = crypto.randomUUID();

    // Verify patient exists
    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(and(eq(dialysePatients.id, data.patientId), eq(dialysePatients.organizationId, organizationId)))
      .get() as any;

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check for out-of-range values
    const outOfRangeMarkers = this.checkOutOfRangeValues(data);
    const hasOutOfRangeValues = outOfRangeMarkers.length > 0;

    // Calculate Kt/V if pre and post urea values are provided
    let ktV = data.ktV;
    if (!ktV && data.ureaPre && data.ureaPost && patient.dryWeight) {
      ktV = this.calculateKtV(data.ureaPre, data.ureaPost, patient.dryWeight, data.sessionDuration || 240);
    }

    await drizzleDb.insert(labResults).values({
      id: labId,
      organizationId,
      patientId: data.patientId,
      labDate: new Date(data.labDate),
      labSource: data.labSource || null,
      importMethod: data.importMethod || 'manual',
      urea: data.urea || null,
      ureaPre: data.ureaPre || null,
      ureaPost: data.ureaPost || null,
      creatinine: data.creatinine || null,
      ktV: ktV || null,
      hemoglobin: data.hemoglobin || null,
      hematocrit: data.hematocrit || null,
      pth: data.pth || null,
      calcium: data.calcium || null,
      phosphorus: data.phosphorus || null,
      potassium: data.potassium || null,
      sodium: data.sodium || null,
      bicarbonate: data.bicarbonate || null,
      albumin: data.albumin || null,
      ferritin: data.ferritin || null,
      transferrinSaturation: data.transferrinSaturation || null,
      crp: data.crp || null,
      allResults: data.allResults ? JSON.stringify(data.allResults) : null,
      hasOutOfRangeValues,
      outOfRangeMarkers: outOfRangeMarkers.length > 0 ? JSON.stringify(outOfRangeMarkers) : null,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const result = await this.getById(organizationId, labId);
    if (!result) {
      throw new Error('Failed to create lab result');
    }

    return result;
  }

  /**
   * Import lab results from file data
   */
  async importFromFile(
    organizationId: string,
    userId: string,
    patientId: string,
    results: Array<{
      labDate: string;
      labSource?: string;
      [key: string]: any;
    }>
  ): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (const result of results) {
      try {
        await this.create(organizationId, userId, {
          ...result,
          patientId,
          importMethod: 'file_import',
        } as CreateLabResultInput);
        imported++;
      } catch (error: any) {
        errors.push(`Row ${imported + errors.length + 1}: ${error.message}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Get lab result by ID
   */
  async getById(organizationId: string, labId: string): Promise<LabResult | null> {
    const result = await drizzleDb
      .select()
      .from(labResults)
      .where(and(eq(labResults.id, labId), eq(labResults.organizationId, organizationId)))
      .get() as any;

    if (!result) return null;

    return {
      ...result,
      allResults: safeJsonParse(result.allResults, null, 'lab.getById.allResults'),
      outOfRangeMarkers: safeJsonParse<string[]>(result.outOfRangeMarkers, [], 'lab.getById.outOfRangeMarkers'),
    } as LabResult;
  }

  /**
   * List lab results for a patient
   */
  async listByPatient(
    organizationId: string,
    patientId: string,
    filters?: { startDate?: string; endDate?: string; limit?: number; offset?: number }
  ): Promise<{ data: LabResult[]; total: number }> {
    const { startDate, endDate, limit = 25, offset = 0 } = filters || {};

    const conditions = [
      eq(labResults.patientId, patientId),
      eq(labResults.organizationId, organizationId),
    ];

    if (startDate) {
      conditions.push(gte(labResults.labDate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(labResults.labDate, new Date(endDate)));
    }

    const results = await drizzleDb
      .select()
      .from(labResults)
      .where(and(...conditions))
      .orderBy(desc(labResults.labDate))
      .limit(limit)
      .offset(offset)
      .all() as any[];

    const countResult = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(labResults)
      .where(and(...conditions))
      .get() as any;

    return {
      data: results.map((r) => ({
        ...r,
        allResults: safeJsonParse(r.allResults, null, 'lab.listByPatient.allResults'),
        outOfRangeMarkers: safeJsonParse<string[]>(r.outOfRangeMarkers, [], 'lab.listByPatient.outOfRangeMarkers'),
      })) as LabResult[],
      total: countResult?.count || 0,
    };
  }

  /**
   * Get latest lab result for a patient
   */
  async getLatestByPatient(organizationId: string, patientId: string): Promise<LabResult | null> {
    const result = await drizzleDb
      .select()
      .from(labResults)
      .where(and(eq(labResults.patientId, patientId), eq(labResults.organizationId, organizationId)))
      .orderBy(desc(labResults.labDate))
      .limit(1)
      .get() as any;

    if (!result) return null;

    return {
      ...result,
      allResults: safeJsonParse(result.allResults, null, 'lab.getLatestByPatient.allResults'),
      outOfRangeMarkers: safeJsonParse<string[]>(result.outOfRangeMarkers, [], 'lab.getLatestByPatient.outOfRangeMarkers'),
    } as LabResult;
  }

  /**
   * Update lab result
   */
  async update(organizationId: string, labId: string, data: UpdateLabResultInput): Promise<LabResult> {
    const existing = await this.getById(organizationId, labId);
    if (!existing) {
      throw new Error('Lab result not found');
    }

    const now = new Date();
    const updateData: any = { updatedAt: now };

    // Update all provided fields
    const fields = [
      'labDate', 'labSource', 'urea', 'ureaPre', 'ureaPost', 'creatinine', 'ktV',
      'hemoglobin', 'hematocrit', 'pth', 'calcium', 'phosphorus', 'potassium',
      'sodium', 'bicarbonate', 'albumin', 'ferritin', 'transferrinSaturation',
      'crp', 'notes',
    ];

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        if (field === 'labDate') {
          updateData[field] = new Date((data as any)[field]);
        } else {
          updateData[field] = (data as any)[field];
        }
      }
    }

    if (data.allResults !== undefined) {
      updateData.allResults = data.allResults ? JSON.stringify(data.allResults) : null;
    }

    // Recalculate out-of-range markers
    const mergedData = { ...existing, ...data };
    const outOfRangeMarkers = this.checkOutOfRangeValues(mergedData);
    updateData.hasOutOfRangeValues = outOfRangeMarkers.length > 0;
    updateData.outOfRangeMarkers = outOfRangeMarkers.length > 0 ? JSON.stringify(outOfRangeMarkers) : null;

    await drizzleDb
      .update(labResults)
      .set(updateData)
      .where(and(eq(labResults.id, labId), eq(labResults.organizationId, organizationId)));

    const updated = await this.getById(organizationId, labId);
    if (!updated) {
      throw new Error('Failed to update lab result');
    }

    return updated;
  }

  /**
   * Mark lab result as reviewed
   */
  async markReviewed(organizationId: string, labId: string, userId: string): Promise<LabResult> {
    const existing = await this.getById(organizationId, labId);
    if (!existing) {
      throw new Error('Lab result not found');
    }

    const now = new Date();

    await drizzleDb
      .update(labResults)
      .set({
        reviewedBy: userId,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(labResults.id, labId));

    return (await this.getById(organizationId, labId))!;
  }

  /**
   * Delete lab result
   */
  async delete(organizationId: string, labId: string): Promise<void> {
    const existing = await this.getById(organizationId, labId);
    if (!existing) {
      throw new Error('Lab result not found');
    }

    await drizzleDb
      .delete(labResults)
      .where(and(eq(labResults.id, labId), eq(labResults.organizationId, organizationId)));
  }

  /**
   * Get lab trend data for a patient
   */
  async getTrend(
    organizationId: string,
    patientId: string,
    marker: string,
    months: number = 12
  ): Promise<Array<{ date: Date; value: number }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const results = await drizzleDb
      .select()
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, patientId),
          eq(labResults.organizationId, organizationId),
          gte(labResults.labDate, startDate)
        )
      )
      .orderBy(labResults.labDate)
      .all() as any[];

    return results
      .filter((r) => (r as any)[marker] !== null)
      .map((r) => ({
        date: r.labDate,
        value: (r as any)[marker],
      }));
  }

  /**
   * Get patients with out-of-range values
   */
  async getPatientsWithOutOfRangeValues(organizationId: string): Promise<LabResultWithPatient[]> {
    // Get latest lab result for each patient that has out-of-range values
    const results = await drizzleDb
      .select()
      .from(labResults)
      .where(
        and(
          eq(labResults.organizationId, organizationId),
          eq(labResults.hasOutOfRangeValues, true)
        )
      )
      .orderBy(desc(labResults.labDate))
      .all() as any[];

    // Group by patient and get latest for each
    const patientLatest = new Map<string, typeof results[0]>();
    for (const result of results) {
      if (!patientLatest.has(result.patientId)) {
        patientLatest.set(result.patientId, result);
      }
    }

    return Array.from(patientLatest.values()).map((r) => ({
      ...r,
      allResults: r.allResults ? JSON.parse(r.allResults) : null,
      outOfRangeMarkers: r.outOfRangeMarkers ? JSON.parse(r.outOfRangeMarkers) : null,
    })) as LabResultWithPatient[];
  }

  /**
   * Calculate Kt/V using Daugirdas formula (single pool)
   * Kt/V = -ln(R - 0.008 × t) + (4 - 3.5 × R) × (UF / W)
   * Where:
   *   R = post-dialysis urea / pre-dialysis urea
   *   t = session duration in hours
   *   UF = ultrafiltration volume in liters
   *   W = post-dialysis weight in kg
   */
  calculateKtV(
    ureaPre: number,
    ureaPost: number,
    postWeight: number,
    durationMinutes: number,
    ufVolume?: number
  ): number {
    const R = ureaPost / ureaPre;
    const t = durationMinutes / 60; // Convert to hours
    const UF = ufVolume || 0;
    const W = postWeight;

    // Simplified Daugirdas formula
    const ktV = -Math.log(R - 0.008 * t) + (4 - 3.5 * R) * (UF / W);

    return Math.round(ktV * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check which values are out of reference range
   */
  private checkOutOfRangeValues(data: Record<string, any>): string[] {
    const outOfRange: string[] = [];

    for (const [marker, range] of Object.entries(REFERENCE_RANGES)) {
      const value = data[marker];
      if (value !== null && value !== undefined) {
        if (value < range.min || value > range.max) {
          outOfRange.push(marker);
        }
      }
    }

    return outOfRange;
  }

  /**
   * Get statistics for lab results
   */
  async getStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalResults: number;
    outOfRangeResults: number;
    reviewedResults: number;
    pendingReviewResults: number;
    avgKtV: number;
    avgHemoglobin: number;
  }> {
    const conditions = [eq(labResults.organizationId, organizationId)];
    if (startDate) {
      conditions.push(gte(labResults.labDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(labResults.labDate, endDate));
    }

    const results = await drizzleDb
      .select()
      .from(labResults)
      .where(and(...conditions))
      .all() as any[];

    const ktVValues = results.filter((r) => r.ktV !== null).map((r) => r.ktV!);
    const hbValues = results.filter((r) => r.hemoglobin !== null).map((r) => r.hemoglobin!);

    return {
      totalResults: results.length,
      outOfRangeResults: results.filter((r) => r.hasOutOfRangeValues).length,
      reviewedResults: results.filter((r) => r.reviewedBy !== null).length,
      pendingReviewResults: results.filter((r) => r.reviewedBy === null).length,
      avgKtV: ktVValues.length > 0 ? Math.round((ktVValues.reduce((a, b) => a + b, 0) / ktVValues.length) * 100) / 100 : 0,
      avgHemoglobin: hbValues.length > 0 ? Math.round(hbValues.reduce((a, b) => a + b, 0) / hbValues.length) : 0,
    };
  }
}

export const labService = new LabService();
