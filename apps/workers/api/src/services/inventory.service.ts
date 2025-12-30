/**
 * Inventory Service
 * Manage inventory items and stock levels
 */

import { eq, and, desc, like, or } from 'drizzle-orm';
import { drizzleDb } from '../db';
import { inventoryItems, warehouses, stockLevels } from '@perfex/database';
import type { InventoryItem, Warehouse, CreateInventoryItemInput, UpdateInventoryItemInput, CreateWarehouseInput, UpdateWarehouseInput } from '@perfex/shared';

export class InventoryService {
  /**
   * Create inventory item
   */
  async createItem(organizationId: string, userId: string, data: CreateInventoryItemInput): Promise<InventoryItem> {
    const now = new Date();
    const itemId = crypto.randomUUID();

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

    await drizzleDb.insert(inventoryItems).values({
      id: itemId,
      organizationId,
      sku: data.sku,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      costPrice: data.costPrice || null,
      sellingPrice: data.sellingPrice || null,
      currency: data.currency || 'EUR',
      unit: data.unit || 'unit',
      trackInventory: data.trackInventory ?? true,
      minStockLevel: data.minStockLevel ?? 0,
      maxStockLevel: data.maxStockLevel || null,
      reorderQuantity: data.reorderQuantity || null,
      active: data.active ?? true,
      imageUrl: data.imageUrl || null,
      barcode: data.barcode || null,
      tags: tagsJson,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const item = await this.getItemById(organizationId, itemId);
    if (!item) {
      throw new Error('Failed to create inventory item');
    }

    return item;
  }

  /**
   * Get item by ID
   */
  async getItemById(organizationId: string, itemId: string): Promise<InventoryItem | null> {
    const item = await drizzleDb
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId)))
      .get() as any;

    return item || null;
  }

  /**
   * List inventory items
   */
  async listItems(
    organizationId: string,
    filters?: {
      category?: string;
      active?: string;
      search?: string;
    }
  ): Promise<InventoryItem[]> {
    let query = drizzleDb
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.organizationId, organizationId));

    if (filters?.category) {
      query = query.where(and(eq(inventoryItems.organizationId, organizationId), eq(inventoryItems.category, filters.category)));
    }

    if (filters?.active) {
      const isActive = filters.active === 'true';
      query = query.where(and(eq(inventoryItems.organizationId, organizationId), eq(inventoryItems.active, isActive)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(inventoryItems.organizationId, organizationId),
          or(
            like(inventoryItems.name, searchTerm),
            like(inventoryItems.sku, searchTerm),
            like(inventoryItems.description, searchTerm)
          )
        )
      );
    }

    const results = await query.orderBy(desc(inventoryItems.createdAt)).all() as any[];
    return results;
  }

  /**
   * Update inventory item
   */
  async updateItem(organizationId: string, itemId: string, data: UpdateInventoryItemInput): Promise<InventoryItem> {
    const existing = await this.getItemById(organizationId, itemId);
    if (!existing) {
      throw new Error('Inventory item not found');
    }

    const tagsJson = data.tags ? JSON.stringify(data.tags) : undefined;

    const updateData: any = {
      ...data,
      tags: tagsJson,
      updatedAt: new Date(),
    };

    await drizzleDb
      .update(inventoryItems)
      .set(updateData)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId)));

    const updated = await this.getItemById(organizationId, itemId);
    if (!updated) {
      throw new Error('Failed to update inventory item');
    }

    return updated;
  }

  /**
   * Delete inventory item
   */
  async deleteItem(organizationId: string, itemId: string): Promise<void> {
    const existing = await this.getItemById(organizationId, itemId);
    if (!existing) {
      throw new Error('Inventory item not found');
    }

    await drizzleDb
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId)));
  }

  /**
   * Create warehouse
   */
  async createWarehouse(organizationId: string, userId: string, data: CreateWarehouseInput): Promise<Warehouse> {
    const now = new Date();
    const warehouseId = crypto.randomUUID();

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await drizzleDb
        .update(warehouses)
        .set({ isDefault: false })
        .where(eq(warehouses.organizationId, organizationId));
    }

    await drizzleDb.insert(warehouses).values({
      id: warehouseId,
      organizationId,
      name: data.name,
      code: data.code,
      description: data.description || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      contactPerson: data.contactPerson || null,
      phone: data.phone || null,
      email: data.email || null,
      isDefault: data.isDefault ?? false,
      active: data.active ?? true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const warehouse = await this.getWarehouseById(organizationId, warehouseId);
    if (!warehouse) {
      throw new Error('Failed to create warehouse');
    }

    return warehouse;
  }

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(organizationId: string, warehouseId: string): Promise<Warehouse | null> {
    const warehouse = await drizzleDb
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.id, warehouseId), eq(warehouses.organizationId, organizationId)))
      .get() as any;

    return warehouse || null;
  }

  /**
   * List warehouses
   */
  async listWarehouses(organizationId: string, filters?: { active?: string }): Promise<Warehouse[]> {
    let query = drizzleDb
      .select()
      .from(warehouses)
      .where(eq(warehouses.organizationId, organizationId));

    if (filters?.active) {
      const isActive = filters.active === 'true';
      query = query.where(and(eq(warehouses.organizationId, organizationId), eq(warehouses.active, isActive)));
    }

    const results = await query.orderBy(desc(warehouses.createdAt)).all() as any[];
    return results;
  }

  /**
   * Update warehouse
   */
  async updateWarehouse(organizationId: string, warehouseId: string, data: UpdateWarehouseInput): Promise<Warehouse> {
    const existing = await this.getWarehouseById(organizationId, warehouseId);
    if (!existing) {
      throw new Error('Warehouse not found');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await drizzleDb
        .update(warehouses)
        .set({ isDefault: false })
        .where(eq(warehouses.organizationId, organizationId));
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    await drizzleDb
      .update(warehouses)
      .set(updateData)
      .where(and(eq(warehouses.id, warehouseId), eq(warehouses.organizationId, organizationId)));

    const updated = await this.getWarehouseById(organizationId, warehouseId);
    if (!updated) {
      throw new Error('Failed to update warehouse');
    }

    return updated;
  }

  /**
   * Delete warehouse
   */
  async deleteWarehouse(organizationId: string, warehouseId: string): Promise<void> {
    const existing = await this.getWarehouseById(organizationId, warehouseId);
    if (!existing) {
      throw new Error('Warehouse not found');
    }

    await drizzleDb
      .delete(warehouses)
      .where(and(eq(warehouses.id, warehouseId), eq(warehouses.organizationId, organizationId)));
  }

  /**
   * Get inventory statistics
   */
  async getStats(organizationId: string): Promise<{
    totalItems: number;
    activeItems: number;
    totalWarehouses: number;
    lowStockItems: number;
  }> {
    const allItems = await this.listItems(organizationId);
    const allWarehouses = await this.listWarehouses(organizationId);

    return {
      totalItems: allItems.length,
      activeItems: allItems.filter(i => i.active).length,
      totalWarehouses: allWarehouses.length,
      lowStockItems: 0, // TODO: Calculate from stock levels
    };
  }
}

export const inventoryService = new InventoryService();
