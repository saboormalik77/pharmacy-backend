'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { CreateRoleModal } from '@/components/roles/CreateRoleModal'
import { PermissionGrid } from '@/components/roles/PermissionGrid'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toast, ToastContainer } from '@/components/ui/Toast'
import { roleService, RoleDetail, PermissionItem } from '@/lib/api/services/roleService'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'
import {
  ArrowLeft,
  ShieldCheck,
  Edit2,
  Loader2,
  Building2,
  X,
  Calendar,
} from 'lucide-react'

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isParent, isLoaded } = usePharmacyContextStore()

  const [role, setRole] = useState<RoleDetail | null>(null)
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [removingBranchId, setRemovingBranchId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const tid = Date.now().toString()
    setToasts((prev) => [...prev, { id: tid, message, type }])
  }
  const removeToast = (tid: string) => setToasts((prev) => prev.filter((t) => t.id !== tid))

  const fetchRole = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await roleService.getRoleDetail(id)
      setRole(data)
    } catch (err: any) {
      addToast(err.message || 'Failed to load role', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const fetchPermissions = useCallback(async () => {
    try {
      const perms = await roleService.listAllPermissions()
      setAllPermissions(perms)
    } catch {}
  }, [])

  useEffect(() => {
    if (isLoaded && isParent) {
      fetchRole()
      fetchPermissions()
    }
  }, [isLoaded, isParent, fetchRole, fetchPermissions])

  const handleRemoveBranch = async (branchId: string) => {
    setRemovingBranchId(branchId)
    try {
      await roleService.removeRoleFromBranch(id, branchId)
      addToast('Branch removed from role')
      fetchRole()
    } catch (err: any) {
      addToast(err.message || 'Failed to remove branch', 'error')
    } finally {
      setRemovingBranchId(null)
    }
  }

  if (isLoaded && !isParent) {
    return (
      <DashboardLayout>
        <AccessDenied message="Only parent pharmacies can manage roles." />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-4xl">
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <button onClick={() => router.push('/roles')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Roles
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : role ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#516057]" />
                  {role.roleName}
                </h1>
                {role.description && <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Role
              </Button>
            </div>

            {/* Role Info */}
            <div className="bg-card border rounded-[4px] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Role Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Permissions</p>
                  <p className="font-semibold text-lg">{role.permissions?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assigned Branches</p>
                  <p className="font-semibold text-lg">{role.assignedBranches?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Created</p>
                  <p className="font-medium">{new Date(role.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-card border rounded-[4px] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Permissions</h2>
              {allPermissions.length > 0 ? (
                <PermissionGrid
                  allPermissions={allPermissions}
                  selectedKeys={role.permissions || []}
                  onChange={() => {}}
                  disabled
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(role.permissions || []).map((p) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned Branches */}
            <div className="bg-card border rounded-[4px] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Assigned Branches</h2>
              {role.assignedBranches?.length > 0 ? (
                <div className="space-y-2">
                  {role.assignedBranches.map((b) => (
                    <div key={b.branchId} className="flex items-center justify-between bg-muted/30 rounded-[4px] px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium">{b.pharmacyName}</span>
                          <span className="text-xs text-muted-foreground ml-2">{b.email}</span>
                        </div>
                        <Badge variant={b.status === 'active' ? 'success' : 'warning'}>{b.status}</Badge>
                      </div>
                      <button
                        onClick={() => handleRemoveBranch(b.branchId)}
                        disabled={removingBranchId === b.branchId}
                        className="text-muted-foreground hover:text-red-600 transition-colors p-1"
                      >
                        {removingBranchId === b.branchId ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No branches assigned to this role yet.</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">Role not found</div>
        )}

        {role && (
          <CreateRoleModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              addToast('Role updated successfully')
              fetchRole()
            }}
            editRole={role}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
