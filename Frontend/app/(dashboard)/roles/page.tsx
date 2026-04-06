'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { CreateRoleModal } from '@/components/roles/CreateRoleModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toast, ToastContainer } from '@/components/ui/Toast'
import { roleService, Role } from '@/lib/api/services/roleService'
import { usePharmacyContextStore } from '@/lib/store/pharmacyContextStore'
import {
  Plus,
  ShieldCheck,
  Edit2,
  Trash2,
  Loader2,
  Users,
  Key,
} from 'lucide-react'

export default function RolesPage() {
  const router = useRouter()
  const { isParent, isLoaded } = usePharmacyContextStore()

  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const fetchRoles = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await roleService.listRoles()
      setRoles(data)
    } catch (err: any) {
      addToast(err.message || 'Failed to load roles', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && isParent) {
      fetchRoles()
    }
  }, [isLoaded, isParent, fetchRoles])

  const handleDelete = async (role: Role) => {
    const msg = role.assignedCount > 0
      ? `This role is assigned to ${role.assignedCount} branch(es). Deleting it will remove those permissions. Continue?`
      : `Delete role "${role.roleName}"?`
    if (!window.confirm(msg)) return

    setDeletingId(role.id)
    try {
      await roleService.deleteRole(role.id)
      addToast('Role deleted successfully')
      fetchRoles()
    } catch (err: any) {
      addToast(err.message || 'Failed to delete role', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (role: Role) => {
    setEditRole(role)
    setShowCreateModal(true)
  }

  if (isLoaded && !isParent) {
    return (
      <DashboardLayout>
        <AccessDenied message="Only parent pharmacies can manage roles and permissions." />
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
            <h1 className="text-xl font-bold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">Define roles and assign them to branch pharmacies</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setEditRole(null); setShowCreateModal(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Create Role
          </Button>
        </div>

        {/* Roles Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-20 bg-card border rounded-lg">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="text-sm font-medium mb-1">No roles yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first role to assign permissions to branches.</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => { setEditRole(null); setShowCreateModal(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Create Role
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="bg-card border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/roles/${role.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-teal-600" />
                    <h3 className="font-semibold">{role.roleName}</h3>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEdit(role)} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      disabled={deletingId === role.id}
                      className="p-1.5 hover:bg-red-50 rounded-md text-muted-foreground hover:text-red-600"
                    >
                      {deletingId === role.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{role.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Key className="h-3.5 w-3.5" /> {role.permissions?.length || 0} permissions</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {role.assignedCount || 0} branches</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateRoleModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setEditRole(null) }}
          onSuccess={() => {
            addToast(editRole ? 'Role updated successfully' : 'Role created successfully')
            fetchRoles()
          }}
          editRole={editRole}
        />
      </div>
    </DashboardLayout>
  )
}
