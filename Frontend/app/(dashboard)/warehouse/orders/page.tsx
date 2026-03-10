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
      case 'classifying': return 'bg-teal-100 text-teal-700 border-teal-300';
      case 'inspecting': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'received': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'exception': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
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
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100">
              <Warehouse className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Warehouse Orders</h1>
              <p className="text-xs text-gray-600 mt-0.5">Track and manage all warehouse processing orders</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
        </div>

        {/* Colorful Filters */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-teal-500" />
                <Input placeholder="Search by order number, client, or package ID..." className="pl-7 h-7 text-xs border-teal-200 focus:border-teal-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs border-gray-300 hover:bg-gray-100" onClick={() => { setFilterStatus(null); setSearchQuery(''); }}>
                <Filter className="mr-1 h-3 w-3" />
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
            { label: 'Inspecting', value: 'inspecting', count: statusCounts.inspecting, color: 'bg-amber-100 text-amber-700 border-amber-300' },
            { label: 'Processing', value: 'processing', count: statusCounts.processing, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
            { label: 'Completed', value: 'completed', count: statusCounts.completed, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
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

        {/* Colorful Table */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                    <th className="text-left p-2 font-bold text-teal-900">Order #</th>
                    <th className="text-left p-2 font-bold text-teal-900">Status</th>
                    <th className="text-left p-2 font-bold text-teal-900">Client</th>
                    <th className="text-left p-2 font-bold text-teal-900">Return ID</th>
                    <th className="text-left p-2 font-bold text-teal-900">Package ID</th>
                    <th className="text-left p-2 font-bold text-teal-900">Items</th>
                    <th className="text-left p-2 font-bold text-teal-900">Packages</th>
                    <th className="text-left p-2 font-bold text-teal-900">Refundable</th>
                    <th className="text-left p-2 font-bold text-teal-900">Non-Refund</th>
                    <th className="text-left p-2 font-bold text-teal-900">Est. Credit</th>
                    <th className="text-left p-2 font-bold text-indigo-900">Created</th>
                    <th className="text-left p-2 font-bold text-indigo-900">Received</th>
                    <th className="text-left p-2 font-bold text-indigo-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={13} className="p-4 text-center text-gray-500 text-sm bg-gray-50">No orders found</td></tr>
                  ) : (
                    filteredOrders.map((order, idx) => (
                      <tr key={order.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50 transition-colors`}>
                        <td className="p-2 font-semibold text-indigo-700">{order.orderNumber}</td>
                        <td className="p-2">
                          <Badge variant={getStatusVariant(order.status)} className={`text-xs border-2 ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-700">{order.clientName}</td>
                        <td className="p-2 font-mono text-gray-600">{order.returnId}</td>
                        <td className="p-2 font-mono text-gray-600">{order.packageId}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                            {order.totalItems}
                          </span>
                        </td>
                        <td className="p-2">{order.packages.length}</td>
                        <td className="p-2 font-bold text-green-700">{order.refundableItems}</td>
                        <td className="p-2 font-bold text-red-700">{order.nonRefundableItems}</td>
                        <td className="p-2 font-bold text-green-700">{formatCurrency(order.totalEstimatedCredit)}</td>
                        <td className="p-2 text-gray-600">{formatDate(order.createdAt)}</td>
                        <td className="p-2 text-gray-600">{order.receivedAt ? formatDate(order.receivedAt) : '-'}</td>
                        <td className="p-2">
                          <Link href={`/warehouse/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-teal-300 text-teal-700 hover:bg-teal-50">
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
