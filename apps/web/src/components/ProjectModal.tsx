/**
 * Project Modal Component
 * Create and edit projects
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CreateProjectInput, Project, Company, Contact } from '@perfex/shared';
import { z } from 'zod';

// Form schema that matches the UI needs
const projectFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().optional().or(z.literal('')),
  companyId: z.string().optional().or(z.literal('')),
  contactId: z.string().optional().or(z.literal('')),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  startDate: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  budgetAmount: z.string().optional().or(z.literal('')),
  budgetCurrency: z.string().length(3).default('EUR'),
  billable: z.boolean().default(true),
  hourlyRate: z.string().optional().or(z.literal('')),
  tagsInput: z.string().optional().or(z.literal('')),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
  project?: Project;
  companies?: Company[];
  contacts?: Contact[];
  isSubmitting?: boolean;
}

export function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  project,
  companies = [],
  contacts = [],
  isSubmitting = false,
}: ProjectModalProps) {
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

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      companyId: project?.companyId || '',
      contactId: project?.contactId || '',
      status: project?.status || 'planning',
      priority: project?.priority || 'medium',
      startDate: project ? formatDateForInput(project.startDate) : '',
      dueDate: project ? formatDateForInput(project.dueDate) : '',
      budgetAmount: project?.budgetAmount?.toString() || '',
      budgetCurrency: project?.budgetCurrency || 'EUR',
      billable: project?.billable ?? true,
      hourlyRate: project?.hourlyRate?.toString() || '',
      tagsInput: project ? parseTags(project.tags) : '',
    },
  });

  const selectedCompanyId = watch('companyId');

  // Filter contacts by selected company
  const filteredContacts = selectedCompanyId
    ? contacts.filter(c => c.companyId === selectedCompanyId)
    : [];

  // Reset form when project changes or modal closes
  useEffect(() => {
    if (isOpen) {
      reset({
        name: project?.name || '',
        description: project?.description || '',
        companyId: project?.companyId || '',
        contactId: project?.contactId || '',
        status: project?.status || 'planning',
        priority: project?.priority || 'medium',
        startDate: project ? formatDateForInput(project.startDate) : '',
        dueDate: project ? formatDateForInput(project.dueDate) : '',
        budgetAmount: project?.budgetAmount?.toString() || '',
        budgetCurrency: project?.budgetCurrency || 'EUR',
        billable: project?.billable ?? true,
        hourlyRate: project?.hourlyRate?.toString() || '',
        tagsInput: project ? parseTags(project.tags) : '',
      });
    }
  }, [isOpen, project, reset]);

  const handleFormSubmit = async (data: ProjectFormData) => {
    // Parse tags from comma-separated string to array
    const tagsArray = data.tagsInput
      ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : undefined;

    // Parse numbers
    const budgetAmount = data.budgetAmount ? parseFloat(data.budgetAmount) : null;
    const hourlyRate = data.hourlyRate ? parseFloat(data.hourlyRate) : null;

    // Format dates for API
    const startDate = data.startDate ? new Date(data.startDate).toISOString() : null;
    const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;

    const cleanedData: CreateProjectInput = {
      name: data.name,
      description: data.description || null,
      companyId: data.companyId || null,
      contactId: data.contactId || null,
      status: data.status,
      priority: data.priority,
      startDate,
      dueDate,
      budgetAmount,
      budgetCurrency: data.budgetCurrency,
      billable: data.billable,
      hourlyRate,
      tags: tagsArray,
      projectManagerId: null,
    };

    await onSubmit(cleanedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">
              {project ? 'Edit Project' : 'Create New Project'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
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
                    placeholder="Website Redesign"
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Company</label>
                  <select
                    {...register('companyId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No company</option>
                    {companies.map((company) => (
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
                    disabled={!selectedCompanyId}
                  >
                    <option value="">No contact</option>
                    {filteredContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </option>
                    ))}
                  </select>
                  {!selectedCompanyId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a company first
                    </p>
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
              </div>
            </div>

            {/* Project Details */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Project Details</h3>
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

            {/* Budget & Billing */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Budget & Billing</h3>
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
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
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
                    placeholder="150.00"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center space-x-2">
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

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <input
                {...register('tagsInput')}
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="web, design, client-a"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated tags for categorization
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={onClose}
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
              {isSubmitting ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
