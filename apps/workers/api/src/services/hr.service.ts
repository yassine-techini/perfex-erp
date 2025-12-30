/**
 * HR Service
 * Manage employees, departments, leave requests, and attendance
 */

import { eq, and, desc, like, or } from 'drizzle-orm';
import { drizzleDb } from '../db';
import { departments, employees, leaveRequests, attendanceRecords } from '@perfex/database';
import type {
  Department,
  Employee,
  LeaveRequest,
  AttendanceRecord,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateLeaveRequestInput,
  UpdateLeaveRequestInput,
  CreateAttendanceRecordInput,
  UpdateAttendanceRecordInput,
} from '@perfex/shared';

export class HRService {
  // ============================================
  // DEPARTMENTS
  // ============================================

  /**
   * Create department
   */
  async createDepartment(organizationId: string, userId: string, data: CreateDepartmentInput): Promise<Department> {
    const now = new Date();
    const departmentId = crypto.randomUUID();

    await drizzleDb.insert(departments).values({
      id: departmentId,
      organizationId,
      name: data.name,
      code: data.code,
      description: data.description || null,
      managerId: data.managerId || null,
      parentDepartmentId: data.parentDepartmentId || null,
      active: data.active ?? true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const department = await this.getDepartmentById(organizationId, departmentId);
    if (!department) {
      throw new Error('Failed to create department');
    }

    return department;
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(organizationId: string, departmentId: string): Promise<Department | null> {
    const department = await drizzleDb
      .select()
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.organizationId, organizationId)))
      .get() as any;

    return department || null;
  }

  /**
   * List departments
   */
  async listDepartments(organizationId: string, filters?: { active?: string }): Promise<Department[]> {
    let query = drizzleDb
      .select()
      .from(departments)
      .where(eq(departments.organizationId, organizationId));

    if (filters?.active) {
      const isActive = filters.active === 'true';
      query = query.where(and(eq(departments.organizationId, organizationId), eq(departments.active, isActive)));
    }

    const results = await query.orderBy(desc(departments.createdAt)).all() as any[];
    return results;
  }

