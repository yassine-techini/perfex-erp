/**
 * Dialyse Extended Services
 * Protocols, Staff, Billing, Transport, Consumables, Reports
 *
 * SECURITY: All queries use Drizzle ORM's parameterized queries to prevent SQL injection
 */

import { eq, and, gte, lte, count, sum, desc, asc, sql } from 'drizzle-orm';
import { drizzleDb } from '../../db';
import {
  dialysePatients,
  dialysisSessions,
  clinicalAlerts,
  contacts,
  dialyseProtocols,
  dialyseStaff,
  dialyseBilling,
  dialyseTransport,
  dialyseConsumables,
  dialyseConsumableMovements,
  type InsertDialyseProtocol,
  type InsertDialyseStaff,
  type InsertDialyseBilling,
  type InsertDialyseTransport,
  type InsertDialyseConsumable,
  type InsertDialyseConsumableMovement,
} from '@perfex/database';

// Type definitions for filters
interface PaginationFilters {
  limit?: number;
  offset?: number;
}

interface ProtocolFilters extends PaginationFilters {
  status?: string;
  type?: string;
}

interface StaffFilters extends PaginationFilters {
  role?: string;
  status?: string;
}

interface BillingFilters extends PaginationFilters {
  status?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
}

interface TransportFilters extends PaginationFilters {
  status?: string;
  date?: string;
  patientId?: string;
  direction?: string;
}

interface ConsumableFilters extends PaginationFilters {
  category?: string;
  status?: string;
  lowStock?: boolean;
}

// Whitelist of allowed values for enum-like fields
const ALLOWED_PROTOCOL_STATUS = ['active', 'inactive'] as const;
const ALLOWED_PROTOCOL_TYPES = ['hemodialysis', 'hemodiafiltration', 'peritoneal'] as const;
const ALLOWED_STAFF_ROLES = ['nephrologist', 'nurse', 'technician', 'admin', 'receptionist'] as const;
const ALLOWED_BILLING_STATUS = ['pending', 'paid', 'overdue', 'cancelled'] as const;
const ALLOWED_BILLING_TYPES = ['session', 'monthly', 'emergency'] as const;
const ALLOWED_TRANSPORT_STATUS = ['scheduled', 'confirmed', 'in_transit', 'completed', 'cancelled'] as const;
const ALLOWED_TRANSPORT_DIRECTIONS = ['pickup', 'dropoff', 'both'] as const;
const ALLOWED_TRANSPORT_TYPES = ['ambulance', 'taxi', 'private', 'public', 'family'] as const;
const ALLOWED_CONSUMABLE_CATEGORIES = ['dialyzers', 'lines', 'needles', 'solutions', 'medications', 'disposables', 'other'] as const;
const ALLOWED_CONSUMABLE_STATUS = ['active', 'inactive'] as const;

// Validation helpers
function validatePagination(limit?: number, offset?: number): { limit: number; offset: number } {
  return {
    limit: Math.min(Math.max(1, Number(limit) || 25), 100),
    offset: Math.max(0, Number(offset) || 0),
  };
}

function validateEnum<T extends readonly string[]>(value: string | undefined, allowed: T, defaultValue: T[number]): T[number] {
  if (!value) return defaultValue;
  return (allowed as readonly string[]).includes(value) ? value as T[number] : defaultValue;
}

// ============================================================================
// PROTOCOLS SERVICE
// ============================================================================

