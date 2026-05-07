"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Package, Truck, X, CheckCircle, AlertTriangle, Plus, Minus, Info, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import { getInventory, type InventoryItem } from '@/data/mockInventory';
import type { ExpiredMedicationPackage, PackageItem } from '@/types';

function CreatePackagePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [packageNotes, setPackageNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getInventory();
    const expired = loaded.filter(item => item.status === 'expired');
    setInventory(expired);
    const itemIds = searchParams.get('items');
    if (itemIds) {
      const ids = itemIds.split(',');
      const initialSelection = new Map<string, number>();
      expired.forEach(item => {
        if (ids.includes(item.id)) {
          initialSelection.set(item.id, item.availableQuantity);
        }
      });
      setSelectedItems(initialSelection);
    }
  }, [searchParams]);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    const maxQuantity = item.availableQuantity;
    const newQuantity = Math.max(0, Math.min(quantity, maxQuantity));
    const newSelection = new Map(selectedItems);
    if (newQuantity > 0) {
      newSelection.set(itemId, newQuantity);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleItem = (item: InventoryItem) => {
    const newSelection = new Map(selectedItems);
    if (newSelection.has(item.id)) {
      newSelection.delete(item.id);
    } else {
      newSelection.set(item.id, item.availableQuantity);
    }
    setSelectedItems(newSelection);
  };

  const createPackage = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one item');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const packageItems: PackageItem[] = [];
      let totalEstimatedValue = 0;
      selectedItems.forEach((quantity, itemId) => {
        const item = inventory.find(i => i.id === itemId);
        if (!item) return;
        const wac = item.product.wac || 0;
        const estimatedCredit = wac * quantity * 0.5;
        totalEstimatedValue += estimatedCredit;
        packageItems.push({
          id: `pkg-item-${itemId}`,
          inventoryItemId: itemId,
          ndc: item.product.ndc,
          drugName: item.product.proprietaryName || item.product.nonProprietaryName,
          manufacturer: item.product.labelerName,
          lotNumber: item.lotNumber,
          expirationDate: item.expirationDate,
          quantity,
          unit: item.product.packageUnit,
          reason: 'expired',
          estimatedCredit,
          classification: 'destruction',
        });
      });
      const newPackage: ExpiredMedicationPackage = {
        id: `PKG-${Date.now()}`,
        packageNumber: `PKG-${Date.now()}`,
        clientId: 'client-1',
        clientName: 'HealthCare Pharmacy',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        items: packageItems,
        totalItems: packageItems.reduce((sum, item) => sum + item.quantity, 0),
        totalEstimatedValue,
        notes: packageNotes,
        createdBy: 'current-user',
      };
      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem('pharmacy_packages');
        const packages = existing ? JSON.parse(existing) : [];
        packages.push(newPackage);
        localStorage.setItem('pharmacy_packages', JSON.stringify(packages));
      }
      setSuccess('Package created! Redirecting...');
      setTimeout(() => router.push(`/warehouse/packages/${newPackage.id}`), 1500);
    } catch (err) {
      setError('Failed to create package');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedItems = Array.from(selectedItems.values()).reduce((sum, qty) => sum + qty, 0);

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100">
              <Package className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create Expired Medication Package</h1>
              <p className="text-xs text-gray-600 mt-0.5">Package expired medications for warehouse disposal</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="bg-white" onClick={() => router.back()}>
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
        </div>

        {/* Compact Alerts */}
        {(success || error) && (
          <div className={`p-2 rounded text-sm flex items-center gap-2 ${success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{success || error}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0" onClick={() => { setSuccess(null); setError(null); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Professional Info */}
        <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50 text-xs">
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-100">
              <Info className="h-4 w-4 text-cyan-600" />
            </div>
            <div>
              <p className="font-bold text-cyan-900 mb-1">FDA Compliance Notice</p>
              <p className="text-cyan-800">Expired medications must be properly packaged and sent to authorized warehouse facilities for destruction per FDA regulations (21 CFR Part 1317).</p>
            </div>
          </div>
        </div>

        {/* Professional Package Summary */}
        {selectedItems.size > 0 && (
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium mb-1">Selected Items</p>
                  <p className="font-bold text-green-900">{selectedItems.size} item type(s) • {totalSelectedItems} total units</p>
                </div>
                <Button size="sm" onClick={createPackage} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white border-0">
                  <Truck className="mr-1 h-3 w-3" />
                  Create Package
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

            {/* Professional Table */}
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-100">
                      <Package className="h-4 w-4 text-teal-600" />
                    </div>
                    <h3 className="font-bold text-base text-gray-900">Expired Items ({inventory.length})</h3>
                  </div>
                  {selectedItems.size > 0 && (
                    <Button size="sm" onClick={createPackage} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                      <Truck className="mr-1 h-3 w-3" />
                      Create Package ({selectedItems.size})
                    </Button>
                  )}
                </div>
                {inventory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No expired items found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                          <th className="text-left p-2 font-bold text-teal-900 w-6">
                        <input type="checkbox" onChange={(e) => {
                          if (e.target.checked) {
                            const newMap = new Map<string, number>();
                            inventory.forEach(item => newMap.set(item.id, item.availableQuantity));
                            setSelectedItems(newMap);
                          } else {
                            setSelectedItems(new Map());
                          }
                        }} />
                      </th>
                          <th className="text-left p-2 font-bold text-teal-900">Product</th>
                          <th className="text-left p-2 font-bold text-teal-900">NDC</th>
                          <th className="text-left p-2 font-bold text-teal-900">Lot</th>
                          <th className="text-left p-2 font-bold text-teal-900">Qty</th>
                          <th className="text-left p-2 font-bold text-teal-900">Expired</th>
                          <th className="text-left p-2 font-bold text-teal-900">Days</th>
                          <th className="text-left p-2 font-bold text-teal-900">Location</th>
                          <th className="text-left p-2 font-bold text-teal-900">Select Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item, idx) => {
                      const isSelected = selectedItems.has(item.id);
                      const selectedQuantity = selectedItems.get(item.id) || 0;
                      return (
                            <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isSelected ? 'bg-teal-50 border-teal-200' : ''} hover:bg-teal-50 transition-colors`}>
                          <td className="p-2">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleItem(item)} />
                          </td>
                          <td className="p-2">
                            <div className="font-semibold text-gray-900">{item.product.proprietaryName || item.product.nonProprietaryName}</div>
                            <div className="text-gray-600 text-xs">{item.product.manufacturerName}</div>
                          </td>
                          <td className="p-2 font-mono text-gray-700">{item.product.ndc}</td>
                          <td className="p-2 text-gray-700">{item.lotNumber}</td>
                              <td className="p-2">
                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                                  {item.quantity} {item.product.packageUnit}
                                </span>
                              </td>
                              <td className="p-2 text-gray-700">{formatDate(item.expirationDate)}</td>
                              <td className="p-2 font-bold text-red-600">{Math.abs(item.daysUntilExpiration)} days</td>
                          <td className="p-2 text-gray-600">{item.location || '-'}</td>
                          <td className="p-2">
                            {isSelected ? (
                              <div className="flex items-center gap-1">
                                    <Button variant="outline" size="sm" className="h-5 w-5 p-0 border-teal-300 hover:bg-teal-50" onClick={() => handleQuantityChange(item.id, selectedQuantity - 1)} disabled={selectedQuantity <= 1}>
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input type="number" value={selectedQuantity} onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)} min="1" max={item.availableQuantity} className="w-12 h-5 text-center text-xs border-teal-200" />
                                    <Button variant="outline" size="sm" className="h-5 w-5 p-0 border-teal-300 hover:bg-teal-50" onClick={() => handleQuantityChange(item.id, selectedQuantity + 1)} disabled={selectedQuantity >= item.availableQuantity}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="text-xs text-gray-500 ml-1">/ {item.availableQuantity}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

            {/* Professional Notes */}
            <Card className="border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50/30">
              <CardContent className="p-3">
                <label className="text-xs font-bold text-amber-900 mb-2 block">Package Notes (Optional)</label>
                <textarea value={packageNotes} onChange={(e) => setPackageNotes(e.target.value)} placeholder="Add notes or special instructions..." className="w-full min-h-[60px] p-2 border-2 border-amber-200 rounded text-xs resize-none focus:border-amber-400" />
          </CardContent>
        </Card>

            {/* Professional Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-100" onClick={() => router.back()}>Cancel</Button>
              <Button size="sm" onClick={createPackage} disabled={selectedItems.size === 0 || loading} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
            {loading ? 'Creating...' : (
              <>
                <Truck className="mr-1 h-3 w-3" />
                Create Package & Send
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function CreatePackagePage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <CreatePackagePageContent />
    </Suspense>
  );
}
