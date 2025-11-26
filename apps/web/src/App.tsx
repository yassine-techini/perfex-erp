import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PasswordlessVerifyPage } from './pages/auth/PasswordlessVerifyPage';
import { DashboardPage } from './pages/DashboardPage';
import { AccountsPage } from './pages/finance/AccountsPage';
import { InvoicesPage } from './pages/finance/InvoicesPage';
import { NewInvoicePage } from './pages/finance/NewInvoicePage';
import { InvoiceDetailPage } from './pages/finance/InvoiceDetailPage';
import { PaymentsPage } from './pages/finance/PaymentsPage';
import { ReportsPage } from './pages/finance/ReportsPage';
import { CompaniesPage } from './pages/crm/CompaniesPage';
import { CompanyFormPage } from './pages/crm/CompanyFormPage';
import { ContactsPage } from './pages/crm/ContactsPage';
import { ContactFormPage } from './pages/crm/ContactFormPage';
import { PipelinePage } from './pages/crm/PipelinePage';
import { OpportunityFormPage } from './pages/crm/OpportunityFormPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectFormPage } from './pages/projects/ProjectFormPage';
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/passwordless" element={<PasswordlessVerifyPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="finance/accounts" element={<AccountsPage />} />
            <Route path="finance/invoices" element={<InvoicesPage />} />
            <Route path="finance/invoices/new" element={<NewInvoicePage />} />
            <Route path="finance/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="finance/payments" element={<PaymentsPage />} />
            <Route path="finance/reports" element={<ReportsPage />} />
            <Route path="crm/companies" element={<CompaniesPage />} />
            <Route path="crm/companies/new" element={<CompanyFormPage />} />
            <Route path="crm/companies/:id/edit" element={<CompanyFormPage />} />
            <Route path="crm/contacts" element={<ContactsPage />} />
            <Route path="crm/contacts/new" element={<ContactFormPage />} />
            <Route path="crm/contacts/:id/edit" element={<ContactFormPage />} />
            <Route path="crm/pipeline" element={<PipelinePage />} />
            <Route path="crm/pipeline/opportunities/new" element={<OpportunityFormPage />} />
            <Route path="crm/pipeline/opportunities/:id/edit" element={<OpportunityFormPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/new" element={<ProjectFormPage />} />
            <Route path="projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="hr/employees" element={<EmployeesPage />} />
            <Route path="procurement/suppliers" element={<SuppliersPage />} />
            <Route path="sales/orders" element={<SalesOrdersPage />} />
            <Route path="manufacturing/work-orders" element={<WorkOrdersPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="activity" element={<ActivityFeedPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
