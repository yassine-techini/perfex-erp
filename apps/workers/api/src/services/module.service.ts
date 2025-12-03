/**
 * Module Service
 * Manages module activation and configuration for organizations
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import {
  moduleRegistry,
  organizationModules,
  DEFAULT_MODULES,
} from '@perfex/database';

export class ModuleService {
  private db: ReturnType<typeof drizzle>;

  constructor(d1: D1Database) {
    this.db = drizzle(d1);
  }

  /**
   * Get all available modules from registry
   */
  async getModuleRegistry() {
    const modules = await this.db
      .select()
      .from(moduleRegistry)
      .orderBy(moduleRegistry.sortOrder);

    return modules;
  }

  /**
   * Get modules for an organization with their enabled status
   */
  async getOrganizationModules(orgId: string) {
    // Get all modules from registry
    const allModules = await this.db
      .select()
      .from(moduleRegistry)
      .orderBy(moduleRegistry.sortOrder);

    // Get organization's module settings
    const orgModules = await this.db
      .select()
      .from(organizationModules)
      .where(eq(organizationModules.organizationId, orgId));

    // Create a map of org module settings
    const orgModuleMap = new Map(
      orgModules.map(m => [m.moduleId, m])
    );

    // Merge with defaults
    return allModules.map(mod => {
      const orgMod = orgModuleMap.get(mod.id);
      return {
        ...mod,
        enabled: orgMod ? orgMod.enabled : mod.isDefault,
        settings: orgMod?.settings ? JSON.parse(orgMod.settings) : null,
        enabledAt: orgMod?.enabledAt,
        enabledBy: orgMod?.enabledBy,
      };
    });
  }

  /**
   * Get only enabled module IDs for an organization (optimized for navigation)
   */
  async getEnabledModuleIds(orgId: string): Promise<string[]> {
    // Get organization's module settings
    const orgModules = await this.db
      .select({
        moduleId: organizationModules.moduleId,
        enabled: organizationModules.enabled,
      })
      .from(organizationModules)
      .where(eq(organizationModules.organizationId, orgId));

    // Get default modules
    const defaultModules = await this.db
      .select({
        id: moduleRegistry.id,
        isDefault: moduleRegistry.isDefault,
      })
      .from(moduleRegistry);

    // Create a map of org module settings
    const orgModuleMap = new Map(
      orgModules.map(m => [m.moduleId, m.enabled])
    );

    // Return enabled modules
    const enabledModules: string[] = [];
    for (const mod of defaultModules) {
      const orgEnabled = orgModuleMap.get(mod.id);
      if (orgEnabled !== undefined) {
        if (orgEnabled) enabledModules.push(mod.id);
      } else if (mod.isDefault) {
        enabledModules.push(mod.id);
      }
    }

    return enabledModules;
  }

  /**
   * Update a module's status for an organization
   */
  async updateOrganizationModule(
    orgId: string,
    moduleId: string,
    data: {
      enabled: boolean;
      settings?: Record<string, unknown>;
      enabledBy?: string;
    }
  ) {
    // Check if module exists in registry
    const [module] = await this.db
      .select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.id, moduleId))
      .limit(1);

    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    // Check if org module record exists
    const [existing] = await this.db
      .select()
      .from(organizationModules)
      .where(
        and(
          eq(organizationModules.organizationId, orgId),
          eq(organizationModules.moduleId, moduleId)
        )
      )
      .limit(1);

    const now = new Date();

    if (existing) {
      // Update existing
      await this.db
        .update(organizationModules)
        .set({
          enabled: data.enabled,
          settings: data.settings ? JSON.stringify(data.settings) : existing.settings,
          enabledAt: data.enabled ? now : null,
          enabledBy: data.enabled ? data.enabledBy : null,
          updatedAt: now,
        })
        .where(eq(organizationModules.id, existing.id));

      return {
        ...existing,
        enabled: data.enabled,
        settings: data.settings,
        updatedAt: now,
      };
    } else {
      // Create new
      const [newOrgModule] = await this.db
        .insert(organizationModules)
        .values({
          organizationId: orgId,
          moduleId: moduleId,
          enabled: data.enabled,
          settings: data.settings ? JSON.stringify(data.settings) : null,
          enabledAt: data.enabled ? now : null,
          enabledBy: data.enabled ? data.enabledBy : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return newOrgModule;
    }
  }

  /**
   * Bulk update modules for an organization
   */
  async bulkUpdateOrganizationModules(
    orgId: string,
    modules: Array<{
      moduleId: string;
      enabled: boolean;
      settings?: Record<string, unknown>;
    }>,
    enabledBy?: string
  ) {
    const results = [];

    for (const mod of modules) {
      const result = await this.updateOrganizationModule(orgId, mod.moduleId, {
        enabled: mod.enabled,
        settings: mod.settings,
        enabledBy,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Seed the module registry with default modules
   */
  async seedModuleRegistry() {
    // Check if already seeded
    const existing = await this.db.select().from(moduleRegistry).limit(1);

    if (existing.length > 0) {
      console.log('Module registry already seeded');
      return;
    }

    const now = new Date();

    for (const mod of DEFAULT_MODULES) {
      await this.db.insert(moduleRegistry).values({
        id: mod.id,
        name: mod.name,
        description: 'description' in mod ? mod.description : null,
        category: mod.category as 'core' | 'industry' | 'advanced',
        icon: mod.icon,
        isDefault: mod.isDefault,
        sortOrder: mod.sortOrder,
        dependencies: null,
        createdAt: now,
      });
    }

    console.log(`Seeded ${DEFAULT_MODULES.length} modules`);
  }

  /**
   * Initialize modules for a new organization with defaults
   */
  async initializeOrganizationModules(orgId: string, userId?: string) {
    // Get all default modules
    const defaultModules = await this.db
      .select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.isDefault, true));

    const now = new Date();

    // Create org module records for default modules
    for (const mod of defaultModules) {
      // Check if already exists
      const [existing] = await this.db
        .select()
        .from(organizationModules)
        .where(
          and(
            eq(organizationModules.organizationId, orgId),
            eq(organizationModules.moduleId, mod.id)
          )
        )
        .limit(1);

      if (!existing) {
        await this.db.insert(organizationModules).values({
          organizationId: orgId,
          moduleId: mod.id,
          enabled: true,
          enabledAt: now,
          enabledBy: userId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
}
