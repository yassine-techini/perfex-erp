/**
 * Invoice Form Component
 * Create and edit invoices with line items
 */

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvoiceSchema, type CreateInvoiceInput } from '@perfex/shared';
import { z } from 'zod';

// Adjust schema for form - allow empty strings that we'll clean up on submit
const invoiceFormSchema = createInvoiceSchema.extend({
  customerEmail: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  onSubmit: (data: CreateInvoiceInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<InvoiceFormData>;
}

export function InvoiceForm({ onSubmit, onCancel, isSubmitting = false, defaultValues }: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: crypto.randomUUID(), // Temporary - will be replaced with customer selector when CRM is ready
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      currency: 'EUR',
      lines: [
        { description: '', quantity: 1, unitPrice: 0, taxRateId: null, accountId: null },
      ],
      notes: '',
      terms: '',
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  // Watch line items for automatic calculation
  const lines = watch('lines');

  // Calculate totals
  const subtotal = lines.reduce((sum: number, line: any) => {
    const lineTotal = (line.quantity || 0) * (line.unitPrice || 0);
    return sum + lineTotal;
  }, 0);

  // For now, assume 20% tax on all items (will be improved with tax rates later)
  const taxAmount = subtotal * 0.2;
  const total = subtotal + taxAmount;

  const handleFormSubmit = async (data: InvoiceFormData) => {
    // Clean up empty strings to null
    const cleanedData: CreateInvoiceInput = {
      ...data,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      notes: data.notes || null,
      terms: data.terms || null,
      lines: data.lines.map((line: any) => ({
        ...line,
        taxRateId: line.taxRateId || null,
        accountId: line.accountId || null,
      })),
    };

    await onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Customer Information */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">
              Customer Name <span className="text-destructive">*</span>
            </label>
            <input
              {...register('customerName')}
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter customer name"
            />
            {errors.customerName && (
              <p className="text-destructive text-sm mt-1">{errors.customerName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Customer Email</label>
            <input
              {...register('customerEmail')}
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="customer@example.com"
            />
            {errors.customerEmail && (
              <p className="text-destructive text-sm mt-1">{errors.customerEmail.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Customer Address</label>
            <textarea
              {...register('customerAddress')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter customer address"
            />
            {errors.customerAddress && (
              <p className="text-destructive text-sm mt-1">{errors.customerAddress.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Invoice Date <span className="text-destructive">*</span>
            </label>
            <input
              {...register('date')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {errors.date && (
              <p className="text-destructive text-sm mt-1">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Due Date <span className="text-destructive">*</span>
            </label>
            <input
              {...register('dueDate')}
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {errors.dueDate && (
              <p className="text-destructive text-sm mt-1">{errors.dueDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Currency</label>
            <select
              {...register('currency')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="XOF">XOF (CFA)</option>
            </select>
            {errors.currency && (
              <p className="text-destructive text-sm mt-1">{errors.currency.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <button
            type="button"
            onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRateId: null, accountId: null })}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Line
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  {...register(`lines.${index}.description` as const)}
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Description"
                />
                {errors.lines?.[index]?.description && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.lines[index]?.description?.message}
                  </p>
                )}
              </div>

              <div className="w-24">
                <input
                  {...register(`lines.${index}.quantity` as const, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Qty"
                />
              </div>

              <div className="w-32">
                <input
                  {...register(`lines.${index}.unitPrice` as const, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Unit Price"
                />
              </div>

              <div className="w-32 text-right py-2 text-sm font-medium">
                €{((lines[index]?.quantity || 0) * (lines[index]?.unitPrice || 0)).toFixed(2)}
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="rounded-md border border-input bg-background p-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {errors.lines && (
          <p className="text-destructive text-sm mt-2">{errors.lines.message}</p>
        )}

        {/* Totals */}
        <div className="mt-6 border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span className="font-medium">€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (20%):</span>
            <span className="font-medium">€{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>€{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes and Terms */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Add any notes for the customer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
            <textarea
              {...register('terms')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Payment terms and conditions"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-input bg-background px-6 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}
