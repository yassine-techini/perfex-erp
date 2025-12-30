/**
 * Opportunity Service
 * Manage sales opportunities and deals
 */

import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { drizzleDb } from '../db';
import { opportunities, companies, contacts, pipelineStages } from '@perfex/database';
import type { Opportunity, OpportunityWithDetails, CreateOpportunityInput, UpdateOpportunityInput } from '@perfex/shared';

export class OpportunityService {
  /**
   * Create a new opportunity
   */
  async create(organizationId: string, userId: string, data: CreateOpportunityInput): Promise<Opportunity> {
    const now = new Date();
    const opportunityId = crypto.randomUUID();

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

    // Parse date if it's a string
    const expectedCloseDate = data.expectedCloseDate
      ? typeof data.expectedCloseDate === 'string'
        ? new Date(data.expectedCloseDate)
        : data.expectedCloseDate
      : null;

    await drizzleDb.insert(opportunities).values({
      id: opportunityId,
      organizationId,
      companyId: data.companyId,
      contactId: data.contactId || null,
      name: data.name,
      description: data.description || null,
      value: data.value,
      currency: data.currency,
      stageId: data.stageId,
      probability: data.probability,
      expectedCloseDate,
      actualCloseDate: null,
      status: 'open',
      lostReason: null,
      assignedTo: data.assignedTo || null,
      tags: tagsJson,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const opportunity = await this.getById(organizationId, opportunityId);
    if (!opportunity) {
      throw new Error('Failed to create opportunity');
    }

    return opportunity;
  }

  /**
   * Get opportunity by ID
   */
  async getById(organizationId: string, opportunityId: string): Promise<Opportunity | null> {
    const opportunity = await drizzleDb
      .select()
      .from(opportunities)
      .where(and(eq(opportunities.id, opportunityId), eq(opportunities.organizationId, organizationId)))
      .get() as any;

    return opportunity || null;
  }

  /**
   * Get opportunity by ID with full details
   */
  async getByIdWithDetails(organizationId: string, opportunityId: string): Promise<OpportunityWithDetails | null> {
    const opportunity = await this.getById(organizationId, opportunityId);
    if (!opportunity) {
      return null;
    }

    // Fetch related entities
    const company = await drizzleDb
      .select()
      .from(companies)
      .where(eq(companies.id, opportunity.companyId))
      .get() as any;

    if (!company) {
      throw new Error('Company not found');
    }

    let contact = null;
    if (opportunity.contactId) {
      contact = await drizzleDb
        .select()
        .from(contacts)
        .where(eq(contacts.id, opportunity.contactId))
        .get() as any;
    }

    const stage = await drizzleDb
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, opportunity.stageId))
      .get() as any;

    if (!stage) {
      throw new Error('Pipeline stage not found');
    }

    return {
      ...opportunity,
      company,
      contact,
      stage,
    };
  }

  /**
   * List opportunities with filters
   */
  async list(
    organizationId: string,
    filters?: {
      companyId?: string;
      stageId?: string;
      status?: string;
      assignedTo?: string;
      minValue?: number;
      maxValue?: number;
    }
  ): Promise<Opportunity[]> {
    let query = drizzleDb
      .select()
      .from(opportunities)
      .where(eq(opportunities.organizationId, organizationId));

    // Apply filters
    if (filters?.companyId) {
      query = query.where(and(eq(opportunities.organizationId, organizationId), eq(opportunities.companyId, filters.companyId)));
    }

    if (filters?.stageId) {
      query = query.where(and(eq(opportunities.organizationId, organizationId), eq(opportunities.stageId, filters.stageId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(opportunities.organizationId, organizationId), eq(opportunities.status, filters.status as any)));
    }

    if (filters?.assignedTo) {
      query = query.where(and(eq(opportunities.organizationId, organizationId), eq(opportunities.assignedTo, filters.assignedTo)));
    }

    if (filters?.minValue !== undefined) {
      query = query.where(and(eq(opportunities.organizationId, organizationId), gte(opportunities.value, filters.minValue)));
    }

    if (filters?.maxValue !== undefined) {
      query = query.where(and(eq(opportunities.organizationId, organizationId), lte(opportunities.value, filters.maxValue)));
    }

    const results = await query.orderBy(desc(opportunities.createdAt)).all() as any[];
    return results;
  }

  /**
   * Update opportunity
   */
  async update(organizationId: string, opportunityId: string, data: UpdateOpportunityInput): Promise<Opportunity> {
    // Verify opportunity exists and belongs to organization
    const existing = await this.getById(organizationId, opportunityId);
    if (!existing) {
      throw new Error('Opportunity not found');
    }

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : undefined;

    // Parse date if it's a string
    const expectedCloseDate = data.expectedCloseDate
      ? typeof data.expectedCloseDate === 'string'
        ? new Date(data.expectedCloseDate)
        : data.expectedCloseDate
      : undefined;

    const updateData: any = {
      ...data,
      tags: tagsJson,
      expectedCloseDate,
      updatedAt: new Date(),
    };

    // If status is being set to won or lost, set actual close date
    if (data.status === 'won' || data.status === 'lost') {
      updateData.actualCloseDate = new Date();
    }

    await drizzleDb
      .update(opportunities)
      .set(updateData)
      .where(and(eq(opportunities.id, opportunityId), eq(opportunities.organizationId, organizationId)));

    const updated = await this.getById(organizationId, opportunityId);
    if (!updated) {
      throw new Error('Failed to update opportunity');
    }

    return updated;
  }

  /**
   * Delete opportunity
   */
  async delete(organizationId: string, opportunityId: string): Promise<void> {
    // Verify opportunity exists and belongs to organization
    const existing = await this.getById(organizationId, opportunityId);
    if (!existing) {
      throw new Error('Opportunity not found');
    }

    await drizzleDb
      .delete(opportunities)
      .where(and(eq(opportunities.id, opportunityId), eq(opportunities.organizationId, organizationId)));
  }

  /**
   * Get opportunity statistics
   */
  async getStats(organizationId: string): Promise<{
    totalValue: number;
    totalCount: number;
    wonValue: number;
    wonCount: number;
    lostCount: number;
    openValue: number;
    openCount: number;
    byStage: Record<string, { count: number; value: number }>;
  }> {
    const allOpportunities = await this.list(organizationId);

    let totalValue = 0;
    let wonValue = 0;
    let wonCount = 0;
    let lostCount = 0;
    let openValue = 0;
    let openCount = 0;
    const byStage: Record<string, { count: number; value: number }> = {};

    allOpportunities.forEach((opp) => {
      totalValue += opp.value;

      if (opp.status === 'won') {
        wonValue += opp.value;
        wonCount++;
      } else if (opp.status === 'lost') {
        lostCount++;
      } else {
        openValue += opp.value;
        openCount++;
      }

      if (!byStage[opp.stageId]) {
        byStage[opp.stageId] = { count: 0, value: 0 };
      }
      byStage[opp.stageId].count++;
      byStage[opp.stageId].value += opp.value;
    });

    return {
      totalValue,
      totalCount: allOpportunities.length,
      wonValue,
      wonCount,
      lostCount,
      openValue,
      openCount,
      byStage,
    };
  }
}

export const opportunityService = new OpportunityService();
