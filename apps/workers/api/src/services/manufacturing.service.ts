/**
 * Manufacturing Service
 * Manage BOMs, routings, work orders, and production
 */

import { eq, and, desc, like } from 'drizzle-orm';
import { drizzleDb } from '../db';
import {
  billOfMaterials,
  bomLines,
  routings,
  routingOperations,
  workOrders,
  workOrderOperations,
  materialConsumption,
} from '@perfex/database';
import type {
  BillOfMaterials,
  Routing,
  WorkOrder,
  CreateBOMInput,
  UpdateBOMInput,
  CreateRoutingInput,
  UpdateRoutingInput,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
} from '@perfex/shared';

export class ManufacturingService {
  // ============================================
  // BILL OF MATERIALS (BOM)
  // ============================================

  async createBOM(organizationId: string, userId: string, data: CreateBOMInput): Promise<BillOfMaterials> {
    const now = new Date();
    const bomId = crypto.randomUUID();
    const bomNumber = `BOM-${Date.now()}`;

    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : null;
    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;

    await drizzleDb.insert(billOfMaterials).values({
      id: bomId,
      organizationId,
      bomNumber,
      productId: data.productId,
      version: data.version || '1.0',
      description: data.description || null,
      quantity: data.quantity || 1,
      unit: data.unit || 'unit',
      status: 'draft',
      effectiveDate,
      expiryDate,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert BOM lines
    for (const line of data.lines) {
      await drizzleDb.insert(bomLines).values({
        id: crypto.randomUUID(),
        organizationId,
        bomId,
        itemId: line.itemId,
        quantity: line.quantity,
        unit: line.unit || 'unit',
        scrapPercent: line.scrapPercent || 0,
        position: line.position || 0,
        notes: line.notes || null,
        createdAt: now,
      });
    }

    const bom = await this.getBOMById(organizationId, bomId);
    if (!bom) throw new Error('Failed to create BOM');
    return bom;
  }

  async getBOMById(organizationId: string, bomId: string): Promise<BillOfMaterials | null> {
    const bom = await drizzleDb
      .select()
      .from(billOfMaterials)
      .where(and(eq(billOfMaterials.id, bomId), eq(billOfMaterials.organizationId, organizationId)))
      .get() as any;
    return bom || null;
  }

  async listBOMs(organizationId: string, filters?: { productId?: string; status?: string }): Promise<BillOfMaterials[]> {
    let query = drizzleDb.select().from(billOfMaterials).where(eq(billOfMaterials.organizationId, organizationId));

    if (filters?.productId) {
      query = query.where(and(eq(billOfMaterials.organizationId, organizationId), eq(billOfMaterials.productId, filters.productId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(billOfMaterials.organizationId, organizationId), eq(billOfMaterials.status, filters.status as any)));
    }

    return await query.orderBy(desc(billOfMaterials.createdAt)).all() as any[];
  }

  async updateBOM(organizationId: string, bomId: string, data: UpdateBOMInput): Promise<BillOfMaterials> {
    const existing = await this.getBOMById(organizationId, bomId);
    if (!existing) throw new Error('BOM not found');

    const updateData: any = { ...data };
    if (data.effectiveDate) {
      updateData.effectiveDate = new Date(data.effectiveDate);
    }
    if (data.expiryDate) {
      updateData.expiryDate = new Date(data.expiryDate);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(billOfMaterials)
      .set(updateData)
      .where(and(eq(billOfMaterials.id, bomId), eq(billOfMaterials.organizationId, organizationId)));

    const updated = await this.getBOMById(organizationId, bomId);
    if (!updated) throw new Error('Failed to update BOM');
    return updated;
  }

  async deleteBOM(organizationId: string, bomId: string): Promise<void> {
    const existing = await this.getBOMById(organizationId, bomId);
    if (!existing) throw new Error('BOM not found');

    await drizzleDb
      .delete(billOfMaterials)
      .where(and(eq(billOfMaterials.id, bomId), eq(billOfMaterials.organizationId, organizationId)));
  }

  // ============================================
  // ROUTINGS
  // ============================================

  async createRouting(organizationId: string, userId: string, data: CreateRoutingInput): Promise<Routing> {
    const now = new Date();
    const routingId = crypto.randomUUID();
    const routingNumber = `RTG-${Date.now()}`;

    await drizzleDb.insert(routings).values({
      id: routingId,
      organizationId,
      routingNumber,
      productId: data.productId,
      description: data.description || null,
      status: 'draft',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert routing operations
    for (const operation of data.operations) {
      await drizzleDb.insert(routingOperations).values({
        id: crypto.randomUUID(),
        organizationId,
        routingId,
        operationNumber: operation.operationNumber,
        name: operation.name,
        description: operation.description || null,
        workCenter: operation.workCenter || null,
        setupTime: operation.setupTime || 0,
        cycleTime: operation.cycleTime || 0,
        laborCost: operation.laborCost || 0,
        overheadCost: operation.overheadCost || 0,
        position: operation.position || 0,
        createdAt: now,
      });
    }

    const routing = await this.getRoutingById(organizationId, routingId);
    if (!routing) throw new Error('Failed to create routing');
    return routing;
  }

  async getRoutingById(organizationId: string, routingId: string): Promise<Routing | null> {
    const routing = await drizzleDb
      .select()
      .from(routings)
      .where(and(eq(routings.id, routingId), eq(routings.organizationId, organizationId)))
      .get() as any;
    return routing || null;
  }

  async listRoutings(organizationId: string, filters?: { productId?: string; status?: string }): Promise<Routing[]> {
    let query = drizzleDb.select().from(routings).where(eq(routings.organizationId, organizationId));

    if (filters?.productId) {
      query = query.where(and(eq(routings.organizationId, organizationId), eq(routings.productId, filters.productId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(routings.organizationId, organizationId), eq(routings.status, filters.status as any)));
    }

    return await query.orderBy(desc(routings.createdAt)).all() as any[];
  }

  async updateRouting(organizationId: string, routingId: string, data: UpdateRoutingInput): Promise<Routing> {
    const existing = await this.getRoutingById(organizationId, routingId);
    if (!existing) throw new Error('Routing not found');

    await drizzleDb
      .update(routings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(routings.id, routingId), eq(routings.organizationId, organizationId)));

    const updated = await this.getRoutingById(organizationId, routingId);
    if (!updated) throw new Error('Failed to update routing');
    return updated;
  }

  async deleteRouting(organizationId: string, routingId: string): Promise<void> {
    const existing = await this.getRoutingById(organizationId, routingId);
    if (!existing) throw new Error('Routing not found');

    await drizzleDb
      .delete(routings)
      .where(and(eq(routings.id, routingId), eq(routings.organizationId, organizationId)));
  }

  // ============================================
  // WORK ORDERS
  // ============================================

  async createWorkOrder(organizationId: string, userId: string, data: CreateWorkOrderInput): Promise<WorkOrder> {
    const now = new Date();
    const workOrderId = crypto.randomUUID();
    const workOrderNumber = `WO-${Date.now()}`;

    const scheduledStartDate = data.scheduledStartDate ? new Date(data.scheduledStartDate) : null;
    const scheduledEndDate = data.scheduledEndDate ? new Date(data.scheduledEndDate) : null;

    await drizzleDb.insert(workOrders).values({
      id: workOrderId,
      organizationId,
      workOrderNumber,
      productId: data.productId,
      bomId: data.bomId || null,
      routingId: data.routingId || null,
      salesOrderId: data.salesOrderId || null,
      quantityPlanned: data.quantityPlanned,
      quantityProduced: 0,
      unit: data.unit || 'unit',
      status: 'draft',
      priority: data.priority || 'normal',
      scheduledStartDate,
      scheduledEndDate,
      actualStartDate: null,
      actualEndDate: null,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const workOrder = await this.getWorkOrderById(organizationId, workOrderId);
    if (!workOrder) throw new Error('Failed to create work order');
    return workOrder;
  }

  async getWorkOrderById(organizationId: string, workOrderId: string): Promise<WorkOrder | null> {
    const workOrder = await drizzleDb
      .select()
      .from(workOrders)
      .where(and(eq(workOrders.id, workOrderId), eq(workOrders.organizationId, organizationId)))
      .get() as any;
    return workOrder || null;
  }

  async listWorkOrders(organizationId: string, filters?: { status?: string; priority?: string; search?: string }): Promise<WorkOrder[]> {
    let query = drizzleDb.select().from(workOrders).where(eq(workOrders.organizationId, organizationId));

    if (filters?.status) {
      query = query.where(and(eq(workOrders.organizationId, organizationId), eq(workOrders.status, filters.status as any)));
    }

    if (filters?.priority) {
      query = query.where(and(eq(workOrders.organizationId, organizationId), eq(workOrders.priority, filters.priority as any)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(workOrders.organizationId, organizationId),
          like(workOrders.workOrderNumber, searchTerm)
        )
      );
    }

    return await query.orderBy(desc(workOrders.createdAt)).all() as any[];
  }

  async updateWorkOrder(organizationId: string, workOrderId: string, data: UpdateWorkOrderInput): Promise<WorkOrder> {
    const existing = await this.getWorkOrderById(organizationId, workOrderId);
    if (!existing) throw new Error('Work order not found');

    const updateData: any = { ...data };
    if (data.scheduledStartDate) {
      updateData.scheduledStartDate = new Date(data.scheduledStartDate);
    }
    if (data.scheduledEndDate) {
      updateData.scheduledEndDate = new Date(data.scheduledEndDate);
    }
    if (data.actualStartDate) {
      updateData.actualStartDate = new Date(data.actualStartDate);
    }
    if (data.actualEndDate) {
      updateData.actualEndDate = new Date(data.actualEndDate);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(workOrders)
      .set(updateData)
      .where(and(eq(workOrders.id, workOrderId), eq(workOrders.organizationId, organizationId)));

    const updated = await this.getWorkOrderById(organizationId, workOrderId);
    if (!updated) throw new Error('Failed to update work order');
    return updated;
  }

  async deleteWorkOrder(organizationId: string, workOrderId: string): Promise<void> {
    const existing = await this.getWorkOrderById(organizationId, workOrderId);
    if (!existing) throw new Error('Work order not found');

    await drizzleDb
      .delete(workOrders)
      .where(and(eq(workOrders.id, workOrderId), eq(workOrders.organizationId, organizationId)));
  }

  async getStats(organizationId: string): Promise<{
    totalBOMs: number;
    activeBOMs: number;
    totalWorkOrders: number;
    inProgressOrders: number;
  }> {
    const allBOMs = await this.listBOMs(organizationId);
    const allWorkOrders = await this.listWorkOrders(organizationId);

    return {
      totalBOMs: allBOMs.length,
      activeBOMs: allBOMs.filter(b => b.status === 'active').length,
      totalWorkOrders: allWorkOrders.length,
      inProgressOrders: allWorkOrders.filter(w => w.status === 'in_progress' || w.status === 'released').length,
    };
  }
}

export const manufacturingService = new ManufacturingService();
