/**
 * Sales Module Schema
 * Quotes, sales orders, and deliveries
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { organizations, users } from './users';
import { companies, contacts } from './crm';
import { inventoryItems } from './inventory';

export const quotes = sqliteTable('quotes', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  quoteNumber: text('quote_number').notNull(),
  companyId: text('company_id').notNull().references(() => companies.id),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  quoteDate: integer('quote_date', { mode: 'timestamp' }).notNull(),
  validUntil: integer('valid_until', { mode: 'timestamp' }),
  status: text('status').notNull().default('draft'), // draft, sent, accepted, rejected, expired
  subtotal: real('subtotal').notNull(),
  taxAmount: real('tax_amount').default(0),
  discountAmount: real('discount_amount').default(0),
  total: real('total').notNull(),
  currency: text('currency').default('EUR'),
  notes: text('notes'),
  terms: text('terms'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const salesOrders = sqliteTable('sales_orders', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderNumber: text('order_number').notNull(),
  quoteId: text('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
  companyId: text('company_id').notNull().references(() => companies.id),
  contactId: text('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  orderDate: integer('order_date', { mode: 'timestamp' }).notNull(),
  expectedDeliveryDate: integer('expected_delivery_date', { mode: 'timestamp' }),
  status: text('status').notNull().default('draft'), // draft, confirmed, processing, shipped, delivered, cancelled
  subtotal: real('subtotal').notNull(),
  taxAmount: real('tax_amount').default(0),
  shippingCost: real('shipping_cost').default(0),
  discountAmount: real('discount_amount').default(0),
  total: real('total').notNull(),
  currency: text('currency').default('EUR'),
  shippingAddress: text('shipping_address'),
  billingAddress: text('billing_address'),
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const salesOrderLines = sqliteTable('sales_order_lines', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  salesOrderId: text('sales_order_id').notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id').references(() => inventoryItems.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  quantityShipped: real('quantity_shipped').default(0),
  unit: text('unit').default('unit'),
  unitPrice: real('unit_price').notNull(),
  taxRate: real('tax_rate').default(0),
  discountPercent: real('discount_percent').default(0),
  lineTotal: real('line_total').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const deliveryNotes = sqliteTable('delivery_notes', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  deliveryNumber: text('delivery_number').notNull(),
  salesOrderId: text('sales_order_id').notNull().references(() => salesOrders.id),
  deliveryDate: integer('delivery_date', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull().default('draft'), // draft, shipped, delivered
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
