/**
 * Traceability API Routes
 * Manage lots, HACCP, and food safety tracking
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { traceabilityService } from '../services/traceability.service';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// ============================================
// LOTS
// ============================================

/**
 * GET /traceability/lots
 * List all lots
 */
app.get('/lots', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const type = c.req.query('type');
  const status = c.req.query('status');
  const search = c.req.query('search');

  const lots = await traceabilityService.listLots(organizationId, {
    type,
    status,
    search,
  });

  return c.json({
    success: true,
    data: lots,
  });
});

/**
 * GET /traceability/lots/expiring
 * Get lots expiring soon
 */
app.get('/lots/expiring', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const days = parseInt(c.req.query('days') || '7');

  const lots = await traceabilityService.getExpiringLots(organizationId, days);

  return c.json({
    success: true,
    data: lots,
  });
});

/**
 * GET /traceability/lots/stats
 * Get lot statistics
 */
app.get('/lots/stats', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const stats = await traceabilityService.getLotStats(organizationId);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /traceability/lots/:id
 * Get lot by ID with movements
 */
app.get('/lots/:id', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const lotId = c.req.param('id');

  const lot = await traceabilityService.getLotById(organizationId, lotId);

  if (!lot) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Lot not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: lot,
  });
});

/**
 * POST /traceability/lots
 * Create a new lot
 */
app.post('/lots', requirePermissions('traceability:create'), async (c) => {
  const organizationId = c.get('organizationId');
  const body = await c.req.json();

  const lot = await traceabilityService.createLot({
    organizationId,
    lotNumber: body.lotNumber,
    inventoryItemId: body.inventoryItemId,
    type: body.type || 'raw_material',
    supplierId: body.supplierId,
    supplierLotNumber: body.supplierLotNumber,
    initialQuantity: body.initialQuantity,
    currentQuantity: body.initialQuantity,
    unit: body.unit,
    productionDate: body.productionDate ? new Date(body.productionDate) : undefined,
    receptionDate: body.receptionDate ? new Date(body.receptionDate) : new Date(),
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    bestBeforeDate: body.bestBeforeDate ? new Date(body.bestBeforeDate) : undefined,
    warehouseId: body.warehouseId,
    location: body.location,
    status: body.status || 'available',
    qualityStatus: body.qualityStatus || 'pending',
    unitCost: body.unitCost,
    notes: body.notes,
  });

  return c.json({
    success: true,
    data: lot,
  }, 201);
});

/**
 * PUT /traceability/lots/:id
 * Update a lot
 */
app.put('/lots/:id', requirePermissions('traceability:update'), async (c) => {
  const organizationId = c.get('organizationId');
  const lotId = c.req.param('id');
  const body = await c.req.json();

  // Convert date strings to Date objects
  if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
  if (body.bestBeforeDate) body.bestBeforeDate = new Date(body.bestBeforeDate);
  if (body.productionDate) body.productionDate = new Date(body.productionDate);

  const lot = await traceabilityService.updateLot(lotId, organizationId, body);

  if (!lot) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Lot not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: lot,
  });
});

/**
 * POST /traceability/lots/:id/movements
 * Record a lot movement
 */
app.post('/lots/:id/movements', requirePermissions('traceability:update'), async (c) => {
  const lotId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json();

  const movement = await traceabilityService.recordMovement({
    lotId,
    type: body.type,
    quantity: body.quantity,
    quantityBefore: body.quantityBefore,
    quantityAfter: body.quantityAfter,
    referenceType: body.referenceType,
    referenceId: body.referenceId,
    fromWarehouseId: body.fromWarehouseId,
    toWarehouseId: body.toWarehouseId,
    reason: body.reason,
    performedBy: userId,
  });

  return c.json({
    success: true,
    data: movement,
  }, 201);
});

/**
 * GET /traceability/lots/:id/trace
 * Trace production batch (inputs and outputs)
 */
app.get('/lots/:id/trace', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const lotId = c.req.param('id');

  const trace = await traceabilityService.traceProductionBatch(organizationId, lotId);

  return c.json({
    success: true,
    data: trace,
  });
});

// ============================================
// HACCP CONTROL POINTS
// ============================================

/**
 * GET /traceability/haccp/control-points
 * List all HACCP control points
 */
app.get('/haccp/control-points', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const controlPoints = await traceabilityService.listControlPoints(organizationId);

  return c.json({
    success: true,
    data: controlPoints,
  });
});

/**
 * GET /traceability/haccp/control-points/:id
 * Get control point by ID
 */
app.get('/haccp/control-points/:id', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const cpId = c.req.param('id');

  const controlPoint = await traceabilityService.getControlPointById(organizationId, cpId);

  if (!controlPoint) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Control point not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: controlPoint,
  });
});

