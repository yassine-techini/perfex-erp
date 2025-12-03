/**
 * Database schemas export
 * Central export point for all Drizzle schemas
 */

export * from './users';
export * from './finance';
export * from './crm';
export * from './projects';
export * from './inventory';
export * from './hr';
export * from './procurement';
export * from './sales';
export * from './manufacturing';
export * from './assets';
export * from './notifications';
export * from './documents';
export * from './workflows';
export * from './ai';
export * from './modules';
export * from './recipes';
export * from './traceability';
export * from './payroll';

// Export all tables for drizzle-kit
export {
  users,
  organizations,
  organizationMembers,
  roles,
  userRoles,
  sessions,
} from './users';

export {
  accounts,
  journals,
  journalEntries,
  journalEntryLines,
  fiscalYears,
  taxRates,
  invoices,
  invoiceLines,
  payments,
  paymentAllocations,
  bankAccounts,
} from './finance';

export {
  companies,
  contacts,
  pipelineStages,
  opportunities,
  activities,
  products,
  opportunityProducts,
} from './crm';

export {
  projects,
  projectTasks,
  projectMilestones,
  timeEntries,
  projectMembers,
} from './projects';

export {
  inventoryItems,
  warehouses,
  stockLevels,
  stockMovements,
  stockAdjustments,
  stockAdjustmentLines,
} from './inventory';

export {
  departments,
  employees,
  leaveRequests,
  attendanceRecords,
  leaveBalances,
} from './hr';

export {
  suppliers,
  purchaseRequisitions,
  purchaseRequisitionLines,
  purchaseOrders,
  purchaseOrderLines,
  goodsReceivedNotes,
  goodsReceivedLines,
} from './procurement';

export {
  quotes,
  salesOrders,
  salesOrderLines,
  deliveryNotes,
} from './sales';

export {
  billOfMaterials,
  bomLines,
  routings,
  routingOperations,
  workOrders,
  workOrderOperations,
  materialConsumption,
} from './manufacturing';

export {
  assetCategories,
  fixedAssets,
  assetDepreciations,
  assetMaintenance,
  assetTransfers,
} from './assets';

export {
  notifications,
  auditLogs,
  systemSettings,
} from './notifications';

export {
  documentCategories,
  documents,
  documentVersions,
  documentAccessLog,
  documentShares,
  emailTemplates,
  emailQueue,
  reports,
  scheduledReports,
} from './documents';

export {
  workflows,
  workflowSteps,
  workflowInstances,
  workflowStepExecutions,
  approvals,
  activityFeed,
  comments,
  webhooks,
  webhookLogs,
  apiKeys,
  apiKeyUsage,
  tags,
  entityTags,
} from './workflows';

export {
  aiEmbeddings,
  aiConversations,
  aiInsights,
  aiUsage,
} from './ai';

export * from './audit';

export {
  auditTasks,
  auditFindings,
  riskAssessments,
  riskDataPoints,
  complianceKnowledgeBase,
  complianceChecks,
  complianceConversations,
  commonalityStudies,
  improvementProposals,
  auditSchedules,
  auditConfiguration,
} from './audit';

export {
  moduleRegistry,
  organizationModules,
} from './modules';

export {
  recipeCategories,
  recipes,
  recipeIngredients,
  recipeSteps,
  recipeVersions,
  recipeScaling,
  allergenRegistry,
} from './recipes';

export {
  lots,
  lotMovements,
  productionTraceability,
  productionInputLots,
  haccpControlPoints,
  haccpRecords,
  temperatureLogs,
  productRecalls,
  cleaningRecords,
} from './traceability';

export {
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
} from './payroll';

export * from './integrations';

export {
  integrationConfigs,
  integrationTransactions,
  paymentTransactions,
  smsTransactions,
  shippingTransactions,
  fiscalDeclarations,
  integrationWebhookEvents,
} from './integrations';
