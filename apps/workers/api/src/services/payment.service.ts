/**
 * Payment Service
 * Payment management and allocation to invoices
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc } from 'drizzle-orm';
import {
  payments,
  paymentAllocations,
  invoices,
  type Payment,
  type PaymentAllocation,
} from '@perfex/database';
import type { CreatePaymentInput } from '@perfex/shared';
import { InvoiceService } from './invoice.service';

export class PaymentService {
  constructor(private db: D1Database) {}

  /**
   * Generate next payment reference
   */
  private async generateReference(organizationId: string): Promise<string> {
    const drizzleDb = drizzle(this.db);

    // Get last payment for this organization
    const lastPayment = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.organizationId, organizationId))
      .orderBy(desc(payments.createdAt))
      .limit(1)
      .get();

    // Extract number from last reference (e.g., "PAY-2024-001" -> 1)
    let nextNumber = 1;
    if (lastPayment?.reference) {
      const match = lastPayment.reference.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format: PAY-YYYY-NNNN
    const year = new Date().getFullYear();
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `PAY-${year}-${paddedNumber}`;
  }

  /**
   * Create payment
   */
  async create(
    organizationId: string,
    userId: string,
    data: CreatePaymentInput
  ): Promise<Payment> {
    const drizzleDb = drizzle(this.db);

    // Generate reference if not provided
    const reference = data.reference || await this.generateReference(organizationId);

    // Validate allocations if provided
    if (data.invoiceAllocations && data.invoiceAllocations.length > 0) {
      const totalAllocated = data.invoiceAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      if (Math.abs(totalAllocated - data.amount) >= 0.01) {
        throw new Error('Total allocated amount must equal payment amount');
      }

      // Validate each invoice exists
      for (const allocation of data.invoiceAllocations) {
        const invoice = await drizzleDb
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.id, allocation.invoiceId),
              eq(invoices.organizationId, organizationId)
            )
          )
          .get();

        if (!invoice) {
          throw new Error(`Invoice ${allocation.invoiceId} not found`);
        }

        // Validate allocation amount doesn't exceed amount due
        if (allocation.amount > invoice.amountDue) {
          throw new Error(`Allocation amount exceeds invoice amount due for ${allocation.invoiceId}`);
        }
      }
    }

    // Create payment
    const paymentId = crypto.randomUUID();
    const now = new Date();
    const paymentDate = typeof data.date === 'string' ? new Date(data.date) : data.date;

    await drizzleDb.insert(payments).values({
      id: paymentId,
      organizationId,
      reference,
      date: paymentDate,
      amount: data.amount,
      currency: data.currency || 'EUR',
      paymentMethod: data.paymentMethod,
      customerId: data.customerId || null,
      supplierId: data.supplierId || null,
      accountId: data.accountId || null,
      journalEntryId: null, // Will be set when journal entry is created
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
    });

    // Create allocations if provided
    if (data.invoiceAllocations && data.invoiceAllocations.length > 0) {
      const invoiceService = new InvoiceService(this.db);

      for (const allocation of data.invoiceAllocations) {
        const allocationId = crypto.randomUUID();
        await drizzleDb.insert(paymentAllocations).values({
          id: allocationId,
          paymentId,
          invoiceId: allocation.invoiceId,
          amount: allocation.amount,
          createdAt: now,
        });

        // Update invoice payment status
        await invoiceService.recordPayment(allocation.invoiceId, organizationId, allocation.amount);
      }
    }

    const payment = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .get();

    if (!payment) {
      throw new Error('Failed to create payment');
    }

    return payment as Payment;
  }

  /**
   * Get payment by ID
   */
  async getById(paymentId: string, organizationId: string): Promise<Payment> {
    const drizzleDb = drizzle(this.db);

    const payment = await drizzleDb
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.organizationId, organizationId)
        )
      )
      .get();

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment as Payment;
  }

  /**
   * Get payment with allocations
   */
  async getWithAllocations(
    paymentId: string,
    organizationId: string
  ): Promise<Payment & { allocations: PaymentAllocation[] }> {
    const drizzleDb = drizzle(this.db);

    const payment = await this.getById(paymentId, organizationId);

    // Get allocations
    const allocations = await drizzleDb
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId))
      .all();

    return {
      ...payment,
      allocations: allocations as PaymentAllocation[],
    };
  }

  /**
   * List payments
   */
  async list(
    organizationId: string,
    options?: {
      customerId?: string;
      supplierId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Payment[]> {
    const drizzleDb = drizzle(this.db);

    const paymentsList = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.organizationId, organizationId))
      .orderBy(desc(payments.date))
      .all();

    // Filter in memory
    let filtered = paymentsList;

    if (options?.customerId) {
      filtered = filtered.filter(p => p.customerId === options.customerId);
    }

    if (options?.supplierId) {
      filtered = filtered.filter(p => p.supplierId === options.supplierId);
    }

    if (options?.startDate) {
      filtered = filtered.filter(p => new Date(p.date) >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(p => new Date(p.date) <= options.endDate!);
    }

    // Apply limit and offset
    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered as Payment[];
  }

  /**
   * Get allocations for invoice
   */
  async getAllocationsForInvoice(
    invoiceId: string,
    organizationId: string
  ): Promise<(PaymentAllocation & { payment: Payment })[]> {
    const drizzleDb = drizzle(this.db);

    // Verify invoice exists and belongs to organization
    const invoice = await drizzleDb
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, organizationId)
        )
      )
      .get();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get allocations
    const allocations = await drizzleDb
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.invoiceId, invoiceId))
      .all();

    // Get payment details for each allocation
    const allocationsWithPayments = [];
    for (const allocation of allocations) {
      const payment = await this.getById(allocation.paymentId, organizationId);
      allocationsWithPayments.push({
        ...allocation,
        payment,
      });
    }

    return allocationsWithPayments as (PaymentAllocation & { payment: Payment })[];
  }

  /**
   * Delete payment (unallocate from invoices first)
   */
  async delete(paymentId: string, organizationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    // Get payment
    const payment = await this.getById(paymentId, organizationId);

    // Get allocations
    const allocations = await drizzleDb
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId))
      .all();

    // Unallocate from invoices (reverse payment)
    if (allocations.length > 0) {
      const invoiceService = new InvoiceService(this.db);
      for (const allocation of allocations) {
        await invoiceService.recordPayment(
          allocation.invoiceId,
          organizationId,
          -allocation.amount // Negative amount to reverse
        );
      }
    }

    // Delete allocations
    await drizzleDb
      .delete(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId));

    // Delete payment
    await drizzleDb
      .delete(payments)
      .where(eq(payments.id, paymentId));
  }
}
