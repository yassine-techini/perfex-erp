/**
 * Contacts Routes
 * /api/v1/contacts
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createContactSchema, updateContactSchema } from '@perfex/shared';
import { contactService } from '../services/contact.service';
import { requireAuth, requirePermission } from '../middleware/auth';
import type { Env } from '../types';

const contacts = new Hono<{ Bindings: Env }>();

// All routes require authentication
contacts.use('/*', requireAuth);

/**
 * GET /contacts
 * List contacts with optional filters
 */
contacts.get(
  '/',
  requirePermission('crm:contacts:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const companyId = c.req.query('companyId');
    const status = c.req.query('status');
    const assignedTo = c.req.query('assignedTo');
    const search = c.req.query('search');
    const includeCompany = c.req.query('includeCompany') === 'true';

    const filters = {
      companyId,
      status,
      assignedTo,
      search,
    };

    const result = includeCompany
      ? await contactService.listWithCompany(organizationId, filters)
      : await contactService.list(organizationId, filters);

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /contacts/:id
 * Get a single contact
 */
contacts.get(
  '/:id',
  requirePermission('crm:contacts:read'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const contactId = c.req.param('id');
    const includeCompany = c.req.query('includeCompany') === 'true';

    const contact = includeCompany
      ? await contactService.getByIdWithCompany(organizationId, contactId)
      : await contactService.getById(organizationId, contactId);

    if (!contact) {
      return c.json({ success: false, error: 'Contact not found' }, 404);
    }

    return c.json({
      success: true,
      data: contact,
    });
  }
);

/**
 * POST /contacts
 * Create a new contact
 */
contacts.post(
  '/',
  requirePermission('crm:contacts:create'),
  zValidator('json', createContactSchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const userId = c.get('userId');
    const data = c.req.valid('json');

    const contact = await contactService.create(organizationId, userId, data);

    return c.json({
      success: true,
      data: contact,
    }, 201);
  }
);

/**
 * PUT /contacts/:id
 * Update a contact
 */
contacts.put(
  '/:id',
  requirePermission('crm:contacts:update'),
  zValidator('json', updateContactSchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const contactId = c.req.param('id');
    const data = c.req.valid('json');

    const contact = await contactService.update(organizationId, contactId, data);

    return c.json({
      success: true,
      data: contact,
    });
  }
);

/**
 * DELETE /contacts/:id
 * Delete a contact
 */
contacts.delete(
  '/:id',
  requirePermission('crm:contacts:delete'),
  async (c) => {
    const organizationId = c.get('organizationId');
    const contactId = c.req.param('id');

    await contactService.delete(organizationId, contactId);

    return c.json({
      success: true,
      data: { message: 'Contact deleted successfully' },
    });
  }
);

export default contacts;
