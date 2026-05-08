'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { CreateBranchModal } from '@/components/branches/CreateBranchModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Toast, ToastContainer } from '@/components/ui/Toast'
import { branchService, Branch, PendingInvite } from '@/lib/api/services/branchService'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  MoreVertical,
  RefreshCw,
  Clock,
  Loader2,
  Mail,
} from 'lucide-react'

export default function BranchesPage() {
  const router = useRouter()
  const { isParent, isLoaded } = usePharmacyContextStore()

  const [branches, setBranches] = useState<Branch[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const fetchBranches = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await branchService.listBranches({ search, status: statusFilter, page, limit: 20 })
      setBranches(data.branches)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err: any) {
      addToast(err.message || 'Failed to load branches', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, page])

  const fetchInvites = useCallback(async () => {
    try {
      const invites = await branchService.getPendingInvites()
      setPendingInvites(invites)
    } catch {}
  }, [])

  useEffect(() => {
    if (isLoaded && isParent) {
      fetchBranches()
      fetchInvites()
    }
  }, [isLoaded, isParent, fetchBranches, fetchInvites])

  const handleStatusToggle = async (branch: Branch) => {
    const newStatus = branch.status === 'active' ? 'suspended' : 'active'
    try {
      await branchService.updateBranchStatus(branch.id, newStatus)
      addToast(`Branch ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`)
      fetchBranches()
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error')
    }
    setActionMenuId(null)
  }

  const handleResendInvite = async (inviteId: string) => {
    setResendingId(inviteId)
    try {
      await branchService.resendInvite(inviteId)
      addToast('Invite resent successfully')
      fetchInvites()
    } catch (err: any) {
      addToast(err.message || 'Failed to resend invite', 'error')
    } finally {
      setResendingId(null)
    }
  }

  if (isLoaded && !isParent) {
    return (
      <DashboardLayout>
        <AccessDenied message="Only parent pharmacies can manage branches." />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Branch Pharmacies</h1>
            <p className="text-sm text-muted-foreground">{total} branch{total !== 1 ? 'es' : ''} total</p>
          </div>
          <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Add Branch
          </button>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Pending Invites ({pendingInvites.length})</h3>
            </div>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{inv.pharmacyName}</span>
                    <span className="text-muted-foreground ml-2">{inv.email}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendInvite(inv.id)}
                    disabled={resendingId === inv.id}
                  >
                    {resendingId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                    Resend
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search branches..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gradient-to-r from-teal-600 to-teal-700 border-b-2 border-teal-800">
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Branch</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider hidden lg:table-cell">Roles</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-sm text-gray-600"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                ) : branches.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-sm text-gray-600">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No branches found
                  </td></tr>
                ) : (
                  branches.map((b, idx) => (
                    <tr key={b.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-teal-50/40'} hover:bg-teal-50 transition-colors border-b border-gray-100 cursor-pointer`} onClick={() => router.push(`/branches/${b.id}`)}>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 font-medium">{b.pharmacyName}</div>
                        <div className="text-xs text-gray-600 md:hidden">{b.email}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">{b.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={b.status === 'active' ? 'success' : 'warning'}>
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {b.assignedRoles?.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {b.assignedRoles.map((r) => (
                              <Badge key={r.roleId} variant="info">{r.roleName}</Badge>
                            ))}
                          </div>
                        ) : <span className="text-gray-600 text-xs">No roles</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-600">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`menu-btn-${b.id}`}
                            onClick={(e) => {
                              setActionMenuId(actionMenuId === b.id ? null : b.id)
                            }}
                            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dropdown Menu - Rendered outside table */}
        {actionMenuId && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
            <div 
              className="fixed w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50"
              style={{
                top: (() => {
                  const btn = document.getElementById(`menu-btn-${actionMenuId}`)
                  if (btn) {
                    const rect = btn.getBoundingClientRect()
                    return `${rect.bottom + 4}px`
                  }
                  return '0px'
                })(),
                right: (() => {
                  const btn = document.getElementById(`menu-btn-${actionMenuId}`)
                  if (btn) {
                    const rect = btn.getBoundingClientRect()
                    return `${window.innerWidth - rect.right}px`
                  }
                  return '0px'
                })()
              }}
            >
              {branches.map((b) => 
                b.id === actionMenuId ? (
                  <div key={b.id}>
                    <button
                      onClick={() => { router.push(`/branches/${b.id}`); setActionMenuId(null) }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors rounded-t-lg"
                    >View Details</button>
                    <button
                      onClick={() => handleStatusToggle(b)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors rounded-b-lg ${b.status === 'active' ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}`}
                    >{b.status === 'active' ? 'Suspend' : 'Activate'}</button>
                  </div>
                ) : null
              )}
            </div>
          </>
        )}

        <CreateBranchModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            addToast('Branch created. Invite email sent!')
            fetchBranches()
            fetchInvites()
          }}
        />
      </div>
    </DashboardLayout>
  )
}
