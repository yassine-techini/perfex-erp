import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { organizations } from './users';
import { employees, departments } from './hr';

/**
 * Payroll Periods
 * Monthly payroll periods
 */
export const payrollPeriods = sqliteTable('payroll_periods', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(), // e.g., "Janvier 2024"
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  paymentDate: integer('payment_date', { mode: 'timestamp' }),
  status: text('status', {
    enum: ['draft', 'processing', 'validated', 'paid', 'closed']
  }).notNull().default('draft'),
  totalGross: real('total_gross'),
  totalNet: real('total_net'),
  totalEmployerCharges: real('total_employer_charges'),
  totalEmployeeCharges: real('total_employee_charges'),
  employeeCount: integer('employee_count'),
  validatedBy: text('validated_by'),
  validatedAt: integer('validated_at', { mode: 'timestamp' }),
  paidBy: text('paid_by'),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Salary Structures
 * Define salary components and their types
 */
export const salaryComponents = sqliteTable('salary_components', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  code: text('code').notNull(), // BASIC, HRA, BONUS, etc.
  name: text('name').notNull(),
  type: text('type', {
    enum: ['earning', 'deduction', 'employer_contribution']
  }).notNull(),
  category: text('category', {
    enum: ['fixed', 'variable', 'statutory', 'voluntary']
  }).notNull(),
  calculationType: text('calculation_type', {
    enum: ['fixed_amount', 'percentage_basic', 'percentage_gross', 'formula', 'hours']
  }).notNull(),
  defaultValue: real('default_value'),
  formula: text('formula'), // For complex calculations
  isTaxable: integer('is_taxable', { mode: 'boolean' }).notNull().default(true),
  affectsNet: integer('affects_net', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Employee Salary
 * Individual employee salary configuration
 */
export const employeeSalaries = sqliteTable('employee_salaries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id),
  effectiveFrom: integer('effective_from', { mode: 'timestamp' }).notNull(),
  effectiveTo: integer('effective_to', { mode: 'timestamp' }),
  baseSalary: real('base_salary').notNull(), // Salaire de base mensuel
  hourlyRate: real('hourly_rate'),
  paymentMethod: text('payment_method', {
    enum: ['bank_transfer', 'check', 'cash']
  }).notNull().default('bank_transfer'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  bankIban: text('bank_iban'),
  bankBic: text('bank_bic'),
  socialSecurityNumber: text('social_security_number'),
  taxId: text('tax_id'),
  status: text('status', {
    enum: ['active', 'suspended', 'terminated']
  }).notNull().default('active'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Employee Salary Components
 * Components assigned to each employee
 */
export const employeeSalaryComponents = sqliteTable('employee_salary_components', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeSalaryId: text('employee_salary_id')
    .notNull()
    .references(() => employeeSalaries.id),
  componentId: text('component_id')
    .notNull()
    .references(() => salaryComponents.id),
  amount: real('amount'), // Override amount if fixed
  percentage: real('percentage'), // Override percentage if percentage-based
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Payslips
 * Individual employee payslips per period
 */
export const payslips = sqliteTable('payslips', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  payrollPeriodId: text('payroll_period_id')
    .notNull()
    .references(() => payrollPeriods.id),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id),
  employeeSalaryId: text('employee_salary_id')
    .references(() => employeeSalaries.id),

  // Employee info at time of payslip (snapshot)
  employeeName: text('employee_name').notNull(),
  employeePosition: text('employee_position'),
  departmentName: text('department_name'),
  socialSecurityNumber: text('social_security_number'),

  // Work hours
  standardHours: real('standard_hours'), // Heures normales
  overtimeHours: real('overtime_hours'), // Heures supplémentaires
  nightHours: real('night_hours'), // Heures de nuit
  holidayHours: real('holiday_hours'), // Jours fériés travaillés
  absenceHours: real('absence_hours'), // Heures d'absence
  paidLeaveHours: real('paid_leave_hours'), // Congés payés

  // Amounts
  grossSalary: real('gross_salary').notNull(),
  netSalary: real('net_salary').notNull(),
  totalEarnings: real('total_earnings').notNull(),
  totalDeductions: real('total_deductions').notNull(),
  employerContributions: real('employer_contributions').notNull(),
  totalCostToCompany: real('total_cost_to_company').notNull(),

  // Tax
  taxableIncome: real('taxable_income'),
  incomeTax: real('income_tax'),

  // Status
  status: text('status', {
    enum: ['draft', 'calculated', 'validated', 'paid', 'cancelled']
  }).notNull().default('draft'),

  // Payment
  paymentDate: integer('payment_date', { mode: 'timestamp' }),
  paymentReference: text('payment_reference'),

  // PDF
  pdfUrl: text('pdf_url'),
  pdfGeneratedAt: integer('pdf_generated_at', { mode: 'timestamp' }),

  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Payslip Lines
 * Individual lines on a payslip (earnings, deductions)
 */
export const payslipLines = sqliteTable('payslip_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  payslipId: text('payslip_id')
    .notNull()
    .references(() => payslips.id),
  componentId: text('component_id')
    .references(() => salaryComponents.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['earning', 'deduction', 'employer_contribution']
  }).notNull(),
  category: text('category').notNull(),
  base: real('base'), // Base for calculation (hours, percentage base)
  rate: real('rate'), // Rate applied
  quantity: real('quantity'), // Number of hours/days
  amount: real('amount').notNull(),
  isTaxable: integer('is_taxable', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

/**
 * Tax Tables
 * Tax brackets and rates
 */
export const taxTables = sqliteTable('tax_tables', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['income_tax', 'social_security_employee', 'social_security_employer', 'other']
  }).notNull(),
  effectiveFrom: integer('effective_from', { mode: 'timestamp' }).notNull(),
  effectiveTo: integer('effective_to', { mode: 'timestamp' }),
  brackets: text('brackets').notNull(), // JSON array of {min, max, rate, fixedAmount}
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Social Contributions
 * URSSAF, retirement, etc.
 */
export const socialContributions = sqliteTable('social_contributions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  code: text('code').notNull(), // URSSAF, AGIRC-ARRCO, etc.
  name: text('name').notNull(),
  description: text('description'),
  employeeRate: real('employee_rate'), // Taux salarial
  employerRate: real('employer_rate'), // Taux patronal
  ceiling: text('ceiling', {
    enum: ['none', 'ss_ceiling', 'ss_ceiling_2', 'ss_ceiling_4', 'ss_ceiling_8']
  }).notNull().default('none'), // Plafond SS
  base: text('base', {
    enum: ['gross', 'net', 'custom']
  }).notNull().default('gross'),
  effectiveFrom: integer('effective_from', { mode: 'timestamp' }).notNull(),
  effectiveTo: integer('effective_to', { mode: 'timestamp' }),
  mandatory: integer('mandatory', { mode: 'boolean' }).notNull().default(true),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Overtime Rules
 * Rules for overtime calculations
 */
export const overtimeRules = sqliteTable('overtime_rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  hoursFrom: real('hours_from').notNull(), // Start of bracket (e.g., 35)
  hoursTo: real('hours_to'), // End of bracket (e.g., 43), null for unlimited
  multiplier: real('multiplier').notNull(), // e.g., 1.25 for 25% extra
  isNight: integer('is_night', { mode: 'boolean' }).notNull().default(false),
  isHoliday: integer('is_holiday', { mode: 'boolean' }).notNull().default(false),
  isSunday: integer('is_sunday', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Bonuses & One-time Payments
 * Ad-hoc bonuses and payments
 */
export const bonuses = sqliteTable('bonuses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id),
  payrollPeriodId: text('payroll_period_id')
    .references(() => payrollPeriods.id),
  type: text('type', {
    enum: ['bonus', 'commission', 'allowance', 'reimbursement', 'advance', 'other']
  }).notNull(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  isTaxable: integer('is_taxable', { mode: 'boolean' }).notNull().default(true),
  status: text('status', {
    enum: ['pending', 'approved', 'paid', 'cancelled']
  }).notNull().default('pending'),
  approvedBy: text('approved_by'),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  reason: text('reason'),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Payroll Declarations
 * DSN, URSSAF declarations
 */
export const payrollDeclarations = sqliteTable('payroll_declarations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  payrollPeriodId: text('payroll_period_id')
    .references(() => payrollPeriods.id),
  type: text('type', {
    enum: ['dsn_monthly', 'dsn_event', 'urssaf', 'agirc_arrco', 'other']
  }).notNull(),
  declarationDate: integer('declaration_date', { mode: 'timestamp' }).notNull(),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  status: text('status', {
    enum: ['draft', 'generated', 'submitted', 'accepted', 'rejected', 'paid']
  }).notNull().default('draft'),
  totalAmount: real('total_amount'),
  fileUrl: text('file_url'), // Generated declaration file
  submissionReference: text('submission_reference'),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  submittedBy: text('submitted_by'),
  responseData: text('response_data'), // JSON - response from authority
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Type exports
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type InsertPayrollPeriod = typeof payrollPeriods.$inferInsert;
export type SalaryComponent = typeof salaryComponents.$inferSelect;
export type InsertSalaryComponent = typeof salaryComponents.$inferInsert;
export type EmployeeSalary = typeof employeeSalaries.$inferSelect;
export type InsertEmployeeSalary = typeof employeeSalaries.$inferInsert;
export type EmployeeSalaryComponent = typeof employeeSalaryComponents.$inferSelect;
export type InsertEmployeeSalaryComponent = typeof employeeSalaryComponents.$inferInsert;
export type Payslip = typeof payslips.$inferSelect;
export type InsertPayslip = typeof payslips.$inferInsert;
export type PayslipLine = typeof payslipLines.$inferSelect;
export type InsertPayslipLine = typeof payslipLines.$inferInsert;
export type TaxTable = typeof taxTables.$inferSelect;
export type InsertTaxTable = typeof taxTables.$inferInsert;
export type SocialContribution = typeof socialContributions.$inferSelect;
export type InsertSocialContribution = typeof socialContributions.$inferInsert;
export type OvertimeRule = typeof overtimeRules.$inferSelect;
export type InsertOvertimeRule = typeof overtimeRules.$inferInsert;
export type Bonus = typeof bonuses.$inferSelect;
export type InsertBonus = typeof bonuses.$inferInsert;
export type PayrollDeclaration = typeof payrollDeclarations.$inferSelect;
export type InsertPayrollDeclaration = typeof payrollDeclarations.$inferInsert;
