/**
 * Procurement Service
 * Manage suppliers, purchase orders, and procurement operations
 */

import { eq, and, desc, like, or } from 'drizzle-orm';
import { drizzleDb } from '../db';
import {
  suppliers,
  purchaseOrders,
  purchaseOrderLines,
} from '@perfex/database';
import type {
  Supplier,
  PurchaseOrder,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from '@perfex/shared';

export class ProcurementService {
  // ============================================
  // SUPPLIERS
  // ============================================

  async createSupplier(organizationId: string, userId: string, data: CreateSupplierInput): Promise<Supplier> {
    const now = new Date();
    const supplierId = crypto.randomUUID();

    await drizzleDb.insert(suppliers).values({
      id: supplierId,
      organizationId,
      supplierNumber: data.supplierNumber,
      name: data.name,
      companyName: data.companyName || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      taxNumber: data.taxNumber || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      paymentTerms: data.paymentTerms || null,
      currency: data.currency || 'EUR',
      creditLimit: data.creditLimit || null,
      rating: data.rating || null,
      notes: data.notes || null,
      active: data.active ?? true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const supplier = await this.getSupplierById(organizationId, supplierId);
    if (!supplier) throw new Error('Failed to create supplier');
    return supplier;
  }

  async getSupplierById(organizationId: string, supplierId: string): Promise<Supplier | null> {
    const supplier = await drizzleDb
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.organizationId, organizationId)))
      .get();
    return supplier || null;
  }

  async listSuppliers(organizationId: string, filters?: { active?: string; search?: string }): Promise<Supplier[]> {
    let query = drizzleDb.select().from(suppliers).where(eq(suppliers.organizationId, organizationId));

    if (filters?.active) {
      const isActive = filters.active === 'true';
      query = query.where(and(eq(suppliers.organizationId, organizationId), eq(suppliers.active, isActive)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(suppliers.organizationId, organizationId),
          or(like(suppliers.name, searchTerm), like(suppliers.supplierNumber, searchTerm), like(suppliers.email, searchTerm))
        )
      );
    }

    return await query.orderBy(desc(suppliers.createdAt)).all();
  }

  async updateSupplier(organizationId: string, supplierId: string, data: UpdateSupplierInput): Promise<Supplier> {
    const existing = await this.getSupplierById(organizationId, supplierId);
    if (!existing) throw new Error('Supplier not found');

    await drizzleDb
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.organizationId, organizationId)));

    const updated = await this.getSupplierById(organizationId, supplierId);
    if (!updated) throw new Error('Failed to update supplier');
    return updated;
  }

  async deleteSupplier(organizationId: string, supplierId: string): Promise<void> {
    const existing = await this.getSupplierById(organizationId, supplierId);
    if (!existing) throw new Error('Supplier not found');

    await drizzleDb
      .delete(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.organizationId, organizationId)));
  }

  // ============================================
  // PURCHASE ORDERS
  // ============================================

  async createPurchaseOrder(organizationId: string, userId: string, data: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    const now = new Date();
    const orderId = crypto.randomUUID();
    const orderNumber = `PO-${Date.now()}`;

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

    await drizzleDb.insert(purchaseOrders).values({
      id: orderId,
      organizationId,
      orderNumber,
      supplierId: data.supplierId,
      requisitionId: data.requisitionId || null,
      orderDate,
      expectedDeliveryDate,
      status: 'draft',
      subtotal,
      taxAmount,
      shippingCost: 0,
      discountAmount: 0,
      total,
      currency: data.currency || 'EUR',
      paymentTerms: data.paymentTerms || null,
      shippingAddress: data.shippingAddress || null,
      billingAddress: data.billingAddress || null,
      notes: data.notes || null,
      internalNotes: data.internalNotes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Insert lines
    for (const line of lines) {
      await drizzleDb.insert(purchaseOrderLines).values({
        id: crypto.randomUUID(),
        organizationId,
        purchaseOrderId: orderId,
        itemId: line.itemId || null,
        description: line.description,
        quantity: line.quantity,
        quantityReceived: 0,
        unit: line.unit || 'unit',
        unitPrice: line.unitPrice,
        taxRate: line.taxRate || 0,
        discountPercent: line.discountPercent || 0,
        lineTotal: line.lineTotal,
        notes: line.notes || null,
        createdAt: now,
      });
    }

    const order = await this.getPurchaseOrderById(organizationId, orderId);
    if (!order) throw new Error('Failed to create purchase order');
    return order;
  }

  async getPurchaseOrderById(organizationId: string, orderId: string): Promise<PurchaseOrder | null> {
    const order = await drizzleDb
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.organizationId, organizationId)))
      .get();
    return order || null;
  }

  async listPurchaseOrders(organizationId: string, filters?: { supplierId?: string; status?: string }): Promise<PurchaseOrder[]> {
    let query = drizzleDb.select().from(purchaseOrders).where(eq(purchaseOrders.organizationId, organizationId));

    if (filters?.supplierId) {
      query = query.where(and(eq(purchaseOrders.organizationId, organizationId), eq(purchaseOrders.supplierId, filters.supplierId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(purchaseOrders.organizationId, organizationId), eq(purchaseOrders.status, filters.status as any)));
    }

    return await query.orderBy(desc(purchaseOrders.createdAt)).all();
  }

  async updatePurchaseOrder(organizationId: string, orderId: string, data: UpdatePurchaseOrderInput): Promise<PurchaseOrder> {
    const existing = await this.getPurchaseOrderById(organizationId, orderId);
    if (!existing) throw new Error('Purchase order not found');

    const updateData: any = { ...data };
    if (data.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(purchaseOrders)
      .set(updateData)
      .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.organizationId, organizationId)));

    const updated = await this.getPurchaseOrderById(organizationId, orderId);
    if (!updated) throw new Error('Failed to update purchase order');
    return updated;
  }

  async deletePurchaseOrder(organizationId: string, orderId: string): Promise<void> {
    const existing = await this.getPurchaseOrderById(organizationId, orderId);
    if (!existing) throw new Error('Purchase order not found');

    await drizzleDb
      .delete(purchaseOrders)
      .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.organizationId, organizationId)));
  }

  async getStats(organizationId: string): Promise<{
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchaseOrders: number;
    pendingOrders: number;
  }> {
    const allSuppliers = await this.listSuppliers(organizationId);
    const allOrders = await this.listPurchaseOrders(organizationId);

    return {
      totalSuppliers: allSuppliers.length,
      activeSuppliers: allSuppliers.filter(s => s.active).length,
      totalPurchaseOrders: allOrders.length,
      pendingOrders: allOrders.filter(o => o.status === 'draft' || o.status === 'sent').length,
    };
  }
}

export const procurementService = new ProcurementService();
