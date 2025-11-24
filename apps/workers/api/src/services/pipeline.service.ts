/**
 * Pipeline Service
 * Manage sales pipeline stages
 */

import { eq, and, asc } from 'drizzle-orm';
import { drizzleDb } from '../db';
import { pipelineStages } from '@perfex/database';
import type { PipelineStage, CreatePipelineStageInput, UpdatePipelineStageInput } from '@perfex/shared';

export class PipelineService {
  /**
   * Create a new pipeline stage
   */
  async create(organizationId: string, data: CreatePipelineStageInput): Promise<PipelineStage> {
    const now = new Date();
    const stageId = crypto.randomUUID();

    await drizzleDb.insert(pipelineStages).values({
      id: stageId,
      organizationId,
      name: data.name,
      order: data.order,
      probability: data.probability,
      color: data.color || null,
      active: true,
      createdAt: now,
    });

    const stage = await this.getById(organizationId, stageId);
    if (!stage) {
      throw new Error('Failed to create pipeline stage');
    }

    return stage;
  }

  /**
   * Get pipeline stage by ID
   */
  async getById(organizationId: string, stageId: string): Promise<PipelineStage | null> {
    const stage = await drizzleDb
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.organizationId, organizationId)))
      .get();

    return stage || null;
  }

  /**
   * List pipeline stages
   */
  async list(organizationId: string, activeOnly: boolean = false): Promise<PipelineStage[]> {
    let query = drizzleDb
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.organizationId, organizationId));

    if (activeOnly) {
      query = query.where(and(eq(pipelineStages.organizationId, organizationId), eq(pipelineStages.active, true)));
    }

    const results = await query.orderBy(asc(pipelineStages.order)).all();
    return results;
  }

  /**
   * Update pipeline stage
   */
  async update(organizationId: string, stageId: string, data: UpdatePipelineStageInput): Promise<PipelineStage> {
    // Verify stage exists and belongs to organization
    const existing = await this.getById(organizationId, stageId);
    if (!existing) {
      throw new Error('Pipeline stage not found');
    }

    await drizzleDb
      .update(pipelineStages)
      .set(data)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.organizationId, organizationId)));

    const updated = await this.getById(organizationId, stageId);
    if (!updated) {
      throw new Error('Failed to update pipeline stage');
    }

    return updated;
  }

  /**
   * Delete pipeline stage
   */
  async delete(organizationId: string, stageId: string): Promise<void> {
    // Verify stage exists and belongs to organization
    const existing = await this.getById(organizationId, stageId);
    if (!existing) {
      throw new Error('Pipeline stage not found');
    }

    // Note: In production, you'd want to check if any opportunities use this stage
    // and either prevent deletion or reassign them to another stage

    await drizzleDb
      .delete(pipelineStages)
      .where(and(eq(pipelineStages.id, stageId), eq(pipelineStages.organizationId, organizationId)));
  }

  /**
   * Create default pipeline stages for a new organization
   */
  async createDefaults(organizationId: string): Promise<void> {
    const defaultStages = [
      { name: 'Lead', order: 1, probability: 10, color: '#6B7280' },
      { name: 'Qualified', order: 2, probability: 25, color: '#3B82F6' },
      { name: 'Proposal', order: 3, probability: 50, color: '#F59E0B' },
      { name: 'Negotiation', order: 4, probability: 75, color: '#8B5CF6' },
      { name: 'Closed Won', order: 5, probability: 100, color: '#10B981' },
      { name: 'Closed Lost', order: 6, probability: 0, color: '#EF4444' },
    ];

    for (const stage of defaultStages) {
      await this.create(organizationId, stage);
    }
  }
}

export const pipelineService = new PipelineService();
