/**
 * Sales Service
 * Manage quotes, sales orders, and sales operations
 */

import { eq, and, desc, like, or } from 'drizzle-orm';
import { drizzleDb } from '../db';
import {
  quotes,
  salesOrders,
  salesOrderLines,
  deliveryNotes,
} from '@perfex/database';
import type {
  Quote,
  SalesOrder,
  DeliveryNote,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
} from '@perfex/shared';

export class SalesService {
  // ============================================
  // SALES ORDERS
  // ============================================

  async createSalesOrder(organizationId: string, userId: string, data: CreateSalesOrderInput): Promise<SalesOrder> {
    const now = new Date();
    const orderId = crypto.randomUUID();
    const orderNumber = `SO-${Date.now()}`;

    // Calculate totals
    let subtotal = 0;
    const lines = data.lines.map(line => {
      const lineTotal = line.quantity * line.unitPrice * (1 - line.discountPercent / 100) * (1 + line.taxRate / 100);
      subtotal += line.quantity * line.unitPrice * (1 - line.discountPercent / 100);
      return { ...line, lineTotal };
    });

    const taxAmount = lines.reduce((sum, l) => sum + (l.lineTotal - l.quantity * l.unitPrice * (1 - l.discountPercent / 100)), 0);
    const total = subtotal + taxAmount;

    const orderDate = new Date(data.orderDate);
    const expectedDeliveryDate = data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null;

    await drizzleDb.insert(salesOrders).values({
      id: orderId,
      organizationId,
      orderNumber,
      quoteId: data.quoteId || null,
      companyId: data.companyId,
      contactId: data.contactId || null,
      orderDate,
      expectedDeliveryDate,
      status: 'draft',
      subtotal,
      taxAmount,
      shippingCost: 0,
      discountAmount: 0,
      total,
      currency: data.currency || 'EUR',
      shippingAddress: data.shippingAddress || null,
      billingAddress: data.billingAddress || null,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert lines
    for (const line of lines) {
      await drizzleDb.insert(salesOrderLines).values({
        id: crypto.randomUUID(),
        organizationId,
        salesOrderId: orderId,
        itemId: line.itemId || null,
        description: line.description,
        quantity: line.quantity,
        quantityShipped: 0,
        unit: line.unit || 'unit',
        unitPrice: line.unitPrice,
        taxRate: line.taxRate || 0,
        discountPercent: line.discountPercent || 0,
        lineTotal: line.lineTotal,
        createdAt: now,
      });
    }

    const order = await this.getSalesOrderById(organizationId, orderId);
    if (!order) throw new Error('Failed to create sales order');
    return order;
  }

  async getSalesOrderById(organizationId: string, orderId: string): Promise<SalesOrder | null> {
    const order = await drizzleDb
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, orderId), eq(salesOrders.organizationId, organizationId)))
      .get() as any;
    return order || null;
  }

  async listSalesOrders(organizationId: string, filters?: { companyId?: string; status?: string; search?: string }): Promise<SalesOrder[]> {
    let query = drizzleDb.select().from(salesOrders).where(eq(salesOrders.organizationId, organizationId));

    if (filters?.companyId) {
      query = query.where(and(eq(salesOrders.organizationId, organizationId), eq(salesOrders.companyId, filters.companyId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(salesOrders.organizationId, organizationId), eq(salesOrders.status, filters.status as any)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(salesOrders.organizationId, organizationId),
          like(salesOrders.orderNumber, searchTerm)
        )
      );
    }

    return await query.orderBy(desc(salesOrders.createdAt)).all() as any[];
  }

  async updateSalesOrder(organizationId: string, orderId: string, data: UpdateSalesOrderInput): Promise<SalesOrder> {
    const existing = await this.getSalesOrderById(organizationId, orderId);
    if (!existing) throw new Error('Sales order not found');

    const updateData: any = { ...data };
    if (data.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(salesOrders)
      .set(updateData)
      .where(and(eq(salesOrders.id, orderId), eq(salesOrders.organizationId, organizationId)));

    const updated = await this.getSalesOrderById(organizationId, orderId);
    if (!updated) throw new Error('Failed to update sales order');
    return updated;
  }

  async deleteSalesOrder(organizationId: string, orderId: string): Promise<void> {
    const existing = await this.getSalesOrderById(organizationId, orderId);
    if (!existing) throw new Error('Sales order not found');

    await drizzleDb
      .delete(salesOrders)
      .where(and(eq(salesOrders.id, orderId), eq(salesOrders.organizationId, organizationId)));
  }

  async getStats(organizationId: string): Promise<{
    totalOrders: number;
    draftOrders: number;
    confirmedOrders: number;
    totalRevenue: number;
  }> {
    const allOrders = await this.listSalesOrders(organizationId);

    return {
      totalOrders: allOrders.length,
      draftOrders: allOrders.filter(o => o.status === 'draft').length,
      confirmedOrders: allOrders.filter(o => o.status === 'confirmed' || o.status === 'processing').length,
      totalRevenue: allOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0),
    };
  }
}

export const salesService = new SalesService();
