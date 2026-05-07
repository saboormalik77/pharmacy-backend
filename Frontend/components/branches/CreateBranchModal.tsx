'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { branchService, BranchFormData } from '@/lib/api/services/branchService'
import { roleService, Role } from '@/lib/api/services/roleService'
import { US_STATES } from '@/lib/constants/usStates'

interface CreateBranchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateBranchModal({ isOpen, onClose, onSuccess }: CreateBranchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [form, setForm] = useState<BranchFormData>({
    pharmacyName: '',
    email: '',
    contactName: '',
    phone: '',
    fax: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    wholesaler: '',
    wholesalerAccount: '',
    secondaryWholesaler: '',
    deaNumber: '',
    deaExpiration: '',
    serviceType: 'full_service',
    daysBetweenVisits: '120',
  })

  const update = (field: keyof BranchFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (!isOpen) return
    setRolesLoading(true)
    roleService
      .listRoles()
      .then(setRoles)
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false))
  }, [isOpen])

  const toggleRole = (id: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.pharmacyName.trim() || !form.email.trim()) {
      setError('Pharmacy name and email are required.')
      return
    }
    setIsSubmitting(true)
    try {
      await branchService.createBranch({
        ...form,
        roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
      })
      onSuccess()
      onClose()
      setSelectedRoleIds([])
      setForm({ pharmacyName: '', email: '', contactName: '', phone: '', fax: '', street: '', city: '', state: '', zip: '', wholesaler: '', wholesalerAccount: '', secondaryWholesaler: '', deaNumber: '', deaExpiration: '', serviceType: 'full_service', daysBetweenVisits: '120' })
    } catch (err: any) {
      setError(err.message || 'Failed to create branch')
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
        className={`bg-card rounded-xl shadow-xl max-w-xl w-full max-h-[85vh] overflow-y-auto ${thinScroll}`}
      >
        <div className="flex items-center justify-between p-4 border-b-[0.5px] border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h2 className="text-base font-bold text-gray-900">Create Branch Pharmacy</h2>
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
              <label className="block text-xs font-semibold text-gray-900 mb-1">Pharmacy Name *</label>
              <Input className="h-8 text-xs" value={form.pharmacyName} onChange={(e) => update('pharmacyName', e.target.value)} placeholder="Branch pharmacy name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Email *</label>
              <Input className="h-8 text-xs" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="branch@pharmacy.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Contact Name</label>
              <Input className="h-8 text-xs" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} placeholder="Contact person" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Phone</label>
              <Input className="h-8 text-xs" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="555-0102" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Fax</label>
              <Input className="h-8 text-xs" value={form.fax} onChange={(e) => update('fax', e.target.value)} placeholder="555-0103" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Street</label>
              <Input className="h-8 text-xs" value={form.street} onChange={(e) => update('street', e.target.value)} placeholder="456 Branch St" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">City</label>
              <Input className="h-8 text-xs" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="New York" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">State</label>
              <select
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                className="w-full h-8 px-2 py-1 text-xs border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Select a state</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label} ({state.value})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">ZIP</label>
              <Input className="h-8 text-xs" value={form.zip} onChange={(e) => update('zip', e.target.value)} placeholder="10002" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Wholesaler</label>
              <Input className="h-8 text-xs" value={form.wholesaler} onChange={(e) => update('wholesaler', e.target.value)} placeholder="McKesson" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Wholesaler Account</label>
              <Input className="h-8 text-xs" value={form.wholesalerAccount} onChange={(e) => update('wholesalerAccount', e.target.value)} placeholder="MCK-54321" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Secondary Wholesaler</label>
              <Input className="h-8 text-xs" value={form.secondaryWholesaler} onChange={(e) => update('secondaryWholesaler', e.target.value)} placeholder="Cardinal" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">DEA Number</label>
              <Input className="h-8 text-xs" value={form.deaNumber} onChange={(e) => update('deaNumber', e.target.value)} placeholder="AB1234567" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">DEA Expiration</label>
              <Input className="h-8 text-xs" type="date" value={form.deaExpiration} onChange={(e) => update('deaExpiration', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Service Type</label>
              <select
                value={form.serviceType}
                onChange={(e) => update('serviceType', e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="full_service">Full Service</option>
                <option value="self_service">Self Service</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Days Between Visits</label>
              <Input className="h-8 text-xs" type="number" value={form.daysBetweenVisits} onChange={(e) => update('daysBetweenVisits', e.target.value)} placeholder="120" />
            </div>
          </div>

          <div className="rounded-lg border-[0.5px] border-emerald-200/90 bg-emerald-50/50 p-3">
            <label className="block text-sm font-semibold text-gray-900 mb-1">Assign Roles (Optional)</label>
            <p className="text-xs text-gray-600 mb-3">
              Selected roles will be assigned when the branch completes setup. You can modify roles later.
            </p>
            {rolesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading roles…
              </div>
            ) : roles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No roles yet. Create roles under Roles & Permissions first.</p>
            ) : (
              <div className={`space-y-1.5 max-h-32 overflow-y-auto ${thinScroll}`}>
                {roles.map((r) => (
                  <label key={r.id} className="flex items-start gap-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="font-medium">{r.roleName}</span>
                      {r.description && (
                        <span className="block text-[10px] text-muted-foreground">{r.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t-[0.5px] border-gray-200 bg-gray-50 p-3">
          <Button 
            className="h-8 text-xs"
            variant="outline" 
            onClick={() => { setSelectedRoleIds([]); onClose() }} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-4"
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Adding Branch...</> : 'Add Branch'}
          </Button>
        </div>
      </div>
    </div>
  )
}
