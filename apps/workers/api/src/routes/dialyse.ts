/**
 * Dialyse Routes
 * /api/v1/dialyse
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { logger } from '../utils/logger';
import {
  createPatientSchema,
  updatePatientSchema,
  updateSerologySchema,
  listPatientsQuerySchema,
  createVascularAccessSchema,
  updateVascularAccessSchema,
  createPrescriptionSchema,
  updatePrescriptionSchema,
  createMachineSchema,
  updateMachineSchema,
  createMaintenanceRecordSchema,
  updateMaintenanceRecordSchema,
  createSessionSchema,
  updateSessionSchema,
  createSessionSlotSchema,
  updateSessionSlotSchema,
  createSessionRecordSchema,
  createIncidentSchema,
  createSessionMedicationSchema,
  createSessionConsumableSchema,
  createLabResultSchema,
  updateLabResultSchema,
  createClinicalAlertSchema,
  updateClinicalAlertSchema,
  listSessionsQuerySchema,
  listAlertsQuerySchema,
} from '@perfex/shared';
import {
  patientService,
  vascularAccessService,
  prescriptionService,
  machineService,
  sessionService,
  labService,
  alertService,
  protocolService,
  staffService,
  billingService,
  transportService,
  consumablesService,
  reportsService,
} from '../services/dialyse';
import { requireAuth, requirePermission } from '../middleware/auth';
import type { Env } from '../types';
import { z } from 'zod';
import { validatePagination, parseMonths, validateOrganizationId } from '../utils/validation';

const dialyse = new Hono<{ Bindings: Env }>();

// All routes require authentication
dialyse.use('/*', requireAuth);

// ============================================================================
// PATIENTS ROUTES
// ============================================================================

/**
 * GET /dialyse/patients
 * List patients with filters
 */