export const protocolService = {
  async list(organizationId: string, filters: ProtocolFilters = {}) {
    const { status, type } = filters;
    const { limit, offset } = validatePagination(filters.limit, filters.offset);

    // Build conditions array
    const conditions = [eq(dialyseProtocols.organizationId, organizationId)];

    if (status && status !== 'all') {
      const safeStatus = validateEnum(status, ALLOWED_PROTOCOL_STATUS, 'active');
      conditions.push(eq(dialyseProtocols.status, safeStatus));
    }

    if (type && type !== 'all') {
      const safeType = validateEnum(type, ALLOWED_PROTOCOL_TYPES, 'hemodialysis');
      conditions.push(eq(dialyseProtocols.type, safeType));
    }

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      drizzleDb
        .select()
        .from(dialyseProtocols)
        .where(whereClause)
        .orderBy(desc(dialyseProtocols.createdAt))
        .limit(limit)
        .offset(offset),
      drizzleDb
        .select({ count: count() })
        .from(dialyseProtocols)
        .where(whereClause),
    ]);

    return {
      data: data || [],
      total: countResult[0]?.count || 0,
    };
  },

  async getById(organizationId: string, id: string) {
    const result = await drizzleDb
      .select()
      .from(dialyseProtocols)
      .where(and(
        eq(dialyseProtocols.id, id),
        eq(dialyseProtocols.organizationId, organizationId)
      ))
      .get() as any;
    return result;
  },

  async create(organizationId: string, userId: string, data: Partial<InsertDialyseProtocol>) {
    const safeType = validateEnum(data.type, ALLOWED_PROTOCOL_TYPES, 'hemodialysis');
    const now = new Date();

    const insertData: InsertDialyseProtocol = {
      organizationId,
      name: data.name || 'New Protocol',
      code: data.code,
      description: data.description,
      type: safeType,
      isTemplate: data.isTemplate ?? true,
      dialyzerType: data.dialyzerType,
      dialyzerSurface: data.dialyzerSurface,
      bloodFlowRate: data.bloodFlowRate,
      dialysateFlowRate: data.dialysateFlowRate,
      sessionDurationMinutes: data.sessionDurationMinutes,
      ufGoal: data.ufGoal,
      anticoagulationType: data.anticoagulationType,
      anticoagulationDose: data.anticoagulationDose,
      anticoagulationProtocol: data.anticoagulationProtocol,
      dialysateSodium: data.dialysateSodium,
      dialysatePotassium: data.dialysatePotassium,
      dialysateBicarbonate: data.dialysateBicarbonate,
      dialysateCalcium: data.dialysateCalcium,
      dialysateGlucose: data.dialysateGlucose,
      dialysateTemperature: data.dialysateTemperature,
      accessTypePreference: data.accessTypePreference,
      specialInstructions: data.specialInstructions,
      contraindications: data.contraindications,
      status: 'active',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await drizzleDb
      .insert(dialyseProtocols)
      .values(insertData)
      .returning();

    return result[0];
  },

  async update(organizationId: string, id: string, data: Partial<InsertDialyseProtocol>) {
    const existing = await this.getById(organizationId, id);
    if (!existing) throw new Error('Protocol not found');

    const updateData: Partial<InsertDialyseProtocol> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) {
      updateData.status = validateEnum(data.status, ALLOWED_PROTOCOL_STATUS, 'active');
    }
    if (data.type !== undefined) {
      updateData.type = validateEnum(data.type, ALLOWED_PROTOCOL_TYPES, 'hemodialysis');
    }

    await drizzleDb
      .update(dialyseProtocols)
      .set(updateData)
      .where(and(
        eq(dialyseProtocols.id, id),
        eq(dialyseProtocols.organizationId, organizationId)
      ));

    return this.getById(organizationId, id);
  },

  async delete(organizationId: string, id: string) {
    await drizzleDb
      .delete(dialyseProtocols)
      .where(and(
        eq(dialyseProtocols.id, id),
        eq(dialyseProtocols.organizationId, organizationId)
      ));
  },

  async duplicate(organizationId: string, id: string, userId: string) {
    const original = await this.getById(organizationId, id);
    if (!original) throw new Error('Protocol not found');

    return this.create(organizationId, userId, {
      ...original,
      name: `${original.name} (copie)`,
      code: original.code ? `${original.code}-COPY` : undefined,
    });
  },

  async getStats(organizationId: string) {
    const result = await drizzleDb
      .select({
        total: count(),
        active: sum(sql<number>`CASE WHEN ${dialyseProtocols.status} = 'active' THEN 1 ELSE 0 END`),
        inactive: sum(sql<number>`CASE WHEN ${dialyseProtocols.status} = 'inactive' THEN 1 ELSE 0 END`),
        hemodialysis: sum(sql<number>`CASE WHEN ${dialyseProtocols.type} = 'hemodialysis' THEN 1 ELSE 0 END`),
        hemodiafiltration: sum(sql<number>`CASE WHEN ${dialyseProtocols.type} = 'hemodiafiltration' THEN 1 ELSE 0 END`),
        templates: sum(sql<number>`CASE WHEN ${dialyseProtocols.isTemplate} = 1 THEN 1 ELSE 0 END`),
      })
      .from(dialyseProtocols)
      .where(eq(dialyseProtocols.organizationId, organizationId));

    return result[0];
  },
};

