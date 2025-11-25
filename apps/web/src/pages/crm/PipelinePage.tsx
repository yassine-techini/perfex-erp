/**
 * Pipeline Page
 * Sales pipeline and opportunities management
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { Opportunity } from '@perfex/shared';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

export function PipelinePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch opportunities
  const { data: opportunities, isLoading, error } = useQuery({
    queryKey: ['opportunities', statusFilter],
    queryFn: async () => {
      let url = '/opportunities';
      if (statusFilter !== 'all') url += `?status=${statusFilter}`;

      const response = await api.get<ApiResponse<Opportunity[]>>(url);
      return response.data.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['opportunities', 'stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/opportunities/stats');
      return response.data.data;
    },
  });

  // Delete opportunity mutation
  const deleteOpportunity = useMutation({
    mutationFn: async (opportunityId: string) => {
      await api.delete(`/opportunities/${opportunityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      alert('Opportunity deleted successfully!');
    },
    onError: (error) => {
      alert(`Failed to delete opportunity: ${getErrorMessage(error)}`);
    },
  });

  const handleAddOpportunity = () => {
    navigate('/crm/pipeline/opportunities/new');
  };

  const handleEditOpportunity = (opportunityId: string) => {
    navigate(`/crm/pipeline/opportunities/${opportunityId}/edit`);
  };

  const handleDelete = (opportunityId: string, opportunityName: string) => {
    if (confirm(`Are you sure you want to delete "${opportunityName}"? This action cannot be undone.`)) {
      deleteOpportunity.mutate(opportunityId);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
  ];

  // Calculate paginated data
  const paginatedOpportunities = useMemo(() => {
    if (!opportunities) return { data: [], total: 0, totalPages: 0 };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = opportunities.slice(startIndex, endIndex);
    const total = opportunities.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [opportunities, currentPage, itemsPerPage]);

  // Reset to page 1 when filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Track your sales opportunities and deals
          </p>
        </div>
        <button
          onClick={handleAddOpportunity}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create Opportunity
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">€{stats.totalValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalCount} opportunities</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Open Pipeline</p>
            <p className="text-2xl font-bold text-blue-600">€{stats.openValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.openCount} deals</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Won</p>
            <p className="text-2xl font-bold text-green-600">€{stats.wonValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.wonCount} deals</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Lost</p>
            <p className="text-2xl font-bold text-red-600">{stats.lostCount}</p>
            <p className="text-xs text-muted-foreground mt-1">opportunities</p>
          </div>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleStatusFilterChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              statusFilter === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Opportunities List */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading opportunities...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Error: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedOpportunities.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Opportunity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Expected Close
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
                {paginatedOpportunities.data.map((opportunity) => (
                  <tr key={opportunity.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium">{opportunity.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {opportunity.description?.substring(0, 60)}
                        {opportunity.description && opportunity.description.length > 60 ? '...' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {opportunity.currency} {opportunity.value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${opportunity.probability}%` }}
                          ></div>
                        </div>
                        <span>{opportunity.probability}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {opportunity.expectedCloseDate
                        ? new Date(opportunity.expectedCloseDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        opportunity.status === 'won' ? 'bg-green-100 text-green-800' :
                        opportunity.status === 'lost' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {opportunity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => handleEditOpportunity(opportunity.id)}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(opportunity.id, opportunity.name)}
                        className="text-destructive hover:text-destructive/80 font-medium"
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
            totalPages={paginatedOpportunities.totalPages}
            totalItems={paginatedOpportunities.total}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
          </>
        ) : (
          <EmptyState
            title="No opportunities found"
            description="Get started by creating your first sales opportunity. Track deals and manage your sales pipeline effectively."
            icon="chart"
            action={{
              label: "Create Opportunity",
              onClick: handleAddOpportunity,
            }}
          />
        )}
      </div>
    </div>
  );
}
