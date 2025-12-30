/**
 * Cardiology Routes
 * /api/v1/cardiology
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
  cardiologyEcgRecords,
  cardiologyEchocardiograms,
  cardiologyHolterRecords,
  cardiologyPacemakers,
  cardiologyPacemakerInterrogations,
  cardiologyStents,
  cardiologyRiskScores,
  cardiologyCardiacEvents,
  cardiologyMedications,
  contacts,
} from '@perfex/database';

const cardiology = new Hono<{ Bindings: Env }>();

// All routes require authentication
cardiology.use('/*', requireAuth);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  status: z.string().optional(),
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
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  systolicBp: z.number().optional(),
  diastolicBp: z.number().optional(),
  heartRate: z.number().optional(),
  respiratoryRate: z.number().optional(),
  temperature: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  physicalExamination: z.string().optional(),
  assessment: z.string().optional(),
  diagnosis: z.array(z.string()).optional(),
  treatmentPlan: z.string().optional(),
  prescriptions: z.array(z.any()).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

const createEcgSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  recordingDate: z.string(),
  ecgType: z.enum(['standard_12_lead', 'rhythm_strip', 'stress_test', 'signal_averaged']),
  paperSpeed: z.number().optional(),
  gain: z.number().optional(),
  heartRate: z.number().optional(),
  prInterval: z.number().optional(),
  qrsDuration: z.number().optional(),
  qtInterval: z.number().optional(),
  qtcInterval: z.number().optional(),
  axis: z.number().optional(),
  rhythm: z.enum(['sinus', 'afib', 'aflutter', 'svt', 'vt', 'paced', 'other']).optional(),
  interpretation: z.string().optional(),
  ecgImageUrl: z.string().optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createEchoSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  studyDate: z.string(),
  echoType: z.enum(['tte', 'tee', 'stress', 'contrast', 'strain']),
  indication: z.string().optional(),
  lvEf: z.number().optional(),
  lvEfMethod: z.enum(['visual', 'biplane', 'simpson', '3d']).optional(),
  lvedd: z.number().optional(),
  lvesd: z.number().optional(),
  laVolume: z.number().optional(),
  mitralRegurgitation: z.enum(['none', 'trivial', 'mild', 'moderate', 'severe']).optional(),
  aorticRegurgitation: z.enum(['none', 'trivial', 'mild', 'moderate', 'severe']).optional(),
  tricuspidRegurgitation: z.enum(['none', 'trivial', 'mild', 'moderate', 'severe']).optional(),
  rvsp: z.number().optional(),
  diastolicFunction: z.enum(['normal', 'grade_1', 'grade_2', 'grade_3', 'indeterminate']).optional(),
  pericardialEffusion: z.enum(['none', 'trivial', 'small', 'moderate', 'large']).optional(),
  interpretation: z.string().optional(),
  conclusion: z.string().optional(),
  recommendations: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  performedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createPacemakerSchema = z.object({
  patientId: z.string().uuid(),
  deviceType: z.enum(['single_chamber_pacemaker', 'dual_chamber_pacemaker', 'crt_p', 'single_chamber_icd', 'dual_chamber_icd', 'crt_d', 'leadless']),
  indication: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  implantDate: z.string(),
  implantedById: z.string().uuid().optional(),
  implantCenter: z.string().optional(),
  mode: z.string().optional(),
  lowerRate: z.number().optional(),
  upperRate: z.number().optional(),
  batteryStatus: z.enum(['ok', 'elective_replacement', 'end_of_life']).optional(),
  remoteMonitoringEnabled: z.boolean().optional(),
  mriConditional: z.boolean().optional(),
  notes: z.string().optional(),
});

const createStentSchema = z.object({
  patientId: z.string().uuid(),
  procedureDate: z.string(),
  procedureType: z.enum(['primary_pci', 'elective_pci', 'rescue_pci', 'staged_pci']),
  indication: z.string(),
  clinicalPresentation: z.enum(['stemi', 'nstemi', 'unstable_angina', 'stable_angina', 'silent_ischemia']).optional(),
  vesselName: z.string(),
  vesselSegment: z.string().optional(),
  stentType: z.enum(['des', 'bms', 'bioresorbable', 'drug_coated_balloon']),
  stentManufacturer: z.string().optional(),
  stentModel: z.string().optional(),
  stentDiameter: z.number().optional(),
  stentLength: z.number().optional(),
  procedureSuccess: z.boolean().optional(),
  operatorId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createRiskScoreSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  scoreType: z.enum(['score2', 'score2_op', 'cha2ds2_vasc', 'has_bled', 'heart', 'timi', 'grace', 'crusade', 'framingham', 'euroscore2', 'syntax']),
  inputParameters: z.any(),
  scoreValue: z.number(),
  riskCategory: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high']).optional(),
  riskPercentage: z.number().optional(),
  interpretation: z.string().optional(),
  recommendations: z.string().optional(),
  notes: z.string().optional(),
});

const createMedicationSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  medicationName: z.string(),
  genericName: z.string().optional(),
  medicationClass: z.enum(['antiplatelet', 'anticoagulant', 'statin', 'beta_blocker', 'ace_inhibitor', 'arb', 'arni', 'calcium_channel_blocker', 'diuretic', 'mra', 'antiarrhythmic', 'nitrate', 'sglt2i', 'other']).optional(),
  dose: z.string(),
  frequency: z.string(),
  route: z.enum(['oral', 'iv', 'sc', 'im', 'topical', 'sublingual']).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  indication: z.string().optional(),
  prescribedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const createHolterSchema = z.object({
  patientId: z.string().uuid(),
  indication: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  durationHours: z.number().optional(),
  monitorType: z.enum(['standard', 'extended', 'event_recorder', 'loop_recorder']).optional(),
  deviceModel: z.string().optional(),
  minHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  avgHeartRate: z.number().optional(),
  totalQrsComplexes: z.number().optional(),
  svePrematureBeats: z.number().optional(),
  pvePrematureBeats: z.number().optional(),
  afibEpisodes: z.number().optional(),
  afibBurden: z.number().optional(),
  vtEpisodes: z.number().optional(),
  pausesOver2s: z.number().optional(),
  pausesOver3s: z.number().optional(),
  longestPause: z.number().optional(),
  interpretation: z.string().optional(),
  conclusion: z.string().optional(),
  recommendations: z.string().optional(),
  analyzedById: z.string().uuid().optional(),
  interpretedById: z.string().uuid().optional(),
  reportUrl: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// DASHBOARD & STATS
// ============================================================================

/**
 * GET /cardiology/dashboard/stats
 * Get cardiology dashboard statistics
 */