// ============================================================================
// STAFF SERVICE
// ============================================================================

export const staffService = {
  async list(organizationId: string, filters: StaffFilters = {}) {
    const { role, status } = filters;
    const { limit, offset } = validatePagination(filters.limit, filters.offset);

    const conditions = [eq(dialyseStaff.organizationId, organizationId)];

    if (role && role !== 'all') {
      const safeRole = validateEnum(role, ALLOWED_STAFF_ROLES, 'nurse');
      conditions.push(eq(dialyseStaff.role, safeRole));
    }

    if (status && status !== 'all') {
      const safeStatus = validateEnum(status, ALLOWED_CONSUMABLE_STATUS, 'active');
      conditions.push(eq(dialyseStaff.status, safeStatus));
    }

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      drizzleDb
        .select()
        .from(dialyseStaff)
        .where(whereClause)
        .orderBy(asc(dialyseStaff.lastName), asc(dialyseStaff.firstName))
        .limit(limit)
        .offset(offset),
      drizzleDb
        .select({ count: count() })
        .from(dialyseStaff)
        .where(whereClause),
    ]);

    return {
      data: data || [],
      total: countResult[0]?.count || 0,
    };
  },

  async getById(organizationId: string, id: string) {
    return drizzleDb
      .select()
      .from(dialyseStaff)
      .where(and(
        eq(dialyseStaff.id, id),
        eq(dialyseStaff.organizationId, organizationId)
      ))
      .get() as any;
  },

  async create(organizationId: string, userId: string, data: Partial<InsertDialyseStaff>) {
    const safeRole = validateEnum(data.role, ALLOWED_STAFF_ROLES, 'nurse');
    const safeStatus = validateEnum(data.status, ALLOWED_CONSUMABLE_STATUS, 'active');
    const now = new Date();

    const insertData: InsertDialyseStaff = {
      organizationId,
      employeeId: data.employeeId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      role: safeRole,
      specialty: data.specialty,
      licenseNumber: data.licenseNumber,
      licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry as unknown as string) : undefined,
      phone: data.phone,
      email: data.email,
      status: safeStatus,
      schedule: data.schedule,
      notes: data.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await drizzleDb
      .insert(dialyseStaff)
      .values(insertData)
      .returning();

    return result[0];
  },

  async update(organizationId: string, id: string, data: Partial<InsertDialyseStaff>) {
    const existing = await this.getById(organizationId, id);
    if (!existing) throw new Error('Staff member not found');

    const updateData: Partial<InsertDialyseStaff> = {
      updatedAt: new Date(),
    };

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.role !== undefined) {
      updateData.role = validateEnum(data.role, ALLOWED_STAFF_ROLES, 'nurse');
    }
    if (data.specialty !== undefined) updateData.specialty = data.specialty;
    if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber;
    if (data.status !== undefined) {
      updateData.status = validateEnum(data.status, ALLOWED_CONSUMABLE_STATUS, 'active');
    }

    await drizzleDb
      .update(dialyseStaff)
      .set(updateData)
      .where(and(
        eq(dialyseStaff.id, id),
        eq(dialyseStaff.organizationId, organizationId)
      ));

    return this.getById(organizationId, id);
  },

  async updateSchedule(organizationId: string, id: string, schedule: Record<string, unknown>) {
    await drizzleDb
      .update(dialyseStaff)
      .set({
        schedule: JSON.stringify(schedule),
        updatedAt: new Date(),
      })
      .where(and(
        eq(dialyseStaff.id, id),
        eq(dialyseStaff.organizationId, organizationId)
      ));
    return this.getById(organizationId, id);
  },

  async delete(organizationId: string, id: string) {
    await drizzleDb
      .delete(dialyseStaff)
      .where(and(
        eq(dialyseStaff.id, id),
        eq(dialyseStaff.organizationId, organizationId)
      ));
  },

  async getStats(organizationId: string) {
    const now = new Date();
    const result = await drizzleDb
      .select({
        total: count(),
        active: sum(sql<number>`CASE WHEN ${dialyseStaff.status} = 'active' THEN 1 ELSE 0 END`),
        nephrologists: sum(sql<number>`CASE WHEN ${dialyseStaff.role} = 'nephrologist' THEN 1 ELSE 0 END`),
        nurses: sum(sql<number>`CASE WHEN ${dialyseStaff.role} = 'nurse' THEN 1 ELSE 0 END`),
        technicians: sum(sql<number>`CASE WHEN ${dialyseStaff.role} = 'technician' THEN 1 ELSE 0 END`),
        expiredLicenses: sum(sql<number>`CASE WHEN ${dialyseStaff.licenseExpiry} < ${now.getTime()} THEN 1 ELSE 0 END`),
      })
      .from(dialyseStaff)
      .where(eq(dialyseStaff.organizationId, organizationId));

    return result[0];
  },
};

