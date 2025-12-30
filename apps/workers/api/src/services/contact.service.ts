/**
 * Contact Service
 * Manage individual contacts
 */

import { eq, and, desc, like, or } from 'drizzle-orm';
import { drizzleDb } from '../db';
import { contacts, companies } from '@perfex/database';
import type { Contact, ContactWithCompany, CreateContactInput, UpdateContactInput } from '@perfex/shared';

export class ContactService {
  /**
   * Create a new contact
   */
  async create(organizationId: string, userId: string, data: CreateContactInput): Promise<Contact> {
    const now = new Date();
    const contactId = crypto.randomUUID();

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

    // If setting as primary contact for a company, unset other primary contacts
    if (data.isPrimary && data.companyId) {
      await drizzleDb
        .update(contacts)
        .set({ isPrimary: false })
        .where(and(eq(contacts.companyId, data.companyId), eq(contacts.organizationId, organizationId)));
    }

    await drizzleDb.insert(contacts).values({
      id: contactId,
      organizationId,
      companyId: data.companyId || null,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      mobile: data.mobile || null,
      position: data.position || null,
      department: data.department || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      status: 'active',
      isPrimary: data.isPrimary,
      assignedTo: data.assignedTo || null,
      tags: tagsJson,
      notes: data.notes || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    const contact = await this.getById(organizationId, contactId);
    if (!contact) {
      throw new Error('Failed to create contact');
    }

    return contact;
  }

  /**
   * Get contact by ID
   */
  async getById(organizationId: string, contactId: string): Promise<Contact | null> {
    const contact = await drizzleDb
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, organizationId)))
      .get() as any;

    return contact || null;
  }

  /**
   * Get contact by ID with company details
   */
  async getByIdWithCompany(organizationId: string, contactId: string): Promise<ContactWithCompany | null> {
    const contact = await this.getById(organizationId, contactId);
    if (!contact) {
      return null;
    }

    let company = null;
    if (contact.companyId) {
      company = await drizzleDb
        .select()
        .from(companies)
        .where(eq(companies.id, contact.companyId))
        .get() as any;
    }

    return {
      ...contact,
      company,
    };
  }

  /**
   * List contacts with filters
   */
  async list(
    organizationId: string,
    filters?: {
      companyId?: string;
      status?: string;
      assignedTo?: string;
      search?: string;
    }
  ): Promise<Contact[]> {
    let query = drizzleDb
      .select()
      .from(contacts)
      .where(eq(contacts.organizationId, organizationId));

    // Apply filters
    if (filters?.companyId) {
      query = query.where(and(eq(contacts.organizationId, organizationId), eq(contacts.companyId, filters.companyId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(contacts.organizationId, organizationId), eq(contacts.status, filters.status as any)));
    }

    if (filters?.assignedTo) {
      query = query.where(and(eq(contacts.organizationId, organizationId), eq(contacts.assignedTo, filters.assignedTo)));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        and(
          eq(contacts.organizationId, organizationId),
          or(
            like(contacts.firstName, searchTerm),
            like(contacts.lastName, searchTerm),
            like(contacts.email, searchTerm),
            like(contacts.phone, searchTerm),
            like(contacts.mobile, searchTerm)
          )
        )
      );
    }

    const results = await query.orderBy(desc(contacts.createdAt)).all() as any[];
    return results;
  }

  /**
   * List contacts with company details
   */
  async listWithCompany(
    organizationId: string,
    filters?: {
      companyId?: string;
      status?: string;
      assignedTo?: string;
      search?: string;
    }
  ): Promise<ContactWithCompany[]> {
    const contactsList = await this.list(organizationId, filters);

    // Get unique company IDs
    const companyIds = [...new Set(contactsList.map((c) => c.companyId).filter(Boolean) as string[])];

    // Fetch companies
    const companiesList = companyIds.length > 0
      ? await drizzleDb
          .select()
          .from(companies)
          .where(eq(companies.organizationId, organizationId))
          .all()
      : [];

    const companiesMap = new Map(companiesList.map((c) => [c.id, c]));

    // Combine contacts with companies
    return contactsList.map((contact) => ({
      ...contact,
      company: contact.companyId ? (companiesMap.get(contact.companyId) || null) : null,
    }));
  }

  /**
   * Update contact
   */
  async update(organizationId: string, contactId: string, data: UpdateContactInput): Promise<Contact> {
    // Verify contact exists and belongs to organization
    const existing = await this.getById(organizationId, contactId);
    if (!existing) {
      throw new Error('Contact not found');
    }

    // If setting as primary contact for a company, unset other primary contacts
    if (data.isPrimary && data.companyId) {
      await drizzleDb
        .update(contacts)
        .set({ isPrimary: false })
        .where(and(eq(contacts.companyId, data.companyId), eq(contacts.organizationId, organizationId)));
    }

    // Convert tags array to JSON string if provided
    const tagsJson = data.tags ? JSON.stringify(data.tags) : undefined;

    const updateData: any = {
      ...data,
      tags: tagsJson,
      updatedAt: new Date(),
    };

    await drizzleDb
      .update(contacts)
      .set(updateData)
      .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, organizationId)));

    const updated = await this.getById(organizationId, contactId);
    if (!updated) {
      throw new Error('Failed to update contact');
    }

    return updated;
  }

  /**
   * Delete contact
   */
  async delete(organizationId: string, contactId: string): Promise<void> {
    // Verify contact exists and belongs to organization
    const existing = await this.getById(organizationId, contactId);
    if (!existing) {
      throw new Error('Contact not found');
    }

    await drizzleDb
      .delete(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, organizationId)));
  }
}

export const contactService = new ContactService();
