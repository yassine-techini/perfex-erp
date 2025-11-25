/**
 * Contacts Page
 * Manage contacts and their company relationships
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { ContactWithCompany } from '@perfex/shared';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';

export function ContactsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch contacts with company details
  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['contacts', searchTerm, statusFilter],
    queryFn: async () => {
      let url = '/contacts?includeCompany=true';
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;

      const response = await api.get<ApiResponse<ContactWithCompany[]>>(url);
      return response.data.data;
    },
  });

  // Delete contact mutation
  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      await api.delete(`/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      alert('Contact deleted successfully!');
    },
    onError: (error) => {
      alert(`Failed to delete contact: ${getErrorMessage(error)}`);
    },
  });

  const handleAddContact = () => {
    navigate('/crm/contacts/new');
  };

  const handleEditContact = (contactId: string) => {
    navigate(`/crm/contacts/${contactId}/edit`);
  };

  const handleDelete = (contactId: string, contactName: string) => {
    if (confirm(`Are you sure you want to delete ${contactName}? This action cannot be undone.`)) {
      deleteContact.mutate(contactId);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Contacts' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Calculate paginated data
  const paginatedContacts = useMemo(() => {
    if (!contacts) return { data: [], total: 0, totalPages: 0 };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const data = contacts.slice(startIndex, endIndex);
    const total = contacts.length;
    const totalPages = Math.ceil(total / itemsPerPage);

    return { data, total, totalPages };
  }, [contacts, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your customer and prospect contacts
          </p>
        </div>
        <button
          onClick={handleAddContact}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add Contact
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search contacts by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusFilterChange(option.value)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                statusFilter === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading contacts...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Error: {getErrorMessage(error)}</p>
          </div>
        ) : paginatedContacts.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Position
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
                {paginatedContacts.data.map((contact) => (
                  <tr key={contact.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </div>
                        {contact.isPrimary && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            Primary
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {contact.company ? (
                        <div>
                          <div className="font-medium">{contact.company.name}</div>
                          <div className="text-xs text-muted-foreground">{contact.company.type}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No company</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {contact.phone || contact.mobile || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {contact.position || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contact.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => handleEditContact(contact.id)}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id, `${contact.firstName} ${contact.lastName}`)}
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
            totalPages={paginatedContacts.totalPages}
            totalItems={paginatedContacts.total}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
          </>
        ) : (
          <EmptyState
            title="No contacts found"
            description="Get started by adding your first contact. Contacts help you manage relationships with individuals at your customer companies."
            icon="users"
            action={{
              label: "Add Contact",
              onClick: handleAddContact,
            }}
          />
        )}
      </div>

      {/* Stats */}
      {contacts && contacts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Total Contacts</p>
            <p className="text-2xl font-bold">{contacts.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">
              {contacts.filter(c => c.status === 'active').length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">With Company</p>
            <p className="text-2xl font-bold">
              {contacts.filter(c => c.company).length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Primary Contacts</p>
            <p className="text-2xl font-bold">
              {contacts.filter(c => c.isPrimary).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
