"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Package, Search, AlertTriangle, CheckCircle, X, Save, Plus, ShoppingCart, Minus, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { calculateCommission, DEFAULT_COMMISSION_RATE } from '@/lib/utils/commission';
import { inventoryService, returnsService, creditsService } from '@/lib/api/services';
import type { InventoryItem } from '@/types';
import Link from 'next/link';

interface ReturnItem {
  id: string;
  inventoryItemId: string;
  productName: string;
  ndc: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  boxes?: number;
  tabletsPerBox?: number;
  partialTablets?: number;
  estimatedCredit: number;
  wac?: number;
  creditPercentage?: number;
}

export default function CreateReturnPage() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const result = await inventoryService.getInventoryItems({ status: 'active' });
      // Transform API response to match frontend format
      const transformed = result.items.map((item: any) => ({
        id: item.id,
        ndc: item.ndc,
        productName: item.product_name || item.productName || 'Unknown Product',
        lotNumber: item.lot_number,
        expirationDate: item.expiration_date,
        quantity: item.quantity,
        location: item.location || 'Main Warehouse',
        addedDate: item.created_at || item.addedDate || new Date().toISOString(),
        daysUntilExpiration: item.days_until_expiration || item.daysUntilExpiration || 0,
        status: item.status || 'active',
        boxes: item.boxes,
        tabletsPerBox: item.tablets_per_box || item.tabletsPerBox,
        product: {
          ndc: item.ndc,
          proprietaryName: item.product_name || item.productName,
          nonProprietaryName: item.product_name || item.productName,
          wac: item.wac || 0,
          packageUnit: 'units',
        },
      }));
      setInventoryItems(transformed);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const addFromInventory = () => {
    if (!selectedInventoryId) {
      setError('Please select an inventory item');
      return;
    }
    const inventoryItem = inventoryItems.find(item => item.id === selectedInventoryId);
    if (!inventoryItem) {
      setError('Selected inventory item not found');
      return;
    }
    if (returnItems.some(item => item.inventoryItemId === selectedInventoryId)) {
      setError('This item is already in the return');
      return;
    }
    const returnItem: ReturnItem = {
      id: Date.now().toString(),
      inventoryItemId: selectedInventoryId,
      productName: inventoryItem.productName || inventoryItem.product?.proprietaryName || inventoryItem.product?.nonProprietaryName || 'Unknown Product',
      ndc: inventoryItem.product?.ndc || inventoryItem.ndc,
      lotNumber: inventoryItem.lotNumber,
      expirationDate: inventoryItem.expirationDate,
      quantity: 0,
      boxes: 0,
      tabletsPerBox: inventoryItem.tabletsPerBox || 1,
      partialTablets: 0,
      estimatedCredit: 0,
      wac: inventoryItem.product?.wac || 0,
      creditPercentage: 70, // Default credit percentage
    };
    setReturnItems([...returnItems, returnItem]);
    setSelectedInventoryId('');
    setError(null);
  };

  const removeItem = (id: string) => {
    setReturnItems(returnItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ReturnItem>) => {
    setReturnItems(returnItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        if (updated.boxes !== undefined || updated.partialTablets !== undefined) {
          const boxes = updated.boxes || 0;
          const tabletsPerBox = updated.tabletsPerBox || 1;
          const partialTablets = updated.partialTablets || 0;
          updated.quantity = (boxes * tabletsPerBox) + partialTablets;
        }
        const inventoryItem = inventoryItems.find(inv => inv.id === updated.inventoryItemId);
        if (inventoryItem && updated.quantity > inventoryItem.quantity) {
          setError(`Available quantity: ${inventoryItem.quantity} ${inventoryItem.product?.packageUnit || 'units'}`);
          return item;
        }
        if (updated.quantity > 0 && updated.wac && updated.creditPercentage) {
          updated.estimatedCredit = updated.wac * updated.quantity * (updated.creditPercentage / 100);
        } else {
          updated.estimatedCredit = 0;
        }
        setError(null);
        return updated;
      }
      return item;
    }));
  };

  const totalEstimatedCredit = returnItems.reduce((sum, item) => sum + item.estimatedCredit, 0);

  const handleSave = async () => {
    const incompleteItems = returnItems.filter(item => item.quantity <= 0);
    if (incompleteItems.length > 0) {
      setError('Please set quantity for all items');
      return;
    }

    if (returnItems.length === 0) {
      setError('Please add at least one item to the return');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create return request
      const returnRequest = {
        items: returnItems.map(item => ({
          ndc: item.ndc,
          product_name: item.productName,
          lot_number: item.lotNumber,
          expiration_date: item.expirationDate,
          quantity: item.quantity,
          unit: 'units',
        })),
        notes: notes || undefined,
      };

      await returnsService.createReturn(returnRequest);
      router.push('/returns');
    } catch (err: any) {
      setError(err.message || 'Failed to create return');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventoryItems.filter(item =>
    !searchQuery ||
    (item.productName || item.product?.proprietaryName || item.product?.nonProprietaryName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.product?.ndc || item.ndc).includes(searchQuery) ||
    item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-2">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Create New Return</h1>
            <p className="text-xs text-muted-foreground">Select items from your inventory to create a return package</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory">
              <Button variant="outline" size="sm">
                <Package className="mr-1 h-3 w-3" />
                Inventory
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && inventoryItems.length === 0 && (
          <div className="p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
            <p className="text-sm text-muted-foreground mt-2">Loading inventory...</p>
          </div>
        )}

        {/* Compact Alert */}
        {!loading && inventoryItems.length === 0 && (
          <div className="p-2 bg-blue-50 rounded border border-blue-200 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">No Inventory Available</p>
                <p className="text-blue-800 mt-1">Add products to your inventory first before creating returns.</p>
                <Link href="/inventory">
                  <Button size="sm" className="mt-2 h-6 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Inventory
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Compact Error */}
        {error && (
          <div className="p-2 bg-red-50 rounded border border-red-200 text-xs flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Select from Inventory - Compact */}
        {inventoryItems.length > 0 && (
          <Card>
            <CardContent className="p-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search inventory..." className="pl-7 h-7 text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <select value={selectedInventoryId} onChange={(e) => setSelectedInventoryId(e.target.value)} className="h-7 px-2 text-xs border rounded flex-1">
                  <option value="">Select item...</option>
                  {filteredInventory.filter(item => !returnItems.some(ri => ri.inventoryItemId === item.id)).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.productName || item.product?.proprietaryName || item.product?.nonProprietaryName || 'Unknown'} - Lot: {item.lotNumber} - Available: {item.quantity}
                    </option>
                  ))}
                </select>
                <Button size="sm" className="h-7 text-xs" onClick={addFromInventory} disabled={!selectedInventoryId}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Return Items - Compact Table */}
        {returnItems.length > 0 && (
          <>
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Return Items ({returnItems.length})</h3>
                  <div className="text-xs text-muted-foreground">
                    Total Est. Credit: <span className="font-bold text-green-600">{formatCurrency(totalEstimatedCredit)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-2 font-medium">Product</th>
                        <th className="text-left p-2 font-medium">NDC</th>
                        <th className="text-left p-2 font-medium">Lot</th>
                        <th className="text-left p-2 font-medium">Expiration</th>
                        <th className="text-left p-2 font-medium">Available</th>
                        <th className="text-left p-2 font-medium">Boxes</th>
                        <th className="text-left p-2 font-medium">Partial</th>
                        <th className="text-left p-2 font-medium">Total Qty</th>
                        <th className="text-left p-2 font-medium">Est. Credit</th>
                        <th className="text-left p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item) => {
                        const inventoryItem = inventoryItems.find(inv => inv.id === item.inventoryItemId);
                        const maxAvailable = inventoryItem?.quantity || 0;
                        const maxBoxes = Math.floor(maxAvailable / (item.tabletsPerBox || 1));
                        const boxesQuantity = (item.boxes || 0) * (item.tabletsPerBox || 1);
                        const remainingAvailable = maxAvailable - boxesQuantity;
                        return (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-muted-foreground">{inventoryItem?.product?.strength}</div>
                            </td>
                            <td className="p-2 font-mono">{item.ndc}</td>
                            <td className="p-2">{item.lotNumber}</td>
                            <td className="p-2">{formatDate(item.expirationDate)}</td>
                            <td className="p-2">{maxAvailable} {inventoryItem?.product?.packageUnit || 'units'}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" className="h-5 w-5 p-0" onClick={() => updateItem(item.id, { boxes: Math.max(0, (item.boxes || 0) - 1) })} disabled={(item.boxes || 0) <= 0}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input type="number" value={item.boxes || 0} onChange={(e) => {
                                  const boxes = parseInt(e.target.value) || 0;
                                  if (boxes <= maxBoxes) {
                                    updateItem(item.id, { boxes });
                                  } else {
                                    setError(`Maximum ${maxBoxes} boxes`);
                                  }
                                }} min="0" max={maxBoxes} className="w-12 h-5 text-center text-xs" />
                                <Button variant="outline" size="sm" className="h-5 w-5 p-0" onClick={() => updateItem(item.id, { boxes: Math.min(maxBoxes, (item.boxes || 0) + 1) })} disabled={(item.boxes || 0) >= maxBoxes}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">{item.tabletsPerBox} per box</div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" className="h-5 w-5 p-0" onClick={() => updateItem(item.id, { partialTablets: Math.max(0, (item.partialTablets || 0) - 1) })} disabled={(item.partialTablets || 0) <= 0}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input type="number" value={item.partialTablets || 0} onChange={(e) => {
                                  const partialTablets = parseInt(e.target.value) || 0;
                                  if (partialTablets <= remainingAvailable) {
                                    updateItem(item.id, { partialTablets });
                                  } else {
                                    setError(`Maximum ${remainingAvailable} tablets`);
                                  }
                                }} min="0" max={remainingAvailable} className="w-12 h-5 text-center text-xs" />
                                <Button variant="outline" size="sm" className="h-5 w-5 p-0" onClick={() => updateItem(item.id, { partialTablets: Math.min(remainingAvailable, (item.partialTablets || 0) + 1) })} disabled={(item.partialTablets || 0) >= remainingAvailable}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="p-2 font-medium">{item.quantity} {inventoryItem?.product?.packageUnit || 'units'}</td>
                            <td className="p-2 font-medium text-green-600">{formatCurrency(item.estimatedCredit)}</td>
                            <td className="p-2">
                              <Button variant="outline" size="sm" className="h-6 px-2" onClick={() => removeItem(item.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Compact Summary */}
            <Card>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total Items</p>
                    <p className="font-bold text-lg">{returnItems.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Quantity</p>
                    <p className="font-bold text-lg">{returnItems.reduce((sum, item) => sum + item.quantity, 0)} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Est. Credit</p>
                    <p className="font-bold text-lg text-green-600">{formatCurrency(totalEstimatedCredit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Amount</p>
                    <p className="font-bold text-lg text-green-600">{formatCurrency(calculateCommission(totalEstimatedCredit).netAmount)}</p>
                    <p className="text-xs text-muted-foreground">After {DEFAULT_COMMISSION_RATE}% commission</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compact Notes */}
            <Card>
              <CardContent className="p-2">
                <label className="text-xs font-medium mb-1 block">Notes (Optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." className="w-full min-h-[60px] p-2 border rounded text-xs resize-none" />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => router.back()} disabled={loading}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                Create Return
              </Button>
            </div>
          </>
        )}

        {/* Empty State */}
        {returnItems.length === 0 && inventoryItems.length > 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No items selected. Select items from inventory above.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
