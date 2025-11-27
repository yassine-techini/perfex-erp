/**
 * Asset Form Page
 * Create and edit fixed assets on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FixedAsset } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema
const assetFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  description: z.string().max(2000).optional().or(z.literal('')),
  manufacturer: z.string().max(200).optional().or(z.literal('')),
  model: z.string().max(200).optional().or(z.literal('')),
  serialNumber: z.string().max(200).optional().or(z.literal('')),
  location: z.string().max(300).optional().or(z.literal('')),
  purchaseDate: z.string().optional().or(z.literal('')),
  purchaseCost: z.string().min(1, 'Purchase cost is required'),
  salvageValue: z.string().default('0'),
  usefulLife: z.string().optional().or(z.literal('')),
  depreciationMethod: z.enum(['straight_line', 'declining_balance', 'units_of_production']).default('straight_line'),
  warrantyExpiry: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  status: z.enum(['active', 'disposed', 'sold', 'donated', 'lost']).optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

export function AssetFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch asset data if editing
  const { data: asset, isLoading } = useQuery({
    queryKey: ['fixed-asset', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<FixedAsset>>(`/assets/assets/${id}`);
      return response.data.data;
    },
    enabled: isEditMode,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      description: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      location: '',
      purchaseDate: '',
      purchaseCost: '',
      salvageValue: '0',
      usefulLife: '',
      depreciationMethod: 'straight_line',
      warrantyExpiry: '',
      notes: '',
      status: 'active',
    },
  });

  // Update form when asset data is loaded
  useEffect(() => {
    if (asset) {
      reset({
        name: asset.name || '',
        description: asset.description || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        location: asset.location || '',
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
        purchaseCost: asset.purchaseCost?.toString() || '',
        salvageValue: asset.salvageValue?.toString() || '0',
        usefulLife: asset.usefulLife?.toString() || '',
        depreciationMethod: asset.depreciationMethod || 'straight_line',
        warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '',
        notes: asset.notes || '',
        status: asset.status || 'active',
      });
    }
  }, [asset, reset]);

  // Create asset mutation
  const createAsset = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post<ApiResponse<FixedAsset>>('/assets/assets', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      alert('Asset created successfully!');
      navigate('/assets');
    },
    onError: (error) => {
      alert(`Failed to create asset: ${getErrorMessage(error)}`);
    },
  });

  // Update asset mutation
  const updateAsset = useMutation({
    mutationFn: async (data: any) => {
      if (!id) throw new Error('Asset ID is required');
      const response = await api.put<ApiResponse<FixedAsset>>(`/assets/assets/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['fixed-asset', id] });
      alert('Asset updated successfully!');
      navigate('/assets');
    },
    onError: (error) => {
      alert(`Failed to update asset: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: AssetFormData) => {
    const cleanedData: any = {
      name: data.name,
      description: data.description || null,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      location: data.location || null,
      purchaseDate: data.purchaseDate || null,
      purchaseCost: parseFloat(data.purchaseCost),
      salvageValue: parseFloat(data.salvageValue),
      usefulLife: data.usefulLife ? parseInt(data.usefulLife) : null,
      depreciationMethod: data.depreciationMethod,
      warrantyExpiry: data.warrantyExpiry || null,
      notes: data.notes || null,
    };

    if (isEditMode) {
      cleanedData.status = data.status;
    }

    if (isEditMode) {
      await updateAsset.mutateAsync(cleanedData);
    } else {
      await createAsset.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createAsset.isPending || updateAsset.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading asset...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Asset' : 'Add New Asset'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update fixed asset information' : 'Add a new fixed asset to your inventory'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/assets')}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Asset Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Dell Laptop Model XYZ"
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Asset description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Manufacturer</label>
                  <input
                    {...register('manufacturer')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Dell"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <input
                    {...register('model')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Latitude 7400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Serial Number</label>
                  <input
                    {...register('serialNumber')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="SN123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    {...register('location')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Office Building A, Floor 3"
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Financial Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Purchase Date</label>
                  <input
                    {...register('purchaseDate')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Purchase Cost <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('purchaseCost')}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="1500.00"
                  />
                  {errors.purchaseCost && (
                    <p className="text-destructive text-sm mt-1">{errors.purchaseCost.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Salvage Value</label>
                  <input
                    {...register('salvageValue')}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Useful Life (months)</label>
                  <input
                    {...register('usefulLife')}
                    type="number"
                    min="1"
                    step="1"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="36"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Depreciation Method</label>
                  <select
                    {...register('depreciationMethod')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="straight_line">Straight Line</option>
                    <option value="declining_balance">Declining Balance</option>
                    <option value="units_of_production">Units of Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Warranty Expiry</label>
                  <input
                    {...register('warrantyExpiry')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      {...register('status')}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="disposed">Disposed</option>
                      <option value="sold">Sold</option>
                      <option value="donated">Donated</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Optional notes about this asset..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/assets')}
              disabled={isSubmitting}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
