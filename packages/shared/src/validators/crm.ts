/**
 * CRM validators (Zod schemas)
 */

import { z } from 'zod';

/**
 * Create company schema
 */
export const createCompanySchema = z.object({
  name: z.string().min(2).max(200),
  website: z.string().url().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  size: z.enum(['small', 'medium', 'large', 'enterprise']).optional().nullable(),
  type: z.enum(['customer', 'prospect', 'partner', 'vendor']).default('prospect'),
  assignedTo: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

/**
 * Update company schema
 */
export const updateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  website: z.string().url().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  size: z.enum(['small', 'medium', 'large', 'enterprise']).optional().nullable(),
  type: z.enum(['customer', 'prospect', 'partner', 'vendor']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

/**
 * Create contact schema
 */
export const createContactSchema = z.object({
  companyId: z.string().uuid().optional().nullable(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  isPrimary: z.boolean().default(false),
  assignedTo: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

/**
 * Update contact schema
 */
export const updateContactSchema = z.object({
  companyId: z.string().uuid().optional().nullable(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  isPrimary: z.boolean().optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/**
 * Create pipeline stage schema
 */
export const createPipelineStageSchema = z.object({
  name: z.string().min(2).max(100),
  order: z.number().int().min(0),
  probability: z.number().int().min(0).max(100).default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;

/**
 * Update pipeline stage schema
 */
export const updatePipelineStageSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  order: z.number().int().min(0).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  active: z.boolean().optional(),
});

export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;

/**
 * Create opportunity schema
 */
export const createOpportunitySchema = z.object({
  companyId: z.string().uuid(),
  contactId: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  value: z.number().min(0),
  currency: z.string().length(3).default('EUR'),
  stageId: z.string().uuid(),
  probability: z.number().int().min(0).max(100).default(0),
  expectedCloseDate: z.string().datetime().or(z.date()).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

/**
 * Update opportunity schema
 */
export const updateOpportunitySchema = z.object({
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  stageId: z.string().uuid().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().or(z.date()).optional().nullable(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  lostReason: z.string().max(500).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;

/**
 * Create activity schema
 */
export const createActivitySchema = z.object({
  type: z.enum(['task', 'call', 'meeting', 'email', 'note']),
  subject: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().or(z.date()).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(), // minutes
  location: z.string().max(200).optional().nullable(),
  relatedToType: z.enum(['company', 'contact', 'opportunity']).optional().nullable(),
  relatedToId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

/**
 * Update activity schema
 */
export const updateActivitySchema = z.object({
  type: z.enum(['task', 'call', 'meeting', 'email', 'note']).optional(),
  subject: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().or(z.date()).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  relatedToType: z.enum(['company', 'contact', 'opportunity']).optional().nullable(),
  relatedToId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
});

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

/**
 * Create product schema
 */
export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  price: z.number().min(0),
  cost: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('EUR'),
  unit: z.string().max(50).default('unit'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Update product schema
 */
export const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  code: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  unit: z.string().max(50).optional(),
  active: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
