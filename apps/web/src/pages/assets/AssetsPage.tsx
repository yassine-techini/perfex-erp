/**
 * Fixed Assets Page
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type ApiResponse } from '@/lib/api';
import type { FixedAsset } from '@perfex/shared';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

export function AssetsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { data: assets, isLoading } = useQuery({
    queryKey: ['fixed-assets', searchTerm, statusFilter],
    queryFn: async () => {
      let url = '/assets/assets';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get<ApiResponse<FixedAsset[]>>(url);
      return response.data.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['assets-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/assets/assets/stats');
      return response.data.data;
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (assetId: string) => await api.delete(`/assets/assets/${assetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-stats'] });
      alert('Asset deleted successfully!');
    },
  });

  const handleAddAsset = () => {
    navigate('/assets/new');
  };

  const handleEditAsset = (assetId: string) => {
    navigate(`/assets/${assetId}/edit`);
  };

  // Calculate paginated data
  const paginatedAssets = useMemo(() => {
    if (!assets) return { data: [], total: 0, totalPages: 0 };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = assets.slice(startIndex, endIndex);
    const total = assets.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [assets, currentPage, itemsPerPage]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      disposed: 'bg-gray-100 text-gray-800',
      sold: 'bg-blue-100 text-blue-800',
      donated: 'bg-purple-100 text-purple-800',
      lost: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fixed Assets</h1>
          <p className="text-muted-foreground">Manage equipment, property, and fixed assets</p>
        </div>
        <button
          onClick={handleAddAsset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add Asset
        </button>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Assets</div>
            <div className="mt-2 text-2xl font-bold">{stats.totalAssets}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Active Assets</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.activeAssets}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Value</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalValue)}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Pending Maintenance</div>
            <div className="mt-2 text-2xl font-bold text-orange-600">{stats.pendingMaintenance}</div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disposed">Disposed</option>
          <option value="sold">Sold</option>
          <option value="donated">Donated</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading assets...</p>
            </div>
          </div>
        ) : paginatedAssets.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Asset #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Purchase Date</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Purchase Cost</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Current Value</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedAssets.data.map((asset) => (
                    <tr key={asset.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-mono font-medium">{asset.assetNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{asset.name}</div>
                        {asset.model && <div className="text-sm text-muted-foreground">{asset.model}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">{asset.location || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(asset.status)}`}>
                          {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(asset.purchaseDate)}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(asset.purchaseCost)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(asset.currentValue)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleEditAsset(asset.id)}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAsset.mutate(asset.id)}
                          className="text-sm text-red-600 hover:underline"
                          disabled={deleteAsset.isPending}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={paginatedAssets.totalPages}
              totalItems={paginatedAssets.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <EmptyState
            title="No assets found"
            description="Get started by adding your first fixed asset to track."
            icon="document"
            action={{
              label: "Add Asset",
              onClick: handleAddAsset,
            }}
          />
        )}
      </div>
    </div>
  );
}
