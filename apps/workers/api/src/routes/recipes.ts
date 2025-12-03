/**
 * Recipes API Routes
 * Manage recipes, ingredients, and production formulations
 */

import { Hono } from 'hono';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { recipeService } from '../services/recipe.service';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// ============================================
// CATEGORIES
// ============================================

/**
 * GET /recipes/categories
 * List all recipe categories
 */
app.get('/categories', requirePermissions('recipes:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const categories = await recipeService.listCategories(organizationId);

  return c.json({
    success: true,
    data: categories,
  });
});

/**
 * POST /recipes/categories
 * Create a new category
 */
app.post('/categories', requirePermissions('recipes:create'), async (c) => {
  const organizationId = c.get('organizationId');
  const body = await c.req.json();

  const category = await recipeService.createCategory({
    organizationId,
    name: body.name,
    description: body.description,
    parentId: body.parentId,
    sortOrder: body.sortOrder || 0,
  });

  return c.json({
    success: true,
    data: category,
  }, 201);
});

/**
 * PUT /recipes/categories/:id
 * Update a category
 */
app.put('/categories/:id', requirePermissions('recipes:update'), async (c) => {
  const organizationId = c.get('organizationId');
  const categoryId = c.req.param('id');
  const body = await c.req.json();

  const category = await recipeService.updateCategory(categoryId, organizationId, body);

  if (!category) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Category not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: category,
  });
});

/**
 * DELETE /recipes/categories/:id
 * Delete a category
 */
app.delete('/categories/:id', requirePermissions('recipes:delete'), async (c) => {
  const organizationId = c.get('organizationId');
  const categoryId = c.req.param('id');

  await recipeService.deleteCategory(categoryId, organizationId);

  return c.json({
    success: true,
    message: 'Category deleted',
  });
});

// ============================================
// RECIPES
// ============================================

/**
 * GET /recipes
 * List all recipes with optional filters
 */
app.get('/', requirePermissions('recipes:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const categoryId = c.req.query('categoryId');
  const status = c.req.query('status');
  const search = c.req.query('search');

  const recipes = await recipeService.listRecipes(organizationId, {
    categoryId,
    status,
    search,
  });

  return c.json({
    success: true,
    data: recipes,
  });
});

/**
 * GET /recipes/stats
 * Get recipe statistics
 */
app.get('/stats', requirePermissions('recipes:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const stats = await recipeService.getStats(organizationId);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /recipes/:id
 * Get a single recipe with all details
 */
app.get('/:id', requirePermissions('recipes:read'), async (c) => {
  const organizationId = c.get('organizationId');
  const recipeId = c.req.param('id');

  const recipe = await recipeService.getRecipeById(organizationId, recipeId);

  if (!recipe) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Recipe not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: recipe,
  });
});

/**
 * POST /recipes
 * Create a new recipe
 */
app.post('/', requirePermissions('recipes:create'), async (c) => {
  const organizationId = c.get('organizationId');
  const userId = c.get('userId');
  const body = await c.req.json();

  const recipe = await recipeService.createRecipe({
    organizationId,
    categoryId: body.categoryId,
    code: body.code,
    name: body.name,
    description: body.description,
    yieldQuantity: body.yieldQuantity,
    yieldUnit: body.yieldUnit,
    batchSize: body.batchSize,
    prepTime: body.prepTime,
    restTime: body.restTime,
    cookTime: body.cookTime,
    totalTime: body.totalTime,
    laborCostPerBatch: body.laborCostPerBatch,
    overheadCostPerBatch: body.overheadCostPerBatch,
    sellingPrice: body.sellingPrice,
    nutritionPer: body.nutritionPer,
    calories: body.calories,
    protein: body.protein,
    carbohydrates: body.carbohydrates,
    fat: body.fat,
    fiber: body.fiber,
    sugar: body.sugar,
    salt: body.salt,
    allergens: body.allergens ? JSON.stringify(body.allergens) : null,
    shelfLife: body.shelfLife,
    storageConditions: body.storageConditions,
    notes: body.notes,
    imageUrl: body.imageUrl,
    createdBy: userId,
    status: body.status || 'draft',
  });

  return c.json({
    success: true,
    data: recipe,
  }, 201);
});

/**
 * PUT /recipes/:id
 * Update a recipe
 */
app.put('/:id', requirePermissions('recipes:update'), async (c) => {
  const organizationId = c.get('organizationId');
  const recipeId = c.req.param('id');
  const body = await c.req.json();

  if (body.allergens && Array.isArray(body.allergens)) {
    body.allergens = JSON.stringify(body.allergens);
  }

  const recipe = await recipeService.updateRecipe(recipeId, organizationId, body);

  if (!recipe) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Recipe not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: recipe,
  });
});

