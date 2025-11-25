/**
 * Contact Form Page
 * Create and edit contacts on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateContactInput, Contact, Company } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema that matches the UI needs
const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email'),
  companyId: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  mobile: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  isPrimary: z.boolean().default(false),
  tagsInput: z.string().optional().or(z.literal('')), // Comma-separated tags in UI
  notes: z.string().optional().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch contact data if editing
  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<Contact>>(`/contacts/${id}`);
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
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      companyId: '',
      phone: '',
      mobile: '',
      position: '',
      department: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isPrimary: false,
      tagsInput: '',
      notes: '',
    },
  });

  // Update form when contact data is loaded
  useEffect(() => {
    if (contact) {
      reset({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        companyId: contact.companyId || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        position: contact.position || '',
        department: contact.department || '',
        address: contact.address || '',
        city: contact.city || '',
        state: contact.state || '',
        postalCode: contact.postalCode || '',
        country: contact.country || '',
        isPrimary: contact.isPrimary || false,
        tagsInput: parseTags(contact.tags),
        notes: contact.notes || '',
      });
    }
  }, [contact, reset]);

  // Create contact mutation
  const createContact = useMutation({
    mutationFn: async (data: CreateContactInput) => {
      const response = await api.post<ApiResponse<Contact>>('/contacts', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      alert('Contact created successfully!');
      navigate('/crm/contacts');
    },
    onError: (error) => {
      alert(`Failed to create contact: ${getErrorMessage(error)}`);
    },
  });

  // Update contact mutation
  const updateContact = useMutation({
    mutationFn: async (data: CreateContactInput) => {
      if (!id) throw new Error('Contact ID is required');
      const response = await api.put<ApiResponse<Contact>>(`/contacts/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      alert('Contact updated successfully!');
      navigate('/crm/contacts');
    },
    onError: (error) => {
      alert(`Failed to update contact: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: ContactFormData) => {
    // Parse tags from comma-separated string to array
    const tagsArray = data.tagsInput
      ? data.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : undefined;

    const cleanedData: CreateContactInput = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      companyId: data.companyId || null,
      phone: data.phone || null,
      mobile: data.mobile || null,
      position: data.position || null,
      department: data.department || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      isPrimary: data.isPrimary,
      tags: tagsArray,
      notes: data.notes || null,
      assignedTo: null,
    };

    if (isEditMode) {
      await updateContact.mutateAsync(cleanedData);
    } else {
      await createContact.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createContact.isPending || updateContact.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading contact...</p>
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
            {isEditMode ? 'Edit Contact' : 'Create New Contact'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update contact information and details'
              : 'Add a new contact to your CRM'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/crm/contacts')}
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-destructive text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Last Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-destructive text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                  )}
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
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mobile</label>
                  <input
                    {...register('mobile')}
                    type="tel"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="+1 (555) 987-6543"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Professional Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Position</label>
                  <input
                    {...register('position')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Sales Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Department</label>
                  <input
                    {...register('department')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Sales"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      {...register('isPrimary')}
                      type="checkbox"
                      className="rounded border-input"
                    />
                    <span className="text-sm font-medium">Primary Contact</span>
                    <span className="text-xs text-muted-foreground">
                      (Main point of contact for the company)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Address</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Street Address</label>
                  <input
                    {...register('address')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <input
                      {...register('city')}
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">State/Province</label>
                    <input
                      {...register('state')}
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Postal Code</label>
                    <input
                      {...register('postalCode')}
                      type="text"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <input
                    {...register('country')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="United States"
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
                    placeholder="vip, key-contact, decision-maker"
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
                    placeholder="Additional notes about this contact..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/crm/contacts')}
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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Contact' : 'Create Contact'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
