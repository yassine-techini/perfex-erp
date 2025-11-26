/**
 * Account Form Page
 * Create and edit accounts on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateAccountInput, Account } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema that matches the UI needs
const accountFormSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20).regex(/^[0-9A-Z]+$/, 'Code must contain only numbers and uppercase letters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).default('asset'),
  parentId: z.string().optional().or(z.literal('')),
  currency: z.string().length(3).default('EUR'),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

export function AccountFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch account data if editing
  const { data: account, isLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<Account>>(`/accounts/${id}`);
      return response.data.data;
    },
    enabled: isEditMode,
  });

  // Fetch all accounts for parent dropdown
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Account[]>>('/accounts');
      return response.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: '',
      name: '',
      type: 'asset',
      parentId: '',
      currency: 'EUR',
    },
  });

  // Update form when account data is loaded
  useEffect(() => {
    if (account) {
      reset({
        code: account.code || '',
        name: account.name || '',
        type: account.type || 'asset',
        parentId: account.parentId || '',
        currency: account.currency || 'EUR',
      });
    }
  }, [account, reset]);

  // Create account mutation
  const createAccount = useMutation({
    mutationFn: async (data: CreateAccountInput) => {
      const response = await api.post<ApiResponse<Account>>('/accounts', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      alert('Account created successfully!');
      navigate('/finance/accounts');
    },
    onError: (error) => {
      alert(`Failed to create account: ${getErrorMessage(error)}`);
    },
  });

  // Update account mutation (only name can be updated for existing accounts)
  const updateAccount = useMutation({
    mutationFn: async (data: { name: string }) => {
      if (!id) throw new Error('Account ID is required');
      const response = await api.put<ApiResponse<Account>>(`/accounts/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', id] });
      alert('Account updated successfully!');
      navigate('/finance/accounts');
    },
    onError: (error) => {
      alert(`Failed to update account: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: AccountFormData) => {
    if (isEditMode) {
      // Only update the name for existing accounts
      await updateAccount.mutateAsync({ name: data.name });
    } else {
      // Create new account with all fields
      const cleanedData: CreateAccountInput = {
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId || null,
        currency: data.currency,
      };
      await createAccount.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createAccount.isPending || updateAccount.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading account...</p>
        </div>
      </div>
    );
  }

  // Filter accounts for parent dropdown (exclude current account to prevent circular reference)
  const availableParents = accounts?.filter(a => a.id !== id) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Account' : 'Add New Account'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Update account name (code and type cannot be changed)'
              : 'Add a new account to your chart of accounts'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/finance/accounts')}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card">
          <div className="p-6 space-y-6">
            {/* Account Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Account Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account Code <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('code')}
                    type="text"
                    disabled={isEditMode}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="401"
                  />
                  {errors.code && (
                    <p className="text-destructive text-sm mt-1">{errors.code.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEditMode
                      ? 'Account code cannot be changed'
                      : 'Use numbers and uppercase letters only'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Suppliers"
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account Type <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('type')}
                    disabled={isEditMode}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                  {isEditMode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Account type cannot be changed
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Parent Account</label>
                  <select
                    {...register('parentId')}
                    disabled={isEditMode}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No parent (root level)</option>
                    {availableParents.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                  {isEditMode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Parent account cannot be changed
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Currency</label>
                  <select
                    {...register('currency')}
                    disabled={isEditMode}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                  {isEditMode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Currency cannot be changed
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Information Notice */}
            {!isEditMode && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Account Code Format
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Follow standard accounting code conventions:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>1XX - Asset accounts</li>
                        <li>2XX - Liability accounts</li>
                        <li>3XX - Equity accounts</li>
                        <li>4XX - Revenue accounts</li>
                        <li>5XX, 6XX - Expense accounts</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/finance/accounts')}
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
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Account' : 'Add Account'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
