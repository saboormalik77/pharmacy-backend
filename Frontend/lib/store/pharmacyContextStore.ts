import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import { setToken, setRefreshToken, setUserData, getToken, getRefreshToken, getUserData } from '@/lib/utils/cookies'

interface BranchSummary {
  id: string
  pharmacyName: string
  email: string
  status: string
}

interface ParentPharmacy {
  id: string
  pharmacyName: string
  email: string
}

interface RoleSummary {
  roleId: string
  roleName: string
}

const ADMIN_BACKUP_KEY = 'pharmacy_admin_auth_backup'

interface PharmacyContextState {
  pharmacyId: string
  pharmacyName: string
  email: string
  isParent: boolean
  isBranch: boolean
  canManageBranches: boolean
  branches: BranchSummary[]
  parentPharmacy: ParentPharmacy | null
  permissions: string[]
  roles: RoleSummary[]

  isLoaded: boolean
  isLoading: boolean
  isSigningOut: boolean
  error: string | null

  fetchContext: () => Promise<void>
  switchToBranch: (branchId: string) => Promise<boolean>
  switchBackToAdmin: () => void
  hasAdminBackup: () => boolean
  reset: () => void
  startSignOut: () => void
}

const initialState = {
  pharmacyId: '',
  pharmacyName: '',
  email: '',
  isParent: false,
  isBranch: false,
  canManageBranches: false,
  branches: [] as BranchSummary[],
  parentPharmacy: null as ParentPharmacy | null,
  permissions: [] as string[],
  roles: [] as RoleSummary[],
  isLoaded: false,
  isLoading: false,
  isSigningOut: false,
  error: null as string | null,
}

export const usePharmacyContextStore = create<PharmacyContextState>((set, get) => ({
  ...initialState,

  fetchContext: async () => {
    if (get().isLoading) return
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.get<any>('/pharmacy-branches/context')
      if (response.status === 'success' && response.data) {
        const d = response.data
        set({
          pharmacyId: d.pharmacyId || '',
          pharmacyName: d.pharmacyName || '',
          email: d.email || '',
          isParent: d.isParent ?? false,
          isBranch: d.isBranch ?? false,
          canManageBranches: d.canManageBranches ?? false,
          branches: d.branches || [],
          parentPharmacy: d.parentPharmacy || null,
          permissions: d.permissions || [],
          roles: d.roles || [],
          isLoaded: true,
          isLoading: false,
        })
      } else {
        set({ isLoading: false, isLoaded: true, error: response.message || 'Failed to load context' })
      }
    } catch (err: any) {
      set({ isLoading: false, isLoaded: true, error: err.message || 'Failed to load pharmacy context' })
    }
  },

  /**
   * Switch into a branch pharmacy.
   * 1. Save current admin cookies to localStorage
   * 2. Call /switch/:branchId which returns the same shape as /auth/signin
   * 3. Write the branch auth data into cookies (identical to a normal login)
   * 4. Hard-navigate to /portal so the entire app reloads as the branch
   */
  switchToBranch: async (branchId: string) => {
    try {
      // 1. Backup current admin auth cookies
      const backup = {
        token: getToken(),
        refreshToken: getRefreshToken(),
        userData: getUserData(),
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_BACKUP_KEY, JSON.stringify(backup))
      }

      // 2. Call the switch API — returns { user, token, refreshToken, expiresIn, expiresAt }
      const response = await apiClient.post<any>(`/pharmacy-branches/switch/${branchId}`)
      if (response.status === 'success' && response.data) {
        const { user, token, refreshToken } = response.data

        // 3. Replace auth cookies with branch data (same as authService.signin does)
        if (typeof window !== 'undefined') {
          setToken(token)
          if (refreshToken) {
            setRefreshToken(refreshToken)
          }
          setUserData({
            user: {
              id: user.id,
              email: user.email,
              name: user.name || user.pharmacy_name,
              pharmacy_name: user.pharmacy_name,
              phone: user.phone,
            },
            pharmacyId: user.id,
          })

          // 4. Hard-navigate — the whole app reloads fresh as the branch pharmacy
          window.location.href = '/portal'
        }
        return true
      }
      return false
    } catch {
      // Remove backup if switch failed
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_BACKUP_KEY)
      }
      return false
    }
  },

  /**
   * Switch back to the admin pharmacy.
   * Restores the admin auth cookies from localStorage and hard-navigates.
   */
  switchBackToAdmin: () => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(ADMIN_BACKUP_KEY)
    if (!raw) return

    try {
      const backup = JSON.parse(raw)
      if (backup.token) setToken(backup.token)
      if (backup.refreshToken) setRefreshToken(backup.refreshToken)
      if (backup.userData) setUserData(backup.userData)
      localStorage.removeItem(ADMIN_BACKUP_KEY)

      // Hard-navigate — the whole app reloads fresh as the admin pharmacy
      window.location.href = '/portal'
    } catch {
      localStorage.removeItem(ADMIN_BACKUP_KEY)
    }
  },

  hasAdminBackup: () => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ADMIN_BACKUP_KEY) !== null
  },

  reset: () => {
    set(initialState)
  },

  startSignOut: () => {
    // Clear admin backup on logout so we don't leak stale tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_BACKUP_KEY)
    }
    set({ isSigningOut: true, permissions: [] })
  },
}))

export type { BranchSummary, ParentPharmacy, RoleSummary }
