/**
 * Enhanced Dashboard Page
 * Comprehensive dashboard with metrics from all 10 modules
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api, type ApiResponse } from '@/lib/api';

export function EnhancedDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch stats from all modules
  const { data: financeStats } = useQuery({
    queryKey: ['finance-stats'],
    queryFn: async () => {
      const invoices = await api.get<ApiResponse<any[]>>('/invoices');
      const payments = await api.get<ApiResponse<any[]>>('/payments');
      return {
        totalRevenue: payments.data.data?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0,
        pendingInvoices: invoices.data.data?.filter((i: any) => i.status === 'sent').length || 0,
      };
    },
  });

  const { data: crmStats } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: async () => {
      const companies = await api.get<ApiResponse<any[]>>('/companies');
      const opportunities = await api.get<ApiResponse<any[]>>('/opportunities?status=open');
      return {
        activeCompanies: companies.data.data?.filter((c: any) => c.status === 'active').length || 0,
        openOpportunities: opportunities.data.data?.length || 0,
        pipelineValue: opportunities.data.data?.reduce((sum: number, o: any) => sum + o.value, 0) || 0,
      };
    },
  });

  const { data: projectStats } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const projects = await api.get<ApiResponse<any[]>>('/projects');
      return {
        activeProjects: projects.data.data?.filter((p: any) => p.status === 'active').length || 0,
        totalProjects: projects.data.data?.length || 0,
      };
    },
  });

  const { data: inventoryStats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/inventory/stats');
      return response.data.data || { totalItems: 0, totalValue: 0 };
    },
  });

  const { data: hrStats } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: async () => {
      const employees = await api.get<ApiResponse<any[]>>('/hr/employees');
      return {
        totalEmployees: employees.data.data?.filter((e: any) => e.status === 'active').length || 0,
      };
    },
  });

  const { data: salesStats } = useQuery({
    queryKey: ['sales-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/sales/orders/stats');
      return response.data.data || { totalOrders: 0, totalRevenue: 0 };
    },
  });

  const { data: manufacturingStats } = useQuery({
    queryKey: ['manufacturing-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/manufacturing/boms/stats');
      return response.data.data || { totalWorkOrders: 0, inProgressOrders: 0 };
    },
  });

  const { data: assetStats } = useQuery({
    queryKey: ['asset-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/assets/assets/stats');
      return response.data.data || { totalAssets: 0, totalValue: 0 };
    },
  });

  const { data: notificationsCount } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      return response.data.data.count;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || 'User'}!
          </p>
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="relative rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {(notificationsCount ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {notificationsCount}
            </span>
          )}
        </button>
      </div>

      {/* Finance & CRM Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Total Revenue</h3>
            <p className="text-2xl font-bold">{formatCurrency(financeStats?.totalRevenue || 0)}</p>
            <p className="text-xs text-muted-foreground">{financeStats?.pendingInvoices || 0} pending invoices</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Active Companies</h3>
            <p className="text-2xl font-bold">{crmStats?.activeCompanies || 0}</p>
            <p className="text-xs text-muted-foreground">{crmStats?.openOpportunities || 0} open opportunities</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Sales Pipeline</h3>
            <p className="text-2xl font-bold">{formatCurrency(crmStats?.pipelineValue || 0)}</p>
            <p className="text-xs text-muted-foreground">{salesStats?.totalOrders || 0} sales orders</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Active Projects</h3>
            <p className="text-2xl font-bold">{projectStats?.activeProjects || 0}</p>
            <p className="text-xs text-muted-foreground">of {projectStats?.totalProjects || 0} total</p>
          </div>
        </div>
      </div>

      {/* Operations Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Inventory Value</h3>
            <p className="text-2xl font-bold">{formatCurrency(inventoryStats?.totalValue || 0)}</p>
            <p className="text-xs text-muted-foreground">{inventoryStats?.totalItems || 0} items in stock</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Work Orders</h3>
            <p className="text-2xl font-bold">{manufacturingStats?.totalWorkOrders || 0}</p>
            <p className="text-xs text-muted-foreground">{manufacturingStats?.inProgressOrders || 0} in progress</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Fixed Assets</h3>
            <p className="text-2xl font-bold">{formatCurrency(assetStats?.totalValue || 0)}</p>
            <p className="text-xs text-muted-foreground">{assetStats?.totalAssets || 0} assets</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground">Employees</h3>
            <p className="text-2xl font-bold">{hrStats?.totalEmployees || 0}</p>
            <p className="text-xs text-muted-foreground">Active staff</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <button
            onClick={() => navigate('/finance/invoices/new')}
            className="flex flex-col items-center gap-2 rounded-md border border-input bg-background p-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            New Invoice
          </button>
          <button
            onClick={() => navigate('/crm/companies')}
            className="flex flex-col items-center gap-2 rounded-md border border-input bg-background p-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Add Company
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="flex flex-col items-center gap-2 rounded-md border border-input bg-background p-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            New Project
          </button>
          <button
            onClick={() => navigate('/sales/orders')}
            className="flex flex-col items-center gap-2 rounded-md border border-input bg-background p-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Sales Order
          </button>
          <button
            onClick={() => navigate('/manufacturing/work-orders')}
            className="flex flex-col items-center gap-2 rounded-md border border-input bg-background p-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Work Order
          </button>
        </div>
      </div>

      {/* Module Access Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { name: 'Finance', path: '/finance/invoices', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-blue-600' },
          { name: 'CRM', path: '/crm/companies', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-green-600' },
          { name: 'Projects', path: '/projects', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', color: 'text-purple-600' },
          { name: 'Inventory', path: '/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-orange-600' },
          { name: 'HR', path: '/hr/employees', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'text-pink-600' },
          { name: 'Procurement', path: '/procurement/suppliers', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', color: 'text-indigo-600' },
          { name: 'Sales', path: '/sales/orders', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-cyan-600' },
          { name: 'Manufacturing', path: '/manufacturing/work-orders', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', color: 'text-amber-600' },
          { name: 'Assets', path: '/assets', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'text-teal-600' },
          { name: 'Reports', path: '/finance/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'text-red-600' },
        ].map((module) => (
          <button
            key={module.name}
            onClick={() => navigate(module.path)}
            className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <svg className={`h-8 w-8 ${module.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
            </svg>
            <span className="text-sm font-medium">{module.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
