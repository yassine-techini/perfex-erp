/**
 * Workflows Routes
 * API endpoints for workflows, approvals, webhooks, API keys, and tags
 */

import { Hono } from 'hono';
import { workflowsService } from '../services/workflows.service';
import { requirePermissions } from '../middleware/permissions';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  createWorkflowStepSchema,
  triggerWorkflowSchema,
  createApprovalSchema,
  respondToApprovalSchema,
  createActivityFeedSchema,
  createCommentSchema,
  updateCommentSchema,
  createWebhookSchema,
  updateWebhookSchema,
  createApiKeySchema,
  updateApiKeySchema,
  createTagSchema,
  updateTagSchema,
  createEntityTagSchema,
  type ApiResponse,
} from '@perfex/shared';

const app = new Hono();

// ============================================
// WORKFLOWS
// ============================================

app.get('/workflows', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { entityType, isActive } = c.req.query();

  const workflows = await workflowsService.listWorkflows(organizationId, {
    entityType,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
  });

  return c.json({ success: true, data: workflows });
});

app.post('/workflows', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createWorkflowSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const workflow = await workflowsService.createWorkflow(organizationId, userId, validation.data);
  return c.json({ success: true, data: workflow }, 201);
});

app.get('/workflows/:id', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  const workflow = await workflowsService.getWorkflowById(organizationId, id);
  if (!workflow) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found' } }, 404);
  }

  return c.json({ success: true, data: workflow });
});

app.put('/workflows/:id', requirePermissions('workflows:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();
  const body = await c.req.json();

  const validation = updateWorkflowSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  try {
    const workflow = await workflowsService.updateWorkflow(organizationId, id, validation.data);
    return c.json({ success: true, data: workflow });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } }, 400);
  }
});

app.delete('/workflows/:id', requirePermissions('workflows:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  try {
    await workflowsService.deleteWorkflow(organizationId, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// WORKFLOW STEPS
// ============================================

app.get('/workflows/:workflowId/steps', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { workflowId } = c.req.param();

  const steps = await workflowsService.listWorkflowSteps(organizationId, workflowId);
  return c.json({ success: true, data: steps });
});

app.post('/workflows/:workflowId/steps', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();

  const validation = createWorkflowStepSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const step = await workflowsService.createWorkflowStep(organizationId, validation.data);
  return c.json({ success: true, data: step }, 201);
});

// ============================================
// WORKFLOW INSTANCES
// ============================================

app.post('/workflows/trigger', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = triggerWorkflowSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const instance = await workflowsService.triggerWorkflow(organizationId, userId, validation.data);
  return c.json({ success: true, data: instance }, 201);
});

app.get('/workflows/instances', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { workflowId, entityType, entityId, status } = c.req.query();

  const instances = await workflowsService.listWorkflowInstances(organizationId, {
    workflowId,
    entityType,
    entityId,
    status,
  });

  return c.json({ success: true, data: instances });
});

// ============================================
// APPROVALS
// ============================================

app.get('/approvals', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const { status } = c.req.query();

  const approvals = await workflowsService.listApprovals(organizationId, {
    approverId: userId,
    status,
  });

  return c.json({ success: true, data: approvals });
});

app.post('/approvals', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createApprovalSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const approval = await workflowsService.createApproval(organizationId, userId, validation.data);
  return c.json({ success: true, data: approval }, 201);
});

app.post('/approvals/:id/respond', requirePermissions('workflows:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const { id } = c.req.param();
  const body = await c.req.json();

  const validation = respondToApprovalSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  try {
    const approval = await workflowsService.respondToApproval(organizationId, id, userId, validation.data);
    return c.json({ success: true, data: approval });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'RESPOND_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// ACTIVITY FEED
// ============================================

app.get('/activities', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { entityType, entityId, userId } = c.req.query();

  const activities = await workflowsService.listActivities(organizationId, {
    entityType,
    entityId,
    userId,
  });

  return c.json({ success: true, data: activities });
});

app.post('/activities', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();

  const validation = createActivityFeedSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const activity = await workflowsService.createActivity(organizationId, validation.data);
  return c.json({ success: true, data: activity }, 201);
});

// ============================================
// COMMENTS
// ============================================

app.get('/comments', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { entityType, entityId } = c.req.query();

  if (!entityType || !entityId) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'entityType and entityId are required' } },
      400
    );
  }

  const commentsList = await workflowsService.listComments(organizationId, entityType, entityId);
  return c.json({ success: true, data: commentsList });
});

