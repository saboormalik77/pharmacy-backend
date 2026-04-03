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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Create Branch Pharmacy</h2>
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
              <label className="block text-sm font-medium mb-1">Pharmacy Name *</label>
              <Input value={form.pharmacyName} onChange={(e) => update('pharmacyName', e.target.value)} placeholder="Branch pharmacy name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="branch@pharmacy.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <Input value={form.contactName} onChange={(e) => update('contactName', e.target.value)} placeholder="Contact person" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="555-0102" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fax</label>
              <Input value={form.fax} onChange={(e) => update('fax', e.target.value)} placeholder="555-0103" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Street</label>
              <Input value={form.street} onChange={(e) => update('street', e.target.value)} placeholder="456 Branch St" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <Input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="New York" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">State</label>
              <select
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                className="w-full h-7 px-2 py-1 text-xs border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              <label className="block text-sm font-medium mb-1">ZIP</label>
              <Input value={form.zip} onChange={(e) => update('zip', e.target.value)} placeholder="10002" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wholesaler</label>
              <Input value={form.wholesaler} onChange={(e) => update('wholesaler', e.target.value)} placeholder="McKesson" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wholesaler Account</label>
              <Input value={form.wholesalerAccount} onChange={(e) => update('wholesalerAccount', e.target.value)} placeholder="MCK-54321" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secondary Wholesaler</label>
              <Input value={form.secondaryWholesaler} onChange={(e) => update('secondaryWholesaler', e.target.value)} placeholder="Cardinal" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">DEA Number</label>
              <Input value={form.deaNumber} onChange={(e) => update('deaNumber', e.target.value)} placeholder="AB1234567" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">DEA Expiration</label>
              <Input type="date" value={form.deaExpiration} onChange={(e) => update('deaExpiration', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Service Type</label>
              <select
                value={form.serviceType}
                onChange={(e) => update('serviceType', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="full_service">Full Service</option>
                <option value="self_service">Self Service</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Days Between Visits</label>
              <Input type="number" value={form.daysBetweenVisits} onChange={(e) => update('daysBetweenVisits', e.target.value)} placeholder="120" />
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted/20">
            <label className="block text-sm font-semibold mb-1">Roles at signup (optional)</label>
            <p className="text-xs text-muted-foreground mb-3">
              Selected roles apply as soon as the branch completes email setup. You can change them later on the branch detail page.
            </p>
            {rolesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading roles…
              </div>
            ) : roles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No roles yet. Create roles under Roles & Permissions first.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-start gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>
                      <span className="font-medium">{r.roleName}</span>
                      {r.description && (
                        <span className="block text-xs text-muted-foreground">{r.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={() => { setSelectedRoleIds([]); onClose() }} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : 'Create Branch'}
          </Button>
        </div>
      </div>
    </div>
  )
}
