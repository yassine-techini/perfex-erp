/**
 * Dashboard Page
 */

import { useAuth } from '@/hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName || 'User'}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">
              Total Revenue
            </h3>
            <p className="text-2xl font-bold">€0.00</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">
              Active Invoices
            </h3>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">
              Contacts
            </h3>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">
              Active Projects
            </h3>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <button className="flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            Create Invoice
          </button>
          <button className="flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            Add Contact
          </button>
          <button className="flex items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            New Project
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    </div>
  );
}
