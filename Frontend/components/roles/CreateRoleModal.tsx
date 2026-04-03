'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PermissionGrid } from './PermissionGrid'
import { roleService, PermissionItem, Role } from '@/lib/api/services/roleService'

interface CreateRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editRole?: Role | null
}

export function CreateRoleModal({ isOpen, onClose, onSuccess, editRole }: CreateRoleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([])
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchPermissions()
      if (editRole) {
        setRoleName(editRole.roleName)
        setDescription(editRole.description || '')
        setSelectedKeys(editRole.permissions || [])
      } else {
        setRoleName('')
        setDescription('')
        setSelectedKeys([])
      }
    }
  }, [isOpen, editRole])

  const fetchPermissions = async () => {
    setLoadingPerms(true)
    try {
      const perms = await roleService.listAllPermissions()
      setAllPermissions(perms)
    } catch {
      setError('Failed to load permissions')
    } finally {
      setLoadingPerms(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!roleName.trim()) {
      setError('Role name is required.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editRole) {
        await roleService.updateRole(editRole.id, {
          roleName,
          description,
          permissionKeys: selectedKeys,
        })
      } else {
        await roleService.createRole({
          roleName,
          description,
          permissionKeys: selectedKeys,
        })
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save role')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">{editRole ? 'Edit Role' : 'Create Role'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Role Name *</label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Branch Manager" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this role..."
                rows={2}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 resize-none"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Permissions</h3>
            {loadingPerms ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions...
              </div>
            ) : (
              <PermissionGrid
                allPermissions={allPermissions}
                selectedKeys={selectedKeys}
                onChange={setSelectedKeys}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : editRole ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </div>
    </div>
  )
}
