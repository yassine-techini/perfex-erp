/**
 * Suppliers Page - Simplified version
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import type { Supplier } from '@perfex/shared';

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', searchTerm],
    queryFn: async () => {
      let url = '/procurement/suppliers';
      if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;
      const response = await api.get<ApiResponse<Supplier[]>>(url);
      return response.data.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['procurement-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/procurement/suppliers/stats');
      return response.data.data;
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (supplierId: string) => await api.delete(`/procurement/suppliers/${supplierId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      alert('Supplier deleted successfully!');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your suppliers and vendors</p>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Suppliers</div>
            <div className="mt-2 text-2xl font-bold">{stats.totalSuppliers}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Active Suppliers</div>
            <div className="mt-2 text-2xl font-bold">{stats.activeSuppliers}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Purchase Orders</div>
            <div className="mt-2 text-2xl font-bold">{stats.totalPurchaseOrders}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Pending Orders</div>
            <div className="mt-2 text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : !suppliers || suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No suppliers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Supplier #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Country</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-mono">{supplier.supplierNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.companyName && <div className="text-sm text-muted-foreground">{supplier.companyName}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">{supplier.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">{supplier.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm">{supplier.country || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {supplier.rating ? `⭐ ${supplier.rating}/5` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${supplier.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {supplier.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteSupplier.mutate(supplier.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
