/**
 * Inventory Page
 * Manage inventory items and stock levels
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { InventoryItem, CreateInventoryItemInput } from '@perfex/shared';
import { InventoryItemModal } from '@/components/InventoryItemModal';

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();

  // Fetch inventory items
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['inventory-items', searchTerm, categoryFilter, activeFilter],
    queryFn: async () => {
      let url = '/inventory/items';
      const params: string[] = [];

      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (categoryFilter !== 'all') params.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (activeFilter !== 'all') params.push(`active=${activeFilter}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await api.get<ApiResponse<InventoryItem[]>>(url);
      return response.data.data;
    },
  });

  // Fetch inventory stats
  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{
        totalItems: number;
        activeItems: number;
        totalWarehouses: number;
        lowStockItems: number;
      }>>('/inventory/items/stats');
      return response.data.data;
    },
  });

  // Get unique categories from items
  const categories = Array.from(
    new Set(items?.map(item => item.category).filter(Boolean) || [])
  );

  // Create item mutation
  const createItem = useMutation({
    mutationFn: async (data: CreateInventoryItemInput) => {
      const response = await api.post<ApiResponse<InventoryItem>>('/inventory/items', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setIsModalOpen(false);
      setSelectedItem(undefined);
      alert('Inventory item created successfully!');
    },
    onError: (error) => {
      alert(`Failed to create item: ${getErrorMessage(error)}`);
    },
  });

  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateInventoryItemInput }) => {
      const response = await api.put<ApiResponse<InventoryItem>>(`/inventory/items/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setIsModalOpen(false);
      setSelectedItem(undefined);
      alert('Inventory item updated successfully!');
    },
    onError: (error) => {
      alert(`Failed to update item: ${getErrorMessage(error)}`);
    },
  });

  // Delete item mutation
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/inventory/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      alert('Inventory item deleted successfully!');
    },
    onError: (error) => {
      alert(`Failed to delete item: ${getErrorMessage(error)}`);
    },
  });

  const handleAddItem = () => {
    setSelectedItem(undefined);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(undefined);
  };

  const handleModalSubmit = async (data: CreateInventoryItemInput) => {
    if (selectedItem) {
      await updateItem.mutateAsync({ id: selectedItem.id, data });
    } else {
      await createItem.mutateAsync(data);
    }
  };

  const handleDelete = (itemId: string, itemName: string) => {
    if (confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      deleteItem.mutate(itemId);
    }
  };

  // Parse tags from JSON
  const parseTags = (tagsJson: string | null): string[] => {
    if (!tagsJson) return [];
    try {
      const tags = JSON.parse(tagsJson);
      return Array.isArray(tags) ? tags : [];
    } catch {
      return [];
    }
  };

  // Format currency
  const formatCurrency = (amount: number | null, currency: string): string => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  // Get status badge color
  const getStatusColor = (active: boolean): string => {
    return active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage inventory items and stock levels
          </p>
        </div>
        <button
          onClick={handleAddItem}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Item
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Items</div>
            <div className="mt-2 text-2xl font-bold">{stats.totalItems}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Active Items</div>
            <div className="mt-2 text-2xl font-bold">{stats.activeItems}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Warehouses</div>
            <div className="mt-2 text-2xl font-bold">{stats.totalWarehouses}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Low Stock</div>
            <div className="mt-2 text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search items by SKU, name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Error loading items: {getErrorMessage(error)}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No inventory items found.</p>
            <button
              onClick={handleAddItem}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Create your first item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Cost Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Selling Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Unit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-mono">{item.sku}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </div>
                        )}
                        {parseTags(item.tags).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {parseTags(item.tags).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {formatCurrency(item.costPrice, item.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatCurrency(item.sellingPrice, item.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(item.active)}`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-sm text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <InventoryItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        item={selectedItem}
        isSubmitting={createItem.isPending || updateItem.isPending}
      />
    </div>
  );
}
