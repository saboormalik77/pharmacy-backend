'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Users, Eye, EyeOff, Pencil, Trash2, X, ChevronLeft, ChevronRight,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const [showPassword, setShowPassword] = useState(false);

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

  // Keep domain inputs in sync with the list from the server: initial fill, clear when all deleted,
  // and refresh when the row shown in the form was removed (e.g. after delete).
  useEffect(() => {
    if (modalMode !== 'edit') return;

    if (selectedGroupDomains.length === 0) {
      setDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
      return;
    }

    setDomainForm((prev) => {
      const trimmed = prev.domain.trim();
      if (trimmed === '') {
        const d = selectedGroupDomains[0];
        return {
          domain: d.domain || '',
          adminHostname: d.adminHostname || '',
          pharmacyHostname: d.pharmacyHostname || '',
        };
      }
      const formDomain = trimmed.toLowerCase();
      const match = selectedGroupDomains.find(
        (d) => (d.domain || '').trim().toLowerCase() === formDomain
      );
      if (match) {
        return prev;
      }
      const d = selectedGroupDomains[0];
      return {
        domain: d.domain || '',
        adminHostname: d.adminHostname || '',
        pharmacyHostname: d.pharmacyHostname || '',
      };
    });
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
    setShowPassword(false);
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
    if (!domainForm.adminHostname.trim()) {
      setDomainError('Admin hostname is required');
      return;
    }
    if (!domainForm.pharmacyHostname.trim()) {
      setDomainError('Pharmacy hostname is required');
      return;
    }
    if (domainForm.adminHostname.trim().toLowerCase() === domainForm.pharmacyHostname.trim().toLowerCase()) {
      setDomainError('Admin and pharmacy hostnames must be different');
      return;
    }
    setDomainSavingId('new');
    try {
      if (opts?.replaceExisting) {
        for (const d of selectedGroupDomains) {
          await dispatch(deleteBuyingGroupDomain({ groupId, domainId: d.id })).unwrap();
        }
      }

      await dispatch(upsertBuyingGroupDomain({
        groupId,
        domain: domainForm.adminHostname.trim(),
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
    if (!localDomainForm.adminHostname.trim()) {
      setLocalDomainError('Admin hostname is required');
      return;
    }
    if (!localDomainForm.pharmacyHostname.trim()) {
      setLocalDomainError('Pharmacy hostname is required');
      return;
    }
    if (localDomainForm.adminHostname.trim().toLowerCase() === localDomainForm.pharmacyHostname.trim().toLowerCase()) {
      setLocalDomainError('Admin and pharmacy hostnames must be different');
      return;
    }
    setLocalDomains((prev) => [
      ...prev,
      {
        domain: localDomainForm.adminHostname.trim(),
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

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    setFormError('');
    if (!editingGroup) return;
    if (!formData.name.trim()) {
      setFormError('Buying group name is required');
      return;
    }

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await dispatch(deleteBuyingGroup(id)).unwrap();
      setSuccessMsg('Buying group deleted successfully');
      setDeleteConfirm(null);
      loadGroups();
    } catch (err: any) {
      setFormError(err || 'Failed to delete buying group');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusBadge = (status: string) => {
    const normalized = (status || 'active').toLowerCase().trim();
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border border-green-200',
      inactive: 'bg-gray-100 text-gray-600 border border-gray-200',
      suspended: 'bg-red-100 text-red-700 border border-red-200',
    };
    const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', styles[normalized] || styles.active)}>
        {label}
      </span>
    );
  };

  return (
    <div>
      {successMsg && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm border"
          style={{
            backgroundColor: 'var(--secondary-container)',
            borderColor: 'var(--secondary)',
            color: 'var(--on-surface)',
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Buying Groups</h1>
          <p className="mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            Manage your buying groups and their admin accounts
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Buying Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-primary-700 bg-primary-100' },
          { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
          { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'text-gray-600 bg-gray-100' },
          { label: 'Suspended', value: stats.suspended, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-lg border p-3 flex items-center gap-3"
              style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', s.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{s.label}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{isLoading ? '...' : s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div
        className="rounded-lg border p-4 mb-4"
        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              autoComplete="off"
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
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
              <thead className="text-white" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
                <tr>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Contact Email</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Phone</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Admins</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Created</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                {buyingGroups.map((group) => (
                  <tr key={group.id} className="transition-colors hover:bg-primary-50/40">
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{group.name}</td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{group.contactEmail || '-'}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{group.contactPhone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--on-surface-variant)' }}>{group.adminCount}</td>
                    <td className="px-4 py-3 text-sm text-center">{statusBadge(group.status)}</td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{formatDate(group.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openViewModal(group)} className="p-1.5 rounded hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(group)} className="p-1.5 rounded hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(group.id)} className="p-1.5 rounded hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="Delete">
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 45%, transparent)' }}
        >
          <div
            className="rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 border"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Delete Buying Group</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--on-surface-variant)' }}>
              Are you sure you want to delete this buying group? Associated admin accounts will be deactivated.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deleteConfirm)} disabled={isDeleting}>
                {isDeleting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</span>
                ) : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm overflow-y-auto py-6 px-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
        >
          <div
            className="rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
          >

            {/* Modal Header */}
            <div
              className="rounded-t-xl px-6 py-4 flex items-center justify-between shrink-0"
              style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {modalMode === 'create' ? 'Add Buying Group' : 'Edit Buying Group'}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--inverse-on-surface)' }}>
                    {modalMode === 'create' ? 'Fill in the details to create a new buying group' : 'Update the buying group information'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section: Group Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5">Group Information</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Group Name <span className="text-red-500">*</span></label>
                  <input
                    type="text" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                    placeholder="e.g. Northeast Pharmacy Alliance"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Contact Email</label>
                    <input
                      type="email" value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      autoComplete="off"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Contact Phone</label>
                    <input
                      type="text" value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      autoComplete="off"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                      placeholder="+1 (234) 567-8900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Address</label>
                  <input
                    type="text" value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Street address, city, state"
                  />
                </div>

                {modalMode === 'edit' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors resize-none"
                    placeholder="Optional internal notes..."
                  />
                </div>
              </div>

              {/* Section: Domains (Edit mode) */}
              {modalMode === 'edit' && editingGroup && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Domains
                    </span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  {domainError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{domainError}</span>
                    </div>
                  )}

                  {isLoadingDomains ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading domains...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroupDomains.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          No domains configured yet
                        </div>
                      ) : (
                        selectedGroupDomains.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-start justify-between p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                            onClick={() => setDomainForm({
                              domain: d.domain || '',
                              adminHostname: d.adminHostname || '',
                              pharmacyHostname: d.pharmacyHostname || '',
                            })}
                            title="Click to edit this domain"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-sm font-semibold text-indigo-800 truncate">{d.domain}</p>
                              <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Admin Portal:</span> {d.adminHostname || '—'}</p>
                              <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Pharmacy Portal:</span> {d.pharmacyHostname || '—'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteDomain(d.id, editingGroup.id); }}
                              disabled={domainSavingId === d.id}
                              className="ml-3 p-1.5 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0 transition-colors cursor-pointer"
                              title="Delete domain"
                            >
                              {domainSavingId === d.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {domainForm.domain ? '✏️ Editing domain' : '+ Add / update domain'}
                    </p>
                    <input
                      type="text"
                      placeholder="Admin hostname (e.g. admin.abc.com)"
                      value={domainForm.adminHostname}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDomainForm((f) => ({ ...f, adminHostname: value, domain: value }));
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Pharmacy hostname (e.g. pharmacy.abc.com)"
                      value={domainForm.pharmacyHostname}
                      onChange={(e) => setDomainForm((f) => ({ ...f, pharmacyHostname: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    <Button
                      variant="primary"
                      onClick={() => handleAddDomain(editingGroup.id, { replaceExisting: true })}
                      disabled={domainSavingId === 'new'}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {domainSavingId === 'new' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      ) : (
                        <><Plus className="w-4 h-4" /> Save Domain</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Section: Admin Credentials + Domains (Create mode) */}
              {modalMode === 'create' && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5">Buying Group Admin Credentials</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <p className="text-xs text-gray-600 -mt-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      These credentials will be used by the buying group admin to log in to the Buying Group Portal.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Admin Name</label>
                      <input
                        type="text" value={formData.adminName}
                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        autoComplete="off"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                        placeholder="Admin user display name"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Admin Email</label>
                        <input
                          type="email" value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          autoComplete="off"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                          placeholder="admin@buyinggroup.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Admin Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.adminPassword}
                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                            autoComplete="new-password"
                            className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                            placeholder="Min 8 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Domains (Create) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Domains
                      </span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      You can add domains now or later from the edit view.
                    </p>

                    {localDomainError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{localDomainError}</span>
                      </div>
                    )}

                    {localDomains.length > 0 && (
                      <div className="space-y-2">
                        {localDomains.map((ld, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-sm font-semibold text-indigo-800 truncate">{ld.domain}</p>
                              <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Admin Portal:</span> {ld.adminHostname || '—'}</p>
                              <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Pharmacy Portal:</span> {ld.pharmacyHostname || '—'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLocalDomainRemove(idx)}
                              className="ml-3 p-1.5 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700 shrink-0 transition-colors cursor-pointer"
                              title="Remove domain"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">+ Add a domain</p>
                      <input
                        type="text"
                        placeholder="Admin hostname (e.g. admin.abc.com)"
                        value={localDomainForm.adminHostname}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLocalDomainForm((f) => ({ ...f, adminHostname: value, domain: value }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Pharmacy hostname (e.g. pharmacy.abc.com)"
                        value={localDomainForm.pharmacyHostname}
                        onChange={(e) => setLocalDomainForm((f) => ({ ...f, pharmacyHostname: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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

            {/* Modal Footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-4 border-t rounded-b-xl shrink-0"
              style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
            >
              <Button variant="outline" onClick={closeModal} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={modalMode === 'create' ? handleSubmitCreate : handleSubmitEdit}
                disabled={isSubmitting}
                className="min-w-[130px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {modalMode === 'create' ? 'Adding...' : 'Saving...'}
                  </span>
                ) : (
                  modalMode === 'create' ? 'Add Buying Group' : 'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === 'view' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm overflow-y-auto py-6 px-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
        >
          <div
            className="rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
          >

            {/* Header */}
            <div
              className="rounded-t-xl px-6 py-4 flex items-center justify-between shrink-0"
              style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Buying Group Details</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--inverse-on-surface)' }}>View group information and linked accounts</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            ) : selectedGroup ? (
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                {/* Group Name + Status Banner */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold mb-1">Buying Group</p>
                    <p className="text-lg font-bold text-gray-900 leading-tight truncate">{selectedGroup.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Created {formatDate(selectedGroup.createdAt)}</p>
                  </div>
                  <div className="shrink-0">{statusBadge(selectedGroup.status)}</div>
                </div>

                {/* Info fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Contact Email', value: selectedGroup.contactEmail },
                    { label: 'Contact Phone', value: selectedGroup.contactPhone },
                    { label: 'Address', value: selectedGroup.address, full: true },
                    ...(selectedGroup.notes ? [{ label: 'Notes', value: selectedGroup.notes, full: true }] : []),
                    { label: 'Last Updated', value: formatDate(selectedGroup.updatedAt) },
                    { label: 'Total Admins', value: String(selectedGroup.adminCount ?? selectedGroupAdmins.length) },
                  ].map((field) => (
                    <div
                      key={field.label}
                      className={cn(
                        'bg-white rounded-lg border border-gray-100 px-3.5 py-3',
                        field.full ? 'sm:col-span-2' : ''
                      )}
                    >
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">{field.label}</p>
                      <p className="text-sm font-medium text-gray-800">{field.value || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Domains */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2.5 bg-indigo-50 rounded-full py-1 flex items-center gap-1.5 border border-indigo-100">
                      <Globe className="w-3 h-3" /> Portal Domains ({selectedGroupDomains.length})
                    </span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  {isLoadingDomains ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    </div>
                  ) : selectedGroupDomains.length === 0 ? (
                    <div className="text-center py-5 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No portal domains configured
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroupDomains.map((d) => (
                        <div key={d.id} className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
                          <div className="bg-indigo-50 px-3.5 py-2 border-b border-indigo-100">
                            <p className="text-sm font-semibold text-indigo-800">{d.domain || d.adminHostname}</p>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-gray-100">
                            <div className="px-3.5 py-2.5">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Admin Portal</p>
                              <p className="text-xs font-medium text-gray-700 truncate">{d.adminHostname || '—'}</p>
                            </div>
                            <div className="px-3.5 py-2.5">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Pharmacy Portal</p>
                              <p className="text-xs font-medium text-gray-700 truncate">{d.pharmacyHostname || '—'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buying Group Admins */}
                {/* <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2.5 bg-indigo-50 rounded-full py-1 border border-indigo-100">
                      Buying Group Admins ({selectedGroupAdmins.length})
                    </span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                  {selectedGroupAdmins.length === 0 ? (
                    <div className="text-center py-5 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No admins linked to this buying group yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroupAdmins.map((admin) => (
                        <div key={admin.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{admin.name}</p>
                            <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-semibold border',
                              admin.isActive
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            )}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                              {admin.role}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div> */}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">Buying group not found.</div>
            )}

            <div
              className="flex justify-end px-6 py-4 border-t rounded-b-xl shrink-0"
              style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
            >
              <Button variant="outline" onClick={closeModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
