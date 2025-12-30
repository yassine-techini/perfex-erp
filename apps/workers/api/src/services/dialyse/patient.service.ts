/**
 * Dialyse Patient Service
 * Manage dialysis patients (extends CRM contacts)
 */

import { eq, and, desc, like, or, sql } from 'drizzle-orm';
import { drizzleDb } from '../../db';
import {
  dialysePatients,
  vascularAccesses,
  dialysePrescriptions,
  labResults,
  clinicalAlerts,
  contacts,
} from '@perfex/database';
import type {
  DialysePatient,
  DialysePatientWithContact,
  DialysePatientFull,
  VascularAccess,
  CreatePatientInput,
  UpdatePatientInput,
  UpdateSerologyInput,
  ListPatientsQuery,
} from '@perfex/shared';

export class PatientService {
  /**
   * Create a new dialyse patient (with CRM contact)
   */
  async create(organizationId: string, userId: string, data: CreatePatientInput): Promise<DialysePatientWithContact> {
    const now = new Date();
    const contactId = crypto.randomUUID();
    const patientId = crypto.randomUUID();

    // Create CRM contact first
    await drizzleDb.insert(contacts).values({
      id: contactId,
      organizationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      mobile: data.mobile || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      status: 'active',
      isPrimary: false,
      tags: JSON.stringify(['dialyse', 'patient']),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Determine if isolation is required based on serology
    const requiresIsolation = data.requiresIsolation ||
      data.hivStatus === 'positive' ||
      data.hbvStatus === 'positive' ||
      data.hcvStatus === 'positive';

    // Create dialyse patient extension
    await drizzleDb.insert(dialysePatients).values({
      id: patientId,
      organizationId,
      contactId,
      medicalId: data.medicalId,
      photo: data.photo || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      emergencyContactRelation: data.emergencyContactRelation || null,
      bloodType: data.bloodType || null,
      dryWeight: data.dryWeight || null,
      renalFailureEtiology: data.renalFailureEtiology || null,
      medicalHistory: data.medicalHistory ? JSON.stringify(data.medicalHistory) : null,
      allergies: data.allergies ? JSON.stringify(data.allergies) : null,
      contraindications: data.contraindications ? JSON.stringify(data.contraindications) : null,
      hivStatus: data.hivStatus || 'unknown',
      hbvStatus: data.hbvStatus || 'unknown',
      hcvStatus: data.hcvStatus || 'unknown',
      serologyLastUpdate: data.serologyLastUpdate ? new Date(data.serologyLastUpdate) : now,
      requiresIsolation,
      hepatitisBVaccinated: data.hepatitisBVaccinated || false,
      hepatitisBLastDose: data.hepatitisBLastDose ? new Date(data.hepatitisBLastDose) : null,
      patientStatus: data.patientStatus || 'active',
      dialysisStartDate: data.dialysisStartDate ? new Date(data.dialysisStartDate) : null,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const patient = await this.getByIdWithContact(organizationId, patientId);
    if (!patient) {
      throw new Error('Failed to create patient');
    }

    return patient;
  }

  /**
   * Get patient by ID
   */
  async getById(organizationId: string, patientId: string): Promise<DialysePatient | null> {
    const patient = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(and(eq(dialysePatients.id, patientId), eq(dialysePatients.organizationId, organizationId)))
      .get() as any;

    return patient || null;
  }

  /**
   * Get patient with contact details
   */
  async getByIdWithContact(organizationId: string, patientId: string): Promise<DialysePatientWithContact | null> {
    const patient = await this.getById(organizationId, patientId);
    if (!patient) {
      return null;
    }

    const contact = await drizzleDb
      .select()
      .from(contacts)
      .where(eq(contacts.id, patient.contactId))
      .get() as any;

    if (!contact) {
      return null;
    }

    return {
      ...patient,
      contact,
    } as DialysePatientWithContact;
  }

  /**
   * Get patient with full details (contact, prescriptions, accesses, labs, alerts)
   */
  async getByIdFull(organizationId: string, patientId: string): Promise<DialysePatientFull | null> {
    const patientWithContact = await this.getByIdWithContact(organizationId, patientId);
    if (!patientWithContact) {
      return null;
    }

    // Get active prescription
    const activePrescription = await drizzleDb
      .select()
      .from(dialysePrescriptions)
      .where(
        and(
          eq(dialysePrescriptions.patientId, patientId),
          eq(dialysePrescriptions.organizationId, organizationId),
          eq(dialysePrescriptions.status, 'active')
        )
      )
      .get() as any;

    // Get all vascular accesses
    const vascularAccessesList = await drizzleDb
      .select()
      .from(vascularAccesses)
      .where(
        and(
          eq(vascularAccesses.patientId, patientId),
          eq(vascularAccesses.organizationId, organizationId)
        )
      )
      .orderBy(desc(vascularAccesses.createdAt))
      .all() as any[];

    // Get active vascular access
    const activeVascularAccess = vascularAccessesList.find((a) => a.status === 'active') || null;

    // Get most recent lab result
    const recentLabResult = await drizzleDb
      .select()
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, patientId),
          eq(labResults.organizationId, organizationId)
        )
      )
      .orderBy(desc(labResults.labDate))
      .limit(1)
      .get() as any;

    // Get active alerts
    const activeAlertsList = await drizzleDb
      .select()
      .from(clinicalAlerts)
      .where(
        and(
          eq(clinicalAlerts.patientId, patientId),
          eq(clinicalAlerts.organizationId, organizationId),
          eq(clinicalAlerts.status, 'active')
        )
      )
      .orderBy(desc(clinicalAlerts.createdAt))
      .all() as any[];

    return {
      ...patientWithContact,
      activePrescription: activePrescription || null,
      activeVascularAccess,
      vascularAccesses: vascularAccessesList as VascularAccess[],
      recentLabResult: recentLabResult || null,
      activeAlerts: activeAlertsList as any[],
    };
  }

  /**
   * List patients with filters
   */
  async list(organizationId: string, query: ListPatientsQuery): Promise<{ data: DialysePatientWithContact[]; total: number }> {
    const { status, requiresIsolation, search, limit = 25, offset = 0 } = query;

    // Build conditions array
    const conditions = [eq(dialysePatients.organizationId, organizationId)];

    if (status) {
      conditions.push(eq(dialysePatients.patientStatus, status));
    }

    if (requiresIsolation !== undefined) {
      conditions.push(eq(dialysePatients.requiresIsolation, requiresIsolation));
    }

    // Get patients
    let patientsQuery = drizzleDb
      .select()
      .from(dialysePatients)
      .where(and(...conditions))
      .orderBy(desc(dialysePatients.createdAt))
      .limit(limit)
      .offset(offset);

    const patients = await patientsQuery.all() as any[];

    // Get total count
    const countResult = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(dialysePatients)
      .where(and(...conditions))
      .get() as any;

    const total = countResult?.count || 0;

    // Get contact IDs and fetch contacts
    const contactIds = patients.map((p) => p.contactId);
    const contactsList = contactIds.length > 0
      ? await drizzleDb
          .select()
          .from(contacts)
          .where(eq(contacts.organizationId, organizationId))
          .all()
      : [];

    const contactsMap = new Map(contactsList.map((c) => [c.id, c]));

    // Filter by search if provided (search in contact name/email)
    let result = patients.map((patient) => ({
      ...patient,
      contact: contactsMap.get(patient.contactId)!,
    })) as DialysePatientWithContact[];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) => {
        const contact = p.contact;
        return (
          contact.firstName.toLowerCase().includes(searchLower) ||
          contact.lastName.toLowerCase().includes(searchLower) ||
          contact.email.toLowerCase().includes(searchLower) ||
          p.medicalId.toLowerCase().includes(searchLower)
        );
      });
    }

    return { data: result, total };
  }

  /**
   * Update patient
   */
  async update(organizationId: string, patientId: string, userId: string, data: UpdatePatientInput): Promise<DialysePatientWithContact> {
    const existing = await this.getByIdWithContact(organizationId, patientId);
    if (!existing) {
      throw new Error('Patient not found');
    }

    const now = new Date();

    // Update contact if contact fields are provided
    const contactFields: any = {};
    if (data.firstName !== undefined) contactFields.firstName = data.firstName;
    if (data.lastName !== undefined) contactFields.lastName = data.lastName;
    if (data.email !== undefined) contactFields.email = data.email;
    if (data.phone !== undefined) contactFields.phone = data.phone;
    if (data.mobile !== undefined) contactFields.mobile = data.mobile;
    if (data.address !== undefined) contactFields.address = data.address;
    if (data.city !== undefined) contactFields.city = data.city;
    if (data.postalCode !== undefined) contactFields.postalCode = data.postalCode;
    if (data.country !== undefined) contactFields.country = data.country;

    if (Object.keys(contactFields).length > 0) {
      contactFields.updatedAt = now;
      await drizzleDb
        .update(contacts)
        .set(contactFields)
        .where(eq(contacts.id, existing.contactId));
    }

    // Update patient fields
    const patientFields: any = { updatedAt: now };

    if (data.medicalId !== undefined) patientFields.medicalId = data.medicalId;
    if (data.photo !== undefined) patientFields.photo = data.photo;
    if (data.emergencyContactName !== undefined) patientFields.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined) patientFields.emergencyContactPhone = data.emergencyContactPhone;
    if (data.emergencyContactRelation !== undefined) patientFields.emergencyContactRelation = data.emergencyContactRelation;
    if (data.bloodType !== undefined) patientFields.bloodType = data.bloodType;
    if (data.dryWeight !== undefined) patientFields.dryWeight = data.dryWeight;
    if (data.renalFailureEtiology !== undefined) patientFields.renalFailureEtiology = data.renalFailureEtiology;
    if (data.medicalHistory !== undefined) patientFields.medicalHistory = JSON.stringify(data.medicalHistory);
    if (data.allergies !== undefined) patientFields.allergies = JSON.stringify(data.allergies);
    if (data.contraindications !== undefined) patientFields.contraindications = JSON.stringify(data.contraindications);
    if (data.hepatitisBVaccinated !== undefined) patientFields.hepatitisBVaccinated = data.hepatitisBVaccinated;
    if (data.hepatitisBLastDose !== undefined) patientFields.hepatitisBLastDose = new Date(data.hepatitisBLastDose);
    if (data.patientStatus !== undefined) patientFields.patientStatus = data.patientStatus;
    if (data.dialysisStartDate !== undefined) patientFields.dialysisStartDate = new Date(data.dialysisStartDate);
    if (data.notes !== undefined) patientFields.notes = data.notes;

    await drizzleDb
      .update(dialysePatients)
      .set(patientFields)
      .where(and(eq(dialysePatients.id, patientId), eq(dialysePatients.organizationId, organizationId)));

    const updated = await this.getByIdWithContact(organizationId, patientId);
    if (!updated) {
      throw new Error('Failed to update patient');
    }

    return updated;
  }

  /**
   * Update serology status
   */
  async updateSerology(organizationId: string, patientId: string, userId: string, data: UpdateSerologyInput): Promise<DialysePatientWithContact> {
    const existing = await this.getById(organizationId, patientId);
    if (!existing) {
      throw new Error('Patient not found');
    }

    const now = new Date();

    // Determine if isolation is required
    const requiresIsolation = data.requiresIsolation !== undefined
      ? data.requiresIsolation
      : (data.hivStatus === 'positive' || data.hbvStatus === 'positive' || data.hcvStatus === 'positive');

    await drizzleDb
      .update(dialysePatients)
      .set({
        hivStatus: data.hivStatus,
        hbvStatus: data.hbvStatus,
        hcvStatus: data.hcvStatus,
        serologyLastUpdate: now,
        requiresIsolation,
        updatedAt: now,
      })
      .where(and(eq(dialysePatients.id, patientId), eq(dialysePatients.organizationId, organizationId)));

    const updated = await this.getByIdWithContact(organizationId, patientId);
    if (!updated) {
      throw new Error('Failed to update serology');
    }

    return updated;
  }

  /**
   * Delete patient
   */
  async delete(organizationId: string, patientId: string): Promise<void> {
    const existing = await this.getById(organizationId, patientId);
    if (!existing) {
      throw new Error('Patient not found');
    }

    // Delete patient (cascade will handle related records)
    await drizzleDb
      .delete(dialysePatients)
      .where(and(eq(dialysePatients.id, patientId), eq(dialysePatients.organizationId, organizationId)));

    // Delete the associated contact
    await drizzleDb
      .delete(contacts)
      .where(eq(contacts.id, existing.contactId));
  }

  /**
   * Get patients requiring isolation
   */
  async getIsolationPatients(organizationId: string): Promise<DialysePatientWithContact[]> {
    const result = await this.list(organizationId, {
      requiresIsolation: true,
      status: 'active',
      limit: 100,
      offset: 0,
    });
    return result.data;
  }

  /**
   * Get dashboard stats
   */
  async getStats(organizationId: string): Promise<{
    totalPatients: number;
    activePatients: number;
    isolationPatients: number;
    byStatus: Record<string, number>;
  }> {
    const patients = await drizzleDb
      .select()
      .from(dialysePatients)
      .where(eq(dialysePatients.organizationId, organizationId))
      .all() as any[];

    const activePatients = patients.filter((p) => p.patientStatus === 'active').length;
    const isolationPatients = patients.filter((p) => p.requiresIsolation).length;

    const byStatus: Record<string, number> = {};
    patients.forEach((p) => {
      byStatus[p.patientStatus] = (byStatus[p.patientStatus] || 0) + 1;
    });

    return {
      totalPatients: patients.length,
      activePatients,
      isolationPatients,
      byStatus,
    };
  }
}

export const patientService = new PatientService();