dialyse.get(
  '/patients',
  requirePermission('dialyse:patients:read'),
  zValidator('query', listPatientsQuerySchema),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const query = c.req.valid('query');

      const result = await patientService.list(organizationId, query);

      return c.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/stats
 * Get patient statistics
 */
dialyse.get(
  '/patients/stats',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;

      const stats = await patientService.getStats(organizationId);

      return c.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/isolation
 * Get patients requiring isolation
 */
dialyse.get(
  '/patients/isolation',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;

      const patients = await patientService.getIsolationPatients(organizationId);

      return c.json({
        success: true,
        data: patients,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:id
 * Get a single patient with full details
 */
dialyse.get(
  '/patients/:id',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('id');
      const full = c.req.query('full') === 'true';

      const patient = full
        ? await patientService.getByIdFull(organizationId, patientId)
        : await patientService.getByIdWithContact(organizationId, patientId);

      if (!patient) {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }

      return c.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/patients
 * Create a new patient
 */
dialyse.post(
  '/patients',
  requirePermission('dialyse:patients:create'),
  zValidator('json', createPatientSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = c.req.valid('json');

    try {
      const patient = await patientService.create(organizationId, userId, data);

      return c.json({
        success: true,
        data: patient,
      }, 201);
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message || 'Failed to create patient',
      }, 400);
    }
  }
);

/**
 * PUT /dialyse/patients/:id
 * Update a patient
 */
dialyse.put(
  '/patients/:id',
  requirePermission('dialyse:patients:update'),
  zValidator('json', updatePatientSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const patientId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const patient = await patientService.update(organizationId, patientId, userId, data);

      return c.json({
        success: true,
        data: patient,
      });
    } catch (error: any) {
      if (error.message === 'Patient not found') {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }
      return c.json({
        success: false,
        error: error.message || 'Failed to update patient',
      }, 400);
    }
  }
);

/**
 * PUT /dialyse/patients/:id/serology
 * Update patient serology status
 */
dialyse.put(
  '/patients/:id/serology',
  requirePermission('dialyse:patients:update'),
  zValidator('json', updateSerologySchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const patientId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const patient = await patientService.updateSerology(organizationId, patientId, userId, data);

      return c.json({
        success: true,
        data: patient,
      });
    } catch (error: any) {
      if (error.message === 'Patient not found') {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }
      return c.json({
        success: false,
        error: error.message || 'Failed to update serology',
      }, 400);
    }
  }
);

/**
 * DELETE /dialyse/patients/:id
 * Delete a patient
 */
dialyse.delete(
  '/patients/:id',
  requirePermission('dialyse:patients:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const patientId = c.req.param('id');

    try {
      await patientService.delete(organizationId, patientId);

      return c.json({
        success: true,
        data: { message: 'Patient deleted successfully' },
      });
    } catch (error: any) {
      if (error.message === 'Patient not found') {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }
      return c.json({
        success: false,
        error: error.message || 'Failed to delete patient',
      }, 400);
    }
  }
);

// ============================================================================
// VASCULAR ACCESS ROUTES
// ============================================================================

/**
 * GET /dialyse/patients/:patientId/accesses
 * List vascular accesses for a patient
 */
dialyse.get(
  '/patients/:patientId/accesses',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');

      const accesses = await vascularAccessService.listByPatient(organizationId, patientId);

      return c.json({
        success: true,
        data: accesses,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:patientId/accesses/active
 * Get active vascular access for a patient
 */
dialyse.get(
  '/patients/:patientId/accesses/active',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');

      const access = await vascularAccessService.getActiveByPatient(organizationId, patientId);

      if (!access) {
        return c.json({ success: false, error: 'No active vascular access found' }, 404);
      }

      return c.json({
        success: true,
        data: access,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/patients/:patientId/accesses
 * Create a new vascular access
 */
dialyse.post(
  '/patients/:patientId/accesses',
  requirePermission('dialyse:patients:update'),
  zValidator('json', createVascularAccessSchema.omit({ patientId: true })),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const patientId = c.req.param('patientId');
    const data = c.req.valid('json');

    try {
      const access = await vascularAccessService.create(organizationId, userId, {
        ...data,
        patientId,
      });

      return c.json({
        success: true,
        data: access,
      }, 201);
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message || 'Failed to create vascular access',
      }, 400);
    }
  }
);

/**
 * GET /dialyse/accesses/:id
 * Get a single vascular access
 */
dialyse.get(
  '/accesses/:id',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const accessId = c.req.param('id');

      const access = await vascularAccessService.getById(organizationId, accessId);

      if (!access) {
        return c.json({ success: false, error: 'Vascular access not found' }, 404);
      }

      return c.json({
        success: true,
        data: access,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * PUT /dialyse/accesses/:id
 * Update a vascular access
 */
dialyse.put(
  '/accesses/:id',
  requirePermission('dialyse:patients:update'),
  zValidator('json', updateVascularAccessSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const accessId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const access = await vascularAccessService.update(organizationId, accessId, data);

      return c.json({
        success: true,
        data: access,
      });
    } catch (error: any) {
      if (error.message === 'Vascular access not found') {
        return c.json({ success: false, error: 'Vascular access not found' }, 404);
      }
      return c.json({
        success: false,
        error: error.message || 'Failed to update vascular access',
      }, 400);
    }
  }
);

/**
 * DELETE /dialyse/accesses/:id
 * Delete a vascular access
 */
dialyse.delete(
  '/accesses/:id',
  requirePermission('dialyse:patients:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const accessId = c.req.param('id');

    try {
      await vascularAccessService.delete(organizationId, accessId);

      return c.json({
        success: true,
        data: { message: 'Vascular access deleted successfully' },
      });
    } catch (error: any) {
      if (error.message === 'Vascular access not found') {
        return c.json({ success: false, error: 'Vascular access not found' }, 404);
      }
      return c.json({
        success: false,
        error: error.message || 'Failed to delete vascular access',
      }, 400);
    }
  }
);

// ============================================================================
// PRESCRIPTIONS ROUTES
// ============================================================================

/**
 * GET /dialyse/prescriptions
 * List prescriptions
 */
dialyse.get(
  '/prescriptions',
  requirePermission('dialyse:prescriptions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const status = c.req.query('status');
      const patientId = c.req.query('patientId');
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'));

      const result = await prescriptionService.list(organizationId, { status, patientId, limit, offset });

      return c.json({
        success: true,
        data: result.data,
        meta: { total: result.total, limit, offset },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/prescriptions/:id
 * Get a prescription
 */
dialyse.get(
  '/prescriptions/:id',
  requirePermission('dialyse:prescriptions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const prescriptionId = c.req.param('id');
      const withPatient = c.req.query('withPatient') === 'true';

      const prescription = withPatient
        ? await prescriptionService.getByIdWithPatient(organizationId, prescriptionId)
        : await prescriptionService.getById(organizationId, prescriptionId);

      if (!prescription) {
        return c.json({ success: false, error: 'Prescription not found' }, 404);
      }

      return c.json({ success: true, data: prescription });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:patientId/prescriptions
 * Get prescriptions for a patient
 */
dialyse.get(
  '/patients/:patientId/prescriptions',
  requirePermission('dialyse:prescriptions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');

      const prescriptions = await prescriptionService.listByPatient(organizationId, patientId);

      return c.json({ success: true, data: prescriptions });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:patientId/prescriptions/active
 * Get active prescription for a patient
 */
dialyse.get(
  '/patients/:patientId/prescriptions/active',
  requirePermission('dialyse:prescriptions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');

      const prescription = await prescriptionService.getActiveByPatient(organizationId, patientId);

      if (!prescription) {
        return c.json({ success: false, error: 'No active prescription found' }, 404);
      }

      return c.json({ success: true, data: prescription });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/prescriptions
 * Create a prescription
 */
dialyse.post(
  '/prescriptions',
  requirePermission('dialyse:prescriptions:create'),
  zValidator('json', createPrescriptionSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = c.req.valid('json');

    try {
      const prescription = await prescriptionService.create(organizationId, userId, data);
      return c.json({ success: true, data: prescription }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/prescriptions/:id
 * Update a prescription
 */
dialyse.put(
  '/prescriptions/:id',
  requirePermission('dialyse:prescriptions:update'),
  zValidator('json', updatePrescriptionSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const prescriptionId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const prescription = await prescriptionService.update(organizationId, prescriptionId, data);
      return c.json({ success: true, data: prescription });
    } catch (error: any) {
      if (error.message === 'Prescription not found') {
        return c.json({ success: false, error: 'Prescription not found' }, 404);
      }
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/prescriptions/:id/renew
 * Renew a prescription
 */
dialyse.post(
  '/prescriptions/:id/renew',
  requirePermission('dialyse:prescriptions:create'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const prescriptionId = c.req.param('id');

    try {
      const prescription = await prescriptionService.renew(organizationId, prescriptionId, userId);
      return c.json({ success: true, data: prescription }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/prescriptions/:id/cancel
 * Cancel a prescription
 */
dialyse.post(
  '/prescriptions/:id/cancel',
  requirePermission('dialyse:prescriptions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const prescriptionId = c.req.param('id');

    try {
      const prescription = await prescriptionService.cancel(organizationId, prescriptionId);
      return c.json({ success: true, data: prescription });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// MACHINES ROUTES
// ============================================================================

/**
 * GET /dialyse/machines
 * List machines
 */
dialyse.get(
  '/machines',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const status = c.req.query('status');
      const isolationOnly = c.req.query('isolationOnly') === 'true' ? true : c.req.query('isolationOnly') === 'false' ? false : undefined;
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'), { defaultLimit: 50 });

      const result = await machineService.list(organizationId, { status, isolationOnly, limit, offset });

      return c.json({
        success: true,
        data: result.data,
        meta: { total: result.total, limit, offset },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/machines/stats
 * Get machine statistics
 */
dialyse.get(
  '/machines/stats',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const stats = await machineService.getStats(organizationId);
      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/machines/available
 * Get available machines
 */
dialyse.get(
  '/machines/available',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const requiresIsolation = c.req.query('requiresIsolation') === 'true';

      const machines = await machineService.getAvailable(organizationId, requiresIsolation);

      return c.json({ success: true, data: machines });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/machines/:id
 * Get a machine
 */
dialyse.get(
  '/machines/:id',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const machineId = c.req.param('id');
      const withMaintenance = c.req.query('withMaintenance') === 'true';

      const machine = withMaintenance
        ? await machineService.getByIdWithMaintenance(organizationId, machineId)
        : await machineService.getById(organizationId, machineId);

      if (!machine) {
        return c.json({ success: false, error: 'Machine not found' }, 404);
      }

      return c.json({ success: true, data: machine });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/machines
 * Create a machine
 */
dialyse.post(
  '/machines',
  requirePermission('dialyse:machines:create'),
  zValidator('json', createMachineSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = c.req.valid('json');

    try {
      const machine = await machineService.create(organizationId, userId, data);
      return c.json({ success: true, data: machine }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/machines/:id
 * Update a machine
 */
dialyse.put(
  '/machines/:id',
  requirePermission('dialyse:machines:update'),
  zValidator('json', updateMachineSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const machineId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const machine = await machineService.update(organizationId, machineId, data);
      return c.json({ success: true, data: machine });
    } catch (error: any) {
      if (error.message === 'Machine not found') {
        return c.json({ success: false, error: 'Machine not found' }, 404);
      }
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/machines/:id
 * Delete a machine
 */
dialyse.delete(
  '/machines/:id',
  requirePermission('dialyse:machines:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const machineId = c.req.param('id');

    try {
      await machineService.delete(organizationId, machineId);
      return c.json({ success: true, data: { message: 'Machine deleted successfully' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// MAINTENANCE ROUTES
// ============================================================================

/**
 * GET /dialyse/maintenance/stats
 * Get maintenance statistics
 */
dialyse.get(
  '/maintenance/stats',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;

      const stats = await machineService.getMaintenanceStats(organizationId);

      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/maintenance
 * List all maintenance records
 */
dialyse.get(
  '/maintenance',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const { status, type, priority, limit: limitStr, offset: offsetStr } = c.req.query();
      const { limit, offset } = validatePagination(limitStr, offsetStr);

      const result = await machineService.listAllMaintenance(organizationId, {
        status: status || undefined,
        type: type || undefined,
        priority: priority || undefined,
        limit,
        offset,
      });

      return c.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/machines/:machineId/maintenance
 * List maintenance records for a machine
 */
dialyse.get(
  '/machines/:machineId/maintenance',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const machineId = c.req.param('machineId');

      const records = await machineService.listMaintenanceByMachine(organizationId, machineId);

      return c.json({ success: true, data: records });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/maintenance
 * Create maintenance record
 */
dialyse.post(
  '/maintenance',
  requirePermission('dialyse:machines:update'),
  zValidator('json', createMaintenanceRecordSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = c.req.valid('json');

    try {
      const record = await machineService.createMaintenance(organizationId, userId, data);
      return c.json({ success: true, data: record }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/maintenance/:id
 * Update maintenance record
 */
dialyse.put(
  '/maintenance/:id',
  requirePermission('dialyse:machines:update'),
  zValidator('json', updateMaintenanceRecordSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const maintenanceId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const record = await machineService.updateMaintenance(organizationId, maintenanceId, data);
      return c.json({ success: true, data: record });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/maintenance/:id/start
 * Start maintenance (set machine to maintenance status)
 */
dialyse.post(
  '/maintenance/:id/start',
  requirePermission('dialyse:machines:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const maintenanceId = c.req.param('id');

    try {
      const record = await machineService.getMaintenanceById(organizationId, maintenanceId);
      if (!record) {
        return c.json({ success: false, error: 'Maintenance record not found' }, 404);
      }

      await machineService.startMaintenance(organizationId, record.machineId, maintenanceId);
      return c.json({ success: true, data: { message: 'Maintenance started' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/maintenance/:id
 * Delete maintenance record
 */
dialyse.delete(
  '/maintenance/:id',
  requirePermission('dialyse:machines:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const maintenanceId = c.req.param('id');

    try {
      await machineService.deleteMaintenance(organizationId, maintenanceId);
      return c.json({ success: true, data: { message: 'Maintenance record deleted' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// SESSION SLOTS ROUTES
// ============================================================================

/**
 * GET /dialyse/slots
 * List session slots
 */
dialyse.get(
  '/slots',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const activeOnly = c.req.query('activeOnly') !== 'false';

      const slots = await sessionService.listSlots(organizationId, activeOnly);

      return c.json({ success: true, data: slots });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/slots
 * Create session slot
 */
dialyse.post(
  '/slots',
  requirePermission('dialyse:sessions:create'),
  zValidator('json', createSessionSlotSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const data = c.req.valid('json');

    try {
      const slot = await sessionService.createSlot(organizationId, data);
      return c.json({ success: true, data: slot }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/slots/:id
 * Update session slot
 */
dialyse.put(
  '/slots/:id',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', updateSessionSlotSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const slotId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const slot = await sessionService.updateSlot(organizationId, slotId, data);
      return c.json({ success: true, data: slot });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// SESSIONS ROUTES
// ============================================================================

/**
 * GET /dialyse/sessions
 * List sessions with filters
 */
dialyse.get(
  '/sessions',
  requirePermission('dialyse:sessions:read'),
  zValidator('query', listSessionsQuerySchema),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const query = c.req.valid('query');

      const startDate = query.dateFrom ? new Date(query.dateFrom) : new Date();
      const endDate = query.dateTo ? new Date(query.dateTo) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const sessions = await sessionService.listByDateRange(organizationId, startDate, endDate, {
        patientId: query.patientId,
        machineId: query.machineId,
        slotId: query.slotId,
        status: query.status,
      });

      return c.json({ success: true, data: sessions });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/sessions/today
 * Get today's sessions
 */
dialyse.get(
  '/sessions/today',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const sessions = await sessionService.getTodaySessions(organizationId);
      return c.json({ success: true, data: sessions });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/sessions/stats
 * Get session statistics
 */
dialyse.get(
  '/sessions/stats',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const dateFrom = c.req.query('dateFrom');
      const dateTo = c.req.query('dateTo');

      const stats = await sessionService.getStats(
        organizationId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      );

      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/sessions/:id
 * Get a session
 */
dialyse.get(
  '/sessions/:id',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const sessionId = c.req.param('id');
      const withDetails = c.req.query('withDetails') === 'true';

      const session = withDetails
        ? await sessionService.getByIdWithDetails(organizationId, sessionId)
        : await sessionService.getById(organizationId, sessionId);

      if (!session) {
        return c.json({ success: false, error: 'Session not found' }, 404);
      }

      return c.json({ success: true, data: session });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:patientId/sessions
 * Get sessions for a patient
 */
dialyse.get(
  '/patients/:patientId/sessions',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');

      const sessions = await sessionService.listByPatient(organizationId, patientId);

      return c.json({ success: true, data: sessions });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/sessions
 * Create a session
 */
dialyse.post(
  '/sessions',
  requirePermission('dialyse:sessions:create'),
  zValidator('json', createSessionSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = c.req.valid('json');

    try {
      const session = await sessionService.create(organizationId, userId, data);
      return c.json({ success: true, data: session }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/recurring
 * Create recurring sessions
 */
dialyse.post(
  '/sessions/recurring',
  requirePermission('dialyse:sessions:create'),
  zValidator('json', createSessionSchema.extend({ weeks: z.number().int().min(1).max(12).default(4) })),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const { weeks, ...data } = c.req.valid('json');

    try {
      const sessions = await sessionService.createRecurringSessions(organizationId, userId, data, weeks);
      return c.json({ success: true, data: sessions }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/sessions/:id
 * Update a session
 */
dialyse.put(
  '/sessions/:id',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', updateSessionSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const sessionId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const session = await sessionService.update(organizationId, sessionId, data);
      return c.json({ success: true, data: session });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:id/check-in
 * Check in patient for session
 */
dialyse.post(
  '/sessions/:id/check-in',
  requirePermission('dialyse:sessions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const sessionId = c.req.param('id');

    try {
      const session = await sessionService.checkIn(organizationId, sessionId);
      return c.json({ success: true, data: session });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:id/start
 * Start session
 */
dialyse.post(
  '/sessions/:id/start',
  requirePermission('dialyse:sessions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const sessionId = c.req.param('id');
    const machineId = c.req.query('machineId');

    try {
      const session = await sessionService.start(organizationId, sessionId, machineId || undefined);
      return c.json({ success: true, data: session });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:id/complete
 * Complete session
 */
dialyse.post(
  '/sessions/:id/complete',
  requirePermission('dialyse:sessions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const sessionId = c.req.param('id');

    try {
      const session = await sessionService.complete(organizationId, sessionId);
      return c.json({ success: true, data: session });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:id/cancel
 * Cancel session
 */
dialyse.post(
  '/sessions/:id/cancel',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', z.object({ reason: z.string().min(1) })),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const sessionId = c.req.param('id');
    const { reason } = c.req.valid('json');

    try {
      const session = await sessionService.cancel(organizationId, sessionId, userId, reason);
      return c.json({ success: true, data: session });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// SESSION RECORDS ROUTES
// ============================================================================

/**
 * GET /dialyse/sessions/:sessionId/records
 * List records for a session
 */
dialyse.get(
  '/sessions/:sessionId/records',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const sessionId = c.req.param('sessionId');
      const records = await sessionService.listRecords(sessionId);
      return c.json({ success: true, data: records });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/sessions/:sessionId/records
 * Create session record
 */
dialyse.post(
  '/sessions/:sessionId/records',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', createSessionRecordSchema.omit({ sessionId: true })),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const data = c.req.valid('json');

    try {
      const record = await sessionService.createRecord(sessionId, userId, { ...data, sessionId });
      return c.json({ success: true, data: record }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:sessionId/incidents
 * Create session incident
 */
dialyse.post(
  '/sessions/:sessionId/incidents',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', createIncidentSchema.omit({ sessionId: true })),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const data = c.req.valid('json');

    try {
      const incident = await sessionService.createIncident(sessionId, userId, { ...data, sessionId });
      return c.json({ success: true, data: incident }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:sessionId/medications
 * Create session medication
 */
dialyse.post(
  '/sessions/:sessionId/medications',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', createSessionMedicationSchema.omit({ sessionId: true })),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const data = c.req.valid('json');

    try {
      const medication = await sessionService.createMedication(sessionId, userId, { ...data, sessionId });
      return c.json({ success: true, data: medication }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:sessionId/consumables
 * Create session consumable
 */
dialyse.post(
  '/sessions/:sessionId/consumables',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', createSessionConsumableSchema.omit({ sessionId: true })),
  async (c) => {
    const sessionId = c.req.param('sessionId');
    const data = c.req.valid('json');

    try {
      const consumable = await sessionService.createConsumable(sessionId, { ...data, sessionId });
      return c.json({ success: true, data: consumable }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/sessions/:sessionId/signatures
 * Add session signature
 */
dialyse.post(
  '/sessions/:sessionId/signatures',
  requirePermission('dialyse:sessions:update'),
  zValidator('json', z.object({
    signatureType: z.enum(['nurse_start', 'nurse_end', 'doctor_review', 'patient_consent']),
    signatureData: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('sessionId');
    const { signatureType, signatureData } = c.req.valid('json');

    try {
      const signature = await sessionService.addSignature(sessionId, userId, signatureType, signatureData);
      return c.json({ success: true, data: signature }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// LAB RESULTS ROUTES
// ============================================================================

/**
 * GET /dialyse/patients/:patientId/labs
 * List lab results for a patient
 */
dialyse.get(
  '/patients/:patientId/labs',
  requirePermission('dialyse:labs:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');
      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'));

      const result = await labService.listByPatient(organizationId, patientId, {
        startDate,
        endDate,
        limit,
        offset,
      });

      return c.json({
        success: true,
        data: result.data,
        meta: { total: result.total, limit, offset },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:patientId/labs/latest
 * Get latest lab result for a patient
 */
dialyse.get(
  '/patients/:patientId/labs/latest',
  requirePermission('dialyse:labs:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');

      const result = await labService.getLatestByPatient(organizationId, patientId);

      if (!result) {
        return c.json({ success: false, error: 'No lab results found' }, 404);
      }

      return c.json({ success: true, data: result });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:patientId/labs/trend
 * Get lab trend for a patient
 */
dialyse.get(
  '/patients/:patientId/labs/trend',
  requirePermission('dialyse:labs:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');
      const marker = c.req.query('marker') || 'hemoglobin';
      const months = parseMonths(c.req.query('months'));

      const trend = await labService.getTrend(organizationId, patientId, marker, months);

      return c.json({ success: true, data: trend });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/labs/:id
 * Get a lab result
 */
dialyse.get(
  '/labs/:id',
  requirePermission('dialyse:labs:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const labId = c.req.param('id');

      const result = await labService.getById(organizationId, labId);

      if (!result) {
        return c.json({ success: false, error: 'Lab result not found' }, 404);
      }

      return c.json({ success: true, data: result });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/labs/stats
 * Get lab statistics
 */
dialyse.get(
  '/labs/stats',
  requirePermission('dialyse:labs:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const dateFrom = c.req.query('dateFrom');
      const dateTo = c.req.query('dateTo');

      const stats = await labService.getStats(
        organizationId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      );

      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/labs/out-of-range
 * Get patients with out-of-range lab values
 */
dialyse.get(
  '/labs/out-of-range',
  requirePermission('dialyse:labs:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const results = await labService.getPatientsWithOutOfRangeValues(organizationId);
      return c.json({ success: true, data: results });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/labs
 * Create a lab result
 */
dialyse.post(
  '/labs',
  requirePermission('dialyse:labs:create'),
  zValidator('json', createLabResultSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = c.req.valid('json');

    try {
      const result = await labService.create(organizationId, userId, data);
      return c.json({ success: true, data: result }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/labs/:id
 * Update a lab result
 */
dialyse.put(
  '/labs/:id',
  requirePermission('dialyse:labs:update'),
  zValidator('json', updateLabResultSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const labId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const result = await labService.update(organizationId, labId, data);
      return c.json({ success: true, data: result });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/labs/:id/review
 * Mark lab result as reviewed
 */
dialyse.post(
  '/labs/:id/review',
  requirePermission('dialyse:labs:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const labId = c.req.param('id');

    try {
      const result = await labService.markReviewed(organizationId, labId, userId);
      return c.json({ success: true, data: result });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/labs/:id
 * Delete a lab result
 */
dialyse.delete(
  '/labs/:id',
  requirePermission('dialyse:labs:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const labId = c.req.param('id');

    try {
      await labService.delete(organizationId, labId);
      return c.json({ success: true, data: { message: 'Lab result deleted successfully' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// ALERTS ROUTES
// ============================================================================

/**
 * GET /dialyse/alerts
 * List alerts
 */
dialyse.get(
  '/alerts',
  requirePermission('dialyse:alerts:read'),
  zValidator('query', listAlertsQuerySchema),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const query = c.req.valid('query');

      const result = await alertService.list(organizationId, query);

      return c.json({
        success: true,
        data: result.data,
        meta: { total: result.total, limit: query.limit, offset: query.offset },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/alerts/critical
 * Get critical and high priority alerts
 */
dialyse.get(
  '/alerts/critical',
  requirePermission('dialyse:alerts:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const alerts = await alertService.getCriticalAlerts(organizationId);
      return c.json({ success: true, data: alerts });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/alerts/stats
 * Get alert statistics
 */
dialyse.get(
  '/alerts/stats',
  requirePermission('dialyse:alerts:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const stats = await alertService.getStats(organizationId);
      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/patients/:patientId/alerts
 * Get active alerts for a patient
 */
dialyse.get(
  '/patients/:patientId/alerts',
  requirePermission('dialyse:alerts:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const patientId = c.req.param('patientId');

      const alerts = await alertService.getActiveByPatient(organizationId, patientId);

      return c.json({ success: true, data: alerts });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/alerts/:id
 * Get an alert
 */
dialyse.get(
  '/alerts/:id',
  requirePermission('dialyse:alerts:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const alertId = c.req.param('id');
      const withPatient = c.req.query('withPatient') === 'true';

      const alert = withPatient
        ? await alertService.getByIdWithPatient(organizationId, alertId)
        : await alertService.getById(organizationId, alertId);

      if (!alert) {
        return c.json({ success: false, error: 'Alert not found' }, 404);
      }

      return c.json({ success: true, data: alert });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/alerts
 * Create an alert
 */
dialyse.post(
  '/alerts',
  requirePermission('dialyse:alerts:create'),
  zValidator('json', createClinicalAlertSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const data = c.req.valid('json');

    try {
      const alert = await alertService.create(organizationId, data);
      return c.json({ success: true, data: alert }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/alerts/:id
 * Update an alert
 */
dialyse.put(
  '/alerts/:id',
  requirePermission('dialyse:alerts:update'),
  zValidator('json', updateClinicalAlertSchema),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const alertId = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const alert = await alertService.update(organizationId, alertId, data);
      return c.json({ success: true, data: alert });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/alerts/:id/acknowledge
 * Acknowledge an alert
 */
dialyse.post(
  '/alerts/:id/acknowledge',
  requirePermission('dialyse:alerts:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const alertId = c.req.param('id');

    try {
      const alert = await alertService.acknowledge(organizationId, alertId, userId);
      return c.json({ success: true, data: alert });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/alerts/:id/resolve
 * Resolve an alert
 */
dialyse.post(
  '/alerts/:id/resolve',
  requirePermission('dialyse:alerts:update'),
  zValidator('json', z.object({ notes: z.string().optional() })),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const alertId = c.req.param('id');
    const { notes } = c.req.valid('json');

    try {
      const alert = await alertService.resolve(organizationId, alertId, userId, notes);
      return c.json({ success: true, data: alert });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/alerts/:id/dismiss
 * Dismiss an alert
 */
dialyse.post(
  '/alerts/:id/dismiss',
  requirePermission('dialyse:alerts:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const alertId = c.req.param('id');

    try {
      const alert = await alertService.dismiss(organizationId, alertId);
      return c.json({ success: true, data: alert });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/alerts/generate
 * Run automated alert generation
 */
dialyse.post(
  '/alerts/generate',
  requirePermission('dialyse:alerts:create'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;

    try {
      const result = await alertService.runAutomatedAlertGeneration(organizationId);
      return c.json({ success: true, data: result });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /dialyse/dashboard
 * Get dashboard data
 */
dialyse.get(
  '/dashboard',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;

      const [patientStats, machineStats, sessionStats, alertStats, todaySessions, criticalAlerts] = await Promise.all([
        patientService.getStats(organizationId),
        machineService.getStats(organizationId),
        sessionService.getStats(organizationId),
        alertService.getStats(organizationId),
        sessionService.getTodaySessions(organizationId),
        alertService.getCriticalAlerts(organizationId),
      ]);

      return c.json({
        success: true,
        data: {
          patients: patientStats,
          machines: machineStats,
          sessions: sessionStats,
          alerts: alertStats,
          todaySessions,
          criticalAlerts,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

// ============================================================================
// PROTOCOLS ROUTES
// ============================================================================

/**
 * GET /dialyse/protocols
 * List protocols
 */
dialyse.get(
  '/protocols',
  requirePermission('dialyse:prescriptions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const status = c.req.query('status');
      const type = c.req.query('type');
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'));

      const result = await protocolService.list(organizationId, { status, type, limit, offset });
      return c.json({ success: true, data: result.data, meta: { total: result.total, limit, offset } });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/protocols/stats
 */
dialyse.get(
  '/protocols/stats',
  requirePermission('dialyse:prescriptions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const stats = await protocolService.getStats(organizationId);
      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/protocols/:id
 */
dialyse.get(
  '/protocols/:id',
  requirePermission('dialyse:prescriptions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const id = c.req.param('id');
      const protocol = await protocolService.getById(organizationId, id);
      if (!protocol) return c.json({ success: false, error: 'Protocol not found' }, 404);
      return c.json({ success: true, data: protocol });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/protocols
 */
dialyse.post(
  '/protocols',
  requirePermission('dialyse:prescriptions:create'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = await c.req.json();
    try {
      const protocol = await protocolService.create(organizationId, userId, data);
      return c.json({ success: true, data: protocol }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/protocols/:id
 */
dialyse.put(
  '/protocols/:id',
  requirePermission('dialyse:prescriptions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
      const protocol = await protocolService.update(organizationId, id, data);
      return c.json({ success: true, data: protocol });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/protocols/:id/duplicate
 */
dialyse.post(
  '/protocols/:id/duplicate',
  requirePermission('dialyse:prescriptions:create'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const id = c.req.param('id');
    try {
      const protocol = await protocolService.duplicate(organizationId, id, userId);
      return c.json({ success: true, data: protocol }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/protocols/:id
 */
dialyse.delete(
  '/protocols/:id',
  requirePermission('dialyse:prescriptions:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    try {
      await protocolService.delete(organizationId, id);
      return c.json({ success: true, data: { message: 'Protocol deleted' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// STAFF ROUTES
// ============================================================================

/**
 * GET /dialyse/staff
 */
dialyse.get(
  '/staff',
  requirePermission('dialyse:staff:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const role = c.req.query('role');
      const status = c.req.query('status');
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'));

      const result = await staffService.list(organizationId, { role, status, limit, offset });
      return c.json({ success: true, data: result.data, meta: { total: result.total, limit, offset } });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/staff/stats
 */
dialyse.get(
  '/staff/stats',
  requirePermission('dialyse:staff:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const stats = await staffService.getStats(organizationId);
      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/staff/:id
 */
dialyse.get(
  '/staff/:id',
  requirePermission('dialyse:staff:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const id = c.req.param('id');
      const staff = await staffService.getById(organizationId, id);
      if (!staff) return c.json({ success: false, error: 'Staff not found' }, 404);
      return c.json({ success: true, data: staff });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/staff
 */
dialyse.post(
  '/staff',
  requirePermission('dialyse:staff:write'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = await c.req.json();
    try {
      const staff = await staffService.create(organizationId, userId, data);
      return c.json({ success: true, data: staff }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/staff/:id
 */
dialyse.put(
  '/staff/:id',
  requirePermission('dialyse:staff:write'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
      const staff = await staffService.update(organizationId, id, data);
      return c.json({ success: true, data: staff });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/staff/:id/schedule
 */
dialyse.put(
  '/staff/:id/schedule',
  requirePermission('dialyse:staff:write'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const { schedule } = await c.req.json();
    try {
      const staff = await staffService.updateSchedule(organizationId, id, schedule);
      return c.json({ success: true, data: staff });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/staff/:id
 */
dialyse.delete(
  '/staff/:id',
  requirePermission('dialyse:staff:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    try {
      await staffService.delete(organizationId, id);
      return c.json({ success: true, data: { message: 'Staff deleted' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// BILLING ROUTES
// ============================================================================

/**
 * GET /dialyse/billing
 */
dialyse.get(
  '/billing',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const status = c.req.query('status');
      const patientId = c.req.query('patientId');
      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'));

      const result = await billingService.list(organizationId, { status, patientId, startDate, endDate, limit, offset });
      return c.json({ success: true, data: result.data, meta: { total: result.total, limit, offset } });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/billing/stats
 */
dialyse.get(
  '/billing/stats',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const stats = await billingService.getStats(organizationId);
      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/billing/:id
 */
dialyse.get(
  '/billing/:id',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const id = c.req.param('id');
      const billing = await billingService.getById(organizationId, id);
      if (!billing) return c.json({ success: false, error: 'Billing not found' }, 404);
      return c.json({ success: true, data: billing });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/billing
 */
dialyse.post(
  '/billing',
  requirePermission('dialyse:sessions:create'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = await c.req.json();
    try {
      const billing = await billingService.create(organizationId, userId, data);
      return c.json({ success: true, data: billing }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/billing/:id
 */
dialyse.put(
  '/billing/:id',
  requirePermission('dialyse:sessions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
      const billing = await billingService.update(organizationId, id, data);
      return c.json({ success: true, data: billing });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/billing/:id/pay
 */
dialyse.post(
  '/billing/:id/pay',
  requirePermission('dialyse:sessions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const { paidAmount, paidDate } = await c.req.json();
    try {
      const billing = await billingService.markPaid(organizationId, id, paidAmount, paidDate);
      return c.json({ success: true, data: billing });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/billing/:id
 */
dialyse.delete(
  '/billing/:id',
  requirePermission('dialyse:sessions:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    try {
      await billingService.delete(organizationId, id);
      return c.json({ success: true, data: { message: 'Billing deleted' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// TRANSPORT ROUTES
// ============================================================================

/**
 * GET /dialyse/transport
 */
dialyse.get(
  '/transport',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const status = c.req.query('status');
      const date = c.req.query('date');
      const patientId = c.req.query('patientId');
      const direction = c.req.query('direction');
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'));

      const result = await transportService.list(organizationId, { status, date, patientId, direction, limit, offset });
      return c.json({ success: true, data: result.data, meta: { total: result.total, limit, offset } });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/transport/stats
 */
dialyse.get(
  '/transport/stats',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const stats = await transportService.getStats(organizationId);
      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/transport/:id
 */
dialyse.get(
  '/transport/:id',
  requirePermission('dialyse:sessions:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const id = c.req.param('id');
      const transport = await transportService.getById(organizationId, id);
      if (!transport) return c.json({ success: false, error: 'Transport not found' }, 404);
      return c.json({ success: true, data: transport });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/transport
 */
dialyse.post(
  '/transport',
  requirePermission('dialyse:sessions:create'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = await c.req.json();
    try {
      const transport = await transportService.create(organizationId, userId, data);
      return c.json({ success: true, data: transport }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/transport/:id
 */
dialyse.put(
  '/transport/:id',
  requirePermission('dialyse:sessions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
      const transport = await transportService.update(organizationId, id, data);
      return c.json({ success: true, data: transport });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PATCH /dialyse/transport/:id/status
 */
dialyse.patch(
  '/transport/:id/status',
  requirePermission('dialyse:sessions:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const { status, actualTime } = await c.req.json();
    try {
      const transport = await transportService.updateStatus(organizationId, id, status, actualTime);
      return c.json({ success: true, data: transport });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/transport/:id
 */
dialyse.delete(
  '/transport/:id',
  requirePermission('dialyse:sessions:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    try {
      await transportService.delete(organizationId, id);
      return c.json({ success: true, data: { message: 'Transport deleted' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// CONSUMABLES ROUTES
// ============================================================================

/**
 * GET /dialyse/consumables
 */
dialyse.get(
  '/consumables',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const category = c.req.query('category');
      const status = c.req.query('status');
      const lowStock = c.req.query('lowStock') === 'true';
      const { limit, offset } = validatePagination(c.req.query('limit'), c.req.query('offset'), { defaultLimit: 50 });

      const result = await consumablesService.list(organizationId, { category, status, lowStock, limit, offset });
      return c.json({ success: true, data: result.data, meta: { total: result.total, limit, offset } });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/consumables/stats
 */
dialyse.get(
  '/consumables/stats',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const stats = await consumablesService.getStats(organizationId);
      return c.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * GET /dialyse/consumables/:id
 */
dialyse.get(
  '/consumables/:id',
  requirePermission('dialyse:machines:read'),
  async (c) => {
    try {
      const organizationId = c.get('realOrganizationId')!;
      const id = c.req.param('id');
      const consumable = await consumablesService.getById(organizationId, id);
      if (!consumable) return c.json({ success: false, error: 'Consumable not found' }, 404);
      return c.json({ success: true, data: consumable });
    } catch (error) {
      logger.error('Route error', error, { route: 'dialyse' });
      return c.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }, 500);
    }
  }
);

/**
 * POST /dialyse/consumables
 */
dialyse.post(
  '/consumables',
  requirePermission('dialyse:machines:create'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const data = await c.req.json();
    try {
      const consumable = await consumablesService.create(organizationId, userId, data);
      return c.json({ success: true, data: consumable }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * PUT /dialyse/consumables/:id
 */
dialyse.put(
  '/consumables/:id',
  requirePermission('dialyse:machines:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
      const consumable = await consumablesService.update(organizationId, id, data);
      return c.json({ success: true, data: consumable });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * POST /dialyse/consumables/:id/stock
 */
dialyse.post(
  '/consumables/:id/stock',
  requirePermission('dialyse:machines:update'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const userId = c.get('userId');
    const id = c.req.param('id');
    const movement = await c.req.json();
    try {
      const consumable = await consumablesService.adjustStock(organizationId, id, userId, movement);
      return c.json({ success: true, data: consumable });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

/**
 * DELETE /dialyse/consumables/:id
 */
dialyse.delete(
  '/consumables/:id',
  requirePermission('dialyse:machines:delete'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const id = c.req.param('id');
    try {
      await consumablesService.delete(organizationId, id);
      return c.json({ success: true, data: { message: 'Consumable deleted' } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

// ============================================================================
// REPORTS ROUTES
// ============================================================================

/**
 * GET /dialyse/reports
 */
dialyse.get(
  '/reports',
  requirePermission('dialyse:patients:read'),
  async (c) => {
    const organizationId = c.get('realOrganizationId')!;
    const period = c.req.query('period') || 'month';
    try {
      const report = await reportsService.getReport(organizationId, period);
      return c.json({ success: true, data: report });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 400);
    }
  }
);

export default dialyse;
