/**
 * Documents Service
 * Manage documents, email templates, and reports
 */

import { eq, and, desc, like } from 'drizzle-orm';
import { drizzleDb } from '../db';
import {
  documentCategories,
  documents,
  documentVersions,
  documentAccessLog,
  documentShares,
  emailTemplates,
  emailQueue,
  reports,
} from '@perfex/database';
import type {
  DocumentCategory,
  Document,
  EmailTemplate,
  Report,
  CreateDocumentCategoryInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  QueueEmailInput,
  CreateReportInput,
  UpdateReportInput,
} from '@perfex/shared';

export class DocumentsService {
  // ============================================
  // DOCUMENT CATEGORIES
  // ============================================

  async createCategory(organizationId: string, userId: string, data: CreateDocumentCategoryInput): Promise<DocumentCategory> {
    const now = new Date();
    const categoryId = crypto.randomUUID();

    await drizzleDb.insert(documentCategories).values({
      id: categoryId,
      organizationId,
      name: data.name,
      description: data.description || null,
      color: data.color || '#3B82F6',
      icon: data.icon || null,
      parentId: data.parentId || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const category = await this.getCategoryById(organizationId, categoryId);
    if (!category) throw new Error('Failed to create category');
    return category;
  }

  async getCategoryById(organizationId: string, categoryId: string): Promise<DocumentCategory | null> {
    const category = await drizzleDb
      .select()
      .from(documentCategories)
      .where(and(eq(documentCategories.id, categoryId), eq(documentCategories.organizationId, organizationId)))
      .get() as any;
    return category || null;
  }

  async listCategories(organizationId: string): Promise<DocumentCategory[]> {
    return await drizzleDb
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.organizationId, organizationId))
      .orderBy(desc(documentCategories.createdAt))
      .all() as any[];
  }

  // ============================================
  // DOCUMENTS
  // ============================================

