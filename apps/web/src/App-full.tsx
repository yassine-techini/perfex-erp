import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/finance/AccountsPage';
import { InvoicesPage } from './pages/finance/InvoicesPage';
import { NewInvoicePage } from './pages/finance/NewInvoicePage';
import { InvoiceDetailPage } from './pages/finance/InvoiceDetailPage';
import { PaymentsPage } from './pages/finance/PaymentsPage';
import { ReportsPage } from './pages/finance/ReportsPage';
import { CompaniesPage } from './pages/crm/CompaniesPage';
import { ContactsPage } from './pages/crm/ContactsPage';
import { PipelinePage } from './pages/crm/PipelinePage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { EmployeesPage } from './pages/hr/EmployeesPage';
import { SuppliersPage } from './pages/procurement/SuppliersPage';
import { SalesOrdersPage } from './pages/sales/SalesOrdersPage';
import { WorkOrdersPage } from './pages/manufacturing/WorkOrdersPage';
import { AssetsPage } from './pages/assets/AssetsPage';
import { WorkflowsPage } from './pages/workflows/WorkflowsPage';
import { ActivityFeedPage } from './pages/ActivityFeedPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'finance/accounts',
        element: <AccountsPage />,
      },
      {
        path: 'finance/invoices',
        element: <InvoicesPage />,
      },
      {
        path: 'finance/invoices/new',
        element: <NewInvoicePage />,
      },
      {
        path: 'finance/invoices/:id',
        element: <InvoiceDetailPage />,
      },
      {
        path: 'finance/payments',
        element: <PaymentsPage />,
      },
      {
        path: 'finance/reports',
        element: <ReportsPage />,
      },
      {
        path: 'crm/companies',
        element: <CompaniesPage />,
      },
      {
        path: 'crm/contacts',
        element: <ContactsPage />,
      },
      {
        path: 'crm/pipeline',
        element: <PipelinePage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'hr/employees',
        element: <EmployeesPage />,
      },
      {
        path: 'procurement/suppliers',
        element: <SuppliersPage />,
      },
      {
        path: 'sales/orders',
        element: <SalesOrdersPage />,
      },
      {
        path: 'manufacturing/work-orders',
        element: <WorkOrdersPage />,
      },
      {
        path: 'assets',
        element: <AssetsPage />,
      },
      {
        path: 'workflows',
        element: <WorkflowsPage />,
      },
      {
        path: 'activity',
        element: <ActivityFeedPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
