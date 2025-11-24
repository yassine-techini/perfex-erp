import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

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

            {/* Finance routes - placeholder for now */}
            <Route path="finance">
              <Route path="accounts" element={<div className="p-6">Accounts Page - Coming Soon</div>} />
              <Route path="invoices" element={<div className="p-6">Invoices Page - Coming Soon</div>} />
              <Route path="payments" element={<div className="p-6">Payments Page - Coming Soon</div>} />
              <Route path="reports" element={<div className="p-6">Reports Page - Coming Soon</div>} />
            </Route>

            {/* CRM routes - placeholder for now */}
            <Route path="crm">
              <Route path="contacts" element={<div className="p-6">Contacts Page - Coming Soon</div>} />
              <Route path="pipeline" element={<div className="p-6">Pipeline Page - Coming Soon</div>} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
