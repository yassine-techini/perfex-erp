/**
 * New Invoice Page
 * Create a new customer invoice
 */

import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InvoiceForm } from '@/components/InvoiceForm';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { InvoiceWithLines, CreateInvoiceInput } from '@perfex/shared';

export function NewInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createInvoice = useMutation({
    mutationFn: async (data: CreateInvoiceInput) => {
      const response = await api.post<ApiResponse<InvoiceWithLines>>('/invoices', data);
      return response.data.data;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert(`Invoice ${invoice.number} created successfully!`);
      navigate(`/finance/invoices/${invoice.id}`);
    },
    onError: (error) => {
      alert(`Failed to create invoice: ${getErrorMessage(error)}`);
    },
  });

  const handleSubmit = async (data: CreateInvoiceInput) => {
    await createInvoice.mutateAsync(data);
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
      navigate('/finance/invoices');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
        <p className="text-muted-foreground">
          Fill in the details below to create a new customer invoice
        </p>
      </div>

      {/* Form */}
      <InvoiceForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createInvoice.isPending}
      />
    </div>
  );
}
