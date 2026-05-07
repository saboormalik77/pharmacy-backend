'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Clock, AlertTriangle, Search } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import { AgingInventoryResponse, OutstandingRaResponse } from '@/lib/types';

export default function InventoryPage() {
    const [activeSection, setActiveSection] = useState<'aging' | 'outstanding-ra'>('aging');

    // Aging Inventory state
    const [agingData, setAgingData] = useState<AgingInventoryResponse | null>(null);
    const [agingLoading, setAgingLoading] = useState(true);
    const [agingError, setAgingError] = useState<string | null>(null);
    const [agingStatus, setAgingStatus] = useState('');

    // Outstanding RA state
    const [raData, setRaData] = useState<OutstandingRaResponse | null>(null);
    const [raLoading, setRaLoading] = useState(false);
    const [raError, setRaError] = useState<string | null>(null);
    const [raSearch, setRaSearch] = useState('');

    const fetchAging = useCallback(async () => {
        setAgingLoading(true);
        setAgingError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/aging-inventory', true, {
                status: agingStatus || undefined,
                limit: 20,
            });
            setAgingData({ data: response.data, summary: response.summary, agingBuckets: response.agingBuckets, pagination: response.pagination });
        } catch (err: any) {
            setAgingError(err?.message || 'Failed to load aging inventory');
        } finally {
            setAgingLoading(false);
        }
    }, [agingStatus]);

    const fetchRA = useCallback(async () => {
        setRaLoading(true);
        setRaError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/outstanding-ra', true, {
                search: raSearch || undefined,
                limit: 20,
            });
            setRaData({ data: response.data, summary: response.summary, agingBuckets: response.agingBuckets, pagination: response.pagination });
        } catch (err: any) {
            setRaError(err?.message || 'Failed to load outstanding RA data');
        } finally {
            setRaLoading(false);
        }
    }, [raSearch]);

    useEffect(() => { fetchAging(); }, [fetchAging]);

    useEffect(() => {
        if (activeSection === 'outstanding-ra' && !raData && !raLoading) {
            fetchRA();
        }
    }, [activeSection, raData, raLoading, fetchRA]);

    const LoadingSkeleton = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                        <div className="h-6 bg-gray-200 rounded w-32" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 h-60 animate-pulse" />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Section Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveSection('aging')}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${activeSection === 'aging' ? 'bg-[#1d2222] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    Aging Inventory
                </button>
                <button
                    onClick={() => setActiveSection('outstanding-ra')}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${activeSection === 'outstanding-ra' ? 'bg-[#1d2222] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    Outstanding RA
                </button>
            </div>

            {/* Aging Inventory Section */}
            {activeSection === 'aging' && (
                <>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Status:</label>
                        <select
                            value={agingStatus}
                            onChange={(e) => setAgingStatus(e.target.value)}
                            className="text-xs border rounded px-2 py-1.5 bg-white"
                        >
                            <option value="">All</option>
                            <option value="shelved">Shelved</option>
                            <option value="ready_to_return">Ready to Return</option>
                            <option value="returned">Returned</option>
                            <option value="destroyed">Destroyed</option>
                        </select>
                    </div>

                    {agingLoading ? <LoadingSkeleton /> : agingError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                            {agingError}
                            <button onClick={fetchAging} className="ml-2 underline">Retry</button>
                        </div>
                    ) : agingData ? (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Total Items</p>
                                    <p className="text-base font-bold">{formatNumber(agingData.summary?.totalItems || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Total Value</p>
                                    <p className="text-base font-bold text-green-600">{formatCurrency(agingData.summary?.totalValue || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Shelved</p>
                                    <p className="text-base font-bold text-blue-600">{formatNumber(agingData.summary?.shelvedCount || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Avg Days Shelved</p>
                                    <p className="text-base font-bold text-orange-600">{agingData.summary?.avgDaysShelved || 0} days</p>
                                </div>
                            </div>

                            {/* Aging Buckets Chart */}
                            {agingData.agingBuckets && (
                                <div className="bg-white rounded-lg shadow-md p-4">
                                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Aging Distribution</h2>
                                    <div className="h-56">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={[
                                                { name: '< 30 Days', count: agingData.agingBuckets.under30Days?.count || 0, value: agingData.agingBuckets.under30Days?.value || 0 },
                                                { name: '30-90 Days', count: agingData.agingBuckets.days30to90?.count || 0, value: agingData.agingBuckets.days30to90?.value || 0 },
                                                { name: '91-180 Days', count: agingData.agingBuckets.days91to180?.count || 0, value: agingData.agingBuckets.days91to180?.value || 0 },
                                                { name: '> 180 Days', count: agingData.agingBuckets.over180Days?.count || 0, value: agingData.agingBuckets.over180Days?.value || 0 },
                                            ]}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '10px' }} />
                                                <YAxis stroke="#6b7280" style={{ fontSize: '10px' }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                                                <Legend />
                                                <Bar dataKey="count" fill="#3b82f6" name="Items" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Aging Inventory Table */}
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <h2 className="text-sm font-semibold text-gray-900 mb-3">Inventory Items</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <tr>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">NDC</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Product</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Pharmacy</th>
                                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Qty</th>
                                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Value</th>
                                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Days</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {agingData.data.map((item, idx) => (
                                                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50`}>
                                                    <td className="px-4 py-3 text-sm font-mono">{item.ndc}</td>
                                                    <td className="px-4 py-3 text-sm">{item.productName}</td>
                                                    <td className="px-4 py-3 text-sm">{item.pharmacyName}</td>
                                                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.estimatedValue)}</td>
                                                    <td className="px-4 py-3 text-sm text-right">
                                                        <span className={`font-medium ${item.daysShelved > 180 ? 'text-red-600' : item.daysShelved > 90 ? 'text-orange-600' : ''}`}>
                                                            {item.daysShelved}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                                            item.status === 'shelved' ? 'bg-blue-100 text-blue-700' :
                                                            item.status === 'ready_to_return' ? 'bg-green-100 text-green-700' :
                                                            item.status === 'returned' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {item.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {agingData.data.length === 0 && (
                                        <p className="text-center text-xs text-gray-500 py-6">No inventory items found</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            {/* Outstanding RA Section */}
            {activeSection === 'outstanding-ra' && (
                <>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search manufacturer or memo..."
                                value={raSearch}
                                onChange={(e) => setRaSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchRA()}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border rounded bg-white"
                            />
                        </div>
                        <button onClick={fetchRA} className="px-3 py-1.5 text-xs bg-[#1d2222] text-white rounded hover:bg-[#3d4343]">
                            Search
                        </button>
                    </div>

                    {raLoading ? <LoadingSkeleton /> : raError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                            {raError}
                            <button onClick={fetchRA} className="ml-2 underline">Retry</button>
                        </div>
                    ) : raData ? (
                        <div className="space-y-4">
                            {/* RA Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Outstanding RAs</p>
                                    <p className="text-base font-bold text-red-600">{formatNumber(raData.summary?.totalOutstanding || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Total Ask Value</p>
                                    <p className="text-base font-bold text-blue-600">{formatCurrency(raData.summary?.totalAskValue || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Avg Days Waiting</p>
                                    <p className="text-base font-bold text-orange-600">{raData.summary?.avgDaysWaiting || 0} days</p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-3">
                                    <p className="text-xs text-gray-600 mb-1">Oldest Request</p>
                                    <p className="text-sm font-bold text-gray-700">
                                        {raData.summary?.oldestRequest ? formatDate(raData.summary.oldestRequest) : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* RA Aging Buckets */}
                            {raData.agingBuckets && (
                                <div className="bg-white rounded-lg shadow-md p-4">
                                    <h2 className="text-sm font-semibold text-gray-900 mb-3">RA Aging Distribution</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: '< 30 Days', data: raData.agingBuckets.under30Days, bg: 'bg-green-50 border-green-200' },
                                            { label: '30-60 Days', data: raData.agingBuckets.days30to60, bg: 'bg-yellow-50 border-yellow-200' },
                                            { label: '61-120 Days', data: raData.agingBuckets.days61to120, bg: 'bg-orange-50 border-orange-200' },
                                            { label: '> 120 Days', data: raData.agingBuckets.over120Days, bg: 'bg-red-50 border-red-200' },
                                        ].map((bucket) => (
                                            <div key={bucket.label} className={`p-3 rounded-lg border-2 ${bucket.bg}`}>
                                                <p className="text-xs font-medium text-gray-700 mb-1">{bucket.label}</p>
                                                <p className="text-sm font-bold">{bucket.data?.count || 0} RAs</p>
                                                <p className="text-xs text-gray-600">{formatCurrency(bucket.data?.value || 0)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* RA Table */}
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <h2 className="text-sm font-semibold text-gray-900 mb-3">Outstanding RA Details</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <tr>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Memo #</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Manufacturer</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Destination</th>
                                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Pharmacy</th>
                                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Days Waiting</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {raData.data.map((item, idx) => (
                                                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50`}>
                                                    <td className="px-4 py-3 text-sm font-mono">{item.memoNumber}</td>
                                                    <td className="px-4 py-3 text-sm">{item.labelerName}</td>
                                                    <td className="px-4 py-3 text-sm">{item.destination}</td>
                                                    <td className="px-4 py-3 text-sm">{item.pharmacyName}</td>
                                                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.amountRequested)}</td>
                                                    <td className="px-4 py-3 text-sm text-right">
                                                        <span className={`font-medium ${item.daysWaiting > 120 ? 'text-red-600 font-bold' : item.daysWaiting > 60 ? 'text-orange-600' : ''}`}>
                                                            {item.daysWaiting}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {raData.data.length === 0 && (
                                        <p className="text-center text-xs text-gray-500 py-6">No outstanding RAs found</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
