"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { returnsService } from '@/lib/api/services';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import Link from 'next/link';
import type { Return } from '@/types';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReturns();
  }, [selectedStatus]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedStatus && selectedStatus !== 'all') {
        filters.status = selectedStatus;
      }
      const result = await returnsService.getReturns(filters);
      // Transform API response to match frontend format
      const transformed = result.returns.map((ret: any) => ({
        id: ret.id,
        clientId: ret.pharmacy_id,
        clientName: ret.pharmacy_name || 'My Pharmacy',
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        status: ret.status,
        items: ret.items || [],
        totalEstimatedCredit: ret.total_estimated_credit || 0,
        shipmentId: ret.shipment_id,
        notes: ret.notes,
      }));
      setReturns(transformed);
    } catch (err: any) {
      setError(err.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesStatus = !selectedStatus || selectedStatus === 'all' || returnItem.status === selectedStatus;
    const matchesSearch = !searchQuery || 
      returnItem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      returnItem.items.some(item => 
        (item.drugName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ndc || '').includes(searchQuery)
      );
    return matchesStatus && matchesSearch;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_transit':
      case 'processing': return 'info';
      case 'draft': return 'secondary';
      case 'ready_to_ship': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Professional Medical Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Returns Management</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage your pharmaceutical returns</p>
          </div>
          <Link href="/returns/create">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white border-0">
              <Plus className="mr-1 h-3 w-3" />
              Create Return
            </Button>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 rounded text-sm bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {/* Professional Filters */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-teal-500" />
                <Input placeholder="Search..." className="pl-7 h-7 text-xs border-teal-200 focus:border-teal-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs border-slate-300 hover:bg-slate-100" onClick={() => { setSelectedStatus(null); setSearchQuery(''); loadReturns(); }}>
                <Filter className="mr-1 h-3 w-3" />
                Clear
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs border-emerald-300 hover:bg-emerald-50 text-emerald-700">
                <Download className="mr-1 h-3 w-3" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Professional Status Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200 bg-white rounded-t-lg p-1">
          {[
            { label: 'All', value: 'all', count: returns.length, color: 'bg-slate-100 text-slate-700 border-slate-300' },
            { label: 'Drafts', value: 'draft', count: returns.filter(r => r.status === 'draft').length, color: 'bg-slate-100 text-slate-700 border-slate-300' },
            { label: 'Ready', value: 'ready_to_ship', count: returns.filter(r => r.status === 'ready_to_ship').length, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
            { label: 'In Transit', value: 'in_transit', count: returns.filter(r => r.status === 'in_transit').length, color: 'bg-teal-100 text-teal-700 border-teal-300' },
            { label: 'Processing', value: 'processing', count: returns.filter(r => r.status === 'processing').length, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
            { label: 'Completed', value: 'completed', count: returns.filter(r => r.status === 'completed').length, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
          ].map((tab) => {
            const isActive = (tab.value === 'all' && selectedStatus === null) || selectedStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value === 'all' ? null : tab.value)}
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

        {/* Professional Table */}
        <Card className="border-2 border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b-2 border-teal-200">
                    <th className="text-left p-2 font-bold text-teal-900">Return ID</th>
                    <th className="text-left p-2 font-bold text-teal-900">Status</th>
                    <th className="text-left p-2 font-bold text-teal-900">Client</th>
                    <th className="text-left p-2 font-bold text-teal-900">Items</th>
                    <th className="text-left p-2 font-bold text-teal-900">Shipment ID</th>
                    <th className="text-left p-2 font-bold text-teal-900">Created</th>
                    <th className="text-left p-2 font-bold text-teal-900">Updated</th>
                    <th className="text-left p-2 font-bold text-teal-900">Est. Credit</th>
                    <th className="text-left p-2 font-bold text-teal-900">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="p-4 text-center text-gray-500 text-sm bg-gray-50">Loading...</td></tr>
                  ) : filteredReturns.length === 0 ? (
                    <tr><td colSpan={9} className="p-4 text-center text-gray-500 text-sm bg-gray-50">No returns found</td></tr>
                  ) : (
                    filteredReturns.map((returnItem, idx) => (
                      <tr key={returnItem.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50 transition-colors`}>
                        <td className="p-2">
                          <Link href={`/returns/${returnItem.id}`} className="font-semibold text-teal-700 hover:text-teal-900 hover:underline">
                            {returnItem.id}
                          </Link>
                        </td>
                        <td className="p-2">
                          <Badge variant={getStatusVariant(returnItem.status)} className="text-xs border-2">
                            {getStatusLabel(returnItem.status)}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-700">{returnItem.clientName}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">
                            {returnItem.items.length}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-gray-600">{returnItem.shipmentId || '-'}</td>
                        <td className="p-2 text-gray-600">{formatDate(returnItem.createdAt)}</td>
                        <td className="p-2 text-gray-600">{formatDate(returnItem.updatedAt)}</td>
                        <td className="p-2 font-bold text-emerald-700">{formatCurrency(returnItem.totalEstimatedCredit)}</td>
                        <td className="p-2 text-gray-500 text-xs">{returnItem.notes ? returnItem.notes.substring(0, 30) + '...' : '-'}</td>
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