app.post('/comments', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createCommentSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const comment = await workflowsService.createComment(organizationId, userId, validation.data);
  return c.json({ success: true, data: comment }, 201);
});

app.put('/comments/:id', requirePermissions('workflows:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const { id } = c.req.param();
  const body = await c.req.json();

  const validation = updateCommentSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  try {
    const comment = await workflowsService.updateComment(organizationId, id, userId, validation.data);
    return c.json({ success: true, data: comment });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } }, 400);
  }
});

app.delete('/comments/:id', requirePermissions('workflows:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const { id } = c.req.param();

  try {
    await workflowsService.deleteComment(organizationId, id, userId);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// WEBHOOKS
// ============================================

app.get('/webhooks', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const webhooks = await workflowsService.listWebhooks(organizationId);
  return c.json({ success: true, data: webhooks });
});

app.post('/webhooks', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createWebhookSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const webhook = await workflowsService.createWebhook(organizationId, userId, validation.data);
  return c.json({ success: true, data: webhook }, 201);
});

app.get('/webhooks/:id', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  const webhook = await workflowsService.getWebhookById(organizationId, id);
  if (!webhook) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } }, 404);
  }

  return c.json({ success: true, data: webhook });
});

app.put('/webhooks/:id', requirePermissions('workflows:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();
  const body = await c.req.json();

  const validation = updateWebhookSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  try {
    const webhook = await workflowsService.updateWebhook(organizationId, id, validation.data);
    return c.json({ success: true, data: webhook });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } }, 400);
  }
});

app.delete('/webhooks/:id', requirePermissions('workflows:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  try {
    await workflowsService.deleteWebhook(organizationId, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// API KEYS
// ============================================

app.get('/api-keys', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const keys = await workflowsService.listApiKeys(organizationId);
  return c.json({ success: true, data: keys });
});

app.post('/api-keys', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createApiKeySchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const result = await workflowsService.createApiKey(organizationId, userId, validation.data);
  return c.json({ success: true, data: result }, 201);
});

app.put('/api-keys/:id', requirePermissions('workflows:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();
  const body = await c.req.json();

  const validation = updateApiKeySchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  try {
    const apiKey = await workflowsService.updateApiKey(organizationId, id, validation.data);
    return c.json({ success: true, data: apiKey });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } }, 400);
  }
});

app.delete('/api-keys/:id', requirePermissions('workflows:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  try {
    await workflowsService.deleteApiKey(organizationId, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// TAGS
// ============================================

app.get('/tags', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { category } = c.req.query();

  const tagsList = await workflowsService.listTags(organizationId, category);
  return c.json({ success: true, data: tagsList });
});

app.post('/tags', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createTagSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const tag = await workflowsService.createTag(organizationId, userId, validation.data);
  return c.json({ success: true, data: tag }, 201);
});

app.put('/tags/:id', requirePermissions('workflows:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();
  const body = await c.req.json();

  const validation = updateTagSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  try {
    const tag = await workflowsService.updateTag(organizationId, id, validation.data);
    return c.json({ success: true, data: tag });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } }, 400);
  }
});

app.delete('/tags/:id', requirePermissions('workflows:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  try {
    await workflowsService.deleteTag(organizationId, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// ENTITY TAGS
// ============================================

app.get('/entity-tags', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { entityType, entityId } = c.req.query();

  if (!entityType || !entityId) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'entityType and entityId are required' } },
      400
    );
  }

  const entityTagsList = await workflowsService.listEntityTags(organizationId, entityType, entityId);
  return c.json({ success: true, data: entityTagsList });
});

app.post('/entity-tags', requirePermissions('workflows:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = createEntityTagSchema.safeParse(body);
  if (!validation.success) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', details: validation.error.errors } },
      400
    );
  }

  const entityTag = await workflowsService.addEntityTag(organizationId, userId, validation.data);
  return c.json({ success: true, data: entityTag }, 201);
});

app.delete('/entity-tags/:id', requirePermissions('workflows:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  try {
    await workflowsService.removeEntityTag(organizationId, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } }, 400);
  }
});

// ============================================
// STATS
// ============================================

app.get('/stats', requirePermissions('workflows:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const stats = await workflowsService.getStats(organizationId);
  return c.json({ success: true, data: stats });
});

export default app;
