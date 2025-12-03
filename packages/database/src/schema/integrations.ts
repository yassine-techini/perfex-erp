/**
 * Integration Schema
 * Database tables for managing integration providers and their configurations
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { organizations, users } from './users';

// ============================================
// INTEGRATION CONFIGURATIONS
// ============================================

/**
 * Stores integration provider configurations per organization
 */
export const integrationConfigs = sqliteTable('integration_configs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Provider identification
  providerId: text('provider_id').notNull(), // e.g., 'd17', 'flouci', 'cnss', 'ooredoo'
  providerCategory: text('provider_category').notNull(), // 'payment', 'fiscal', 'sms', 'shipping'

  // Configuration
  name: text('name').notNull(), // Display name (e.g., "D17 - Production")
  credentials: text('credentials').notNull(), // JSON encrypted credentials
  settings: text('settings'), // JSON additional settings
  environment: text('environment').notNull().default('production'), // 'sandbox' | 'production'

  // Status
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false), // Default for category
  status: text('status').notNull().default('pending_setup'), // 'active' | 'inactive' | 'error' | 'pending_setup'
  lastTestedAt: text('last_tested_at'),
  lastErrorMessage: text('last_error_message'),

  // Metadata
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// INTEGRATION TRANSACTIONS
// ============================================

/**
 * Logs all integration transactions (payments, SMS, shipments, etc.)
 */
export const integrationTransactions = sqliteTable('integration_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  configId: text('config_id').notNull().references(() => integrationConfigs.id, { onDelete: 'cascade' }),

  // Transaction type
  type: text('type').notNull(), // 'payment', 'sms', 'shipment', 'declaration'
  action: text('action').notNull(), // 'create', 'refund', 'send', 'track', etc.

  // Reference
  externalId: text('external_id'), // Provider's transaction ID
  internalRef: text('internal_ref'), // Our internal reference (order ID, invoice ID, etc.)
  refType: text('ref_type'), // 'invoice', 'order', 'payslip', etc.
  refId: text('ref_id'), // Reference entity ID

  // Status
  status: text('status').notNull(), // 'pending', 'completed', 'failed', 'cancelled'
  statusMessage: text('status_message'),

  // Financial
  amount: integer('amount'), // In millimes
  currency: text('currency').default('TND'),
  fees: integer('fees'), // Provider fees in millimes

  // Request/Response
  requestPayload: text('request_payload'), // JSON
  responsePayload: text('response_payload'), // JSON
  errorCode: text('error_code'),
  errorMessage: text('error_message'),

  // Metadata
  metadata: text('metadata'), // JSON additional data
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Timing
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at'),
  duration: integer('duration'), // In milliseconds
});

// ============================================
// PAYMENT TRANSACTIONS (Specific)
// ============================================

/**
 * Payment-specific transaction details
 */
