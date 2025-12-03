import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { organizations } from './users';
import { inventoryItems, warehouses } from './inventory';
import { suppliers } from './procurement';
import { recipes } from './recipes';

/**
 * Lot Numbers
 * Batch/lot tracking for raw materials and finished products
 */
export const lots = sqliteTable('lots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  lotNumber: text('lot_number').notNull(), // Unique lot number
  inventoryItemId: text('inventory_item_id')
    .references(() => inventoryItems.id),
  type: text('type', {
    enum: ['raw_material', 'semi_finished', 'finished_product']
  }).notNull().default('raw_material'),

  // Origin
  supplierId: text('supplier_id').references(() => suppliers.id),
  supplierLotNumber: text('supplier_lot_number'),
  purchaseOrderId: text('purchase_order_id'),
  productionOrderId: text('production_order_id'), // For manufactured lots

  // Quantities
  initialQuantity: real('initial_quantity').notNull(),
  currentQuantity: real('current_quantity').notNull(),
  unit: text('unit').notNull(),

  // Dates
  productionDate: integer('production_date', { mode: 'timestamp' }),
  receptionDate: integer('reception_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }), // DLC
  bestBeforeDate: integer('best_before_date', { mode: 'timestamp' }), // DDM
  openedDate: integer('opened_date', { mode: 'timestamp' }),
  secondaryExpiryDate: integer('secondary_expiry_date', { mode: 'timestamp' }), // After opening

  // Location
  warehouseId: text('warehouse_id').references(() => warehouses.id),
  location: text('location'), // Specific location in warehouse

  // Status
  status: text('status', {
    enum: ['available', 'reserved', 'quarantine', 'expired', 'consumed', 'recalled']
  }).notNull().default('available'),
  quarantineReason: text('quarantine_reason'),

  // Quality
  qualityStatus: text('quality_status', {
    enum: ['pending', 'approved', 'rejected', 'conditional']
  }).notNull().default('pending'),
  qualityNotes: text('quality_notes'),

  // Cost
  unitCost: real('unit_cost'),
  totalCost: real('total_cost'),

  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Lot Movements
 * Track all movements of lots
 */
export const lotMovements = sqliteTable('lot_movements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  lotId: text('lot_id')
    .notNull()
    .references(() => lots.id),
  type: text('type', {
    enum: ['reception', 'production_input', 'production_output', 'sale', 'transfer', 'adjustment', 'return', 'disposal']
  }).notNull(),
  quantity: real('quantity').notNull(),
  quantityBefore: real('quantity_before').notNull(),
  quantityAfter: real('quantity_after').notNull(),

  // References
  referenceType: text('reference_type'), // 'production_order', 'sales_order', 'transfer', etc.
  referenceId: text('reference_id'),

  // Location
  fromWarehouseId: text('from_warehouse_id').references(() => warehouses.id),
  toWarehouseId: text('to_warehouse_id').references(() => warehouses.id),

  reason: text('reason'),
  performedBy: text('performed_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Production Traceability
 * Links production batches to input lots and output lots
 */
export const productionTraceability = sqliteTable('production_traceability', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  productionOrderId: text('production_order_id').notNull(),
  recipeId: text('recipe_id').references(() => recipes.id),
  productionDate: integer('production_date', { mode: 'timestamp' }).notNull(),
  outputLotId: text('output_lot_id').references(() => lots.id), // The produced lot
  quantityProduced: real('quantity_produced').notNull(),
  unit: text('unit').notNull(),
  operatorId: text('operator_id'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Production Input Lots
 * Links input lots to production traceability
 */
export const productionInputLots = sqliteTable('production_input_lots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productionTraceabilityId: text('production_traceability_id')
    .notNull()
    .references(() => productionTraceability.id),
  inputLotId: text('input_lot_id')
    .notNull()
    .references(() => lots.id),
  quantityUsed: real('quantity_used').notNull(),
  unit: text('unit').notNull(),
});

/**
 * HACCP Control Points
 * Define critical control points for monitoring
 */
export const haccpControlPoints = sqliteTable('haccp_control_points', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  code: text('code').notNull(), // CCP-1, PRP-2, etc.
  name: text('name').notNull(),
  type: text('type', {
    enum: ['ccp', 'oprp', 'prp'] // Critical Control Point, Operational PRP, Prerequisite Program
  }).notNull().default('ccp'),
  description: text('description'),
  hazardType: text('hazard_type', {
    enum: ['biological', 'chemical', 'physical', 'allergen']
  }).notNull(),
  hazardDescription: text('hazard_description'),

  // Control measures
  controlMeasure: text('control_measure').notNull(),
  criticalLimit: text('critical_limit'), // e.g., "< 4°C" or "> 75°C for 2 min"
  monitoringProcedure: text('monitoring_procedure'),
  monitoringFrequency: text('monitoring_frequency'), // e.g., "every 4 hours", "each batch"
  correctiveAction: text('corrective_action'),
  verificationProcedure: text('verification_procedure'),
  recordsRequired: text('records_required'), // JSON array

  // Location/Process
  processStep: text('process_step'),
  location: text('location'),
  responsibleRole: text('responsible_role'),

  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * HACCP Records
 * Records of HACCP monitoring checks
 */
export const haccpRecords = sqliteTable('haccp_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  controlPointId: text('control_point_id')
    .notNull()
    .references(() => haccpControlPoints.id),
  recordDate: integer('record_date', { mode: 'timestamp' }).notNull(),
  recordTime: text('record_time'), // HH:MM format

  // Measurements
  measuredValue: text('measured_value'), // Can be numeric or text
  unit: text('unit'),
  withinLimits: integer('within_limits', { mode: 'boolean' }).notNull(),

  // If deviation
  deviationDetails: text('deviation_details'),
  correctiveActionTaken: text('corrective_action_taken'),
  correctiveActionDate: integer('corrective_action_date', { mode: 'timestamp' }),

  // References
  lotId: text('lot_id').references(() => lots.id),
  productionOrderId: text('production_order_id'),

  recordedBy: text('recorded_by'),
  verifiedBy: text('verified_by'),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  notes: text('notes'),
  attachments: text('attachments'), // JSON array of file URLs
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Temperature Logs
 * Continuous temperature monitoring (fridges, freezers, etc.)
 */
export const temperatureLogs = sqliteTable('temperature_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  equipmentId: text('equipment_id').notNull(), // Fridge, freezer, storage unit
  equipmentName: text('equipment_name').notNull(),
  location: text('location'),

  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
  temperature: real('temperature').notNull(),
  unit: text('unit', { enum: ['C', 'F'] }).notNull().default('C'),

  minLimit: real('min_limit'),
  maxLimit: real('max_limit'),
  withinLimits: integer('within_limits', { mode: 'boolean' }).notNull(),

  alertSent: integer('alert_sent', { mode: 'boolean' }).notNull().default(false),
  source: text('source', { enum: ['manual', 'sensor', 'import'] }).notNull().default('manual'),
  recordedBy: text('recorded_by'),
  notes: text('notes'),
});

/**
 * Product Recalls
 * Track product recalls
 */
export const productRecalls = sqliteTable('product_recalls', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  recallNumber: text('recall_number').notNull(),
  recallDate: integer('recall_date', { mode: 'timestamp' }).notNull(),
  reason: text('reason').notNull(),
  riskLevel: text('risk_level', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull(),
  description: text('description'),
  affectedProducts: text('affected_products'), // JSON array of product IDs
  affectedLots: text('affected_lots'), // JSON array of lot IDs
  quantityAffected: real('quantity_affected'),
  unit: text('unit'),
  status: text('status', {
    enum: ['initiated', 'in_progress', 'completed', 'closed']
  }).notNull().default('initiated'),
  notificationsSent: integer('notifications_sent', { mode: 'boolean' }).notNull().default(false),
  regulatoryNotified: integer('regulatory_notified', { mode: 'boolean' }).notNull().default(false),
  actionsTaken: text('actions_taken'),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  closedBy: text('closed_by'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Cleaning Records
 * Track cleaning and sanitation
 */
export const cleaningRecords = sqliteTable('cleaning_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  area: text('area').notNull(), // Production area, equipment name
  cleaningType: text('cleaning_type', {
    enum: ['routine', 'deep', 'sanitation', 'allergen']
  }).notNull(),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp' }),
  completedDate: integer('completed_date', { mode: 'timestamp' }),
  status: text('status', {
    enum: ['scheduled', 'in_progress', 'completed', 'verified', 'failed']
  }).notNull().default('scheduled'),
  productsUsed: text('products_used'), // JSON array
  procedure: text('procedure'),
  performedBy: text('performed_by'),
  verifiedBy: text('verified_by'),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Type exports
export type Lot = typeof lots.$inferSelect;
export type InsertLot = typeof lots.$inferInsert;
export type LotMovement = typeof lotMovements.$inferSelect;
export type InsertLotMovement = typeof lotMovements.$inferInsert;
export type ProductionTraceability = typeof productionTraceability.$inferSelect;
export type InsertProductionTraceability = typeof productionTraceability.$inferInsert;
export type ProductionInputLot = typeof productionInputLots.$inferSelect;
export type InsertProductionInputLot = typeof productionInputLots.$inferInsert;
export type HaccpControlPoint = typeof haccpControlPoints.$inferSelect;
export type InsertHaccpControlPoint = typeof haccpControlPoints.$inferInsert;
export type HaccpRecord = typeof haccpRecords.$inferSelect;
export type InsertHaccpRecord = typeof haccpRecords.$inferInsert;
export type TemperatureLog = typeof temperatureLogs.$inferSelect;
export type InsertTemperatureLog = typeof temperatureLogs.$inferInsert;
export type ProductRecall = typeof productRecalls.$inferSelect;
export type InsertProductRecall = typeof productRecalls.$inferInsert;
export type CleaningRecord = typeof cleaningRecords.$inferSelect;
export type InsertCleaningRecord = typeof cleaningRecords.$inferInsert;
