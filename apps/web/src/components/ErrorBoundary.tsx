import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  environment?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      const isDev = this.props.environment === 'development';

      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Une erreur s'est produite
                </h1>
                <p className="text-sm text-gray-500">
                  Environment: {this.props.environment || 'production'}
                </p>
              </div>
            </div>

            {isDev && this.state.error && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-red-900 mb-2">
                    Message d'erreur:
                  </h2>
                  <p className="text-red-800 font-mono text-sm">
                    {this.state.error.toString()}
                  </p>
                </div>

                {this.state.errorInfo && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Stack trace:
                    </h2>
                    <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                {this.state.error.stack && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Error stack:
                    </h2>
                    <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {!isDev && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700">
                  Une erreur inattendue s'est produite. Veuillez réessayer ou
                  contacter le support si le problème persiste.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Recharger la page
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
