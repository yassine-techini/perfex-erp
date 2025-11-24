import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />

            {/* Finance routes */}
            <Route path="finance">
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/new" element={<NewInvoicePage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            {/* CRM routes */}
            <Route path="crm">
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
            </Route>

            {/* Projects routes */}
            <Route path="projects" element={<ProjectsPage />} />

            {/* Inventory routes */}
            <Route path="inventory" element={<InventoryPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
