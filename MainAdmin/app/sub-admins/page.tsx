'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, UserCog, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  Loader2, Mail, CheckCircle, Clock, XCircle, Shield, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  fetchSubAdmins,
  fetchSubAdminById,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  resendInvite,
  fetchAvailablePermissions,
  clearSelectedAdmin,
  SubAdmin,
} from '@/lib/store/subAdminsSlice';

const PERMISSION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  buying_groups: 'Buying Groups',
  distributors: 'Distributors',
  warehouse: 'Warehouse',
  payout_hub: 'Payout Management',
  policies: 'Labeler Info',
  ndc_pricing: 'NDC Pricing',
  tbd_items: 'TBD Items',
  destruction: 'Destruction',
  settings: 'Settings',
};

type ModalMode = 'create' | 'edit' | 'view' | null;

export default function SubAdminsPage() {
  const dispatch = useAppDispatch();
  const {
    admins, pagination, isLoading, isLoadingDetail,
    selectedAdmin, availablePermissions, error,
  } = useAppSelector((state) => state.subAdmins);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingAdmin, setEditingAdmin] = useState<SubAdmin | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sub_admin',
    permissions: [] as string[],
    isActive: true,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadAdmins = useCallback(() => {
    dispatch(fetchSubAdmins({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }));
  }, [dispatch, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    dispatch(fetchAvailablePermissions());
  }, [dispatch]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const resetForm = () => {
    setFormData({ name: '', email: '', role: 'sub_admin', permissions: [], isActive: true });
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
  };

  const openEditModal = (admin: SubAdmin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      role: admin.role || 'sub_admin',
      permissions: admin.permissions || [],
      isActive: admin.is_active,
    });
    setFormError('');
    setModalMode('edit');
  };

  const openViewModal = (admin: SubAdmin) => {
    dispatch(fetchSubAdminById(admin.id));
    setModalMode('view');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingAdmin(null);
    dispatch(clearSelectedAdmin());
    resetForm();
    setIsSaving(false);
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const selectAllPermissions = () => {
    const perms = availablePermissions.length > 0 ? availablePermissions : Object.keys(PERMISSION_LABELS);
    setFormData(prev => ({ ...prev, permissions: [...perms] }));
  };

  const clearAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  const handleSubmitCreate = async () => {
    setFormError('');
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (formData.permissions.length === 0) {
      setFormError('At least one permission must be selected');
      return;
    }

    setIsSaving(true);

    try {
      await dispatch(createSubAdmin({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        permissions: formData.permissions,
      })).unwrap();

      setSuccessMsg('Sub admin created. An invitation email has been sent.');
      closeModal();
      loadAdmins();
    } catch (err: any) {
      setFormError(err || 'Failed to create sub admin');
      setIsSaving(false);
    }
  };

  const handleSubmitEdit = async () => {
    setFormError('');
    if (!editingAdmin) return;
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    setIsSaving(true);

    try {
      await dispatch(updateSubAdmin({
        id: editingAdmin.id,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        role: formData.role,
        permissions: formData.permissions,
        isActive: formData.isActive,
      })).unwrap();

      setSuccessMsg('Sub admin updated successfully');
      closeModal();
      loadAdmins();
    } catch (err: any) {
      setFormError(err || 'Failed to update sub admin');
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteSubAdmin(id)).unwrap();
      setSuccessMsg('Sub admin deleted successfully');
      setDeleteConfirm(null);
      loadAdmins();
    } catch (err: any) {
      setFormError(err || 'Failed to delete sub admin');
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await dispatch(resendInvite(id)).unwrap();
      setSuccessMsg('Invitation email resent successfully');
    } catch (err: any) {
      setFormError(err || 'Failed to resend invite');
    }
  };

  const inviteStatus = (admin: SubAdmin) => {
    if (admin.invite_accepted_at) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  const permissionsList = availablePermissions.length > 0 ? availablePermissions : Object.keys(PERMISSION_LABELS);

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Sub Admins</h1>
          <p className="mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            Manage sub-administrators and their access permissions
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Sub Admin
        </Button>
      </div>

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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
          </select>
        </div>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16">
            <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p style={{ color: 'var(--on-surface-variant)' }}>No sub admins found</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1" /> Add First Sub Admin
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
                <tr>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Email</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Invite</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Permissions</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Created</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-primary-50/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{admin.name}</td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{admin.email}</td>
                    <td className="px-4 py-3 text-sm text-center">{inviteStatus(admin)}</td>
                    <td className="px-4 py-3 text-sm text-center hidden sm:table-cell">
                      <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{admin.permissions?.length || 0} tabs</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        admin.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{formatDate(admin.created_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openViewModal(admin)} className="p-1.5 rounded hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(admin)} className="p-1.5 rounded hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!admin.invite_accepted_at && (
                          <button onClick={() => handleResendInvite(admin.id)} className="p-1.5 rounded hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="Resend Invite">
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm(admin.id)} className="p-1.5 rounded hover:bg-primary-50 hover:text-red-600 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="Delete">
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

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 45%, transparent)' }}
        >
          <div className="rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Delete Sub Admin</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--on-surface-variant)' }}>
              Are you sure you want to delete this sub admin? This action cannot be undone.
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm overflow-auto py-8 px-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
        >
          <div className="rounded-xl shadow-2xl max-w-2xl w-full my-auto border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
            {/* Header */}
            <div className="rounded-t-xl px-5 py-3" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <UserCog className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {modalMode === 'create' ? 'Add Sub Admin' : 'Edit Sub Admin'}
                  </h3>
                </div>
                <button 
                  onClick={closeModal} 
                  className="text-white/80 hover:text-white transition-colors cursor-pointer" 
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4 max-h-[calc(90vh-140px)] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--primary)' }}></div>
                    <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>Basic Information</h4>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                      placeholder="Enter full name"
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed"
                      style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                      placeholder="subadmin@example.com"
                      disabled={modalMode === 'edit' || isSaving}
                    />
                    {modalMode === 'create' && (
                      <div className="mt-1.5 p-2 border rounded text-xs flex items-start gap-1.5" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface-variant)' }}>
                        <Mail className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>An invitation email will be sent to this address</span>
                      </div>
                    )}
                  </div>

                  {modalMode === 'edit' && (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                        Account Status
                      </label>
                      <select
                        value={formData.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                        style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
                        disabled={isSaving}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Permissions Section */}
                <div className="pt-3 border-t" style={{ borderColor: 'var(--outline-variant)' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--tertiary)' }}></div>
                    <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>Access Permissions</h4>
                  </div>

                  <div className="flex items-center justify-between mb-3 p-2 border rounded-lg" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                      {formData.permissions.length} of {permissionsList.length} tabs selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className="text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50 cursor-pointer"
                        disabled={isSaving}
                      >
                        Select All
                      </button>
                      <span className="text-xs text-purple-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        className="text-xs font-medium disabled:opacity-50 cursor-pointer"
                        style={{ color: 'var(--on-surface-variant)' }}
                        disabled={isSaving}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p className="text-xs mb-3" style={{ color: 'var(--on-surface-variant)' }}>Select which tabs this sub admin can access in the system</p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                    {permissionsList.map((perm) => (
                      <label
                        key={perm}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-lg border transition-all',
                          formData.permissions.includes(perm)
                            ? 'shadow-sm'
                            : '',
                          isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        )}
                        style={
                          formData.permissions.includes(perm)
                            ? { borderColor: 'var(--outline-variant)', backgroundColor: 'var(--primary-50)' }
                            : { borderColor: 'var(--outline-variant)', backgroundColor: 'transparent' }
                        }
                      >
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          style={{ accentColor: 'var(--primary)' }}
                          disabled={isSaving}
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                          {PERMISSION_LABELS[perm] || perm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>

                  {formData.permissions.length === 0 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                      Please select at least one permission
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t rounded-b-xl" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
              <Button variant="outline" onClick={closeModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={modalMode === 'create' ? handleSubmitCreate : handleSubmitEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {modalMode === 'create' ? 'Creating...' : 'Saving...'}
                  </span>
                ) : (
                  <>
                    {modalMode === 'create' ? (
                      <>
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        Create & Send Invite
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === 'view' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm overflow-auto py-8 px-4" style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}>
          <div className="rounded-xl shadow-2xl max-w-2xl w-full my-auto border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
            {/* Header */}
            <div className="rounded-t-xl px-5 py-3" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-container) 100%)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <UserCheck className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Sub Admin Details</h3>
                </div>
                <button 
                  onClick={closeModal} 
                  className="text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin mb-2" style={{ color: 'var(--primary)' }} />
                <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading details...</span>
              </div>
            ) : selectedAdmin ? (
              <div className="px-5 py-4 space-y-4">
                {/* Primary Info Banner */}
                <div className="border rounded-lg p-3" style={{ background: 'linear-gradient(135deg, var(--surface-container-low) 0%, var(--primary-50) 100%)', borderColor: 'var(--outline-variant)' }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--on-surface-variant)' }}>Administrator</p>
                      <p className="text-base font-bold mb-1" style={{ color: 'var(--foreground)' }}>{selectedAdmin.name}</p>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                        <Mail className="w-3 h-3" />
                        <span>{selectedAdmin.email}</span>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-lg text-xs font-bold border',
                      selectedAdmin.is_active 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-red-100 text-red-700 border-red-300'
                    )}>
                      {selectedAdmin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Account Information */}
                <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {/* Role */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--on-surface-variant)' }}>Role</span>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold inline-block" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                        {selectedAdmin.role === 'main_admin' ? 'Main Admin' : 'Sub Admin'}
                      </span>
                    </div>

                    {/* Invite Status */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--on-surface-variant)' }}>Invite Status</span>
                      <div className="flex items-center gap-1.5">
                        {selectedAdmin.invite_accepted_at ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs" style={{ color: 'var(--foreground)' }}>Accepted</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-yellow-600" />
                            <span className="text-xs" style={{ color: 'var(--foreground)' }}>Pending</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Accepted On - only if accepted */}
                    {selectedAdmin.invite_accepted_at && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--on-surface-variant)' }}>Accepted On</span>
                        <span className="text-xs" style={{ color: 'var(--foreground)' }}>{formatDate(selectedAdmin.invite_accepted_at)}</span>
                      </div>
                    )}

                    {/* Last Login */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--on-surface-variant)' }}>Last Login</span>
                      <span className="text-xs" style={{ color: 'var(--foreground)' }}>
                        {selectedAdmin.last_login_at ? formatDate(selectedAdmin.last_login_at) : 'Never'}
                      </span>
                    </div>

                    {/* Created */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--on-surface-variant)' }}>Created</span>
                      <span className="text-xs" style={{ color: 'var(--foreground)' }}>{formatDate(selectedAdmin.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="border rounded-lg p-3" style={{ background: 'linear-gradient(135deg, var(--surface-container-low) 0%, var(--tertiary-fixed) 100%)', borderColor: 'var(--outline-variant)' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Shield className="w-3.5 h-3.5" style={{ color: 'var(--tertiary)' }} />
                    <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
                      Access Permissions ({Array.isArray(selectedAdmin.permissions) ? selectedAdmin.permissions.length : 0})
                    </h4>
                  </div>
                  
                  {(!selectedAdmin.permissions || !Array.isArray(selectedAdmin.permissions) || selectedAdmin.permissions.length === 0) ? (
                    <div className="text-center py-4">
                      <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No permissions assigned</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedAdmin.permissions.map((perm) => (
                        <div key={perm} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                          <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--tertiary)' }} />
                          <span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {PERMISSION_LABELS[perm] || perm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Sub admin not found</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between gap-2 px-5 py-3 border-t rounded-b-xl" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}>
              <div>
                {selectedAdmin && !selectedAdmin.invite_accepted_at && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      handleResendInvite(selectedAdmin.id);
                      closeModal();
                    }}
                    className="text-xs"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Resend Invite
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
