/**
 * Invoice Service
 * Customer invoice management
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import {
  invoices,
  invoiceLines,
  taxRates,
  type Invoice,
  type InvoiceLine,
} from '@perfex/database';
import type { CreateInvoiceInput, UpdateInvoiceInput, InvoiceWithLines } from '@perfex/shared';

export class InvoiceService {
  constructor(private db: D1Database) {}

  /**
   * Generate next invoice number
   */
  private async generateInvoiceNumber(organizationId: string): Promise<string> {
    const drizzleDb = drizzle(this.db);

    // Get last invoice for this organization
    const lastInvoice = await drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.createdAt))
      .limit(1)
      .get();

    // Extract number from last invoice (e.g., "INV-2024-001" -> 1)
    let nextNumber = 1;
    if (lastInvoice?.number) {
      const match = lastInvoice.number.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format: INV-YYYY-NNNN
    const year = new Date().getFullYear();
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `INV-${year}-${paddedNumber}`;
  }

  /**
   * Create invoice
   */
  async create(
    organizationId: string,
    userId: string,
    data: CreateInvoiceInput
  ): Promise<InvoiceWithLines> {
    const drizzleDb = drizzle(this.db);

    // Generate invoice number
    const number = await this.generateInvoiceNumber(organizationId);

    // Calculate line totals
    const lines = [];
    let subtotal = 0;
    let totalTaxAmount = 0;

    for (const line of data.lines) {
      // Get tax rate if specified
      let taxRate = 0;
      let taxAmount = 0;

      if (line.taxRateId) {
        const taxRateRecord = await drizzleDb
          .select()
          .from(taxRates)
          .where(
            and(
              eq(taxRates.id, line.taxRateId),
              eq(taxRates.organizationId, organizationId)
            )
          )
          .get();

        if (taxRateRecord) {
          taxRate = taxRateRecord.rate;
        }
      }

      // Calculate amounts
      const lineTotal = line.quantity * line.unitPrice;
      taxAmount = (lineTotal * taxRate) / 100;
      const lineWithTax = lineTotal + taxAmount;

      subtotal += lineTotal;
      totalTaxAmount += taxAmount;

      lines.push({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRateId: line.taxRateId || null,
        taxRate,
        taxAmount,
        total: lineWithTax,
        accountId: line.accountId || null,
      });
    }

    const total = subtotal + totalTaxAmount;

    // Create invoice
    const invoiceId = crypto.randomUUID();
    const now = new Date();
    const invoiceDate = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const dueDate = typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate;

    await drizzleDb.insert(invoices).values({
      id: invoiceId,
      organizationId,
      number,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      date: invoiceDate,
      dueDate,
      status: 'draft',
      subtotal,
      taxAmount: totalTaxAmount,
      total,
      amountPaid: 0,
      amountDue: total,
      currency: data.currency || 'EUR',
      notes: data.notes || null,
      terms: data.terms || null,
      pdfUrl: null,
      journalEntryId: null,
      createdBy: userId,
      sentAt: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create invoice lines
    for (const line of lines) {
      const lineId = crypto.randomUUID();
      await drizzleDb.insert(invoiceLines).values({
        id: lineId,
        invoiceId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRateId: line.taxRateId,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        total: line.total,
        accountId: line.accountId,
        createdAt: now,
      });
    }

    return this.getById(invoiceId, organizationId);
  }

  /**
   * Get invoice by ID with lines
   */
  async getById(invoiceId: string, organizationId: string): Promise<InvoiceWithLines> {
    const drizzleDb = drizzle(this.db);

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

    // Get lines
    const lines = await drizzleDb
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId))
      .all();

    return {
      ...(invoice as Invoice),
      lines: lines as InvoiceLine[],
    };
  }

  /**
   * List invoices
   */
  async list(
    organizationId: string,
    options?: {
      customerId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<InvoiceWithLines[]> {
    const drizzleDb = drizzle(this.db);

    const invoicesList = await drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.date))
      .all();

    // Filter in memory
    let filtered = invoicesList;

    if (options?.customerId) {
      filtered = filtered.filter(i => i.customerId === options.customerId);
    }

    if (options?.status) {
      filtered = filtered.filter(i => i.status === options.status);
    }

    if (options?.startDate) {
      filtered = filtered.filter(i => new Date(i.date) >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(i => new Date(i.date) <= options.endDate!);
    }

    // Apply limit and offset
    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    // Get lines for each invoice
    const invoicesWithLines: InvoiceWithLines[] = [];
    for (const invoice of filtered) {
      const invoiceWithLines = await this.getById(invoice.id, organizationId);
      invoicesWithLines.push(invoiceWithLines);
    }

    return invoicesWithLines;
  }

  /**
   * Update invoice
   */
  async update(
    invoiceId: string,
    organizationId: string,
    data: UpdateInvoiceInput
  ): Promise<InvoiceWithLines> {
    const drizzleDb = drizzle(this.db);

    // Check if invoice exists
    const invoice = await this.getById(invoiceId, organizationId);

    // Can't update paid or cancelled invoices
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      throw new Error('Cannot update paid or cancelled invoices');
    }

    // Prepare update data
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Convert date strings to Date objects
    if (data.date) {
      updateData.date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    }
    if (data.dueDate) {
      updateData.dueDate = typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate;
    }

    await drizzleDb
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId));

    return this.getById(invoiceId, organizationId);
  }

  /**
   * Mark invoice as sent
   */
  async markAsSent(invoiceId: string, organizationId: string): Promise<InvoiceWithLines> {
    const drizzleDb = drizzle(this.db);

    const invoice = await this.getById(invoiceId, organizationId);

    if (invoice.status !== 'draft') {
      throw new Error('Can only mark draft invoices as sent');
    }

    await drizzleDb
      .update(invoices)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    return this.getById(invoiceId, organizationId);
  }

  /**
   * Record payment (updates amountPaid and status)
   */
  async recordPayment(
    invoiceId: string,
    organizationId: string,
    amount: number
  ): Promise<InvoiceWithLines> {
    const drizzleDb = drizzle(this.db);

    const invoice = await this.getById(invoiceId, organizationId);

    if (invoice.status === 'cancelled') {
      throw new Error('Cannot record payment for cancelled invoice');
    }

    const newAmountPaid = invoice.amountPaid + amount;
    const newAmountDue = invoice.total - newAmountPaid;

    let newStatus = invoice.status;
    let paidAt = invoice.paidAt;

    if (newAmountDue <= 0) {
      newStatus = 'paid';
      paidAt = new Date();
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    await drizzleDb
      .update(invoices)
      .set({
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        paidAt,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    return this.getById(invoiceId, organizationId);
  }

  /**
   * Cancel invoice
   */
  async cancel(invoiceId: string, organizationId: string): Promise<InvoiceWithLines> {
    const drizzleDb = drizzle(this.db);

    const invoice = await this.getById(invoiceId, organizationId);

    if (invoice.status === 'paid') {
      throw new Error('Cannot cancel paid invoice. Create a credit note instead.');
    }

    await drizzleDb
      .update(invoices)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    return this.getById(invoiceId, organizationId);
  }

  /**
   * Delete invoice (drafts only)
   */
  async delete(invoiceId: string, organizationId: string): Promise<void> {
    const drizzleDb = drizzle(this.db);

    const invoice = await this.getById(invoiceId, organizationId);

    if (invoice.status !== 'draft') {
      throw new Error('Can only delete draft invoices');
    }

    // Delete lines first
    await drizzleDb
      .delete(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId));

    // Delete invoice
    await drizzleDb
      .delete(invoices)
      .where(eq(invoices.id, invoiceId));
  }
}
