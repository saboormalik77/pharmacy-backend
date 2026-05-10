'use client'

import { useMemo } from 'react'
import type { PermissionItem } from '@/lib/api/services/roleService'

interface PermissionGridProps {
  allPermissions: PermissionItem[]
  selectedKeys: string[]
  onChange: (keys: string[]) => void
  disabled?: boolean
}

export function PermissionGrid({ allPermissions, selectedKeys, onChange, disabled }: PermissionGridProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, PermissionItem[]>()
    allPermissions.forEach((p) => {
      const list = map.get(p.module) || []
      list.push(p)
      map.set(p.module, list)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [allPermissions])

  const toggleKey = (key: string) => {
    if (disabled) return
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key))
    } else {
      onChange([...selectedKeys, key])
    }
  }

  const toggleModule = (modulePerms: PermissionItem[]) => {
    if (disabled) return
    const moduleKeys = modulePerms.map((p) => p.permissionKey)
    const allSelected = moduleKeys.every((k) => selectedKeys.includes(k))
    if (allSelected) {
      onChange(selectedKeys.filter((k) => !moduleKeys.includes(k)))
    } else {
      const newKeys = new Set([...selectedKeys, ...moduleKeys])
      onChange(Array.from(newKeys))
    }
  }

  const formatModuleName = (module: string) =>
    module.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="space-y-4">
      {grouped.map(([module, perms]) => {
        const moduleKeys = perms.map((p) => p.permissionKey)
        const allSelected = moduleKeys.every((k) => selectedKeys.includes(k))
        const someSelected = moduleKeys.some((k) => selectedKeys.includes(k)) && !allSelected

        return (
          <div key={module} className="rounded-[4px] border-[0.5px] border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected }}
                onChange={() => toggleModule(perms)}
                disabled={disabled}
                className="h-4 w-4 rounded border-gray-300 text-[#516057] focus:ring-[#516057]"
              />
              <span className="text-sm font-semibold text-gray-700">{formatModuleName(module)}</span>
              <span className="text-xs text-muted-foreground">
                ({moduleKeys.filter((k) => selectedKeys.includes(k)).length}/{perms.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
              {perms.map((p) => (
                <label key={p.permissionKey} className="flex items-start gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(p.permissionKey)}
                    onChange={() => toggleKey(p.permissionKey)}
                    disabled={disabled}
                    className="h-4 w-4 mt-0.5 rounded border-gray-300 text-[#516057] focus:ring-[#516057]"
                  />
                  <div>
                    <span className="font-medium">{p.displayName}</span>
                    {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
