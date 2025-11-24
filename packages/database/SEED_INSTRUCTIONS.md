# Database Seeding Instructions

This guide explains how to populate your Perfex ERP database with sample data for development and testing.

## What Gets Seeded

The seed script creates:

### Organizations & Users
- 1 demo organization: "Demo Company Inc"
- 1 admin user with full permissions
- Login credentials:
  - Email: `admin@democompany.com`
  - Password: `Admin123!`

### Finance Module
- Chart of Accounts (8 accounts)
  - Assets: Cash, Accounts Receivable, Inventory
  - Liabilities: Accounts Payable
  - Equity: Owner's Equity
  - Revenue: Sales Revenue
  - Expenses: COGS, Operating Expenses
- Fiscal Year 2025
- 2 Tax Rates (Standard VAT 20%, Reduced VAT 5%)

### CRM Module
- 2 Companies:
  - Acme Corporation (customer)
  - Tech Solutions Ltd (prospect)
- 2 Contacts linked to companies
- 5 Pipeline Stages:
  - Qualification (10%)
  - Needs Analysis (25%)
  - Proposal (50%)
  - Negotiation (75%)
  - Closed Won (100%)

### HR Module
- 3 Departments:
  - Engineering
  - Sales
  - Finance
- 1 Employee (admin user)

### Inventory Module
- 1 Warehouse: "Main Warehouse"
- 2 Inventory Items:
  - Widget Pro ($50 cost, $100 selling)
  - Gadget Plus ($75 cost, $150 selling)

### Procurement Module
- 2 Suppliers:
  - Parts & Components Ltd (manufacturer)
  - Quality Materials Inc (distributor)

### Asset Management
- 3 Asset Categories:
  - Computer Equipment (3 years)
  - Furniture (7 years)
  - Vehicles (5 years)

### Tags
- 4 System Tags:
  - urgent (red)
  - important (orange)
  - vip (purple)
  - archived (gray)

## Prerequisites

1. Database migrations must be applied
2. Wrangler CLI installed
3. Local development environment set up

## Running the Seed Script

### Option 1: Using Wrangler (Recommended for D1)

Unfortunately, Cloudflare D1 doesn't support running TypeScript seed files directly. You have two options:

#### A. Manual SQL Import

1. **Export seed data to SQL** (you'll need to create this):
   ```sql
   -- Create file: packages/database/seed.sql
   -- Add INSERT statements based on seed.ts
   ```

2. **Run SQL file**:
   ```bash
   # Local database
   wrangler d1 execute perfex-db --local --file=./seed.sql

   # Remote database
   wrangler d1 execute perfex-db --remote --file=./seed.sql
   ```

#### B. API Endpoint (Recommended)

Create a seed API endpoint in your worker:

1. **Create seed endpoint** (`apps/workers/api/src/routes/seed.ts`):
   ```typescript
   import { Hono } from 'hono';
   import { seed } from '@perfex/database/seed';

   const app = new Hono();

   app.post('/seed', async (c) => {
     // Only allow in development
     if (c.env.ENVIRONMENT !== 'development') {
       return c.json({ error: 'Seeding only allowed in development' }, 403);
     }

     const db = drizzle(c.env.DB);
     await seed(db);

     return c.json({ success: true, message: 'Database seeded successfully' });
   });

   export default app;
   ```

2. **Mount in main API** (`apps/workers/api/src/index.ts`):
   ```typescript
   import seedRoutes from './routes/seed';

   // Only in development
   if (process.env.ENVIRONMENT === 'development') {
     apiV1.route('/seed', seedRoutes);
   }
   ```

3. **Trigger seed via HTTP**:
   ```bash
   curl -X POST http://localhost:8787/api/v1/seed
   ```

### Option 2: Direct Script Execution (For SQLite)

If you're using a local SQLite file directly (not via Wrangler):

```bash
# From packages/database directory
pnpm tsx src/seed.ts
```

Note: This requires setting up a direct SQLite connection, which isn't the standard D1 workflow.

## Verification

After seeding, verify the data:

```bash
# Check organizations
wrangler d1 execute perfex-db --local --command="SELECT * FROM organizations"

# Check users
wrangler d1 execute perfex-db --local --command="SELECT email, first_name, last_name FROM users"

# Check companies
wrangler d1 execute perfex-db --local --command="SELECT name, type FROM companies"

# Count records
wrangler d1 execute perfex-db --local --command="
  SELECT
    (SELECT COUNT(*) FROM organizations) as orgs,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM companies) as companies,
    (SELECT COUNT(*) FROM accounts) as accounts
"
```

## Testing the Login

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Navigate to http://localhost:5173/login

3. Enter credentials:
   - Email: `admin@democompany.com`
   - Password: `Admin123!`

4. You should be logged in and see the dashboard with seeded data

## Resetting the Database

If you need to start fresh:

```bash
# Stop the dev server

# Remove local database
rm -rf apps/workers/api/.wrangler

# Re-run migrations
pnpm --filter @perfex/database migrate:local

# Re-seed
# (use whichever method you chose above)
```

## Production Warning

**⚠️ NEVER run seed scripts in production!**

The seed script includes:
- Demo credentials
- Sample data
- Development-only content

Always ensure seeding is disabled in production:
- Check environment variables
- Remove seed endpoints
- Restrict access

## Customizing Seed Data

To customize the seed data:

1. Edit `packages/database/src/seed.ts`
2. Modify the seed functions
3. Add or remove data as needed
4. Re-run the seed script

### Example: Adding More Companies

```typescript
await ctx.db.insert(companies).values([
  // ... existing companies
  {
    id: crypto.randomUUID(),
    organizationId: ctx.organizationId,
    name: 'Your Custom Company',
    type: 'customer',
    industry: 'Retail',
    // ... other fields
  },
]);
```

## Troubleshooting

### "Database is locked" Error

```bash
# Stop all dev servers
# Remove lock file
rm -rf apps/workers/api/.wrangler/state

# Restart and try again
```

### "Table already exists" Error

This means migrations haven't been run or database is in an inconsistent state:

```bash
# Check migration status
wrangler d1 migrations list perfex-db --local

# If needed, reset
rm -rf apps/workers/api/.wrangler
pnpm --filter @perfex/database migrate:local
```

### Seed Fails Halfway

The seed script is not transactional, so a failure might leave partial data:

```bash
# Best to reset and start over
rm -rf apps/workers/api/.wrangler
pnpm --filter @perfex/database migrate:local
# Run seed again
```

## Next Steps

After seeding:

1. Explore the demo organization
2. Try creating new records
3. Test different modules
4. Experiment with workflows
5. Create your own test data

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all prerequisites are met
3. Check the [troubleshooting guide](../TROUBLESHOOTING.md)
4. Open an issue on GitHub

---

**Happy Seeding! 🌱**
