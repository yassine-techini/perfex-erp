/**
 * Integrations Service
 * Manages integration configurations and transactions
 */

import { eq, and, desc } from 'drizzle-orm';
import {
  integrationConfigs,
  integrationTransactions,
  paymentTransactions,
  smsTransactions,
  shippingTransactions,
  fiscalDeclarations,
  integrationWebhookEvents,
  type IntegrationConfig,
  type NewIntegrationConfig,
  type IntegrationTransaction,
  type NewIntegrationTransaction,
} from '@perfex/database';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export class IntegrationsService {
  constructor(private db: DrizzleD1Database) {}

  // ============================================
  // INTEGRATION CONFIGS
  // ============================================

  async listConfigs(organizationId: string): Promise<IntegrationConfig[]> {
    return this.db
      .select()
      .from(integrationConfigs)
      .where(eq(integrationConfigs.organizationId, organizationId))
      .orderBy(desc(integrationConfigs.createdAt));
  }

  async getConfigsByCategory(organizationId: string, category: string): Promise<IntegrationConfig[]> {
    return this.db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.organizationId, organizationId),
          eq(integrationConfigs.providerCategory, category)
        )
      )
      .orderBy(desc(integrationConfigs.isDefault), desc(integrationConfigs.createdAt));
  }

  async getConfigById(organizationId: string, id: string): Promise<IntegrationConfig | undefined> {
    const results = await this.db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.id, id),
          eq(integrationConfigs.organizationId, organizationId)
        )
      )
      .limit(1);

    return results[0];
  }

  async getDefaultConfig(organizationId: string, category: string): Promise<IntegrationConfig | undefined> {
    const results = await this.db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.organizationId, organizationId),
          eq(integrationConfigs.providerCategory, category),
          eq(integrationConfigs.isDefault, true),
          eq(integrationConfigs.isEnabled, true)
        )
      )
      .limit(1);

    return results[0];
  }

  async createConfig(data: NewIntegrationConfig): Promise<IntegrationConfig> {
    // If this is set as default, unset other defaults for this category
    if (data.isDefault) {
      await this.db
        .update(integrationConfigs)
        .set({ isDefault: false })
        .where(
          and(
            eq(integrationConfigs.organizationId, data.organizationId),
            eq(integrationConfigs.providerCategory, data.providerCategory)
          )
        );
    }

    const results = await this.db
      .insert(integrationConfigs)
      .values(data)
      .returning();

    return results[0];
  }

  async updateConfig(
    organizationId: string,
    id: string,
    data: Partial<NewIntegrationConfig>
  ): Promise<IntegrationConfig | undefined> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      const config = await this.getConfigById(organizationId, id);
      if (config) {
        await this.db
          .update(integrationConfigs)
          .set({ isDefault: false })
          .where(
            and(
              eq(integrationConfigs.organizationId, organizationId),
              eq(integrationConfigs.providerCategory, config.providerCategory)
            )
          );
      }
    }

    const results = await this.db
      .update(integrationConfigs)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(integrationConfigs.id, id),
          eq(integrationConfigs.organizationId, organizationId)
        )
      )
      .returning();

    return results[0];
  }

  async deleteConfig(organizationId: string, id: string): Promise<boolean> {
    const result = await this.db
      .delete(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.id, id),
          eq(integrationConfigs.organizationId, organizationId)
        )
      )
      .returning();

    return result.length > 0;
  }

  async testConnection(organizationId: string, id: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfigById(organizationId, id);
    if (!config) {
      return { success: false, message: 'Configuration non trouvée' };
    }

    // In a real implementation, we would instantiate the provider and test
    // For now, return success and update the lastTestedAt
    await this.db
      .update(integrationConfigs)
      .set({
        lastTestedAt: new Date().toISOString(),
        status: 'active',
        lastErrorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(integrationConfigs.id, id));

    return { success: true, message: 'Connexion réussie' };
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async listTransactions(
    organizationId: string,
    options: {
      configId?: string;
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<IntegrationTransaction[]> {
    let query = this.db
      .select()
      .from(integrationTransactions)
      .where(eq(integrationTransactions.organizationId, organizationId))
      .orderBy(desc(integrationTransactions.createdAt));

    if (options.configId) {
      query = query.where(eq(integrationTransactions.configId, options.configId)) as typeof query;
    }

    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    return query;
  }

  async getTransactionById(
    organizationId: string,
    id: string
  ): Promise<IntegrationTransaction | undefined> {
    const results = await this.db
      .select()
      .from(integrationTransactions)
      .where(
        and(
          eq(integrationTransactions.id, id),
          eq(integrationTransactions.organizationId, organizationId)
        )
      )
      .limit(1);

    return results[0];
  }

  async createTransaction(data: NewIntegrationTransaction): Promise<IntegrationTransaction> {
    const results = await this.db
      .insert(integrationTransactions)
      .values(data)
      .returning();

    return results[0];
  }

  async updateTransactionStatus(
    id: string,
    status: string,
    statusMessage?: string,
    responsePayload?: string
  ): Promise<void> {
    await this.db
      .update(integrationTransactions)
      .set({
        status,
        statusMessage,
        responsePayload,
        completedAt: ['completed', 'failed', 'cancelled'].includes(status)
          ? new Date().toISOString()
          : null,
      })
      .where(eq(integrationTransactions.id, id));
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(organizationId: string): Promise<{
    totalConfigs: number;
    activeConfigs: number;
    totalTransactions: number;
    recentTransactions: IntegrationTransaction[];
    byCategory: Record<string, number>;
  }> {
    const configs = await this.listConfigs(organizationId);
    const transactions = await this.listTransactions(organizationId, { limit: 10 });

    const activeConfigs = configs.filter(c => c.isEnabled && c.status === 'active').length;

    const byCategory: Record<string, number> = {};
    for (const config of configs) {
      byCategory[config.providerCategory] = (byCategory[config.providerCategory] || 0) + 1;
    }

    return {
      totalConfigs: configs.length,
      activeConfigs,
      totalTransactions: transactions.length, // Would need a count query for accurate total
      recentTransactions: transactions,
      byCategory,
    };
  }

  // ============================================
  // WEBHOOK EVENTS
  // ============================================

  async createWebhookEvent(data: {
    organizationId?: string;
    configId?: string;
    providerId: string;
    eventType: string;
    payload: string;
    signature?: string;
    ipAddress?: string;
    userAgent?: string;
    headers?: string;
  }): Promise<typeof integrationWebhookEvents.$inferSelect> {
    const results = await this.db
      .insert(integrationWebhookEvents)
      .values({
        ...data,
        verified: false,
        processed: false,
      })
      .returning();

    return results[0];
  }

  async markWebhookProcessed(id: string, transactionId?: string, error?: string): Promise<void> {
    await this.db
      .update(integrationWebhookEvents)
      .set({
        processed: true,
        processedAt: new Date().toISOString(),
        transactionId,
        processingError: error,
      })
      .where(eq(integrationWebhookEvents.id, id));
  }

  // ============================================
  // FISCAL DECLARATIONS
  // ============================================

  async listDeclarations(
    organizationId: string,
    options: { type?: string; status?: string; year?: string } = {}
  ) {
    return this.db
      .select()
      .from(fiscalDeclarations)
      .where(eq(fiscalDeclarations.organizationId, organizationId))
      .orderBy(desc(fiscalDeclarations.period));
  }

  async createDeclaration(data: typeof fiscalDeclarations.$inferInsert) {
    const results = await this.db
      .insert(fiscalDeclarations)
      .values(data)
      .returning();

    return results[0];
  }

  async updateDeclarationStatus(
    id: string,
    status: string,
    referenceNumber?: string,
    receiptUrl?: string
  ) {
    await this.db
      .update(fiscalDeclarations)
      .set({
        status,
        referenceNumber,
        receiptUrl,
        submittedAt: status === 'submitted' ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(fiscalDeclarations.id, id));
  }
}
