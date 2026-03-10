"use client";

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Plus, Search, AlertTriangle, CheckCircle, Package, Edit, X, Save, Upload,
  FileText, Link as LinkIcon, Download, CheckCircle2, Loader2, FileSpreadsheet,
  Info, BarChart3, Filter, AlertCircle, Clock, DollarSign, Activity, Truck
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { NDCProduct } from '@/data/mockNDCProducts';
import Link from 'next/link';
import { inventoryService, productsService } from '@/lib/api/services';
import type { InventoryItem } from '@/types';

type UploadMethod = 'manual' | 'file' | 'link';
type ViewMode = 'overview' | 'add' | 'list' | 'expired';

interface ImportRow {
  ndc: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  boxes?: number;
  tabletsPerBox?: number;
  location?: string;
  product?: NDCProduct;
  errors?: string[];
}

interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  expiringSoon: number;
  expired: number;
  active: number;
  expiringValue: number;
  expiredValue: number;
  averageDaysToExpiration: number;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('manual');
  const [ndcInput, setNdcInput] = useState('');
  const [product, setProduct] = useState<NDCProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<Partial<InventoryItem>>({
    lotNumber: '', expirationDate: '', quantity: 0, location: '', boxes: undefined, tabletsPerBox: undefined,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>('all');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      const result = await inventoryService.getInventoryItems(filters);
      // Transform API response to match frontend format
      const transformed = result.items.map((item: any) => ({
        id: item.id,
        ndc: item.ndc,
        productName: item.product_name || item.productName || 'Unknown Product',
        product: {
          ndc: item.ndc,
          proprietaryName: item.product_name,
          nonProprietaryName: item.product_name,
          wac: item.wac || 0,
        },
        lotNumber: item.lot_number,
        expirationDate: item.expiration_date,
        quantity: item.quantity,
        location: item.location || 'Main Warehouse',
        addedDate: item.created_at || new Date().toISOString(),
        daysUntilExpiration: item.days_until_expiration || 0,
        status: item.status || 'active',
        boxes: item.boxes,
        tabletsPerBox: item.tablets_per_box,
      }));
      setInventory(transformed);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (): InventoryMetrics => {
    const totalItems = inventory.length;
    const expiringSoon = inventory.filter(i => i.status === 'expiring_soon').length;
    const expired = inventory.filter(i => i.status === 'expired').length;
    const active = inventory.filter(i => i.status === 'active').length;
    const totalValue = inventory.reduce((sum, item) => sum + ((item.product?.wac || 0) * item.quantity), 0);
    const expiringValue = inventory.filter(i => i.status === 'expiring_soon')
      .reduce((sum, item) => sum + ((item.product?.wac || 0) * item.quantity), 0);
    const expiredValue = inventory.filter(i => i.status === 'expired')
      .reduce((sum, item) => sum + ((item.product?.wac || 0) * item.quantity), 0);
    const averageDaysToExpiration = inventory.length > 0
      ? Math.round(inventory.reduce((sum, item) => sum + item.daysUntilExpiration, 0) / inventory.length)
      : 0;
    return { totalItems, totalValue, expiringSoon, expired, active, expiringValue, expiredValue, averageDaysToExpiration };
  };

  const metrics = calculateMetrics();

  const lookupNDC = async (ndc: string) => {
    if (!ndc.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await productsService.validateNDC(ndc);
      if (!result.valid || !result.product) {
        setError(result.error || 'NDC not found');
        setProduct(null);
        return;
      }
      // Transform product to match frontend format
      const transformedProduct: NDCProduct = {
        ndc: result.product.ndc,
        labelerCode: result.product.ndc.split('-')[0] || '',
        productCode: result.product.ndc.split('-')[1] || '',
        packageCode: result.product.ndc.split('-')[2] || '',
        proprietaryName: result.product.productName,
        nonProprietaryName: result.product.productName,
        manufacturerName: result.product.manufacturer || '',
        labelerName: result.product.manufacturer || '',
        dosageForm: result.product.dosageForm || '',
        strength: result.product.strength || '',
        routeOfAdministration: [],
        rxRequired: false,
        packageDescription: '',
        packageSize: result.product.packageSize || 1,
        packageUnit: 'unit',
        wac: result.product.wac || 0,
        awp: result.product.awp || 0,
        returnEligibility: {
          eligible: true,
          returnWindow: 90,
          creditPercentage: 100,
          destructionRequired: false,
          requiresDEAForm: false,
          requiresWitnessDestruction: false,
          hazardousWaste: false,
        },
      };
      setProduct(transformedProduct);
      setCurrentItem({ lotNumber: '', expirationDate: '', quantity: 0, location: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to lookup NDC. Please try again.');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNDCSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupNDC(ndcInput);
  };

  const addToInventory = async () => {
    if (!product || !currentItem.lotNumber || !currentItem.expirationDate || !currentItem.quantity) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      await inventoryService.createInventoryItem({
        ndc: product.ndc,
        product_name: product.proprietaryName || product.nonProprietaryName || '',
        lot_number: currentItem.lotNumber,
        expiration_date: currentItem.expirationDate,
        quantity: currentItem.quantity,
        location: currentItem.location || 'Main Warehouse',
        boxes: currentItem.boxes,
        tablets_per_box: currentItem.tabletsPerBox,
      });
      await loadInventory();
      setProduct(null);
      setNdcInput('');
      setCurrentItem({ lotNumber: '', expirationDate: '', quantity: 0, location: '', boxes: undefined, tabletsPerBox: undefined });
      setError(null);
      setSuccess('Item added successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Please upload a CSV or Excel file');
      return;
    }
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setError('File must contain at least a header row and one data row');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['ndc', 'lot number', 'expiration date', 'quantity'];
      const missingHeaders = requiredHeaders.filter(h => !headers.some(header => header.includes(h.toLowerCase())));
      if (missingHeaders.length > 0) {
        setError(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }
      const rows: ImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: ImportRow = {
          ndc: values[headers.indexOf('ndc')] || '',
          lotNumber: values[headers.findIndex(h => h.includes('lot'))] || '',
          expirationDate: values[headers.findIndex(h => h.includes('expiration') || h.includes('exp'))] || '',
          quantity: parseInt(values[headers.findIndex(h => h.includes('quantity') || h.includes('qty'))] || '0') || 0,
          boxes: values[headers.findIndex(h => h.includes('box'))] ? parseInt(values[headers.findIndex(h => h.includes('box'))] || '0') : undefined,
          tabletsPerBox: values[headers.findIndex(h => h.includes('tablet') || h.includes('per box'))] ? parseInt(values[headers.findIndex(h => h.includes('tablet') || h.includes('per box'))] || '0') : undefined,
          location: values[headers.findIndex(h => h.includes('location'))] || '',
          errors: [],
        };
        if (!row.ndc) row.errors?.push('NDC required');
        if (!row.lotNumber) row.errors?.push('Lot number required');
        if (!row.expirationDate) row.errors?.push('Expiration date required');
        if (row.quantity <= 0) row.errors?.push('Quantity must be > 0');
        rows.push(row);
      }
      setImportData(rows);
    } catch (err) {
      setError('Failed to parse file');
    }
  };

  const processImport = async () => {
    if (importData.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);
    let successCount = 0;
    for (let i = 0; i < importData.length; i++) {
      const row = importData[i];
      if (row.errors && row.errors.length > 0) {
        setImportProgress(((i + 1) / importData.length) * 100);
        continue;
      }
      try {
        const result = await productsService.validateNDC(row.ndc);
        if (result.valid && result.product) {
          const transformedProduct: NDCProduct = {
            ndc: result.product.ndc,
            labelerCode: result.product.ndc.split('-')[0] || '',
            productCode: result.product.ndc.split('-')[1] || '',
            packageCode: result.product.ndc.split('-')[2] || '',
            proprietaryName: result.product.productName,
            nonProprietaryName: result.product.productName,
            manufacturerName: result.product.manufacturer || '',
            labelerName: result.product.manufacturer || '',
            dosageForm: result.product.dosageForm || '',
            strength: result.product.strength || '',
            routeOfAdministration: [],
            rxRequired: false,
            packageDescription: '',
            packageSize: result.product.packageSize || 1,
            packageUnit: 'unit',
            wac: result.product.wac || 0,
            awp: result.product.awp || 0,
            returnEligibility: {
              eligible: true,
              returnWindow: 90,
              creditPercentage: 100,
              destructionRequired: false,
              requiresDEAForm: false,
              requiresWitnessDestruction: false,
              hazardousWaste: false,
            },
          };
          await inventoryService.createInventoryItem({
            ndc: transformedProduct.ndc,
            product_name: transformedProduct.proprietaryName || transformedProduct.nonProprietaryName || '',
            lot_number: row.lotNumber,
            expiration_date: row.expirationDate,
            quantity: row.quantity,
            location: row.location || 'Main Warehouse',
            boxes: row.boxes,
            tablets_per_box: row.tabletsPerBox,
          });
          successCount++;
        }
      } catch (err) {}
      setImportProgress(((i + 1) / importData.length) * 100);
    }
    setIsImporting(false);
    await loadInventory();
    setFile(null);
    setImportData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) {
      setSuccess(`Imported ${successCount} item(s)`);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchQuery || 
      item.product?.ndc?.includes(searchQuery) ||
      (item.product?.proprietaryName || item.product?.nonProprietaryName)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lotNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const expiredItems = inventory.filter(item => item.status === 'expired');

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-xs text-gray-600 mt-0.5">Stock entry, tracking, and expired medication management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-teal-300 text-teal-700 hover:bg-teal-50" onClick={() => {
              const template = `NDC,Lot Number,Expiration Date,Quantity,Boxes,Tablets Per Box,Location\n00573-0201-30,LOT12345,2025-12-31,1000,10,100,Main Warehouse`;
              const blob = new Blob([template], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'inventory-template.csv';
              a.click();
              window.URL.revokeObjectURL(url);
            }}>
              <Download className="mr-1 h-3 w-3" />
              Template
            </Button>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0" onClick={() => setViewMode('add')}>
              <Plus className="mr-1 h-3 w-3" />
              Add Stock
            </Button>
          </div>
        </div>

        {/* Compact Alerts */}
        {(success || error) && (
          <div className={`p-2 rounded text-sm flex items-center gap-2 ${success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{success || error}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0" onClick={() => { setSuccess(null); setError(null); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Professional Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <div className="p-3 rounded-lg border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100">
            <div className="flex items-center gap-1 mb-1">
              <Package className="h-3 w-3 text-teal-600" />
              <p className="text-xs text-teal-700 font-medium">Total Items</p>
            </div>
            <p className="text-xl font-bold text-teal-900">{metrics.totalItems}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Total Value</p>
            </div>
            <p className="text-lg font-bold text-cyan-900">{formatCurrency(metrics.totalValue)}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Active</p>
            </div>
            <p className="text-xl font-bold text-emerald-900">{metrics.active}</p>
          </div>
          <div className={`p-3 rounded-lg border-2 ${metrics.expiringSoon > 0 ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100' : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100'}`}>
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-amber-600" />
              <p className="text-xs text-amber-700 font-medium">Expiring Soon</p>
            </div>
            <p className="text-xl font-bold text-amber-900">{metrics.expiringSoon}</p>
          </div>
          <div className={`p-3 rounded-lg border-2 ${metrics.expired > 0 ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-100' : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100'}`}>
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <p className="text-xs text-red-700 font-medium">Expired</p>
            </div>
            <p className="text-xl font-bold text-red-900">{metrics.expired}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <div className="flex items-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-cyan-600" />
              <p className="text-xs text-cyan-700 font-medium">Avg Days</p>
            </div>
            <p className="text-xl font-bold text-cyan-900">{metrics.averageDaysToExpiration}</p>
          </div>
          <div className="p-3 rounded-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-red-600" />
              <p className="text-xs text-red-700 font-medium">Expired Value</p>
            </div>
            <p className="text-lg font-bold text-red-900">{formatCurrency(metrics.expiredValue)}</p>
          </div>
        </div>

        {/* Professional Navigation */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
          {[
            { id: 'list', label: 'All Items', count: inventory.length, color: 'bg-teal-100 text-teal-700 border-teal-300' },
            { id: 'expired', label: 'Expired', count: expiredItems.length, variant: 'error' as const, color: 'bg-red-100 text-red-700 border-red-300' },
            { id: 'overview', label: 'Overview', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
            { id: 'add', label: 'Add Stock', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                viewMode === tab.id 
                  ? `${tab.color} shadow-md scale-105` 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <Badge variant={(tab.variant as 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary') || 'default'} className="ml-1 text-xs">{tab.count}</Badge>}
            </button>
          ))}
        </div>

        {/* List View - Professional Table */}
        {viewMode === 'list' && (
          <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
            <CardContent className="p-3">
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-teal-500" />
                  <Input placeholder="Search..." className="pl-7 h-7 text-xs border-teal-200 focus:border-teal-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-1">
                  {[
                    { value: 'all', label: 'All', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                    { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                    { value: 'expiring_soon', label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-300' },
                    { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700 border-red-300' },
                  ].map((status) => (
                    <Button 
                      key={status.value} 
                      variant={filterStatus === status.value ? 'primary' : 'outline'} 
                      size="sm" 
                      className={`h-7 text-xs px-2 border-2 ${filterStatus === status.value ? status.color : 'border-gray-300'}`}
                      onClick={() => setFilterStatus(status.value as any)}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                    <tr>
                      <th className="text-left p-2 font-bold text-teal-900">Product</th>
                      <th className="text-left p-2 font-bold text-teal-900">NDC</th>
                      <th className="text-left p-2 font-bold text-teal-900">Lot</th>
                      <th className="text-left p-2 font-bold text-teal-900">Qty</th>
                      <th className="text-left p-2 font-bold text-teal-900">Expiration</th>
                      <th className="text-left p-2 font-bold text-teal-900">Days</th>
                      <th className="text-left p-2 font-bold text-teal-900">Location</th>
                      <th className="text-left p-2 font-bold text-teal-900">Status</th>
                      <th className="text-left p-2 font-bold text-teal-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.length === 0 ? (
                      <tr><td colSpan={9} className="p-4 text-center text-gray-500 text-sm bg-gray-50">No items found</td></tr>
                    ) : (
                      filteredInventory.map((item, idx) => (
                        <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50 transition-colors`}>
                          <td className="p-2">
                            <div className="font-medium text-xs">{item.product?.proprietaryName || item.product?.nonProprietaryName || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{item.product?.strength} {item.product?.dosageForm}</div>
                          </td>
                          <td className="p-2 font-mono text-xs">{item.product?.ndc || item.ndc}</td>
                          <td className="p-2 text-xs">{item.lotNumber}</td>
                          <td className="p-2 text-xs">{item.quantity} {item.product?.packageUnit || ''}</td>
                          <td className="p-2 text-xs">{formatDate(item.expirationDate)}</td>
                          <td className={`p-2 text-xs font-medium ${item.daysUntilExpiration <= 180 ? 'text-yellow-600' : item.daysUntilExpiration < 0 ? 'text-red-600' : ''}`}>
                            {item.daysUntilExpiration > 0 ? `${item.daysUntilExpiration}d` : `${Math.abs(item.daysUntilExpiration)}d expired`}
                          </td>
                          <td className="p-2 text-xs">{item.location || '-'}</td>
                          <td className="p-2">
                            <Badge variant={item.status === 'expired' ? 'error' : item.status === 'expiring_soon' ? 'warning' : 'success'} className="text-xs">
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                                setEditingItem(item.id);
                                const expDate = new Date(item.expirationDate);
                                setEditForm({ lotNumber: item.lotNumber, expirationDate: expDate.toISOString().split('T')[0], quantity: item.quantity, location: item.location });
                              }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Link href={`/returns/create?inventoryId=${item.id}`}>
                                <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                                  Return
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired Items - Professional Table */}
        {viewMode === 'expired' && (
          <Card className="border-2 border-red-200 bg-gradient-to-br from-white to-red-50/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900">Expired Medications ({expiredItems.length})</h3>
                    <p className="text-xs text-gray-600">Select items to create warehouse package</p>
                  </div>
                </div>
                {selectedItems.size > 0 && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => window.location.href = `/warehouse/packages/create?items=${Array.from(selectedItems).join(',')}`}>
                    <Truck className="mr-1 h-3 w-3" />
                    Create Package ({selectedItems.size})
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gradient-to-r from-red-100 to-orange-100 border-b-2 border-red-200">
                    <tr>
                      <th className="text-left p-2 font-bold text-red-900 w-8"><input type="checkbox" onChange={(e) => {
                        if (e.target.checked) setSelectedItems(new Set(expiredItems.map(i => i.id)));
                        else setSelectedItems(new Set());
                      }} /></th>
                      <th className="text-left p-2 font-bold text-red-900">Product</th>
                      <th className="text-left p-2 font-bold text-red-900">NDC</th>
                      <th className="text-left p-2 font-bold text-red-900">Lot</th>
                      <th className="text-left p-2 font-bold text-red-900">Qty</th>
                      <th className="text-left p-2 font-bold text-red-900">Expired</th>
                      <th className="text-left p-2 font-bold text-red-900">Days Expired</th>
                      <th className="text-left p-2 font-bold text-red-900">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiredItems.map((item, idx) => (
                      <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-red-50 transition-colors`}>
                        <td className="p-2"><input type="checkbox" checked={selectedItems.has(item.id)} onChange={(e) => {
                          const newSet = new Set(selectedItems);
                          if (e.target.checked) newSet.add(item.id);
                          else newSet.delete(item.id);
                          setSelectedItems(newSet);
                        }} /></td>
                        <td className="p-2">
                          <div className="font-medium text-xs">{item.product?.proprietaryName || item.product?.nonProprietaryName || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{item.product?.manufacturerName}</div>
                        </td>
                        <td className="p-2 font-mono text-xs">{item.product?.ndc || item.ndc}</td>
                        <td className="p-2 text-xs">{item.lotNumber}</td>
                        <td className="p-2 text-xs">{item.quantity} {item.product?.packageUnit || ''}</td>
                        <td className="p-2 text-xs">{formatDate(item.expirationDate)}</td>
                        <td className="p-2 text-xs font-medium text-red-600">{Math.abs(item.daysUntilExpiration)} days</td>
                        <td className="p-2 text-xs">{item.location || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Stock - Professional */}
        {viewMode === 'add' && (
          <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['manual', 'file', 'link'].map((method) => (
                  <button key={method} onClick={() => setUploadMethod(method as UploadMethod)}
                    className={`p-2 border rounded text-sm ${uploadMethod === method ? 'border-primary bg-primary/5' : ''}`}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
              {uploadMethod === 'manual' && (
                <div className="space-y-2">
                  <form onSubmit={handleNDCSubmit} className="flex gap-2">
                    <Input placeholder="Enter NDC..." className="h-8 text-sm" value={ndcInput} onChange={(e) => setNdcInput(e.target.value)} />
                    <Button type="submit" size="sm" className="h-8" disabled={loading}>
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    </Button>
                  </form>
                  {product && (
                    <div className="p-2 bg-blue-50 rounded border border-blue-200 space-y-2">
                      <div className="text-xs font-medium">{product.proprietaryName || product.nonProprietaryName}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Lot Number" className="h-7 text-xs" value={currentItem.lotNumber} onChange={(e) => setCurrentItem({...currentItem, lotNumber: e.target.value})} />
                        <Input type="date" className="h-7 text-xs" value={currentItem.expirationDate} onChange={(e) => setCurrentItem({...currentItem, expirationDate: e.target.value})} />
                        <Input type="number" placeholder="Quantity" className="h-7 text-xs" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 0})} />
                        <Input placeholder="Location" className="h-7 text-xs" value={currentItem.location} onChange={(e) => setCurrentItem({...currentItem, location: e.target.value})} />
                      </div>
                      <Button size="sm" className="h-7 w-full" onClick={addToInventory}>
                        <Plus className="mr-1 h-3 w-3" />
                        Add to Inventory
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {uploadMethod === 'file' && (
                <div className="space-y-2">
                  <div className="border-2 border-dashed rounded p-4 text-center">
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{file ? file.name : 'Click to upload CSV/Excel'}</p>
                    </label>
                  </div>
                  {importData.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs">Preview: {importData.length} rows</span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setImportData([]); setFile(null); }}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-6 text-xs" onClick={processImport} disabled={isImporting}>
                            {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Import'}
                          </Button>
                        </div>
                      </div>
                      {isImporting && <div className="h-1 bg-gray-200 rounded overflow-hidden"><div className="h-full bg-primary transition-all" style={{width: `${importProgress}%`}} /></div>}
                      <div className="max-h-48 overflow-y-auto border rounded">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0"><tr><th className="p-1 text-left">NDC</th><th className="p-1 text-left">Lot</th><th className="p-1 text-left">Exp</th><th className="p-1 text-left">Qty</th><th className="p-1 text-left">Status</th></tr></thead>
                          <tbody>
                            {importData.map((row, i) => (
                              <tr key={i} className={row.errors && row.errors.length > 0 ? 'bg-red-50' : ''}>
                                <td className="p-1 font-mono">{row.ndc}</td>
                                <td className="p-1">{row.lotNumber}</td>
                                <td className="p-1">{row.expirationDate}</td>
                                <td className="p-1">{row.quantity}</td>
                                <td className="p-1">{row.errors && row.errors.length > 0 ? <Badge variant="error" className="text-xs">{row.errors[0]}</Badge> : <Badge variant="success" className="text-xs">Valid</Badge>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Overview - Professional */}
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-teal-100">
                    <BarChart3 className="h-4 w-4 text-teal-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Status Breakdown</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Active:</span><span className="font-bold text-emerald-700">{metrics.active} ({inventory.length > 0 ? Math.round((metrics.active / inventory.length) * 100) : 0}%)</span></div>
                  <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Expiring Soon:</span><span className="font-bold text-amber-700">{metrics.expiringSoon} ({inventory.length > 0 ? Math.round((metrics.expiringSoon / inventory.length) * 100) : 0}%)</span></div>
                  <div className="flex justify-between p-2 rounded bg-white/50"><span className="text-teal-700 font-medium">Expired:</span><span className="font-bold text-red-700">{metrics.expired} ({inventory.length > 0 ? Math.round((metrics.expired / inventory.length) * 100) : 0}%)</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-white to-cyan-50/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-100">
                    <Info className="h-4 w-4 text-cyan-600" />
                  </div>
                  <h3 className="font-bold text-base text-gray-900">Insights</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-cyan-50 rounded border-2 border-cyan-200">
                    <p className="font-bold text-cyan-900">Avg Days to Expiration</p>
                    <p className="text-xl font-bold text-cyan-600">{metrics.averageDaysToExpiration} days</p>
                  </div>
                  {metrics.expired > 0 && (
                    <div className="p-2 bg-red-50 rounded border-2 border-red-200">
                      <p className="text-red-900 text-xs font-medium">{metrics.expired} expired item(s) require packaging for warehouse disposal</p>
                      <Button size="sm" className="mt-2 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => setViewMode('expired')}>Create Package</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
