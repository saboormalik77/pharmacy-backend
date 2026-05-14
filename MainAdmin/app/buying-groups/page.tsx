'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Users, Eye, EyeOff, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertTriangle, Loader2, Globe, Copy,
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
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceRoleKey: '',
    supabaseEnabled: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showSupabaseKeys, setShowSupabaseKeys] = useState({ anonKey: false, serviceKey: false });

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

  /** Which Supabase view-modal copy button just succeeded (shows check briefly). */
  const [supabaseViewCopiedKey, setSupabaseViewCopiedKey] = useState<'url' | 'anon' | 'service' | null>(null);
  const supabaseViewCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const copySupabaseViewField = useCallback(async (value: string | null | undefined, key: 'url' | 'anon' | 'service') => {
    const text = (value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (supabaseViewCopyTimerRef.current) {
        clearTimeout(supabaseViewCopyTimerRef.current);
        supabaseViewCopyTimerRef.current = null;
      }
      setSupabaseViewCopiedKey(key);
      supabaseViewCopyTimerRef.current = setTimeout(() => {
        setSupabaseViewCopiedKey(null);
        supabaseViewCopyTimerRef.current = null;
      }, 2000);
    } catch {
      /* clipboard blocked — no toast behind modal */
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // After GET /buying-groups/:id completes, merge server row into the edit form (Supabase + contact fields).
  useEffect(() => {
    if (modalMode !== 'edit' || !editingGroup || isLoadingDetail) return;
    if (!selectedGroup || selectedGroup.id !== editingGroup.id) return;
    setFormData((prev) => ({
      ...prev,
      name: selectedGroup.name || '',
      contactEmail: selectedGroup.contactEmail || '',
      contactPhone: selectedGroup.contactPhone || '',
      address: selectedGroup.address || '',
      notes: selectedGroup.notes || '',
      status: selectedGroup.status || 'active',
      supabaseUrl: selectedGroup.supabaseUrl || '',
      supabaseAnonKey: selectedGroup.supabaseAnonKey || '',
      supabaseServiceRoleKey: selectedGroup.supabaseServiceRoleKey || '',
      supabaseEnabled: Boolean(selectedGroup.supabaseEnabled),
      adminEmail: '',
      adminPassword: '',
      adminName: '',
    }));
  }, [modalMode, editingGroup?.id, selectedGroup, isLoadingDetail]);

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
      supabaseUrl: '', supabaseAnonKey: '', supabaseServiceRoleKey: '', supabaseEnabled: false,
    });
    setFormError('');
    setShowPassword(false);
    setLocalDomains([]);
    setLocalDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
    setLocalDomainError('');
    setShowSupabaseKeys({ anonKey: false, serviceKey: false });
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
      supabaseUrl: group.supabaseUrl || '',
      supabaseAnonKey: group.supabaseAnonKey || '',
      supabaseServiceRoleKey: group.supabaseServiceRoleKey || '',
      supabaseEnabled: Boolean(group.supabaseEnabled),
    });
    setFormError('');
    setDomainForm({ domain: '', adminHostname: '', pharmacyHostname: '' });
    setDomainError('');
    dispatch(fetchBuyingGroupById(group.id));
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
    if (supabaseViewCopyTimerRef.current) {
      clearTimeout(supabaseViewCopyTimerRef.current);
      supabaseViewCopyTimerRef.current = null;
    }
    setSupabaseViewCopiedKey(null);
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
        supabaseUrl: formData.supabaseUrl.trim() || undefined,
        supabaseAnonKey: formData.supabaseAnonKey.trim() || undefined,
        supabaseServiceRoleKey: formData.supabaseServiceRoleKey.trim() || undefined,
        supabaseEnabled: formData.supabaseEnabled,
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
        supabaseUrl: formData.supabaseUrl.trim() || undefined,
        supabaseAnonKey: formData.supabaseAnonKey.trim() || undefined,
        supabaseServiceRoleKey: formData.supabaseServiceRoleKey.trim() || undefined,
        supabaseEnabled: formData.supabaseEnabled,
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
      inactive: 'bg-[var(--surface-container)] text-[var(--on-primary-container)] border-[var(--outline-variant)]',
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
          className="mb-4 px-4 py-3 rounded-[4px] text-sm border"
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
          <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Buying Groups</h1>
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
          { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'text-gray-600 bg-[var(--surface-container)]' },
          { label: 'Suspended', value: stats.suspended, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-[4px] border p-6 flex items-center gap-3"
              style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
              <div className={cn('w-9 h-9 rounded-[4px] flex items-center justify-center', s.color)}>
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
        className="rounded-[4px] border p-4 mb-4"
        style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" />
            <input
              type="search"
              name="buying_groups_list_query"
              id="buying-groups-list-query"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary-500"
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
      <div className="rounded-[4px] border overflow-hidden" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--outline)]" />
            <span className="ml-2 text-[var(--on-surface-variant)]">Loading...</span>
          </div>
        ) : buyingGroups.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-[var(--outline-variant)] mx-auto mb-3" />
            <p className="text-[var(--on-surface-variant)]">No buying groups found</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1" /> Add First Buying Group
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border" style={{ borderColor: 'var(--outline)' }}>
              <thead className="bg-[var(--surface-container-low)] border-b" style={{ borderColor: 'var(--outline)', borderBottomWidth: '1.5px' }}>
                <tr className="bg-[var(--surface-container-low)]">
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Contact Email</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Phone</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Admins</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Created</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--outline-variant)' }}>
                {buyingGroups.map((group) => (
                  <tr key={group.id} className="transition-colors hover:bg-[var(--surface-container)]" style={{ borderColor: 'var(--outline-variant)' }}>
                    <td className="px-3 py-3 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{group.name}</td>
                    <td className="px-3 py-3 text-sm hidden md:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{group.contactEmail || '-'}</td>
                    <td className="px-3 py-3 text-sm hidden lg:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{group.contactPhone || '-'}</td>
                    <td className="px-3 py-3 text-sm text-center" style={{ color: 'var(--on-surface-variant)' }}>{group.adminCount}</td>
                    <td className="px-3 py-3 text-sm text-center">{statusBadge(group.status)}</td>
                    <td className="px-3 py-3 text-sm hidden sm:table-cell" style={{ color: 'var(--on-surface-variant)' }}>{formatDate(group.createdAt)}</td>
                    <td className="px-3 py-3 text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openViewModal(group)} className="p-1.5 rounded-[4px] hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(group)} className="p-1.5 rounded-[4px] hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(group.id)} className="p-1.5 rounded-[4px] hover:bg-primary-50 transition-colors" style={{ color: 'var(--on-surface-variant)' }} title="Delete">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
            <p className="text-sm text-[var(--on-primary-container)]">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-[4px] hover:bg-[var(--surface-container-high)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-[4px] hover:bg-[var(--surface-container-high)] disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
        >
          <div
            className="rounded-[4px] shadow-xl max-w-sm w-full mx-4 p-6 border"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
          >
            <h3 className="font-heading text-body font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Delete Buying Group</h3>
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
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm overflow-y-auto py-6 px-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="rounded-[4px] shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col border min-h-0"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="buying-group-modal-title"
          >

            {/* Modal Header */}
            <div
              className="px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b"
              style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--surface-container-high)' }}
                >
                  <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="min-w-0">
                  <h3 id="buying-group-modal-title" className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                    {modalMode === 'create' ? 'Add Buying Group' : 'Edit Buying Group'}
                  </h3>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                    {modalMode === 'create' ? 'Fill in the details to create a new buying group' : 'Update the buying group information'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-[4px] hover:bg-primary-50/40 cursor-pointer shrink-0"
                style={{ color: 'var(--outline)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-[4px] text-sm border">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section: Group Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[var(--surface-container)]" />
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5">Group Information</span>
                  <div className="h-px flex-1 bg-[var(--surface-container)]" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Group Name <span className="text-red-500">*</span></label>
                  <input
                    type="text" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                    placeholder="e.g. Northeast Pharmacy Alliance"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Contact Email</label>
                    <input
                      type="email" value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      autoComplete="off"
                      className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Contact Phone</label>
                    <input
                      type="text" value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      autoComplete="off"
                      className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                      placeholder="+1 (234) 567-8900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Address</label>
                  <input
                    type="text" value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                    placeholder="Street address, city, state"
                  />
                </div>

                {modalMode === 'edit' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors resize-none"
                    placeholder="Optional internal notes..."
                  />
                </div>
              </div>

              {/* Section: Supabase Credentials (Edit mode) */}
              {modalMode === 'edit' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-[var(--surface-container)]" />
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5">Supabase Credentials</span>
                    <div className="h-px flex-1 bg-[var(--surface-container)]" />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="supabaseEnabledEdit"
                      checked={formData.supabaseEnabled}
                      onChange={(e) => setFormData({ ...formData, supabaseEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--outline-variant)] text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="supabaseEnabledEdit" className="text-sm text-[var(--on-surface)]">
                      Enable Supabase Connection
                    </label>
                  </div>

                  {formData.supabaseEnabled && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Supabase URL</label>
                        <input
                          type="url"
                          value={formData.supabaseUrl}
                          onChange={(e) => setFormData({ ...formData, supabaseUrl: e.target.value })}
                          autoComplete="off"
                          className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                          placeholder="https://your-project.supabase.co"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Supabase Anon Key</label>
                        <div className="relative">
                          <input
                            type={showSupabaseKeys.anonKey ? "text" : "password"}
                            value={formData.supabaseAnonKey}
                            onChange={(e) => setFormData({ ...formData, supabaseAnonKey: e.target.value })}
                            autoComplete="off"
                            className="w-full px-3 py-2.5 pr-10 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowSupabaseKeys((prev) => ({ ...prev, anonKey: !prev.anonKey }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--on-primary-container)] focus:outline-none cursor-pointer"
                          >
                            {showSupabaseKeys.anonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Supabase Service Role Key</label>
                        <div className="relative">
                          <input
                            type={showSupabaseKeys.serviceKey ? "text" : "password"}
                            value={formData.supabaseServiceRoleKey}
                            onChange={(e) => setFormData({ ...formData, supabaseServiceRoleKey: e.target.value })}
                            autoComplete="off"
                            className="w-full px-3 py-2.5 pr-10 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowSupabaseKeys((prev) => ({ ...prev, serviceKey: !prev.serviceKey }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--on-primary-container)] focus:outline-none cursor-pointer"
                          >
                            {showSupabaseKeys.serviceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Section: Domains (Edit mode) */}
              {modalMode === 'edit' && editingGroup && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-[var(--surface-container)]" />
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Domains
                    </span>
                    <div className="h-px flex-1 bg-[var(--surface-container)]" />
                  </div>

                  {domainError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[4px] text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{domainError}</span>
                    </div>
                  )}

                  {isLoadingDomains ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                      <span className="ml-2 text-sm text-[var(--on-surface-variant)]">Loading domains...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroupDomains.length === 0 ? (
                        <div className="text-center py-4 text-sm text-[var(--outline)] bg-[var(--surface-container-low)] rounded-[4px] border border-dashed border-[var(--outline-variant)]">
                          No domains configured yet
                        </div>
                      ) : (
                        selectedGroupDomains.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-start justify-between p-3 bg-indigo-50/60 rounded-[4px] border border-indigo-100 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                            onClick={() => setDomainForm({
                              domain: d.domain || '',
                              adminHostname: d.adminHostname || '',
                              pharmacyHostname: d.pharmacyHostname || '',
                            })}
                            title="Click to edit this domain"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-sm font-semibold text-indigo-800 truncate">{d.domain}</p>
                              <p className="text-xs text-[var(--on-surface-variant)]"><span className="font-medium text-[var(--on-primary-container)]">Admin Portal:</span> {d.adminHostname || '—'}</p>
                              <p className="text-xs text-[var(--on-surface-variant)]"><span className="font-medium text-[var(--on-primary-container)]">Pharmacy Portal:</span> {d.pharmacyHostname || '—'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteDomain(d.id, editingGroup.id); }}
                              disabled={domainSavingId === d.id}
                              className="ml-3 p-1.5 rounded-[4px] hover:bg-red-100 text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0 transition-colors cursor-pointer"
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

                  <div className="bg-[var(--surface-container-low)] border border-dashed border-[var(--outline-variant)] rounded-[4px] p-4 space-y-3">
                    <p className="text-xs font-semibold text-[var(--on-primary-container)] uppercase tracking-wide">
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
                      className="w-full px-3 py-2 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Pharmacy hostname (e.g. pharmacy.abc.com)"
                      value={domainForm.pharmacyHostname}
                      onChange={(e) => setDomainForm((f) => ({ ...f, pharmacyHostname: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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
                          <div className="h-px flex-1 bg-[var(--surface-container)]" />
                          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5">Buying Group Admin Credentials</span>
                          <div className="h-px flex-1 bg-[var(--surface-container)]" />
                        </div>
                        <p
                          className="text-xs -mt-1 rounded-[4px] px-3 py-2 border leading-snug"
                          style={{
                            backgroundColor: 'var(--secondary-container)',
                            borderColor: 'var(--outline-variant)',
                            color: 'var(--on-secondary-container)',
                          }}
                        >
                          These credentials will be used by the buying group admin to log in to the Buying Group Portal.
                        </p>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Admin Name</label>
                          <input
                            type="text" value={formData.adminName}
                            onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                            autoComplete="off"
                            className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                            placeholder="Admin user display name"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Admin Email</label>
                            <input
                              type="email" value={formData.adminEmail}
                              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                              autoComplete="off"
                              className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                              placeholder="admin@buyinggroup.com"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Admin Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={formData.adminPassword}
                                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                autoComplete="new-password"
                                className="w-full px-3 py-2.5 pr-10 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                                placeholder="Min 8 characters"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--on-primary-container)] focus:outline-none cursor-pointer"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Supabase Credentials (Create) */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-[var(--surface-container)]" />
                          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5">Supabase Credentials</span>
                          <div className="h-px flex-1 bg-[var(--surface-container)]" />
                        </div>
                        <p
                          className="text-xs -mt-1 rounded-[4px] px-3 py-2 border leading-snug"
                          style={{
                            backgroundColor: 'var(--surface-container-low)',
                            borderColor: 'var(--outline-variant)',
                            color: 'var(--on-surface)',
                          }}
                        >
                          Configure Supabase connection to enable the buying group to connect with their own database.
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="supabaseEnabledCreate"
                            checked={formData.supabaseEnabled}
                            onChange={(e) => setFormData({ ...formData, supabaseEnabled: e.target.checked })}
                            className="w-4 h-4 rounded border-[var(--outline-variant)] text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor="supabaseEnabledCreate" className="text-sm text-[var(--on-surface)]">
                            Enable Supabase Connection
                          </label>
                        </div>

                        {formData.supabaseEnabled && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Supabase URL</label>
                              <input
                                type="url"
                                value={formData.supabaseUrl}
                                onChange={(e) => setFormData({ ...formData, supabaseUrl: e.target.value })}
                                autoComplete="off"
                                className="w-full px-3 py-2.5 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                                placeholder="https://your-project.supabase.co"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Supabase Anon Key</label>
                              <div className="relative">
                                <input
                                  type={showSupabaseKeys.anonKey ? "text" : "password"}
                                  value={formData.supabaseAnonKey}
                                  onChange={(e) => setFormData({ ...formData, supabaseAnonKey: e.target.value })}
                                  autoComplete="off"
                                  className="w-full px-3 py-2.5 pr-10 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSupabaseKeys((prev) => ({ ...prev, anonKey: !prev.anonKey }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--on-primary-container)] focus:outline-none cursor-pointer"
                                >
                                  {showSupabaseKeys.anonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-[var(--on-primary-container)] mb-1.5 uppercase tracking-wide">Supabase Service Role Key</label>
                              <div className="relative">
                                <input
                                  type={showSupabaseKeys.serviceKey ? "text" : "password"}
                                  value={formData.supabaseServiceRoleKey}
                                  onChange={(e) => setFormData({ ...formData, supabaseServiceRoleKey: e.target.value })}
                                  autoComplete="off"
                                  className="w-full px-3 py-2.5 pr-10 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[var(--surface-container-low)] focus:bg-white transition-colors"
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSupabaseKeys((prev) => ({ ...prev, serviceKey: !prev.serviceKey }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--on-primary-container)] focus:outline-none cursor-pointer"
                                >
                                  {showSupabaseKeys.serviceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Domains (Create) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-[var(--surface-container)]" />
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Domains
                      </span>
                      <div className="h-px flex-1 bg-[var(--surface-container)]" />
                    </div>
                    <p
                      className="text-xs rounded-[4px] px-3 py-2 border leading-snug"
                      style={{
                        backgroundColor: 'var(--surface-container-low)',
                        borderColor: 'var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                    >
                      You can add domains now or later from the edit view.
                    </p>

                    {localDomainError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[4px] text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{localDomainError}</span>
                      </div>
                    )}

                    {localDomains.length > 0 && (
                      <div className="space-y-2">
                        {localDomains.map((ld, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-indigo-50/60 rounded-[4px] border border-indigo-100">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-sm font-semibold text-indigo-800 truncate">{ld.domain}</p>
                              <p className="text-xs text-[var(--on-surface-variant)]"><span className="font-medium text-[var(--on-primary-container)]">Admin Portal:</span> {ld.adminHostname || '—'}</p>
                              <p className="text-xs text-[var(--on-surface-variant)]"><span className="font-medium text-[var(--on-primary-container)]">Pharmacy Portal:</span> {ld.pharmacyHostname || '—'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLocalDomainRemove(idx)}
                              className="ml-3 p-1.5 rounded-[4px] hover:bg-red-100 text-red-500 hover:text-red-700 shrink-0 transition-colors cursor-pointer"
                              title="Remove domain"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-[var(--surface-container-low)] border border-dashed border-[var(--outline-variant)] rounded-[4px] p-4 space-y-3">
                      <p className="text-xs font-semibold text-[var(--on-primary-container)] uppercase tracking-wide">+ Add a domain</p>
                      <input
                        type="text"
                        placeholder="Admin hostname (e.g. admin.abc.com)"
                        value={localDomainForm.adminHostname}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLocalDomainForm((f) => ({ ...f, adminHostname: value, domain: value }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Pharmacy hostname (e.g. pharmacy.abc.com)"
                        value={localDomainForm.pharmacyHostname}
                        onChange={(e) => setLocalDomainForm((f) => ({ ...f, pharmacyHostname: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-[var(--outline-variant)] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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
              className="flex items-center justify-end gap-3 px-4 py-3 border-t shrink-0"
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
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm overflow-y-auto py-6 px-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--inverse-surface) 55%, transparent)' }}
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="rounded-[4px] shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col border min-h-0"
            style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="buying-group-view-modal-title"
          >

            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b"
              style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--surface-container-high)' }}
                >
                  <Eye className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="min-w-0">
                  <h3 id="buying-group-view-modal-title" className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                    Buying Group Details
                  </h3>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                    View group information and linked accounts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-[4px] hover:bg-primary-50/40 cursor-pointer shrink-0"
                style={{ color: 'var(--outline)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="ml-2 text-sm text-[var(--on-surface-variant)]">Loading...</span>
              </div>
            ) : selectedGroup ? (
              <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5 space-y-5">

                {/* Group Name + Status Banner */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-[4px] border border-indigo-100 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold mb-1">Buying Group</p>
                    <p className="text-lg font-bold text-[var(--on-surface)] leading-tight truncate">{selectedGroup.name}</p>
                    <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">Created {formatDate(selectedGroup.createdAt)}</p>
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
                        'bg-white rounded-[4px] border border-[var(--outline-variant)] px-3.5 py-3',
                        field.full ? 'sm:col-span-2' : ''
                      )}
                    >
                      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>{field.label}</p>
                      <p className="text-sm" style={{ color: 'var(--foreground)' }}>{field.value || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Supabase Credentials Section */}
                {(selectedGroup.supabaseEnabled ||
                  (selectedGroup.supabaseUrl && selectedGroup.supabaseUrl.trim()) ||
                  (selectedGroup.supabaseAnonKey && selectedGroup.supabaseAnonKey.trim()) ||
                  (selectedGroup.supabaseServiceRoleKey && selectedGroup.supabaseServiceRoleKey.trim())) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-[var(--surface-container)]" />
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider px-2 bg-indigo-50 rounded-full py-0.5">Supabase Credentials</span>
                      <div className="h-px flex-1 bg-[var(--surface-container)]" />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-white rounded-[4px] border border-[var(--outline-variant)] px-3.5 py-3">
                        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>Status</p>
                        <p className="text-sm" style={{ color: selectedGroup.supabaseEnabled ? 'green' : 'var(--foreground)' }}>
                          {selectedGroup.supabaseEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      {selectedGroup.supabaseUrl && selectedGroup.supabaseUrl.trim() && (
                        <div className="bg-white rounded-[4px] border border-[var(--outline-variant)] px-3.5 py-3">
                          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>Supabase URL</p>
                          <div className="flex items-center gap-2 min-w-0">
                            <p
                              className="text-sm font-mono truncate flex-1 min-w-0"
                              style={{ color: 'var(--foreground)' }}
                              title={selectedGroup.supabaseUrl}
                            >
                              {selectedGroup.supabaseUrl}
                            </p>
                            <button
                              type="button"
                              onClick={() => copySupabaseViewField(selectedGroup.supabaseUrl, 'url')}
                              className="shrink-0 p-1.5 rounded-[4px] border border-[var(--outline-variant)] hover:bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] transition-colors"
                              title={supabaseViewCopiedKey === 'url' ? 'Copied' : 'Copy URL'}
                              aria-label="Copy Supabase URL"
                            >
                              {supabaseViewCopiedKey === 'url' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" aria-hidden />
                              ) : (
                                <Copy className="w-4 h-4" aria-hidden />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {(selectedGroup.supabaseAnonKey?.trim() || selectedGroup.supabaseServiceRoleKey?.trim()) && (
                        <div className="bg-white rounded-[4px] border border-[var(--outline-variant)] px-3.5 py-3">
                          <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--on-surface-variant)' }}>
                            API keys
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1 sm:min-w-0">
                              <span className="text-[10px] font-bold uppercase shrink-0 w-14 text-[var(--on-surface-variant)]">Anon</span>
                              <code
                                className="text-xs font-mono truncate flex-1 min-w-0 block"
                                style={{ color: 'var(--foreground)' }}
                                title={selectedGroup.supabaseAnonKey || undefined}
                              >
                                {selectedGroup.supabaseAnonKey?.trim() || '—'}
                              </code>
                              <button
                                type="button"
                                disabled={!selectedGroup.supabaseAnonKey?.trim()}
                                onClick={() => copySupabaseViewField(selectedGroup.supabaseAnonKey, 'anon')}
                                className="shrink-0 p-1.5 rounded-[4px] border border-[var(--outline-variant)] hover:bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title={supabaseViewCopiedKey === 'anon' ? 'Copied' : 'Copy anon key'}
                                aria-label="Copy Supabase anon key"
                              >
                                {supabaseViewCopiedKey === 'anon' ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden />
                                ) : (
                                  <Copy className="w-4 h-4" aria-hidden />
                                )}
                              </button>
                            </div>
                            <div className="hidden sm:block shrink-0 w-px h-8 bg-[var(--outline-variant)]" aria-hidden />
                            <div className="flex items-center gap-2 min-w-0 flex-1 sm:min-w-0">
                              <span className="text-[10px] font-bold uppercase shrink-0 w-14 text-[var(--on-surface-variant)]">Service</span>
                              <code
                                className="text-xs font-mono truncate flex-1 min-w-0 block"
                                style={{ color: 'var(--foreground)' }}
                                title={selectedGroup.supabaseServiceRoleKey || undefined}
                              >
                                {selectedGroup.supabaseServiceRoleKey?.trim() || '—'}
                              </code>
                              <button
                                type="button"
                                disabled={!selectedGroup.supabaseServiceRoleKey?.trim()}
                                onClick={() => copySupabaseViewField(selectedGroup.supabaseServiceRoleKey, 'service')}
                                className="shrink-0 p-1.5 rounded-[4px] border border-[var(--outline-variant)] hover:bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title={supabaseViewCopiedKey === 'service' ? 'Copied' : 'Copy service role key'}
                                aria-label="Copy Supabase service role key"
                              >
                                {supabaseViewCopiedKey === 'service' ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden />
                                ) : (
                                  <Copy className="w-4 h-4" aria-hidden />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] mt-2 leading-snug" style={{ color: 'var(--on-surface-variant)' }}>
                            Hover a value to see the full key. Copy always uses the full string.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Footer */}
            <div
              className="flex justify-end px-4 py-3 border-t shrink-0"
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