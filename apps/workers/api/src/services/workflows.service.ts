/**
 * Workflows Service
 * Manage workflows, approvals, webhooks, API keys, and activity feed
 */

import { eq, and, desc, like } from 'drizzle-orm';
import { drizzleDb } from '../db';
import {
  workflows,
  workflowSteps,
  workflowInstances,
  workflowStepExecutions,
  approvals,
  activityFeed,
  comments,
  webhooks,
  webhookLogs,
  apiKeys,
  apiKeyUsage,
  tags,
  entityTags,
} from '@perfex/database';
import type {
  Workflow,
  WorkflowStep,
  WorkflowInstance,
  Approval,
  ActivityFeed,
  Comment,
  Webhook,
  ApiKey,
  Tag,
  EntityTag,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  CreateWorkflowStepInput,
  TriggerWorkflowInput,
  CreateApprovalInput,
  RespondToApprovalInput,
  CreateActivityInput,
  CreateCommentInput,
  UpdateCommentInput,
  CreateWebhookInput,
  UpdateWebhookInput,
  CreateApiKeyInput,
  UpdateApiKeyInput,
  CreateTagInput,
  UpdateTagInput,
  CreateEntityTagInput,
} from '@perfex/shared';

export class WorkflowsService {
  // ============================================
  // WORKFLOWS
  // ============================================

