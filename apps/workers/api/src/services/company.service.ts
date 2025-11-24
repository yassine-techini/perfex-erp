/**
 * Company Service
 * Manage companies (customers, prospects, partners, vendors)
 */

import { eq, and, desc, like, or } from 'drizzle-orm';
import { drizzleDb } from '../db';
import { companies } from '@perfex/database';
import type { Company, CreateCompanyInput, UpdateCompanyInput } from '@perfex/shared';

export class CompanyService {
  /**
   * Create a new company
   */
  async create(organizationId: string, userId: string, data: CreateCompanyInput): Promise<Company> {
    const now = new Date();
    const companyId = crypto.randomUUID();

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

    await drizzleDb.insert(companies).values({
      id: companyId,
      organizationId,
      name: data.name,
      website: data.website || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      industry: data.industry || null,
      size: data.size || null,
      type: data.type,
      status: 'active',
      assignedTo: data.assignedTo || null,
      tags: tagsJson,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const company = await this.getById(organizationId, companyId);
    if (!company) {
      throw new Error('Failed to create company');
    }

    return company;
  }

  /**
   * Get company by ID
   */
  async getById(organizationId: string, companyId: string): Promise<Company | null> {
    const company = await drizzleDb
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)))
      .get();

    return company || null;
  }

  /**
   * List companies with filters
   */
  async list(
    organizationId: string,
    filters?: {
      type?: string;
      status?: string;
      assignedTo?: string;
      search?: string;
    }
  ): Promise<Company[]> {
    let query = drizzleDb
      .select()
      .from(companies)
      .where(eq(companies.organizationId, organizationId));

    // Apply filters
    if (filters?.type) {
      query = query.where(and(eq(companies.organizationId, organizationId), eq(companies.type, filters.type as any)));
    }

    if (filters?.status) {
      query = query.where(and(eq(companies.organizationId, organizationId), eq(companies.status, filters.status)));
    }

    if (filters?.assignedTo) {
      query = query.where(and(eq(companies.organizationId, organizationId), eq(companies.assignedTo, filters.assignedTo)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(companies.organizationId, organizationId),
          or(
            like(companies.name, searchTerm),
            like(companies.email, searchTerm),
            like(companies.phone, searchTerm)
          )
        )
      );
    }

    const results = await query.orderBy(desc(companies.createdAt)).all();
    return results;
  }

  /**
   * Update company
   */
  async update(organizationId: string, companyId: string, data: UpdateCompanyInput): Promise<Company> {
    // Verify company exists and belongs to organization
    const existing = await this.getById(organizationId, companyId);
    if (!existing) {
      throw new Error('Company not found');
    }

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : undefined;

    const updateData: any = {
      ...data,
      tags: tagsJson,
      updatedAt: new Date(),
    };

    await drizzleDb
      .update(companies)
      .set(updateData)
      .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)));

    const updated = await this.getById(organizationId, companyId);
    if (!updated) {
      throw new Error('Failed to update company');
    }

    return updated;
  }

  /**
   * Delete company
   */
  async delete(organizationId: string, companyId: string): Promise<void> {
    // Verify company exists and belongs to organization
    const existing = await this.getById(organizationId, companyId);
    if (!existing) {
      throw new Error('Company not found');
    }

    await drizzleDb
      .delete(companies)
      .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)));
  }

  /**
   * Get company statistics
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const allCompanies = await this.list(organizationId);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    allCompanies.forEach((company) => {
      byType[company.type] = (byType[company.type] || 0) + 1;
      byStatus[company.status] = (byStatus[company.status] || 0) + 1;
    });

    return {
      total: allCompanies.length,
      byType,
      byStatus,
    };
  }
}

export const companyService = new CompanyService();
