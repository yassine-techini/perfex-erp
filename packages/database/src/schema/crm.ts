/**
 * CRM Schema
 * Companies, Contacts, Opportunities, Pipeline, Activities
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { organizations } from './users';

/**
 * Companies (Business entities)
 */
export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  website: text('website'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  industry: text('industry'),
  size: text('size'), // small, medium, large, enterprise
  type: text('type').notNull(), // customer, prospect, partner, vendor
  status: text('status').notNull().default('active'), // active, inactive
  assignedTo: text('assigned_to'), // user id
  tags: text('tags'), // JSON array of tags
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Contacts (Individual people)
 */
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  companyId: text('company_id').references(() => companies.id, { onDelete: 'set null' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  mobile: text('mobile'),
  position: text('position'), // job title
  department: text('department'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  status: text('status').notNull().default('active'), // active, inactive
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false), // primary contact for company
  assignedTo: text('assigned_to'), // user id
  tags: text('tags'), // JSON array of tags
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Pipeline Stages (Configurable sales stages)
 */
export const pipelineStages = sqliteTable('pipeline_stages', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull(),
  probability: integer('probability').notNull().default(0), // 0-100, likelihood of closing
  color: text('color'), // hex color for UI
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Opportunities (Sales deals)
 */
export const opportunities = sqliteTable('opportunities', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  value: real('value').notNull(), // deal value
  currency: text('currency').notNull().default('EUR'),
  stageId: text('stage_id').notNull().references(() => pipelineStages.id),
  probability: integer('probability').notNull().default(0), // 0-100
  expectedCloseDate: integer('expected_close_date', { mode: 'timestamp' }),
  actualCloseDate: integer('actual_close_date', { mode: 'timestamp' }),
  status: text('status').notNull().default('open'), // open, won, lost
  lostReason: text('lost_reason'),
  assignedTo: text('assigned_to'), // user id
  tags: text('tags'), // JSON array of tags
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Activities (Tasks, calls, meetings, notes)
 */
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // task, call, meeting, email, note
  subject: text('subject').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'), // pending, completed, cancelled
  priority: text('priority').notNull().default('medium'), // low, medium, high
  dueDate: integer('due_date', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  duration: integer('duration'), // in minutes
  location: text('location'),
  // Relationships (polymorphic - can be linked to company, contact, or opportunity)
  relatedToType: text('related_to_type'), // company, contact, opportunity
  relatedToId: text('related_to_id'),
  assignedTo: text('assigned_to'), // user id
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Products (Products/Services for opportunities)
 */
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  category: text('category'),
  price: real('price').notNull(),
  cost: real('cost'),
  currency: text('currency').notNull().default('EUR'),
  unit: text('unit').default('unit'), // unit, hour, day, month, etc.
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Opportunity Products (Many-to-many)
 */
export const opportunityProducts = sqliteTable('opportunity_products', {
  id: text('id').primaryKey(),
  opportunityId: text('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  discount: real('discount').notNull().default(0), // percentage
  total: real('total').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
