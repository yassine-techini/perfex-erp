/**
 * Accounts Page
 * Chart of accounts management
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { Account } from '@perfex/shared';

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  // Fetch accounts
  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['accounts', filter],
    queryFn: async () => {
      const url = filter === 'all' ? '/accounts' : `/accounts?type=${filter}`;
      const response = await api.get<ApiResponse<Account[]>>(url);
      return response.data.data;
    },
  });

  // Import template mutation
  const importTemplate = useMutation({
    mutationFn: async (template: 'french' | 'syscohada') => {
      const response = await api.post(`/accounts/import/${template}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      alert('Chart of accounts imported successfully!');
    },
    onError: (error) => {
      alert(`Failed to import: ${getErrorMessage(error)}`);
    },
  });

  const accountTypes = [
    { value: 'all', label: 'All Accounts' },
    { value: 'asset', label: 'Assets' },
    { value: 'liability', label: 'Liabilities' },
    { value: 'equity', label: 'Equity' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expenses' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your accounting structure
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => importTemplate.mutate('french')}
            disabled={importTemplate.isPending}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            Import French Plan
          </button>
          <button
            onClick={() => importTemplate.mutate('syscohada')}
            disabled={importTemplate.isPending}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            Import SYSCOHADA
          </button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Add Account
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {accountTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === type.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Accounts Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading accounts...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Error: {getErrorMessage(error)}</p>
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium">
                      {account.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {account.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.type === 'asset' ? 'bg-blue-100 text-blue-800' :
                        account.type === 'liability' ? 'bg-red-100 text-red-800' :
                        account.type === 'equity' ? 'bg-purple-100 text-purple-800' :
                        account.type === 'revenue' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {account.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {account.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {account.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button className="text-primary hover:text-primary/80 font-medium">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No accounts found. Import a chart of accounts template to get started.</p>
          </div>
        )}
      </div>

      {/* Stats */}
      {accounts && accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          {accountTypes.slice(1).map((type) => {
            const count = accounts.filter(a => a.type === type.value).length;
            return (
              <div key={type.value} className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">{type.label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
