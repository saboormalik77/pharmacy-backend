import { apiClient } from '../client'

export interface BranchFormData {
  pharmacyName: string
  email: string
  contactName?: string
  phone?: string
  fax?: string
  street?: string
  city?: string
  state?: string
  zip?: string
  wholesaler?: string
  wholesalerAccount?: string
  secondaryWholesaler?: string
  deaNumber?: string
  deaExpiration?: string
  serviceType?: string
  daysBetweenVisits?: string
  /** Role IDs to assign when the branch completes setup (parent’s roles only) */
  roleIds?: string[]
}

export interface Branch {
  id: string
  email: string
  name: string
  pharmacyName: string
  phone: string | null
  physicalAddress: { street?: string; city?: string; state?: string; zip?: string } | null
  status: string
  deaNumber: string | null
  createdAt: string
  updatedAt: string
  assignedRoles: { roleId: string; roleName: string }[]
  permissions?: string[]
}

export interface BranchListResponse {
  branches: Branch[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PendingInvite {
  id: string
  email: string
  pharmacyName: string
  contactName: string | null
  createdAt: string
  expiresAt: string
}

export const branchService = {
  async createBranch(data: BranchFormData) {
    const response = await apiClient.post<any>('/pharmacy-branches', data)
    if (response.status === 'success') return response.data
    throw new Error(response.message || 'Failed to create branch')
  },

  async listBranches(params?: { search?: string; status?: string; page?: number; limit?: number }): Promise<BranchListResponse> {
    const response = await apiClient.get<BranchListResponse>('/pharmacy-branches', params)
    if (response.status === 'success' && response.data) return response.data
    throw new Error(response.message || 'Failed to fetch branches')
  },

  async getBranchDetail(id: string): Promise<Branch> {
    const response = await apiClient.get<Branch>(`/pharmacy-branches/${id}`)
    if (response.status === 'success' && response.data) return response.data
    throw new Error(response.message || 'Failed to fetch branch details')
  },

  async updateBranchStatus(id: string, status: 'active' | 'suspended') {
    const response = await apiClient.put<any>(`/pharmacy-branches/${id}/status`, { status })
    if (response.status === 'success') return response.data
    throw new Error(response.message || 'Failed to update branch status')
  },

  async getPendingInvites(): Promise<PendingInvite[]> {
    const response = await apiClient.get<{ invites: PendingInvite[] }>('/pharmacy-branches/invites')
    if (response.status === 'success' && response.data) return response.data.invites
    throw new Error(response.message || 'Failed to fetch pending invites')
  },

  async resendInvite(inviteId: string) {
    const response = await apiClient.post<any>(`/pharmacy-branches/invites/${inviteId}/resend`)
    if (response.status === 'success') return true
    throw new Error(response.message || 'Failed to resend invite')
  },
}
