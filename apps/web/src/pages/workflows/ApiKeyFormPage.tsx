/**
 * API Key Form Page
 * Create and edit API keys on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiKey } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema
const apiKeyFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  rateLimit: z.string().default('1000'),
  ipWhitelist: z.string().optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type ApiKeyFormData = z.infer<typeof apiKeyFormSchema>;

const availablePermissions = [
  'read:invoices',
  'write:invoices',
  'read:payments',
  'write:payments',
  'read:customers',
  'write:customers',
  'read:orders',
  'write:orders',
  'read:inventory',
  'write:inventory',
  'read:reports',
  'admin:all',
];

export function ApiKeyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch API key data if editing
  const { data: apiKey, isLoading } = useQuery({
    queryKey: ['api-key', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<ApiKey>>(`/workflows/api-keys/${id}`);
      return response.data.data;
    },
    enabled: isEditMode,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      rateLimit: '1000',
      ipWhitelist: '',
      expiresAt: '',
      isActive: true,
    },
  });

  const selectedPermissions = watch('permissions');

  // Update form when API key data is loaded
  useEffect(() => {
    if (apiKey) {
      reset({
        name: apiKey.name || '',
        description: apiKey.description || '',
        permissions: apiKey.permissions || [],
        rateLimit: apiKey.rateLimit?.toString() || '1000',
        ipWhitelist: apiKey.ipWhitelist?.join(', ') || '',
        expiresAt: apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().split('T')[0] : '',
        isActive: apiKey.isActive ?? true,
      });
    }
  }, [apiKey, reset]);

  // Create API key mutation
  const createApiKey = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post<ApiResponse<ApiKey & { key: string }>>('/workflows/api-keys', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      // Show the generated API key to the user
      alert(`API Key created successfully!\n\nYour API Key: ${data.key}\n\nIMPORTANT: Copy this key now. You won't be able to see it again!`);
      navigate('/workflows?tab=api-keys');
    },
    onError: (error) => {
      alert(`Failed to create API key: ${getErrorMessage(error)}`);
    },
  });

  // Update API key mutation
  const updateApiKey = useMutation({
    mutationFn: async (data: any) => {
      if (!id) throw new Error('API key ID is required');
      const response = await api.put<ApiResponse<ApiKey>>(`/workflows/api-keys/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['api-key', id] });
      alert('API key updated successfully!');
      navigate('/workflows?tab=api-keys');
    },
    onError: (error) => {
      alert(`Failed to update API key: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: ApiKeyFormData) => {
    const ipWhitelist = data.ipWhitelist
      ? data.ipWhitelist.split(',').map(ip => ip.trim()).filter(Boolean)
      : null;

    const cleanedData: any = {
      name: data.name,
      description: data.description || null,
      permissions: data.permissions,
      rateLimit: parseInt(data.rateLimit),
      ipWhitelist: ipWhitelist,
      expiresAt: data.expiresAt || null,
      isActive: data.isActive,
    };

    if (isEditMode) {
      await updateApiKey.mutateAsync(cleanedData);
    } else {
      await createApiKey.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createApiKey.isPending || updateApiKey.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading API key...</p>
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
            {isEditMode ? 'Edit API Key' : 'Create API Key'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update API key configuration' : 'Create a new API key for programmatic access'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/workflows?tab=api-keys')}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
      </div>

      {/* Warning for new keys */}
      {!isEditMode && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">Important</h3>
              <p className="mt-2 text-sm text-orange-700">
                After creating the API key, you will see it only once. Make sure to copy and store it securely.
              </p>
            </div>
          </div>
        </div>
      )}

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
                    API Key Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Production API Key"
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
                    placeholder="Used for production mobile app integration..."
                  />
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Permissions <span className="text-destructive">*</span></h3>
              <div className="grid gap-2 md:grid-cols-2">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <input
                      type="checkbox"
                      value={permission}
                      {...register('permissions')}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-mono">{permission}</span>
                  </label>
                ))}
              </div>
              {errors.permissions && (
                <p className="text-destructive text-sm mt-1">{errors.permissions.message}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedPermissions?.length || 0} permission(s)
              </p>
            </div>

            {/* Security Settings */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Security Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Rate Limit (requests/hour)</label>
                  <input
                    {...register('rateLimit')}
                    type="number"
                    min="1"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum API requests per hour
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Expiration Date (Optional)</label>
                  <input
                    {...register('expiresAt')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Leave empty for no expiration
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">IP Whitelist (Optional)</label>
                  <input
                    {...register('ipWhitelist')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="192.168.1.1, 10.0.0.1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Comma-separated list of IP addresses. Leave empty to allow all IPs.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    {...register('isActive')}
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Active
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/workflows?tab=api-keys')}
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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update API Key' : 'Create API Key'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
