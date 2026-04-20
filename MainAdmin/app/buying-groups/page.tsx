'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Users, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertTriangle, Loader2, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  fetchBuyingGroups,
  fetchBuyingGroupById,
  createBuyingGroup,
  updateBuyingGroup,
  deleteBuyingGroup,
  clearSelectedGroup,
  fetchBuyingGroupDomains,
  upsertBuyingGroupDomain,
  deleteBuyingGroupDomain,
  BuyingGroup,
} from '@/lib/store/buyingGroupsSlice';

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function BuyingGroupsPage() {
  const dispatch = useAppDispatch();
  const {
    buyingGroups, stats, pagination, isLoading, isLoadingDetail,
    selectedGroup, selectedGroupAdmins,
    selectedGroupDomains, isLoadingDomains,
    error,
  } = useAppSelector((state) => state.buyingGroups);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingGroup, setEditingGroup] = useState<BuyingGroup | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    notes: '',
    status: 'active',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
  });

  const [domainForm, setDomainForm] = useState({
    domain: '',
    adminHostname: '',
    pharmacyHostname: '',
  });
  const [domainError, setDomainError] = useState('');
  const [domainSavingId, setDomainSavingId] = useState<string | 'new' | null>(null);

  const [localDomains, setLocalDomains] = useState<Array<{ domain: string; adminHostname: string; pharmacyHostname: string }>>([]);
  const [localDomainForm, setLocalDomainForm] = useState({ domain: '', adminHostname: '', pharmacyHostname: '' });
  const [localDomainError, setLocalDomainError] = useState('');

  // When domains finish loading in edit mode, auto-fill the form with the first domain
  useEffect(() => {
    if (modalMode === 'edit' && selectedGroupDomains.length > 0 && !domainForm.domain) {
      const d = selectedGroupDomains[0];
      setDomainForm({
        domain: d.domain || '',
        adminHostname: d.adminHostname || '',
        pharmacyHostname: d.pharmacyHostname || '',
      });
    }
  }, [selectedGroupDomains, modalMode]);

  const loadGroups = useCallback(() => {
    dispatch(fetchBuyingGroups({
      page,
      limit: 10,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }));
  }, [dispatch, page, search, statusFilter]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const resetForm = () => {
    setFormData({
      name: '', contactEmail: '', contactPhone: '', address: '', notes: '',
      status: 'active', adminEmail: '', adminPassword: '', adminName: '',
    });
    setFormError('');
    setLocalDomains([]);
    setLocalDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
    setLocalDomainError('');
  };

  const openCreateModal = () => {
    resetForm();
    setDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
    setDomainError('');
    setModalMode('create');
  };

  const openEditModal = (group: BuyingGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      contactEmail: group.contactEmail || '',
      contactPhone: group.contactPhone || '',
      address: group.address || '',
      notes: group.notes || '',
      status: group.status || 'active',
      adminEmail: '',
      adminPassword: '',
      adminName: '',
    });
    setFormError('');
    setDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
    setDomainError('');
    dispatch(fetchBuyingGroupDomains(group.id));
    setModalMode('edit');
  };

  const openViewModal = (group: BuyingGroup) => {
    dispatch(fetchBuyingGroupById(group.id));
    dispatch(fetchBuyingGroupDomains(group.id));
    setDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
    setDomainError('');
    setModalMode('view');
  };

  const handleAddDomain = async (groupId: string, opts?: { replaceExisting?: boolean }) => {
    setDomainError('');
    if (!domainForm.domain.trim()) {
      setDomainError('Domain is required');
      return;
    }
    setDomainSavingId('new');
    try {
      // Edit modal requirement: do not allow multiple domains; overwrite previous domains
      if (opts?.replaceExisting) {
        for (const d of selectedGroupDomains) {
          await dispatch(deleteBuyingGroupDomain({ groupId, domainId: d.id })).unwrap();
        }
      }

      await dispatch(upsertBuyingGroupDomain({
        groupId,
        domain: domainForm.domain.trim(),
        adminHostname: domainForm.adminHostname.trim() || null,
        pharmacyHostname: domainForm.pharmacyHostname.trim() || null,
      })).unwrap();
    } catch (err: any) {
      setDomainError(err || 'Failed to save domain');
    } finally {
      setDomainSavingId(null);
    }
  };

  const handleDeleteDomain = async (domainId: string, groupId: string) => {
    setDomainSavingId(domainId);
    try {
      await dispatch(deleteBuyingGroupDomain({
        groupId,
        domainId,
      })).unwrap();
    } catch (err: any) {
      setDomainError(err || 'Failed to delete domain');
    } finally {
      setDomainSavingId(null);
    }
  };

  const handleLocalDomainAdd = () => {
    setLocalDomainError('');
    if (!localDomainForm.domain.trim()) {
      setLocalDomainError('Domain is required');
      return;
    }
    setLocalDomains((prev) => [
      ...prev,
      {
        domain: localDomainForm.domain.trim(),
        adminHostname: localDomainForm.adminHostname.trim(),
        pharmacyHostname: localDomainForm.pharmacyHostname.trim(),
      },
    ]);
    setLocalDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
  };

  const handleLocalDomainRemove = (index: number) => {
    setLocalDomains((prev) => prev.filter((_, i) => i !== index));
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingGroup(null);
    dispatch(clearSelectedGroup());
    resetForm();
  };

  const handleSubmitCreate = async () => {
    setFormError('');
    if (!formData.name.trim()) {
      setFormError('Buying group name is required');
      return;
    }
    if (formData.adminEmail && !formData.adminPassword) {
      setFormError('Password is required when providing admin email');
      return;
    }

    try {
      const result = await dispatch(createBuyingGroup({
        name: formData.name.trim(),
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        adminEmail: formData.adminEmail.trim() || undefined,
        adminPassword: formData.adminPassword || undefined,
        adminName: formData.adminName.trim() || undefined,
      })).unwrap();

      const newGroupId =
        (result as any)?.buyingGroup?.id ||
        (result as any)?.group?.id ||
        (result as any)?.id;

      if (newGroupId && localDomains.length > 0) {
        for (const ld of localDomains) {
          try {
            await dispatch(upsertBuyingGroupDomain({
              groupId: newGroupId,
              domain: ld.domain,
              adminHostname: ld.adminHostname || null,
              pharmacyHostname: ld.pharmacyHostname || null,
            })).unwrap();
          } catch {
            // domain save errors are non-critical
          }
        }
      }

      setSuccessMsg('Buying group created successfully');
      closeModal();
      loadGroups();
    } catch (err: any) {
      setFormError(err || 'Failed to create buying group');
    }
  };

  const handleSubmitEdit = async () => {
    setFormError('');
    if (!editingGroup) return;
    if (!formData.name.trim()) {
      setFormError('Buying group name is required');
      return;
    }

    try {
      await dispatch(updateBuyingGroup({
        id: editingGroup.id,
        name: formData.name.trim(),
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      })).unwrap();

      setSuccessMsg('Buying group updated successfully');
      closeModal();
      loadGroups();
    } catch (err: any) {
      setFormError(err || 'Failed to update buying group');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteBuyingGroup(id)).unwrap();
      setSuccessMsg('Buying group deleted successfully');
      setDeleteConfirm(null);
      loadGroups();
    } catch (err: any) {
      setFormError(err || 'Failed to delete buying group');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[status] || styles.inactive)}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buying Groups</h1>
          <p className="text-gray-600 mt-1">Manage your buying groups and their admin accounts</p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Buying Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-indigo-600 bg-indigo-100' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
          { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'text-gray-600 bg-gray-100' },
          { label: 'Suspended', value: stats.suspended, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', s.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{isLoading ? '...' : s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : buyingGroups.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No buying groups found</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1" /> Add First Buying Group
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Contact Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Phone</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Admins</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buyingGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{group.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{group.contactEmail || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{group.contactPhone || '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{group.adminCount}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(group.status)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(group.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openViewModal(group)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(group)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-yellow-600" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(group.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Buying Group</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this buying group? Associated admin accounts will be deactivated.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Add Buying Group' : 'Edit Buying Group'}
              </h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                <input
                  type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter buying group name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email" value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="text" value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text" value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Street address, city, state"
                />
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional notes"
                />
              </div>

              {modalMode === 'edit' && editingGroup && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Domains
                  </h4>

                  {domainError && (
                    <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                      {domainError}
                    </div>
                  )}

                  {isLoadingDomains ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {selectedGroupDomains.length === 0 ? (
                        <p className="text-sm text-gray-500">No domains configured yet.</p>
                      ) : (
                        selectedGroupDomains.map((d) => (
                          <div
                            key={d.id}
                            className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors"
                            onClick={() => setDomainForm({
                              domain: d.domain || '',
                              adminHostname: d.adminHostname || '',
                              pharmacyHostname: d.pharmacyHostname || '',
                            })}
                            title="Click to edit this domain"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">{d.domain}</p>
                              <div className="flex items-center gap-1">
                                {/* <span className="text-xs text-indigo-500 font-medium">Edit</span> */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteDomain(d.id, editingGroup.id); }}
                                  disabled={domainSavingId === d.id}
                                  className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-50"
                                  title="Delete domain"
                                >
                                  {domainSavingId === d.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-600">
                              <span className="font-medium">Admin:</span> {d.adminHostname || '-'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Pharmacy:</span> {d.pharmacyHostname || '-'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                    <p className="text-xs font-medium text-gray-700">
                      {domainForm.domain ? 'Edit domain' : 'Add / update a domain'}
                    </p>
                    <input
                      type="text"
                      placeholder="Base domain (e.g. abc.com)"
                      value={domainForm.domain}
                      onChange={(e) => setDomainForm((f) => ({ ...f, domain: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Admin hostname (e.g. admin.abc.com)"
                      value={domainForm.adminHostname}
                      onChange={(e) => setDomainForm((f) => ({ ...f, adminHostname: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Pharmacy hostname (e.g. pharmacy.abc.com)"
                      value={domainForm.pharmacyHostname}
                      onChange={(e) => setDomainForm((f) => ({ ...f, pharmacyHostname: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button
                      variant="primary"
                      onClick={() => handleAddDomain(editingGroup.id, { replaceExisting: true })}
                      disabled={domainSavingId === 'new'}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {domainSavingId === 'new' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Save Domain
                    </Button>
                  </div>
                </div>
              )}

              {modalMode === 'create' && (
                <>
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Admin Portal Credentials</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      These credentials will be used by this buying group to log in to the Admin Portal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
                    <input
                      type="text" value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Admin user display name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                      <input
                        type="email" value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="admin@buyinggroup.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
                      <input
                        type="password" value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Min 8 characters"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Domains
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      You can add domains now or later from the edit view.
                    </p>

                    {localDomainError && (
                      <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                        {localDomainError}
                      </div>
                    )}

                    {localDomains.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {localDomains.map((ld, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">{ld.domain}</p>
                              <button
                                type="button"
                                onClick={() => handleLocalDomainRemove(idx)}
                                className="p-1 rounded hover:bg-red-100 text-red-600"
                                title="Remove domain"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-gray-600">
                              <span className="font-medium">Admin:</span> {ld.adminHostname || '-'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Pharmacy:</span> {ld.pharmacyHostname || '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2 bg-white">
                      <p className="text-xs font-medium text-gray-700">Add a domain</p>
                      <input
                        type="text"
                        placeholder="Base domain (e.g. abc.com)"
                        value={localDomainForm.domain}
                        onChange={(e) => setLocalDomainForm((f) => ({ ...f, domain: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Admin hostname (e.g. admin.abc.com)"
                        value={localDomainForm.adminHostname}
                        onChange={(e) => setLocalDomainForm((f) => ({ ...f, adminHostname: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Pharmacy hostname (e.g. pharmacy.abc.com)"
                        value={localDomainForm.pharmacyHostname}
                        onChange={(e) => setLocalDomainForm((f) => ({ ...f, pharmacyHostname: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <Button
                        variant="outline"
                        onClick={handleLocalDomainAdd}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Domain
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button
                variant="primary"
                onClick={modalMode === 'create' ? handleSubmitCreate : handleSubmitEdit}
              >
                {modalMode === 'create' ? 'Add Buying Group' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === 'view' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Buying Group Details</h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : selectedGroup ? (
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedGroup.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="mt-0.5">{statusBadge(selectedGroup.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact Email</p>
                    <p className="text-sm text-gray-900">{selectedGroup.contactEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact Phone</p>
                    <p className="text-sm text-gray-900">{selectedGroup.contactPhone || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm text-gray-900">{selectedGroup.address || '-'}</p>
                  </div>
                  {selectedGroup.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="text-sm text-gray-900">{selectedGroup.notes}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedGroup.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Updated</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedGroup.updatedAt)}</p>
                  </div>
                </div>

                {/* Domains */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Domains ({selectedGroupDomains.length})
                  </h4>

                  {isLoadingDomains ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroupDomains.length === 0 ? (
                        <p className="text-sm text-gray-500">No domains configured.</p>
                      ) : (
                        selectedGroupDomains.map((d) => (
                          <div key={d.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                            <p className="text-sm font-medium text-gray-900">{d.domain}</p>
                            <p className="text-gray-600">
                              <span className="font-medium">Admin:</span> {d.adminHostname || '-'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Pharmacy:</span> {d.pharmacyHostname || '-'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Linked Admin Users */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Admin Portal Users ({selectedGroupAdmins.length})
                  </h4>
                  {selectedGroupAdmins.length === 0 ? (
                    <p className="text-sm text-gray-500">No admin users linked to this buying group.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroupAdmins.map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{admin.name}</p>
                            <p className="text-xs text-gray-500">{admin.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              admin.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            )}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              {admin.role}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">Group not found.</div>
            )}

            <div className="flex justify-end px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={closeModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
