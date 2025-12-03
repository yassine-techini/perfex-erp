/**
 * Recipe Form Page
 * Create and edit recipes with ingredients and steps
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  Clock,
  Thermometer,
  Info,
} from 'lucide-react';

interface RecipeFormData {
  code: string;
  name: string;
  description: string;
  categoryId: string;
  status: 'draft' | 'active' | 'archived';
  yieldQuantity: number;
  yieldUnit: string;
  batchSize: number;
  prepTime: number;
  restTime: number;
  cookTime: number;
  laborCostPerBatch: number;
  overheadCostPerBatch: number;
  sellingPrice: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  salt: number;
  allergens: string[];
  shelfLife: number;
  storageConditions: string;
  notes: string;
}

interface Ingredient {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  isOptional: boolean;
  notes: string;
}

interface Step {
  id?: string;
  stepNumber: number;
  title: string;
  instructions: string;
  duration: number;
  temperature: number;
  temperatureUnit: 'C' | 'F';
  tips: string;
  criticalControlPoint: boolean;
}

const API_URL = import.meta.env.VITE_API_URL;

const EU_ALLERGENS = [
  { id: 'gluten', name: 'Gluten' },
  { id: 'crustaceans', name: 'Crustacés' },
  { id: 'eggs', name: 'Œufs' },
  { id: 'fish', name: 'Poisson' },
  { id: 'peanuts', name: 'Arachides' },
  { id: 'soybeans', name: 'Soja' },
  { id: 'milk', name: 'Lait' },
  { id: 'nuts', name: 'Fruits à coque' },
  { id: 'celery', name: 'Céleri' },
  { id: 'mustard', name: 'Moutarde' },
  { id: 'sesame', name: 'Sésame' },
  { id: 'sulphites', name: 'Sulfites' },
  { id: 'lupin', name: 'Lupin' },
  { id: 'molluscs', name: 'Mollusques' },
];

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'unité', 'c.à.s', 'c.à.c'];

export function RecipeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);
  const token = localStorage.getItem('accessToken');

  const [activeTab, setActiveTab] = useState<'general' | 'ingredients' | 'steps' | 'nutrition'>('general');
  const [formData, setFormData] = useState<RecipeFormData>({
    code: '',
    name: '',
    description: '',
    categoryId: '',
    status: 'draft',
    yieldQuantity: 1,
    yieldUnit: 'pcs',
    batchSize: 1,
    prepTime: 0,
    restTime: 0,
    cookTime: 0,
    laborCostPerBatch: 0,
    overheadCostPerBatch: 0,
    sellingPrice: 0,
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    salt: 0,
    allergens: [],
    shelfLife: 0,
    storageConditions: '',
    notes: '',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['recipe-categories'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/recipes/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      return data.data;
    },
  });

  // Fetch recipe if editing
  const { data: recipe } = useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/recipes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch recipe');
      const data = await response.json();
      return data.data;
    },
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (recipe) {
      setFormData({
        code: recipe.code || '',
        name: recipe.name || '',
        description: recipe.description || '',
        categoryId: recipe.categoryId || '',
        status: recipe.status || 'draft',
        yieldQuantity: recipe.yieldQuantity || 1,
        yieldUnit: recipe.yieldUnit || 'pcs',
        batchSize: recipe.batchSize || 1,
        prepTime: recipe.prepTime || 0,
        restTime: recipe.restTime || 0,
        cookTime: recipe.cookTime || 0,
        laborCostPerBatch: recipe.laborCostPerBatch || 0,
        overheadCostPerBatch: recipe.overheadCostPerBatch || 0,
        sellingPrice: recipe.sellingPrice || 0,
        calories: recipe.calories || 0,
        protein: recipe.protein || 0,
        carbohydrates: recipe.carbohydrates || 0,
        fat: recipe.fat || 0,
        fiber: recipe.fiber || 0,
        sugar: recipe.sugar || 0,
        salt: recipe.salt || 0,
        allergens: recipe.allergens ? JSON.parse(recipe.allergens) : [],
        shelfLife: recipe.shelfLife || 0,
        storageConditions: recipe.storageConditions || '',
        notes: recipe.notes || '',
      });
      if (recipe.ingredients) setIngredients(recipe.ingredients);
      if (recipe.steps) setSteps(recipe.steps);
    }
  }, [recipe]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = isEditing ? `${API_URL}/recipes/${id}` : `${API_URL}/recipes`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          totalTime: data.prepTime + data.restTime + data.cookTime,
        }),
      });

      if (!response.ok) throw new Error('Failed to save recipe');
      return response.json();
    },
    onSuccess: async (result) => {
      const recipeId = result.data.id;

      // Save ingredients
      for (const ingredient of ingredients) {
        if (ingredient.id) {
          await fetch(`${API_URL}/recipes/${recipeId}/ingredients/${ingredient.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(ingredient),
          });
        } else {
          await fetch(`${API_URL}/recipes/${recipeId}/ingredients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(ingredient),
          });
        }
      }

      // Save steps
      for (const step of steps) {
        if (step.id) {
          await fetch(`${API_URL}/recipes/${recipeId}/steps/${step.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(step),
          });
        } else {
          await fetch(`${API_URL}/recipes/${recipeId}/steps`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(step),
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      navigate('/recipes');
    },
  });

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        name: '',
        quantity: 0,
        unit: 'g',
        costPerUnit: 0,
        isOptional: false,
        notes: '',
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: unknown) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        title: '',
        instructions: '',
        duration: 0,
        temperature: 0,
        temperatureUnit: 'C',
        tips: '',
        criticalControlPoint: false,
      },
    ]);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      stepNumber: i + 1,
    }));
    setSteps(updated);
  };

  const updateStep = (index: number, field: keyof Step, value: unknown) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const toggleAllergen = (allergenId: string) => {
    setFormData((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergenId)
        ? prev.allergens.filter((a) => a !== allergenId)
        : [...prev.allergens, allergenId],
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/recipes')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Modifier la recette' : 'Nouvelle recette'}
            </h1>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-5 w-5 mr-2" />
          {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: 'Informations générales' },
            { id: 'ingredients', label: 'Ingrédients' },
            { id: 'steps', label: 'Étapes' },
            { id: 'nutrition', label: 'Nutrition & Allergènes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code recette *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="REC-001"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Catégorie
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories?.map((cat: { id: string; name: string }) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom de la recette *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pain au chocolat"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rendement *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={formData.yieldQuantity}
                    onChange={(e) => setFormData({ ...formData, yieldQuantity: parseFloat(e.target.value) })}
                    min="0"
                    step="0.1"
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <select
                    value={formData.yieldUnit}
                    onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
                    className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'active' | 'archived' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="draft">Brouillon</option>
                  <option value="active">Active</option>
                  <option value="archived">Archivée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prix de vente (€)
                </label>
                <input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Préparation (min)
                </label>
                <input
                  type="number"
                  value={formData.prepTime}
                  onChange={(e) => setFormData({ ...formData, prepTime: parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Repos (min)
                </label>
                <input
                  type="number"
                  value={formData.restTime}
                  onChange={(e) => setFormData({ ...formData, restTime: parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Cuisson (min)
                </label>
                <input
                  type="number"
                  value={formData.cookTime}
                  onChange={(e) => setFormData({ ...formData, cookTime: parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DLC (jours)
                </label>
                <input
                  type="number"
                  value={formData.shelfLife}
                  onChange={(e) => setFormData({ ...formData, shelfLife: parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Conditions de stockage
              </label>
              <input
                type="text"
                value={formData.storageConditions}
                onChange={(e) => setFormData({ ...formData, storageConditions: e.target.value })}
                placeholder="Conserver au frais entre 2°C et 4°C"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Ingredients Tab */}
        {activeTab === 'ingredients' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Ingrédients ({ingredients.length})
              </h3>
              <button
                type="button"
                onClick={addIngredient}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun ingrédient. Cliquez sur "Ajouter" pour commencer.
              </div>
            ) : (
              <div className="space-y-4">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <GripVertical className="h-5 w-5 text-gray-400 mt-2 cursor-move" />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={ingredient.name}
                          onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                          placeholder="Nom de l'ingrédient"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={ingredient.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                          placeholder="Qté"
                          min="0"
                          step="0.1"
                          className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <select
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          value={ingredient.costPerUnit}
                          onChange={(e) => updateIngredient(index, 'costPerUnit', parseFloat(e.target.value))}
                          placeholder="Coût/unité"
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={ingredient.isOptional}
                            onChange={(e) => updateIngredient(index, 'isOptional', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Optionnel</span>
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Steps Tab */}
        {activeTab === 'steps' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Étapes de production ({steps.length})
              </h3>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une étape
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune étape. Cliquez sur "Ajouter une étape" pour commencer.
              </div>
            ) : (
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      step.criticalControlPoint
                        ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <input
                              type="text"
                              value={step.title}
                              onChange={(e) => updateStep(index, 'title', e.target.value)}
                              placeholder="Titre de l'étape"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-1" />
                              <input
                                type="number"
                                value={step.duration}
                                onChange={(e) => updateStep(index, 'duration', parseInt(e.target.value))}
                                placeholder="min"
                                min="0"
                                className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div className="flex items-center">
                              <Thermometer className="h-4 w-4 text-gray-400 mr-1" />
                              <input
                                type="number"
                                value={step.temperature}
                                onChange={(e) => updateStep(index, 'temperature', parseInt(e.target.value))}
                                placeholder="°C"
                                className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <textarea
                            value={step.instructions}
                            onChange={(e) => updateStep(index, 'instructions', e.target.value)}
                            placeholder="Instructions détaillées..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={step.criticalControlPoint}
                              onChange={(e) => updateStep(index, 'criticalControlPoint', e.target.checked)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="ml-2 text-sm text-red-600 font-medium flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Point critique (CCP HACCP)
                            </span>
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nutrition Tab */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6">
            {/* Allergens */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                Allergènes (14 allergènes UE)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {EU_ALLERGENS.map((allergen) => (
                  <button
                    key={allergen.id}
                    type="button"
                    onClick={() => toggleAllergen(allergen.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.allergens.includes(allergen.id)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {allergen.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Nutritional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Info className="h-5 w-5 text-blue-500 mr-2" />
                Valeurs nutritionnelles (pour 100g)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: parseFloat(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Protéines (g)
                  </label>
                  <input
                    type="number"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) })}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Glucides (g)
                  </label>
                  <input
                    type="number"
                    value={formData.carbohydrates}
                    onChange={(e) => setFormData({ ...formData, carbohydrates: parseFloat(e.target.value) })}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    dont Sucres (g)
                  </label>
                  <input
                    type="number"
                    value={formData.sugar}
                    onChange={(e) => setFormData({ ...formData, sugar: parseFloat(e.target.value) })}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lipides (g)
                  </label>
                  <input
                    type="number"
                    value={formData.fat}
                    onChange={(e) => setFormData({ ...formData, fat: parseFloat(e.target.value) })}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fibres (g)
                  </label>
                  <input
                    type="number"
                    value={formData.fiber}
                    onChange={(e) => setFormData({ ...formData, fiber: parseFloat(e.target.value) })}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sel (g)
                  </label>
                  <input
                    type="number"
                    value={formData.salt}
                    onChange={(e) => setFormData({ ...formData, salt: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
