/**
 * Webhook Form Page
 * Create and edit webhooks on a dedicated page
 */

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Webhook } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema
const webhookFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  url: z.string().url('Must be a valid URL'),
  secret: z.string().max(200).optional().or(z.literal('')),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  isActive: z.boolean().default(true),
  retryAttempts: z.string().default('3'),
  timeout: z.string().default('30'),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional(),
});

type WebhookFormData = z.infer<typeof webhookFormSchema>;

const availableEvents = [
  'invoice.created',
  'invoice.updated',
  'invoice.deleted',
  'payment.created',
  'payment.updated',
  'opportunity.created',
  'opportunity.updated',
  'order.created',
  'order.updated',
  'workflow.completed',
];

export function WebhookFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch webhook data if editing
  const { data: webhook, isLoading } = useQuery({
    queryKey: ['webhook', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<Webhook>>(`/workflows/webhooks/${id}`);
      return response.data.data;
    },
    enabled: isEditMode,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: '',
      description: '',
      url: '',
      secret: '',
      events: [],
      isActive: true,
      retryAttempts: '3',
      timeout: '30',
      headers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'headers',
  });

  const selectedEvents = watch('events');

  // Update form when webhook data is loaded
  useEffect(() => {
    if (webhook) {
      const headersArray = webhook.headers
        ? Object.entries(webhook.headers).map(([key, value]) => ({ key, value }))
        : [];

      reset({
        name: webhook.name || '',
        description: webhook.description || '',
        url: webhook.url || '',
        secret: webhook.secret || '',
        events: webhook.events || [],
        isActive: webhook.isActive ?? true,
        retryAttempts: webhook.retryAttempts?.toString() || '3',
        timeout: webhook.timeout?.toString() || '30',
        headers: headersArray,
      });
    }
  }, [webhook, reset]);

  // Create webhook mutation
  const createWebhook = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post<ApiResponse<Webhook>>('/workflows/webhooks', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      alert('Webhook created successfully!');
      navigate('/workflows?tab=webhooks');
    },
    onError: (error) => {
      alert(`Failed to create webhook: ${getErrorMessage(error)}`);
    },
  });

  // Update webhook mutation
  const updateWebhook = useMutation({
    mutationFn: async (data: any) => {
      if (!id) throw new Error('Webhook ID is required');
      const response = await api.put<ApiResponse<Webhook>>(`/workflows/webhooks/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook', id] });
      alert('Webhook updated successfully!');
      navigate('/workflows?tab=webhooks');
    },
    onError: (error) => {
      alert(`Failed to update webhook: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: WebhookFormData) => {
    const headers = data.headers?.reduce((acc, header) => {
      if (header.key && header.value) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {} as Record<string, string>) || null;

    const cleanedData: any = {
      name: data.name,
      description: data.description || null,
      url: data.url,
      secret: data.secret || null,
      events: data.events,
      isActive: data.isActive,
      headers: Object.keys(headers || {}).length > 0 ? headers : null,
      retryAttempts: parseInt(data.retryAttempts),
      timeout: parseInt(data.timeout),
    };

    if (isEditMode) {
      await updateWebhook.mutateAsync(cleanedData);
    } else {
      await createWebhook.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createWebhook.isPending || updateWebhook.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading webhook...</p>
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
            {isEditMode ? 'Edit Webhook' : 'Create Webhook'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update webhook configuration' : 'Create a new webhook for event notifications'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/workflows?tab=webhooks')}
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
                    Webhook Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Slack Notifications"
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
                    placeholder="Send notifications to Slack channel..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Webhook URL <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('url')}
                    type="url"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  {errors.url && (
                    <p className="text-destructive text-sm mt-1">{errors.url.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Secret (Optional)</label>
                  <input
                    {...register('secret')}
                    type="password"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Optional secret for webhook signature"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Used to sign webhook payloads for verification
                  </p>
                </div>
              </div>
            </div>

            {/* Events */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Events <span className="text-destructive">*</span></h3>
              <div className="grid gap-2 md:grid-cols-2">
                {availableEvents.map((event) => (
                  <label key={event} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <input
                      type="checkbox"
                      value={event}
                      {...register('events')}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
              {errors.events && (
                <p className="text-destructive text-sm mt-1">{errors.events.message}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedEvents?.length || 0} event(s)
              </p>
            </div>

            {/* Custom Headers */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Custom Headers (Optional)</h3>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      {...register(`headers.${index}.key`)}
                      type="text"
                      placeholder="Header name"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <input
                      {...register(`headers.${index}.value`)}
                      type="text"
                      placeholder="Header value"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => append({ key: '', value: '' })}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
                >
                  Add Header
                </button>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Retry Attempts</label>
                  <input
                    {...register('retryAttempts')}
                    type="number"
                    min="0"
                    max="10"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-1">0-10 retry attempts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Timeout (seconds)</label>
                  <input
                    {...register('timeout')}
                    type="number"
                    min="1"
                    max="300"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-1">1-300 seconds</p>
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
              onClick={() => navigate('/workflows?tab=webhooks')}
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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Webhook' : 'Create Webhook'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
