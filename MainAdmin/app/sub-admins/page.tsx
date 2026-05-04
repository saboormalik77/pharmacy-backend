'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, UserCog, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  Loader2, Mail, CheckCircle, Clock, XCircle,
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
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Sub Admins</h1>
          <p className="text-gray-600 mt-1">Manage sub-administrators and their access permissions</p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Sub Admin
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16">
            <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No sub admins found</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1" /> Add First Sub Admin
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-500 to-indigo-400 text-white">
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
              <tbody className="divide-y divide-gray-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="odd:bg-white even:bg-gray-50/40 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{admin.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{admin.email}</td>
                    <td className="px-4 py-3 text-sm text-center">{inviteStatus(admin)}</td>
                    <td className="px-4 py-3 text-sm text-center hidden sm:table-cell">
                      <span className="text-xs text-gray-500">{admin.permissions?.length || 0} tabs</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        admin.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{formatDate(admin.created_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openViewModal(admin)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(admin)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-yellow-600" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!admin.invite_accepted_at && (
                          <button onClick={() => handleResendInvite(admin.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600" title="Resend Invite">
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm(admin.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600" title="Delete">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
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

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Sub Admin</h3>
            <p className="text-sm text-gray-600 mb-6">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Add Sub Admin' : 'Edit Sub Admin'}
              </h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100" disabled={isSaving}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Sub admin name"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="subadmin@example.com"
                  disabled={modalMode === 'edit' || isSaving}
                />
                {modalMode === 'create' && (
                  <p className="text-xs text-gray-500 mt-1">An invitation email will be sent to this address</p>
                )}
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isSaving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Tab Permissions *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                      disabled={isSaving}
                    >
                      Select All
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      disabled={isSaving}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">Select which tabs this sub admin can access</p>
                <div className="grid grid-cols-2 gap-2">
                  {permissionsList.map((perm) => (
                    <label
                      key={perm}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors',
                        formData.permissions.includes(perm)
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300',
                        isSaving && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        disabled={isSaving}
                      />
                      <span className="text-sm text-gray-700">
                        {PERMISSION_LABELS[perm] || perm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formData.permissions.length} of {permissionsList.length} selected
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
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
                  modalMode === 'create' ? 'Create & Send Invite' : 'Save Changes'
                )}
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
              <h3 className="text-lg font-semibold text-gray-900">Sub Admin Details</h3>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : selectedAdmin ? (
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedAdmin.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Role</p>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {selectedAdmin.role === 'main_admin' ? 'Main Admin' : 'Sub Admin'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{selectedAdmin.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      selectedAdmin.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {selectedAdmin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Invite Status</p>
                    <p className="text-sm text-gray-900">
                      {selectedAdmin.invite_accepted_at
                        ? `Accepted on ${formatDate(selectedAdmin.invite_accepted_at)}`
                        : 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Login</p>
                    <p className="text-sm text-gray-900">
                      {selectedAdmin.last_login_at ? formatDate(selectedAdmin.last_login_at) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-900">{formatDate(selectedAdmin.created_at)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Assigned Permissions ({Array.isArray(selectedAdmin.permissions) ? selectedAdmin.permissions.length : 0})
                  </h4>
                  {(!selectedAdmin.permissions || !Array.isArray(selectedAdmin.permissions) || selectedAdmin.permissions.length === 0) ? (
                    <p className="text-sm text-gray-500">No permissions assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedAdmin.permissions.map((perm) => (
                        <span key={perm} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                          {PERMISSION_LABELS[perm] || perm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">Sub admin not found.</div>
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
