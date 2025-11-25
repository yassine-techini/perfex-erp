/**
 * Opportunity Form Page
 * Create and edit opportunities on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateOpportunityInput, Opportunity, Company, Contact, PipelineStage } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema that matches the UI needs
const opportunityFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  companyId: z.string().min(1, 'Company is required'),
  contactId: z.string().optional().or(z.literal('')),
  value: z.string().min(1, 'Value is required'),
  currency: z.string().length(3).default('EUR'),
  stageId: z.string().min(1, 'Stage is required'),
  probability: z.string().min(0).max(3),
  expectedCloseDate: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  tagsInput: z.string().optional().or(z.literal('')), // Comma-separated tags in UI
  notes: z.string().optional().or(z.literal('')),
});

type OpportunityFormData = z.infer<typeof opportunityFormSchema>;

export function OpportunityFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch opportunity data if editing
  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<Opportunity>>(`/opportunities/${id}`);
      return response.data.data;
    },
    enabled: isEditMode,
  });

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Company[]>>('/companies');
      return response.data.data;
    },
  });

  // Fetch contacts for dropdown
  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Contact[]>>('/contacts');
      return response.data.data;
    },
  });

  // Fetch pipeline stages for dropdown
  const { data: stages } = useQuery({
    queryKey: ['pipeline', 'stages'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PipelineStage[]>>('/pipeline');
      return response.data.data;
    },
  });

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
  } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      name: '',
      companyId: '',
      contactId: '',
      value: '',
      currency: 'EUR',
      stageId: '',
      probability: '0',
      expectedCloseDate: '',
      description: '',
      tagsInput: '',
      notes: '',
    },
  });

  // Update form when opportunity data is loaded
  useEffect(() => {
    if (opportunity) {
      reset({
        name: opportunity.name || '',
        companyId: opportunity.companyId || '',
        contactId: opportunity.contactId || '',
        value: opportunity.value.toString() || '',
        currency: opportunity.currency || 'EUR',
        stageId: opportunity.stageId || '',
        probability: opportunity.probability.toString() || '0',
        expectedCloseDate: opportunity.expectedCloseDate
          ? new Date(opportunity.expectedCloseDate).toISOString().split('T')[0]
          : '',
        description: opportunity.description || '',
        tagsInput: parseTags(opportunity.tags),
        notes: opportunity.notes || '',
      });
    }
  }, [opportunity, reset]);

  // Create opportunity mutation
  const createOpportunity = useMutation({
    mutationFn: async (data: CreateOpportunityInput) => {
      const response = await api.post<ApiResponse<Opportunity>>('/opportunities', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      alert('Opportunity created successfully!');
      navigate('/crm/pipeline');
    },
    onError: (error) => {
      alert(`Failed to create opportunity: ${getErrorMessage(error)}`);
    },
  });

  // Update opportunity mutation
  const updateOpportunity = useMutation({
    mutationFn: async (data: CreateOpportunityInput) => {
      if (!id) throw new Error('Opportunity ID is required');
      const response = await api.put<ApiResponse<Opportunity>>(`/opportunities/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] });
      alert('Opportunity updated successfully!');
      navigate('/crm/pipeline');
    },
    onError: (error) => {
      alert(`Failed to update opportunity: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: OpportunityFormData) => {
    // Parse tags from comma-separated string to array
    const tagsArray = data.tagsInput
      ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : undefined;

    const cleanedData: CreateOpportunityInput = {
      name: data.name,
      companyId: data.companyId,
      contactId: data.contactId || null,
      value: parseFloat(data.value),
      currency: data.currency,
      stageId: data.stageId,
      probability: parseInt(data.probability, 10),
      expectedCloseDate: data.expectedCloseDate || null,
      description: data.description || null,
      tags: tagsArray,
      notes: data.notes || null,
      assignedTo: null,
    };

    if (isEditMode) {
      await updateOpportunity.mutateAsync(cleanedData);
    } else {
      await createOpportunity.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createOpportunity.isPending || updateOpportunity.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading opportunity...</p>
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
            {isEditMode ? 'Edit Opportunity' : 'Create New Opportunity'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update opportunity information and details'
              : 'Add a new sales opportunity to your pipeline'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/crm/pipeline')}
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
                    Opportunity Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enterprise Software Deal"
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Company <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('companyId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select company</option>
                    {companies?.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  {errors.companyId && (
                    <p className="text-destructive text-sm mt-1">{errors.companyId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contact</label>
                  <select
                    {...register('contactId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No contact</option>
                    {contacts?.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Brief description of the opportunity..."
                  />
                </div>
              </div>
            </div>

            {/* Deal Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Deal Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Value <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('value')}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="50000.00"
                  />
                  {errors.value && (
                    <p className="text-destructive text-sm mt-1">{errors.value.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Currency <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('currency')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Pipeline Stage <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('stageId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select stage</option>
                    {stages?.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name} ({stage.probability}%)
                      </option>
                    ))}
                  </select>
                  {errors.stageId && (
                    <p className="text-destructive text-sm mt-1">{errors.stageId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Probability (%) <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('probability')}
                    type="number"
                    min="0"
                    max="100"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="75"
                  />
                  {errors.probability && (
                    <p className="text-destructive text-sm mt-1">{errors.probability.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Expected Close Date</label>
                  <input
                    {...register('expectedCloseDate')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Additional Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <input
                    {...register('tagsInput')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="enterprise, high-value, q1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated tags for categorization
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Additional notes about this opportunity..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/crm/pipeline')}
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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Opportunity' : 'Create Opportunity'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
