/**
 * Work Order Form Page
 * Create and edit work orders on a dedicated page
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkOrder } from '@perfex/shared';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import { z } from 'zod';

// Form schema
const workOrderFormSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  bomId: z.string().optional().or(z.literal('')),
  routingId: z.string().optional().or(z.literal('')),
  salesOrderId: z.string().optional().or(z.literal('')),
  quantityPlanned: z.string().min(1, 'Quantity planned is required'),
  unit: z.string().min(1, 'Unit is required'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledStartDate: z.string().optional().or(z.literal('')),
  scheduledEndDate: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  // Edit mode only fields
  status: z.enum(['draft', 'released', 'in_progress', 'completed', 'cancelled']).optional(),
  quantityProduced: z.string().optional().or(z.literal('')),
  actualStartDate: z.string().optional().or(z.literal('')),
  actualEndDate: z.string().optional().or(z.literal('')),
});

type WorkOrderFormData = z.infer<typeof workOrderFormSchema>;

export function WorkOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch work order data if editing
  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<WorkOrder>>(`/manufacturing/work-orders/${id}`);
      return response.data.data;
    },
    enabled: isEditMode,
  });

  // Fetch inventory items for product selection
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any[]>>('/inventory/items');
      return response.data.data;
    },
  });

  // Fetch BOMs for selection
  const { data: boms } = useQuery({
    queryKey: ['boms'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any[]>>('/manufacturing/boms');
      return response.data.data || [];
    },
  });

  // Fetch routings for selection
  const { data: routings } = useQuery({
    queryKey: ['routings'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any[]>>('/manufacturing/routings');
      return response.data.data || [];
    },
  });

  // Fetch sales orders for selection
  const { data: salesOrders } = useQuery({
    queryKey: ['sales-orders-list'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any[]>>('/sales/orders');
      return response.data.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      productId: '',
      bomId: '',
      routingId: '',
      salesOrderId: '',
      quantityPlanned: '',
      unit: 'unit',
      priority: 'normal',
      scheduledStartDate: '',
      scheduledEndDate: '',
      notes: '',
      status: 'draft',
      quantityProduced: '',
      actualStartDate: '',
      actualEndDate: '',
    },
  });

  // Update form when work order data is loaded
  useEffect(() => {
    if (workOrder) {
      reset({
        productId: workOrder.productId || '',
        bomId: workOrder.bomId || '',
        routingId: workOrder.routingId || '',
        salesOrderId: workOrder.salesOrderId || '',
        quantityPlanned: workOrder.quantityPlanned?.toString() || '',
        unit: workOrder.unit || 'unit',
        priority: workOrder.priority || 'normal',
        scheduledStartDate: workOrder.scheduledStartDate ? new Date(workOrder.scheduledStartDate).toISOString().split('T')[0] : '',
        scheduledEndDate: workOrder.scheduledEndDate ? new Date(workOrder.scheduledEndDate).toISOString().split('T')[0] : '',
        notes: workOrder.notes || '',
        status: workOrder.status || 'draft',
        quantityProduced: workOrder.quantityProduced?.toString() || '',
        actualStartDate: workOrder.actualStartDate ? new Date(workOrder.actualStartDate).toISOString().split('T')[0] : '',
        actualEndDate: workOrder.actualEndDate ? new Date(workOrder.actualEndDate).toISOString().split('T')[0] : '',
      });
    }
  }, [workOrder, reset]);

  // Create work order mutation
  const createWorkOrder = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post<ApiResponse<WorkOrder>>('/manufacturing/work-orders', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      alert('Work order created successfully!');
      navigate('/manufacturing/work-orders');
    },
    onError: (error) => {
      alert(`Failed to create work order: ${getErrorMessage(error)}`);
    },
  });

  // Update work order mutation
  const updateWorkOrder = useMutation({
    mutationFn: async (data: any) => {
      if (!id) throw new Error('Work order ID is required');
      const response = await api.put<ApiResponse<WorkOrder>>(`/manufacturing/work-orders/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      alert('Work order updated successfully!');
      navigate('/manufacturing/work-orders');
    },
    onError: (error) => {
      alert(`Failed to update work order: ${getErrorMessage(error)}`);
    },
  });

  const handleFormSubmit = async (data: WorkOrderFormData) => {
    const cleanedData: any = {
      productId: data.productId,
      bomId: data.bomId || null,
      routingId: data.routingId || null,
      salesOrderId: data.salesOrderId || null,
      quantityPlanned: parseFloat(data.quantityPlanned),
      unit: data.unit,
      priority: data.priority,
      scheduledStartDate: data.scheduledStartDate || null,
      scheduledEndDate: data.scheduledEndDate || null,
      notes: data.notes || null,
    };

    if (isEditMode) {
      // In edit mode, include additional fields
      cleanedData.status = data.status;
      cleanedData.quantityProduced = data.quantityProduced ? parseFloat(data.quantityProduced) : null;
      cleanedData.actualStartDate = data.actualStartDate || null;
      cleanedData.actualEndDate = data.actualEndDate || null;
    }

    if (isEditMode) {
      await updateWorkOrder.mutateAsync(cleanedData);
    } else {
      await createWorkOrder.mutateAsync(cleanedData);
    }
  };

  const isSubmitting = createWorkOrder.isPending || updateWorkOrder.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading work order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Work Order' : 'Create Work Order'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update work order information' : 'Create a new work order for production'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/manufacturing/work-orders')}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card">
          <div className="p-6 space-y-6">
            {/* Product and Reference Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Product Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...register('productId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isEditMode}
                  >
                    <option value="">Select a product...</option>
                    {inventoryItems?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="text-destructive text-sm mt-1">{errors.productId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bill of Materials (BOM)</label>
                  <select
                    {...register('bomId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isEditMode}
                  >
                    <option value="">None</option>
                    {boms?.map((bom) => (
                      <option key={bom.id} value={bom.id}>
                        {bom.bomNumber} - v{bom.version}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Routing</label>
                  <select
                    {...register('routingId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isEditMode}
                  >
                    <option value="">None</option>
                    {routings?.map((routing) => (
                      <option key={routing.id} value={routing.id}>
                        {routing.routingNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sales Order (Optional)</label>
                  <select
                    {...register('salesOrderId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={isEditMode}
                  >
                    <option value="">None</option>
                    {salesOrders?.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quantity and Scheduling */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Quantity and Scheduling</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quantity Planned <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('quantityPlanned')}
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="100"
                  />
                  {errors.quantityPlanned && (
                    <p className="text-destructive text-sm mt-1">{errors.quantityPlanned.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Unit <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('unit')}
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="unit, kg, lbs, etc."
                  />
                  {errors.unit && (
                    <p className="text-destructive text-sm mt-1">{errors.unit.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      {...register('status')}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="released">Released</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Scheduled Start Date</label>
                  <input
                    {...register('scheduledStartDate')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Scheduled End Date</label>
                  <input
                    {...register('scheduledEndDate')}
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {isEditMode && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Quantity Produced</label>
                      <input
                        {...register('quantityProduced')}
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Actual Start Date</label>
                      <input
                        {...register('actualStartDate')}
                        type="date"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Actual End Date</label>
                      <input
                        {...register('actualEndDate')}
                        type="date"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Optional notes about this work order..."
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/manufacturing/work-orders')}
              disabled={isSubmitting}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Work Order' : 'Create Work Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
