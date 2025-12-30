/**
 * Project Service
 * Manage projects
 */

import { eq, and, desc, like, or } from 'drizzle-orm';
import { drizzleDb } from '../db';
import { projects } from '@perfex/database';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@perfex/shared';

export class ProjectService {
  /**
   * Create a new project
   */
  async create(organizationId: string, userId: string, data: CreateProjectInput): Promise<Project> {
    const now = new Date();
    const projectId = crypto.randomUUID();

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

    // Convert dates
    const startDate = data.startDate ? new Date(data.startDate) : null;
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;

    await drizzleDb.insert(projects).values({
      id: projectId,
      organizationId,
      name: data.name,
      description: data.description || null,
      companyId: data.companyId || null,
      contactId: data.contactId || null,
      status: data.status || 'planning',
      priority: data.priority || 'medium',
      startDate,
      dueDate,
      completedDate: null,
      budgetAmount: data.budgetAmount || null,
      budgetCurrency: data.budgetCurrency || 'EUR',
      actualCost: 0,
      progress: 0,
      billable: data.billable ?? true,
      hourlyRate: data.hourlyRate || null,
      projectManagerId: data.projectManagerId || null,
      tags: tagsJson,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const project = await this.getById(organizationId, projectId);
    if (!project) {
      throw new Error('Failed to create project');
    }

    return project;
  }

  /**
   * Get project by ID
   */
  async getById(organizationId: string, projectId: string): Promise<Project | null> {
    const project = await drizzleDb
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
      .get() as any;

    return project || null;
  }

  /**
   * List projects with filters
   */
  async list(
    organizationId: string,
    filters?: {
      status?: string;
      priority?: string;
      companyId?: string;
      projectManagerId?: string;
      search?: string;
    }
  ): Promise<Project[]> {
    let query = drizzleDb
      .select()
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    // Apply filters
    if (filters?.status) {
      query = query.where(and(eq(projects.organizationId, organizationId), eq(projects.status, filters.status as any)));
    }

    if (filters?.priority) {
      query = query.where(and(eq(projects.organizationId, organizationId), eq(projects.priority, filters.priority as any)));
    }

    if (filters?.companyId) {
      query = query.where(and(eq(projects.organizationId, organizationId), eq(projects.companyId, filters.companyId)));
    }

    if (filters?.projectManagerId) {
      query = query.where(and(eq(projects.organizationId, organizationId), eq(projects.projectManagerId, filters.projectManagerId)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(projects.organizationId, organizationId),
          or(
            like(projects.name, searchTerm),
            like(projects.description, searchTerm)
          )
        )
      );
    }

    const results = await query.orderBy(desc(projects.createdAt)).all() as any[];
    return results;
  }

  /**
   * Update project
   */
  async update(organizationId: string, projectId: string, data: UpdateProjectInput): Promise<Project> {
    // Verify project exists and belongs to organization
    const existing = await this.getById(organizationId, projectId);
    if (!existing) {
      throw new Error('Project not found');
    }

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : undefined;

    // Convert dates if provided
    const updateData: any = {
      ...data,
      tags: tagsJson,
      updatedAt: new Date(),
    };

    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }

    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    if (data.completedDate) {
      updateData.completedDate = new Date(data.completedDate);
    }

    await drizzleDb
      .update(projects)
      .set(updateData)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    const updated = await this.getById(organizationId, projectId);
    if (!updated) {
      throw new Error('Failed to update project');
    }

    return updated;
  }

  /**
   * Delete project
   */
  async delete(organizationId: string, projectId: string): Promise<void> {
    // Verify project exists and belongs to organization
    const existing = await this.getById(organizationId, projectId);
    if (!existing) {
      throw new Error('Project not found');
    }

    await drizzleDb
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));
  }

  /**
   * Get project statistics
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    totalBudget: number;
    totalActualCost: number;
  }> {
    const allProjects = await this.list(organizationId);

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalBudget = 0;
    let totalActualCost = 0;

    allProjects.forEach((project) => {
      byStatus[project.status] = (byStatus[project.status] || 0) + 1;
      byPriority[project.priority] = (byPriority[project.priority] || 0) + 1;
      totalBudget += project.budgetAmount || 0;
      totalActualCost += project.actualCost || 0;
    });

    return {
      total: allProjects.length,
      byStatus,
      byPriority,
      totalBudget,
      totalActualCost,
    };
  }
}

export const projectService = new ProjectService();
