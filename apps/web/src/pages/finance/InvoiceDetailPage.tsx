/**
 * Invoice Detail Page
 * View and manage a single invoice
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { InvoiceWithLines } from '@perfex/shared';
import { format } from 'date-fns';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch invoice
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<InvoiceWithLines>>(`/invoices/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Send invoice mutation
  const sendInvoice = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/invoices/${id}/send`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert('Invoice sent successfully!');
    },
    onError: (error) => {
      alert(`Failed to send invoice: ${getErrorMessage(error)}`);
    },
  });

  // Cancel invoice mutation
  const cancelInvoice = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/invoices/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert('Invoice cancelled successfully!');
    },
    onError: (error) => {
      alert(`Failed to cancel invoice: ${getErrorMessage(error)}`);
    },
  });

  // Delete invoice mutation
  const deleteInvoice = useMutation({
    mutationFn: async () => {
      await api.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert('Invoice deleted successfully!');
      navigate('/finance/invoices');
    },
    onError: (error) => {
      alert(`Failed to delete invoice: ${getErrorMessage(error)}`);
    },
  });

  const handleSend = () => {
    if (confirm('Are you sure you want to send this invoice to the customer?')) {
      sendInvoice.mutate();
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) {
      cancelInvoice.mutate();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice.mutate();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center p-12">
        <p className="text-destructive">Error: {error ? getErrorMessage(error) : 'Invoice not found'}</p>
        <Link
          to="/finance/invoices"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/finance/invoices"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.number}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Created on {format(new Date(invoice.createdAt), 'MMMM dd, yyyy')}
          </p>
        </div>

        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={handleSend}
              disabled={sendInvoice.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Send Invoice
            </button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <>
              <button
                onClick={handleCancel}
                disabled={cancelInvoice.isPending}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                Cancel Invoice
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteInvoice.isPending}
                className="rounded-md border border-destructive text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          <button
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="rounded-lg border bg-card p-8">
        {/* Invoice Header */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Company Info (Left) */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">From</h2>
            <div className="text-lg font-bold">Your Company Name</div>
            <div className="text-sm text-muted-foreground mt-1">
              123 Business Street<br />
              Paris, France 75001<br />
              contact@company.com
            </div>
          </div>

          {/* Customer Info (Right) */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Bill To</h2>
            <div className="text-lg font-bold">{invoice.customerName}</div>
            {invoice.customerEmail && (
              <div className="text-sm text-muted-foreground">{invoice.customerEmail}</div>
            )}
            {invoice.customerAddress && (
              <div className="text-sm text-muted-foreground whitespace-pre-line mt-1">
                {invoice.customerAddress}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid md:grid-cols-3 gap-4 mb-8 py-4 border-y">
          <div>
            <div className="text-sm text-muted-foreground">Invoice Date</div>
            <div className="font-medium">{format(new Date(invoice.date), 'MMM dd, yyyy')}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Due Date</div>
            <div className="font-medium">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Currency</div>
            <div className="font-medium">{invoice.currency}</div>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full mb-8">
          <thead className="border-b">
            <tr>
              <th className="text-left py-3 text-sm font-semibold text-muted-foreground">Description</th>
              <th className="text-right py-3 text-sm font-semibold text-muted-foreground w-24">Quantity</th>
              <th className="text-right py-3 text-sm font-semibold text-muted-foreground w-32">Unit Price</th>
              <th className="text-right py-3 text-sm font-semibold text-muted-foreground w-32">Tax</th>
              <th className="text-right py-3 text-sm font-semibold text-muted-foreground w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td className="py-3 text-sm">{line.description}</td>
                <td className="py-3 text-sm text-right">{line.quantity}</td>
                <td className="py-3 text-sm text-right font-mono">€{line.unitPrice.toFixed(2)}</td>
                <td className="py-3 text-sm text-right font-mono">€{line.taxAmount.toFixed(2)}</td>
                <td className="py-3 text-sm text-right font-mono font-medium">€{line.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-mono">€{invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span className="font-mono">€{invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="font-mono">€{invoice.total.toFixed(2)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Amount Paid:</span>
                  <span className="font-mono">€{invoice.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-orange-600 border-t pt-2">
                  <span>Amount Due:</span>
                  <span className="font-mono">€{invoice.amountDue.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-8 pt-8 border-t space-y-4">
            {invoice.notes && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Notes</h3>
                <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Terms & Conditions</h3>
                <p className="text-sm whitespace-pre-line">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History */}
      {invoice.amountPaid > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Payment History</h3>
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between py-2 border-b">
              <span>Total Paid:</span>
              <span className="font-medium text-foreground">€{invoice.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Remaining Balance:</span>
              <span className="font-medium text-foreground">€{invoice.amountDue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
