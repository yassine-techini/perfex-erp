import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { organizations } from './users';

/**
 * Available Modules Registry
 * Defines all available modules in the system
 */
export const moduleRegistry = sqliteTable('module_registry', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', {
    enum: ['core', 'industry', 'advanced']
  }).notNull().default('core'),
  icon: text('icon'), // Lucide icon name
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  dependencies: text('dependencies'), // JSON array of module IDs
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Organization Modules
 * Tracks which modules are enabled for each organization
 */
export const organizationModules = sqliteTable('organization_modules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  moduleId: text('module_id')
    .notNull()
    .references(() => moduleRegistry.id),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  settings: text('settings'), // JSON - module-specific settings
  enabledAt: integer('enabled_at', { mode: 'timestamp' }),
  enabledBy: text('enabled_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Type exports
export type ModuleRegistry = typeof moduleRegistry.$inferSelect;
export type InsertModuleRegistry = typeof moduleRegistry.$inferInsert;
export type OrganizationModule = typeof organizationModules.$inferSelect;
export type InsertOrganizationModule = typeof organizationModules.$inferInsert;

/**
 * Default module definitions
 * Used to seed the module_registry table
 */
export const DEFAULT_MODULES = [
  // Core modules (enabled by default)
  { id: 'dashboard', name: 'Tableau de Bord', category: 'core', isDefault: true, sortOrder: 1, icon: 'LayoutDashboard' },
  { id: 'finance', name: 'Finance & Comptabilité', category: 'core', isDefault: true, sortOrder: 2, icon: 'DollarSign' },
  { id: 'crm', name: 'CRM & Ventes', category: 'core', isDefault: true, sortOrder: 3, icon: 'Users' },
  { id: 'inventory', name: 'Inventaire', category: 'core', isDefault: true, sortOrder: 4, icon: 'Package' },
  { id: 'hr', name: 'Ressources Humaines', category: 'core', isDefault: true, sortOrder: 5, icon: 'Briefcase' },
  { id: 'procurement', name: 'Achats', category: 'core', isDefault: true, sortOrder: 6, icon: 'ShoppingCart' },
  { id: 'sales', name: 'Ventes', category: 'core', isDefault: true, sortOrder: 7, icon: 'TrendingUp' },
  { id: 'projects', name: 'Projets', category: 'core', isDefault: true, sortOrder: 8, icon: 'FolderKanban' },
  { id: 'assets', name: 'Actifs', category: 'core', isDefault: true, sortOrder: 9, icon: 'Building2' },
  { id: 'workflows', name: 'Automatisation', category: 'core', isDefault: true, sortOrder: 10, icon: 'Workflow' },
  { id: 'help', name: 'Centre d\'Aide', category: 'core', isDefault: true, sortOrder: 99, icon: 'HelpCircle' },

  // Industry modules (NOT enabled by default)
  { id: 'manufacturing', name: 'Production', category: 'industry', isDefault: false, sortOrder: 11, icon: 'Factory' },
  { id: 'recipes', name: 'Recettes & Formulations', category: 'industry', isDefault: false, sortOrder: 12, icon: 'ChefHat', description: 'Gestion des recettes, formulations, allergènes et valeurs nutritionnelles' },
  { id: 'traceability', name: 'Traçabilité & HACCP', category: 'industry', isDefault: false, sortOrder: 13, icon: 'ScanLine', description: 'Traçabilité des lots, DLC/DDM, contrôles HACCP' },
  { id: 'pos', name: 'Point de Vente', category: 'industry', isDefault: false, sortOrder: 14, icon: 'Store', description: 'Caisse enregistreuse, vente au comptoir' },
  { id: 'quality', name: 'Contrôle Qualité', category: 'industry', isDefault: false, sortOrder: 15, icon: 'ClipboardCheck', description: 'Plans de contrôle, SPC, non-conformités' },
  { id: 'maintenance', name: 'Maintenance (GMAO)', category: 'industry', isDefault: false, sortOrder: 16, icon: 'Wrench', description: 'Maintenance préventive, gestion des équipements' },
  { id: 'mrp', name: 'Planification MRP', category: 'industry', isDefault: false, sortOrder: 17, icon: 'CalendarClock', description: 'Plan directeur de production, calcul des besoins' },

  // Advanced modules (NOT enabled by default)
  { id: 'ai', name: 'Intelligence Artificielle', category: 'advanced', isDefault: false, sortOrder: 20, icon: 'Sparkles' },
  { id: 'audit', name: 'Smart Audit', category: 'advanced', isDefault: false, sortOrder: 21, icon: 'Shield' },
  { id: 'payroll', name: 'Paie', category: 'advanced', isDefault: false, sortOrder: 22, icon: 'Banknote', description: 'Bulletins de salaire, cotisations sociales' },
  { id: 'analytics', name: 'Analytics Avancés', category: 'advanced', isDefault: false, sortOrder: 23, icon: 'BarChart3', description: 'Tableaux de bord avancés, KPIs' },
] as const;
