/**
 * Ophthalmology Routes
 * /api/v1/ophthalmology
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { requireAuth, requirePermission } from '../middleware/auth';
import type { Env } from '../types';
import { getDb } from '../db';
import { eq, desc, and, sql, like, or, count } from 'drizzle-orm';
import {
  healthcarePatients,
  healthcareConsultations,
  healthcareExaminations,
  healthcareImplantedDevices,
  healthcareChronicConditions,
  healthcareAlerts,
  healthcareAppointments,
  ophthalmologyOctScans,
  ophthalmologyVisualFields,
  ophthalmologyBiometry,
  ophthalmologyIolImplants,
  ophthalmologyIvtInjections,
  ophthalmologySurgeries,
  ophthalmologyRefraction,
  ophthalmologyTonometry,
  ophthalmologyFundusPhotos,
  ophthalmologyOsdiScores,
  contacts,
} from '@perfex/database';

const ophthalmology = new Hono<{ Bindings: Env }>();

// All routes require authentication
ophthalmology.use('/*', requireAuth);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  status: z.string().optional(),
  eye: z.enum(['od', 'os', 'ou']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const patientQuerySchema = listQuerySchema.extend({
  patientStatus: z.enum(['active', 'inactive', 'deceased', 'transferred']).optional(),
});

const createPatientSchema = z.object({
  contactId: z.string().uuid(),
  medicalId: z.string().min(1),
  nationalId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bloodType: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medicalHistory: z.any().optional(),
  familyHistory: z.any().optional(),
  surgicalHistory: z.array(z.string()).optional(),
  currentMedications: z.array(z.any()).optional(),
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  referringPhysician: z.string().optional(),
  notes: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial();

const createConsultationSchema = z.object({
  patientId: z.string().uuid(),
  consultationDate: z.string(),
  consultationType: z.enum(['initial', 'follow_up', 'emergency', 'pre_operative', 'post_operative']),
  providerId: z.string().uuid().optional(),
  chiefComplaint: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  physicalExamination: z.string().optional(),
  assessment: z.string().optional(),
  diagnosis: z.array(z.string()).optional(),
  treatmentPlan: z.string().optional(),
  prescriptions: z.array(z.any()).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

const createOctSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  scanDate: z.string(),
  eye: z.enum(['od', 'os', 'ou']),
  octType: z.enum(['macula', 'optic_nerve', 'anterior_segment', 'angiography', 'wide_field']),
  scanPattern: z.string().optional(),
  signalStrength: z.number().optional(),
  centralMacularThickness: z.number().optional(),
  avgMacularThickness: z.number().optional(),
  rnflAverage: z.number().optional(),
  cupDiscRatio: z.number().optional(),
  findings: z.string().optional(),
  interpretation: z.string().optional(),
  conclusion: z.string().optional(),
  recommendations: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createVisualFieldSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  testDate: z.string(),
  eye: z.enum(['od', 'os']),
  testType: z.enum(['sita_standard', 'sita_fast', 'sita_faster', 'full_threshold', 'screening', 'kinetic']),
  testPattern: z.string().optional(),
  fixationLosses: z.number().optional(),
  falsePositives: z.number().optional(),
  falseNegatives: z.number().optional(),
  meanDeviation: z.number().optional(),
  patternStandardDeviation: z.number().optional(),
  visualFieldIndex: z.number().optional(),
  ghtResult: z.enum(['within_normal', 'borderline', 'outside_normal', 'generalized_reduction', 'abnormally_high']).optional(),
  glaucomaStage: z.string().optional(),
  findings: z.string().optional(),
  interpretation: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createBiometrySchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  measurementDate: z.string(),
  eye: z.enum(['od', 'os']),
  deviceType: z.enum(['optical', 'ultrasound', 'swept_source']),
  axialLength: z.number(),
  k1: z.number(),
  k1Axis: z.number().optional(),
  k2: z.number(),
  k2Axis: z.number().optional(),
  avgK: z.number().optional(),
  acd: z.number().optional(),
  lensThickness: z.number().optional(),
  wtw: z.number().optional(),
  cct: z.number().optional(),
  targetRefraction: z.number().optional(),
  iolCalculations: z.array(z.any()).optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createIolSchema = z.object({
  patientId: z.string().uuid(),
  surgeryId: z.string().uuid().optional(),
  biometryId: z.string().uuid().optional(),
  implantDate: z.string(),
  eye: z.enum(['od', 'os']),
  manufacturer: z.string(),
  model: z.string(),
  iolType: z.enum(['monofocal', 'toric', 'multifocal', 'edof', 'toric_multifocal', 'toric_edof', 'accommodating', 'phakic']),
  sphericalPower: z.number(),
  cylinderPower: z.number().optional(),
  cylinderAxis: z.number().optional(),
  addPower: z.number().optional(),
  serialNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  formulaUsed: z.string().optional(),
  targetRefraction: z.number().optional(),
  surgeonId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createIvtSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  injectionDate: z.string(),
  eye: z.enum(['od', 'os']),
  indication: z.enum(['wet_amd', 'dme', 'rvo_me', 'cnv', 'pdr', 'uveitis', 'endophthalmitis', 'other']),
  indicationDetails: z.string().optional(),
  medication: z.enum(['aflibercept', 'ranibizumab', 'bevacizumab', 'brolucizumab', 'faricimab', 'dexamethasone_implant', 'fluocinolone_implant', 'triamcinolone', 'vancomycin', 'ceftazidime', 'other']),
  medicationBrand: z.string().optional(),
  dose: z.string(),
  lotNumber: z.string().optional(),
  treatmentProtocol: z.enum(['loading', 'prn', 'treat_and_extend', 'fixed', 'observe_and_extend']).optional(),
  injectionInSeries: z.number().optional(),
  quadrant: z.enum(['inferotemporal', 'inferonasal', 'superotemporal', 'superonasal']).optional(),
  preIop: z.number().optional(),
  postIop: z.number().optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createSurgerySchema = z.object({
  patientId: z.string().uuid(),
  surgeryDate: z.string(),
  eye: z.enum(['od', 'os', 'ou']),
  surgeryType: z.enum(['phaco', 'ecce', 'icce', 'iol_exchange', 'vitrectomy', 'retinal_detachment', 'glaucoma_trab', 'glaucoma_tube', 'migs', 'corneal_transplant', 'pterygium', 'strabismus', 'oculoplastics', 'laser_refractive', 'prk', 'lasik', 'smile', 'other']),
  surgerySubtype: z.string().optional(),
  indication: z.string().optional(),
  anesthesiaType: z.enum(['topical', 'local', 'peribulbar', 'retrobulbar', 'general']).optional(),
  surgeonId: z.string().uuid().optional(),
  procedureDetails: z.string().optional(),
  intraOpFindings: z.string().optional(),
  surgeryOutcome: z.enum(['successful', 'complicated', 'converted', 'aborted']).optional(),
  postOpMedications: z.array(z.any()).optional(),
  postOpInstructions: z.string().optional(),
  notes: z.string().optional(),
});

const createRefractionSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  examinationDate: z.string(),
  refractionType: z.enum(['manifest', 'cycloplegic', 'autorefractor', 'retinoscopy', 'trial_frame']),
  odSphere: z.number().optional(),
  odCylinder: z.number().optional(),
  odAxis: z.number().optional(),
  odAdd: z.number().optional(),
  osSphere: z.number().optional(),
  osCylinder: z.number().optional(),
  osAxis: z.number().optional(),
  osAdd: z.number().optional(),
  odUcvaDistance: z.string().optional(),
  osUcvaDistance: z.string().optional(),
  odBcvaDistance: z.string().optional(),
  osBcvaDistance: z.string().optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createTonometrySchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  measurementDate: z.string(),
  measurementTime: z.string().optional(),
  tonometryMethod: z.enum(['goldmann', 'non_contact', 'icare', 'tono_pen', 'palpation']),
  iopOd: z.number().optional(),
  iopOs: z.number().optional(),
  cctOd: z.number().optional(),
  cctOs: z.number().optional(),
  targetIopOd: z.number().optional(),
  targetIopOs: z.number().optional(),
  isOnGlaucomaMedications: z.boolean().optional(),
  currentMedications: z.array(z.string()).optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createOsdiSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  assessmentDate: z.string(),
  q1LightSensitivity: z.number().min(0).max(4).optional(),
  q2GrittyFeeling: z.number().min(0).max(4).optional(),
  q3PainfulEyes: z.number().min(0).max(4).optional(),
  q4BlurredVision: z.number().min(0).max(4).optional(),
  q5PoorVision: z.number().min(0).max(4).optional(),
  q6Reading: z.number().min(0).max(4).optional(),
  q7Driving: z.number().min(0).max(4).optional(),
  q8Computer: z.number().min(0).max(4).optional(),
  q9Television: z.number().min(0).max(4).optional(),
  q10WindyConditions: z.number().min(0).max(4).optional(),
  q11LowHumidity: z.number().min(0).max(4).optional(),
  q12AirConditioning: z.number().min(0).max(4).optional(),
  notes: z.string().optional(),
});

// Update schemas (partial versions of create schemas)
const updateConsultationSchema = createConsultationSchema.partial();
const updateOctSchema = createOctSchema.partial();
const updateVisualFieldSchema = createVisualFieldSchema.partial();
const updateBiometrySchema = createBiometrySchema.partial();
const updateIolSchema = createIolSchema.partial();
const updateIvtSchema = createIvtSchema.partial();
const updateSurgerySchema = createSurgerySchema.partial();
const updateRefractionSchema = createRefractionSchema.partial();
const updateTonometrySchema = createTonometrySchema.partial();
const updateOsdiSchema = createOsdiSchema.partial();

// ============================================================================
// DASHBOARD & STATS
// ============================================================================

/**
 * GET /ophthalmology/dashboard/stats
 * Get ophthalmology dashboard statistics
 */
