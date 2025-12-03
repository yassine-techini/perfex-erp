/**
 * Traceability Service
 * Business logic for lot tracking and HACCP management
 */

import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  lots,
  lotMovements,
  productionTraceability,
  productionInputLots,
  haccpControlPoints,
  haccpRecords,
  temperatureLogs,
  productRecalls,
  cleaningRecords,
  type InsertLot,
  type InsertLotMovement,
  type InsertHaccpControlPoint,
  type InsertHaccpRecord,
  type InsertTemperatureLog,
  type InsertProductRecall,
  type InsertCleaningRecord,
} from '@perfex/database';

export const traceabilityService = {
  // ============================================
  // LOTS
  // ============================================

  async listLots(
    organizationId: string,
    filters?: {
      type?: string;
      status?: string;
      search?: string;
      expiringBefore?: Date;
    }
  ) {
    const db = getDb();
    const results = await db
      .select()
      .from(lots)
      .where(eq(lots.organizationId, organizationId))
      .orderBy(desc(lots.createdAt));

    return results.filter((lot) => {
      if (filters?.type && lot.type !== filters.type) return false;
      if (filters?.status && lot.status !== filters.status) return false;
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        if (!lot.lotNumber.toLowerCase().includes(search)) return false;
      }
      if (filters?.expiringBefore && lot.expiryDate) {
        if (lot.expiryDate > filters.expiringBefore) return false;
      }
      return true;
    });
  },

  async getLotById(organizationId: string, id: string) {
    const db = getDb();
    const [lot] = await db
      .select()
      .from(lots)
      .where(and(eq(lots.id, id), eq(lots.organizationId, organizationId)));

    if (!lot) return null;

    // Get movements
    const movements = await db
      .select()
      .from(lotMovements)
      .where(eq(lotMovements.lotId, id))
      .orderBy(desc(lotMovements.createdAt));

    return { ...lot, movements };
  },

  async getLotByNumber(organizationId: string, lotNumber: string) {
    const db = getDb();
    const [lot] = await db
      .select()
      .from(lots)
      .where(and(eq(lots.lotNumber, lotNumber), eq(lots.organizationId, organizationId)));
    return lot;
  },

  async createLot(data: InsertLot) {
    const db = getDb();
    const [lot] = await db.insert(lots).values(data).returning();
    return lot;
  },

  async updateLot(id: string, organizationId: string, data: Partial<InsertLot>) {
    const db = getDb();
    const [lot] = await db
      .update(lots)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(lots.id, id), eq(lots.organizationId, organizationId)))
      .returning();
    return lot;
  },

  async recordMovement(data: InsertLotMovement) {
    const db = getDb();
    const [movement] = await db.insert(lotMovements).values(data).returning();

    // Update lot quantity
    await db
      .update(lots)
      .set({ currentQuantity: data.quantityAfter, updatedAt: new Date() })
      .where(eq(lots.id, data.lotId));

    return movement;
  },

  async getExpiringLots(organizationId: string, daysAhead: number = 7) {
    const db = getDb();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const allLots = await db
      .select()
      .from(lots)
      .where(eq(lots.organizationId, organizationId));

    return allLots.filter(
      (lot) =>
        lot.expiryDate &&
        lot.expiryDate <= futureDate &&
        lot.status === 'available'
    );
  },

  async getLotStats(organizationId: string) {
    const db = getDb();
    const allLots = await db
      .select()
      .from(lots)
      .where(eq(lots.organizationId, organizationId));

    const today = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);

    return {
      totalLots: allLots.length,
      availableLots: allLots.filter((l) => l.status === 'available').length,
      quarantineLots: allLots.filter((l) => l.status === 'quarantine').length,
      expiredLots: allLots.filter((l) => l.status === 'expired').length,
      expiringWithin7Days: allLots.filter(
        (l) => l.expiryDate && l.expiryDate <= sevenDays && l.expiryDate > today && l.status === 'available'
      ).length,
    };
  },

  // ============================================
  // PRODUCTION TRACEABILITY
  // ============================================

  async traceProductionBatch(organizationId: string, outputLotId: string) {
    const db = getDb();

    // Get production record
    const [production] = await db
      .select()
      .from(productionTraceability)
      .where(
        and(
          eq(productionTraceability.outputLotId, outputLotId),
          eq(productionTraceability.organizationId, organizationId)
        )
      );

    if (!production) return null;

    // Get input lots
    const inputs = await db
      .select()
      .from(productionInputLots)
      .where(eq(productionInputLots.productionTraceabilityId, production.id));

    // Get details of each input lot
    const inputDetails = await Promise.all(
      inputs.map(async (input) => {
        const [lot] = await db.select().from(lots).where(eq(lots.id, input.inputLotId));
        return { ...input, lot };
      })
    );

    return { ...production, inputs: inputDetails };
  },

  // ============================================
  // HACCP CONTROL POINTS
  // ============================================

  async listControlPoints(organizationId: string) {
    const db = getDb();
    return db
      .select()
      .from(haccpControlPoints)
      .where(eq(haccpControlPoints.organizationId, organizationId))
      .orderBy(haccpControlPoints.code);
  },

  async getControlPointById(organizationId: string, id: string) {
    const db = getDb();
    const [cp] = await db
      .select()
      .from(haccpControlPoints)
      .where(and(eq(haccpControlPoints.id, id), eq(haccpControlPoints.organizationId, organizationId)));
    return cp;
  },

  async createControlPoint(data: InsertHaccpControlPoint) {
    const db = getDb();
    const [cp] = await db.insert(haccpControlPoints).values(data).returning();
    return cp;
  },

  async updateControlPoint(id: string, organizationId: string, data: Partial<InsertHaccpControlPoint>) {
    const db = getDb();
    const [cp] = await db
      .update(haccpControlPoints)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(haccpControlPoints.id, id), eq(haccpControlPoints.organizationId, organizationId)))
      .returning();
    return cp;
  },

  async deleteControlPoint(id: string, organizationId: string) {
    const db = getDb();
    await db
      .delete(haccpControlPoints)
      .where(and(eq(haccpControlPoints.id, id), eq(haccpControlPoints.organizationId, organizationId)));
  },

  // ============================================
  // HACCP RECORDS
  // ============================================

  async listRecords(
    controlPointId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ) {
    const db = getDb();
    const results = await db
      .select()
      .from(haccpRecords)
      .where(eq(haccpRecords.controlPointId, controlPointId))
      .orderBy(desc(haccpRecords.recordDate));

    return results.filter((r) => {
      if (filters?.startDate && r.recordDate < filters.startDate) return false;
      if (filters?.endDate && r.recordDate > filters.endDate) return false;
      return true;
    });
  },

  async createRecord(data: InsertHaccpRecord) {
    const db = getDb();
    const [record] = await db.insert(haccpRecords).values(data).returning();
    return record;
  },

  async getDeviations(organizationId: string, daysBack: number = 30) {
    const db = getDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const controlPoints = await db
      .select()
      .from(haccpControlPoints)
      .where(eq(haccpControlPoints.organizationId, organizationId));

    const cpIds = controlPoints.map((cp) => cp.id);
    if (cpIds.length === 0) return [];

    const allRecords = await db.select().from(haccpRecords);

    return allRecords.filter(
      (r) =>
        cpIds.includes(r.controlPointId) &&
        !r.withinLimits &&
        r.recordDate >= startDate
    );
  },

  // ============================================
  // TEMPERATURE LOGS
  // ============================================

  async listTemperatureLogs(
    organizationId: string,
    filters?: { equipmentId?: string; startDate?: Date; endDate?: Date }
  ) {
    const db = getDb();
    const results = await db
      .select()
      .from(temperatureLogs)
      .where(eq(temperatureLogs.organizationId, organizationId))
      .orderBy(desc(temperatureLogs.recordedAt));

    return results.filter((log) => {
      if (filters?.equipmentId && log.equipmentId !== filters.equipmentId) return false;
      if (filters?.startDate && log.recordedAt < filters.startDate) return false;
      if (filters?.endDate && log.recordedAt > filters.endDate) return false;
      return true;
    });
  },

  async createTemperatureLog(data: InsertTemperatureLog) {
    const db = getDb();
    const [log] = await db.insert(temperatureLogs).values(data).returning();
    return log;
  },

  async getTemperatureAlerts(organizationId: string) {
    const db = getDb();
    const logs = await db
      .select()
      .from(temperatureLogs)
      .where(eq(temperatureLogs.organizationId, organizationId));

    return logs.filter((log) => !log.withinLimits);
  },

  // ============================================
  // PRODUCT RECALLS
  // ============================================

  async listRecalls(organizationId: string) {
    const db = getDb();
    return db
      .select()
      .from(productRecalls)
      .where(eq(productRecalls.organizationId, organizationId))
      .orderBy(desc(productRecalls.recallDate));
  },

  async getRecallById(organizationId: string, id: string) {
    const db = getDb();
    const [recall] = await db
      .select()
      .from(productRecalls)
      .where(and(eq(productRecalls.id, id), eq(productRecalls.organizationId, organizationId)));
    return recall;
  },

  async createRecall(data: InsertProductRecall) {
    const db = getDb();
    const [recall] = await db.insert(productRecalls).values(data).returning();

    // Update affected lots to recalled status
    if (data.affectedLots) {
      const lotIds = JSON.parse(data.affectedLots as string);
      for (const lotId of lotIds) {
        await db.update(lots).set({ status: 'recalled', updatedAt: new Date() }).where(eq(lots.id, lotId));
      }
    }

    return recall;
  },

  async updateRecall(id: string, organizationId: string, data: Partial<InsertProductRecall>) {
    const db = getDb();
    const [recall] = await db
      .update(productRecalls)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(productRecalls.id, id), eq(productRecalls.organizationId, organizationId)))
      .returning();
    return recall;
  },

  // ============================================
  // CLEANING RECORDS
  // ============================================

  async listCleaningRecords(
    organizationId: string,
    filters?: { area?: string; status?: string }
  ) {
    const db = getDb();
    const results = await db
      .select()
      .from(cleaningRecords)
      .where(eq(cleaningRecords.organizationId, organizationId))
      .orderBy(desc(cleaningRecords.scheduledDate));

    return results.filter((r) => {
      if (filters?.area && r.area !== filters.area) return false;
      if (filters?.status && r.status !== filters.status) return false;
      return true;
    });
  },

  async createCleaningRecord(data: InsertCleaningRecord) {
    const db = getDb();
    const [record] = await db.insert(cleaningRecords).values(data).returning();
    return record;
  },

  async updateCleaningRecord(id: string, organizationId: string, data: Partial<InsertCleaningRecord>) {
    const db = getDb();
    const [record] = await db
      .update(cleaningRecords)
      .set(data)
      .where(and(eq(cleaningRecords.id, id), eq(cleaningRecords.organizationId, organizationId)))
      .returning();
    return record;
  },

  // ============================================
  // STATISTICS
  // ============================================

  async getHaccpStats(organizationId: string) {
    const db = getDb();

    const controlPoints = await db
      .select()
      .from(haccpControlPoints)
      .where(eq(haccpControlPoints.organizationId, organizationId));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalRecords = 0;
    let deviations = 0;

    for (const cp of controlPoints) {
      const records = await db
        .select()
        .from(haccpRecords)
        .where(eq(haccpRecords.controlPointId, cp.id));

      const recentRecords = records.filter((r) => r.recordDate >= thirtyDaysAgo);
      totalRecords += recentRecords.length;
      deviations += recentRecords.filter((r) => !r.withinLimits).length;
    }

    const recalls = await db
      .select()
      .from(productRecalls)
      .where(eq(productRecalls.organizationId, organizationId));

    const activeRecalls = recalls.filter((r) => r.status !== 'closed').length;

    return {
      totalControlPoints: controlPoints.length,
      activeControlPoints: controlPoints.filter((cp) => cp.active).length,
      recordsLast30Days: totalRecords,
      deviationsLast30Days: deviations,
      complianceRate: totalRecords > 0 ? ((totalRecords - deviations) / totalRecords) * 100 : 100,
      activeRecalls,
    };
  },
};
