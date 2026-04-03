'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toast, ToastContainer } from '@/components/ui/Toast'
import { branchService, Branch } from '@/lib/api/services/branchService'
import { roleService, Role } from '@/lib/api/services/roleService'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  Plus,
  X,
  Loader2,
  Calendar,
} from 'lucide-react'

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isParent, isLoaded } = usePharmacyContextStore()

  const [branch, setBranch] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [assigningRoleId, setAssigningRoleId] = useState<string | null>(null)
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }
  const removeToast = (tid: string) => setToasts((prev) => prev.filter((t) => t.id !== tid))

  const fetchBranch = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await branchService.getBranchDetail(id)
      setBranch(data)
    } catch (err: any) {
      addToast(err.message || 'Failed to load branch', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const fetchRoles = useCallback(async () => {
    try {
      const roles = await roleService.listRoles()
      setAllRoles(roles)
    } catch {}
  }, [])

  useEffect(() => {
    if (isLoaded && isParent) {
      fetchBranch()
      fetchRoles()
    }
  }, [isLoaded, isParent, fetchBranch, fetchRoles])

  const handleAssignRole = async (roleId: string) => {
    setAssigningRoleId(roleId)
    setShowRoleDropdown(false)
    try {
      await roleService.assignRoleToBranch(roleId, id)
      addToast('Role assigned successfully')
      fetchBranch()
    } catch (err: any) {
      addToast(err.message || 'Failed to assign role', 'error')
    } finally {
      setAssigningRoleId(null)
    }
  }

  const handleRemoveRole = async (roleId: string) => {
    setRemovingRoleId(roleId)
    try {
      await roleService.removeRoleFromBranch(roleId, id)
      addToast('Role removed successfully')
      fetchBranch()
    } catch (err: any) {
      addToast(err.message || 'Failed to remove role', 'error')
    } finally {
      setRemovingRoleId(null)
    }
  }

  const handleStatusToggle = async () => {
    if (!branch) return
    const newStatus = branch.status === 'active' ? 'suspended' : 'active'
    try {
      await branchService.updateBranchStatus(id, newStatus)
      addToast(`Branch ${newStatus === 'active' ? 'activated' : 'suspended'}`)
      fetchBranch()
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error')
    }
  }

  if (isLoaded && !isParent) {
    return (
      <DashboardLayout>
        <AccessDenied message="Only parent pharmacies can manage branches." />
      </DashboardLayout>
    )
  }

  const assignedRoleIds = branch?.assignedRoles?.map((r) => r.roleId) || []
  const availableRoles = allRoles.filter((r) => !assignedRoleIds.includes(r.id))
  const addr = branch?.physicalAddress

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <button onClick={() => router.push('/branches')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Branches
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : branch ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  {branch.pharmacyName}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">{branch.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={branch.status === 'active' ? 'success' : 'warning'}>{branch.status}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStatusToggle}
                  className={branch.status === 'active' ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}
                >
                  {branch.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
              </div>
            </div>

            {/* Branch Info */}
            <div className="bg-card border rounded-lg p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Branch Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{branch.email}</p></div>
                </div>
                {branch.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{branch.phone}</p></div>
                  </div>
                )}
                {addr && (addr.street || addr.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{[addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p></div>
                  </div>
                )}
                {branch.deaNumber && (
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div><p className="text-xs text-muted-foreground">DEA Number</p><p className="font-medium">{branch.deaNumber}</p></div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{new Date(branch.createdAt).toLocaleDateString()}</p></div>
                </div>
              </div>
            </div>

            {/* Assigned Roles */}
            <div className="bg-card border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assigned Roles</h2>
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowRoleDropdown(!showRoleDropdown)} disabled={availableRoles.length === 0}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Assign Role
                  </Button>
                  {showRoleDropdown && availableRoles.length > 0 && (
                    <div className="absolute right-0 mt-1 w-56 bg-card border rounded-md shadow-lg z-10">
                      {availableRoles.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleAssignRole(r.id)}
                          disabled={assigningRoleId === r.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                        >
                          {r.roleName}
                          {assigningRoleId === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {branch.assignedRoles?.length > 0 ? (
                <div className="space-y-2">
                  {branch.assignedRoles.map((r) => (
                    <div key={r.roleId} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-teal-600" />
                        <span className="text-sm font-medium">{r.roleName}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveRole(r.roleId)}
                        disabled={removingRoleId === r.roleId}
                        className="text-muted-foreground hover:text-red-600 transition-colors p-1"
                      >
                        {removingRoleId === r.roleId ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No roles assigned. This branch has no permissions.</p>
              )}
            </div>

            {/* Effective Permissions */}
            {branch.permissions && branch.permissions.length > 0 && (
              <div className="bg-card border rounded-lg p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Effective Permissions ({branch.permissions.length})</h2>
                <div className="flex flex-wrap gap-2">
                  {branch.permissions.map((p) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">Branch not found</div>
        )}
      </div>
    </DashboardLayout>
  )
}
