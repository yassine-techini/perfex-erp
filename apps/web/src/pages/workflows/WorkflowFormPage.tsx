/**
 * Workflow Form Page
 * Create and edit workflows on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Workflow } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema
const workflowFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  entityType: z.string().min(1, 'Entity type is required').max(100),
  triggerType: z.enum(['on_create', 'on_update', 'on_status_change', 'scheduled']),
  isActive: z.boolean().default(true),
  priority: z.string().optional().or(z.literal('')),
});

type WorkflowFormData = z.infer<typeof workflowFormSchema>;

export function WorkflowFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch workflow data if editing
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<Workflow>>(`/workflows/workflows/${id}`);
      return response.data.data;
    },
    enabled: isEditMode,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: '',
      description: '',
      entityType: '',
      triggerType: 'on_create',
      isActive: true,
      priority: '0',
    },
  });

  // Update form when workflow data is loaded
  useEffect(() => {
    if (workflow) {
      reset({
        name: workflow.name || '',
        description: workflow.description || '',
        entityType: workflow.entityType || '',
        triggerType: workflow.triggerType || 'on_create',
        isActive: workflow.isActive ?? true,
        priority: workflow.priority?.toString() || '0',
      });
    }
  }, [workflow, reset]);

  // Create workflow mutation
  const createWorkflow = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post<ApiResponse<Workflow>>('/workflows/workflows', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      alert('Workflow created successfully!');
      navigate('/workflows');
    },
    onError: (error) => {
      alert(`Failed to create workflow: ${getErrorMessage(error)}`);
    },
  });

  // Update workflow mutation
  const updateWorkflow = useMutation({
    mutationFn: async (data: any) => {
      if (!id) throw new Error('Workflow ID is required');
      const response = await api.put<ApiResponse<Workflow>>(`/workflows/workflows/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      alert('Workflow updated successfully!');
      navigate('/workflows');
    },
    onError: (error) => {
      alert(`Failed to update workflow: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: WorkflowFormData) => {
    const cleanedData: any = {
      name: data.name,
      description: data.description || null,
      isActive: data.isActive,
      priority: data.priority ? parseInt(data.priority) : 0,
    };

    if (isEditMode) {
      // In edit mode, omit entityType and triggerType (they can't be changed)
      await updateWorkflow.mutateAsync(cleanedData);
    } else {
      // In create mode, include entityType and triggerType
      cleanedData.entityType = data.entityType;
      cleanedData.triggerType = data.triggerType;
      await createWorkflow.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createWorkflow.isPending || updateWorkflow.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading workflow...</p>
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
            {isEditMode ? 'Edit Workflow' : 'Create Workflow'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update workflow information' : 'Create a new automated workflow'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/workflows')}
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
                    Workflow Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Invoice Approval Workflow"
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Describe what this workflow does..."
                  />
                  {errors.description && (
                    <p className="text-destructive text-sm mt-1">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Entity Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('entityType')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isEditMode}
                  >
                    <option value="">Select entity type...</option>
                    <option value="invoice">Invoice</option>
                    <option value="purchase_order">Purchase Order</option>
                    <option value="expense">Expense</option>
                    <option value="opportunity">Opportunity</option>
                    <option value="sales_order">Sales Order</option>
                    <option value="work_order">Work Order</option>
                    <option value="payment">Payment</option>
                    <option value="asset">Asset</option>
                  </select>
                  {errors.entityType && (
                    <p className="text-destructive text-sm mt-1">{errors.entityType.message}</p>
                  )}
                  {isEditMode && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Entity type cannot be changed after creation
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Trigger Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('triggerType')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isEditMode}
                  >
                    <option value="on_create">On Create</option>
                    <option value="on_update">On Update</option>
                    <option value="on_status_change">On Status Change</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                  {errors.triggerType && (
                    <p className="text-destructive text-sm mt-1">{errors.triggerType.message}</p>
                  )}
                  {isEditMode && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Trigger type cannot be changed after creation
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <input
                    {...register('priority')}
                    type="number"
                    min="0"
                    step="1"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Higher priority workflows execute first
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
                  <p className="text-sm text-muted-foreground">
                    Inactive workflows will not be triggered
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/workflows')}
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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
