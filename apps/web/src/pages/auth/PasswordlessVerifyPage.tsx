/**
 * Passwordless Login Verification Page
 * Handles the magic link verification
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/lib/api';
import type { AuthResponse } from '@perfex/shared';

export function PasswordlessVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('No login token provided');
        return;
      }

      try {
        const response = await api.post<ApiResponse<AuthResponse>>(
          '/auth/passwordless/verify',
          { token }
        );

        const { user, tokens } = response.data.data!;

        // Store tokens
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        setStatus('success');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error.response?.data?.error?.message ||
          'Invalid or expired login link. Please request a new one.'
        );
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Passwordless Login</h2>
        </div>

        {status === 'verifying' && (
          <div className="rounded-lg bg-white p-8 shadow-lg text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Verifying your login link...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-lg bg-white p-8 shadow-lg text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-semibold text-gray-900">Login Successful!</p>
            <p className="mt-2 text-sm text-gray-600">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="mt-4 text-center text-lg font-semibold text-gray-900">
              Verification Failed
            </p>
            <p className="mt-2 text-center text-sm text-gray-600">{errorMessage}</p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
