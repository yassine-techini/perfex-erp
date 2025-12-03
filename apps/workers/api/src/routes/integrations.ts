/**
 * Integrations API Routes
 * Manage integration providers, configurations, and transactions
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { IntegrationsService } from '../services/integrations.service';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const integrationsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
integrationsRoutes.use('*', authMiddleware);

// ============================================
// PROVIDER INFO (Available providers)
// ============================================

// Get available providers
integrationsRoutes.get('/providers', async (c) => {
  // Return static provider info - in production, this would come from @perfex/integrations
  const providers = {
    payment: [
      {
        id: 'd17',
        name: 'D17',
        description: 'Solution de paiement mobile par Banque de Tunisie',
        logo: '/integrations/d17.png',
        website: 'https://www.d17.tn',
        requiredCredentials: ['merchantId', 'apiKey', 'secretKey'],
      },
      {
        id: 'flouci',
        name: 'Flouci',
        description: 'Paiement mobile simple et rapide en Tunisie',
        logo: '/integrations/flouci.png',
        website: 'https://flouci.com',
        requiredCredentials: ['appToken', 'appSecret'],
      },
      {
        id: 'konnect',
        name: 'Konnect',
        description: 'Passerelle de paiement multi-canaux (carte, wallet, e-DINAR)',
        logo: '/integrations/konnect.png',
        website: 'https://konnect.network',
        requiredCredentials: ['apiKey', 'receiverWalletId'],
      },
      {
        id: 'paymee',
        name: 'Paymee',
        description: 'Passerelle de paiement en ligne tunisienne',
        logo: '/integrations/paymee.png',
        website: 'https://paymee.tn',
        requiredCredentials: ['apiToken', 'vendorId'],
      },
    ],
    fiscal: [
      {
        id: 'cnss',
        name: 'CNSS',
        description: 'Caisse Nationale de Sécurité Sociale - Déclarations mensuelles',
        logo: '/integrations/cnss.png',
        website: 'https://www.cnss.tn',
        requiredCredentials: ['employerNumber', 'accessCode', 'password'],
      },
    ],
    sms: [
      {
        id: 'ooredoo',
        name: 'Ooredoo Tunisia',
        description: 'Service SMS professionnel Ooredoo Tunisie',
        logo: '/integrations/ooredoo.png',
        website: 'https://www.ooredoo.tn',
        requiredCredentials: ['username', 'password', 'senderId'],
      },
      {
        id: 'tunisie-telecom',
        name: 'Tunisie Telecom',
        description: 'Service SMS professionnel Tunisie Telecom',
        logo: '/integrations/tunisie-telecom.png',
        website: 'https://www.tunisietelecom.tn',
        requiredCredentials: ['apiKey', 'apiSecret', 'senderId'],
      },
    ],
    shipping: [
      {
        id: 'aramex',
        name: 'Aramex Tunisia',
        description: 'Service de livraison express national et international',
        logo: '/integrations/aramex.png',
        website: 'https://www.aramex.com',
        requiredCredentials: ['accountNumber', 'accountPin', 'username', 'password'],
      },
      {
        id: 'livrili',
        name: 'Livrili',
        description: 'Service de livraison local avec paiement à la livraison',
        logo: '/integrations/livrili.png',
        website: 'https://livrili.tn',
        requiredCredentials: ['apiKey', 'storeId'],
      },
    ],
  };

  return c.json({ data: providers });
});

// Get providers by category
integrationsRoutes.get('/providers/:category', async (c) => {
  const category = c.req.param('category');
  // Same data filtered by category
  return c.json({ data: [] }); // Simplified for now
});

// ============================================
// CONFIGURATIONS
// ============================================

// List all configurations
integrationsRoutes.get(
  '/configs',
  requirePermissions('integrations:read'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const service = new IntegrationsService(db);

    const configs = await service.listConfigs(user.organizationId);

    // Remove credentials from response for security
    const safeConfigs = configs.map(config => ({
      ...config,
      credentials: '[HIDDEN]',
    }));

    return c.json({ data: safeConfigs });
  }
);

// Get configurations by category
integrationsRoutes.get(
  '/configs/category/:category',
  requirePermissions('integrations:read'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const category = c.req.param('category');
    const service = new IntegrationsService(db);

    const configs = await service.getConfigsByCategory(user.organizationId, category);

    const safeConfigs = configs.map(config => ({
      ...config,
      credentials: '[HIDDEN]',
    }));

    return c.json({ data: safeConfigs });
  }
);

// Get single configuration
integrationsRoutes.get(
  '/configs/:id',
  requirePermissions('integrations:read'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const service = new IntegrationsService(db);

    const config = await service.getConfigById(user.organizationId, id);

    if (!config) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Configuration non trouvée' } }, 404);
    }

    return c.json({
      data: {
        ...config,
        credentials: '[HIDDEN]',
      },
    });
  }
);

// Create configuration
const createConfigSchema = z.object({
  providerId: z.string().min(1),
  providerCategory: z.enum(['payment', 'fiscal', 'sms', 'shipping']),
  name: z.string().min(1),
  credentials: z.record(z.string()),
  settings: z.record(z.unknown()).optional(),
  environment: z.enum(['sandbox', 'production']).default('production'),
  isEnabled: z.boolean().default(false),
  isDefault: z.boolean().default(false),
});

integrationsRoutes.post(
  '/configs',
  requirePermissions('integrations:write'),
  zValidator('json', createConfigSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const data = c.req.valid('json');
    const service = new IntegrationsService(db);

    const config = await service.createConfig({
      ...data,
      organizationId: user.organizationId,
      credentials: JSON.stringify(data.credentials),
      settings: data.settings ? JSON.stringify(data.settings) : null,
      createdBy: user.id,
    });

    return c.json({
      data: {
        ...config,
        credentials: '[HIDDEN]',
      },
    }, 201);
  }
);

// Update configuration
const updateConfigSchema = z.object({
  name: z.string().min(1).optional(),
  credentials: z.record(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
  environment: z.enum(['sandbox', 'production']).optional(),
  isEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

integrationsRoutes.put(
  '/configs/:id',
  requirePermissions('integrations:write'),
  zValidator('json', updateConfigSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const service = new IntegrationsService(db);

    const updateData: Record<string, unknown> = { ...data };
    if (data.credentials) {
      updateData.credentials = JSON.stringify(data.credentials);
    }
    if (data.settings) {
      updateData.settings = JSON.stringify(data.settings);
    }

    const config = await service.updateConfig(user.organizationId, id, updateData);

    if (!config) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Configuration non trouvée' } }, 404);
    }

    return c.json({
      data: {
        ...config,
        credentials: '[HIDDEN]',
      },
    });
  }
);

// Delete configuration
integrationsRoutes.delete(
  '/configs/:id',
  requirePermissions('integrations:write'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const service = new IntegrationsService(db);

    const deleted = await service.deleteConfig(user.organizationId, id);

    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Configuration non trouvée' } }, 404);
    }

    return c.json({ data: { success: true } });
  }
);

// Test configuration connection
integrationsRoutes.post(
  '/configs/:id/test',
  requirePermissions('integrations:write'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const service = new IntegrationsService(db);

    const result = await service.testConnection(user.organizationId, id);

    return c.json({ data: result });
  }
);

// ============================================
// TRANSACTIONS
// ============================================

// List transactions
integrationsRoutes.get(
  '/transactions',
  requirePermissions('integrations:read'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const service = new IntegrationsService(db);

    const configId = c.req.query('configId');
    const type = c.req.query('type');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const transactions = await service.listTransactions(user.organizationId, {
      configId,
      type,
      status,
      limit,
      offset,
    });

    return c.json({ data: transactions });
  }
);

// Get transaction details
integrationsRoutes.get(
  '/transactions/:id',
  requirePermissions('integrations:read'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const service = new IntegrationsService(db);

    const transaction = await service.getTransactionById(user.organizationId, id);

    if (!transaction) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Transaction non trouvée' } }, 404);
    }

    return c.json({ data: transaction });
  }
);

// ============================================
// STATISTICS
// ============================================

integrationsRoutes.get(
  '/stats',
  requirePermissions('integrations:read'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const service = new IntegrationsService(db);

    const stats = await service.getStats(user.organizationId);

    return c.json({ data: stats });
  }
);

// ============================================
// WEBHOOK HANDLERS
// ============================================

// Generic webhook endpoint for providers
integrationsRoutes.post('/webhooks/:providerId', async (c) => {
  const providerId = c.req.param('providerId');
  const db = c.get('db');
  const service = new IntegrationsService(db);

  try {
    const payload = await c.req.json();
    const signature = c.req.header('x-webhook-signature') ||
                      c.req.header('x-signature') ||
                      c.req.header('authorization');

    // Create webhook event record
    const event = await service.createWebhookEvent({
      providerId,
      eventType: payload.event || payload.type || 'unknown',
      payload: JSON.stringify(payload),
      signature: signature || undefined,
      ipAddress: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for'),
      userAgent: c.req.header('user-agent'),
      headers: JSON.stringify(Object.fromEntries(c.req.raw.headers)),
    });

    // Process webhook asynchronously (in production, use a queue)
    // For now, just acknowledge receipt
    return c.json({ received: true, eventId: event.id });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Invalid webhook payload' }, 400);
  }
});

// ============================================
// FISCAL DECLARATIONS
// ============================================

// List declarations
integrationsRoutes.get(
  '/declarations',
  requirePermissions('integrations:read'),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const service = new IntegrationsService(db);

    const type = c.req.query('type');
    const status = c.req.query('status');
    const year = c.req.query('year');

    const declarations = await service.listDeclarations(user.organizationId, {
      type,
      status,
      year,
    });

    return c.json({ data: declarations });
  }
);

// Create declaration
const createDeclarationSchema = z.object({
  configId: z.string().min(1),
  declarationType: z.enum(['cnss_monthly', 'tva', 'is', 'irpp']),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Format de période invalide (YYYY-MM)'),
  declarationData: z.record(z.unknown()),
  totalAmount: z.number().optional(),
  employeeCount: z.number().optional(),
  notes: z.string().optional(),
});

integrationsRoutes.post(
  '/declarations',
  requirePermissions('integrations:write'),
  zValidator('json', createDeclarationSchema),
  async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const data = c.req.valid('json');
    const service = new IntegrationsService(db);

    const declaration = await service.createDeclaration({
      ...data,
      organizationId: user.organizationId,
      declarationData: JSON.stringify(data.declarationData),
      status: 'draft',
    });

    return c.json({ data: declaration }, 201);
  }
);

export default integrationsRoutes;