  async createDocument(organizationId: string, userId: string, data: CreateDocumentInput): Promise<Document> {
    const now = new Date();
    const documentId = crypto.randomUUID();

    await drizzleDb.insert(documents).values({
      id: documentId,
      organizationId,
      categoryId: data.categoryId || null,
      name: data.name,
      description: data.description || null,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      fileUrl: data.fileUrl,
      thumbnailUrl: data.thumbnailUrl || null,
      version: 1,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      isPublic: data.isPublic || false,
      accessLevel: data.accessLevel || 'organization',
      tags: data.tags ? JSON.stringify(data.tags) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      checksum: null,
      downloadCount: 0,
      lastAccessedAt: null,
      uploadedBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const document = await this.getDocumentById(organizationId, documentId);
    if (!document) throw new Error('Failed to create document');
    return document;
  }

  async getDocumentById(organizationId: string, documentId: string): Promise<Document | null> {
    const document = await drizzleDb
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.organizationId, organizationId)))
      .get() as any;
    return document || null;
  }

  async listDocuments(organizationId: string, filters?: { categoryId?: string; search?: string; relatedEntityType?: string; relatedEntityId?: string }): Promise<Document[]> {
    let query = drizzleDb.select().from(documents).where(eq(documents.organizationId, organizationId));

    if (filters?.categoryId) {
      query = query.where(and(eq(documents.organizationId, organizationId), eq(documents.categoryId, filters.categoryId)));
    }

    if (filters?.relatedEntityType) {
      query = query.where(and(eq(documents.organizationId, organizationId), eq(documents.relatedEntityType, filters.relatedEntityType)));
    }

    if (filters?.relatedEntityId) {
      query = query.where(and(eq(documents.organizationId, organizationId), eq(documents.relatedEntityId, filters.relatedEntityId)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(documents.organizationId, organizationId),
          like(documents.name, searchTerm)
        )
      );
    }

    return await query.orderBy(desc(documents.createdAt)).all() as any[];
  }

  async updateDocument(organizationId: string, documentId: string, data: UpdateDocumentInput): Promise<Document> {
    const existing = await this.getDocumentById(organizationId, documentId);
    if (!existing) throw new Error('Document not found');

    const updateData: any = { ...data };
    if (data.tags) {
      updateData.tags = JSON.stringify(data.tags);
    }
    if (data.metadata) {
      updateData.metadata = JSON.stringify(data.metadata);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(documents)
      .set(updateData)
      .where(and(eq(documents.id, documentId), eq(documents.organizationId, organizationId)));

    const updated = await this.getDocumentById(organizationId, documentId);
    if (!updated) throw new Error('Failed to update document');
    return updated;
  }

  async deleteDocument(organizationId: string, documentId: string): Promise<void> {
    const existing = await this.getDocumentById(organizationId, documentId);
    if (!existing) throw new Error('Document not found');

    await drizzleDb
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.organizationId, organizationId)));
  }

  async logDocumentAccess(organizationId: string, documentId: string, userId: string | null, action: 'view' | 'download' | 'edit' | 'delete', ipAddress: string | null, userAgent: string | null): Promise<void> {
    await drizzleDb.insert(documentAccessLog).values({
      id: crypto.randomUUID(),
      organizationId,
      documentId,
      userId,
      action,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });

    // Update document metrics
    if (action === 'download') {
      await drizzleDb
        .update(documents)
        .set({
          downloadCount: (existing: any) => existing.downloadCount + 1,
          lastAccessedAt: new Date(),
        })
        .where(and(eq(documents.id, documentId), eq(documents.organizationId, organizationId)));
    }
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  async createEmailTemplate(organizationId: string, userId: string, data: CreateEmailTemplateInput): Promise<EmailTemplate> {
    const now = new Date();
    const templateId = crypto.randomUUID();

    await drizzleDb.insert(emailTemplates).values({
      id: templateId,
      organizationId,
      name: data.name,
      slug: data.slug,
      category: data.category,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText || null,
      variables: data.variables ? JSON.stringify(data.variables) : null,
      isActive: data.isActive ?? true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const template = await this.getEmailTemplateById(organizationId, templateId);
    if (!template) throw new Error('Failed to create email template');
    return template;
  }

  async getEmailTemplateById(organizationId: string, templateId: string): Promise<EmailTemplate | null> {
    const template = await drizzleDb
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, templateId), eq(emailTemplates.organizationId, organizationId)))
      .get() as any;
    return template || null;
  }

  async listEmailTemplates(organizationId: string, category?: string): Promise<EmailTemplate[]> {
    let query = drizzleDb.select().from(emailTemplates).where(eq(emailTemplates.organizationId, organizationId));

    if (category) {
      query = query.where(and(eq(emailTemplates.organizationId, organizationId), eq(emailTemplates.category, category)));
    }

    return await query.orderBy(desc(emailTemplates.createdAt)).all() as any[];
  }

  async queueEmail(organizationId: string, data: QueueEmailInput): Promise<void> {
    const now = new Date();

    await drizzleDb.insert(emailQueue).values({
      id: crypto.randomUUID(),
      organizationId,
      templateId: data.templateId || null,
      toEmail: data.toEmail,
      toName: data.toName || null,
      fromEmail: null,
      fromName: null,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText || null,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      sentAt: null,
      error: null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      createdAt: now,
    });
  }

  // ============================================
  // REPORTS
  // ============================================

  async createReport(organizationId: string, userId: string, data: CreateReportInput): Promise<Report> {
    const now = new Date();
    const reportId = crypto.randomUUID();

    await drizzleDb.insert(reports).values({
      id: reportId,
      organizationId,
      name: data.name,
      description: data.description || null,
      category: data.category,
      reportType: data.reportType,
      dataSource: data.dataSource,
      configuration: JSON.stringify(data.configuration),
      filters: data.filters ? JSON.stringify(data.filters) : null,
      columns: data.columns ? JSON.stringify(data.columns) : null,
      sortBy: data.sortBy || null,
      groupBy: data.groupBy || null,
      isPublic: data.isPublic || false,
      isFavorite: false,
      runCount: 0,
      lastRunAt: null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const report = await this.getReportById(organizationId, reportId);
    if (!report) throw new Error('Failed to create report');
    return report;
  }

  async getReportById(organizationId: string, reportId: string): Promise<Report | null> {
    const report = await drizzleDb
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.organizationId, organizationId)))
      .get() as any;
    return report || null;
  }

  async listReports(organizationId: string, category?: string): Promise<Report[]> {
    let query = drizzleDb.select().from(reports).where(eq(reports.organizationId, organizationId));

    if (category) {
      query = query.where(and(eq(reports.organizationId, organizationId), eq(reports.category, category)));
    }

    return await query.orderBy(desc(reports.createdAt)).all() as any[];
  }

  async getStats(organizationId: string): Promise<{
    totalDocuments: number;
    totalCategories: number;
    totalStorage: number;
    totalReports: number;
  }> {
    const allDocuments = await this.listDocuments(organizationId);
    const allCategories = await this.listCategories(organizationId);
    const allReports = await this.listReports(organizationId);

    return {
      totalDocuments: allDocuments.length,
      totalCategories: allCategories.length,
      totalStorage: allDocuments.reduce((sum, d) => sum + d.fileSize, 0),
      totalReports: allReports.length,
    };
  }
}

export const documentsService = new DocumentsService();
