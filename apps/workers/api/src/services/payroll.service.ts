/**
 * Payroll Service
 * Business logic for payroll management
 */

import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { getDb } from '../db';
import {
  payrollPeriods,
  salaryComponents,
  employeeSalaries,
  employeeSalaryComponents,
  payslips,
  payslipLines,
  taxTables,
  socialContributions,
  overtimeRules,
  bonuses,
  payrollDeclarations,
  employees,
  type InsertPayrollPeriod,
  type InsertSalaryComponent,
  type InsertEmployeeSalary,
  type InsertPayslip,
  type InsertPayslipLine,
  type InsertBonus,
  type InsertPayrollDeclaration,
  type InsertSocialContribution,
  type InsertOvertimeRule,
} from '@perfex/database';

export const payrollService = {
  // ============================================
  // PAYROLL PERIODS
  // ============================================

  async listPeriods(organizationId: string, year?: number) {
    const db = getDb();
    const results = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.organizationId, organizationId))
      .orderBy(desc(payrollPeriods.year), desc(payrollPeriods.month));

    if (year) {
      return results.filter((p) => p.year === year);
    }
    return results;
  },

  async getPeriodById(organizationId: string, id: string) {
    const db = getDb();
    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, organizationId)));
    return period;
  },

  async createPeriod(data: InsertPayrollPeriod) {
    const db = getDb();
    const [period] = await db.insert(payrollPeriods).values(data).returning();
    return period;
  },

  async updatePeriod(id: string, organizationId: string, data: Partial<InsertPayrollPeriod>) {
    const db = getDb();
    const [period] = await db
      .update(payrollPeriods)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, organizationId)))
      .returning();
    return period;
  },

  async deletePeriod(id: string, organizationId: string) {
    const db = getDb();
    // Delete related payslips first
    await db.delete(payslips).where(eq(payslips.payrollPeriodId, id));
    // Delete period
    await db
      .delete(payrollPeriods)
      .where(and(eq(payrollPeriods.id, id), eq(payrollPeriods.organizationId, organizationId)));
  },

  // ============================================
  // SALARY COMPONENTS
  // ============================================

  async listComponents(organizationId: string) {
    const db = getDb();
    return db
      .select()
      .from(salaryComponents)
      .where(eq(salaryComponents.organizationId, organizationId))
      .orderBy(salaryComponents.sortOrder);
  },

  async createComponent(data: InsertSalaryComponent) {
    const db = getDb();
    const [component] = await db.insert(salaryComponents).values(data).returning();
    return component;
  },

  async updateComponent(id: string, organizationId: string, data: Partial<InsertSalaryComponent>) {
    const db = getDb();
    const [component] = await db
      .update(salaryComponents)
      .set(data)
      .where(and(eq(salaryComponents.id, id), eq(salaryComponents.organizationId, organizationId)))
      .returning();
    return component;
  },

  async deleteComponent(id: string, organizationId: string) {
    const db = getDb();
    await db
      .delete(salaryComponents)
      .where(and(eq(salaryComponents.id, id), eq(salaryComponents.organizationId, organizationId)));
  },

  // ============================================
  // EMPLOYEE SALARIES
  // ============================================

  async getEmployeeSalary(employeeId: string) {
    const db = getDb();
    const [salary] = await db
      .select()
      .from(employeeSalaries)
      .where(eq(employeeSalaries.employeeId, employeeId))
      .orderBy(desc(employeeSalaries.effectiveFrom))
      .limit(1);

    if (!salary) return null;

    // Get salary components
    const components = await db
      .select()
      .from(employeeSalaryComponents)
      .where(eq(employeeSalaryComponents.employeeSalaryId, salary.id));

    return { ...salary, components };
  },

  async createEmployeeSalary(data: InsertEmployeeSalary) {
    const db = getDb();
    const [salary] = await db.insert(employeeSalaries).values(data).returning();
    return salary;
  },

  async updateEmployeeSalary(id: string, data: Partial<InsertEmployeeSalary>) {
    const db = getDb();
    const [salary] = await db
      .update(employeeSalaries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeSalaries.id, id))
      .returning();
    return salary;
  },

  // ============================================
  // PAYSLIPS
  // ============================================

  async listPayslips(periodId: string) {
    const db = getDb();
    return db
      .select()
      .from(payslips)
      .where(eq(payslips.payrollPeriodId, periodId))
      .orderBy(payslips.employeeName);
  },

  async getPayslipById(id: string) {
    const db = getDb();
    const [payslip] = await db.select().from(payslips).where(eq(payslips.id, id));

    if (!payslip) return null;

    // Get payslip lines
    const lines = await db
      .select()
      .from(payslipLines)
      .where(eq(payslipLines.payslipId, id))
      .orderBy(payslipLines.sortOrder);

    return { ...payslip, lines };
  },

  async getEmployeePayslips(employeeId: string, year?: number) {
    const db = getDb();
    const results = await db
      .select()
      .from(payslips)
      .where(eq(payslips.employeeId, employeeId))
      .orderBy(desc(payslips.createdAt));

    if (year) {
      // Filter by year using period
      const periods = await db.select().from(payrollPeriods);
      const periodIds = periods.filter((p) => p.year === year).map((p) => p.id);
      return results.filter((ps) => periodIds.includes(ps.payrollPeriodId));
    }

    return results;
  },

  async createPayslip(data: InsertPayslip) {
    const db = getDb();
    const [payslip] = await db.insert(payslips).values(data).returning();
    return payslip;
  },

  async addPayslipLine(data: InsertPayslipLine) {
    const db = getDb();
    const [line] = await db.insert(payslipLines).values(data).returning();
    return line;
  },

  async updatePayslip(id: string, data: Partial<InsertPayslip>) {
    const db = getDb();
    const [payslip] = await db
      .update(payslips)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payslips.id, id))
      .returning();
    return payslip;
  },

  async calculatePayslip(periodId: string, employeeId: string, organizationId: string) {
    const db = getDb();

    // Get employee info
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));
    if (!employee) throw new Error('Employee not found');

    // Get employee salary configuration
    const salary = await this.getEmployeeSalary(employeeId);
    if (!salary) throw new Error('Employee salary not configured');

    // Get all salary components
    const components = await this.listComponents(organizationId);

    // Get social contributions
    const contributions = await db
      .select()
      .from(socialContributions)
      .where(eq(socialContributions.organizationId, organizationId));

    // Get any bonuses for this period
    const periodBonuses = await db
      .select()
      .from(bonuses)
      .where(and(eq(bonuses.employeeId, employeeId), eq(bonuses.payrollPeriodId, periodId)));

    // Calculate earnings
    let totalEarnings = salary.baseSalary;
    let totalDeductions = 0;
    let employerContributions = 0;

    const lines: InsertPayslipLine[] = [];

    // Base salary line
    lines.push({
      payslipId: '', // Will be set after creating payslip
      componentId: null,
      code: 'BASIC',
      name: 'Salaire de base',
      type: 'earning',
      category: 'fixed',
      base: salary.baseSalary,
      rate: 1,
      amount: salary.baseSalary,
      isTaxable: true,
      sortOrder: 0,
    });

    // Add bonuses
    periodBonuses.forEach((bonus, index) => {
      if (bonus.status === 'approved') {
        totalEarnings += bonus.amount;
        lines.push({
          payslipId: '',
          componentId: null,
          code: `BONUS_${index}`,
          name: bonus.name,
          type: 'earning',
          category: 'variable',
          amount: bonus.amount,
          isTaxable: bonus.isTaxable,
          sortOrder: 10 + index,
        });
      }
    });

    // Calculate social contributions (simplified)
    const grossSalary = totalEarnings;
    contributions.filter((c) => c.active).forEach((c, index) => {
      if (c.employeeRate) {
        const deduction = grossSalary * (c.employeeRate / 100);
        totalDeductions += deduction;
        lines.push({
          payslipId: '',
          componentId: null,
          code: c.code,
          name: c.name + ' (Salarié)',
          type: 'deduction',
          category: 'statutory',
          base: grossSalary,
          rate: c.employeeRate / 100,
          amount: deduction,
          isTaxable: false,
          sortOrder: 100 + index,
        });
      }
      if (c.employerRate) {
        const contribution = grossSalary * (c.employerRate / 100);
        employerContributions += contribution;
        lines.push({
          payslipId: '',
          componentId: null,
          code: c.code + '_EMP',
          name: c.name + ' (Patronal)',
          type: 'employer_contribution',
          category: 'statutory',
          base: grossSalary,
          rate: c.employerRate / 100,
          amount: contribution,
          isTaxable: false,
          sortOrder: 200 + index,
        });
      }
    });

    const netSalary = totalEarnings - totalDeductions;
    const totalCostToCompany = grossSalary + employerContributions;

    // Create payslip
    const payslip = await this.createPayslip({
      payrollPeriodId: periodId,
      employeeId,
      employeeSalaryId: salary.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeePosition: employee.position || undefined,
      socialSecurityNumber: salary.socialSecurityNumber || undefined,
      grossSalary,
      netSalary,
      totalEarnings,
      totalDeductions,
      employerContributions,
      totalCostToCompany,
      taxableIncome: grossSalary,
      status: 'calculated',
    });

    // Add lines
    for (const line of lines) {
      line.payslipId = payslip.id;
      await this.addPayslipLine(line);
    }

    return this.getPayslipById(payslip.id);
  },

  // ============================================
  // BONUSES
  // ============================================

  async listBonuses(employeeId?: string, periodId?: string) {
    const db = getDb();
    let results = await db.select().from(bonuses).orderBy(desc(bonuses.createdAt));

    if (employeeId) {
      results = results.filter((b) => b.employeeId === employeeId);
    }
    if (periodId) {
      results = results.filter((b) => b.payrollPeriodId === periodId);
    }

    return results;
  },

  async createBonus(data: InsertBonus) {
    const db = getDb();
    const [bonus] = await db.insert(bonuses).values(data).returning();
    return bonus;
  },

  async updateBonus(id: string, data: Partial<InsertBonus>) {
    const db = getDb();
    const [bonus] = await db
      .update(bonuses)
      .set(data)
      .where(eq(bonuses.id, id))
      .returning();
    return bonus;
  },

  async deleteBonus(id: string) {
    const db = getDb();
    await db.delete(bonuses).where(eq(bonuses.id, id));
  },

  // ============================================
  // SOCIAL CONTRIBUTIONS
  // ============================================

  async listContributions(organizationId: string) {
    const db = getDb();
    return db
      .select()
      .from(socialContributions)
      .where(eq(socialContributions.organizationId, organizationId));
  },

  async createContribution(data: InsertSocialContribution) {
    const db = getDb();
    const [contribution] = await db.insert(socialContributions).values(data).returning();
    return contribution;
  },

  async updateContribution(id: string, organizationId: string, data: Partial<InsertSocialContribution>) {
    const db = getDb();
    const [contribution] = await db
      .update(socialContributions)
      .set(data)
      .where(and(eq(socialContributions.id, id), eq(socialContributions.organizationId, organizationId)))
      .returning();
    return contribution;
  },

  // ============================================
  // OVERTIME RULES
  // ============================================

  async listOvertimeRules(organizationId: string) {
    const db = getDb();
    return db
      .select()
      .from(overtimeRules)
      .where(eq(overtimeRules.organizationId, organizationId))
      .orderBy(overtimeRules.sortOrder);
  },

  async createOvertimeRule(data: InsertOvertimeRule) {
    const db = getDb();
    const [rule] = await db.insert(overtimeRules).values(data).returning();
    return rule;
  },

  async updateOvertimeRule(id: string, organizationId: string, data: Partial<InsertOvertimeRule>) {
    const db = getDb();
    const [rule] = await db
      .update(overtimeRules)
      .set(data)
      .where(and(eq(overtimeRules.id, id), eq(overtimeRules.organizationId, organizationId)))
      .returning();
    return rule;
  },

  // ============================================
  // DECLARATIONS
  // ============================================

  async listDeclarations(organizationId: string, periodId?: string) {
    const db = getDb();
    let results = await db
      .select()
      .from(payrollDeclarations)
      .where(eq(payrollDeclarations.organizationId, organizationId))
      .orderBy(desc(payrollDeclarations.declarationDate));

    if (periodId) {
      results = results.filter((d) => d.payrollPeriodId === periodId);
    }

    return results;
  },

  async createDeclaration(data: InsertPayrollDeclaration) {
    const db = getDb();
    const [declaration] = await db.insert(payrollDeclarations).values(data).returning();
    return declaration;
  },

  async updateDeclaration(id: string, organizationId: string, data: Partial<InsertPayrollDeclaration>) {
    const db = getDb();
    const [declaration] = await db
      .update(payrollDeclarations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(payrollDeclarations.id, id), eq(payrollDeclarations.organizationId, organizationId)))
      .returning();
    return declaration;
  },

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(organizationId: string, year?: number) {
    const db = getDb();
    const currentYear = year || new Date().getFullYear();

    const periods = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.organizationId, organizationId));

    const yearPeriods = periods.filter((p) => p.year === currentYear);

    let totalGross = 0;
    let totalNet = 0;
    let totalEmployerCharges = 0;

    for (const period of yearPeriods) {
      if (period.status === 'paid' || period.status === 'closed') {
        totalGross += period.totalGross || 0;
        totalNet += period.totalNet || 0;
        totalEmployerCharges += period.totalEmployerCharges || 0;
      }
    }

    const declarations = await db
      .select()
      .from(payrollDeclarations)
      .where(eq(payrollDeclarations.organizationId, organizationId));

    const pendingDeclarations = declarations.filter(
      (d) => d.status === 'draft' || d.status === 'generated'
    ).length;

    return {
      periodsProcessed: yearPeriods.filter((p) => p.status === 'paid' || p.status === 'closed').length,
      totalPeriods: yearPeriods.length,
      totalGross,
      totalNet,
      totalEmployerCharges,
      totalCost: totalGross + totalEmployerCharges,
      pendingDeclarations,
      year: currentYear,
    };
  },

  // ============================================
  // SEED DEFAULT DATA
  // ============================================

  async seedDefaultContributions(organizationId: string) {
    const db = getDb();

    const defaultContributions = [
      { code: 'URSSAF_MALADIE', name: 'Assurance Maladie', employeeRate: 0, employerRate: 7 },
      { code: 'URSSAF_VIEILLESSE', name: 'Assurance Vieillesse', employeeRate: 6.9, employerRate: 8.55 },
      { code: 'URSSAF_CHOMAGE', name: 'Assurance Chômage', employeeRate: 0, employerRate: 4.05 },
      { code: 'AGIRC_ARRCO', name: 'Retraite Complémentaire', employeeRate: 3.15, employerRate: 4.72 },
      { code: 'CSG_CRDS', name: 'CSG/CRDS', employeeRate: 9.7, employerRate: 0 },
    ];

    for (const contrib of defaultContributions) {
      await this.createContribution({
        organizationId,
        code: contrib.code,
        name: contrib.name,
        employeeRate: contrib.employeeRate,
        employerRate: contrib.employerRate,
        base: 'gross',
        effectiveFrom: new Date('2024-01-01'),
        mandatory: true,
        active: true,
      });
    }

    return { message: 'Default contributions seeded', count: defaultContributions.length };
  },

  async seedDefaultOvertimeRules(organizationId: string) {
    const db = getDb();

    const defaultRules = [
      { name: 'Heures 35-43', hoursFrom: 35, hoursTo: 43, multiplier: 1.25 },
      { name: 'Heures > 43', hoursFrom: 43, hoursTo: null, multiplier: 1.5 },
      { name: 'Heures de nuit', hoursFrom: 0, hoursTo: null, multiplier: 1.25, isNight: true },
      { name: 'Dimanche', hoursFrom: 0, hoursTo: null, multiplier: 2, isSunday: true },
      { name: 'Jours fériés', hoursFrom: 0, hoursTo: null, multiplier: 2, isHoliday: true },
    ];

    for (const [index, rule] of defaultRules.entries()) {
      await this.createOvertimeRule({
        organizationId,
        name: rule.name,
        hoursFrom: rule.hoursFrom,
        hoursTo: rule.hoursTo || undefined,
        multiplier: rule.multiplier,
        isNight: rule.isNight || false,
        isSunday: rule.isSunday || false,
        isHoliday: rule.isHoliday || false,
        active: true,
        sortOrder: index,
      });
    }

    return { message: 'Default overtime rules seeded', count: defaultRules.length };
  },
};
