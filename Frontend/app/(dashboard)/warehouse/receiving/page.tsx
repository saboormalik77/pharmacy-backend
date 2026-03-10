"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Package, CheckCircle, XCircle, AlertTriangle, Search, FileText, ArrowRight, Eye, Warehouse, Truck, Calendar, User, DollarSign, ClipboardCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { ReturnItem } from '@/types';
import Link from 'next/link';

interface PackageData {
  id: string;
  packageNumber: string;
  items: ReturnItem[];
  condition: 'good' | 'damaged' | 'opened';
  receivedDate: string;
  inspectedBy: string;
}

interface ReceivingRecord {
  id: string;
  returnId: string;
  shipmentId: string;
  receivedDate: string;
  receivedBy: string;
  status: 'pending' | 'received' | 'inspected' | 'classified' | 'completed';
  packages: PackageData[];
  totalItems: number;
  refundableItems: number;
  nonRefundableItems: number;
  notes?: string;
}

export default function WarehouseReceivingPage() {
  const [receivingRecords, setReceivingRecords] = useState<ReceivingRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ReceivingRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const mockReceivingRecords: ReceivingRecord[] = [
    {
      id: 'REC-001',
      returnId: 'RET-2024-001',
      shipmentId: 'SHIP-001',
      receivedDate: new Date().toISOString(),
      receivedBy: 'John Doe',
      status: 'received',
      packages: [
        {
          id: 'PKG-001',
          packageNumber: 'PKG-001',
          items: [
            {
              id: 'item-1',
              ndc: '00071-0156-23',
              drugName: 'Lipitor',
              manufacturer: 'Pfizer',
              lotNumber: 'LOT123',
              expirationDate: '2024-12-31',
              quantity: 50,
              unit: 'TABLET',
              reason: 'Expiring soon',
              estimatedCredit: 275.00,
              classification: 'returnable',
            },
            {
              id: 'item-2',
              ndc: '00093-7214-01',
              drugName: 'Metformin',
              manufacturer: 'Teva',
              lotNumber: 'LOT456',
              expirationDate: '2024-11-15',
              quantity: 100,
              unit: 'TABLET',
              reason: 'Expired',
              estimatedCredit: 0,
              classification: 'destruction',
            },
          ],
          condition: 'good',
          receivedDate: new Date().toISOString(),
          inspectedBy: 'John Doe',
        },
      ],
      totalItems: 2,
      refundableItems: 1,
      nonRefundableItems: 1,
    },
  ];

  const handleReceivePackage = (recordId: string) => {
    setReceivingRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? { ...record, status: 'received' as const }
          : record
      )
    );
  };

  const handleInspectPackage = (recordId: string, packageId: string) => {
    setReceivingRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? {
              ...record,
              packages: record.packages.map(pkg =>
                pkg.id === packageId
                  ? { ...pkg, condition: 'good' as const }
                  : pkg
              ),
              status: 'inspected' as const,
            }
          : record
      )
    );
  };

  const handleClassifyItems = (recordId: string) => {
    setReceivingRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? { ...record, status: 'classified' as const }
          : record
      )
    );
  };

  const handleCompleteReceiving = (recordId: string) => {
    setReceivingRecords(prev =>
      prev.map(record =>
        record.id === recordId
          ? { ...record, status: 'completed' as const }
          : record
      )
    );
  };

  const getStatusVariant = (status: ReceivingRecord['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'classified': return 'info';
      case 'inspected': return 'warning';
      case 'received': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: ReceivingRecord['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'classified': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'inspected': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'received': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const filteredRecords = (receivingRecords.length > 0 ? receivingRecords : mockReceivingRecords).filter(record => {
    const matchesSearch = !searchQuery || 
      record.returnId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.shipmentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterStatus || record.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: mockReceivingRecords.length,
    pending: mockReceivingRecords.filter(r => r.status === 'pending').length,
    received: mockReceivingRecords.filter(r => r.status === 'received').length,
    inspected: mockReceivingRecords.filter(r => r.status === 'inspected').length,
    classified: mockReceivingRecords.filter(r => r.status === 'classified').length,
    completed: mockReceivingRecords.filter(r => r.status === 'completed').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100">
              <Warehouse className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Warehouse Receiving</h1>
              <p className="text-xs text-gray-600 mt-0.5">Receive, inspect, and classify returned packages</p>
            </div>
          </div>
        </div>

        {/* Professional Filters */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-teal-500" />
                <Input placeholder="Search by Return ID or Shipment ID..." className="pl-7 h-7 text-xs border-teal-200 focus:border-teal-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs border-gray-300 hover:bg-gray-100" onClick={() => { setFilterStatus(null); setSearchQuery(''); }}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colorful Status Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
          {[
            { label: 'All', value: 'all', count: statusCounts.all, color: 'bg-gray-100 text-gray-700 border-gray-300' },
            { label: 'Pending', value: 'pending', count: statusCounts.pending, color: 'bg-gray-100 text-gray-700 border-gray-300' },
            { label: 'Received', value: 'received', count: statusCounts.received, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
            { label: 'Inspected', value: 'inspected', count: statusCounts.inspected, color: 'bg-amber-100 text-amber-700 border-amber-300' },
            { label: 'Classified', value: 'classified', count: statusCounts.classified, color: 'bg-teal-100 text-teal-700 border-teal-300' },
            { label: 'Completed', value: 'completed', count: statusCounts.completed, color: 'bg-green-100 text-green-700 border-green-300' },
          ].map((tab) => {
            const isActive = (tab.value === 'all' && filterStatus === null) || filterStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value === 'all' ? null : tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-all ${
                  isActive
                    ? `${tab.color} shadow-md scale-105`
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label} <span className={`font-bold ${isActive ? '' : 'text-gray-400'}`}>({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Compact Table View */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                    <th className="text-left p-2 font-bold text-teal-900">Record ID</th>
                    <th className="text-left p-2 font-bold text-teal-900">Status</th>
                    <th className="text-left p-2 font-bold text-teal-900">Return ID</th>
                    <th className="text-left p-2 font-bold text-teal-900">Shipment ID</th>
                    <th className="text-left p-2 font-bold text-teal-900">Received</th>
                    <th className="text-left p-2 font-bold text-teal-900">By</th>
                    <th className="text-left p-2 font-bold text-teal-900">Packages</th>
                    <th className="text-left p-2 font-bold text-teal-900">Items</th>
                    <th className="text-left p-2 font-bold text-teal-900">Refundable</th>
                    <th className="text-left p-2 font-bold text-teal-900">Non-Refund</th>
                    <th className="text-left p-2 font-bold text-teal-900">Est. Credit</th>
                    <th className="text-left p-2 font-bold text-teal-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan={12} className="p-4 text-center text-gray-500 text-sm bg-gray-50">No receiving records found</td></tr>
                  ) : (
                    filteredRecords.map((record, idx) => {
                      const totalCredit = record.packages
                        .flatMap(p => p.items)
                        .filter(item => item.classification === 'returnable')
                        .reduce((sum, item) => sum + item.estimatedCredit, 0);
                      
                      return (
                        <tr key={record.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50 transition-colors`}>
                          <td className="p-2 font-semibold text-teal-700">{record.id}</td>
                          <td className="p-2">
                            <Badge variant={getStatusVariant(record.status)} className={`text-xs border-2 ${getStatusColor(record.status)}`}>
                              {record.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-gray-700">{record.returnId}</td>
                          <td className="p-2 font-mono text-gray-700">{record.shipmentId}</td>
                          <td className="p-2 text-gray-600">{formatDate(record.receivedDate)}</td>
                          <td className="p-2 text-gray-700">{record.receivedBy}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                              {record.packages.length}
                            </span>
                          </td>
                          <td className="p-2 font-medium">{record.totalItems}</td>
                          <td className="p-2 font-bold text-green-700">{record.refundableItems}</td>
                          <td className="p-2 font-bold text-red-700">{record.nonRefundableItems}</td>
                          <td className="p-2 font-bold text-green-700">{formatCurrency(totalCredit)}</td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              {record.status === 'pending' && (
                                <Button size="sm" className="h-6 px-2 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => handleReceivePackage(record.id)}>
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                              {record.status === 'inspected' && (
                                <Button size="sm" className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleClassifyItems(record.id)}>
                                  <FileText className="h-3 w-3" />
                                </Button>
                              )}
                              {record.status === 'classified' && (
                                <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleCompleteReceiving(record.id)}>
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                              <Link href={`/warehouse/orders/${record.id}`}>
                                <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-purple-300 text-purple-700 hover:bg-purple-50">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed View for Selected Record */}
        {selectedRecord && (
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900">Receiving Record: {selectedRecord.id}</h3>
                    <p className="text-xs text-gray-600">Return: {selectedRecord.returnId} • Shipment: {selectedRecord.shipmentId}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="p-2 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3 text-purple-600" />
                    <p className="text-xs text-purple-700 font-medium">Received</p>
                  </div>
                  <p className="text-sm font-bold text-purple-900">{formatDate(selectedRecord.receivedDate)}</p>
                </div>
                <div className="p-2 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="flex items-center gap-1 mb-1">
                    <User className="h-3 w-3 text-blue-600" />
                    <p className="text-xs text-blue-700 font-medium">Received By</p>
                  </div>
                  <p className="text-sm font-bold text-blue-900">{selectedRecord.receivedBy}</p>
                </div>
                <div className="p-2 rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Package className="h-3 w-3 text-indigo-600" />
                    <p className="text-xs text-indigo-700 font-medium">Total Items</p>
                  </div>
                  <p className="text-lg font-bold text-indigo-900">{selectedRecord.totalItems}</p>
                </div>
                <div className="p-2 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                  <div className="flex items-center gap-1 mb-1">
                    <DollarSign className="h-3 w-3 text-green-600" />
                    <p className="text-xs text-green-700 font-medium">Est. Credit</p>
                  </div>
                  <p className="text-lg font-bold text-green-900">
                    {formatCurrency(selectedRecord.packages.flatMap(p => p.items).filter(item => item.classification === 'returnable').reduce((sum, item) => sum + item.estimatedCredit, 0))}
                  </p>
                </div>
              </div>

              {/* Packages Table */}
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2 text-gray-900">Packages ({selectedRecord.packages.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-100 to-indigo-100 border-b-2 border-purple-200">
                        <th className="text-left p-2 font-bold text-purple-900">Package #</th>
                        <th className="text-left p-2 font-bold text-purple-900">Condition</th>
                        <th className="text-left p-2 font-bold text-purple-900">Items</th>
                        <th className="text-left p-2 font-bold text-purple-900">Received</th>
                        <th className="text-left p-2 font-bold text-purple-900">Inspected By</th>
                        <th className="text-left p-2 font-bold text-purple-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecord.packages.map((pkg, idx) => (
                        <tr key={pkg.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-purple-50`}>
                          <td className="p-2 font-medium">{pkg.packageNumber}</td>
                          <td className="p-2">
                            <Badge variant={pkg.condition === 'good' ? 'success' : 'warning'} className="text-xs border-2">
                              {pkg.condition}
                            </Badge>
                          </td>
                          <td className="p-2">{pkg.items.length}</td>
                          <td className="p-2 text-gray-600">{formatDate(pkg.receivedDate)}</td>
                          <td className="p-2 text-gray-700">{pkg.inspectedBy}</td>
                          <td className="p-2">
                            {selectedRecord.status === 'received' && (
                              <Button size="sm" className="h-6 px-2 text-xs bg-orange-600 hover:bg-orange-700" onClick={() => handleInspectPackage(selectedRecord.id, pkg.id)}>
                                Inspect
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Items Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                <div>
                  <p className="text-xs text-green-700 font-medium mb-1">Refundable Items</p>
                  <p className="text-xl font-bold text-green-900">{selectedRecord.refundableItems}</p>
                </div>
                <div>
                  <p className="text-xs text-red-700 font-medium mb-1">Non-Refundable Items</p>
                  <p className="text-xl font-bold text-red-900">{selectedRecord.nonRefundableItems}</p>
                </div>
                <div>
                  <p className="text-xs text-green-700 font-medium mb-1">Total Est. Credit</p>
                  <p className="text-xl font-bold text-green-900">
                    {formatCurrency(selectedRecord.packages.flatMap(p => p.items).filter(item => item.classification === 'returnable').reduce((sum, item) => sum + item.estimatedCredit, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
