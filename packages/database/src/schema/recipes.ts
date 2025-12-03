import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { organizations } from './users';
import { inventoryItems } from './inventory';

/**
 * Recipe Categories
 * Categories for organizing recipes
 */
export const recipeCategories = sqliteTable('recipe_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
  parentId: text('parent_id'), // Self-reference for hierarchy
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Recipes
 * Main recipes/formulations table
 */
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  categoryId: text('category_id').references(() => recipeCategories.id),
  code: text('code').notNull(), // Recipe code/reference
  name: text('name').notNull(),
  description: text('description'),
  version: integer('version').notNull().default(1),
  status: text('status', {
    enum: ['draft', 'active', 'archived']
  }).notNull().default('draft'),

  // Production info
  yieldQuantity: real('yield_quantity').notNull(), // Quantity produced
  yieldUnit: text('yield_unit').notNull(), // kg, pcs, etc.
  batchSize: real('batch_size'), // Standard batch size

  // Times (in minutes)
  prepTime: integer('prep_time'), // Preparation time
  restTime: integer('rest_time'), // Resting/proofing time
  cookTime: integer('cook_time'), // Cooking/baking time
  totalTime: integer('total_time'), // Total production time

  // Costs
  laborCostPerBatch: real('labor_cost_per_batch'),
  overheadCostPerBatch: real('overhead_cost_per_batch'),
  calculatedCost: real('calculated_cost'), // Auto-calculated from ingredients
  sellingPrice: real('selling_price'),
  marginPercent: real('margin_percent'),

  // Nutritional info (per 100g or per unit)
  nutritionPer: text('nutrition_per', { enum: ['100g', 'unit'] }).default('100g'),
  calories: real('calories'),
  protein: real('protein'),
  carbohydrates: real('carbohydrates'),
  fat: real('fat'),
  saturatedFat: real('saturated_fat'),
  fiber: real('fiber'),
  sugar: real('sugar'),
  salt: real('salt'),

  // Allergens (JSON array)
  allergens: text('allergens'), // ['gluten', 'milk', 'eggs', 'nuts', etc.]

  // Additional info
  shelfLife: integer('shelf_life'), // In days
  storageConditions: text('storage_conditions'),
  equipmentNeeded: text('equipment_needed'), // JSON array
  notes: text('notes'),
  imageUrl: text('image_url'),

  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Recipe Ingredients
 * Ingredients/components for each recipe
 */
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id),
  inventoryItemId: text('inventory_item_id')
    .references(() => inventoryItems.id), // Link to inventory
  name: text('name').notNull(), // Ingredient name (can be manual or from inventory)
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(), // kg, g, l, ml, pcs, etc.
  costPerUnit: real('cost_per_unit'),
  totalCost: real('total_cost'), // Calculated
  sortOrder: integer('sort_order').notNull().default(0),
  isOptional: integer('is_optional', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  allergens: text('allergens'), // JSON array - inherited from inventory or manual
});

/**
 * Recipe Steps
 * Production steps/instructions
 */
export const recipeSteps = sqliteTable('recipe_steps', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id),
  stepNumber: integer('step_number').notNull(),
  title: text('title'),
  instructions: text('instructions').notNull(),
  duration: integer('duration'), // In minutes
  temperature: real('temperature'), // For baking
  temperatureUnit: text('temperature_unit', { enum: ['C', 'F'] }).default('C'),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  tips: text('tips'),
  criticalControlPoint: integer('critical_control_point', { mode: 'boolean' }).notNull().default(false), // HACCP CCP
  ccpLimits: text('ccp_limits'), // JSON - critical limits for CCP
});

/**
 * Recipe Versions
 * Version history for recipes
 */
export const recipeVersions = sqliteTable('recipe_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id),
  version: integer('version').notNull(),
  changes: text('changes'), // Description of changes
  snapshot: text('snapshot').notNull(), // JSON - full recipe data at this version
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/**
 * Recipe Scaling
 * Pre-calculated scaling factors for different batch sizes
 */
export const recipeScaling = sqliteTable('recipe_scaling', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id),
  scaleName: text('scale_name').notNull(), // e.g., "x2", "x10", "50 pcs"
  scaleFactor: real('scale_factor').notNull(),
  adjustedIngredients: text('adjusted_ingredients'), // JSON - any non-linear adjustments
  notes: text('notes'),
});

/**
 * Allergen Registry
 * Standard allergen definitions
 */
export const allergenRegistry = sqliteTable('allergen_registry', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameFr: text('name_fr').notNull(),
  icon: text('icon'),
  severity: text('severity', { enum: ['high', 'medium', 'low'] }).notNull().default('high'),
  description: text('description'),
});

// Type exports
export type RecipeCategory = typeof recipeCategories.$inferSelect;
export type InsertRecipeCategory = typeof recipeCategories.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = typeof recipeIngredients.$inferInsert;
export type RecipeStep = typeof recipeSteps.$inferSelect;
export type InsertRecipeStep = typeof recipeSteps.$inferInsert;
export type RecipeVersion = typeof recipeVersions.$inferSelect;
export type InsertRecipeVersion = typeof recipeVersions.$inferInsert;
export type RecipeScaling = typeof recipeScaling.$inferSelect;
export type InsertRecipeScaling = typeof recipeScaling.$inferInsert;
export type AllergenRegistry = typeof allergenRegistry.$inferSelect;
export type InsertAllergenRegistry = typeof allergenRegistry.$inferInsert;

/**
 * Standard EU allergens list
 */
export const EU_ALLERGENS = [
  { id: 'gluten', name: 'Gluten', nameFr: 'Gluten', severity: 'high' },
  { id: 'crustaceans', name: 'Crustaceans', nameFr: 'Crustacés', severity: 'high' },
  { id: 'eggs', name: 'Eggs', nameFr: 'Œufs', severity: 'high' },
  { id: 'fish', name: 'Fish', nameFr: 'Poisson', severity: 'high' },
  { id: 'peanuts', name: 'Peanuts', nameFr: 'Arachides', severity: 'high' },
  { id: 'soybeans', name: 'Soybeans', nameFr: 'Soja', severity: 'high' },
  { id: 'milk', name: 'Milk', nameFr: 'Lait', severity: 'high' },
  { id: 'nuts', name: 'Tree nuts', nameFr: 'Fruits à coque', severity: 'high' },
  { id: 'celery', name: 'Celery', nameFr: 'Céleri', severity: 'medium' },
  { id: 'mustard', name: 'Mustard', nameFr: 'Moutarde', severity: 'medium' },
  { id: 'sesame', name: 'Sesame', nameFr: 'Sésame', severity: 'high' },
  { id: 'sulphites', name: 'Sulphites', nameFr: 'Sulfites', severity: 'medium' },
  { id: 'lupin', name: 'Lupin', nameFr: 'Lupin', severity: 'medium' },
  { id: 'molluscs', name: 'Molluscs', nameFr: 'Mollusques', severity: 'high' },
] as const;
