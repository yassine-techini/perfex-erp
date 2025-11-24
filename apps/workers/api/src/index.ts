/**
 * Perfex API Worker
 * Main entry point for the Hono.js API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import authRoutes from './routes/auth';
import organizationsRoutes from './routes/organizations';
import rolesRoutes from './routes/roles';
import accountsRoutes from './routes/accounts';
import journalsRoutes from './routes/journals';
import journalEntriesRoutes from './routes/journal-entries';
import invoicesRoutes from './routes/invoices';
import paymentsRoutes from './routes/payments';
import bankAccountsRoutes from './routes/bank-accounts';
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

// CORS
app.use(
  '*',
  cors({
    origin: (origin) => {
      // In development, allow localhost
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
      }
      // In production, only allow specific domains
      const allowedOrigins = [
        'https://app.perfex.com',
        'https://perfex.com',
      ];
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
    maxAge: 86400,
  })
);

// Pretty JSON in development
app.use('*', prettyJSON());

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
