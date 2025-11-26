/**
 * Project Form Page
 * Create and edit projects on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateProjectInput, Project, Company, Contact } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema that matches the UI needs
const projectFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().optional().or(z.literal('')),
  companyId: z.string().optional().or(z.literal('')),
  contactId: z.string().optional().or(z.literal('')),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  budgetAmount: z.string().optional().or(z.literal('')),
  budgetCurrency: z.string().length(3).default('EUR'),
  billable: z.boolean().default(true),
  hourlyRate: z.string().optional().or(z.literal('')),
  tagsInput: z.string().optional().or(z.literal('')),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export function ProjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch project data if editing
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
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
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      companyId: '',
      contactId: '',
      status: 'planning',
      priority: 'medium',
      startDate: '',
      dueDate: '',
      budgetAmount: '',
      budgetCurrency: 'EUR',
      billable: true,
      hourlyRate: '',
      tagsInput: '',
    },
  });

  // Update form when project data is loaded
  useEffect(() => {
    if (project) {
      reset({
        name: project.name || '',
        description: project.description || '',
        companyId: project.companyId || '',
        contactId: project.contactId || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split('T')[0]
          : '',
        dueDate: project.dueDate
          ? new Date(project.dueDate).toISOString().split('T')[0]
          : '',
        budgetAmount: project.budgetAmount ? project.budgetAmount.toString() : '',
        budgetCurrency: project.budgetCurrency || 'EUR',
        billable: project.billable ?? true,
        hourlyRate: project.hourlyRate ? project.hourlyRate.toString() : '',
        tagsInput: parseTags(project.tags),
      });
    }
  }, [project, reset]);

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const response = await api.post<ApiResponse<Project>>('/projects', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      alert('Project created successfully!');
      navigate('/projects');
    },
    onError: (error) => {
      alert(`Failed to create project: ${getErrorMessage(error)}`);
    },
  });

  // Update project mutation
  const updateProject = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      if (!id) throw new Error('Project ID is required');
      const response = await api.put<ApiResponse<Project>>(`/projects/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      alert('Project updated successfully!');
      navigate('/projects');
    },
    onError: (error) => {
      alert(`Failed to update project: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: ProjectFormData) => {
    // Parse tags from comma-separated string to array
    const tagsArray = data.tagsInput
      ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : undefined;

    const cleanedData: CreateProjectInput = {
      name: data.name,
      description: data.description || null,
      companyId: data.companyId || null,
      contactId: data.contactId || null,
      status: data.status,
      priority: data.priority,
      startDate: data.startDate || null,
      dueDate: data.dueDate || null,
      budgetAmount: data.budgetAmount ? parseFloat(data.budgetAmount) : null,
      budgetCurrency: data.budgetCurrency,
      billable: data.billable,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
      projectManagerId: null,
      tags: tagsArray,
    };

    if (isEditMode) {
      await updateProject.mutateAsync(cleanedData);
    } else {
      await createProject.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createProject.isPending || updateProject.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading project...</p>
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
            {isEditMode ? 'Edit Project' : 'Create New Project'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update project information and details'
              : 'Add a new project to track progress and manage tasks'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/projects')}
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
                    Project Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Website Redesign Project"
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
                    placeholder="Project description and objectives..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Company</label>
                  <select
                    {...register('companyId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No company</option>
                    {companies?.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
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
              </div>
            </div>

            {/* Status and Priority */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Status and Priority</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    {...register('status')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Timeline</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    {...register('startDate')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Due Date</label>
                  <input
                    {...register('dueDate')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Budget and Billing */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Budget and Billing</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Budget Amount</label>
                  <input
                    {...register('budgetAmount')}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="50000.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Currency</label>
                  <select
                    {...register('budgetCurrency')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hourly Rate</label>
                  <input
                    {...register('hourlyRate')}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="75.00"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      {...register('billable')}
                      type="checkbox"
                      className="rounded border-input"
                    />
                    <span className="text-sm font-medium">Billable Project</span>
                  </label>
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
                    placeholder="web, design, frontend"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated tags for categorization
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/projects')}
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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