// ============================================================================
// BILLING SERVICE
// ============================================================================

export const billingService = {
  async list(organizationId: string, filters: BillingFilters = {}) {
    const { status, patientId } = filters;
    const { limit, offset } = validatePagination(filters.limit, filters.offset);

    const conditions = [eq(dialyseBilling.organizationId, organizationId)];

    if (status && status !== 'all') {
      const safeStatus = validateEnum(status, ALLOWED_BILLING_STATUS, 'pending');
      conditions.push(eq(dialyseBilling.status, safeStatus));
    }

    if (patientId) {
      conditions.push(eq(dialyseBilling.patientId, patientId));
    }

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      drizzleDb
        .select({
          billing: dialyseBilling,
          patientMedicalId: dialysePatients.medicalId,
          patientFirstName: contacts.firstName,
          patientLastName: contacts.lastName,
        })
        .from(dialyseBilling)
        .leftJoin(dialysePatients, eq(dialyseBilling.patientId, dialysePatients.id))
        .leftJoin(contacts, eq(dialysePatients.contactId, contacts.id))
        .where(whereClause)
        .orderBy(desc(dialyseBilling.billingDate))
        .limit(limit)
        .offset(offset),
      drizzleDb
        .select({ count: count() })
        .from(dialyseBilling)
        .where(whereClause),
    ]);

    return {
      data: data.map(row => ({
        ...row.billing,
        patient_medical_id: row.patientMedicalId,
        patient_first_name: row.patientFirstName,
        patient_last_name: row.patientLastName,
      })) || [],
      total: countResult[0]?.count || 0,
    };
  },

  async getById(organizationId: string, id: string) {
    return drizzleDb
      .select()
      .from(dialyseBilling)
      .where(and(
        eq(dialyseBilling.id, id),
        eq(dialyseBilling.organizationId, organizationId)
      ))
      .get() as any;
  },

  async create(organizationId: string, userId: string, data: Partial<InsertDialyseBilling>) {
    // Generate invoice number
    const countResult = await drizzleDb
      .select({ count: count() })
      .from(dialyseBilling)
      .where(eq(dialyseBilling.organizationId, organizationId));

    const invoiceNumber = `DIAL-${new Date().getFullYear()}-${String((countResult[0]?.count || 0) + 1).padStart(5, '0')}`;
    const safeBillingType = validateEnum(data.billingType, ALLOWED_BILLING_TYPES, 'session');
    const now = new Date();

    const insertData: InsertDialyseBilling = {
      organizationId,
      patientId: data.patientId || '',
      sessionId: data.sessionId,
      invoiceNumber,
      billingDate: now,
      sessionDate: data.sessionDate,
      billingType: safeBillingType,
      amount: data.amount || 0,
      insuranceAmount: data.insuranceAmount || 0,
      patientAmount: data.patientAmount || 0,
      insuranceProvider: data.insuranceProvider,
      insurancePolicyNumber: data.insurancePolicyNumber,
      status: 'pending',
      lineItems: data.lineItems,
      notes: data.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await drizzleDb
      .insert(dialyseBilling)
      .values(insertData)
      .returning();

    return result[0];
  },

  async update(organizationId: string, id: string, data: Partial<InsertDialyseBilling & { status?: string }>) {
    const existing = await this.getById(organizationId, id);
    if (!existing) throw new Error('Billing record not found');

    const updateData: Partial<InsertDialyseBilling> = {
      updatedAt: new Date(),
    };

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.insuranceAmount !== undefined) updateData.insuranceAmount = data.insuranceAmount;
    if (data.patientAmount !== undefined) updateData.patientAmount = data.patientAmount;
    if (data.status !== undefined) {
      updateData.status = validateEnum(data.status, ALLOWED_BILLING_STATUS, 'pending');
    }

    await drizzleDb
      .update(dialyseBilling)
      .set(updateData)
      .where(and(
        eq(dialyseBilling.id, id),
        eq(dialyseBilling.organizationId, organizationId)
      ));

    return this.getById(organizationId, id);
  },

  async markPaid(organizationId: string, id: string, paidAmount: number, paidDate: string) {
    const safePaidDate = new Date(paidDate);
    if (isNaN(safePaidDate.getTime())) throw new Error('Invalid paid date');

    await drizzleDb
      .update(dialyseBilling)
      .set({
        status: 'paid',
        paidAmount,
        paidDate: safePaidDate,
        updatedAt: new Date(),
      })
      .where(and(
        eq(dialyseBilling.id, id),
        eq(dialyseBilling.organizationId, organizationId)
      ));

    return this.getById(organizationId, id);
  },

  async delete(organizationId: string, id: string) {
    await drizzleDb
      .delete(dialyseBilling)
      .where(and(
        eq(dialyseBilling.id, id),
        eq(dialyseBilling.organizationId, organizationId)
      ));
  },

  async getStats(organizationId: string) {
    const result = await drizzleDb
      .select({
        total: count(),
        pending: sum(sql<number>`CASE WHEN ${dialyseBilling.status} = 'pending' THEN 1 ELSE 0 END`),
        paid: sum(sql<number>`CASE WHEN ${dialyseBilling.status} = 'paid' THEN 1 ELSE 0 END`),
        overdue: sum(sql<number>`CASE WHEN ${dialyseBilling.status} = 'overdue' THEN 1 ELSE 0 END`),
        totalAmount: sum(dialyseBilling.amount),
        totalPaid: sum(dialyseBilling.paidAmount),
        pendingAmount: sum(sql<number>`CASE WHEN ${dialyseBilling.status} = 'pending' THEN ${dialyseBilling.amount} ELSE 0 END`),
      })
      .from(dialyseBilling)
      .where(eq(dialyseBilling.organizationId, organizationId));

    return result[0];
  },
};

