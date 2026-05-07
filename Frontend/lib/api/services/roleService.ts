import { apiClient } from '../client'

export interface PermissionItem {
  id: string
  permissionKey: string
  module: string
  action: string
  displayName: string
  description: string
  sortOrder: number
}

export interface Role {
  id: string
  roleName: string
  description: string | null
  isDefault: boolean
  permissions: string[]
  assignedCount: number
  createdAt: string
  updatedAt: string
}

export interface RoleDetail extends Role {
  assignedBranches: { branchId: string; pharmacyName: string; email: string; status: string }[]
}

export interface RoleFormData {
  roleName: string
  description?: string
  permissionKeys: string[]
}

export const roleService = {
  async listAllPermissions(): Promise<PermissionItem[]> {
    const response = await apiClient.get<{ permissions: PermissionItem[] }>('/pharmacy-roles/permissions')
    if (response.status === 'success' && response.data) return response.data.permissions
    throw new Error(response.message || 'Failed to fetch permissions')
  },

  async listRoles(): Promise<Role[]> {
    const response = await apiClient.get<{ roles: Role[] }>('/pharmacy-roles')
    if (response.status === 'success' && response.data) return response.data.roles
    throw new Error(response.message || 'Failed to fetch roles')
  },

  async getRoleDetail(id: string): Promise<RoleDetail> {
    const response = await apiClient.get<RoleDetail>(`/pharmacy-roles/${id}`)
    if (response.status === 'success' && response.data) return response.data
    throw new Error(response.message || 'Failed to fetch role details')
  },

  async createRole(data: RoleFormData) {
    const response = await apiClient.post<any>('/pharmacy-roles', data)
    if (response.status === 'success') return response.data
    throw new Error(response.message || 'Failed to create role')
  },

  async updateRole(id: string, data: Partial<RoleFormData>) {
    const response = await apiClient.put<any>(`/pharmacy-roles/${id}`, data)
    if (response.status === 'success') return response.data
    throw new Error(response.message || 'Failed to update role')
  },

  async deleteRole(id: string) {
    const response = await apiClient.delete<any>(`/pharmacy-roles/${id}`)
    if (response.status === 'success') return true
    throw new Error(response.message || 'Failed to delete role')
  },

  async assignRoleToBranch(roleId: string, branchId: string) {
    const response = await apiClient.post<any>(`/pharmacy-roles/${roleId}/assign/${branchId}`)
    if (response.status === 'success') return true
    throw new Error(response.message || 'Failed to assign role')
  },

  async removeRoleFromBranch(roleId: string, branchId: string) {
    const response = await apiClient.delete<any>(`/pharmacy-roles/${roleId}/assign/${branchId}`)
    if (response.status === 'success') return true
    throw new Error(response.message || 'Failed to remove role')
  },
}
