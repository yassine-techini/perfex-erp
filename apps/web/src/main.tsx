import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

const environment = import.meta.env.VITE_ENVIRONMENT || 'production';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary environment={environment}>
    <App />
  </ErrorBoundary>
);
