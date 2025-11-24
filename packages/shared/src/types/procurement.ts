/**
 * Procurement Module Types
 */

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';
export type RequisitionStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type GRNStatus = 'draft' | 'confirmed' | 'quality_check' | 'accepted' | 'rejected';
export type PaymentTerms = 'net_7' | 'net_15' | 'net_30' | 'net_60' | 'net_90' | 'due_on_receipt' | 'cash_on_delivery';

/**
 * Supplier
 */
export interface Supplier {
  id: string;
  organizationId: string;
  supplierNumber: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  paymentTerms: PaymentTerms | null;
  currency: string;
  creditLimit: number | null;
  rating: number | null;
  notes: string | null;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Purchase Requisition
 */
export interface PurchaseRequisition {
  id: string;
  organizationId: string;
  requisitionNumber: string;
  title: string;
  description: string | null;
  requestedBy: string;
  departmentId: string | null;
  priority: Priority;
  status: RequisitionStatus;
  requiredDate: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Purchase Requisition Line
 */
export interface PurchaseRequisitionLine {
  id: string;
  organizationId: string;
  requisitionId: string;
  itemId: string | null;
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice: number | null;
  estimatedTotal: number | null;
  notes: string | null;
  createdAt: Date;
}

/**
 * Purchase Requisition with lines
 */
export interface PurchaseRequisitionWithLines extends PurchaseRequisition {
  lines: PurchaseRequisitionLine[];
  requestedByName?: string;
  approvedByName?: string;
}

/**
 * Purchase Order
 */
export interface PurchaseOrder {
  id: string;
  organizationId: string;
  orderNumber: string;
  supplierId: string;
  requisitionId: string | null;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  currency: string;
  paymentTerms: string | null;
  shippingAddress: string | null;
  billingAddress: string | null;
  notes: string | null;
  internalNotes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Purchase Order Line
 */
export interface PurchaseOrderLine {
  id: string;
  organizationId: string;
  purchaseOrderId: string;
  itemId: string | null;
  description: string;
  quantity: number;
  quantityReceived: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
  lineTotal: number;
  notes: string | null;
  createdAt: Date;
}

/**
 * Purchase Order with lines and supplier
 */
export interface PurchaseOrderWithDetails extends PurchaseOrder {
  lines: PurchaseOrderLine[];
  supplierName?: string;
  createdByName?: string;
}

/**
 * Goods Received Note (GRN)
 */
export interface GoodsReceivedNote {
  id: string;
  organizationId: string;
  grnNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  receivedDate: Date;
  warehouseId: string | null;
  deliveryNote: string | null;
  status: GRNStatus;
  notes: string | null;
  receivedBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Goods Received Line
 */
export interface GoodsReceivedLine {
  id: string;
  organizationId: string;
  grnId: string;
  purchaseOrderLineId: string;
  itemId: string | null;
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: Date;
}

/**
 * GRN with lines and details
 */
export interface GoodsReceivedNoteWithDetails extends GoodsReceivedNote {
  lines: GoodsReceivedLine[];
  supplierName?: string;
  receivedByName?: string;
  purchaseOrderNumber?: string;
}