/**
 * POST /traceability/haccp/control-points
 * Create a new control point
 */
app.post('/haccp/control-points', requirePermissions('traceability:create'), async (c) => {
  const organizationId = c.get('organizationId');
  const body = await c.req.json();

  const controlPoint = await traceabilityService.createControlPoint({
    organizationId,
    code: body.code,
    name: body.name,
    type: body.type || 'ccp',
    description: body.description,
    hazardType: body.hazardType,
    hazardDescription: body.hazardDescription,
    controlMeasure: body.controlMeasure,
    criticalLimit: body.criticalLimit,
    monitoringProcedure: body.monitoringProcedure,
    monitoringFrequency: body.monitoringFrequency,
    correctiveAction: body.correctiveAction,
    verificationProcedure: body.verificationProcedure,
    processStep: body.processStep,
    location: body.location,
    responsibleRole: body.responsibleRole,
    active: body.active !== false,
  });

  return c.json({
    success: true,
    data: controlPoint,
  }, 201);
});

/**
 * PUT /traceability/haccp/control-points/:id
 * Update a control point
 */
app.put('/haccp/control-points/:id', requirePermissions('traceability:update'), async (c) => {
  const organizationId = c.get('organizationId');
  const cpId = c.req.param('id');
  const body = await c.req.json();

  const controlPoint = await traceabilityService.updateControlPoint(cpId, organizationId, body);

  if (!controlPoint) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Control point not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: controlPoint,
  });
});

/**
 * DELETE /traceability/haccp/control-points/:id
 * Delete a control point
 */
app.delete('/haccp/control-points/:id', requirePermissions('traceability:delete'), async (c) => {
  const organizationId = c.get('organizationId');
  const cpId = c.req.param('id');

  await traceabilityService.deleteControlPoint(cpId, organizationId);

  return c.json({
    success: true,
    message: 'Control point deleted',
  });
});

// ============================================
// HACCP RECORDS
// ============================================

/**
 * GET /traceability/haccp/control-points/:id/records
 * Get records for a control point
 */
app.get('/haccp/control-points/:id/records', requirePermissions('traceability:read'), async (c) => {
  const cpId = c.req.param('id');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const records = await traceabilityService.listRecords(cpId, {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  return c.json({
    success: true,
    data: records,
  });
});

/**
 * POST /traceability/haccp/records
 * Create a new HACCP record
 */
app.post('/haccp/records', requirePermissions('traceability:create'), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const record = await traceabilityService.createRecord({
    controlPointId: body.controlPointId,
    recordDate: new Date(body.recordDate || Date.now()),
    recordTime: body.recordTime,
    measuredValue: body.measuredValue,
    unit: body.unit,
    withinLimits: body.withinLimits,
    deviationDetails: body.deviationDetails,
    correctiveActionTaken: body.correctiveActionTaken,
    lotId: body.lotId,
    productionOrderId: body.productionOrderId,
    recordedBy: userId,
    notes: body.notes,
  });

  return c.json({
    success: true,
    data: record,
  }, 201);
});

/**
 * GET /traceability/haccp/deviations
 * Get recent deviations
 */
app.get('/haccp/deviations', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const days = parseInt(c.req.query('days') || '30');

  const deviations = await traceabilityService.getDeviations(organizationId, days);

  return c.json({
    success: true,
    data: deviations,
  });
});

/**
 * GET /traceability/haccp/stats
 * Get HACCP statistics
 */
app.get('/haccp/stats', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const stats = await traceabilityService.getHaccpStats(organizationId);

  return c.json({
    success: true,
    data: stats,
  });
});

// ============================================
// TEMPERATURE LOGS
// ============================================

/**
 * GET /traceability/temperature
 * List temperature logs
 */
app.get('/temperature', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const equipmentId = c.req.query('equipmentId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const logs = await traceabilityService.listTemperatureLogs(organizationId, {
    equipmentId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  return c.json({
    success: true,
    data: logs,
  });
});

/**
 * POST /traceability/temperature
 * Create temperature log
 */
app.post('/temperature', requirePermissions('traceability:create'), async (c) => {
  const organizationId = c.get('organizationId');
  const userId = c.get('userId');
  const body = await c.req.json();

  const withinLimits =
    (body.minLimit === undefined || body.temperature >= body.minLimit) &&
    (body.maxLimit === undefined || body.temperature <= body.maxLimit);

  const log = await traceabilityService.createTemperatureLog({
    organizationId,
    equipmentId: body.equipmentId,
    equipmentName: body.equipmentName,
    location: body.location,
    recordedAt: new Date(body.recordedAt || Date.now()),
    temperature: body.temperature,
    unit: body.unit || 'C',
    minLimit: body.minLimit,
    maxLimit: body.maxLimit,
    withinLimits,
    source: body.source || 'manual',
    recordedBy: userId,
    notes: body.notes,
  });

  return c.json({
    success: true,
    data: log,
  }, 201);
});

