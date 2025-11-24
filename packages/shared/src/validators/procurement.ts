/**
 * Procurement validators (Zod schemas)
 */

import { z } from 'zod';

/**
 * Create supplier schema
 */
export const createSupplierSchema = z.object({
  supplierNumber: z.string().min(1).max(50),
  name: z.string().min(2).max(200),
  companyName: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  taxNumber: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  paymentTerms: z.enum(['net_7', 'net_15', 'net_30', 'net_60', 'net_90', 'due_on_receipt', 'cash_on_delivery']).optional().nullable(),
  currency: z.string().length(3).default('EUR'),
  creditLimit: z.number().min(0).optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().default(true),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

/**
 * Update supplier schema
 */
export const updateSupplierSchema = z.object({
  supplierNumber: z.string().min(1).max(50).optional(),
  name: z.string().min(2).max(200).optional(),
  companyName: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  taxNumber: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  paymentTerms: z.enum(['net_7', 'net_15', 'net_30', 'net_60', 'net_90', 'due_on_receipt', 'cash_on_delivery']).optional().nullable(),
  currency: z.string().length(3).optional(),
  creditLimit: z.number().min(0).optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

/**
 * Create purchase requisition schema
 */
export const createPurchaseRequisitionSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  requiredDate: z.string().datetime().or(z.date()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lines: z.array(z.object({
    itemId: z.string().uuid().optional().nullable(),
    description: z.string().min(1).max(500),
    quantity: z.number().min(0.01),
    unit: z.string().max(50).default('unit'),
    estimatedPrice: z.number().min(0).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })).min(1),
});

export type CreatePurchaseRequisitionInput = z.infer<typeof createPurchaseRequisitionSchema>;

/**
 * Update purchase requisition schema
 */
export const updatePurchaseRequisitionSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  requiredDate: z.string().datetime().or(z.date()).optional().nullable(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'completed', 'cancelled']).optional(),
  rejectionReason: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdatePurchaseRequisitionInput = z.infer<typeof updatePurchaseRequisitionSchema>;

/**
 * Create purchase order schema
 */
export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  requisitionId: z.string().uuid().optional().nullable(),
  orderDate: z.string().datetime().or(z.date()),
  expectedDeliveryDate: z.string().datetime().or(z.date()).optional().nullable(),
  currency: z.string().length(3).default('EUR'),
  paymentTerms: z.string().max(100).optional().nullable(),
  shippingAddress: z.string().max(1000).optional().nullable(),
  billingAddress: z.string().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
  lines: z.array(z.object({
    itemId: z.string().uuid().optional().nullable(),
    description: z.string().min(1).max(500),
    quantity: z.number().min(0.01),
    unit: z.string().max(50).default('unit'),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).max(100).default(0),
    discountPercent: z.number().min(0).max(100).default(0),
    notes: z.string().max(500).optional().nullable(),
  })).min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

/**
 * Update purchase order schema
 */
export const updatePurchaseOrderSchema = z.object({
  expectedDeliveryDate: z.string().datetime().or(z.date()).optional().nullable(),
  status: z.enum(['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
});

export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

/**
 * Create goods received note schema
 */
export const createGoodsReceivedNoteSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  receivedDate: z.string().datetime().or(z.date()),
  warehouseId: z.string().uuid().optional().nullable(),
  deliveryNote: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lines: z.array(z.object({
    purchaseOrderLineId: z.string().uuid(),
    quantityReceived: z.number().min(0),
    quantityAccepted: z.number().min(0),
    quantityRejected: z.number().min(0).default(0),
    rejectionReason: z.string().max(500).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })).min(1),
});

export type CreateGoodsReceivedNoteInput = z.infer<typeof createGoodsReceivedNoteSchema>;

/**
 * Update goods received note schema
 */
export const updateGoodsReceivedNoteSchema = z.object({
  status: z.enum(['draft', 'confirmed', 'quality_check', 'accepted', 'rejected']).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateGoodsReceivedNoteInput = z.infer<typeof updateGoodsReceivedNoteSchema>;
