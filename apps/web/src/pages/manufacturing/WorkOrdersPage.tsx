/**
 * Work Orders Page
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type ApiResponse } from '@/lib/api';
import type { WorkOrder } from '@perfex/shared';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

export function WorkOrdersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', searchTerm, statusFilter, priorityFilter],
    queryFn: async () => {
      let url = '/manufacturing/work-orders';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get<ApiResponse<WorkOrder[]>>(url);
      return response.data.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['manufacturing-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>('/manufacturing/boms/stats');
      return response.data.data;
    },
  });

  const deleteWorkOrder = useMutation({
    mutationFn: async (workOrderId: string) => await api.delete(`/manufacturing/work-orders/${workOrderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing-stats'] });
      alert('Work order deleted successfully!');
    },
  });

  const handleCreateWorkOrder = () => {
    navigate('/manufacturing/work-orders/new');
  };

  const handleEditWorkOrder = (workOrderId: string) => {
    navigate(`/manufacturing/work-orders/${workOrderId}/edit`);
  };

  // Calculate paginated data
  const paginatedWorkOrders = useMemo(() => {
    if (!workOrders) return { data: [], total: 0, totalPages: 0 };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = workOrders.slice(startIndex, endIndex);
    const total = workOrders.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [workOrders, currentPage, itemsPerPage]);

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
      draft: 'bg-gray-100 text-gray-800',
      released: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-50 text-blue-700',
      normal: 'bg-gray-50 text-gray-700',
      high: 'bg-orange-50 text-orange-700',
      urgent: 'bg-red-50 text-red-700',
    };
    return colors[priority] || 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Orders</h1>
          <p className="text-muted-foreground">Manage production orders and manufacturing</p>
        </div>
        <button
          onClick={handleCreateWorkOrder}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create Work Order
        </button>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total BOMs</div>
            <div className="mt-2 text-2xl font-bold">{stats.totalBOMs}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Active BOMs</div>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.activeBOMs}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Work Orders</div>
            <div className="mt-2 text-2xl font-bold">{stats.totalWorkOrders}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium text-muted-foreground">In Progress</div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{stats.inProgressOrders}</div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search work orders..."
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
          <option value="draft">Draft</option>
          <option value="released">Released</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading work orders...</p>
            </div>
          </div>
        ) : paginatedWorkOrders.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">WO #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Scheduled Start</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Scheduled End</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Qty Planned</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Qty Produced</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedWorkOrders.data.map((wo) => (
                    <tr key={wo.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-mono font-medium">{wo.workOrderNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(wo.status)}`}>
                          {wo.status.replace('_', ' ').charAt(0).toUpperCase() + wo.status.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(wo.priority)}`}>
                          {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(wo.scheduledStartDate)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(wo.scheduledEndDate)}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        {wo.quantityPlanned} {wo.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={wo.quantityProduced >= wo.quantityPlanned ? 'text-green-600' : ''}>
                          {wo.quantityProduced} {wo.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleEditWorkOrder(wo.id)}
                          className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteWorkOrder.mutate(wo.id)}
                          className="text-sm text-red-600 hover:underline"
                          disabled={deleteWorkOrder.isPending}
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
              totalPages={paginatedWorkOrders.totalPages}
              totalItems={paginatedWorkOrders.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        ) : (
          <EmptyState
            title="No work orders found"
            description="Get started by creating your first work order for production."
            icon="document"
            action={{
              label: "Create Work Order",
              onClick: handleCreateWorkOrder,
            }}
          />
        )}
      </div>
    </div>
  );
}