// ============================================================================
// TRANSPORT SERVICE
// ============================================================================

export const transportService = {
  async list(organizationId: string, filters: TransportFilters = {}) {
    const { status, patientId, direction } = filters;
    const { limit, offset } = validatePagination(filters.limit, filters.offset);

    const conditions = [eq(dialyseTransport.organizationId, organizationId)];

    if (status && status !== 'all') {
      const safeStatus = validateEnum(status, ALLOWED_TRANSPORT_STATUS, 'scheduled');
      conditions.push(eq(dialyseTransport.status, safeStatus));
    }

    if (patientId) {
      conditions.push(eq(dialyseTransport.patientId, patientId));
    }

    if (direction && direction !== 'all') {
      const safeDirection = validateEnum(direction, ALLOWED_TRANSPORT_DIRECTIONS, 'pickup');
      conditions.push(eq(dialyseTransport.direction, safeDirection));
    }

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      drizzleDb
        .select({
          transport: dialyseTransport,
          patientMedicalId: dialysePatients.medicalId,
          patientFirstName: contacts.firstName,
          patientLastName: contacts.lastName,
        })
        .from(dialyseTransport)
        .leftJoin(dialysePatients, eq(dialyseTransport.patientId, dialysePatients.id))
        .leftJoin(contacts, eq(dialysePatients.contactId, contacts.id))
        .where(whereClause)
        .orderBy(desc(dialyseTransport.transportDate))
        .limit(limit)
        .offset(offset),
      drizzleDb
        .select({ count: count() })
        .from(dialyseTransport)
        .where(whereClause),
    ]);

    return {
      data: data.map(row => ({
        ...row.transport,
        patient_medical_id: row.patientMedicalId,
        patient_first_name: row.patientFirstName,
        patient_last_name: row.patientLastName,
      })) || [],
      total: countResult[0]?.count || 0,
    };
  },

  async getById(organizationId: string, id: string) {
    return drizzleDb
      .select()
      .from(dialyseTransport)
      .where(and(
        eq(dialyseTransport.id, id),
        eq(dialyseTransport.organizationId, organizationId)
      ))
      .get() as any;
  },

  async create(organizationId: string, userId: string, data: Partial<InsertDialyseTransport>) {
    const transportDate = data.transportDate ? new Date(data.transportDate as unknown as string) : new Date();
    if (isNaN(transportDate.getTime())) throw new Error('Invalid transport date');

    const safeDirection = validateEnum(data.direction, ALLOWED_TRANSPORT_DIRECTIONS, 'pickup');
    const safeTransportType = validateEnum(data.transportType, ALLOWED_TRANSPORT_TYPES, 'ambulance');
    const now = new Date();

    const insertData: InsertDialyseTransport = {
      organizationId,
      patientId: data.patientId || '',
      sessionId: data.sessionId,
      transportDate,
      direction: safeDirection,
      transportType: safeTransportType,
      providerName: data.providerName,
      providerPhone: data.providerPhone,
      vehicleNumber: data.vehicleNumber,
      driverName: data.driverName,
      pickupAddress: data.pickupAddress,
      dropoffAddress: data.dropoffAddress,
      scheduledTime: data.scheduledTime,
      specialNeeds: data.specialNeeds,
      wheelchairRequired: data.wheelchairRequired || false,
      stretcherRequired: data.stretcherRequired || false,
      oxygenRequired: data.oxygenRequired || false,
      escortRequired: data.escortRequired || false,
      escortName: data.escortName,
      status: 'scheduled',
      cost: data.cost || 0,
      notes: data.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await drizzleDb
      .insert(dialyseTransport)
      .values(insertData)
      .returning();

    return result[0];
  },

  async update(organizationId: string, id: string, data: Partial<InsertDialyseTransport>) {
    const existing = await this.getById(organizationId, id);
    if (!existing) throw new Error('Transport record not found');

    const updateData: Partial<InsertDialyseTransport> = {
      updatedAt: new Date(),
    };

    if (data.transportType !== undefined) {
      updateData.transportType = validateEnum(data.transportType, ALLOWED_TRANSPORT_TYPES, 'ambulance');
    }
    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
    if (data.cost !== undefined) updateData.cost = data.cost;

    await drizzleDb
      .update(dialyseTransport)
      .set(updateData)
      .where(and(
        eq(dialyseTransport.id, id),
        eq(dialyseTransport.organizationId, organizationId)
      ));

    return this.getById(organizationId, id);
  },

  async updateStatus(organizationId: string, id: string, status: string, actualTime?: string) {
    const safeStatus = validateEnum(status, ALLOWED_TRANSPORT_STATUS, 'scheduled');

    await drizzleDb
      .update(dialyseTransport)
      .set({
        status: safeStatus,
        actualTime,
        updatedAt: new Date(),
      })
      .where(and(
        eq(dialyseTransport.id, id),
        eq(dialyseTransport.organizationId, organizationId)
      ));

    return this.getById(organizationId, id);
  },

  async delete(organizationId: string, id: string) {
    await drizzleDb
      .delete(dialyseTransport)
      .where(and(
        eq(dialyseTransport.id, id),
        eq(dialyseTransport.organizationId, organizationId)
      ));
  },

  async getStats(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await drizzleDb
      .select({
        total: count(),
        scheduled: sum(sql<number>`CASE WHEN ${dialyseTransport.status} = 'scheduled' THEN 1 ELSE 0 END`),
        confirmed: sum(sql<number>`CASE WHEN ${dialyseTransport.status} = 'confirmed' THEN 1 ELSE 0 END`),
        inTransit: sum(sql<number>`CASE WHEN ${dialyseTransport.status} = 'in_transit' THEN 1 ELSE 0 END`),
        completed: sum(sql<number>`CASE WHEN ${dialyseTransport.status} = 'completed' THEN 1 ELSE 0 END`),
        today: sum(sql<number>`CASE WHEN ${dialyseTransport.transportDate} >= ${today.getTime()} AND ${dialyseTransport.transportDate} < ${tomorrow.getTime()} THEN 1 ELSE 0 END`),
      })
      .from(dialyseTransport)
      .where(eq(dialyseTransport.organizationId, organizationId));

    return result[0];
  },
};

