"use client";

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Package, Search, Filter, Download, Eye, Truck, Calendar, CheckCircle, Warehouse } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import Link from 'next/link';
import type { WarehouseOrder } from '@/types';

export default function WarehouseOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const mockOrders: WarehouseOrder[] = [
    {
      id: 'REC-001',
      orderNumber: 'WO-REC-001',
      packageId: 'PKG-001',
      returnId: 'RET-2024-001',
      clientId: 'client-1',
      clientName: 'HealthCare Pharmacy',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'processing',
      packages: [],
      totalItems: 150,
      refundableItems: 75,
      nonRefundableItems: 75,
      totalEstimatedCredit: 1250.00,
      timeline: [],
      qualityChecks: [],
      complianceChecks: [],
    },
    {
      id: 'REC-002',
      orderNumber: 'WO-REC-002',
      packageId: 'PKG-002',
      returnId: 'RET-2024-002',
      clientId: 'client-2',
      clientName: 'MedCare Solutions',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'inspecting',
      packages: [],
      totalItems: 200,
      refundableItems: 120,
      nonRefundableItems: 80,
      totalEstimatedCredit: 2100.00,
      timeline: [],
      qualityChecks: [],
      complianceChecks: [],
    },
  ];

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.packageId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusVariant = (status: WarehouseOrder['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing':
      case 'classifying': return 'info';
      case 'inspecting': return 'warning';
      case 'received': return 'secondary';
      case 'exception': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: WarehouseOrder['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'classifying': return 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]';
      case 'inspecting': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'received': return 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]';
      case 'exception': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-[#f5f2f1] text-[#505454] border-[#e2e2e2]';
    }
  };

  const getStatusLabel = (status: WarehouseOrder['status']) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const statusCounts = {
    all: mockOrders.length,
    pending: mockOrders.filter(o => o.status === 'pending').length,
    received: mockOrders.filter(o => o.status === 'received').length,
    inspecting: mockOrders.filter(o => o.status === 'inspecting').length,
    processing: mockOrders.filter(o => o.status === 'processing').length,
    completed: mockOrders.filter(o => o.status === 'completed').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-[4px] bg-[#f5f2f1] border-2 border-[#e2e2e2]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[4px] bg-[#f5f2f1]">
              <Warehouse className="h-5 w-5 text-[#516057]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#000000]">Warehouse Orders</h1>
              <p className="text-xs text-[#505454] mt-0.5">Track and manage all warehouse processing orders</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
        </div>

        {/* Colorful Filters */}
        <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6b7280]" />
                <Input placeholder="Search by order number, client, or package ID..." className="pl-7 h-7 text-xs border-[#e2e2e2] focus:border-[#e2e2e2]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs border-[#e2e2e2] hover:bg-[#f5f2f1]" onClick={() => { setFilterStatus(null); setSearchQuery(''); }}>
                <Filter className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colorful Status Tabs */}
        <div className="flex gap-2 border-b-2 border-[#e2e2e2] bg-white rounded-t-lg p-1">
          {[
            { label: 'All', value: 'all', count: statusCounts.all, color: 'bg-[#f5f2f1] text-[#505454] border-[#e2e2e2]' },
            { label: 'Pending', value: 'pending', count: statusCounts.pending, color: 'bg-[#f5f2f1] text-[#505454] border-[#e2e2e2]' },
            { label: 'Received', value: 'received', count: statusCounts.received, color: 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]' },
            { label: 'Inspecting', value: 'inspecting', count: statusCounts.inspecting, color: 'bg-amber-100 text-amber-700 border-amber-300' },
            { label: 'Processing', value: 'processing', count: statusCounts.processing, color: 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]' },
            { label: 'Completed', value: 'completed', count: statusCounts.completed, color: 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2]' },
          ].map((tab) => {
            const isActive = (tab.value === 'all' && filterStatus === null) || filterStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value === 'all' ? null : tab.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-[4px] border-2 transition-all ${
                  isActive
                    ? `${tab.color} shadow-md scale-105`
                    : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
                }`}
              >
                {tab.label} <span className={`font-bold ${isActive ? '' : 'text-[#9ca3af]'}`}>({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Colorful Table */}
        <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f5f2f1] border-b-2 border-[#e2e2e2]">
                    <th className="text-left p-2 font-bold text-[#000000]">Order #</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Status</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Client</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Return ID</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Package ID</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Items</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Packages</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Refundable</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Non-Refund</th>
                    <th className="text-left p-2 font-bold text-[#000000]">Est. Credit</th>
                    <th className="text-left p-2 font-bold text-indigo-900">Created</th>
                    <th className="text-left p-2 font-bold text-indigo-900">Received</th>
                    <th className="text-left p-2 font-bold text-indigo-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={13} className="p-4 text-center text-[#6b7280] text-sm bg-[#f5f2f1]">No orders found</td></tr>
                  ) : (
                    filteredOrders.map((order, idx) => (
                      <tr key={order.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]/50'} hover:bg-indigo-50 transition-colors`}>
                        <td className="p-2 font-semibold text-indigo-700">{order.orderNumber}</td>
                        <td className="p-2">
                          <Badge variant={getStatusVariant(order.status)} className={`text-xs border-2 ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </td>
                        <td className="p-2 text-[#505454]">{order.clientName}</td>
                        <td className="p-2 font-mono text-[#505454]">{order.returnId}</td>
                        <td className="p-2 font-mono text-[#505454]">{order.packageId}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                            {order.totalItems}
                          </span>
                        </td>
                        <td className="p-2">{order.packages.length}</td>
                        <td className="p-2 font-bold text-green-700">{order.refundableItems}</td>
                        <td className="p-2 font-bold text-red-700">{order.nonRefundableItems}</td>
                        <td className="p-2 font-bold text-green-700">{formatCurrency(order.totalEstimatedCredit)}</td>
                        <td className="p-2 text-[#505454]">{formatDate(order.createdAt)}</td>
                        <td className="p-2 text-[#505454]">{order.receivedAt ? formatDate(order.receivedAt) : '-'}</td>
                        <td className="p-2">
                          <Link href={`/warehouse/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-[#e2e2e2] text-[#516057] hover:bg-[#f5f2f1]">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
