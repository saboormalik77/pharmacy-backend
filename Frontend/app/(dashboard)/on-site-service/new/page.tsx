'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Truck,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  onSiteServiceService,
  CreateServiceRequestPayload,
} from '@/lib/api/services/onSiteServiceService';
import { branchService, Branch } from '@/lib/api/services/branchService';
import { usePharmacyPermissions } from '@/hooks/usePharmacyPermissions';
import { toast } from 'react-toastify';

export default function NewServiceRequestPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const { isParent, hasPermission, isLoaded, isSigningOut, grantAll } = usePharmacyPermissions();

  // Form state
  const today = new Date().toISOString().slice(0, 10);
  const [requestedDate, setRequestedDate] = useState(today);
  const [branchId, setBranchId] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Derived values
  const hasCreatePermission = mounted && (hasPermission('on_site_service:create') || grantAll);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load branches for parent pharmacies
  useEffect(() => {
    if (!mounted || !isParent) return;
    branchService
      .listBranches({ status: 'active', limit: 200 })
      .then((res) => setBranches(res.branches || []))
      .catch(() => { /* non-critical */ });
  }, [mounted, isParent]);

  // Show loading until mounted
  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show loading while permissions load
  if (isSigningOut || !isLoaded) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm text-muted-foreground">Loading permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Check permissions
  if (!hasCreatePermission) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to create on-site service requests.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Please contact your administrator to request access.
          </p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/on-site-service')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Service Requests
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!requestedDate) {
      setFormError('Please choose a preferred date');
      return;
    }
    if (requestedDate < today) {
      setFormError('Preferred date cannot be in the past');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload: CreateServiceRequestPayload = {
        requested_date: requestedDate,
        branch_id: branchId || null,
        special_instructions: specialInstructions || null,
      };
      
      await onSiteServiceService.create(payload);
      toast.success('Service request submitted successfully');
      router.push('/on-site-service');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/on-site-service')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-teal-600" />
              Request On-Site Service
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule a field representative visit for returns, training, or inventory review.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              {/* Preferred Date */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preferred Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  min={today}
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  required
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Choose your preferred date for the field representative visit.
                </p>
              </div>

              {/* Branch Selection (for parent pharmacies) */}
              {branches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Branch (optional)</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Main pharmacy</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.pharmacyName || b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a branch if the visit should be to a branch location.
                  </p>
                </div>
              )}

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium mb-2">Special Instructions</label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Access hours, parking notes, contact person, etc. (optional)"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    Provide any special instructions for the field representative.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {specialInstructions.length} / 2000 characters
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/on-site-service')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-teal-200 bg-teal-50/60">
          <CardContent className="p-4">
            <div className="text-sm text-teal-900">
              <strong>How this works:</strong> When you submit a request, it is automatically routed to every
              field representative assigned to your store. The first rep to claim and schedule it owns the
              visit. You'll receive an email once a rep confirms a date.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}