/**
 * Assets Service
 * Manage fixed assets, depreciation, and maintenance
 */

import { eq, and, desc, like } from 'drizzle-orm';
import { drizzleDb } from '../db';
import {
  assetCategories,
  fixedAssets,
  assetMaintenance,
} from '@perfex/database';
import type {
  AssetCategory,
  FixedAsset,
  AssetMaintenance as AssetMaintenanceType,
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
  CreateFixedAssetInput,
  UpdateFixedAssetInput,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
} from '@perfex/shared';

export class AssetsService {
  // ============================================
  // ASSET CATEGORIES
  // ============================================

  async createCategory(organizationId: string, userId: string, data: CreateAssetCategoryInput): Promise<AssetCategory> {
    const now = new Date();
    const categoryId = crypto.randomUUID();

    await drizzleDb.insert(assetCategories).values({
      id: categoryId,
      organizationId,
      name: data.name,
      description: data.description || null,
      depreciationMethod: data.depreciationMethod || 'straight_line',
      usefulLife: data.usefulLife || null,
      salvageValuePercent: data.salvageValuePercent || 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const category = await this.getCategoryById(organizationId, categoryId);
    if (!category) throw new Error('Failed to create category');
    return category;
  }

  async getCategoryById(organizationId: string, categoryId: string): Promise<AssetCategory | null> {
    const category = await drizzleDb
      .select()
      .from(assetCategories)
      .where(and(eq(assetCategories.id, categoryId), eq(assetCategories.organizationId, organizationId)))
      .get() as any;
    return category || null;
  }

  async listCategories(organizationId: string): Promise<AssetCategory[]> {
    return await drizzleDb
      .select()
      .from(assetCategories)
      .where(eq(assetCategories.organizationId, organizationId))
      .orderBy(desc(assetCategories.createdAt))
      .all() as any[];
  }

  // ============================================
  // FIXED ASSETS
  // ============================================

  async createAsset(organizationId: string, userId: string, data: CreateFixedAssetInput): Promise<FixedAsset> {
    const now = new Date();
    const assetId = crypto.randomUUID();
    const assetNumber = `AST-${Date.now()}`;

    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    const warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null;

    await drizzleDb.insert(fixedAssets).values({
      id: assetId,
      organizationId,
      assetNumber,
      categoryId: data.categoryId || null,
      name: data.name,
      description: data.description || null,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      location: data.location || null,
      purchaseDate,
      purchaseCost: data.purchaseCost,
      currentValue: data.purchaseCost,
      salvageValue: data.salvageValue || 0,
      usefulLife: data.usefulLife || null,
      depreciationMethod: data.depreciationMethod || 'straight_line',
      accumulatedDepreciation: 0,
      status: 'active',
      disposalDate: null,
      disposalValue: null,
      disposalNotes: null,
      warrantyExpiry,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const asset = await this.getAssetById(organizationId, assetId);
    if (!asset) throw new Error('Failed to create asset');
    return asset;
  }

  async getAssetById(organizationId: string, assetId: string): Promise<FixedAsset | null> {
    const asset = await drizzleDb
      .select()
      .from(fixedAssets)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.organizationId, organizationId)))
      .get() as any;
    return asset || null;
  }

  async listAssets(organizationId: string, filters?: { categoryId?: string; status?: string; search?: string }): Promise<FixedAsset[]> {
    let query = drizzleDb.select().from(fixedAssets).where(eq(fixedAssets.organizationId, organizationId));

    if (filters?.categoryId) {
      query = query.where(and(eq(fixedAssets.organizationId, organizationId), eq(fixedAssets.categoryId, filters.categoryId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(fixedAssets.organizationId, organizationId), eq(fixedAssets.status, filters.status as any)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(fixedAssets.organizationId, organizationId),
          like(fixedAssets.name, searchTerm)
        )
      );
    }

    return await query.orderBy(desc(fixedAssets.createdAt)).all() as any[];
  }

  async updateAsset(organizationId: string, assetId: string, data: UpdateFixedAssetInput): Promise<FixedAsset> {
    const existing = await this.getAssetById(organizationId, assetId);
    if (!existing) throw new Error('Asset not found');

    const updateData: any = { ...data };
    if (data.disposalDate) {
      updateData.disposalDate = new Date(data.disposalDate);
    }
    if (data.warrantyExpiry) {
      updateData.warrantyExpiry = new Date(data.warrantyExpiry);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(fixedAssets)
      .set(updateData)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.organizationId, organizationId)));

    const updated = await this.getAssetById(organizationId, assetId);
    if (!updated) throw new Error('Failed to update asset');
    return updated;
  }

  async deleteAsset(organizationId: string, assetId: string): Promise<void> {
    const existing = await this.getAssetById(organizationId, assetId);
    if (!existing) throw new Error('Asset not found');

    await drizzleDb
      .delete(fixedAssets)
      .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.organizationId, organizationId)));
  }

  // ============================================
  // MAINTENANCE
  // ============================================

  async createMaintenance(organizationId: string, userId: string, data: CreateMaintenanceInput): Promise<AssetMaintenanceType> {
    const now = new Date();
    const maintenanceId = crypto.randomUUID();
    const maintenanceNumber = `MNT-${Date.now()}`;

    const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
    const nextMaintenanceDate = data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null;

    await drizzleDb.insert(assetMaintenance).values({
      id: maintenanceId,
      organizationId,
      assetId: data.assetId,
      maintenanceNumber,
      type: data.type || 'preventive',
      status: 'scheduled',
      scheduledDate,
      completedDate: null,
      performedBy: data.performedBy || null,
      vendor: data.vendor || null,
      description: data.description || null,
      workPerformed: data.workPerformed || null,
      cost: data.cost || 0,
      downtime: data.downtime || 0,
      nextMaintenanceDate,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const maintenance = await this.getMaintenanceById(organizationId, maintenanceId);
    if (!maintenance) throw new Error('Failed to create maintenance record');
    return maintenance;
  }

  async getMaintenanceById(organizationId: string, maintenanceId: string): Promise<AssetMaintenanceType | null> {
    const maintenance = await drizzleDb
      .select()
      .from(assetMaintenance)
      .where(and(eq(assetMaintenance.id, maintenanceId), eq(assetMaintenance.organizationId, organizationId)))
      .get() as any;
    return maintenance || null;
  }

  async listMaintenance(organizationId: string, filters?: { assetId?: string; status?: string }): Promise<AssetMaintenanceType[]> {
    let query = drizzleDb.select().from(assetMaintenance).where(eq(assetMaintenance.organizationId, organizationId));

    if (filters?.assetId) {
      query = query.where(and(eq(assetMaintenance.organizationId, organizationId), eq(assetMaintenance.assetId, filters.assetId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(assetMaintenance.organizationId, organizationId), eq(assetMaintenance.status, filters.status as any)));
    }

    return await query.orderBy(desc(assetMaintenance.createdAt)).all() as any[];
  }

  async getStats(organizationId: string): Promise<{
    totalAssets: number;
    activeAssets: number;
    totalValue: number;
    pendingMaintenance: number;
  }> {
    const allAssets = await this.listAssets(organizationId);
    const allMaintenance = await this.listMaintenance(organizationId);

    return {
      totalAssets: allAssets.length,
      activeAssets: allAssets.filter(a => a.status === 'active').length,
      totalValue: allAssets.filter(a => a.status === 'active').reduce((sum, a) => sum + a.currentValue, 0),
      pendingMaintenance: allMaintenance.filter(m => m.status === 'scheduled').length,
    };
  }
}

export const assetsService = new AssetsService();
