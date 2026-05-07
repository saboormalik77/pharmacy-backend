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

  const thinScroll =
    '[scrollbar-width:thin] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/70 [&::-webkit-scrollbar-track]:bg-transparent'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto ${thinScroll}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-[0.5px] border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 bg-card p-4">
          <h2 className="text-base font-bold text-gray-900">{editRole ? 'Edit Role' : 'Create New Role'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg border-[0.5px] border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Role Name *</label>
              <Input className="h-8 text-xs" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g., Branch Manager" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-900 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role and its responsibilities..."
                rows={2}
                className="flex w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 resize-none"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="inline-block w-1 h-3.5 bg-emerald-600 rounded"></span>
              Permissions
            </h3>
            {loadingPerms ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading permissions...
              </div>
            ) : (
              <div className={`max-h-[min(42vh,22rem)] overflow-y-auto pr-1 ${thinScroll}`}>
                <PermissionGrid
                  allPermissions={allPermissions}
                  selectedKeys={selectedKeys}
                  onChange={setSelectedKeys}
                />
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t-[0.5px] border-gray-200 bg-gray-50 bg-card p-3">
          <Button 
            className="h-8 text-xs"
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-4"
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" /> {editRole ? 'Updating...' : 'Creating...'}</>
            ) : (
              editRole ? 'Update Role' : 'Create Role'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