export const paymentTransactions = sqliteTable('payment_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').notNull().references(() => integrationTransactions.id, { onDelete: 'cascade' }),

  // Payment details
  paymentMethod: text('payment_method'), // 'mobile_wallet', 'card', 'bank_transfer'
  paymentUrl: text('payment_url'), // Redirect URL
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),

  // Status tracking
  paidAt: text('paid_at'),
  refundedAt: text('refunded_at'),
  refundAmount: integer('refund_amount'),
  refundReason: text('refund_reason'),

  // Invoice/Order link
  invoiceId: text('invoice_id'),
  orderId: text('order_id'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// SMS TRANSACTIONS (Specific)
// ============================================

/**
 * SMS-specific transaction details
 */
export const smsTransactions = sqliteTable('sms_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').notNull().references(() => integrationTransactions.id, { onDelete: 'cascade' }),

  // SMS details
  recipientPhone: text('recipient_phone').notNull(),
  senderId: text('sender_id'),
  message: text('message').notNull(),
  messageLength: integer('message_length'),
  segments: integer('segments').default(1), // Number of SMS segments

  // Delivery tracking
  deliveredAt: text('delivered_at'),
  deliveryStatus: text('delivery_status'), // 'sent', 'delivered', 'failed', 'undelivered'

  // Cost
  unitCost: integer('unit_cost'), // Cost per segment in millimes

  // Template reference
  templateId: text('template_id'),
  templateName: text('template_name'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// SHIPPING TRANSACTIONS (Specific)
// ============================================

/**
 * Shipping-specific transaction details
 */
export const shippingTransactions = sqliteTable('shipping_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').notNull().references(() => integrationTransactions.id, { onDelete: 'cascade' }),

  // Shipment details
  trackingNumber: text('tracking_number'),
  serviceType: text('service_type'),
  labelUrl: text('label_url'),

  // Addresses (JSON)
  senderAddress: text('sender_address'),
  recipientAddress: text('recipient_address'),

  // Package details
  weight: integer('weight'), // In grams
  dimensions: text('dimensions'), // JSON { length, width, height }
  description: text('description'),

  // COD
  codAmount: integer('cod_amount'), // Cash on delivery in millimes
  codCollected: integer('cod_collected', { mode: 'boolean' }).default(false),
  codCollectedAt: text('cod_collected_at'),

  // Delivery tracking
  estimatedDelivery: text('estimated_delivery'),
  actualDelivery: text('actual_delivery'),
  deliveryStatus: text('delivery_status'),
  deliveryProof: text('delivery_proof'), // URL to signature/photo

  // Order link
  orderId: text('order_id'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// FISCAL DECLARATIONS
// ============================================

/**
 * CNSS and tax declaration records
 */
export const fiscalDeclarations = sqliteTable('fiscal_declarations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  configId: text('config_id').notNull().references(() => integrationConfigs.id, { onDelete: 'cascade' }),

  // Declaration type
  declarationType: text('declaration_type').notNull(), // 'cnss_monthly', 'tva', 'is', 'irpp'
  period: text('period').notNull(), // Format: YYYY-MM or YYYY-Q1

  // Reference
  referenceNumber: text('reference_number'),
  externalId: text('external_id'),

  // Status
  status: text('status').notNull().default('draft'), // 'draft', 'submitted', 'accepted', 'rejected', 'paid'

  // Financial
  totalAmount: integer('total_amount'), // Total contribution/tax in millimes
  paidAmount: integer('paid_amount'),
  dueDate: text('due_date'),
  paidAt: text('paid_at'),

  // Declaration data
  declarationData: text('declaration_data').notNull(), // JSON with all declaration details
  employeeCount: integer('employee_count'), // For CNSS

  // Documents
  receiptUrl: text('receipt_url'),
  submissionProof: text('submission_proof'),

  // Metadata
  submittedBy: text('submitted_by').references(() => users.id),
  submittedAt: text('submitted_at'),
  notes: text('notes'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// WEBHOOK EVENTS (Inbound)
// ============================================

/**
 * Stores inbound webhook events from providers
 */
export const integrationWebhookEvents = sqliteTable('integration_webhook_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  configId: text('config_id').references(() => integrationConfigs.id, { onDelete: 'set null' }),

  // Event details
  providerId: text('provider_id').notNull(),
  eventType: text('event_type').notNull(), // 'payment.completed', 'sms.delivered', etc.

  // Payload
  payload: text('payload').notNull(), // JSON
  signature: text('signature'), // Webhook signature for verification
  verified: integer('verified', { mode: 'boolean' }).default(false),

  // Processing
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  processedAt: text('processed_at'),
  processingError: text('processing_error'),

  // Related transaction
  transactionId: text('transaction_id').references(() => integrationTransactions.id),

  // Request metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  headers: text('headers'), // JSON

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Type exports
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type NewIntegrationConfig = typeof integrationConfigs.$inferInsert;

export type IntegrationTransaction = typeof integrationTransactions.$inferSelect;
export type NewIntegrationTransaction = typeof integrationTransactions.$inferInsert;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

export type SmsTransaction = typeof smsTransactions.$inferSelect;
export type NewSmsTransaction = typeof smsTransactions.$inferInsert;

export type ShippingTransaction = typeof shippingTransactions.$inferSelect;
export type NewShippingTransaction = typeof shippingTransactions.$inferInsert;

export type FiscalDeclaration = typeof fiscalDeclarations.$inferSelect;
export type NewFiscalDeclaration = typeof fiscalDeclarations.$inferInsert;

export type IntegrationWebhookEvent = typeof integrationWebhookEvents.$inferSelect;
export type NewIntegrationWebhookEvent = typeof integrationWebhookEvents.$inferInsert;
