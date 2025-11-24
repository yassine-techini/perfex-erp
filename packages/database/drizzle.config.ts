import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: '6435a77d3ce17b7de468c6618e7b2b14',
    databaseId: 'ec93435e-3a0f-4d90-a036-966571a34e4a',
    token: process.env.CLOUDFLARE_API_TOKEN || '',
  },
} satisfies Config;
