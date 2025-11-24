/**
 * Type definitions for the API worker
 */

/**
 * Environment bindings type
 */
export interface Env {
  // Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // Vectorize
  VECTORIZE: VectorizeIndex;

  // Queue
  JOBS: Queue;

  // R2 (when enabled)
  // STORAGE: R2Bucket;

  // Environment variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;

  // Secrets (set via wrangler secret)
  JWT_SECRET: string;
}