  async createWorkflow(organizationId: string, userId: string, data: CreateWorkflowInput): Promise<Workflow> {
    const now = new Date();
    const workflowId = crypto.randomUUID();

    await drizzleDb.insert(workflows).values({
      id: workflowId,
      organizationId,
      name: data.name,
      description: data.description || null,
      entityType: data.entityType,
      triggerType: data.triggerType,
      triggerConditions: data.triggerConditions ? JSON.stringify(data.triggerConditions) : null,
      isActive: data.isActive ?? true,
      priority: data.priority || 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const workflow = await this.getWorkflowById(organizationId, workflowId);
    if (!workflow) throw new Error('Failed to create workflow');
    return workflow;
  }

  async getWorkflowById(organizationId: string, workflowId: string): Promise<Workflow | null> {
    const workflow = await drizzleDb
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.organizationId, organizationId)))
      .get() as any;
    return (workflow as Workflow) || null;
  }

  async listWorkflows(organizationId: string, filters?: { entityType?: string; isActive?: boolean }): Promise<Workflow[]> {
    const conditions = [eq(workflows.organizationId, organizationId)];

    if (filters?.entityType) {
      conditions.push(eq(workflows.entityType, filters.entityType));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(workflows.isActive, filters.isActive));
    }

    const result = await drizzleDb
      .select()
      .from(workflows)
      .where(and(...conditions))
      .orderBy(desc(workflows.createdAt))
      .all() as any[];

    return result as Workflow[];
  }

  async updateWorkflow(organizationId: string, workflowId: string, data: UpdateWorkflowInput): Promise<Workflow> {
    const existing = await this.getWorkflowById(organizationId, workflowId);
    if (!existing) throw new Error('Workflow not found');

    const updateData: any = { ...data };
    if (data.triggerConditions) {
      updateData.triggerConditions = JSON.stringify(data.triggerConditions);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(workflows)
      .set(updateData)
      .where(and(eq(workflows.id, workflowId), eq(workflows.organizationId, organizationId)));

    const updated = await this.getWorkflowById(organizationId, workflowId);
    if (!updated) throw new Error('Failed to update workflow');
    return updated;
  }

  async deleteWorkflow(organizationId: string, workflowId: string): Promise<void> {
    const existing = await this.getWorkflowById(organizationId, workflowId);
    if (!existing) throw new Error('Workflow not found');

    await drizzleDb
      .delete(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.organizationId, organizationId)));
  }

  // ============================================
  // WORKFLOW STEPS
  // ============================================

  async createWorkflowStep(organizationId: string, data: CreateWorkflowStepInput): Promise<WorkflowStep> {
    const now = new Date();
    const stepId = crypto.randomUUID();

    await drizzleDb.insert(workflowSteps).values({
      id: stepId,
      organizationId,
      workflowId: data.workflowId,
      name: data.name,
      stepType: data.stepType,
      position: data.position,
      configuration: JSON.stringify(data.configuration),
      approverType: data.approverType || null,
      approverIds: data.approverIds ? JSON.stringify(data.approverIds) : null,
      requireAllApprovers: data.requireAllApprovers || false,
      actionType: data.actionType || null,
      actionConfig: data.actionConfig ? JSON.stringify(data.actionConfig) : null,
      createdAt: now,
    });

    const step = await this.getWorkflowStepById(organizationId, stepId);
    if (!step) throw new Error('Failed to create workflow step');
    return step;
  }

  async getWorkflowStepById(organizationId: string, stepId: string): Promise<WorkflowStep | null> {
    const step = await drizzleDb
      .select()
      .from(workflowSteps)
      .where(and(eq(workflowSteps.id, stepId), eq(workflowSteps.organizationId, organizationId)))
      .get() as any;
    return (step as WorkflowStep) || null;
  }

  async listWorkflowSteps(organizationId: string, workflowId: string): Promise<WorkflowStep[]> {
    const result = await drizzleDb
      .select()
      .from(workflowSteps)
      .where(and(eq(workflowSteps.organizationId, organizationId), eq(workflowSteps.workflowId, workflowId)))
      .orderBy(workflowSteps.position)
      .all() as any[];
    return result as WorkflowStep[];
  }

  // ============================================
  // WORKFLOW INSTANCES
  // ============================================

  async triggerWorkflow(organizationId: string, userId: string | null, data: TriggerWorkflowInput): Promise<WorkflowInstance> {
    const now = new Date();
    const instanceId = crypto.randomUUID();

    await drizzleDb.insert(workflowInstances).values({
      id: instanceId,
      organizationId,
      workflowId: data.workflowId,
      entityType: data.entityType,
      entityId: data.entityId,
      status: 'pending',
      currentStepId: null,
      startedAt: now,
      completedAt: null,
      triggeredBy: userId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      error: null,
      createdAt: now,
    });

    const instance = await this.getWorkflowInstanceById(organizationId, instanceId);
    if (!instance) throw new Error('Failed to trigger workflow');
    return instance;
  }

  async getWorkflowInstanceById(organizationId: string, instanceId: string): Promise<WorkflowInstance | null> {
    const instance = await drizzleDb
      .select()
      .from(workflowInstances)
      .where(and(eq(workflowInstances.id, instanceId), eq(workflowInstances.organizationId, organizationId)))
      .get() as any;
    return (instance as WorkflowInstance) || null;
  }

  async listWorkflowInstances(organizationId: string, filters?: { workflowId?: string; entityType?: string; entityId?: string; status?: string }): Promise<WorkflowInstance[]> {
    const conditions = [eq(workflowInstances.organizationId, organizationId)];

    if (filters?.workflowId) {
      conditions.push(eq(workflowInstances.workflowId, filters.workflowId));
    }

    if (filters?.entityType) {
      conditions.push(eq(workflowInstances.entityType, filters.entityType));
    }

    if (filters?.entityId) {
      conditions.push(eq(workflowInstances.entityId, filters.entityId));
    }

    if (filters?.status) {
      conditions.push(eq(workflowInstances.status, filters.status));
    }

    const result = await drizzleDb
      .select()
      .from(workflowInstances)
      .where(and(...conditions))
      .orderBy(desc(workflowInstances.createdAt))
      .all() as any[];

    return result as WorkflowInstance[];
  }

  // ============================================
  // APPROVALS
  // ============================================

  async createApproval(organizationId: string, userId: string, data: CreateApprovalInput): Promise<Approval> {
    const now = new Date();
    const approvalId = crypto.randomUUID();

    await drizzleDb.insert(approvals).values({
      id: approvalId,
      organizationId,
      workflowInstanceId: data.workflowInstanceId || null,
      stepExecutionId: data.stepExecutionId || null,
      entityType: data.entityType,
      entityId: data.entityId,
      approverId: data.approverId,
      status: 'pending',
      comments: null,
      respondedAt: null,
      requestedBy: userId,
      createdAt: now,
    });

    const approval = await this.getApprovalById(organizationId, approvalId);
    if (!approval) throw new Error('Failed to create approval');
    return approval;
  }

  async getApprovalById(organizationId: string, approvalId: string): Promise<Approval | null> {
    const approval = await drizzleDb
      .select()
      .from(approvals)
      .where(and(eq(approvals.id, approvalId), eq(approvals.organizationId, organizationId)))
      .get() as any;
    return (approval as Approval) || null;
  }

  async listApprovals(organizationId: string, filters?: { approverId?: string; status?: string }): Promise<Approval[]> {
    const conditions = [eq(approvals.organizationId, organizationId)];

    if (filters?.approverId) {
      conditions.push(eq(approvals.approverId, filters.approverId));
    }

    if (filters?.status) {
      conditions.push(eq(approvals.status, filters.status));
    }

    const result = await drizzleDb
      .select()
      .from(approvals)
      .where(and(...conditions))
      .orderBy(desc(approvals.createdAt))
      .all() as any[];

    return result as Approval[];
  }

  async respondToApproval(organizationId: string, approvalId: string, userId: string, data: RespondToApprovalInput): Promise<Approval> {
    const existing = await this.getApprovalById(organizationId, approvalId);
    if (!existing) throw new Error('Approval not found');
    if (existing.approverId !== userId) throw new Error('Not authorized to respond to this approval');
    if (existing.status !== 'pending') throw new Error('Approval already responded to');

    await drizzleDb
      .update(approvals)
      .set({
        status: data.status,
        comments: data.comments || null,
        respondedAt: new Date(),
      })
      .where(and(eq(approvals.id, approvalId), eq(approvals.organizationId, organizationId)));

    const updated = await this.getApprovalById(organizationId, approvalId);
    if (!updated) throw new Error('Failed to update approval');
    return updated;
  }

  // ============================================
  // ACTIVITY FEED
  // ============================================

  async createActivity(organizationId: string, data: CreateActivityInput): Promise<ActivityFeed> {
    const now = new Date();
    const activityId = crypto.randomUUID();

    await drizzleDb.insert(activityFeed).values({
      id: activityId,
      organizationId,
      userId: data.userId || null,
      activityType: data.activityType,
      entityType: data.entityType,
      entityId: data.entityId || null,
      title: data.title,
      description: data.description || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      isPublic: data.isPublic ?? true,
      createdAt: now,
    });

    const activity = await this.getActivityById(organizationId, activityId);
    if (!activity) throw new Error('Failed to create activity');
    return activity;
  }

  async getActivityById(organizationId: string, activityId: string): Promise<ActivityFeed | null> {
    const activity = await drizzleDb
      .select()
      .from(activityFeed)
      .where(and(eq(activityFeed.id, activityId), eq(activityFeed.organizationId, organizationId)))
      .get() as any;
    return activity || null;
  }

  async listActivities(organizationId: string, filters?: { entityType?: string; entityId?: string; userId?: string }): Promise<ActivityFeed[]> {
    let query = drizzleDb.select().from(activityFeed).where(eq(activityFeed.organizationId, organizationId));

    if (filters?.entityType) {
      query = query.where(and(eq(activityFeed.organizationId, organizationId), eq(activityFeed.entityType, filters.entityType)));
    }

    if (filters?.entityId) {
      query = query.where(and(eq(activityFeed.organizationId, organizationId), eq(activityFeed.entityId, filters.entityId)));
    }

    if (filters?.userId) {
      query = query.where(and(eq(activityFeed.organizationId, organizationId), eq(activityFeed.userId, filters.userId)));
    }

    return await query.orderBy(desc(activityFeed.createdAt)).all() as any[];
  }

  // ============================================
  // COMMENTS
  // ============================================

  async createComment(organizationId: string, userId: string, data: CreateCommentInput): Promise<Comment> {
    const now = new Date();
    const commentId = crypto.randomUUID();

    await drizzleDb.insert(comments).values({
      id: commentId,
      organizationId,
      entityType: data.entityType,
      entityId: data.entityId,
      parentId: data.parentId || null,
      content: data.content,
      mentions: data.mentions ? JSON.stringify(data.mentions) : null,
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      isEdited: false,
      editedAt: null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const comment = await this.getCommentById(organizationId, commentId);
    if (!comment) throw new Error('Failed to create comment');
    return comment;
  }

  async getCommentById(organizationId: string, commentId: string): Promise<Comment | null> {
    const comment = await drizzleDb
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)))
      .get() as any;
    return comment || null;
  }

  async listComments(organizationId: string, entityType: string, entityId: string): Promise<Comment[]> {
    return await drizzleDb
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.organizationId, organizationId),
          eq(comments.entityType, entityType),
          eq(comments.entityId, entityId)
        )
      )
      .orderBy(comments.createdAt)
      .all() as any[];
  }

  async updateComment(organizationId: string, commentId: string, userId: string, data: UpdateCommentInput): Promise<Comment> {
    const existing = await this.getCommentById(organizationId, commentId);
    if (!existing) throw new Error('Comment not found');
    if (existing.createdBy !== userId) throw new Error('Not authorized to edit this comment');

    await drizzleDb
      .update(comments)
      .set({
        content: data.content,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)));

    const updated = await this.getCommentById(organizationId, commentId);
    if (!updated) throw new Error('Failed to update comment');
    return updated;
  }

  async deleteComment(organizationId: string, commentId: string, userId: string): Promise<void> {
    const existing = await this.getCommentById(organizationId, commentId);
    if (!existing) throw new Error('Comment not found');
    if (existing.createdBy !== userId) throw new Error('Not authorized to delete this comment');

    await drizzleDb
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.organizationId, organizationId)));
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  async createWebhook(organizationId: string, userId: string, data: CreateWebhookInput): Promise<Webhook> {
    const now = new Date();
    const webhookId = crypto.randomUUID();

    await drizzleDb.insert(webhooks).values({
      id: webhookId,
      organizationId,
      name: data.name,
      description: data.description || null,
      url: data.url,
      secret: data.secret || null,
      events: JSON.stringify(data.events),
      isActive: data.isActive ?? true,
      headers: data.headers ? JSON.stringify(data.headers) : null,
      retryAttempts: data.retryAttempts || 3,
      timeout: data.timeout || 30,
      lastTriggeredAt: null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const webhook = await this.getWebhookById(organizationId, webhookId);
    if (!webhook) throw new Error('Failed to create webhook');
    return webhook;
  }

  async getWebhookById(organizationId: string, webhookId: string): Promise<Webhook | null> {
    const webhook = await drizzleDb
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, organizationId)))
      .get() as any;
    return webhook || null;
  }

  async listWebhooks(organizationId: string): Promise<Webhook[]> {
    return await drizzleDb
      .select()
      .from(webhooks)
      .where(eq(webhooks.organizationId, organizationId))
      .orderBy(desc(webhooks.createdAt))
      .all() as any[];
  }

  async updateWebhook(organizationId: string, webhookId: string, data: UpdateWebhookInput): Promise<Webhook> {
    const existing = await this.getWebhookById(organizationId, webhookId);
    if (!existing) throw new Error('Webhook not found');

    const updateData: any = { ...data };
    if (data.events) {
      updateData.events = JSON.stringify(data.events);
    }
    if (data.headers) {
      updateData.headers = JSON.stringify(data.headers);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(webhooks)
      .set(updateData)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, organizationId)));

    const updated = await this.getWebhookById(organizationId, webhookId);
    if (!updated) throw new Error('Failed to update webhook');
    return updated;
  }

  async deleteWebhook(organizationId: string, webhookId: string): Promise<void> {
    const existing = await this.getWebhookById(organizationId, webhookId);
    if (!existing) throw new Error('Webhook not found');

    await drizzleDb
      .delete(webhooks)
      .where(and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, organizationId)));
  }

  // ============================================
  // API KEYS
  // ============================================

  async createApiKey(organizationId: string, userId: string, data: CreateApiKeyInput): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const now = new Date();
    const apiKeyId = crypto.randomUUID();

    // Generate a random API key
    const plainKey = `pk_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyPrefix = plainKey.substring(0, 12);

    // Hash the key (in production, use bcrypt or similar)
    const keyHash = await this.hashApiKey(plainKey);

    await drizzleDb.insert(apiKeys).values({
      id: apiKeyId,
      organizationId,
      name: data.name,
      description: data.description || null,
      keyPrefix,
      keyHash,
      permissions: JSON.stringify(data.permissions),
      rateLimit: data.rateLimit || 1000,
      ipWhitelist: data.ipWhitelist ? JSON.stringify(data.ipWhitelist) : null,
      lastUsedAt: null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const apiKey = await this.getApiKeyById(organizationId, apiKeyId);
    if (!apiKey) throw new Error('Failed to create API key');

    return { apiKey, plainKey };
  }

  private async hashApiKey(key: string): Promise<string> {
    // Simple hash for demo - in production use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async getApiKeyById(organizationId: string, apiKeyId: string): Promise<ApiKey | null> {
    const apiKey = await drizzleDb
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.organizationId, organizationId)))
      .get() as any;
    return apiKey || null;
  }

  async listApiKeys(organizationId: string): Promise<ApiKey[]> {
    return await drizzleDb
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, organizationId))
      .orderBy(desc(apiKeys.createdAt))
      .all() as any[];
  }

  async updateApiKey(organizationId: string, apiKeyId: string, data: UpdateApiKeyInput): Promise<ApiKey> {
    const existing = await this.getApiKeyById(organizationId, apiKeyId);
    if (!existing) throw new Error('API key not found');

    const updateData: any = { ...data };
    if (data.permissions) {
      updateData.permissions = JSON.stringify(data.permissions);
    }
    if (data.ipWhitelist) {
      updateData.ipWhitelist = JSON.stringify(data.ipWhitelist);
    }
    if (data.expiresAt) {
      updateData.expiresAt = new Date(data.expiresAt);
    }
    updateData.updatedAt = new Date();

    await drizzleDb
      .update(apiKeys)
      .set(updateData)
      .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.organizationId, organizationId)));

    const updated = await this.getApiKeyById(organizationId, apiKeyId);
    if (!updated) throw new Error('Failed to update API key');
    return updated;
  }

  async deleteApiKey(organizationId: string, apiKeyId: string): Promise<void> {
    const existing = await this.getApiKeyById(organizationId, apiKeyId);
    if (!existing) throw new Error('API key not found');

    await drizzleDb
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.organizationId, organizationId)));
  }

  // ============================================
  // TAGS
  // ============================================

  async createTag(organizationId: string, userId: string, data: CreateTagInput): Promise<Tag> {
    const now = new Date();
    const tagId = crypto.randomUUID();

    await drizzleDb.insert(tags).values({
      id: tagId,
      organizationId,
      name: data.name,
      color: data.color || '#3B82F6',
      description: data.description || null,
      category: data.category || null,
      usageCount: 0,
      createdBy: userId,
      createdAt: now,
    });

    const tag = await this.getTagById(organizationId, tagId);
    if (!tag) throw new Error('Failed to create tag');
    return tag;
  }

  async getTagById(organizationId: string, tagId: string): Promise<Tag | null> {
    const tag = await drizzleDb
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)))
      .get() as any;
    return tag || null;
  }

  async listTags(organizationId: string, category?: string): Promise<Tag[]> {
    let query = drizzleDb.select().from(tags).where(eq(tags.organizationId, organizationId));

    if (category) {
      query = query.where(and(eq(tags.organizationId, organizationId), eq(tags.category, category)));
    }

    return await query.orderBy(desc(tags.usageCount)).all() as any[];
  }

  async updateTag(organizationId: string, tagId: string, data: UpdateTagInput): Promise<Tag> {
    const existing = await this.getTagById(organizationId, tagId);
    if (!existing) throw new Error('Tag not found');

    await drizzleDb
      .update(tags)
      .set(data)
      .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)));

    const updated = await this.getTagById(organizationId, tagId);
    if (!updated) throw new Error('Failed to update tag');
    return updated;
  }

  async deleteTag(organizationId: string, tagId: string): Promise<void> {
    const existing = await this.getTagById(organizationId, tagId);
    if (!existing) throw new Error('Tag not found');

    await drizzleDb
      .delete(tags)
      .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)));
  }

  // ============================================
  // ENTITY TAGS
  // ============================================

  async addEntityTag(organizationId: string, userId: string, data: CreateEntityTagInput): Promise<EntityTag> {
    const now = new Date();
    const entityTagId = crypto.randomUUID();

    await drizzleDb.insert(entityTags).values({
      id: entityTagId,
      organizationId,
      tagId: data.tagId,
      entityType: data.entityType,
      entityId: data.entityId,
      createdBy: userId,
      createdAt: now,
    });

    // Increment tag usage count
    const tag = await this.getTagById(organizationId, data.tagId);
    if (tag) {
      await drizzleDb
        .update(tags)
        .set({ usageCount: tag.usageCount + 1 })
        .where(and(eq(tags.id, data.tagId), eq(tags.organizationId, organizationId)));
    }

    const entityTag = await this.getEntityTagById(organizationId, entityTagId);
    if (!entityTag) throw new Error('Failed to add entity tag');
    return entityTag;
  }

  async getEntityTagById(organizationId: string, entityTagId: string): Promise<EntityTag | null> {
    const entityTag = await drizzleDb
      .select()
      .from(entityTags)
      .where(and(eq(entityTags.id, entityTagId), eq(entityTags.organizationId, organizationId)))
      .get() as any;
    return entityTag || null;
  }

  async listEntityTags(organizationId: string, entityType: string, entityId: string): Promise<EntityTag[]> {
    return await drizzleDb
      .select()
      .from(entityTags)
      .where(
        and(
          eq(entityTags.organizationId, organizationId),
          eq(entityTags.entityType, entityType),
          eq(entityTags.entityId, entityId)
        )
      )
      .all() as any[];
  }

  async removeEntityTag(organizationId: string, entityTagId: string): Promise<void> {
    const existing = await this.getEntityTagById(organizationId, entityTagId);
    if (!existing) throw new Error('Entity tag not found');

    await drizzleDb
      .delete(entityTags)
      .where(and(eq(entityTags.id, entityTagId), eq(entityTags.organizationId, organizationId)));

    // Decrement tag usage count
    const tag = await this.getTagById(organizationId, existing.tagId);
    if (tag && tag.usageCount > 0) {
      await drizzleDb
        .update(tags)
        .set({ usageCount: tag.usageCount - 1 })
        .where(and(eq(tags.id, existing.tagId), eq(tags.organizationId, organizationId)));
    }
  }

  async getStats(organizationId: string): Promise<{
    totalWorkflows: number;
    activeWorkflows: number;
    totalApprovals: number;
    pendingApprovals: number;
    totalWebhooks: number;
    activeWebhooks: number;
    totalApiKeys: number;
    totalTags: number;
  }> {
    const allWorkflows = await this.listWorkflows(organizationId);
    const allApprovals = await this.listApprovals(organizationId);
    const allWebhooks = await this.listWebhooks(organizationId);
    const allApiKeys = await this.listApiKeys(organizationId);
    const allTags = await this.listTags(organizationId);

    return {
      totalWorkflows: allWorkflows.length,
      activeWorkflows: allWorkflows.filter(w => w.isActive).length,
      totalApprovals: allApprovals.length,
      pendingApprovals: allApprovals.filter(a => a.status === 'pending').length,
      totalWebhooks: allWebhooks.length,
      activeWebhooks: allWebhooks.filter(w => w.isActive).length,
      totalApiKeys: allApiKeys.length,
      totalTags: allTags.length,
    };
  }
}

export const workflowsService = new WorkflowsService();