/**
 * GET /traceability/temperature/alerts
 * Get temperature alerts (out of range)
 */
app.get('/temperature/alerts', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const alerts = await traceabilityService.getTemperatureAlerts(organizationId);

  return c.json({
    success: true,
    data: alerts,
  });
});

// ============================================
// PRODUCT RECALLS
// ============================================

/**
 * GET /traceability/recalls
 * List product recalls
 */
app.get('/recalls', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const recalls = await traceabilityService.listRecalls(organizationId);

  return c.json({
    success: true,
    data: recalls,
  });
});

/**
 * GET /traceability/recalls/:id
 * Get recall by ID
 */
app.get('/recalls/:id', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const recallId = c.req.param('id');

  const recall = await traceabilityService.getRecallById(organizationId, recallId);

  if (!recall) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Recall not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: recall,
  });
});

/**
 * POST /traceability/recalls
 * Create a product recall
 */
app.post('/recalls', requirePermissions('traceability:create'), async (c) => {
  const organizationId = c.get('organizationId');
  const userId = c.get('userId');
  const body = await c.req.json();

  const recall = await traceabilityService.createRecall({
    organizationId,
    recallNumber: body.recallNumber || `RCL-${Date.now()}`,
    recallDate: new Date(body.recallDate || Date.now()),
    reason: body.reason,
    riskLevel: body.riskLevel,
    description: body.description,
    affectedProducts: body.affectedProducts ? JSON.stringify(body.affectedProducts) : undefined,
    affectedLots: body.affectedLots ? JSON.stringify(body.affectedLots) : undefined,
    quantityAffected: body.quantityAffected,
    unit: body.unit,
    status: body.status || 'initiated',
    createdBy: userId,
  });

  return c.json({
    success: true,
    data: recall,
  }, 201);
});

/**
 * PUT /traceability/recalls/:id
 * Update a recall
 */
app.put('/recalls/:id', requirePermissions('traceability:update'), async (c) => {
  const organizationId = c.get('organizationId');
  const recallId = c.req.param('id');
  const body = await c.req.json();

  if (body.affectedProducts) body.affectedProducts = JSON.stringify(body.affectedProducts);
  if (body.affectedLots) body.affectedLots = JSON.stringify(body.affectedLots);

  const recall = await traceabilityService.updateRecall(recallId, organizationId, body);

  if (!recall) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Recall not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: recall,
  });
});

// ============================================
// CLEANING RECORDS
// ============================================

/**
 * GET /traceability/cleaning
 * List cleaning records
 */
app.get('/cleaning', requirePermissions('traceability:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const area = c.req.query('area');
  const status = c.req.query('status');

  const records = await traceabilityService.listCleaningRecords(organizationId, {
    area,
    status,
  });

  return c.json({
    success: true,
    data: records,
  });
});

/**
 * POST /traceability/cleaning
 * Create cleaning record
 */
app.post('/cleaning', requirePermissions('traceability:create'), async (c) => {
  const organizationId = c.get('organizationId');
  const userId = c.get('userId');
  const body = await c.req.json();

  const record = await traceabilityService.createCleaningRecord({
    organizationId,
    area: body.area,
    cleaningType: body.cleaningType,
    scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
    completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
    status: body.status || 'scheduled',
    productsUsed: body.productsUsed ? JSON.stringify(body.productsUsed) : undefined,
    procedure: body.procedure,
    performedBy: userId,
    notes: body.notes,
  });

  return c.json({
    success: true,
    data: record,
  }, 201);
});

/**
 * PUT /traceability/cleaning/:id
 * Update cleaning record
 */
app.put('/cleaning/:id', requirePermissions('traceability:update'), async (c) => {
  const organizationId = c.get('organizationId');
  const recordId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json();

  if (body.productsUsed) body.productsUsed = JSON.stringify(body.productsUsed);
  if (body.scheduledDate) body.scheduledDate = new Date(body.scheduledDate);
  if (body.completedDate) body.completedDate = new Date(body.completedDate);

  // If marking as verified, add verifier info
  if (body.status === 'verified') {
    body.verifiedBy = userId;
    body.verifiedAt = new Date();
  }

  const record = await traceabilityService.updateCleaningRecord(recordId, organizationId, body);

  if (!record) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Cleaning record not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: record,
  });
});

export default app;
