/**
 * Perfex API Worker
 * Main entry point for the Hono.js API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { initializeDb } from './db';
import authRoutes from './routes/auth';
import organizationsRoutes from './routes/organizations';
import rolesRoutes from './routes/roles';
import accountsRoutes from './routes/accounts';
import journalsRoutes from './routes/journals';
import journalEntriesRoutes from './routes/journal-entries';
import invoicesRoutes from './routes/invoices';
import paymentsRoutes from './routes/payments';
import bankAccountsRoutes from './routes/bank-accounts';
import reportsRoutes from './routes/reports';
import companiesRoutes from './routes/companies';
import contactsRoutes from './routes/contacts';
import pipelineRoutes from './routes/pipeline';
import opportunitiesRoutes from './routes/opportunities';
import projectsRoutes from './routes/projects';
import inventoryRoutes from './routes/inventory';
import hrRoutes from './routes/hr';
import procurementRoutes from './routes/procurement';
import salesRoutes from './routes/sales';
import manufacturingRoutes from './routes/manufacturing';
import assetsRoutes from './routes/assets';
import notificationsRoutes from './routes/notifications';
import documentsRoutes from './routes/documents';
import workflowsRoutes from './routes/workflows';
import type { Env } from './types';

/**
 * Create and configure Hono app
 */
const app = new Hono<{ Bindings: Env }>();

/**
 * Global Middleware
 */

// Logging
app.use('*', logger());

// Database initialization middleware
app.use('*', async (c, next) => {
  initializeDb(c.env.DB);
  await next();
});

// CORS
app.use(
  '*',
  cors({
    origin: (origin) => {
      // In development, allow localhost
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
      }
      // Allow Cloudflare Pages deployments
      if (origin.includes('.pages.dev')) {
        return origin;
      }
      // In production, only allow specific domains
      const allowedOrigins = [
        'https://app.perfex.com',
        'https://perfex.com',
        'https://dev.perfex-web-dev.pages.dev',
        'https://staging.perfex-web-staging.pages.dev',
        'https://perfex-web.pages.dev',
      ];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
    maxAge: 86400,
  })
);

// Pretty JSON in development (disabled - causes issues with body parsing)
// app.use('*', prettyJSON());

/**
 * Health check endpoint
 */
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'perfex-api',
    version: '0.1.0',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

/**
 * API v1 routes
 */
const apiV1 = new Hono<{ Bindings: Env }>();

// Health check for API
apiV1.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    database: c.env.DB ? 'connected' : 'disconnected',
    cache: c.env.CACHE ? 'available' : 'unavailable',
    sessions: c.env.SESSIONS ? 'available' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint for debugging
apiV1.post('/test', async (c) => {
  try {
    const body = await c.req.json();
    return c.json({ success: true, received: body });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// Mount auth routes
apiV1.route('/auth', authRoutes);

// Mount organization routes
apiV1.route('/organizations', organizationsRoutes);

// Mount role routes
apiV1.route('/roles', rolesRoutes);

// Mount finance routes
apiV1.route('/accounts', accountsRoutes);
apiV1.route('/journals', journalsRoutes);
apiV1.route('/journal-entries', journalEntriesRoutes);
apiV1.route('/invoices', invoicesRoutes);
apiV1.route('/payments', paymentsRoutes);
apiV1.route('/bank-accounts', bankAccountsRoutes);
apiV1.route('/reports', reportsRoutes);

// Mount CRM routes
apiV1.route('/companies', companiesRoutes);
apiV1.route('/contacts', contactsRoutes);
apiV1.route('/pipeline', pipelineRoutes);
apiV1.route('/opportunities', opportunitiesRoutes);

// Mount Projects routes
apiV1.route('/projects', projectsRoutes);

// Mount Inventory routes
apiV1.route('/inventory', inventoryRoutes);

// Mount HR routes
apiV1.route('/hr', hrRoutes);

// Mount Procurement routes
apiV1.route('/procurement', procurementRoutes);

// Mount Sales routes
apiV1.route('/sales', salesRoutes);

// Mount Manufacturing routes
apiV1.route('/manufacturing', manufacturingRoutes);

// Mount Assets routes
apiV1.route('/assets', assetsRoutes);

// Mount Notifications routes
apiV1.route('/notifications', notificationsRoutes);

// Mount Documents routes
apiV1.route('/documents', documentsRoutes);

// Mount Workflows routes
apiV1.route('/workflows', workflowsRoutes);

// Mount API routes
app.route('/api/v1', apiV1);

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
        path: c.req.path,
      },
    },
    404
  );
});

/**
 * Error handler
 */
app.onError((err, c) => {
  console.error('Error:', err);

  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: c.env.ENVIRONMENT === 'production'
          ? 'An unexpected error occurred'
          : err.message,
        ...(c.env.ENVIRONMENT !== 'production' && { stack: err.stack }),
      },
    },
    500
  );
});

/**
 * Export the Hono app
 */
export default app;