ophthalmology.get(
  '/dashboard/stats',
  requirePermission('ophthalmology:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;

      // Get patient counts from ophthalmology_patients table using raw SQL
      const totalPatientsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_patients WHERE company_id = ${organizationId}
      `);
      const totalPatients = (totalPatientsResult.results?.[0] as any)?.count ?? 0;

      // Get OCT scans from this month
      const octScansResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_oct_scans
        WHERE company_id = ${organizationId}
        AND scan_date >= ${Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000)}
      `);
      const monthlyOcts = (octScansResult.results?.[0] as any)?.count ?? 0;

      // Get IVT injections this month
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthlyIvtsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_ivt_injections
        WHERE company_id = ${organizationId}
        AND injection_date >= ${firstOfMonth}
      `);
      const monthlyIvts = (monthlyIvtsResult.results?.[0] as any)?.count ?? 0;

      // Get IOL implants count
      const iolImplantsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_iol_implants
        WHERE company_id = ${organizationId}
      `);
      const totalIolImplants = (iolImplantsResult.results?.[0] as any)?.count ?? 0;

      // Get critical alerts from healthcare_alerts
      const criticalAlertsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM healthcare_alerts
        WHERE company_id = ${organizationId}
        AND module = 'ophthalmology'
        AND status = 'active'
        AND severity = 'critical'
      `);
      const criticalAlerts = (criticalAlertsResult.results?.[0] as any)?.count ?? 0;

      // Get today's appointments from healthcare_appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = Math.floor(today.getTime() / 1000);
      const todayEnd = todayStart + 86400; // +24 hours
      const todayAppointmentsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM healthcare_appointments
        WHERE company_id = ${organizationId}
        AND module = 'ophthalmology'
        AND scheduled_date >= ${todayStart}
        AND scheduled_date < ${todayEnd}
        AND status NOT IN ('cancelled', 'no_show')
      `);
      const todayAppointments = (todayAppointmentsResult.results?.[0] as any)?.count ?? 0;

      // Get upcoming surgeries (next 7 days)
      const sevenDaysLater = todayStart + (7 * 86400);
      const scheduledSurgeriesResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_surgeries
        WHERE company_id = ${organizationId}
        AND surgery_date >= ${todayStart}
        AND surgery_date < ${sevenDaysLater}
      `);
      const scheduledSurgeries = (scheduledSurgeriesResult.results?.[0] as any)?.count ?? 0;

      return c.json({
        success: true,
        data: {
          totalPatients,
          todayAppointments,
          monthlyOcts,
          scheduledSurgeries,
          monthlyIvts,
          totalIolImplants,
          criticalAlerts,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// PATIENTS ROUTES
// ============================================================================

/**
 * GET /ophthalmology/patients
 * List ophthalmology patients (joined with ophthalmology_patients extension)
 */
ophthalmology.get(
  '/patients',
  requirePermission('ophthalmology:patients:read'),
  zValidator('query', patientQuerySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Get patients with ophthalmology extension joined using parameterized SQL
      const patientsResult = await db.run(sql`
        SELECT
          hp.id, hp.first_name, hp.last_name, hp.date_of_birth, hp.gender,
          hp.national_id, hp.phone, hp.email, hp.address, hp.city,
          hp.blood_type, hp.allergies, hp.medical_history, hp.status,
          hp.insurance_provider, hp.insurance_number, hp.notes,
          hp.created_at, hp.updated_at,
          op.id as ophthalmology_id, op.primary_diagnosis, op.has_glaucoma,
          op.has_dmla, op.has_diabetic_retinopathy, op.has_cataract,
          op.has_iol_implant, op.last_acuity_od, op.last_acuity_og,
          op.last_iop_od, op.last_iop_og
        FROM ophthalmology_patients op
        INNER JOIN healthcare_patients hp ON op.healthcare_patient_id = hp.id
        WHERE op.company_id = ${organizationId}
        ${query.patientStatus ? sql`AND hp.status = ${query.patientStatus}` : sql``}
        ${query.search ? sql`AND (hp.first_name LIKE ${'%' + query.search + '%'} OR hp.last_name LIKE ${'%' + query.search + '%'} OR hp.national_id LIKE ${'%' + query.search + '%'})` : sql``}
        ORDER BY hp.created_at DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count
        FROM ophthalmology_patients op
        INNER JOIN healthcare_patients hp ON op.healthcare_patient_id = hp.id
        WHERE op.company_id = ${organizationId}
        ${query.patientStatus ? sql`AND hp.status = ${query.patientStatus}` : sql``}
        ${query.search ? sql`AND (hp.first_name LIKE ${'%' + query.search + '%'} OR hp.last_name LIKE ${'%' + query.search + '%'} OR hp.national_id LIKE ${'%' + query.search + '%'})` : sql``}
      `);

      const patients = (patientsResult.results || []).map((row: any) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        nationalId: row.national_id,
        phone: row.phone,
        email: row.email,
        address: row.address,
        city: row.city,
        bloodType: row.blood_type,
        allergies: row.allergies,
        medicalHistory: row.medical_history,
        status: row.status,
        insuranceProvider: row.insurance_provider,
        insuranceNumber: row.insurance_number,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ophthalmology: {
          id: row.ophthalmology_id,
          primaryDiagnosis: row.primary_diagnosis,
          hasGlaucoma: !!row.has_glaucoma,
          hasDmla: !!row.has_dmla,
          hasDiabeticRetinopathy: !!row.has_diabetic_retinopathy,
          hasCataract: !!row.has_cataract,
          hasIolImplant: !!row.has_iol_implant,
          lastAcuityOd: row.last_acuity_od,
          lastAcuityOg: row.last_acuity_og,
          lastIopOd: row.last_iop_od,
          lastIopOg: row.last_iop_og,
        },
      }));

      return c.json({
        success: true,
        data: patients,
        meta: {
          total: (totalResult.results?.[0] as any)?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/patients/:id
 * Get a single ophthalmology patient
 */
ophthalmology.get(
  '/patients/:id',
  requirePermission('ophthalmology:patients:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const patientId = c.req.param('id');

      // Get patient from ophthalmology_patients joined with healthcare_patients
      const patientResult = await db.run(sql`
        SELECT
          hp.id, hp.first_name, hp.last_name, hp.date_of_birth, hp.gender,
          hp.national_id, hp.phone, hp.email, hp.address, hp.city,
          hp.blood_type, hp.allergies, hp.medical_history, hp.status,
          hp.insurance_provider, hp.insurance_number, hp.notes,
          hp.created_at, hp.updated_at,
          op.id as ophthalmology_id, op.primary_diagnosis, op.has_glaucoma,
          op.has_dmla, op.has_diabetic_retinopathy, op.has_cataract,
          op.has_iol_implant, op.last_acuity_od, op.last_acuity_og,
          op.last_iop_od, op.last_iop_og
        FROM ophthalmology_patients op
        INNER JOIN healthcare_patients hp ON op.healthcare_patient_id = hp.id
        WHERE op.company_id = ${organizationId} AND hp.id = ${patientId}
        LIMIT 1
      `);

      const patientRow = patientResult.results?.[0] as any;
      if (!patientRow) {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }

      const patient = {
        id: patientRow.id,
        firstName: patientRow.first_name,
        lastName: patientRow.last_name,
        dateOfBirth: patientRow.date_of_birth,
        gender: patientRow.gender,
        nationalId: patientRow.national_id,
        phone: patientRow.phone,
        email: patientRow.email,
        address: patientRow.address,
        city: patientRow.city,
        bloodType: patientRow.blood_type,
        allergies: patientRow.allergies,
        medicalHistory: patientRow.medical_history,
        status: patientRow.status,
        insuranceProvider: patientRow.insurance_provider,
        insuranceNumber: patientRow.insurance_number,
        notes: patientRow.notes,
        createdAt: patientRow.created_at,
        updatedAt: patientRow.updated_at,
        ophthalmology: {
          id: patientRow.ophthalmology_id,
          primaryDiagnosis: patientRow.primary_diagnosis,
          hasGlaucoma: !!patientRow.has_glaucoma,
          hasDmla: !!patientRow.has_dmla,
          hasDiabeticRetinopathy: !!patientRow.has_diabetic_retinopathy,
          hasCataract: !!patientRow.has_cataract,
          hasIolImplant: !!patientRow.has_iol_implant,
          lastAcuityOd: patientRow.last_acuity_od,
          lastAcuityOg: patientRow.last_acuity_og,
          lastIopOd: patientRow.last_iop_od,
          lastIopOg: patientRow.last_iop_og,
        },
      };

      // Get IOL implants for this patient
      const iolResult = await db.run(sql`
        SELECT * FROM ophthalmology_iol_implants
        WHERE patient_id = ${patientId}
      `);
      const iolImplants = iolResult.results || [];

      // Get recent consultations
      const consultationsResult = await db.run(sql`
        SELECT * FROM healthcare_consultations
        WHERE patient_id = ${patientId} AND module = 'ophthalmology'
        ORDER BY consultation_date DESC
        LIMIT 5
      `);
      const recentConsultations = consultationsResult.results || [];

      // Get latest refraction
      const refractionResult = await db.run(sql`
        SELECT * FROM ophthalmology_refraction
        WHERE patient_id = ${patientId}
        ORDER BY measurement_date DESC
        LIMIT 1
      `);
      const latestRefraction = refractionResult.results?.[0] || null;

      // Get latest tonometry
      const tonometryResult = await db.run(sql`
        SELECT * FROM ophthalmology_tonometry
        WHERE patient_id = ${patientId}
        ORDER BY measurement_date DESC, created_at DESC
        LIMIT 1
      `);
      const latestTonometry = tonometryResult.results?.[0] || null;

      return c.json({
        success: true,
        data: {
          ...patient,
          iolImplants,
          recentConsultations,
          latestRefraction,
          latestTonometry,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * DELETE /ophthalmology/patients/:id
 * Delete an ophthalmology patient
 */
ophthalmology.delete(
  '/patients/:id',
  requirePermission('ophthalmology:patients:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const patientId = c.req.param('id');

      // Check if patient exists in ophthalmology_patients
      const patientResult = await db.run(sql`
        SELECT op.id as ophthalmology_id, hp.id as healthcare_id
        FROM ophthalmology_patients op
        INNER JOIN healthcare_patients hp ON op.healthcare_patient_id = hp.id
        WHERE op.company_id = ${organizationId} AND hp.id = ${patientId}
        LIMIT 1
      `);

      const patientRow = patientResult.results?.[0] as any;
      if (!patientRow) {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }

      // Delete from ophthalmology_patients (keeps healthcare_patients record)
      await db.run(sql`
        DELETE FROM ophthalmology_patients WHERE id = ${patientRow.ophthalmology_id}
      `);

      return c.json({
        success: true,
        message: 'Patient removed from ophthalmology module',
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/patients
 * Create a new ophthalmology patient
 */
ophthalmology.post(
  '/patients',
  requirePermission('ophthalmology:patients:write'),
  zValidator('json', createPatientSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const patientId = crypto.randomUUID();
      const now = new Date();

      await db.insert(healthcarePatients).values({
        id: patientId,
        companyId: organizationId,
        contactId: data.contactId,
        medicalId: data.medicalId,
        nationalId: data.nationalId,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        bloodType: data.bloodType,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelation: data.emergencyContactRelation,
        allergies: data.allergies ? JSON.stringify(data.allergies) : undefined,
        medicalHistory: data.medicalHistory ? JSON.stringify(data.medicalHistory) : undefined,
        familyHistory: data.familyHistory ? JSON.stringify(data.familyHistory) : undefined,
        surgicalHistory: data.surgicalHistory ? JSON.stringify(data.surgicalHistory) : undefined,
        currentMedications: data.currentMedications ? JSON.stringify(data.currentMedications) : undefined,
        insuranceProvider: data.insuranceProvider,
        insuranceNumber: data.insuranceNumber,
        referringPhysician: data.referringPhysician,
        enrolledModules: JSON.stringify(['ophthalmology']),
        patientStatus: 'active',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [patient] = await db
        .select()
        .from(healthcarePatients)
        .where(eq(healthcarePatients.id, patientId))
        .limit(1);

      return c.json({
        success: true,
        data: patient,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/patients/:id
 * Update an ophthalmology patient
 */
ophthalmology.put(
  '/patients/:id',
  requirePermission('ophthalmology:patients:write'),
  zValidator('json', updatePatientSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const patientId = c.req.param('id');
      const data = c.req.valid('json');

      // Check if patient exists
      const [existing] = await db
        .select()
        .from(healthcarePatients)
        .where(and(
          eq(healthcarePatients.id, patientId),
          eq(healthcarePatients.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Patient not found' }
        }, 404);
      }

      const now = new Date().toISOString();
      await db
        .update(healthcarePatients)
        .set({
          ...data,
          dateOfBirth: data.dateOfBirth || undefined,
          allergies: data.allergies ? JSON.stringify(data.allergies) : undefined,
          medicalHistory: data.medicalHistory ? JSON.stringify(data.medicalHistory) : undefined,
          familyHistory: data.familyHistory ? JSON.stringify(data.familyHistory) : undefined,
          surgicalHistory: data.surgicalHistory ? JSON.stringify(data.surgicalHistory) : undefined,
          currentMedications: data.currentMedications ? JSON.stringify(data.currentMedications) : undefined,
          updatedAt: now,
        })
        .where(eq(healthcarePatients.id, patientId));

      const [patient] = await db
        .select()
        .from(healthcarePatients)
        .where(eq(healthcarePatients.id, patientId))
        .limit(1);

      return c.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// CONSULTATIONS ROUTES
// ============================================================================

/**
 * GET /ophthalmology/consultations
 * List ophthalmology consultations
 */
ophthalmology.get(
  '/consultations',
  requirePermission('ophthalmology:consultations:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [
        eq(healthcareConsultations.companyId, organizationId),
        eq(healthcareConsultations.module, 'ophthalmology'),
      ];

      if (query.patientId) {
        conditions.push(eq(healthcareConsultations.patientId, query.patientId));
      }

      const consultations = await db
        .select()
        .from(healthcareConsultations)
        .where(and(...conditions))
        .orderBy(desc(healthcareConsultations.consultationDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(healthcareConsultations)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: consultations,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/consultations/:id
 * Get a single consultation
 */
ophthalmology.get(
  '/consultations/:id',
  requirePermission('ophthalmology:consultations:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const consultationId = c.req.param('id');

      const [consultation] = await db
        .select()
        .from(healthcareConsultations)
        .where(and(
          eq(healthcareConsultations.id, consultationId),
          eq(healthcareConsultations.companyId, organizationId),
          eq(healthcareConsultations.module, 'ophthalmology')
        ))
        .limit(1);

      if (!consultation) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Consultation not found' }
        }, 404);
      }

      return c.json({ success: true, data: consultation });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/consultations
 * Create a new consultation
 */
ophthalmology.post(
  '/consultations',
  requirePermission('ophthalmology:consultations:write'),
  zValidator('json', createConsultationSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const consultationId = crypto.randomUUID();
      const now = new Date();

      // Generate consultation number
      const [countResult] = await db
        .select({ count: count() })
        .from(healthcareConsultations)
        .where(eq(healthcareConsultations.companyId, organizationId));
      const consultationNumber = `OPHTH-C-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(healthcareConsultations).values({
        id: consultationId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationNumber,
        consultationDate: new Date(data.consultationDate),
        module: 'ophthalmology',
        consultationType: data.consultationType,
        providerId: data.providerId,
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness,
        physicalExamination: data.physicalExamination,
        assessment: data.assessment,
        diagnosis: data.diagnosis ? JSON.stringify(data.diagnosis) : undefined,
        treatmentPlan: data.treatmentPlan,
        prescriptions: data.prescriptions ? JSON.stringify(data.prescriptions) : undefined,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        status: 'completed',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [consultation] = await db
        .select()
        .from(healthcareConsultations)
        .where(eq(healthcareConsultations.id, consultationId))
        .limit(1);

      return c.json({
        success: true,
        data: consultation,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/consultations/:id
 * Update a consultation
 */
ophthalmology.put(
  '/consultations/:id',
  requirePermission('ophthalmology:consultations:write'),
  zValidator('json', updateConsultationSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const consultationId = c.req.param('id');
      const data = c.req.valid('json');

      // Check if consultation exists
      const [existing] = await db
        .select()
        .from(healthcareConsultations)
        .where(and(
          eq(healthcareConsultations.id, consultationId),
          eq(healthcareConsultations.companyId, organizationId),
          eq(healthcareConsultations.module, 'ophthalmology')
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Consultation not found' }
        }, 404);
      }

      const now = new Date().toISOString();
      await db
        .update(healthcareConsultations)
        .set({
          consultationDate: data.consultationDate || undefined,
          consultationType: data.consultationType,
          providerId: data.providerId,
          chiefComplaint: data.chiefComplaint,
          historyOfPresentIllness: data.historyOfPresentIllness,
          physicalExamination: data.physicalExamination,
          assessment: data.assessment,
          diagnosis: data.diagnosis ? JSON.stringify(data.diagnosis) : undefined,
          treatmentPlan: data.treatmentPlan,
          prescriptions: data.prescriptions ? JSON.stringify(data.prescriptions) : undefined,
          followUpDate: data.followUpDate || undefined,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(healthcareConsultations.id, consultationId));

      const [consultation] = await db
        .select()
        .from(healthcareConsultations)
        .where(eq(healthcareConsultations.id, consultationId))
        .limit(1);

      return c.json({
        success: true,
        data: consultation,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// OCT ROUTES
// ============================================================================

/**
 * GET /ophthalmology/oct
 * List OCT scans
 */
ophthalmology.get(
  '/oct',
  requirePermission('ophthalmology:oct:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Get OCT records with parameterized SQL
      const octsResult = await db.run(sql`
        SELECT
          o.id, o.patient_id, o.company_id, o.scan_date, o.eye, o.oct_type as scan_type,
          o.performed_by as technician, o.interpreted_by as reviewing_doctor, o.signal_strength as signal_quality,
          o.central_macular_thickness, o.avg_macular_thickness as macula_volume, o.rnfl_average as rnfl_thickness,
          o.cup_disc_ratio, o.findings, o.interpretation,
          o.image_urls as image_path, o.status, o.created_at, o.updated_at,
          hp.first_name as patient_first_name, hp.last_name as patient_last_name
        FROM ophthalmology_oct_scans o
        LEFT JOIN healthcare_patients hp ON o.patient_id = hp.id
        WHERE o.company_id = ${organizationId}
        ${query.patientId ? sql`AND o.patient_id = ${query.patientId}` : sql``}
        ${query.eye ? sql`AND o.eye = ${query.eye}` : sql``}
        ${query.status ? sql`AND o.status = ${query.status}` : sql``}
        ORDER BY o.scan_date DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_oct_scans o
        WHERE o.company_id = ${organizationId}
        ${query.patientId ? sql`AND o.patient_id = ${query.patientId}` : sql``}
        ${query.eye ? sql`AND o.eye = ${query.eye}` : sql``}
        ${query.status ? sql`AND o.status = ${query.status}` : sql``}
      `);

      const octs = (octsResult.results || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        patientName: row.patient_first_name && row.patient_last_name
          ? `${row.patient_first_name} ${row.patient_last_name}`
          : null,
        scanDate: row.scan_date,
        eye: row.eye,
        scanType: row.scan_type,
        device: row.device,
        technician: row.technician,
        reviewingDoctor: row.reviewing_doctor,
        signalQuality: row.signal_quality,
        centralMacularThickness: row.central_macular_thickness,
        maculaVolume: row.macula_volume,
        rnflThickness: row.rnfl_thickness,
        rnflSuperior: row.rnfl_superior,
        rnflInferior: row.rnfl_inferior,
        rnflNasal: row.rnfl_nasal,
        rnflTemporal: row.rnfl_temporal,
        cupDiscRatio: row.cup_disc_ratio,
        findings: row.findings,
        interpretation: row.interpretation,
        comparisonNotes: row.comparison_notes,
        imagePath: row.image_path,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return c.json({
        success: true,
        data: octs,
        meta: {
          total: (totalResult.results?.[0] as any)?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/oct/:id
 * Get a single OCT scan
 */
ophthalmology.get(
  '/oct/:id',
  requirePermission('ophthalmology:oct:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const octId = c.req.param('id');

      const [oct] = await db
        .select()
        .from(ophthalmologyOctScans)
        .where(and(
          eq(ophthalmologyOctScans.id, octId),
          eq(ophthalmologyOctScans.companyId, organizationId)
        ))
        .limit(1);

      if (!oct) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'OCT scan not found' }
        }, 404);
      }

      return c.json({ success: true, data: oct });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/oct
 * Create a new OCT scan
 */
ophthalmology.post(
  '/oct',
  requirePermission('ophthalmology:oct:write'),
  zValidator('json', createOctSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const octId = crypto.randomUUID();
      const now = new Date();

      // Generate OCT number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologyOctScans)
        .where(eq(ophthalmologyOctScans.companyId, organizationId));
      const octNumber = `OCT-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologyOctScans).values({
        id: octId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        octNumber,
        scanDate: new Date(data.scanDate),
        eye: data.eye,
        octType: data.octType,
        scanPattern: data.scanPattern,
        signalStrength: data.signalStrength,
        centralMacularThickness: data.centralMacularThickness,
        avgMacularThickness: data.avgMacularThickness,
        rnflAverage: data.rnflAverage,
        cupDiscRatio: data.cupDiscRatio,
        findings: data.findings,
        interpretation: data.interpretation,
        conclusion: data.conclusion,
        recommendations: data.recommendations,
        imageUrls: data.imageUrls ? JSON.stringify(data.imageUrls) : undefined,
        performedBy: data.performedById,
        status: 'pending',
        urgency: 'routine',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [oct] = await db
        .select()
        .from(ophthalmologyOctScans)
        .where(eq(ophthalmologyOctScans.id, octId))
        .limit(1);

      return c.json({
        success: true,
        data: oct,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/oct/:id
 * Update an OCT scan
 */
ophthalmology.put(
  '/oct/:id',
  requirePermission('ophthalmology:oct:write'),
  zValidator('json', updateOctSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const octId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyOctScans)
        .where(and(
          eq(ophthalmologyOctScans.id, octId),
          eq(ophthalmologyOctScans.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'OCT scan not found' }
        }, 404);
      }

      const now = new Date();
      await db
        .update(ophthalmologyOctScans)
        .set({
          scanDate: data.scanDate ? new Date(data.scanDate) : undefined,
          eye: data.eye,
          octType: data.octType,
          scanPattern: data.scanPattern,
          signalStrength: data.signalStrength,
          centralMacularThickness: data.centralMacularThickness,
          avgMacularThickness: data.avgMacularThickness,
          rnflAverage: data.rnflAverage,
          cupDiscRatio: data.cupDiscRatio,
          findings: data.findings,
          interpretation: data.interpretation,
          conclusion: data.conclusion,
          recommendations: data.recommendations,
          imageUrls: data.imageUrls ? JSON.stringify(data.imageUrls) : undefined,
          performedBy: data.performedById,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyOctScans.id, octId));

      const [oct] = await db
        .select()
        .from(ophthalmologyOctScans)
        .where(eq(ophthalmologyOctScans.id, octId))
        .limit(1);

      return c.json({ success: true, data: oct });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// VISUAL FIELDS ROUTES
// ============================================================================

/**
 * GET /ophthalmology/visual-fields
 * List visual field tests
 */
ophthalmology.get(
  '/visual-fields',
  requirePermission('ophthalmology:visual-fields:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(ophthalmologyVisualFields.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(ophthalmologyVisualFields.patientId, query.patientId));
      }

      if (query.eye) {
        conditions.push(eq(ophthalmologyVisualFields.eye, query.eye as 'od' | 'os'));
      }

      const vfs = await db
        .select()
        .from(ophthalmologyVisualFields)
        .where(and(...conditions))
        .orderBy(desc(ophthalmologyVisualFields.testDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(ophthalmologyVisualFields)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: vfs,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/visual-fields/:id
 * Get a single visual field test
 */
ophthalmology.get(
  '/visual-fields/:id',
  requirePermission('ophthalmology:visual-fields:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const vfId = c.req.param('id');

      const [vf] = await db
        .select()
        .from(ophthalmologyVisualFields)
        .where(and(
          eq(ophthalmologyVisualFields.id, vfId),
          eq(ophthalmologyVisualFields.companyId, organizationId)
        ))
        .limit(1);

      if (!vf) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Visual field test not found' }
        }, 404);
      }

      return c.json({ success: true, data: vf });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/visual-fields
 * Create a new visual field test
 */
ophthalmology.post(
  '/visual-fields',
  requirePermission('ophthalmology:visual-fields:write'),
  zValidator('json', createVisualFieldSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const vfId = crypto.randomUUID();
      const now = new Date();

      // Generate VF number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologyVisualFields)
        .where(eq(ophthalmologyVisualFields.companyId, organizationId));
      const vfNumber = `VF-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologyVisualFields).values({
        id: vfId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        vfNumber,
        testDate: new Date(data.testDate),
        eye: data.eye,
        testType: data.testType,
        testPattern: data.testPattern,
        fixationLosses: data.fixationLosses,
        falsePositives: data.falsePositives,
        falseNegatives: data.falseNegatives,
        meanDeviation: data.meanDeviation,
        patternStandardDeviation: data.patternStandardDeviation,
        visualFieldIndex: data.visualFieldIndex,
        ghtResult: data.ghtResult,
        glaucomaStage: data.glaucomaStage,
        findings: data.findings,
        interpretation: data.interpretation,
        imageUrls: data.imageUrls ? JSON.stringify(data.imageUrls) : undefined,
        performedBy: data.performedById,
        status: 'pending',
        urgency: 'routine',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [vf] = await db
        .select()
        .from(ophthalmologyVisualFields)
        .where(eq(ophthalmologyVisualFields.id, vfId))
        .limit(1);

      return c.json({
        success: true,
        data: vf,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/visual-fields/:id
 * Update a visual field test
 */
ophthalmology.put(
  '/visual-fields/:id',
  requirePermission('ophthalmology:visual-fields:write'),
  zValidator('json', updateVisualFieldSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const vfId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyVisualFields)
        .where(and(
          eq(ophthalmologyVisualFields.id, vfId),
          eq(ophthalmologyVisualFields.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Visual field test not found' }
        }, 404);
      }

      const now = new Date();
      await db
        .update(ophthalmologyVisualFields)
        .set({
          testDate: data.testDate ? new Date(data.testDate) : undefined,
          eye: data.eye,
          testType: data.testType,
          testPattern: data.testPattern,
          fixationLosses: data.fixationLosses,
          falsePositives: data.falsePositives,
          falseNegatives: data.falseNegatives,
          meanDeviation: data.meanDeviation,
          patternStandardDeviation: data.patternStandardDeviation,
          visualFieldIndex: data.visualFieldIndex,
          ghtResult: data.ghtResult,
          glaucomaStage: data.glaucomaStage,
          findings: data.findings,
          interpretation: data.interpretation,
          imageUrls: data.imageUrls ? JSON.stringify(data.imageUrls) : undefined,
          performedBy: data.performedById,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyVisualFields.id, vfId));

      const [vf] = await db
        .select()
        .from(ophthalmologyVisualFields)
        .where(eq(ophthalmologyVisualFields.id, vfId))
        .limit(1);

      return c.json({ success: true, data: vf });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// BIOMETRY ROUTES
// ============================================================================

/**
 * GET /ophthalmology/biometry
 * List biometry records
 */
ophthalmology.get(
  '/biometry',
  requirePermission('ophthalmology:biometry:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(ophthalmologyBiometry.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(ophthalmologyBiometry.patientId, query.patientId));
      }

      if (query.eye) {
        conditions.push(eq(ophthalmologyBiometry.eye, query.eye as 'od' | 'os'));
      }

      const biometries = await db
        .select()
        .from(ophthalmologyBiometry)
        .where(and(...conditions))
        .orderBy(desc(ophthalmologyBiometry.measurementDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(ophthalmologyBiometry)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: biometries,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/biometry/:id
 * Get a single biometry record
 */
ophthalmology.get(
  '/biometry/:id',
  requirePermission('ophthalmology:biometry:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const biometryId = c.req.param('id');

      const [biometry] = await db
        .select()
        .from(ophthalmologyBiometry)
        .where(and(
          eq(ophthalmologyBiometry.id, biometryId),
          eq(ophthalmologyBiometry.companyId, organizationId)
        ))
        .limit(1);

      if (!biometry) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Biometry record not found' }
        }, 404);
      }

      return c.json({ success: true, data: biometry });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/biometry
 * Create a new biometry record
 */
ophthalmology.post(
  '/biometry',
  requirePermission('ophthalmology:biometry:write'),
  zValidator('json', createBiometrySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const biometryId = crypto.randomUUID();
      const now = new Date();

      // Generate biometry number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologyBiometry)
        .where(eq(ophthalmologyBiometry.companyId, organizationId));
      const biometryNumber = `BIO-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologyBiometry).values({
        id: biometryId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        biometryNumber,
        measurementDate: new Date(data.measurementDate),
        eye: data.eye,
        deviceType: data.deviceType,
        axialLength: data.axialLength,
        k1: data.k1,
        k1Axis: data.k1Axis,
        k2: data.k2,
        k2Axis: data.k2Axis,
        avgK: data.avgK,
        acd: data.acd,
        lensThickness: data.lensThickness,
        wtw: data.wtw,
        cct: data.cct,
        targetRefraction: data.targetRefraction,
        iolCalculations: data.iolCalculations ? JSON.stringify(data.iolCalculations) : undefined,
        performedBy: data.performedById,
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [biometry] = await db
        .select()
        .from(ophthalmologyBiometry)
        .where(eq(ophthalmologyBiometry.id, biometryId))
        .limit(1);

      return c.json({
        success: true,
        data: biometry,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/biometry/:id
 * Update a biometry record
 */
ophthalmology.put(
  '/biometry/:id',
  requirePermission('ophthalmology:biometry:write'),
  zValidator('json', updateBiometrySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const biometryId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyBiometry)
        .where(and(
          eq(ophthalmologyBiometry.id, biometryId),
          eq(ophthalmologyBiometry.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Biometry record not found' }
        }, 404);
      }

      const now = new Date();
      await db
        .update(ophthalmologyBiometry)
        .set({
          measurementDate: data.measurementDate ? new Date(data.measurementDate) : undefined,
          eye: data.eye,
          deviceType: data.deviceType,
          axialLength: data.axialLength,
          k1: data.k1,
          k1Axis: data.k1Axis,
          k2: data.k2,
          k2Axis: data.k2Axis,
          avgK: data.avgK,
          acd: data.acd,
          lensThickness: data.lensThickness,
          wtw: data.wtw,
          cct: data.cct,
          targetRefraction: data.targetRefraction,
          iolCalculations: data.iolCalculations ? JSON.stringify(data.iolCalculations) : undefined,
          performedBy: data.performedById,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyBiometry.id, biometryId));

      const [biometry] = await db
        .select()
        .from(ophthalmologyBiometry)
        .where(eq(ophthalmologyBiometry.id, biometryId))
        .limit(1);

      return c.json({ success: true, data: biometry });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// IOL IMPLANTS ROUTES
// ============================================================================

/**
 * GET /ophthalmology/iol-implants
 * List IOL implants
 */
ophthalmology.get(
  '/iol-implants',
  requirePermission('ophthalmology:iol:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Use parameterized SQL with correct column names from migration
      const iolsResult = await db.run(sql`
        SELECT i.*, hp.first_name as patient_first_name, hp.last_name as patient_last_name
        FROM ophthalmology_iol_implants i
        LEFT JOIN healthcare_patients hp ON i.patient_id = hp.id
        WHERE i.company_id = ${organizationId}
        ${query.patientId ? sql`AND i.patient_id = ${query.patientId}` : sql``}
        ${query.eye ? sql`AND i.eye = ${query.eye}` : sql``}
        ORDER BY i.surgery_date DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_iol_implants i
        WHERE i.company_id = ${organizationId}
        ${query.patientId ? sql`AND i.patient_id = ${query.patientId}` : sql``}
        ${query.eye ? sql`AND i.eye = ${query.eye}` : sql``}
      `);

      const iols = (iolsResult.results || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        patientName: row.patient_first_name && row.patient_last_name
          ? `${row.patient_first_name} ${row.patient_last_name}`
          : null,
        implantedAt: row.surgery_date,
        eye: row.eye,
        model: row.iol_model,
        power: row.iol_power,
        manufacturer: row.iol_manufacturer,
        type: row.iol_type,
        notes: row.notes,
      }));

      return c.json({
        success: true,
        data: iols,
        meta: {
          total: (totalResult.results?.[0] as any)?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/iol-implants/:id
 * Get a single IOL implant record
 */
ophthalmology.get(
  '/iol-implants/:id',
  requirePermission('ophthalmology:iol:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const iolId = c.req.param('id');

      const [iol] = await db
        .select()
        .from(ophthalmologyIolImplants)
        .where(and(
          eq(ophthalmologyIolImplants.id, iolId),
          eq(ophthalmologyIolImplants.companyId, organizationId)
        ))
        .limit(1);

      if (!iol) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'IOL implant record not found' }
        }, 404);
      }

      return c.json({ success: true, data: iol });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/iol-implants
 * Create a new IOL implant record
 */
ophthalmology.post(
  '/iol-implants',
  requirePermission('ophthalmology:iol:write'),
  zValidator('json', createIolSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const iolId = crypto.randomUUID();
      const now = new Date();

      // Generate IOL number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologyIolImplants)
        .where(eq(ophthalmologyIolImplants.companyId, organizationId));
      const iolNumber = `IOL-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologyIolImplants).values({
        id: iolId,
        companyId: organizationId,
        patientId: data.patientId,
        surgeryId: data.surgeryId,
        biometryId: data.biometryId,
        iolNumber,
        implantDate: new Date(data.implantDate),
        eye: data.eye,
        manufacturer: data.manufacturer,
        model: data.model,
        iolType: data.iolType,
        sphericalPower: data.sphericalPower,
        cylinderPower: data.cylinderPower,
        cylinderAxis: data.cylinderAxis,
        addPower: data.addPower,
        serialNumber: data.serialNumber,
        lotNumber: data.lotNumber,
        formulaUsed: data.formulaUsed,
        targetRefraction: data.targetRefraction,
        surgeon: data.surgeonId,
        status: 'implanted',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [iol] = await db
        .select()
        .from(ophthalmologyIolImplants)
        .where(eq(ophthalmologyIolImplants.id, iolId))
        .limit(1);

      return c.json({
        success: true,
        data: iol,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/iol-implants/:id
 * Update an IOL implant
 */
ophthalmology.put(
  '/iol-implants/:id',
  requirePermission('ophthalmology:iol:write'),
  zValidator('json', updateIolSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const iolId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyIolImplants)
        .where(and(
          eq(ophthalmologyIolImplants.id, iolId),
          eq(ophthalmologyIolImplants.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'IOL implant not found' }
        }, 404);
      }

      const now = new Date();
      await db
        .update(ophthalmologyIolImplants)
        .set({
          implantDate: data.implantDate ? new Date(data.implantDate) : undefined,
          eye: data.eye,
          manufacturer: data.manufacturer,
          model: data.model,
          iolType: data.iolType,
          sphericalPower: data.sphericalPower,
          cylinderPower: data.cylinderPower,
          cylinderAxis: data.cylinderAxis,
          addPower: data.addPower,
          serialNumber: data.serialNumber,
          lotNumber: data.lotNumber,
          formulaUsed: data.formulaUsed,
          targetRefraction: data.targetRefraction,
          surgeon: data.surgeonId,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyIolImplants.id, iolId));

      const [iol] = await db
        .select()
        .from(ophthalmologyIolImplants)
        .where(eq(ophthalmologyIolImplants.id, iolId))
        .limit(1);

      return c.json({ success: true, data: iol });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// IVT INJECTIONS ROUTES
// ============================================================================

/**
 * GET /ophthalmology/ivt-injections
 * List IVT injections
 */
ophthalmology.get(
  '/ivt-injections',
  requirePermission('ophthalmology:ivt:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(ophthalmologyIvtInjections.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(ophthalmologyIvtInjections.patientId, query.patientId));
      }

      if (query.eye) {
        conditions.push(eq(ophthalmologyIvtInjections.eye, query.eye as 'od' | 'os'));
      }

      const ivts = await db
        .select()
        .from(ophthalmologyIvtInjections)
        .where(and(...conditions))
        .orderBy(desc(ophthalmologyIvtInjections.injectionDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(ophthalmologyIvtInjections)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: ivts,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/ivt-injections/:id
 * Get a single IVT injection record
 */
ophthalmology.get(
  '/ivt-injections/:id',
  requirePermission('ophthalmology:ivt:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const ivtId = c.req.param('id');

      const [ivt] = await db
        .select()
        .from(ophthalmologyIvtInjections)
        .where(and(
          eq(ophthalmologyIvtInjections.id, ivtId),
          eq(ophthalmologyIvtInjections.companyId, organizationId)
        ))
        .limit(1);

      if (!ivt) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'IVT injection record not found' }
        }, 404);
      }

      return c.json({ success: true, data: ivt });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/ivts/:id
 * Alias route for IVT injections (frontend compatibility)
 */
ophthalmology.get(
  '/ivts/:id',
  requirePermission('ophthalmology:ivt:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const ivtId = c.req.param('id');

      const [ivt] = await db
        .select()
        .from(ophthalmologyIvtInjections)
        .where(and(
          eq(ophthalmologyIvtInjections.id, ivtId),
          eq(ophthalmologyIvtInjections.companyId, organizationId)
        ))
        .limit(1);

      if (!ivt) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'IVT injection record not found' }
        }, 404);
      }

      return c.json({ success: true, data: ivt });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/ivt-injections
 * Create a new IVT injection record
 */
ophthalmology.post(
  '/ivt-injections',
  requirePermission('ophthalmology:ivt:write'),
  zValidator('json', createIvtSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const ivtId = crypto.randomUUID();
      const now = new Date();

      // Generate IVT number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologyIvtInjections)
        .where(eq(ophthalmologyIvtInjections.companyId, organizationId));
      const ivtNumber = `IVT-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologyIvtInjections).values({
        id: ivtId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        ivtNumber,
        injectionDate: new Date(data.injectionDate),
        eye: data.eye,
        indication: data.indication,
        indicationDetails: data.indicationDetails,
        medication: data.medication,
        medicationBrand: data.medicationBrand,
        dose: data.dose,
        lotNumber: data.lotNumber,
        treatmentProtocol: data.treatmentProtocol,
        injectionInSeries: data.injectionInSeries,
        quadrant: data.quadrant,
        preIopOd: data.eye === 'od' ? data.preIop : undefined,
        preIopOs: data.eye === 'os' ? data.preIop : undefined,
        postIop: data.postIop,
        performedBy: data.performedById,
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [ivt] = await db
        .select()
        .from(ophthalmologyIvtInjections)
        .where(eq(ophthalmologyIvtInjections.id, ivtId))
        .limit(1);

      return c.json({
        success: true,
        data: ivt,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/ivt-injections/:id
 * Update an IVT injection record
 */
ophthalmology.put(
  '/ivt-injections/:id',
  requirePermission('ophthalmology:ivt:write'),
  zValidator('json', updateIvtSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const ivtId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyIvtInjections)
        .where(and(
          eq(ophthalmologyIvtInjections.id, ivtId),
          eq(ophthalmologyIvtInjections.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'IVT injection record not found' }
        }, 404);
      }

      const now = new Date();
      await db
        .update(ophthalmologyIvtInjections)
        .set({
          injectionDate: data.injectionDate ? new Date(data.injectionDate) : undefined,
          eye: data.eye,
          indication: data.indication,
          indicationDetails: data.indicationDetails,
          medication: data.medication,
          medicationBrand: data.medicationBrand,
          dose: data.dose,
          lotNumber: data.lotNumber,
          treatmentProtocol: data.treatmentProtocol,
          injectionInSeries: data.injectionInSeries,
          quadrant: data.quadrant,
          preIopOd: data.preIop,
          postIopOd: data.postIop,
          performedBy: data.performedById,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyIvtInjections.id, ivtId));

      const [ivt] = await db
        .select()
        .from(ophthalmologyIvtInjections)
        .where(eq(ophthalmologyIvtInjections.id, ivtId))
        .limit(1);

      return c.json({ success: true, data: ivt });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// SURGERIES ROUTES
// ============================================================================

/**
 * GET /ophthalmology/surgeries
 * List surgeries
 */
ophthalmology.get(
  '/surgeries',
  requirePermission('ophthalmology:surgeries:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(ophthalmologySurgeries.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(ophthalmologySurgeries.patientId, query.patientId));
      }

      if (query.eye) {
        conditions.push(eq(ophthalmologySurgeries.eye, query.eye));
      }

      const surgeries = await db
        .select()
        .from(ophthalmologySurgeries)
        .where(and(...conditions))
        .orderBy(desc(ophthalmologySurgeries.surgeryDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(ophthalmologySurgeries)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: surgeries,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/surgeries/:id
 * Get a single surgery record
 */
ophthalmology.get(
  '/surgeries/:id',
  requirePermission('ophthalmology:surgeries:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const surgeryId = c.req.param('id');

      const [surgery] = await db
        .select()
        .from(ophthalmologySurgeries)
        .where(and(
          eq(ophthalmologySurgeries.id, surgeryId),
          eq(ophthalmologySurgeries.companyId, organizationId)
        ))
        .limit(1);

      if (!surgery) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Surgery record not found' }
        }, 404);
      }

      return c.json({ success: true, data: surgery });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/surgeries
 * Create a new surgery record
 */
ophthalmology.post(
  '/surgeries',
  requirePermission('ophthalmology:surgeries:write'),
  zValidator('json', createSurgerySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const surgeryId = crypto.randomUUID();
      const now = new Date();

      // Generate surgery number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologySurgeries)
        .where(eq(ophthalmologySurgeries.companyId, organizationId));
      const surgeryNumber = `SURG-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologySurgeries).values({
        id: surgeryId,
        companyId: organizationId,
        patientId: data.patientId,
        surgeryNumber,
        surgeryDate: new Date(data.surgeryDate),
        eye: data.eye,
        surgeryType: data.surgeryType,
        surgerySubtype: data.surgerySubtype,
        indication: data.indication,
        anesthesiaType: data.anesthesiaType,
        surgeon: data.surgeonId,
        procedureDetails: data.procedureDetails,
        intraOpFindings: data.intraOpFindings,
        surgeryOutcome: data.surgeryOutcome || 'successful',
        postOpMedications: data.postOpMedications ? JSON.stringify(data.postOpMedications) : undefined,
        postOpInstructions: data.postOpInstructions,
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [surgery] = await db
        .select()
        .from(ophthalmologySurgeries)
        .where(eq(ophthalmologySurgeries.id, surgeryId))
        .limit(1);

      return c.json({
        success: true,
        data: surgery,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/surgeries/:id
 * Update a surgery record
 */
ophthalmology.put(
  '/surgeries/:id',
  requirePermission('ophthalmology:surgeries:write'),
  zValidator('json', updateSurgerySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const surgeryId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologySurgeries)
        .where(and(
          eq(ophthalmologySurgeries.id, surgeryId),
          eq(ophthalmologySurgeries.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Surgery record not found' }
        }, 404);
      }

      const now = new Date().toISOString();
      await db
        .update(ophthalmologySurgeries)
        .set({
          surgeryDate: data.surgeryDate || undefined,
          eye: data.eye,
          surgeryType: data.surgeryType,
          surgerySubtype: data.surgerySubtype,
          indication: data.indication,
          anesthesiaType: data.anesthesiaType,
          surgeon: data.surgeonId,
          procedureDetails: data.procedureDetails,
          intraOpFindings: data.intraOpFindings,
          surgeryOutcome: data.surgeryOutcome,
          postOpMedications: data.postOpMedications ? JSON.stringify(data.postOpMedications) : undefined,
          postOpInstructions: data.postOpInstructions,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologySurgeries.id, surgeryId));

      const [surgery] = await db
        .select()
        .from(ophthalmologySurgeries)
        .where(eq(ophthalmologySurgeries.id, surgeryId))
        .limit(1);

      return c.json({ success: true, data: surgery });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// REFRACTION ROUTES
// ============================================================================

/**
 * GET /ophthalmology/refraction
 * List refraction records
 */
ophthalmology.get(
  '/refraction',
  requirePermission('ophthalmology:refraction:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Use parameterized SQL with correct column names from migration
      const refractionsResult = await db.run(sql`
        SELECT r.*, hp.first_name as patient_first_name, hp.last_name as patient_last_name
        FROM ophthalmology_refraction r
        LEFT JOIN healthcare_patients hp ON r.patient_id = hp.id
        WHERE r.company_id = ${organizationId}
        ${query.patientId ? sql`AND r.patient_id = ${query.patientId}` : sql``}
        ORDER BY r.measurement_date DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count FROM ophthalmology_refraction r
        WHERE r.company_id = ${organizationId}
        ${query.patientId ? sql`AND r.patient_id = ${query.patientId}` : sql``}
      `);

      const refractions = (refractionsResult.results || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        patientName: row.patient_first_name && row.patient_last_name
          ? `${row.patient_first_name} ${row.patient_last_name}`
          : null,
        measurementDate: row.measurement_date,
        odSphere: row.od_sphere,
        odCylinder: row.od_cylinder,
        odAxis: row.od_axis,
        osSphere: row.os_sphere,
        osCylinder: row.os_cylinder,
        osAxis: row.os_axis,
        odVa: row.od_va,
        osVa: row.os_va,
        notes: row.notes,
      }));

      return c.json({
        success: true,
        data: refractions,
        meta: {
          total: (totalResult.results?.[0] as any)?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/refraction/:id
 * Get a single refraction record
 */
ophthalmology.get(
  '/refraction/:id',
  requirePermission('ophthalmology:refraction:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const refractionId = c.req.param('id');

      const [refraction] = await db
        .select()
        .from(ophthalmologyRefraction)
        .where(and(
          eq(ophthalmologyRefraction.id, refractionId),
          eq(ophthalmologyRefraction.companyId, organizationId)
        ))
        .limit(1);

      if (!refraction) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Refraction record not found' }
        }, 404);
      }

      return c.json({ success: true, data: refraction });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/refraction
 * Create a new refraction record
 */
ophthalmology.post(
  '/refraction',
  requirePermission('ophthalmology:refraction:write'),
  zValidator('json', createRefractionSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const refractionId = crypto.randomUUID();
      const now = new Date();

      // Generate refraction number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologyRefraction)
        .where(eq(ophthalmologyRefraction.companyId, organizationId));
      const refractionNumber = `REF-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologyRefraction).values({
        id: refractionId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        refractionNumber,
        examinationDate: new Date(data.examinationDate),
        refractionType: data.refractionType,
        odSphere: data.odSphere,
        odCylinder: data.odCylinder,
        odAxis: data.odAxis,
        odAdd: data.odAdd,
        osSphere: data.osSphere,
        osCylinder: data.osCylinder,
        osAxis: data.osAxis,
        osAdd: data.osAdd,
        odUcvaDistance: data.odUcvaDistance,
        osUcvaDistance: data.osUcvaDistance,
        odBcvaDistance: data.odBcvaDistance,
        osBcvaDistance: data.osBcvaDistance,
        performedBy: data.performedById,
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [refraction] = await db
        .select()
        .from(ophthalmologyRefraction)
        .where(eq(ophthalmologyRefraction.id, refractionId))
        .limit(1);

      return c.json({
        success: true,
        data: refraction,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/refraction/:id
 * Update a refraction record
 */
ophthalmology.put(
  '/refraction/:id',
  requirePermission('ophthalmology:refraction:write'),
  zValidator('json', updateRefractionSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const refractionId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyRefraction)
        .where(and(
          eq(ophthalmologyRefraction.id, refractionId),
          eq(ophthalmologyRefraction.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Refraction record not found' }
        }, 404);
      }

      const now = new Date();
      await db
        .update(ophthalmologyRefraction)
        .set({
          examinationDate: data.examinationDate ? new Date(data.examinationDate) : undefined,
          refractionType: data.refractionType,
          odSphere: data.odSphere,
          odCylinder: data.odCylinder,
          odAxis: data.odAxis,
          odAdd: data.odAdd,
          osSphere: data.osSphere,
          osCylinder: data.osCylinder,
          osAxis: data.osAxis,
          osAdd: data.osAdd,
          odUcvaDistance: data.odUcvaDistance,
          osUcvaDistance: data.osUcvaDistance,
          odBcvaDistance: data.odBcvaDistance,
          osBcvaDistance: data.osBcvaDistance,
          performedBy: data.performedById,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyRefraction.id, refractionId));

      const [refraction] = await db
        .select()
        .from(ophthalmologyRefraction)
        .where(eq(ophthalmologyRefraction.id, refractionId))
        .limit(1);

      return c.json({ success: true, data: refraction });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// TONOMETRY ROUTES
// ============================================================================

/**
 * GET /ophthalmology/tonometry
 * List tonometry records
 */
ophthalmology.get(
  '/tonometry',
  requirePermission('ophthalmology:tonometry:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(ophthalmologyTonometry.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(ophthalmologyTonometry.patientId, query.patientId));
      }

      const tonometries = await db
        .select()
        .from(ophthalmologyTonometry)
        .where(and(...conditions))
        .orderBy(desc(ophthalmologyTonometry.measurementDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(ophthalmologyTonometry)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: tonometries,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/tonometry/:id
 * Get a single tonometry record
 */
ophthalmology.get(
  '/tonometry/:id',
  requirePermission('ophthalmology:tonometry:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const tonometryId = c.req.param('id');

      const [tonometry] = await db
        .select()
        .from(ophthalmologyTonometry)
        .where(and(
          eq(ophthalmologyTonometry.id, tonometryId),
          eq(ophthalmologyTonometry.companyId, organizationId)
        ))
        .limit(1);

      if (!tonometry) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tonometry record not found' }
        }, 404);
      }

      return c.json({ success: true, data: tonometry });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/tonometry
 * Create a new tonometry record
 */
ophthalmology.post(
  '/tonometry',
  requirePermission('ophthalmology:tonometry:write'),
  zValidator('json', createTonometrySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const tonometryId = crypto.randomUUID();
      const now = new Date();

      // Generate measurement number
      const [countResult] = await db
        .select({ count: count() })
        .from(ophthalmologyTonometry)
        .where(eq(ophthalmologyTonometry.companyId, organizationId));
      const measurementNumber = `IOP-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(ophthalmologyTonometry).values({
        id: tonometryId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        measurementNumber,
        measurementDate: new Date(data.measurementDate),
        measurementTime: data.measurementTime,
        tonometryMethod: data.tonometryMethod,
        iopOd: data.iopOd,
        iopOs: data.iopOs,
        cctOd: data.cctOd,
        cctOs: data.cctOs,
        targetIopOd: data.targetIopOd,
        targetIopOs: data.targetIopOs,
        isOnGlaucomaMedications: data.isOnGlaucomaMedications,
        currentMedications: data.currentMedications ? JSON.stringify(data.currentMedications) : undefined,
        performedBy: data.performedById,
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [tonometry] = await db
        .select()
        .from(ophthalmologyTonometry)
        .where(eq(ophthalmologyTonometry.id, tonometryId))
        .limit(1);

      return c.json({
        success: true,
        data: tonometry,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/tonometry/:id
 * Update a tonometry record
 */
ophthalmology.put(
  '/tonometry/:id',
  requirePermission('ophthalmology:tonometry:write'),
  zValidator('json', updateTonometrySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const tonometryId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyTonometry)
        .where(and(
          eq(ophthalmologyTonometry.id, tonometryId),
          eq(ophthalmologyTonometry.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tonometry record not found' }
        }, 404);
      }

      const now = new Date();
      await db
        .update(ophthalmologyTonometry)
        .set({
          measurementDate: data.measurementDate ? new Date(data.measurementDate) : undefined,
          measurementTime: data.measurementTime,
          tonometryMethod: data.tonometryMethod,
          iopOd: data.iopOd,
          iopOs: data.iopOs,
          cctOd: data.cctOd,
          cctOs: data.cctOs,
          targetIopOd: data.targetIopOd,
          targetIopOs: data.targetIopOs,
          isOnGlaucomaMedications: data.isOnGlaucomaMedications,
          currentMedications: data.currentMedications ? JSON.stringify(data.currentMedications) : undefined,
          performedBy: data.performedById,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyTonometry.id, tonometryId));

      const [tonometry] = await db
        .select()
        .from(ophthalmologyTonometry)
        .where(eq(ophthalmologyTonometry.id, tonometryId))
        .limit(1);

      return c.json({ success: true, data: tonometry });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// OSDI SCORES ROUTES
// ============================================================================

/**
 * GET /ophthalmology/osdi-scores
 * List OSDI scores
 */
ophthalmology.get(
  '/osdi-scores',
  requirePermission('ophthalmology:osdi:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(ophthalmologyOsdiScores.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(ophthalmologyOsdiScores.patientId, query.patientId));
      }

      const scores = await db
        .select()
        .from(ophthalmologyOsdiScores)
        .where(and(...conditions))
        .orderBy(desc(ophthalmologyOsdiScores.assessmentDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(ophthalmologyOsdiScores)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: scores,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * GET /ophthalmology/osdi-scores/:id
 * Get a single OSDI score
 */
ophthalmology.get(
  '/osdi-scores/:id',
  requirePermission('ophthalmology:osdi:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const osdiId = c.req.param('id');

      const [osdi] = await db
        .select()
        .from(ophthalmologyOsdiScores)
        .where(and(
          eq(ophthalmologyOsdiScores.id, osdiId),
          eq(ophthalmologyOsdiScores.companyId, organizationId)
        ))
        .limit(1);

      if (!osdi) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'OSDI score not found' }
        }, 404);
      }

      return c.json({ success: true, data: osdi });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * POST /ophthalmology/osdi-scores
 * Calculate and save OSDI score
 */
ophthalmology.post(
  '/osdi-scores',
  requirePermission('ophthalmology:osdi:write'),
  zValidator('json', createOsdiSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const osdiId = crypto.randomUUID();
      const now = new Date();

      // Calculate OSDI score
      // OSDI = (Sum of scores for answered questions × 25) / Number of questions answered
      const questions = [
        data.q1LightSensitivity, data.q2GrittyFeeling, data.q3PainfulEyes,
        data.q4BlurredVision, data.q5PoorVision, data.q6Reading, data.q7Driving,
        data.q8Computer, data.q9Television, data.q10WindyConditions,
        data.q11LowHumidity, data.q12AirConditioning
      ].filter(q => q !== undefined && q !== null) as number[];

      const totalScore = questions.length > 0
        ? (questions.reduce((sum, q) => sum + q, 0) * 25) / questions.length
        : 0;

      // Determine severity
      let severity: 'normal' | 'mild' | 'moderate' | 'severe' = 'normal';
      if (totalScore > 32) severity = 'severe';
      else if (totalScore > 22) severity = 'moderate';
      else if (totalScore > 12) severity = 'mild';

      await db.insert(ophthalmologyOsdiScores).values({
        id: osdiId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        assessmentDate: new Date(data.assessmentDate),
        q1LightSensitivity: data.q1LightSensitivity,
        q2GrittyFeeling: data.q2GrittyFeeling,
        q3PainfulEyes: data.q3PainfulEyes,
        q4BlurredVision: data.q4BlurredVision,
        q5PoorVision: data.q5PoorVision,
        q6Reading: data.q6Reading,
        q7Driving: data.q7Driving,
        q8Computer: data.q8Computer,
        q9Television: data.q9Television,
        q10WindyConditions: data.q10WindyConditions,
        q11LowHumidity: data.q11LowHumidity,
        q12AirConditioning: data.q12AirConditioning,
        totalScore,
        severity,
        administeredBy: userId,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      });

      const [osdi] = await db
        .select()
        .from(ophthalmologyOsdiScores)
        .where(eq(ophthalmologyOsdiScores.id, osdiId))
        .limit(1);

      return c.json({
        success: true,
        data: osdi,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
 * PUT /ophthalmology/osdi-scores/:id
 * Update an OSDI score record
 */
ophthalmology.put(
  '/osdi-scores/:id',
  requirePermission('ophthalmology:osdi:write'),
  zValidator('json', updateOsdiSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const osdiId = c.req.param('id');
      const data = c.req.valid('json');

      const [existing] = await db
        .select()
        .from(ophthalmologyOsdiScores)
        .where(and(
          eq(ophthalmologyOsdiScores.id, osdiId),
          eq(ophthalmologyOsdiScores.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'OSDI score not found' }
        }, 404);
      }

      // Calculate OSDI score if any question values changed
      const questions = [
        data.q1LightSensitivity ?? existing.q1LightSensitivity,
        data.q2GrittyFeeling ?? existing.q2GrittyFeeling,
        data.q3PainfulEyes ?? existing.q3PainfulEyes,
        data.q4BlurredVision ?? existing.q4BlurredVision,
        data.q5PoorVision ?? existing.q5PoorVision,
        data.q6Reading ?? existing.q6Reading,
        data.q7Driving ?? existing.q7Driving,
        data.q8Computer ?? existing.q8Computer,
        data.q9Television ?? existing.q9Television,
        data.q10WindyConditions ?? existing.q10WindyConditions,
        data.q11LowHumidity ?? existing.q11LowHumidity,
        data.q12AirConditioning ?? existing.q12AirConditioning,
      ];

      const answeredQuestions = questions.filter(q => q !== null && q !== undefined);
      const totalScore = answeredQuestions.reduce((sum, val) => sum + (val as number), 0);
      const osdiScore = answeredQuestions.length > 0
        ? (totalScore * 25) / answeredQuestions.length
        : 0;

      // Determine severity
      let severity: string;
      if (osdiScore <= 12) severity = 'normal';
      else if (osdiScore <= 22) severity = 'mild';
      else if (osdiScore <= 32) severity = 'moderate';
      else severity = 'severe';

      const now = new Date();
      await db
        .update(ophthalmologyOsdiScores)
        .set({
          assessmentDate: data.assessmentDate ? new Date(data.assessmentDate) : undefined,
          q1LightSensitivity: data.q1LightSensitivity,
          q2GrittyFeeling: data.q2GrittyFeeling,
          q3PainfulEyes: data.q3PainfulEyes,
          q4BlurredVision: data.q4BlurredVision,
          q5PoorVision: data.q5PoorVision,
          q6Reading: data.q6Reading,
          q7Driving: data.q7Driving,
          q8Computer: data.q8Computer,
          q9Television: data.q9Television,
          q10WindyConditions: data.q10WindyConditions,
          q11LowHumidity: data.q11LowHumidity,
          q12AirConditioning: data.q12AirConditioning,
          totalScore: Math.round(osdiScore * 100) / 100,
          severity,
          notes: data.notes,
          updatedAt: now,
        })
        .where(eq(ophthalmologyOsdiScores.id, osdiId));

      const [osdi] = await db
        .select()
        .from(ophthalmologyOsdiScores)
        .where(eq(ophthalmologyOsdiScores.id, osdiId))
        .limit(1);

      return c.json({ success: true, data: osdi });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// ALERTS ROUTES
// ============================================================================

/**
 * GET /ophthalmology/alerts
 * List ophthalmology alerts
 */
ophthalmology.get(
  '/alerts',
  requirePermission('ophthalmology:alerts:read'),
  zValidator('query', listQuerySchema.extend({
    patientId: z.string().optional(),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    status: z.enum(['active', 'acknowledged', 'resolved', 'dismissed', 'snoozed']).optional(),
  })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [
        eq(healthcareAlerts.companyId, organizationId),
        eq(healthcareAlerts.module, 'ophthalmology'),
      ];

      if (query.patientId) {
        conditions.push(eq(healthcareAlerts.patientId, query.patientId));
      }

      if (query.severity) {
        conditions.push(eq(healthcareAlerts.severity, query.severity));
      }

      if (query.status) {
        conditions.push(eq(healthcareAlerts.status, query.status));
      }

      const alerts = await db
        .select()
        .from(healthcareAlerts)
        .where(and(...conditions))
        .orderBy(desc(healthcareAlerts.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(healthcareAlerts)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: alerts,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// APPOINTMENTS ROUTES
// ============================================================================

/**
 * GET /ophthalmology/appointments
 * List ophthalmology appointments
 */
ophthalmology.get(
  '/appointments',
  requirePermission('ophthalmology:appointments:read'),
  zValidator('query', listQuerySchema.extend({
    patientId: z.string().optional(),
    status: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [
        eq(healthcareAppointments.companyId, organizationId),
        eq(healthcareAppointments.module, 'ophthalmology'),
      ];

      if (query.patientId) {
        conditions.push(eq(healthcareAppointments.patientId, query.patientId));
      }

      if (query.status) {
        conditions.push(eq(healthcareAppointments.status, query.status as any));
      }

      if (query.fromDate) {
        conditions.push(sql`${healthcareAppointments.scheduledDate} >= ${new Date(query.fromDate).getTime()}`);
      }

      if (query.toDate) {
        conditions.push(sql`${healthcareAppointments.scheduledDate} <= ${new Date(query.toDate).getTime()}`);
      }

      const appointments = await db
        .select()
        .from(healthcareAppointments)
        .where(and(...conditions))
        .orderBy(desc(healthcareAppointments.scheduledDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(healthcareAppointments)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: appointments,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
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
// DELETE ENDPOINTS FOR OTHER ENTITIES
// ============================================================================

/**
 * DELETE /ophthalmology/consultations/:id
 */
ophthalmology.delete(
  '/consultations/:id',
  requirePermission('ophthalmology:consultations:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const consultationId = c.req.param('id');

      await db
        .delete(healthcareConsultations)
        .where(
          and(
            eq(healthcareConsultations.id, consultationId),
            eq(healthcareConsultations.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'Consultation deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/oct/:id
 */
ophthalmology.delete(
  '/oct/:id',
  requirePermission('ophthalmology:oct:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const octId = c.req.param('id');

      await db
        .delete(ophthalmologyOctScans)
        .where(
          and(
            eq(ophthalmologyOctScans.id, octId),
            eq(ophthalmologyOctScans.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'OCT scan deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/visual-fields/:id
 */
ophthalmology.delete(
  '/visual-fields/:id',
  requirePermission('ophthalmology:visual-fields:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const vfId = c.req.param('id');

      await db
        .delete(ophthalmologyVisualFields)
        .where(
          and(
            eq(ophthalmologyVisualFields.id, vfId),
            eq(ophthalmologyVisualFields.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'Visual field deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/biometry/:id
 */
ophthalmology.delete(
  '/biometry/:id',
  requirePermission('ophthalmology:biometry:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const biometryId = c.req.param('id');

      await db
        .delete(ophthalmologyBiometry)
        .where(
          and(
            eq(ophthalmologyBiometry.id, biometryId),
            eq(ophthalmologyBiometry.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'Biometry deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/iol-implants/:id
 */
ophthalmology.delete(
  '/iol-implants/:id',
  requirePermission('ophthalmology:iol:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const iolId = c.req.param('id');

      await db
        .delete(ophthalmologyIolImplants)
        .where(
          and(
            eq(ophthalmologyIolImplants.id, iolId),
            eq(ophthalmologyIolImplants.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'IOL implant deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/ivt-injections/:id
 */
ophthalmology.delete(
  '/ivt-injections/:id',
  requirePermission('ophthalmology:ivt:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const ivtId = c.req.param('id');

      await db
        .delete(ophthalmologyIvtInjections)
        .where(
          and(
            eq(ophthalmologyIvtInjections.id, ivtId),
            eq(ophthalmologyIvtInjections.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'IVT injection deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/surgeries/:id
 */
ophthalmology.delete(
  '/surgeries/:id',
  requirePermission('ophthalmology:surgeries:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const surgeryId = c.req.param('id');

      await db
        .delete(ophthalmologySurgeries)
        .where(
          and(
            eq(ophthalmologySurgeries.id, surgeryId),
            eq(ophthalmologySurgeries.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'Surgery deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/refraction/:id
 */
ophthalmology.delete(
  '/refraction/:id',
  requirePermission('ophthalmology:refraction:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const refractionId = c.req.param('id');

      await db
        .delete(ophthalmologyRefraction)
        .where(
          and(
            eq(ophthalmologyRefraction.id, refractionId),
            eq(ophthalmologyRefraction.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'Refraction deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/tonometry/:id
 */
ophthalmology.delete(
  '/tonometry/:id',
  requirePermission('ophthalmology:tonometry:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const tonometryId = c.req.param('id');

      await db
        .delete(ophthalmologyTonometry)
        .where(
          and(
            eq(ophthalmologyTonometry.id, tonometryId),
            eq(ophthalmologyTonometry.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'Tonometry deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

/**
 * DELETE /ophthalmology/osdi-scores/:id
 */
ophthalmology.delete(
  '/osdi-scores/:id',
  requirePermission('ophthalmology:osdi:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const osdiId = c.req.param('id');

      await db
        .delete(ophthalmologyOsdiScores)
        .where(
          and(
            eq(ophthalmologyOsdiScores.id, osdiId),
            eq(ophthalmologyOsdiScores.companyId, organizationId)
          )
        );

      return c.json({ success: true, data: { message: 'OSDI score deleted' } });
    } catch (error) {
      logger.error('Route error', error, { route: 'ophthalmology' });
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }, 500);
    }
  }
);

export default ophthalmology;
