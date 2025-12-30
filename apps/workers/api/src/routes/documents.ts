/**
 * Documents Routes
 * API endpoints for document management, email templates, and reports
 */

import { Hono } from 'hono';
import { documentsService } from '../services/documents.service';
import { requirePermissions } from '../middleware/permissions';
import { logger } from '../utils/logger';
import {
  createDocumentCategorySchema,
  createDocumentSchema,
  updateDocumentSchema,
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  queueEmailSchema,
  createReportSchema,
  updateReportSchema,
  type ApiResponse,
} from '@perfex/shared';

const app = new Hono();

// ============================================
// DOCUMENT CATEGORIES
// ============================================

app.get('/categories', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const categories = await documentsService.listCategories(organizationId);
    return c.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.post('/categories', requirePermissions('documents:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createDocumentCategorySchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
        400
      );
    }

    const category = await documentsService.createCategory(organizationId, userId, validation.data);
    return c.json({ success: true, data: category }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

// ============================================
// DOCUMENTS
// ============================================

app.get('/', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const { categoryId, search, relatedEntityType, relatedEntityId } = c.req.query();

    const documents = await documentsService.listDocuments(organizationId, {
      categoryId,
      search,
      relatedEntityType,
      relatedEntityId,
    });

    return c.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.post('/', requirePermissions('documents:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createDocumentSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
        400
      );
    }

    const document = await documentsService.createDocument(organizationId, userId, validation.data);
    return c.json({ success: true, data: document }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.get('/:id', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const { id } = c.req.param();

    const document = await documentsService.getDocumentById(organizationId, id);
    if (!document) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } }, 404);
    }

    return c.json({ success: true, data: document });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.put('/:id', requirePermissions('documents:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();
  const body = await c.req.json();

  const validation = updateDocumentSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  try {
    const document = await documentsService.updateDocument(organizationId, id, validation.data);
    return c.json({ success: true, data: document });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } }, 400);
  }
});

app.delete('/:id', requirePermissions('documents:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  try {
    await documentsService.deleteDocument(organizationId, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// EMAIL TEMPLATES
// ============================================

app.get('/email-templates', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const { category } = c.req.query();

    const templates = await documentsService.listEmailTemplates(organizationId, category);
    return c.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.post('/email-templates', requirePermissions('documents:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createEmailTemplateSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
        400
      );
    }

    const template = await documentsService.createEmailTemplate(organizationId, userId, validation.data);
    return c.json({ success: true, data: template }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.get('/email-templates/:id', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const { id } = c.req.param();

    const template = await documentsService.getEmailTemplateById(organizationId, id);
    if (!template) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Email template not found' } }, 404);
    }

    return c.json({ success: true, data: template });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

// ============================================
// EMAIL QUEUE
// ============================================

app.post('/email-queue', requirePermissions('documents:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const body = await c.req.json();

    const validation = queueEmailSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
        400
      );
    }

    await documentsService.queueEmail(organizationId, validation.data);
    return c.json({ success: true, message: 'Email queued successfully' }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

// ============================================
// REPORTS
// ============================================

app.get('/reports', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const { category } = c.req.query();

    const reports = await documentsService.listReports(organizationId, category);
    return c.json({ success: true, data: reports });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.post('/reports', requirePermissions('documents:create'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const userId = c.get('userId');
    const body = await c.req.json();

    const validation = createReportSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
        400
      );
    }

    const report = await documentsService.createReport(organizationId, userId, validation.data);
    return c.json({ success: true, data: report }, 201);
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

app.get('/reports/:id', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const { id } = c.req.param();

    const report = await documentsService.getReportById(organizationId, id);
    if (!report) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }, 404);
    }

    return c.json({ success: true, data: report });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

// ============================================
// STATS
// ============================================

app.get('/stats', requirePermissions('documents:read'), async (c) => {
  try {
    const organizationId = c.get('organizationId')!;
    const stats = await documentsService.getStats(organizationId);
    return c.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Route error', error, { route: 'documents' });
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    }, 500);
  }
});

export default app;
