/**
 * Projects Page
 * Manage projects and track progress
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { Project } from '@perfex/shared';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch projects
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects', searchTerm, statusFilter, priorityFilter],
    queryFn: async () => {
      let url = '/projects';
      const params: string[] = [];

      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      if (priorityFilter !== 'all') params.push(`priority=${priorityFilter}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await api.get<ApiResponse<Project[]>>(url);
      return response.data.data;
    },
  });

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      alert('Project deleted successfully!');
    },
    onError: (error) => {
      alert(`Failed to delete project: ${getErrorMessage(error)}`);
    },
  });

  const handleAddProject = () => {
    navigate('/projects/new');
  };

  const handleEditProject = (projectId: string) => {
    navigate(`/projects/${projectId}/edit`);
  };

  const handleDelete = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This will also delete all tasks, milestones, and time entries. This action cannot be undone.`)) {
      deleteProject.mutate(projectId);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  // Calculate paginated data
  const paginatedProjects = useMemo(() => {
    if (!projects) return { data: [], total: 0, totalPages: 0 };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = projects.slice(startIndex, endIndex);
    const total = projects.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [projects, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (value: string) => {
    setPriorityFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects, tasks, and track progress
          </p>
        </div>
        <button
          onClick={handleAddProject}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Project
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search projects by name or description..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => handlePriorityFilterChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Error: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedProjects.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedProjects.data.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {project.description.substring(0, 60)}
                            {project.description.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        project.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        project.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {project.budgetAmount ? (
                        <div>
                          <div className="font-medium">
                            {project.budgetCurrency} {project.budgetAmount.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Cost: {project.budgetCurrency} {project.actualCost.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span>{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        {project.startDate && (
                          <div className="text-xs">
                            Start: {new Date(project.startDate).toLocaleDateString()}
                          </div>
                        )}
                        {project.dueDate && (
                          <div className="text-xs text-muted-foreground">
                            Due: {new Date(project.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => handleEditProject(project.id)}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(project.id, project.name)}
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
            totalPages={paginatedProjects.totalPages}
            totalItems={paginatedProjects.total}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
          </>
        ) : (
          <EmptyState
            title="No projects found"
            description="Get started by creating your first project. Track tasks, milestones, and manage your team effectively."
            icon="folder"
            action={{
              label: "New Project",
              onClick: handleAddProject,
            }}
          />
        )}
      </div>

      {/* Stats */}
      {projects && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Total Projects</p>
            <p className="text-2xl font-bold">{projects.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">
              {projects.filter(p => p.status === 'active').length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">
              {projects.filter(p => p.status === 'completed').length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold">
              €{projects.reduce((sum, p) => sum + (p.budgetAmount || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