cardiology.get(
  '/dashboard/stats',
  requirePermission('cardiology:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;

      // Get patient counts from cardiology_patients table using raw SQL
      const totalPatientsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_patients WHERE company_id = ${organizationId}
      `);
      const totalPatients = (totalPatientsResult.results?.[0] as any)?.count ?? 0;

      // Get pending ECGs from cardiology_ecg_records table
      const pendingEcgsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_ecg_records
        WHERE company_id = ${organizationId} AND status = 'pending'
      `);
      const pendingEcgs = (pendingEcgsResult.results?.[0] as any)?.count ?? 0;

      // Get active pacemakers
      const activePacemakersResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_pacemakers
        WHERE company_id = ${organizationId} AND status = 'active'
      `);
      const activePacemakers = (activePacemakersResult.results?.[0] as any)?.count ?? 0;

      // Get critical alerts from healthcare_alerts
      const criticalAlertsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM healthcare_alerts
        WHERE company_id = ${organizationId}
        AND module = 'cardiology'
        AND status = 'active'
        AND severity = 'critical'
      `);
      const criticalAlerts = (criticalAlertsResult.results?.[0] as any)?.count ?? 0;

      // Get stent count as a metric
      const stentsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_stents WHERE company_id = ${organizationId}
      `);
      const totalStents = (stentsResult.results?.[0] as any)?.count ?? 0;

      // Get today's appointments from healthcare_appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = Math.floor(today.getTime() / 1000);
      const todayEnd = todayStart + 86400; // +24 hours
      const todayAppointmentsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM healthcare_appointments
        WHERE company_id = ${organizationId}
        AND module = 'cardiology'
        AND scheduled_date >= ${todayStart}
        AND scheduled_date < ${todayEnd}
        AND status NOT IN ('cancelled', 'no_show')
      `);
      const todayAppointments = (todayAppointmentsResult.results?.[0] as any)?.count ?? 0;

      // Get recent cardiac events (last 30 days)
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const recentEventsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_cardiac_events
        WHERE company_id = ${organizationId}
        AND event_date >= ${thirtyDaysAgo}
      `);
      const recentEvents = (recentEventsResult.results?.[0] as any)?.count ?? 0;

      return c.json({
        success: true,
        data: {
          totalPatients,
          todayAppointments,
          pendingEcgs,
          activePacemakers,
          criticalAlerts,
          totalStents,
          recentEvents,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/patients
 * List cardiology patients (joined with cardiology_patients extension)
 */
cardiology.get(
  '/patients',
  requirePermission('cardiology:patients:read'),
  zValidator('query', patientQuerySchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Get patients with cardiology extension joined
      const patientsResult = await db.run(sql`
        SELECT
          hp.id, hp.first_name, hp.last_name, hp.date_of_birth, hp.gender,
          hp.national_id, hp.phone, hp.email, hp.address, hp.city,
          hp.blood_type, hp.allergies, hp.medical_history, hp.status,
          hp.insurance_provider, hp.insurance_number, hp.notes,
          hp.created_at, hp.updated_at,
          cp.id as cardiology_id, cp.cardiac_risk_level, cp.has_pacemaker,
          cp.has_stent, cp.has_bypass, cp.ejection_fraction,
          cp.nyha_class, cp.smoking_status, cp.diabetes_status
        FROM cardiology_patients cp
        INNER JOIN healthcare_patients hp ON cp.healthcare_patient_id = hp.id
        WHERE cp.company_id = ${organizationId}
        ${query.patientStatus ? sql`AND hp.status = ${query.patientStatus}` : sql``}
        ${query.search ? sql`AND (hp.first_name LIKE ${'%' + query.search + '%'} OR hp.last_name LIKE ${'%' + query.search + '%'} OR hp.national_id LIKE ${'%' + query.search + '%'})` : sql``}
        ORDER BY hp.created_at DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count
        FROM cardiology_patients cp
        INNER JOIN healthcare_patients hp ON cp.healthcare_patient_id = hp.id
        WHERE cp.company_id = ${organizationId}
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
        cardiology: {
          id: row.cardiology_id,
          cardiacRiskLevel: row.cardiac_risk_level,
          hasPacemaker: !!row.has_pacemaker,
          hasStent: !!row.has_stent,
          hasBypass: !!row.has_bypass,
          ejectionFraction: row.ejection_fraction,
          nyhaClass: row.nyha_class,
          smokingStatus: row.smoking_status,
          diabetesStatus: row.diabetes_status,
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
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/patients/:id
 * Get a single cardiology patient
 */
cardiology.get(
  '/patients/:id',
  requirePermission('cardiology:patients:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const patientId = c.req.param('id');

      // Get patient from cardiology_patients joined with healthcare_patients
      const patientResult = await db.run(sql`
        SELECT
          hp.id, hp.first_name, hp.last_name, hp.date_of_birth, hp.gender,
          hp.national_id, hp.phone, hp.email, hp.address, hp.city,
          hp.blood_type, hp.allergies, hp.medical_history, hp.status,
          hp.insurance_provider, hp.insurance_number, hp.notes,
          hp.created_at, hp.updated_at,
          cp.id as cardiology_id, cp.cardiac_risk_level, cp.has_pacemaker,
          cp.has_stent, cp.has_bypass, cp.ejection_fraction,
          cp.nyha_class, cp.smoking_status, cp.diabetes_status
        FROM cardiology_patients cp
        INNER JOIN healthcare_patients hp ON cp.healthcare_patient_id = hp.id
        WHERE cp.company_id = ${organizationId} AND hp.id = ${patientId}
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
        cardiology: {
          id: patientRow.cardiology_id,
          cardiacRiskLevel: patientRow.cardiac_risk_level,
          hasPacemaker: !!patientRow.has_pacemaker,
          hasStent: !!patientRow.has_stent,
          hasBypass: !!patientRow.has_bypass,
          ejectionFraction: patientRow.ejection_fraction,
          nyhaClass: patientRow.nyha_class,
          smokingStatus: patientRow.smoking_status,
          diabetesStatus: patientRow.diabetes_status,
        },
      };

      // Get pacemakers for this patient
      const pacemakersResult = await db.run(sql`
        SELECT * FROM cardiology_pacemakers
        WHERE patient_id = ${patientId} AND status = 'active'
      `);
      const pacemakers = pacemakersResult.results || [];

      // Get stents for this patient
      const stentsResult = await db.run(sql`
        SELECT * FROM cardiology_stents
        WHERE patient_id = ${patientId}
      `);
      const stents = stentsResult.results || [];

      // Get recent consultations
      const consultationsResult = await db.run(sql`
        SELECT * FROM healthcare_consultations
        WHERE patient_id = ${patientId} AND module = 'cardiology'
        ORDER BY consultation_date DESC
        LIMIT 5
      `);
      const recentConsultations = consultationsResult.results || [];

      // Get active medications
      const medicationsResult = await db.run(sql`
        SELECT * FROM cardiology_medications
        WHERE patient_id = ${patientId} AND status = 'active'
      `);
      const medications = medicationsResult.results || [];

      return c.json({
        success: true,
        data: {
          ...patient,
          pacemakers,
          stents,
          recentConsultations,
          medications,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/patients
 * Create a new cardiology patient
 */
cardiology.post(
  '/patients',
  requirePermission('cardiology:patients:write'),
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
        enrolledModules: JSON.stringify(['cardiology']),
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
      logger.error('Route error', error, { route: 'cardiology' });
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
 * PUT /cardiology/patients/:id
 * Update a cardiology patient
 */
cardiology.put(
  '/patients/:id',
  requirePermission('cardiology:patients:write'),
  zValidator('json', updatePatientSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const patientId = c.req.param('id');
      const data = c.req.valid('json');

      // Check patient exists
      const [existing] = await db
        .select()
        .from(healthcarePatients)
        .where(and(
          eq(healthcarePatients.id, patientId),
          eq(healthcarePatients.companyId, organizationId)
        ))
        .limit(1);

      if (!existing) {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.medicalId) updateData.medicalId = data.medicalId;
      if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
      if (data.gender) updateData.gender = data.gender;
      if (data.bloodType !== undefined) updateData.bloodType = data.bloodType;
      if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName;
      if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone;
      if (data.emergencyContactRelation !== undefined) updateData.emergencyContactRelation = data.emergencyContactRelation;
      if (data.allergies) updateData.allergies = JSON.stringify(data.allergies);
      if (data.medicalHistory) updateData.medicalHistory = JSON.stringify(data.medicalHistory);
      if (data.familyHistory) updateData.familyHistory = JSON.stringify(data.familyHistory);
      if (data.surgicalHistory) updateData.surgicalHistory = JSON.stringify(data.surgicalHistory);
      if (data.currentMedications) updateData.currentMedications = JSON.stringify(data.currentMedications);
      if (data.insuranceProvider !== undefined) updateData.insuranceProvider = data.insuranceProvider;
      if (data.insuranceNumber !== undefined) updateData.insuranceNumber = data.insuranceNumber;
      if (data.referringPhysician !== undefined) updateData.referringPhysician = data.referringPhysician;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await db
        .update(healthcarePatients)
        .set(updateData)
        .where(eq(healthcarePatients.id, patientId));

      const [updated] = await db
        .select()
        .from(healthcarePatients)
        .where(eq(healthcarePatients.id, patientId))
        .limit(1);

      return c.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * DELETE /cardiology/patients/:id
 * Delete a cardiology patient
 */
cardiology.delete(
  '/patients/:id',
  requirePermission('cardiology:patients:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const patientId = c.req.param('id');

      // Check if patient exists in cardiology_patients
      const patientResult = await db.run(sql`
        SELECT cp.id as cardiology_id, hp.id as healthcare_id
        FROM cardiology_patients cp
        INNER JOIN healthcare_patients hp ON cp.healthcare_patient_id = hp.id
        WHERE cp.company_id = ${organizationId} AND hp.id = ${patientId}
        LIMIT 1
      `);

      const patientRow = patientResult.results?.[0] as any;
      if (!patientRow) {
        return c.json({ success: false, error: 'Patient not found' }, 404);
      }

      // Delete from cardiology_patients (keeps healthcare_patients record)
      await db.run(sql`
        DELETE FROM cardiology_patients WHERE id = ${patientRow.cardiology_id}
      `);

      return c.json({
        success: true,
        message: 'Patient removed from cardiology module',
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/consultations
 * List cardiology consultations
 */
cardiology.get(
  '/consultations',
  requirePermission('cardiology:consultations:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [
        eq(healthcareConsultations.companyId, organizationId),
        eq(healthcareConsultations.module, 'cardiology'),
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
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/consultations/:id
 * Get a single consultation
 */
cardiology.get(
  '/consultations/:id',
  requirePermission('cardiology:consultations:read'),
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
          eq(healthcareConsultations.module, 'cardiology')
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
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/consultations
 * Create a new consultation
 */
cardiology.post(
  '/consultations',
  requirePermission('cardiology:consultations:write'),
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
      const consultationNumber = `CARDIO-C-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(healthcareConsultations).values({
        id: consultationId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationNumber,
        consultationDate: new Date(data.consultationDate),
        module: 'cardiology',
        consultationType: data.consultationType,
        providerId: data.providerId,
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        systolicBp: data.systolicBp,
        diastolicBp: data.diastolicBp,
        heartRate: data.heartRate,
        respiratoryRate: data.respiratoryRate,
        temperature: data.temperature,
        oxygenSaturation: data.oxygenSaturation,
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
      logger.error('Route error', error, { route: 'cardiology' });
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
// ECG ROUTES
// ============================================================================

/**
 * GET /cardiology/ecg
 * List ECG records
 */
cardiology.get(
  '/ecg',
  requirePermission('cardiology:ecg:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Get ECG records with parameterized SQL
      const ecgsResult = await db.run(sql`
        SELECT
          e.id, e.patient_id, e.company_id, e.recording_date,
          e.heart_rate, e.pr_interval, e.qrs_duration, e.qt_interval, e.qtc_interval,
          e.rhythm, e.axis, e.interpretation, e.performed_by as technician,
          e.interpreted_by as reviewing_doctor, e.ecg_image_url as file_path, e.status, e.created_at, e.updated_at,
          hp.first_name as patient_first_name, hp.last_name as patient_last_name
        FROM cardiology_ecg_records e
        LEFT JOIN healthcare_patients hp ON e.patient_id = hp.id
        WHERE e.company_id = ${organizationId}
        ${query.patientId ? sql`AND e.patient_id = ${query.patientId}` : sql``}
        ${query.status ? sql`AND e.status = ${query.status}` : sql``}
        ORDER BY e.recording_date DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_ecg_records e
        WHERE e.company_id = ${organizationId}
        ${query.patientId ? sql`AND e.patient_id = ${query.patientId}` : sql``}
        ${query.status ? sql`AND e.status = ${query.status}` : sql``}
      `);

      const ecgs = (ecgsResult.results || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        patientName: row.patient_first_name && row.patient_last_name
          ? `${row.patient_first_name} ${row.patient_last_name}`
          : null,
        recordingDate: row.recording_date,
        recordingTime: row.recording_time,
        heartRate: row.heart_rate,
        prInterval: row.pr_interval,
        qrsDuration: row.qrs_duration,
        qtInterval: row.qt_interval,
        qtcInterval: row.qtc_interval,
        rhythm: row.rhythm,
        axis: row.axis,
        interpretation: row.interpretation,
        findings: row.findings,
        technician: row.technician,
        reviewingDoctor: row.reviewing_doctor,
        filePath: row.file_path,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return c.json({
        success: true,
        data: ecgs,
        meta: {
          total: (totalResult.results?.[0] as any)?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/ecg/:id
 * Get a single ECG record
 */
cardiology.get(
  '/ecg/:id',
  requirePermission('cardiology:ecg:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const ecgId = c.req.param('id');

      const [ecg] = await db
        .select()
        .from(cardiologyEcgRecords)
        .where(and(
          eq(cardiologyEcgRecords.id, ecgId),
          eq(cardiologyEcgRecords.companyId, organizationId)
        ))
        .limit(1);

      if (!ecg) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'ECG record not found' }
        }, 404);
      }

      return c.json({ success: true, data: ecg });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/ecg
 * Create a new ECG record
 */
cardiology.post(
  '/ecg',
  requirePermission('cardiology:ecg:write'),
  zValidator('json', createEcgSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const ecgId = crypto.randomUUID();
      const now = new Date();

      // Generate ECG number
      const [countResult] = await db
        .select({ count: count() })
        .from(cardiologyEcgRecords)
        .where(eq(cardiologyEcgRecords.companyId, organizationId));
      const ecgNumber = `ECG-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(cardiologyEcgRecords).values({
        id: ecgId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        ecgNumber,
        recordingDate: new Date(data.recordingDate),
        ecgType: data.ecgType,
        paperSpeed: data.paperSpeed,
        gain: data.gain,
        heartRate: data.heartRate,
        prInterval: data.prInterval,
        qrsDuration: data.qrsDuration,
        qtInterval: data.qtInterval,
        qtcInterval: data.qtcInterval,
        axis: data.axis,
        rhythm: data.rhythm,
        interpretation: data.interpretation,
        ecgImageUrl: data.ecgImageUrl,
        performedBy: data.performedById,
        status: 'pending',
        urgency: 'routine',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [ecg] = await db
        .select()
        .from(cardiologyEcgRecords)
        .where(eq(cardiologyEcgRecords.id, ecgId))
        .limit(1);

      return c.json({
        success: true,
        data: ecg,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// ECHOCARDIOGRAM ROUTES
// ============================================================================

/**
 * GET /cardiology/echo
 * List echocardiograms
 */
cardiology.get(
  '/echo',
  requirePermission('cardiology:echo:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(cardiologyEchocardiograms.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(cardiologyEchocardiograms.patientId, query.patientId));
      }

      const echos = await db
        .select()
        .from(cardiologyEchocardiograms)
        .where(and(...conditions))
        .orderBy(desc(cardiologyEchocardiograms.studyDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(cardiologyEchocardiograms)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: echos,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/echo/:id
 * Get a single echocardiogram
 */
cardiology.get(
  '/echo/:id',
  requirePermission('cardiology:echo:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const echoId = c.req.param('id');

      const [echo] = await db
        .select()
        .from(cardiologyEchocardiograms)
        .where(and(
          eq(cardiologyEchocardiograms.id, echoId),
          eq(cardiologyEchocardiograms.companyId, organizationId)
        ))
        .limit(1);

      if (!echo) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Echocardiogram not found' }
        }, 404);
      }

      return c.json({ success: true, data: echo });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/echo
 * Create a new echocardiogram
 */
cardiology.post(
  '/echo',
  requirePermission('cardiology:echo:write'),
  zValidator('json', createEchoSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const echoId = crypto.randomUUID();
      const now = new Date();

      // Generate echo number
      const [countResult] = await db
        .select({ count: count() })
        .from(cardiologyEchocardiograms)
        .where(eq(cardiologyEchocardiograms.companyId, organizationId));
      const echoNumber = `ECHO-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(cardiologyEchocardiograms).values({
        id: echoId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        echoNumber,
        studyDate: new Date(data.studyDate),
        echoType: data.echoType,
        indication: data.indication,
        lvEf: data.lvEf,
        lvEfMethod: data.lvEfMethod,
        lvedd: data.lvedd,
        lvesd: data.lvesd,
        laVolume: data.laVolume,
        mitralRegurgitation: data.mitralRegurgitation,
        aorticRegurgitation: data.aorticRegurgitation,
        tricuspidRegurgitation: data.tricuspidRegurgitation,
        rvsp: data.rvsp,
        diastolicFunction: data.diastolicFunction,
        pericardialEffusion: data.pericardialEffusion,
        interpretation: data.interpretation,
        conclusion: data.conclusion,
        recommendations: data.recommendations,
        imageUrls: data.imageUrls ? JSON.stringify(data.imageUrls) : undefined,
        sonographer: data.performedById,
        status: 'pending',
        urgency: 'routine',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [echo] = await db
        .select()
        .from(cardiologyEchocardiograms)
        .where(eq(cardiologyEchocardiograms.id, echoId))
        .limit(1);

      return c.json({
        success: true,
        data: echo,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// PACEMAKER ROUTES
// ============================================================================

/**
 * GET /cardiology/pacemakers
 * List pacemakers
 */
cardiology.get(
  '/pacemakers',
  requirePermission('cardiology:pacemakers:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(cardiologyPacemakers.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(cardiologyPacemakers.patientId, query.patientId));
      }

      if (query.status) {
        conditions.push(eq(cardiologyPacemakers.status, query.status as 'active' | 'replaced' | 'explanted' | 'end_of_life'));
      }

      const pacemakers = await db
        .select()
        .from(cardiologyPacemakers)
        .where(and(...conditions))
        .orderBy(desc(cardiologyPacemakers.implantDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(cardiologyPacemakers)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: pacemakers,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/pacemakers/:id
 * Get a single pacemaker
 */
cardiology.get(
  '/pacemakers/:id',
  requirePermission('cardiology:pacemakers:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const pacemakerId = c.req.param('id');

      const [pacemaker] = await db
        .select()
        .from(cardiologyPacemakers)
        .where(and(
          eq(cardiologyPacemakers.id, pacemakerId),
          eq(cardiologyPacemakers.companyId, organizationId)
        ))
        .limit(1);

      if (!pacemaker) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Pacemaker not found' }
        }, 404);
      }

      return c.json({ success: true, data: pacemaker });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/pacemakers
 * Create a new pacemaker record
 */
cardiology.post(
  '/pacemakers',
  requirePermission('cardiology:pacemakers:write'),
  zValidator('json', createPacemakerSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const pacemakerId = crypto.randomUUID();
      const now = new Date();

      // Generate device number
      const [countResult] = await db
        .select({ count: count() })
        .from(cardiologyPacemakers)
        .where(eq(cardiologyPacemakers.companyId, organizationId));
      const deviceNumber = `PM-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(cardiologyPacemakers).values({
        id: pacemakerId,
        companyId: organizationId,
        patientId: data.patientId,
        deviceNumber,
        deviceType: data.deviceType,
        indication: data.indication,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        implantDate: new Date(data.implantDate),
        implantedBy: data.implantedById,
        implantCenter: data.implantCenter,
        mode: data.mode,
        lowerRate: data.lowerRate,
        upperRate: data.upperRate,
        batteryStatus: data.batteryStatus || 'ok',
        remoteMonitoringEnabled: data.remoteMonitoringEnabled,
        mriConditional: data.mriConditional,
        status: 'active',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [pacemaker] = await db
        .select()
        .from(cardiologyPacemakers)
        .where(eq(cardiologyPacemakers.id, pacemakerId))
        .limit(1);

      return c.json({
        success: true,
        data: pacemaker,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// STENT ROUTES
// ============================================================================

/**
 * GET /cardiology/stents
 * List stents
 */
cardiology.get(
  '/stents',
  requirePermission('cardiology:stents:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Get stents with parameterized SQL (migration uses implant_date, not procedure_date)
      const stentsResult = await db.run(sql`
        SELECT
          s.id, s.patient_id, s.company_id, s.implant_date, s.implanting_doctor,
          s.implanting_hospital, s.stent_type, s.manufacturer, s.model,
          s.diameter, s.length, s.location, s.lesion_type,
          s.pre_stenosis, s.post_stenosis, s.timi_flow_pre, s.timi_flow_post,
          s.dual_antiplatelet_end_date, s.notes, s.created_at, s.updated_at,
          hp.first_name as patient_first_name, hp.last_name as patient_last_name
        FROM cardiology_stents s
        LEFT JOIN healthcare_patients hp ON s.patient_id = hp.id
        WHERE s.company_id = ${organizationId}
        ${query.patientId ? sql`AND s.patient_id = ${query.patientId}` : sql``}
        ORDER BY s.implant_date DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_stents s
        WHERE s.company_id = ${organizationId}
        ${query.patientId ? sql`AND s.patient_id = ${query.patientId}` : sql``}
      `);

      const stents = (stentsResult.results || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        patientName: row.patient_first_name && row.patient_last_name
          ? `${row.patient_first_name} ${row.patient_last_name}`
          : null,
        implantDate: row.implant_date,
        implantingDoctor: row.implanting_doctor,
        implantingHospital: row.implanting_hospital,
        stentType: row.stent_type,
        manufacturer: row.manufacturer,
        model: row.model,
        diameter: row.diameter,
        length: row.length,
        location: row.location,
        lesionType: row.lesion_type,
        preStenosis: row.pre_stenosis,
        postStenosis: row.post_stenosis,
        timiFlowPre: row.timi_flow_pre,
        timiFlowPost: row.timi_flow_post,
        dualAntiplateletEndDate: row.dual_antiplatelet_end_date,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return c.json({
        success: true,
        data: stents,
        meta: {
          total: (totalResult.results?.[0] as any)?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/stents/:id
 * Get a single stent
 */
cardiology.get(
  '/stents/:id',
  requirePermission('cardiology:stents:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const stentId = c.req.param('id');

      const [stent] = await db
        .select()
        .from(cardiologyStents)
        .where(and(
          eq(cardiologyStents.id, stentId),
          eq(cardiologyStents.companyId, organizationId)
        ))
        .limit(1);

      if (!stent) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Stent not found' }
        }, 404);
      }

      return c.json({ success: true, data: stent });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/stents
 * Create a new stent record
 */
cardiology.post(
  '/stents',
  requirePermission('cardiology:stents:write'),
  zValidator('json', createStentSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const stentId = crypto.randomUUID();
      const now = new Date();

      // Generate stent number
      const [countResult] = await db
        .select({ count: count() })
        .from(cardiologyStents)
        .where(eq(cardiologyStents.companyId, organizationId));
      const stentNumber = `STENT-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(cardiologyStents).values({
        id: stentId,
        companyId: organizationId,
        patientId: data.patientId,
        stentNumber,
        procedureDate: new Date(data.procedureDate),
        procedureType: data.procedureType,
        indication: data.indication,
        clinicalPresentation: data.clinicalPresentation,
        vesselName: data.vesselName,
        vesselSegment: data.vesselSegment,
        stentType: data.stentType,
        stentManufacturer: data.stentManufacturer,
        stentModel: data.stentModel,
        stentDiameter: data.stentDiameter,
        stentLength: data.stentLength,
        procedureSuccess: data.procedureSuccess ?? true,
        operator: data.operatorId,
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [stent] = await db
        .select()
        .from(cardiologyStents)
        .where(eq(cardiologyStents.id, stentId))
        .limit(1);

      return c.json({
        success: true,
        data: stent,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// RISK SCORES ROUTES
// ============================================================================

/**
 * GET /cardiology/risk-scores
 * List risk scores
 */
cardiology.get(
  '/risk-scores',
  requirePermission('cardiology:risk-scores:read'),
  zValidator('query', listQuerySchema.extend({
    patientId: z.string().optional(),
    scoreType: z.string().optional(),
  })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(cardiologyRiskScores.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(cardiologyRiskScores.patientId, query.patientId));
      }

      if (query.scoreType) {
        conditions.push(eq(cardiologyRiskScores.scoreType, query.scoreType as any));
      }

      const scores = await db
        .select()
        .from(cardiologyRiskScores)
        .where(and(...conditions))
        .orderBy(desc(cardiologyRiskScores.calculationDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(cardiologyRiskScores)
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
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/risk-scores/:id
 * Get a single risk score
 */
cardiology.get(
  '/risk-scores/:id',
  requirePermission('cardiology:risk-scores:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const scoreId = c.req.param('id');

      const [score] = await db
        .select()
        .from(cardiologyRiskScores)
        .where(and(
          eq(cardiologyRiskScores.id, scoreId),
          eq(cardiologyRiskScores.companyId, organizationId)
        ))
        .limit(1);

      if (!score) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Risk score not found' }
        }, 404);
      }

      return c.json({ success: true, data: score });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/risk-scores
 * Calculate and save a risk score
 */
cardiology.post(
  '/risk-scores',
  requirePermission('cardiology:risk-scores:write'),
  zValidator('json', createRiskScoreSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const scoreId = crypto.randomUUID();
      const now = new Date();

      await db.insert(cardiologyRiskScores).values({
        id: scoreId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        scoreType: data.scoreType,
        calculationDate: now,
        inputParameters: JSON.stringify(data.inputParameters),
        scoreValue: data.scoreValue,
        riskCategory: data.riskCategory,
        riskPercentage: data.riskPercentage,
        interpretation: data.interpretation,
        recommendations: data.recommendations,
        calculatedBy: userId,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      });

      const [score] = await db
        .select()
        .from(cardiologyRiskScores)
        .where(eq(cardiologyRiskScores.id, scoreId))
        .limit(1);

      return c.json({
        success: true,
        data: score,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// MEDICATIONS ROUTES
// ============================================================================

/**
 * GET /cardiology/medications
 * List medications
 */
cardiology.get(
  '/medications',
  requirePermission('cardiology:medications:read'),
  zValidator('query', listQuerySchema.extend({
    patientId: z.string().optional(),
    status: z.enum(['active', 'discontinued', 'on_hold', 'completed']).optional(),
  })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(cardiologyMedications.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(cardiologyMedications.patientId, query.patientId));
      }

      if (query.status) {
        conditions.push(eq(cardiologyMedications.status, query.status));
      }

      const medications = await db
        .select()
        .from(cardiologyMedications)
        .where(and(...conditions))
        .orderBy(desc(cardiologyMedications.startDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(cardiologyMedications)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: medications,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/medications/:id
 * Get a single medication
 */
cardiology.get(
  '/medications/:id',
  requirePermission('cardiology:medications:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const medId = c.req.param('id');

      const [medication] = await db
        .select()
        .from(cardiologyMedications)
        .where(and(
          eq(cardiologyMedications.id, medId),
          eq(cardiologyMedications.companyId, organizationId)
        ))
        .limit(1);

      if (!medication) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Medication not found' }
        }, 404);
      }

      return c.json({ success: true, data: medication });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/medications
 * Create a new medication
 */
cardiology.post(
  '/medications',
  requirePermission('cardiology:medications:write'),
  zValidator('json', createMedicationSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const medicationId = crypto.randomUUID();
      const now = new Date();

      await db.insert(cardiologyMedications).values({
        id: medicationId,
        companyId: organizationId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        medicationName: data.medicationName,
        genericName: data.genericName,
        medicationClass: data.medicationClass,
        dose: data.dose,
        frequency: data.frequency,
        route: data.route || 'oral',
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isOngoing: !data.endDate,
        indication: data.indication,
        prescribedBy: data.prescribedById,
        status: 'active',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [medication] = await db
        .select()
        .from(cardiologyMedications)
        .where(eq(cardiologyMedications.id, medicationId))
        .limit(1);

      return c.json({
        success: true,
        data: medication,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// EVENTS ROUTES
// ============================================================================

/**
 * GET /cardiology/events
 * List cardiac events
 */
cardiology.get(
  '/events',
  requirePermission('cardiology:events:read'),
  zValidator('query', listQuerySchema.extend({
    patientId: z.string().optional(),
    eventType: z.string().optional(),
    severity: z.string().optional(),
  })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(cardiologyCardiacEvents.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(cardiologyCardiacEvents.patientId, query.patientId));
      }

      if (query.eventType) {
        conditions.push(eq(cardiologyCardiacEvents.eventType, query.eventType as any));
      }

      if (query.severity) {
        conditions.push(eq(cardiologyCardiacEvents.severity, query.severity as any));
      }

      const events = await db
        .select()
        .from(cardiologyCardiacEvents)
        .where(and(...conditions))
        .orderBy(desc(cardiologyCardiacEvents.eventDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(cardiologyCardiacEvents)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: events,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/events/:id
 * Get a single event
 */
cardiology.get(
  '/events/:id',
  requirePermission('cardiology:events:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const eventId = c.req.param('id');

      const [event] = await db
        .select()
        .from(cardiologyCardiacEvents)
        .where(and(
          eq(cardiologyCardiacEvents.id, eventId),
          eq(cardiologyCardiacEvents.companyId, organizationId)
        ))
        .limit(1);

      if (!event) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' }
        }, 404);
      }

      return c.json({ success: true, data: event });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// REPORTS ROUTES
// ============================================================================

/**
 * GET /cardiology/reports
 * List cardiology reports
 */
cardiology.get(
  '/reports',
  requirePermission('cardiology:read'),
  zValidator('query', listQuerySchema.extend({
    patientId: z.string().optional(),
    reportType: z.string().optional(),
  })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Get reports from healthcare_examinations table with parameterized SQL
      const reportsResult = await db.run(sql`
        SELECT
          e.id, e.patient_id, e.company_id, e.module, e.examination_type as report_type,
          e.examination_date as report_date, e.findings, e.recommendations,
          e.performed_by, e.status, e.notes, e.created_at, e.updated_at,
          hp.first_name as patient_first_name, hp.last_name as patient_last_name
        FROM healthcare_examinations e
        LEFT JOIN healthcare_patients hp ON e.patient_id = hp.id
        WHERE e.company_id = ${organizationId} AND e.module = 'cardiology'
        ${query.patientId ? sql`AND e.patient_id = ${query.patientId}` : sql``}
        ${query.reportType ? sql`AND e.examination_type = ${query.reportType}` : sql``}
        ORDER BY e.examination_date DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `);

      // Get total count
      const totalResult = await db.run(sql`
        SELECT COUNT(*) as count FROM healthcare_examinations e
        WHERE e.company_id = ${organizationId} AND e.module = 'cardiology'
        ${query.patientId ? sql`AND e.patient_id = ${query.patientId}` : sql``}
        ${query.reportType ? sql`AND e.examination_type = ${query.reportType}` : sql``}
      `);

      const reports = (reportsResult.results || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        patientName: row.patient_first_name && row.patient_last_name
          ? `${row.patient_first_name} ${row.patient_last_name}`
          : null,
        reportType: row.report_type,
        reportDate: row.report_date,
        findings: row.findings,
        recommendations: row.recommendations,
        performedBy: row.performed_by,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return c.json({
        success: true,
        data: reports,
        meta: {
          total: (totalResult.results?.[0] as any)?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/reports/stats
 * Get cardiology statistics for reports
 */
cardiology.get(
  '/reports/stats',
  requirePermission('cardiology:read'),
  zValidator('query', z.object({
    range: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (query.range) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get total patients
      const totalPatientsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_patients WHERE company_id = ${organizationId}
      `);
      const totalPatients = (totalPatientsResult.results?.[0] as any)?.count ?? 0;

      // Get new patients in range
      const newPatientsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_patients
        WHERE company_id = ${organizationId}
        AND created_at >= ${startDate.getTime()}
      `);
      const newPatients = (newPatientsResult.results?.[0] as any)?.count ?? 0;

      // Get ECG count in range
      const ecgResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_ecg_records
        WHERE company_id = ${organizationId}
        AND recording_date >= ${startDate.getTime()}
      `);
      const ecgCount = (ecgResult.results?.[0] as any)?.count ?? 0;

      // Get Echo count in range
      const echoResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_echocardiograms
        WHERE company_id = ${organizationId}
        AND study_date >= ${startDate.getTime()}
      `);
      const echoCount = (echoResult.results?.[0] as any)?.count ?? 0;

      // Get active pacemakers
      const pacemakerResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_pacemakers
        WHERE company_id = ${organizationId} AND status = 'active'
      `);
      const pacemakerCount = (pacemakerResult.results?.[0] as any)?.count ?? 0;

      // Get stent count
      const stentResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_stents
        WHERE company_id = ${organizationId}
      `);
      const stentCount = (stentResult.results?.[0] as any)?.count ?? 0;

      // Get critical events in range
      const criticalEventsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM cardiology_cardiac_events
        WHERE company_id = ${organizationId}
        AND severity IN ('severe', 'fatal')
        AND event_date >= ${startDate.getTime()}
      `);
      const criticalEvents = (criticalEventsResult.results?.[0] as any)?.count ?? 0;

      // Calculate average appointments per day (using healthcare_appointments if available)
      const daysInRange = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const appointmentsResult = await db.run(sql`
        SELECT COUNT(*) as count FROM healthcare_appointments
        WHERE company_id = ${organizationId}
        AND module = 'cardiology'
        AND scheduled_date >= ${startDate.getTime()}
      `);
      const totalAppointments = (appointmentsResult.results?.[0] as any)?.count ?? 0;
      const avgAppointmentsPerDay = daysInRange > 0 ? Math.round(totalAppointments / daysInRange * 10) / 10 : 0;

      return c.json({
        success: true,
        data: {
          totalPatients,
          newPatients,
          ecgCount,
          echoCount,
          pacemakerCount,
          stentCount,
          avgAppointmentsPerDay,
          criticalEvents,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/alerts
 * List cardiology alerts
 */
cardiology.get(
  '/alerts',
  requirePermission('cardiology:alerts:read'),
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
        eq(healthcareAlerts.module, 'cardiology'),
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
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/appointments
 * List cardiology appointments
 */
cardiology.get(
  '/appointments',
  requirePermission('cardiology:appointments:read'),
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
        eq(healthcareAppointments.module, 'cardiology'),
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
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/appointments/:id
 * Get a single appointment
 */
cardiology.get(
  '/appointments/:id',
  requirePermission('cardiology:appointments:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const appointmentId = c.req.param('id');

      const [appointment] = await db
        .select()
        .from(healthcareAppointments)
        .where(and(
          eq(healthcareAppointments.id, appointmentId),
          eq(healthcareAppointments.companyId, organizationId),
          eq(healthcareAppointments.module, 'cardiology')
        ))
        .limit(1);

      if (!appointment) {
        return c.json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Appointment not found' }
        }, 404);
      }

      return c.json({ success: true, data: appointment });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
// HOLTER RECORDS
// ============================================================================

/**
 * GET /cardiology/holter
 * List Holter records
 */
cardiology.get(
  '/holter',
  requirePermission('cardiology:holter:read'),
  zValidator('query', listQuerySchema.extend({ patientId: z.string().optional() })),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const query = c.req.valid('query');

      const conditions = [eq(cardiologyHolterRecords.companyId, organizationId)];

      if (query.patientId) {
        conditions.push(eq(cardiologyHolterRecords.patientId, query.patientId));
      }

      if (query.status) {
        conditions.push(eq(cardiologyHolterRecords.status, query.status as any));
      }

      const holters = await db
        .select()
        .from(cardiologyHolterRecords)
        .where(and(...conditions))
        .orderBy(desc(cardiologyHolterRecords.startDate))
        .limit(query.limit)
        .offset(query.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(cardiologyHolterRecords)
        .where(and(...conditions));

      return c.json({
        success: true,
        data: holters,
        meta: {
          total: totalResult?.count || 0,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * GET /cardiology/holter/:id
 * Get Holter record by ID
 */
cardiology.get(
  '/holter/:id',
  requirePermission('cardiology:holter:read'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const holterId = c.req.param('id');

      const [holter] = await db
        .select()
        .from(cardiologyHolterRecords)
        .where(
          and(
            eq(cardiologyHolterRecords.id, holterId),
            eq(cardiologyHolterRecords.companyId, organizationId)
          )
        )
        .limit(1);

      if (!holter) {
        return c.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Holter record not found'
          }
        }, 404);
      }

      return c.json({
        success: true,
        data: holter,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * POST /cardiology/holter
 * Create a new Holter record
 */
cardiology.post(
  '/holter',
  requirePermission('cardiology:holter:write'),
  zValidator('json', createHolterSchema),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const userId = c.get('userId');
      const data = c.req.valid('json');

      const holterId = crypto.randomUUID();
      const now = new Date();

      // Generate holter number
      const [countResult] = await db
        .select({ count: count() })
        .from(cardiologyHolterRecords)
        .where(eq(cardiologyHolterRecords.companyId, organizationId));
      const holterNumber = `HOLTER-${String((countResult?.count || 0) + 1).padStart(6, '0')}`;

      await db.insert(cardiologyHolterRecords).values({
        id: holterId,
        companyId: organizationId,
        patientId: data.patientId,
        holterNumber,
        indication: data.indication,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        durationHours: data.durationHours,
        monitorType: data.monitorType,
        deviceModel: data.deviceModel,
        minHeartRate: data.minHeartRate,
        maxHeartRate: data.maxHeartRate,
        avgHeartRate: data.avgHeartRate,
        totalQrsComplexes: data.totalQrsComplexes,
        svePrematureBeats: data.svePrematureBeats,
        pvePrematureBeats: data.pvePrematureBeats,
        afibEpisodes: data.afibEpisodes,
        afibBurden: data.afibBurden,
        vtEpisodes: data.vtEpisodes,
        pausesOver2s: data.pausesOver2s,
        pausesOver3s: data.pausesOver3s,
        longestPause: data.longestPause,
        interpretation: data.interpretation,
        conclusion: data.conclusion,
        recommendations: data.recommendations,
        analyzedBy: data.analyzedById,
        interpretedBy: data.interpretedById,
        reportUrl: data.reportUrl,
        status: 'recording',
        urgency: 'routine',
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const [holter] = await db
        .select()
        .from(cardiologyHolterRecords)
        .where(eq(cardiologyHolterRecords.id, holterId))
        .limit(1);

      return c.json({
        success: true,
        data: holter,
      }, 201);
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * PUT /cardiology/holter/:id
 * Update a Holter record
 */
cardiology.put(
  '/holter/:id',
  requirePermission('cardiology:holter:write'),
  zValidator('json', createHolterSchema.partial()),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const holterId = c.req.param('id');
      const data = c.req.valid('json');

      // Check if holter exists
      const [existing] = await db
        .select()
        .from(cardiologyHolterRecords)
        .where(
          and(
            eq(cardiologyHolterRecords.id, holterId),
            eq(cardiologyHolterRecords.companyId, organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Holter record not found'
          }
        }, 404);
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.indication !== undefined) updateData.indication = data.indication;
      if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
      if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
      if (data.durationHours !== undefined) updateData.durationHours = data.durationHours;
      if (data.monitorType !== undefined) updateData.monitorType = data.monitorType;
      if (data.deviceModel !== undefined) updateData.deviceModel = data.deviceModel;
      if (data.minHeartRate !== undefined) updateData.minHeartRate = data.minHeartRate;
      if (data.maxHeartRate !== undefined) updateData.maxHeartRate = data.maxHeartRate;
      if (data.avgHeartRate !== undefined) updateData.avgHeartRate = data.avgHeartRate;
      if (data.totalQrsComplexes !== undefined) updateData.totalQrsComplexes = data.totalQrsComplexes;
      if (data.svePrematureBeats !== undefined) updateData.svePrematureBeats = data.svePrematureBeats;
      if (data.pvePrematureBeats !== undefined) updateData.pvePrematureBeats = data.pvePrematureBeats;
      if (data.afibEpisodes !== undefined) updateData.afibEpisodes = data.afibEpisodes;
      if (data.afibBurden !== undefined) updateData.afibBurden = data.afibBurden;
      if (data.vtEpisodes !== undefined) updateData.vtEpisodes = data.vtEpisodes;
      if (data.pausesOver2s !== undefined) updateData.pausesOver2s = data.pausesOver2s;
      if (data.pausesOver3s !== undefined) updateData.pausesOver3s = data.pausesOver3s;
      if (data.longestPause !== undefined) updateData.longestPause = data.longestPause;
      if (data.interpretation !== undefined) updateData.interpretation = data.interpretation;
      if (data.conclusion !== undefined) updateData.conclusion = data.conclusion;
      if (data.recommendations !== undefined) updateData.recommendations = data.recommendations;
      if (data.analyzedById !== undefined) updateData.analyzedBy = data.analyzedById;
      if (data.interpretedById !== undefined) updateData.interpretedBy = data.interpretedById;
      if (data.reportUrl !== undefined) updateData.reportUrl = data.reportUrl;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await db
        .update(cardiologyHolterRecords)
        .set(updateData)
        .where(eq(cardiologyHolterRecords.id, holterId));

      const [updated] = await db
        .select()
        .from(cardiologyHolterRecords)
        .where(eq(cardiologyHolterRecords.id, holterId))
        .limit(1);

      return c.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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
 * DELETE /cardiology/holter/:id
 * Delete a Holter record
 */
cardiology.delete(
  '/holter/:id',
  requirePermission('cardiology:holter:delete'),
  async (c) => {
    try {
      const db = getDb();
      const organizationId = c.get('organizationId')!;
      const holterId = c.req.param('id');

      // Check if holter exists
      const [existing] = await db
        .select()
        .from(cardiologyHolterRecords)
        .where(
          and(
            eq(cardiologyHolterRecords.id, holterId),
            eq(cardiologyHolterRecords.companyId, organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Holter record not found'
          }
        }, 404);
      }

      await db
        .delete(cardiologyHolterRecords)
        .where(eq(cardiologyHolterRecords.id, holterId));

      return c.json({
        success: true,
        message: 'Holter record deleted successfully',
      });
    } catch (error) {
      logger.error('Route error', error, { route: 'cardiology' });
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

export default cardiology;
