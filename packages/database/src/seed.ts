/**
 * Database Seed Script
 * Populate the database with sample data for development and testing
 */

import { drizzle } from 'drizzle-orm/d1';
import {
  organizations,
  users,
  organizationMembers,
  roles,
  userRoles,
  accounts,
  fiscalYears,
  taxRates,
  companies,
  contacts,
  pipelineStages,
  departments,
  employees,
  warehouses,
  inventoryItems,
  suppliers,
  assetCategories,
  tags,
} from './schema';

interface SeedContext {
  db: ReturnType<typeof drizzle>;
  organizationId: string;
  userId: string;
}

/**
 * Hash password (simple for demo - use bcrypt in production)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Seed Organizations and Users
 */
async function seedOrganizationsAndUsers(db: ReturnType<typeof drizzle>) {
  console.log('Seeding organizations and users...');

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const now = new Date();

  // Create organization
  await db.insert(organizations).values({
    id: orgId,
    name: 'Demo Company Inc',
    slug: 'demo-company',
    industry: 'Technology',
    size: '50-200',
    country: 'United States',
    timezone: 'America/New_York',
    currency: 'USD',
    fiscalYearEnd: '12-31',
    logoUrl: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // Create admin user
  const passwordHash = await hashPassword('Admin123!');
  await db.insert(users).values({
    id: userId,
    email: 'admin@democompany.com',
    passwordHash,
    firstName: 'Admin',
    lastName: 'User',
    phoneNumber: '+1-555-0100',
    isActive: true,
    isEmailVerified: true,
    emailVerifiedAt: now,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // Create organization membership
  await db.insert(organizationMembers).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role: 'admin',
    joinedAt: now,
  });

  // Create admin role
  const adminRoleId = crypto.randomUUID();
  await db.insert(roles).values({
    id: adminRoleId,
    organizationId: orgId,
    name: 'Administrator',
    description: 'Full system access',
    permissions: JSON.stringify({
      'finance:read': true,
      'finance:create': true,
      'finance:update': true,
      'finance:delete': true,
      'crm:read': true,
      'crm:create': true,
      'crm:update': true,
      'crm:delete': true,
      'projects:read': true,
      'projects:create': true,
      'projects:update': true,
      'projects:delete': true,
      'inventory:read': true,
      'inventory:create': true,
      'inventory:update': true,
      'inventory:delete': true,
      'hr:read': true,
      'hr:create': true,
      'hr:update': true,
      'hr:delete': true,
    }),
    isSystem: true,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  // Assign role to user
  await db.insert(userRoles).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    roleId: adminRoleId,
    assignedAt: now,
  });

  console.log('✓ Created organization and admin user');
  console.log(`  Email: admin@democompany.com`);
  console.log(`  Password: Admin123!`);

  return { organizationId: orgId, userId };
}

/**
 * Seed Finance Data
 */
async function seedFinance(ctx: SeedContext) {
  console.log('Seeding finance data...');

  const now = new Date();

  // Create Chart of Accounts
  const accountIds = {
    cash: crypto.randomUUID(),
    accountsReceivable: crypto.randomUUID(),
    inventory: crypto.randomUUID(),
    equipment: crypto.randomUUID(),
    accountsPayable: crypto.randomUUID(),
    equity: crypto.randomUUID(),
    revenue: crypto.randomUUID(),
    cogs: crypto.randomUUID(),
    expenses: crypto.randomUUID(),
  };

  await ctx.db.insert(accounts).values([
    {
      id: accountIds.cash,
      organizationId: ctx.organizationId,
      code: '1000',
      name: 'Cash',
      type: 'asset',
      category: 'current_asset',
      description: 'Cash on hand and in bank',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountIds.accountsReceivable,
      organizationId: ctx.organizationId,
      code: '1200',
      name: 'Accounts Receivable',
      type: 'asset',
      category: 'current_asset',
      description: 'Money owed by customers',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountIds.inventory,
      organizationId: ctx.organizationId,
      code: '1300',
      name: 'Inventory',
      type: 'asset',
      category: 'current_asset',
      description: 'Products held for sale',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountIds.accountsPayable,
      organizationId: ctx.organizationId,
      code: '2000',
      name: 'Accounts Payable',
      type: 'liability',
      category: 'current_liability',
      description: 'Money owed to suppliers',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountIds.equity,
      organizationId: ctx.organizationId,
      code: '3000',
      name: "Owner's Equity",
      type: 'equity',
      category: 'equity',
      description: 'Owner investment and retained earnings',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountIds.revenue,
      organizationId: ctx.organizationId,
      code: '4000',
      name: 'Sales Revenue',
      type: 'revenue',
      category: 'revenue',
      description: 'Revenue from sales',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountIds.cogs,
      organizationId: ctx.organizationId,
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'expense',
      category: 'direct_cost',
      description: 'Direct costs of products sold',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountIds.expenses,
      organizationId: ctx.organizationId,
      code: '6000',
      name: 'Operating Expenses',
      type: 'expense',
      category: 'operating_expense',
      description: 'General business expenses',
      parentId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Create Fiscal Year
  await ctx.db.insert(fiscalYears).values({
    id: crypto.randomUUID(),
    organizationId: ctx.organizationId,
    name: '2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'open',
    createdBy: ctx.userId,
    createdAt: now,
    updatedAt: now,
  });

  // Create Tax Rates
  await ctx.db.insert(taxRates).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Standard VAT',
      rate: 20.0,
      type: 'sales',
      description: 'Standard VAT rate',
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Reduced VAT',
      rate: 5.0,
      type: 'sales',
      description: 'Reduced VAT rate',
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('✓ Created chart of accounts, fiscal year, and tax rates');
}

/**
 * Seed CRM Data
 */
async function seedCRM(ctx: SeedContext) {
  console.log('Seeding CRM data...');

  const now = new Date();

  // Create Companies
  const companyIds = {
    acmeCorp: crypto.randomUUID(),
    techSolutions: crypto.randomUUID(),
    globalRetail: crypto.randomUUID(),
  };

  await ctx.db.insert(companies).values([
    {
      id: companyIds.acmeCorp,
      organizationId: ctx.organizationId,
      name: 'Acme Corporation',
      type: 'customer',
      industry: 'Technology',
      website: 'https://acmecorp.example.com',
      email: 'info@acmecorp.example.com',
      phone: '+1-555-0101',
      address: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'United States',
      taxId: 'US123456789',
      creditLimit: 50000.0,
      paymentTerms: 'Net 30',
      isActive: true,
      tags: JSON.stringify(['vip', 'technology']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: companyIds.techSolutions,
      organizationId: ctx.organizationId,
      name: 'Tech Solutions Ltd',
      type: 'prospect',
      industry: 'Software',
      website: 'https://techsolutions.example.com',
      email: 'contact@techsolutions.example.com',
      phone: '+1-555-0102',
      address: '456 Innovation Ave',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'United States',
      taxId: null,
      creditLimit: 25000.0,
      paymentTerms: 'Net 30',
      isActive: true,
      tags: JSON.stringify(['software', 'saas']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Create Contacts
  await ctx.db.insert(contacts).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      companyId: companyIds.acmeCorp,
      firstName: 'John',
      lastName: 'Smith',
      title: 'CEO',
      email: 'john.smith@acmecorp.example.com',
      phone: '+1-555-0103',
      mobile: '+1-555-0104',
      isPrimary: true,
      isActive: true,
      tags: JSON.stringify(['decision-maker']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      companyId: companyIds.techSolutions,
      firstName: 'Sarah',
      lastName: 'Johnson',
      title: 'CTO',
      email: 'sarah.johnson@techsolutions.example.com',
      phone: '+1-555-0105',
      mobile: '+1-555-0106',
      isPrimary: true,
      isActive: true,
      tags: JSON.stringify(['technical']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Create Pipeline Stages
  await ctx.db.insert(pipelineStages).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Qualification',
      description: 'Initial lead qualification',
      probability: 10,
      position: 1,
      color: '#3B82F6',
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Needs Analysis',
      description: 'Understanding customer needs',
      probability: 25,
      position: 2,
      color: '#8B5CF6',
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Proposal',
      description: 'Proposal submitted',
      probability: 50,
      position: 3,
      color: '#F59E0B',
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Negotiation',
      description: 'In negotiation phase',
      probability: 75,
      position: 4,
      color: '#10B981',
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Closed Won',
      description: 'Deal won',
      probability: 100,
      position: 5,
      color: '#059669',
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
    },
  ]);

  console.log('✓ Created companies, contacts, and pipeline stages');
}

/**
 * Seed HR Data
 */
async function seedHR(ctx: SeedContext) {
  console.log('Seeding HR data...');

  const now = new Date();

  // Create Departments
  const deptIds = {
    engineering: crypto.randomUUID(),
    sales: crypto.randomUUID(),
    finance: crypto.randomUUID(),
  };

  await ctx.db.insert(departments).values([
    {
      id: deptIds.engineering,
      organizationId: ctx.organizationId,
      code: 'ENG',
      name: 'Engineering',
      description: 'Product development and technology',
      parentId: null,
      managerId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: deptIds.sales,
      organizationId: ctx.organizationId,
      code: 'SALES',
      name: 'Sales',
      description: 'Customer acquisition and revenue',
      parentId: null,
      managerId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: deptIds.finance,
      organizationId: ctx.organizationId,
      code: 'FIN',
      name: 'Finance',
      description: 'Financial management and accounting',
      parentId: null,
      managerId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Create Employees
  await ctx.db.insert(employees).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      employeeNumber: 'EMP001',
      userId: ctx.userId,
      departmentId: deptIds.engineering,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@democompany.com',
      phone: '+1-555-0100',
      jobTitle: 'Chief Technology Officer',
      employmentType: 'full_time',
      hireDate: new Date('2024-01-01'),
      salary: 150000.0,
      currency: 'USD',
      status: 'active',
      managerId: null,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('✓ Created departments and employees');
}

/**
 * Seed Inventory Data
 */
async function seedInventory(ctx: SeedContext) {
  console.log('Seeding inventory data...');

  const now = new Date();

  // Create Warehouses
  const warehouseId = crypto.randomUUID();
  await ctx.db.insert(warehouses).values({
    id: warehouseId,
    organizationId: ctx.organizationId,
    code: 'WH01',
    name: 'Main Warehouse',
    type: 'primary',
    address: '789 Storage Lane',
    city: 'Denver',
    state: 'CO',
    postalCode: '80201',
    country: 'United States',
    isActive: true,
    createdBy: ctx.userId,
    createdAt: now,
    updatedAt: now,
  });

  // Create Inventory Items
  await ctx.db.insert(inventoryItems).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      sku: 'PROD-001',
      name: 'Widget Pro',
      description: 'Professional grade widget',
      type: 'finished_good',
      category: 'Electronics',
      unit: 'piece',
      costPrice: 50.0,
      sellingPrice: 100.0,
      currency: 'USD',
      taxRateId: null,
      reorderLevel: 50,
      reorderQuantity: 200,
      leadTimeDays: 14,
      isActive: true,
      tags: JSON.stringify(['electronics', 'popular']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      sku: 'PROD-002',
      name: 'Gadget Plus',
      description: 'Advanced gadget with premium features',
      type: 'finished_good',
      category: 'Electronics',
      unit: 'piece',
      costPrice: 75.0,
      sellingPrice: 150.0,
      currency: 'USD',
      taxRateId: null,
      reorderLevel: 30,
      reorderQuantity: 100,
      leadTimeDays: 21,
      isActive: true,
      tags: JSON.stringify(['electronics', 'premium']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('✓ Created warehouses and inventory items');
}

/**
 * Seed Procurement Data
 */
async function seedProcurement(ctx: SeedContext) {
  console.log('Seeding procurement data...');

  const now = new Date();

  // Create Suppliers
  await ctx.db.insert(suppliers).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Parts & Components Ltd',
      type: 'manufacturer',
      website: 'https://partsco.example.com',
      email: 'orders@partsco.example.com',
      phone: '+1-555-0201',
      address: '321 Supply Street',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'United States',
      taxId: 'US987654321',
      paymentTerms: 'Net 30',
      creditLimit: 100000.0,
      isActive: true,
      tags: JSON.stringify(['reliable', 'manufacturer']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'Quality Materials Inc',
      type: 'distributor',
      website: 'https://qualitymaterials.example.com',
      email: 'sales@qualitymaterials.example.com',
      phone: '+1-555-0202',
      address: '654 Distribution Blvd',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'United States',
      taxId: 'US555666777',
      paymentTerms: 'Net 45',
      creditLimit: 75000.0,
      isActive: true,
      tags: JSON.stringify(['distributor', 'quality']),
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('✓ Created suppliers');
}

/**
 * Seed Asset Management Data
 */
async function seedAssets(ctx: SeedContext) {
  console.log('Seeding asset management data...');

  const now = new Date();

  // Create Asset Categories
  await ctx.db.insert(assetCategories).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      code: 'COMP',
      name: 'Computer Equipment',
      description: 'Laptops, desktops, servers',
      depreciationMethod: 'straight_line',
      usefulLifeYears: 3,
      salvageValuePercent: 10,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      code: 'FURN',
      name: 'Furniture',
      description: 'Office furniture and fixtures',
      depreciationMethod: 'straight_line',
      usefulLifeYears: 7,
      salvageValuePercent: 5,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      code: 'VEH',
      name: 'Vehicles',
      description: 'Company vehicles',
      depreciationMethod: 'declining_balance',
      usefulLifeYears: 5,
      salvageValuePercent: 15,
      isActive: true,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('✓ Created asset categories');
}

/**
 * Seed Tags
 */
async function seedTags(ctx: SeedContext) {
  console.log('Seeding tags...');

  const now = new Date();

  await ctx.db.insert(tags).values([
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'urgent',
      color: '#EF4444',
      description: 'Requires immediate attention',
      category: 'priority',
      usageCount: 0,
      createdBy: ctx.userId,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'important',
      color: '#F59E0B',
      description: 'High priority item',
      category: 'priority',
      usageCount: 0,
      createdBy: ctx.userId,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'vip',
      color: '#8B5CF6',
      description: 'VIP customer or contact',
      category: 'customer',
      usageCount: 0,
      createdBy: ctx.userId,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: ctx.organizationId,
      name: 'archived',
      color: '#6B7280',
      description: 'Archived for reference',
      category: 'status',
      usageCount: 0,
      createdBy: ctx.userId,
      createdAt: now,
    },
  ]);

  console.log('✓ Created tags');
}

/**
 * Main seed function
 */
export async function seed(db: ReturnType<typeof drizzle>) {
  console.log('🌱 Starting database seed...\n');

  try {
    // Step 1: Create organization and admin user
    const { organizationId, userId } = await seedOrganizationsAndUsers(db);

    const ctx: SeedContext = {
      db,
      organizationId,
      userId,
    };

    // Step 2: Seed all modules
    await seedFinance(ctx);
    await seedCRM(ctx);
    await seedHR(ctx);
    await seedInventory(ctx);
    await seedProcurement(ctx);
    await seedAssets(ctx);
    await seedTags(ctx);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Demo Login Credentials:');
    console.log('   Email: admin@democompany.com');
    console.log('   Password: Admin123!');
    console.log('\n🎉 You can now start using Perfex ERP!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

/**
 * Run seed if executed directly
 */
if (require.main === module) {
  console.log('Please run this seed script using the appropriate command');
  console.log('Example: wrangler d1 execute perfex-db --local --file=./seed.sql');
}
