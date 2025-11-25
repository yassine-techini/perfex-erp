import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    path: '/',
    element: (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">Perfex ERP</h1>
          <p className="mt-4 text-gray-600">Application en cours de chargement...</p>
          <div className="mt-6">
            <a href="/login" className="text-blue-600 hover:underline">
              Aller à la page de connexion
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    path: '/login',
    element: (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="mt-4 text-gray-600">Page de connexion - Test</p>
          <div className="mt-6">
            <a href="/" className="text-blue-600 hover:underline">
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    ),
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
