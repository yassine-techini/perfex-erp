/**
 * Workflows Management Page
 * Manage automated workflows and approvals
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Workflow, ApiResponse } from '@perfex/shared';

export function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'approvals' | 'webhooks' | 'api-keys' | 'tags'>('workflows');
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  // Fetch workflows
  const { data: workflows, isLoading: loadingWorkflows } = useQuery({
    queryKey: ['workflows', entityTypeFilter],
    queryFn: async () => {
      let url = '/workflows/workflows';
      const params = new URLSearchParams();
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get<ApiResponse<Workflow[]>>(url);
      return response.data.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['workflows-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{
        totalWorkflows: number;
        activeWorkflows: number;
        totalApprovals: number;
        pendingApprovals: number;
        totalWebhooks: number;
        activeWebhooks: number;
        totalApiKeys: number;
        totalTags: number;
      }>>('/workflows/stats');
      return response.data.data;
    },
  });

  const filteredWorkflows = workflows?.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Automation</h1>
          <p className="text-gray-600 mt-1">Manage workflows, approvals, webhooks, and integrations</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workflows</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalWorkflows}</p>
                <p className="text-sm text-green-600 mt-1">{stats.activeWorkflows} active</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingApprovals}</p>
                <p className="text-sm text-gray-600 mt-1">of {stats.totalApprovals} total</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Webhooks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeWebhooks}</p>
                <p className="text-sm text-gray-600 mt-1">of {stats.totalWebhooks} total</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">API Keys</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalApiKeys}</p>
                <p className="text-sm text-gray-600 mt-1">{stats.totalTags} tags</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'workflows'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Workflows
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'approvals'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approvals {stats && stats.pendingApprovals > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                  {stats.pendingApprovals}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'webhooks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Webhooks
            </button>
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'api-keys'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'tags'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tags
            </button>
          </nav>
        </div>

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="p-6">
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Entity Types</option>
                <option value="invoice">Invoice</option>
                <option value="purchase_order">Purchase Order</option>
                <option value="expense">Expense</option>
                <option value="opportunity">Opportunity</option>
              </select>
            </div>

            {/* Workflows Table */}
            {loadingWorkflows ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading workflows...</p>
              </div>
            ) : filteredWorkflows && filteredWorkflows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entity Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trigger
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWorkflows.map((workflow) => (
                      <tr key={workflow.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{workflow.name}</div>
                          {workflow.description && (
                            <div className="text-sm text-gray-500">{workflow.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            {workflow.entityType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {workflow.triggerType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {workflow.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              workflow.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(workflow.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-gray-600 mt-4">No workflows found</p>
                <p className="text-gray-500 text-sm mt-2">Create your first workflow to automate business processes</p>
              </div>
            )}
          </div>
        )}

        {/* Other tabs placeholders */}
        {activeTab !== 'workflows' && (
          <div className="p-6 text-center py-12">
            <p className="text-gray-600">
              {activeTab === 'approvals' && 'Approvals management coming soon'}
              {activeTab === 'webhooks' && 'Webhooks management coming soon'}
              {activeTab === 'api-keys' && 'API Keys management coming soon'}
              {activeTab === 'tags' && 'Tags management coming soon'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