// ============================================================================
// CONSUMABLES SERVICE
// ============================================================================

export const consumablesService = {
  async list(organizationId: string, filters: ConsumableFilters = {}) {
    const { category, status, lowStock } = filters;
    const { limit, offset } = validatePagination(filters.limit, filters.offset);

    const conditions = [eq(dialyseConsumables.organizationId, organizationId)];

    if (category && category !== 'all') {
      const safeCategory = validateEnum(category, ALLOWED_CONSUMABLE_CATEGORIES, 'other');
      conditions.push(eq(dialyseConsumables.category, safeCategory));
    }

    if (status && status !== 'all') {
      const safeStatus = validateEnum(status, ALLOWED_CONSUMABLE_STATUS, 'active');
      conditions.push(eq(dialyseConsumables.status, safeStatus));
    }

    if (lowStock) {
      conditions.push(lte(dialyseConsumables.currentStock, dialyseConsumables.minStock));
    }

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      drizzleDb
        .select()
        .from(dialyseConsumables)
        .where(whereClause)
        .orderBy(asc(dialyseConsumables.name))
        .limit(Math.min(limit, 200))
        .offset(offset),
      drizzleDb
        .select({ count: count() })
        .from(dialyseConsumables)
        .where(whereClause),
    ]);

    return {
      data: data || [],
      total: countResult[0]?.count || 0,
    };
  },

  async getById(organizationId: string, id: string) {
    return drizzleDb
      .select()
      .from(dialyseConsumables)
      .where(and(
        eq(dialyseConsumables.id, id),
        eq(dialyseConsumables.organizationId, organizationId)
      ))
      .get() as any;
  },

  async create(organizationId: string, userId: string, data: Partial<InsertDialyseConsumable>) {
    const safeCategory = validateEnum(data.category, ALLOWED_CONSUMABLE_CATEGORIES, 'other');
    const now = new Date();

    const insertData: InsertDialyseConsumable = {
      organizationId,
      inventoryItemId: data.inventoryItemId,
      name: data.name || '',
      code: data.code,
      category: safeCategory,
      description: data.description,
      unit: data.unit || 'unit',
      currentStock: data.currentStock || 0,
      minStock: data.minStock || 0,
      maxStock: data.maxStock,
      reorderPoint: data.reorderPoint,
      unitCost: data.unitCost || 0,
      supplier: data.supplier,
      manufacturer: data.manufacturer,
      expiryTracking: data.expiryTracking ?? true,
      lotTracking: data.lotTracking ?? true,
      status: 'active',
      notes: data.notes,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await drizzleDb
      .insert(dialyseConsumables)
      .values(insertData)
      .returning();

    return result[0];
  },

  async update(organizationId: string, id: string, data: Partial<InsertDialyseConsumable & { status?: string }>) {
    const existing = await this.getById(organizationId, id);
    if (!existing) throw new Error('Consumable not found');

    const updateData: Partial<InsertDialyseConsumable> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) {
      updateData.category = validateEnum(data.category, ALLOWED_CONSUMABLE_CATEGORIES, 'other');
    }
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.minStock !== undefined) updateData.minStock = data.minStock;
    if (data.unitCost !== undefined) updateData.unitCost = data.unitCost;
    if (data.status !== undefined) {
      updateData.status = validateEnum(data.status, ALLOWED_CONSUMABLE_STATUS, 'active');
    }

    await drizzleDb
      .update(dialyseConsumables)
      .set(updateData)
      .where(and(
        eq(dialyseConsumables.id, id),
        eq(dialyseConsumables.organizationId, organizationId)
      ));

    return this.getById(organizationId, id);
  },

  async adjustStock(
    organizationId: string,
    id: string,
    userId: string,
    movement: { type: 'in' | 'out'; quantity: number; lotNumber?: string; expiryDate?: string; reference?: string; sessionId?: string; notes?: string }
  ) {
    const consumable = await this.getById(organizationId, id);
    if (!consumable) throw new Error('Consumable not found');

    const quantity = movement.type === 'out' ? -Math.abs(movement.quantity) : Math.abs(movement.quantity);
    const expiryDate = movement.expiryDate ? new Date(movement.expiryDate) : undefined;

    // Insert movement record
    const movementData: InsertDialyseConsumableMovement = {
      consumableId: id,
      movementType: movement.type,
      quantity,
      lotNumber: movement.lotNumber,
      expiryDate: expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : undefined,
      reference: movement.reference,
      sessionId: movement.sessionId,
      notes: movement.notes,
      createdBy: userId,
      createdAt: new Date(),
    };

    await drizzleDb.insert(dialyseConsumableMovements).values(movementData);

    // Update stock
    const newStock = (consumable.currentStock || 0) + quantity;
    await drizzleDb
      .update(dialyseConsumables)
      .set({
        currentStock: newStock,
        updatedAt: new Date(),
      })
      .where(eq(dialyseConsumables.id, id));

    return this.getById(organizationId, id);
  },

  async delete(organizationId: string, id: string) {
    await drizzleDb
      .delete(dialyseConsumables)
      .where(and(
        eq(dialyseConsumables.id, id),
        eq(dialyseConsumables.organizationId, organizationId)
      ));
  },

  async getStats(organizationId: string) {
    const result = await drizzleDb
      .select({
        total: count(),
        active: sum(sql<number>`CASE WHEN ${dialyseConsumables.status} = 'active' THEN 1 ELSE 0 END`),
        lowStock: sum(sql<number>`CASE WHEN ${dialyseConsumables.currentStock} <= ${dialyseConsumables.minStock} THEN 1 ELSE 0 END`),
        outOfStock: sum(sql<number>`CASE WHEN ${dialyseConsumables.currentStock} = 0 THEN 1 ELSE 0 END`),
        totalValue: sum(sql<number>`${dialyseConsumables.currentStock} * ${dialyseConsumables.unitCost}`),
      })
      .from(dialyseConsumables)
      .where(eq(dialyseConsumables.organizationId, organizationId));

    return result[0];
  },
};

