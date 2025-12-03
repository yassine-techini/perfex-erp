/**
 * Recipe Service
 * Business logic for recipe management
 */

import { eq, and, desc, like, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  recipes,
  recipeCategories,
  recipeIngredients,
  recipeSteps,
  recipeVersions,
  recipeScaling,
  type InsertRecipe,
  type InsertRecipeCategory,
  type InsertRecipeIngredient,
  type InsertRecipeStep,
} from '@perfex/database';

export const recipeService = {
  // ============================================
  // CATEGORIES
  // ============================================

  async listCategories(organizationId: string) {
    const db = getDb();
    return db
      .select()
      .from(recipeCategories)
      .where(eq(recipeCategories.organizationId, organizationId))
      .orderBy(recipeCategories.sortOrder);
  },

  async createCategory(data: InsertRecipeCategory) {
    const db = getDb();
    const [category] = await db.insert(recipeCategories).values(data).returning();
    return category;
  },

  async updateCategory(id: string, organizationId: string, data: Partial<InsertRecipeCategory>) {
    const db = getDb();
    const [category] = await db
      .update(recipeCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(recipeCategories.id, id), eq(recipeCategories.organizationId, organizationId)))
      .returning();
    return category;
  },

  async deleteCategory(id: string, organizationId: string) {
    const db = getDb();
    await db
      .delete(recipeCategories)
      .where(and(eq(recipeCategories.id, id), eq(recipeCategories.organizationId, organizationId)));
  },

  // ============================================
  // RECIPES
  // ============================================

  async listRecipes(
    organizationId: string,
    filters?: {
      categoryId?: string;
      status?: string;
      search?: string;
    }
  ) {
    const db = getDb();
    let query = db
      .select()
      .from(recipes)
      .where(eq(recipes.organizationId, organizationId));

    // Note: Drizzle doesn't support dynamic where chaining easily,
    // so we'll filter in-memory for complex cases
    const results = await query.orderBy(desc(recipes.updatedAt));

    return results.filter((r) => {
      if (filters?.categoryId && r.categoryId !== filters.categoryId) return false;
      if (filters?.status && r.status !== filters.status) return false;
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        if (!r.name.toLowerCase().includes(search) && !r.code.toLowerCase().includes(search)) {
          return false;
        }
      }
      return true;
    });
  },

  async getRecipeById(organizationId: string, id: string) {
    const db = getDb();
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.organizationId, organizationId)));

    if (!recipe) return null;

    // Get ingredients
    const ingredients = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, id))
      .orderBy(recipeIngredients.sortOrder);

    // Get steps
    const steps = await db
      .select()
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, id))
      .orderBy(recipeSteps.stepNumber);

    // Get scaling options
    const scaling = await db
      .select()
      .from(recipeScaling)
      .where(eq(recipeScaling.recipeId, id));

    return {
      ...recipe,
      ingredients,
      steps,
      scaling,
    };
  },

  async createRecipe(data: InsertRecipe) {
    const db = getDb();
    const [recipe] = await db.insert(recipes).values(data).returning();
    return recipe;
  },

  async updateRecipe(id: string, organizationId: string, data: Partial<InsertRecipe>) {
    const db = getDb();
    const [recipe] = await db
      .update(recipes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(recipes.id, id), eq(recipes.organizationId, organizationId)))
      .returning();
    return recipe;
  },

  async deleteRecipe(id: string, organizationId: string) {
    const db = getDb();
    // Delete related records first
    await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    await db.delete(recipeSteps).where(eq(recipeSteps.recipeId, id));
    await db.delete(recipeScaling).where(eq(recipeScaling.recipeId, id));
    await db.delete(recipeVersions).where(eq(recipeVersions.recipeId, id));
    // Delete recipe
    await db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.organizationId, organizationId)));
  },

  // ============================================
  // INGREDIENTS
  // ============================================

  async addIngredient(data: InsertRecipeIngredient) {
    const db = getDb();
    const [ingredient] = await db.insert(recipeIngredients).values(data).returning();
    return ingredient;
  },

  async updateIngredient(id: string, data: Partial<InsertRecipeIngredient>) {
    const db = getDb();
    const [ingredient] = await db
      .update(recipeIngredients)
      .set(data)
      .where(eq(recipeIngredients.id, id))
      .returning();
    return ingredient;
  },

  async deleteIngredient(id: string) {
    const db = getDb();
    await db.delete(recipeIngredients).where(eq(recipeIngredients.id, id));
  },

  // ============================================
  // STEPS
  // ============================================

  async addStep(data: InsertRecipeStep) {
    const db = getDb();
    const [step] = await db.insert(recipeSteps).values(data).returning();
    return step;
  },

  async updateStep(id: string, data: Partial<InsertRecipeStep>) {
    const db = getDb();
    const [step] = await db
      .update(recipeSteps)
      .set(data)
      .where(eq(recipeSteps.id, id))
      .returning();
    return step;
  },

  async deleteStep(id: string) {
    const db = getDb();
    await db.delete(recipeSteps).where(eq(recipeSteps.id, id));
  },

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(organizationId: string) {
    const db = getDb();

    const allRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.organizationId, organizationId));

    const totalRecipes = allRecipes.length;
    const activeRecipes = allRecipes.filter((r) => r.status === 'active').length;
    const draftRecipes = allRecipes.filter((r) => r.status === 'draft').length;

    const categories = await db
      .select()
      .from(recipeCategories)
      .where(eq(recipeCategories.organizationId, organizationId));

    return {
      totalRecipes,
      activeRecipes,
      draftRecipes,
      totalCategories: categories.length,
    };
  },

  // ============================================
  // VERSION CONTROL
  // ============================================

  async createVersion(recipeId: string, changes: string, createdBy?: string) {
    const db = getDb();

    // Get current recipe data
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    if (!recipe) return null;

    const ingredients = await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));

    const steps = await db
      .select()
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, recipeId));

    const snapshot = JSON.stringify({ recipe, ingredients, steps });

    const [version] = await db
      .insert(recipeVersions)
      .values({
        recipeId,
        version: recipe.version,
        changes,
        snapshot,
        createdBy,
      })
      .returning();

    // Increment recipe version
    await db
      .update(recipes)
      .set({ version: recipe.version + 1, updatedAt: new Date() })
      .where(eq(recipes.id, recipeId));

    return version;
  },

  async getVersionHistory(recipeId: string) {
    const db = getDb();
    return db
      .select()
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId))
      .orderBy(desc(recipeVersions.version));
  },
};
