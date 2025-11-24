/**
 * Workflow Automation & Integration types
 */

// Workflow types
export type TriggerType = 'on_create' | 'on_update' | 'on_status_change' | 'scheduled';
export type WorkflowStatus = 'active' | 'inactive';

export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  entityType: string;
  triggerType: TriggerType;
  triggerConditions: any | null;
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Workflow Step types
export type StepType = 'approval' | 'notification' | 'action' | 'condition' | 'delay';
export type ApproverType = 'user' | 'role' | 'manager' | 'custom';
export type ActionType = 'send_email' | 'update_field' | 'create_task' | 'webhook';

export interface WorkflowStep {
  id: string;
  organizationId: string;
  workflowId: string;
  name: string;
  stepType: StepType;
  position: number;
  configuration: any;
  approverType: ApproverType | null;
  approverIds: string[] | null;
  requireAllApprovers: boolean;
  actionType: ActionType | null;
  actionConfig: any | null;
  createdAt: Date;
}

// Workflow Instance types
export type WorkflowInstanceStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowInstance {
  id: string;
  organizationId: string;
  workflowId: string;
  entityType: string;
  entityId: string;
  status: WorkflowInstanceStatus;
  currentStepId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  triggeredBy: string | null;
  metadata: any | null;
  error: string | null;
  createdAt: Date;
}

// Workflow Step Execution types
export type StepExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface WorkflowStepExecution {
  id: string;
  organizationId: string;
  instanceId: string;
  stepId: string;
  status: StepExecutionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  executedBy: string | null;
  result: any | null;
  error: string | null;
  createdAt: Date;
}

// Approval types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  organizationId: string;
  workflowInstanceId: string | null;
  stepExecutionId: string | null;
  entityType: string;
  entityId: string;
  approverId: string;
  status: ApprovalStatus;
  comments: string | null;
  respondedAt: Date | null;
  requestedBy: string;
  createdAt: Date;
}

// Activity Feed types
export type ActivityFeedType = 'create' | 'update' | 'delete' | 'comment' | 'approve' | 'reject' | 'status_change';

export interface ActivityFeed {
  id: string;
  organizationId: string;
  userId: string | null;
  activityType: ActivityFeedType;
  entityType: string;
  entityId: string | null;
  title: string;
  description: string | null;
  metadata: any | null;
  isPublic: boolean;
  createdAt: Date;
}

// Comment types
export interface Comment {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  parentId: string | null;
  content: string;
  mentions: string[] | null;
  attachments: string[] | null;
  isEdited: boolean;
  editedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Webhook types
export type WebhookStatus = 'active' | 'inactive';

export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  url: string;
  secret: string | null;
  events: string[];
  isActive: boolean;
  headers: Record<string, string> | null;
  retryAttempts: number;
  timeout: number;
  lastTriggeredAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Webhook Log types
export type WebhookLogStatus = 'success' | 'failed' | 'retrying';

export interface WebhookLog {
  id: string;
  organizationId: string;
  webhookId: string;
  event: string;
  payload: any;
  status: WebhookLogStatus;
  statusCode: number | null;
  response: string | null;
  error: string | null;
  attempt: number;
  duration: number | null;
  createdAt: Date;
}

// API Key types
export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  keyHash: string;
  permissions: string[];
  rateLimit: number;
  ipWhitelist: string[] | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Key Usage types
export interface ApiKeyUsage {
  id: string;
  organizationId: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  responseTime: number | null;
  createdAt: Date;
}

// Tag types
export interface Tag {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  description: string | null;
  category: string | null;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
}

// Entity Tag types
export interface EntityTag {
  id: string;
  organizationId: string;
  tagId: string;
  entityType: string;
  entityId: string;
  createdBy: string;
  createdAt: Date;
}
