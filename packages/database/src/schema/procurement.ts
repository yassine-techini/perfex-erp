/**
 * Procurement Module Schema
 * Suppliers, purchase orders, requisitions, and goods received
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { organizations, users } from './users';
import { inventoryItems } from './inventory';

/**
 * Suppliers/Vendors
 */
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  supplierNumber: text('supplier_number').notNull(),
  name: text('name').notNull(),
  companyName: text('company_name'),
  email: text('email'),
  phone: text('phone'),
  website: text('website'),
  taxNumber: text('tax_number'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  paymentTerms: text('payment_terms'), // net_30, net_60, etc.
  currency: text('currency').default('EUR'),
  creditLimit: real('credit_limit'),
  rating: integer('rating'), // 1-5 stars
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Purchase Requisitions (Internal purchase requests)
 */
export const purchaseRequisitions = sqliteTable('purchase_requisitions', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  requisitionNumber: text('requisition_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  requestedBy: text('requested_by')
    .notNull()
    .references(() => users.id),
  departmentId: text('department_id'), // Reference to departments if needed
  priority: text('priority').notNull().default('medium'), // low, medium, high, urgent
  status: text('status').notNull().default('draft'), // draft, pending_approval, approved, rejected, ordered, completed, cancelled
  requiredDate: integer('required_date', { mode: 'timestamp' }),
  approvedBy: text('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Purchase Requisition Lines
 */
export const purchaseRequisitionLines = sqliteTable('purchase_requisition_lines', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  requisitionId: text('requisition_id')
    .notNull()
    .references(() => purchaseRequisitions.id, { onDelete: 'cascade' }),
  itemId: text('item_id').references(() => inventoryItems.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').default('unit'),
  estimatedPrice: real('estimated_price'),
  estimatedTotal: real('estimated_total'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Purchase Orders
 */
export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  orderNumber: text('order_number').notNull(),
  supplierId: text('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'restrict' }),
  requisitionId: text('requisition_id').references(() => purchaseRequisitions.id, { onDelete: 'set null' }),
  orderDate: integer('order_date', { mode: 'timestamp' }).notNull(),
  expectedDeliveryDate: integer('expected_delivery_date', { mode: 'timestamp' }),
  status: text('status').notNull().default('draft'), // draft, sent, confirmed, partially_received, received, cancelled
  subtotal: real('subtotal').notNull(),
  taxAmount: real('tax_amount').default(0),
  shippingCost: real('shipping_cost').default(0),
  discountAmount: real('discount_amount').default(0),
  total: real('total').notNull(),
  currency: text('currency').default('EUR'),
  paymentTerms: text('payment_terms'),
  shippingAddress: text('shipping_address'),
  billingAddress: text('billing_address'),
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Purchase Order Lines
 */
export const purchaseOrderLines = sqliteTable('purchase_order_lines', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  purchaseOrderId: text('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id').references(() => inventoryItems.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  quantityReceived: real('quantity_received').default(0),
  unit: text('unit').default('unit'),
  unitPrice: real('unit_price').notNull(),
  taxRate: real('tax_rate').default(0),
  discountPercent: real('discount_percent').default(0),
  lineTotal: real('line_total').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Goods Received Notes (GRN)
 */
export const goodsReceivedNotes = sqliteTable('goods_received_notes', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  grnNumber: text('grn_number').notNull(),
  purchaseOrderId: text('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'restrict' }),
  supplierId: text('supplier_id')
    .notNull()
    .references(() => suppliers.id, { onDelete: 'restrict' }),
  receivedDate: integer('received_date', { mode: 'timestamp' }).notNull(),
  warehouseId: text('warehouse_id'), // Reference to warehouses
  deliveryNote: text('delivery_note'), // Supplier's delivery note number
  status: text('status').notNull().default('draft'), // draft, confirmed, quality_check, accepted, rejected
  notes: text('notes'),
  receivedBy: text('received_by')
    .notNull()
    .references(() => users.id),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Goods Received Lines
 */
export const goodsReceivedLines = sqliteTable('goods_received_lines', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  grnId: text('grn_id')
    .notNull()
    .references(() => goodsReceivedNotes.id, { onDelete: 'cascade' }),
  purchaseOrderLineId: text('purchase_order_line_id')
    .notNull()
    .references(() => purchaseOrderLines.id, { onDelete: 'restrict' }),
  itemId: text('item_id').references(() => inventoryItems.id, { onDelete: 'set null' }),
  quantityOrdered: real('quantity_ordered').notNull(),
  quantityReceived: real('quantity_received').notNull(),
  quantityAccepted: real('quantity_accepted').notNull(),
  quantityRejected: real('quantity_rejected').default(0),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