// ============================================================================
// REPORTS SERVICE
// ============================================================================

export const reportsService = {
  async getReport(organizationId: string, period: string) {
    const now = new Date();
    let startDate: Date;

    // Validate period
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    const safePeriod = validPeriods.includes(period) ? period : 'month';

    switch (safePeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [sessionsData, patientsData, billingData, alertsData] = await Promise.all([
      drizzleDb
        .select({
          totalSessions: count(),
          completedSessions: sum(sql<number>`CASE WHEN ${dialysisSessions.status} = 'completed' THEN 1 ELSE 0 END`),
          cancelledSessions: sum(sql<number>`CASE WHEN ${dialysisSessions.status} = 'cancelled' THEN 1 ELSE 0 END`),
          avgDuration: sql<number>`AVG(${dialysisSessions.actualDurationMinutes})`,
        })
        .from(dialysisSessions)
        .where(and(
          eq(dialysisSessions.organizationId, organizationId),
          gte(dialysisSessions.sessionDate, startDate)
        )),
      drizzleDb
        .select({
          totalPatients: count(),
          activePatients: sum(sql<number>`CASE WHEN ${dialysePatients.patientStatus} = 'active' THEN 1 ELSE 0 END`),
        })
        .from(dialysePatients)
        .where(eq(dialysePatients.organizationId, organizationId)),
      drizzleDb
        .select({
          totalInvoices: count(),
          totalBilled: sum(dialyseBilling.amount),
          totalCollected: sum(dialyseBilling.paidAmount),
          pendingAmount: sum(sql<number>`CASE WHEN ${dialyseBilling.status} = 'pending' THEN ${dialyseBilling.amount} ELSE 0 END`),
        })
        .from(dialyseBilling)
        .where(and(
          eq(dialyseBilling.organizationId, organizationId),
          gte(dialyseBilling.billingDate, startDate)
        )),
      drizzleDb
        .select({
          totalAlerts: count(),
          criticalAlerts: sum(sql<number>`CASE WHEN ${clinicalAlerts.severity} = 'critical' THEN 1 ELSE 0 END`),
          activeAlerts: sum(sql<number>`CASE WHEN ${clinicalAlerts.status} = 'active' THEN 1 ELSE 0 END`),
        })
        .from(clinicalAlerts)
        .where(and(
          eq(clinicalAlerts.organizationId, organizationId),
          gte(clinicalAlerts.createdAt, startDate)
        )),
    ]);

    return {
      period: safePeriod,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      sessions: sessionsData[0],
      patients: patientsData[0],
      billing: billingData[0],
      alerts: alertsData[0],
    };
  },
};