  /**
   * Update department
   */
  async updateDepartment(organizationId: string, departmentId: string, data: UpdateDepartmentInput): Promise<Department> {
    const existing = await this.getDepartmentById(organizationId, departmentId);
    if (!existing) {
      throw new Error('Department not found');
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    await drizzleDb
      .update(departments)
      .set(updateData)
      .where(and(eq(departments.id, departmentId), eq(departments.organizationId, organizationId)));

    const updated = await this.getDepartmentById(organizationId, departmentId);
    if (!updated) {
      throw new Error('Failed to update department');
    }

    return updated;
  }

  /**
   * Delete department
   */
  async deleteDepartment(organizationId: string, departmentId: string): Promise<void> {
    const existing = await this.getDepartmentById(organizationId, departmentId);
    if (!existing) {
      throw new Error('Department not found');
    }

    await drizzleDb
      .delete(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.organizationId, organizationId)));
  }

  // ============================================
  // EMPLOYEES
  // ============================================

  /**
   * Create employee
   */
  async createEmployee(organizationId: string, userId: string, data: CreateEmployeeInput): Promise<Employee> {
    const now = new Date();
    const employeeId = crypto.randomUUID();

    // Parse dates
    const hireDate = data.hireDate ? new Date(data.hireDate) : new Date();
    const dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    const terminationDate = data.terminationDate ? new Date(data.terminationDate) : null;

    await drizzleDb.insert(employees).values({
      id: employeeId,
      organizationId,
      userId: data.userId || null,
      employeeNumber: data.employeeNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      dateOfBirth,
      gender: data.gender || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      departmentId: data.departmentId || null,
      position: data.position,
      employmentType: data.employmentType,
      hireDate,
      terminationDate,
      salary: data.salary || null,
      salaryCurrency: data.salaryCurrency || 'EUR',
      salaryPeriod: data.salaryPeriod || 'monthly',
      managerId: data.managerId || null,
      workSchedule: data.workSchedule || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      emergencyContactRelation: data.emergencyContactRelation || null,
      notes: data.notes || null,
      active: data.active ?? true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const employee = await this.getEmployeeById(organizationId, employeeId);
    if (!employee) {
      throw new Error('Failed to create employee');
    }

    return employee;
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(organizationId: string, employeeId: string): Promise<Employee | null> {
    const employee = await drizzleDb
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)))
      .get() as any;

    return employee || null;
  }

  /**
   * List employees
   */
  async listEmployees(
    organizationId: string,
    filters?: {
      departmentId?: string;
      employmentType?: string;
      active?: string;
      search?: string;
    }
  ): Promise<Employee[]> {
    let query = drizzleDb
      .select()
      .from(employees)
      .where(eq(employees.organizationId, organizationId));

    if (filters?.departmentId) {
      query = query.where(and(eq(employees.organizationId, organizationId), eq(employees.departmentId, filters.departmentId)));
    }

    if (filters?.employmentType) {
      query = query.where(and(eq(employees.organizationId, organizationId), eq(employees.employmentType, filters.employmentType as any)));
    }

    if (filters?.active) {
      const isActive = filters.active === 'true';
      query = query.where(and(eq(employees.organizationId, organizationId), eq(employees.active, isActive)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(employees.organizationId, organizationId),
          or(
            like(employees.firstName, searchTerm),
            like(employees.lastName, searchTerm),
            like(employees.email, searchTerm),
            like(employees.employeeNumber, searchTerm)
          )
        )
      );
    }

    const results = await query.orderBy(desc(employees.createdAt)).all() as any[];
    return results;
  }

  /**
   * Update employee
   */
  async updateEmployee(organizationId: string, employeeId: string, data: UpdateEmployeeInput): Promise<Employee> {
    const existing = await this.getEmployeeById(organizationId, employeeId);
    if (!existing) {
      throw new Error('Employee not found');
    }

    const updateData: any = { ...data };

    // Parse dates if provided
    if (data.hireDate) {
      updateData.hireDate = new Date(data.hireDate);
    }
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.terminationDate) {
      updateData.terminationDate = new Date(data.terminationDate);
    }

    updateData.updatedAt = new Date();

    await drizzleDb
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)));

    const updated = await this.getEmployeeById(organizationId, employeeId);
    if (!updated) {
      throw new Error('Failed to update employee');
    }

    return updated;
  }

  /**
   * Delete employee
   */
  async deleteEmployee(organizationId: string, employeeId: string): Promise<void> {
    const existing = await this.getEmployeeById(organizationId, employeeId);
    if (!existing) {
      throw new Error('Employee not found');
    }

    await drizzleDb
      .delete(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)));
  }

  // ============================================
  // LEAVE REQUESTS
  // ============================================

  /**
   * Create leave request
   */
  async createLeaveRequest(organizationId: string, userId: string, data: CreateLeaveRequestInput): Promise<LeaveRequest> {
    const now = new Date();
    const leaveRequestId = crypto.randomUUID();

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    await drizzleDb.insert(leaveRequests).values({
      id: leaveRequestId,
      organizationId,
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate,
      endDate,
      totalDays: data.totalDays,
      reason: data.reason || null,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const leaveRequest = await this.getLeaveRequestById(organizationId, leaveRequestId);
    if (!leaveRequest) {
      throw new Error('Failed to create leave request');
    }

    return leaveRequest;
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(organizationId: string, leaveRequestId: string): Promise<LeaveRequest | null> {
    const leaveRequest = await drizzleDb
      .select()
      .from(leaveRequests)
      .where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.organizationId, organizationId)))
      .get() as any;

    return leaveRequest || null;
  }

  /**
   * List leave requests
   */
  async listLeaveRequests(
    organizationId: string,
    filters?: {
      employeeId?: string;
      status?: string;
      leaveType?: string;
    }
  ): Promise<LeaveRequest[]> {
    let query = drizzleDb
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.organizationId, organizationId));

    if (filters?.employeeId) {
      query = query.where(and(eq(leaveRequests.organizationId, organizationId), eq(leaveRequests.employeeId, filters.employeeId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(leaveRequests.organizationId, organizationId), eq(leaveRequests.status, filters.status as any)));
    }

    if (filters?.leaveType) {
      query = query.where(and(eq(leaveRequests.organizationId, organizationId), eq(leaveRequests.leaveType, filters.leaveType as any)));
    }

    const results = await query.orderBy(desc(leaveRequests.createdAt)).all() as any[];
    return results;
  }

  /**
   * Update leave request
   */
  async updateLeaveRequest(organizationId: string, leaveRequestId: string, userId: string, data: UpdateLeaveRequestInput): Promise<LeaveRequest> {
    const existing = await this.getLeaveRequestById(organizationId, leaveRequestId);
    if (!existing) {
      throw new Error('Leave request not found');
    }

    const updateData: any = { ...data };

    // Parse dates if provided
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    // If approving, set approver and approval date
    if (data.status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    updateData.updatedAt = new Date();

    await drizzleDb
      .update(leaveRequests)
      .set(updateData)
      .where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.organizationId, organizationId)));

    const updated = await this.getLeaveRequestById(organizationId, leaveRequestId);
    if (!updated) {
      throw new Error('Failed to update leave request');
    }

    return updated;
  }

  /**
   * Delete leave request
   */
  async deleteLeaveRequest(organizationId: string, leaveRequestId: string): Promise<void> {
    const existing = await this.getLeaveRequestById(organizationId, leaveRequestId);
    if (!existing) {
      throw new Error('Leave request not found');
    }

    await drizzleDb
      .delete(leaveRequests)
      .where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.organizationId, organizationId)));
  }

  /**
   * Get HR statistics
   */
  async getStats(organizationId: string): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    pendingLeaveRequests: number;
  }> {
    const allEmployees = await this.listEmployees(organizationId);
    const allDepartments = await this.listDepartments(organizationId);
    const allLeaveRequests = await this.listLeaveRequests(organizationId);

    return {
      totalEmployees: allEmployees.length,
      activeEmployees: allEmployees.filter(e => e.active).length,
      totalDepartments: allDepartments.length,
      pendingLeaveRequests: allLeaveRequests.filter(lr => lr.status === 'pending').length,
    };
  }
}

export const hrService = new HRService();
