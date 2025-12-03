/**
 * Recipes Page
 * Manage recipes, ingredients, and production formulations
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChefHat,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface Recipe {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  status: 'draft' | 'active' | 'archived';
  yieldQuantity: number;
  yieldUnit: string;
  prepTime: number | null;
  cookTime: number | null;
  totalTime: number | null;
  calculatedCost: number | null;
  sellingPrice: number | null;
  marginPercent: number | null;
  allergens: string | null;
  imageUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface RecipeCategory {
  id: string;
  name: string;
  description: string | null;
}

const API_URL = import.meta.env.VITE_API_URL;

export function RecipesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const token = localStorage.getItem('accessToken');

  // Fetch recipes
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', statusFilter, categoryFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/recipes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      return data.data as Recipe[];
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['recipe-categories'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/recipes/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      return data.data as RecipeCategory[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['recipe-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/recipes/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/recipes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete recipe');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-stats'] });
      setShowDeleteConfirm(false);
      setSelectedRecipe(null);
    },
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const parseAllergens = (allergensJson: string | null): string[] => {
    if (!allergensJson) return [];
    try {
      return JSON.parse(allergensJson);
    } catch {
      return [];
    }
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recettes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez vos recettes, formulations et fiches techniques
          </p>
        </div>
        <Link
          to="/recipes/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle Recette
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Recettes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalRecipes || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Actives</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.activeRecipes || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Brouillons</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.draftRecipes || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Filter className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Catégories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalCategories || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une recette..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="draft">Brouillons</option>
            <option value="archived">Archivées</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Toutes les catégories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recipes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : recipes && recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
            >
              {recipe.imageUrl ? (
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-amber-200 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
                  <ChefHat className="h-16 w-16 text-orange-400" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {recipe.code}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {recipe.name}
                    </h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(recipe.status)}`}>
                    {recipe.status === 'active' ? 'Active' : recipe.status === 'draft' ? 'Brouillon' : 'Archivée'}
                  </span>
                </div>

                {recipe.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                    {recipe.description}
                  </p>
                )}

                <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTime(recipe.totalTime)}
                  <span className="mx-2">|</span>
                  <span>{recipe.yieldQuantity} {recipe.yieldUnit}</span>
                </div>

                {parseAllergens(recipe.allergens).length > 0 && (
                  <div className="mt-3 flex items-center">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                    <div className="flex flex-wrap gap-1">
                      {parseAllergens(recipe.allergens).slice(0, 3).map((allergen) => (
                        <span
                          key={allergen}
                          className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded"
                        >
                          {allergen}
                        </span>
                      ))}
                      {parseAllergens(recipe.allergens).length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{parseAllergens(recipe.allergens).length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {recipe.sellingPrice && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Prix de vente</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {recipe.sellingPrice.toFixed(2)} €
                    </span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <Link
                    to={`/recipes/${recipe.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Link>
                  <Link
                    to={`/recipes/${recipe.id}/edit`}
                    className="text-gray-600 hover:text-gray-700 dark:text-gray-400 text-sm font-medium flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedRecipe(recipe);
                      setShowDeleteConfirm(true);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <ChefHat className="h-12 w-12 mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Aucune recette
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Commencez par créer votre première recette.
          </p>
          <Link
            to="/recipes/new"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Créer une recette
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Supprimer la recette
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Êtes-vous sûr de vouloir supprimer "{selectedRecipe.name}" ?
              Cette action est irréversible.
            </p>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedRecipe(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(selectedRecipe.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
