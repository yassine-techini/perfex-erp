import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
          <Route
            path="*"
            element={
              <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="rounded-lg bg-white p-8 shadow-lg max-w-md">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Perfex ERP - Test</h1>
                  <p className="text-gray-600 mb-4">
                    Environment: {import.meta.env.VITE_ENVIRONMENT || 'production'}
                  </p>
                  <p className="text-gray-600 mb-4">
                    API URL: {import.meta.env.VITE_API_URL || 'non défini'}
                  </p>
                  <div className="space-y-2">
                    <a href="/login" className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center">
                      Page de connexion (à créer)
                    </a>
                    <button
                      onClick={() => console.log('Test console')}
                      className="block w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Test Console Log
                    </button>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
