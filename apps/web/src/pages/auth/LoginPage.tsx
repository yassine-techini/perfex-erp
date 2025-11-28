/**
 * Login Page
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@perfex/shared';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordless, setShowPasswordless] = useState(false);
  const [passwordlessEmail, setPasswordlessEmail] = useState('');
  const [passwordlessStatus, setPasswordlessStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [passwordlessError, setPasswordlessError] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const fillDemoCredentials = () => {
    setValue('email', 'demo@perfex.io');
    setValue('password', 'Demo@2024!');
  };

  const onSubmit = async (data: LoginInput) => {
    console.log('[LoginPage] Form submitted', { email: data.email });
    try {
      setIsSubmitting(true);
      clearError();
      console.log('[LoginPage] Calling login()');
      await login(data);
      console.log('[LoginPage] Login successful, navigating to:', from);
      navigate(from, { replace: true });
      console.log('[LoginPage] Navigation called');
    } catch (err) {
      // Error is handled by auth store
      console.error('[LoginPage] Login error', err);
      setIsSubmitting(false);
    }
  };

  const handlePasswordlessLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordlessEmail) {
      setPasswordlessError('Please enter your email');
      return;
    }

    try {
      setPasswordlessStatus('sending');
      setPasswordlessError('');

      await api.post('/auth/passwordless/request', { email: passwordlessEmail });

      setPasswordlessStatus('sent');
    } catch (error: any) {
      setPasswordlessStatus('error');
      setPasswordlessError(
        error.response?.data?.error?.message || 'Failed to send login link'
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to Perfex ERP
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/80"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-md bg-destructive/10 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary hover:text-primary/80"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-500">Or</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowPasswordless(!showPasswordless)}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {showPasswordless ? 'Use password instead' : 'Sign in with email link'}
            </button>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Demo Account
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p><strong>Email:</strong> demo@perfex.io</p>
                <p><strong>Password:</strong> Demo@2024!</p>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="inline-flex items-center px-3 py-1.5 border border-amber-300 text-xs font-medium rounded text-amber-800 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  Use demo credentials
                </button>
              </div>
            </div>
          </div>
        </div>

        {showPasswordless && (
          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Passwordless Login
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email and we'll send you a magic link to sign in instantly.
            </p>

            {passwordlessStatus === 'sent' ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      Check your email! We've sent you a login link to <strong>{passwordlessEmail}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordlessLogin} className="space-y-4">
                {passwordlessError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-800">{passwordlessError}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="passwordless-email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="passwordless-email"
                    type="email"
                    value={passwordlessEmail}
                    onChange={(e) => setPasswordlessEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordlessStatus === 'sending'}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {passwordlessStatus === 'sending' ? 'Sending...' : 'Send magic link'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