/**
 * DELETE /recipes/:id
 * Delete a recipe
 */
app.delete('/:id', requirePermissions('recipes:delete'), async (c) => {
  const organizationId = c.get('organizationId');
  const recipeId = c.req.param('id');

  await recipeService.deleteRecipe(recipeId, organizationId);

  return c.json({
    success: true,
    message: 'Recipe deleted',
  });
});

// ============================================
// INGREDIENTS
// ============================================

/**
 * POST /recipes/:id/ingredients
 * Add ingredient to recipe
 */
app.post('/:id/ingredients', requirePermissions('recipes:update'), async (c) => {
  const recipeId = c.req.param('id');
  const body = await c.req.json();

  const ingredient = await recipeService.addIngredient({
    recipeId,
    inventoryItemId: body.inventoryItemId,
    name: body.name,
    quantity: body.quantity,
    unit: body.unit,
    costPerUnit: body.costPerUnit,
    sortOrder: body.sortOrder || 0,
    isOptional: body.isOptional || false,
    notes: body.notes,
    allergens: body.allergens ? JSON.stringify(body.allergens) : null,
  });

  return c.json({
    success: true,
    data: ingredient,
  }, 201);
});

/**
 * PUT /recipes/:id/ingredients/:ingredientId
 * Update an ingredient
 */
app.put('/:id/ingredients/:ingredientId', requirePermissions('recipes:update'), async (c) => {
  const ingredientId = c.req.param('ingredientId');
  const body = await c.req.json();

  if (body.allergens && Array.isArray(body.allergens)) {
    body.allergens = JSON.stringify(body.allergens);
  }

  const ingredient = await recipeService.updateIngredient(ingredientId, body);

  return c.json({
    success: true,
    data: ingredient,
  });
});

/**
 * DELETE /recipes/:id/ingredients/:ingredientId
 * Delete an ingredient
 */
app.delete('/:id/ingredients/:ingredientId', requirePermissions('recipes:delete'), async (c) => {
  const ingredientId = c.req.param('ingredientId');

  await recipeService.deleteIngredient(ingredientId);

  return c.json({
    success: true,
    message: 'Ingredient deleted',
  });
});

// ============================================
// STEPS
// ============================================

/**
 * POST /recipes/:id/steps
 * Add step to recipe
 */
app.post('/:id/steps', requirePermissions('recipes:update'), async (c) => {
  const recipeId = c.req.param('id');
  const body = await c.req.json();

  const step = await recipeService.addStep({
    recipeId,
    stepNumber: body.stepNumber,
    title: body.title,
    instructions: body.instructions,
    duration: body.duration,
    temperature: body.temperature,
    temperatureUnit: body.temperatureUnit,
    imageUrl: body.imageUrl,
    tips: body.tips,
    criticalControlPoint: body.criticalControlPoint || false,
    ccpLimits: body.ccpLimits ? JSON.stringify(body.ccpLimits) : null,
  });

  return c.json({
    success: true,
    data: step,
  }, 201);
});

/**
 * PUT /recipes/:id/steps/:stepId
 * Update a step
 */
app.put('/:id/steps/:stepId', requirePermissions('recipes:update'), async (c) => {
  const stepId = c.req.param('stepId');
  const body = await c.req.json();

  if (body.ccpLimits && typeof body.ccpLimits === 'object') {
    body.ccpLimits = JSON.stringify(body.ccpLimits);
  }

  const step = await recipeService.updateStep(stepId, body);

  return c.json({
    success: true,
    data: step,
  });
});

/**
 * DELETE /recipes/:id/steps/:stepId
 * Delete a step
 */
app.delete('/:id/steps/:stepId', requirePermissions('recipes:delete'), async (c) => {
  const stepId = c.req.param('stepId');

  await recipeService.deleteStep(stepId);

  return c.json({
    success: true,
    message: 'Step deleted',
  });
});

// ============================================
// VERSIONS
// ============================================

/**
 * GET /recipes/:id/versions
 * Get version history
 */
app.get('/:id/versions', requirePermissions('recipes:read'), async (c) => {
  const recipeId = c.req.param('id');
  const versions = await recipeService.getVersionHistory(recipeId);

  return c.json({
    success: true,
    data: versions,
  });
});

/**
 * POST /recipes/:id/versions
 * Create a new version snapshot
 */
app.post('/:id/versions', requirePermissions('recipes:update'), async (c) => {
  const recipeId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json();

  const version = await recipeService.createVersion(recipeId, body.changes, userId);

  if (!version) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Recipe not found' },
    }, 404);
  }

  return c.json({
    success: true,
    data: version,
  }, 201);
});

export default app;
