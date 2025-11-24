/**
 * Inventory Item Modal Component
 * Create and edit inventory items
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateInventoryItemInput, InventoryItem } from '@perfex/shared';
import { z } from 'zod';

// Form schema that matches the UI needs
const inventoryItemFormSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  costPrice: z.string().optional().or(z.literal('')),
  sellingPrice: z.string().optional().or(z.literal('')),
  currency: z.string().length(3).default('EUR'),
  unit: z.string().max(50).default('unit'),
  trackInventory: z.boolean().default(true),
  minStockLevel: z.string().default('0'),
  maxStockLevel: z.string().optional().or(z.literal('')),
  reorderQuantity: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
  imageUrl: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().or(z.literal('')),
  tagsInput: z.string().optional().or(z.literal('')),
});

type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInventoryItemInput) => Promise<void>;
  item?: InventoryItem;
  isSubmitting?: boolean;
}

export function InventoryItemModal({
  isOpen,
  onClose,
  onSubmit,
  item,
  isSubmitting = false,
}: InventoryItemModalProps) {
  // Parse tags from JSON string to comma-separated
  const parseTags = (tagsJson: string | null): string => {
    if (!tagsJson) return '';
    try {
      const tags = JSON.parse(tagsJson);
      return Array.isArray(tags) ? tags.join(', ') : '';
    } catch {
      return '';
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      sku: item?.sku || '',
      name: item?.name || '',
      description: item?.description || '',
      category: item?.category || '',
      costPrice: item?.costPrice?.toString() || '',
      sellingPrice: item?.sellingPrice?.toString() || '',
      currency: item?.currency || 'EUR',
      unit: item?.unit || 'unit',
      trackInventory: item?.trackInventory ?? true,
      minStockLevel: item?.minStockLevel?.toString() || '0',
      maxStockLevel: item?.maxStockLevel?.toString() || '',
      reorderQuantity: item?.reorderQuantity?.toString() || '',
      active: item?.active ?? true,
      imageUrl: item?.imageUrl || '',
      barcode: item?.barcode || '',
      tagsInput: item ? parseTags(item.tags) : '',
    },
  });

  // Reset form when item changes or modal closes
  useEffect(() => {
    if (isOpen) {
      reset({
        sku: item?.sku || '',
        name: item?.name || '',
        description: item?.description || '',
        category: item?.category || '',
        costPrice: item?.costPrice?.toString() || '',
        sellingPrice: item?.sellingPrice?.toString() || '',
        currency: item?.currency || 'EUR',
        unit: item?.unit || 'unit',
        trackInventory: item?.trackInventory ?? true,
        minStockLevel: item?.minStockLevel?.toString() || '0',
        maxStockLevel: item?.maxStockLevel?.toString() || '',
        reorderQuantity: item?.reorderQuantity?.toString() || '',
        active: item?.active ?? true,
        imageUrl: item?.imageUrl || '',
        barcode: item?.barcode || '',
        tagsInput: item ? parseTags(item.tags) : '',
      });
    }
  }, [isOpen, item, reset]);

  const handleFormSubmit = async (data: InventoryItemFormData) => {
    // Parse tags from comma-separated string to array
    const tagsArray = data.tagsInput
      ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : undefined;

    // Parse numbers
    const costPrice = data.costPrice ? parseFloat(data.costPrice) : null;
    const sellingPrice = data.sellingPrice ? parseFloat(data.sellingPrice) : null;
    const minStockLevel = data.minStockLevel ? parseFloat(data.minStockLevel) : 0;
    const maxStockLevel = data.maxStockLevel ? parseFloat(data.maxStockLevel) : null;
    const reorderQuantity = data.reorderQuantity ? parseFloat(data.reorderQuantity) : null;

    const cleanedData: CreateInventoryItemInput = {
      sku: data.sku,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      costPrice,
      sellingPrice,
      currency: data.currency,
      unit: data.unit,
      trackInventory: data.trackInventory,
      minStockLevel,
      maxStockLevel,
      reorderQuantity,
      active: data.active,
      imageUrl: data.imageUrl || null,
      barcode: data.barcode || null,
      tags: tagsArray,
    };

    await onSubmit(cleanedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {item ? 'Edit Inventory Item' : 'Create Inventory Item'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="PROD-001"
                  />
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Barcode
                  </label>
                  <input
                    type="text"
                    {...register('barcode')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="1234567890123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    {...register('category')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Electronics, Furniture, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <input
                    type="text"
                    {...register('unit')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="unit, kg, liter, etc."
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Pricing</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('costPrice')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('sellingPrice')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    {...register('currency')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="MAD">MAD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Inventory Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Inventory Settings</h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('trackInventory')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm font-medium text-gray-700">
                  Track inventory levels
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('minStockLevel')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Stock Level
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('maxStockLevel')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reorder Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('reorderQuantity')}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Additional Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="url"
                  {...register('imageUrl')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  {...register('tagsInput')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="seasonal, featured, clearance"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('active')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
