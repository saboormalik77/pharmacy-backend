'use client';

import { useEffect, useState, useCallback } from 'react';
import { DollarSign, AlertTriangle, Clock, Search } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { AskVsReceivedResponse, UnpaidMemosResponse } from '@/lib/types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function FinancialsPage() {
    const [activeSection, setActiveSection] = useState<'ask-vs-received' | 'unpaid-memos'>('ask-vs-received');

    // Ask vs Received state
    const [avrData, setAvrData] = useState<AskVsReceivedResponse | null>(null);
    const [avrLoading, setAvrLoading] = useState(true);
    const [avrError, setAvrError] = useState<string | null>(null);
    const [avrGroupBy, setAvrGroupBy] = useState('manufacturer');

    // Unpaid Memos state
    const [unpaidData, setUnpaidData] = useState<UnpaidMemosResponse | null>(null);
    const [unpaidLoading, setUnpaidLoading] = useState(false);
    const [unpaidError, setUnpaidError] = useState<string | null>(null);
    const [unpaidSearch, setUnpaidSearch] = useState('');

    const fetchAskVsReceived = useCallback(async () => {
        setAvrLoading(true);
        setAvrError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/fcr-ask-vs-received', true, {
                group_by: avrGroupBy,
                limit: 20,
            });
            setAvrData({ data: response.data, totals: response.totals, pagination: response.pagination });
        } catch (err: any) {
            setAvrError(err?.message || 'Failed to load ask vs received data');
        } finally {
            setAvrLoading(false);
        }
    }, [avrGroupBy]);

    const fetchUnpaidMemos = useCallback(async () => {
        setUnpaidLoading(true);
        setUnpaidError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/unpaid-memos', true, {
                search: unpaidSearch || undefined,
                limit: 20,
            });
            setUnpaidData({ data: response.data, summary: response.summary, agingBuckets: response.agingBuckets, pagination: response.pagination });
        } catch (err: any) {
            setUnpaidError(err?.message || 'Failed to load unpaid memos data');
        } finally {
            setUnpaidLoading(false);
        }
    }, [unpaidSearch]);

    useEffect(() => { fetchAskVsReceived(); }, [fetchAskVsReceived]);

    useEffect(() => {
        if (activeSection === 'unpaid-memos' && !unpaidData && !unpaidLoading) {
            fetchUnpaidMemos();
        }
    }, [activeSection, unpaidData, unpaidLoading, fetchUnpaidMemos]);

    const LoadingSkeleton = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                        <div className="h-6 bg-gray-200 rounded w-32" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 h-80 animate-pulse">
                <div className="h-64 bg-gray-100 rounded" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Section Toggle */}
            <div className="flex gap-3">
                <button
                    onClick={() => setActiveSection('ask-vs-received')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg ${activeSection === 'ask-vs-received' ? 'bg-[#516057] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    Ask vs Received
                </button>
                <button
                    onClick={() => setActiveSection('unpaid-memos')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg ${activeSection === 'unpaid-memos' ? 'bg-[#516057] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    Unpaid Memos
                </button>
            </div>

            {/* Ask vs Received Section */}
            {activeSection === 'ask-vs-received' && (
                <>
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-500">Group by:</label>
                        <select
                            value={avrGroupBy}
                            onChange={(e) => setAvrGroupBy(e.target.value)}
                            className="text-sm border border-[#e2e2e2] rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="manufacturer">Manufacturer</option>
                            <option value="ndc">NDC</option>
                            <option value="destination">Destination</option>
                        </select>
                    </div>

                    {avrLoading ? <LoadingSkeleton /> : avrError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-base">
                            {avrError}
                            <button onClick={fetchAskVsReceived} className="ml-2 underline">Retry</button>
                        </div>
                    ) : avrData ? (
                        <div className="space-y-6">
                            {/* Totals Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Ask Value</p>
                                    <p className="text-base font-bold text-blue-600">{formatCurrency(avrData.totals?.totalAskValue || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Received</p>
                                    <p className="text-base font-bold text-green-600">{formatCurrency(avrData.totals?.totalReceived || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Difference</p>
                                    <p className="text-base font-bold text-red-600">{formatCurrency(avrData.totals?.totalDifference || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Pay Rate</p>
                                    <p className="text-base font-bold text-purple-600">{avrData.totals?.overallPayPercent || 0}%</p>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            {avrData.data.length > 0 && (
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <h2 className="text-base font-semibold text-gray-900 mb-4">Ask vs Received Comparison</h2>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={avrData.data.slice(0, 10)} margin={{ top: 5, right: 5, left: -10, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey={avrGroupBy === 'ndc' ? 'ndc' : (avrGroupBy === 'destination' ? 'destination' : 'labelerName')}
                                                    stroke="#6b7280"
                                                    style={{ fontSize: '11px' }}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={80}
                                                />
                                                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                                                <Tooltip
                                                    formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                                                />
                                                <Legend />
                                                <Bar dataKey="totalAsk" fill="#3b82f6" name="Ask" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="totalReceived" fill="#10b981" name="Received" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Data Table */}
                            <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                <h2 className="text-base font-semibold text-gray-900 mb-4">Details</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <tr>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                                    {avrGroupBy === 'ndc' ? 'NDC' : avrGroupBy === 'destination' ? 'Destination' : 'Manufacturer'}
                                                </th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Ask</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Received</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Difference</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Pay %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {avrData.data.map((row, idx) => (
                                                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]'} hover:bg-[#fafafa] transition-all`}>
                                                    <td className="px-5 py-4 text-base font-medium text-gray-900">
                                                        {avrGroupBy === 'ndc' ? row.ndc : avrGroupBy === 'destination' ? row.destination : row.labelerName}
                                                    </td>
                                                    <td className="px-5 py-4 text-base text-right">{formatCurrency(row.totalAsk ?? row.totalAskValue ?? 0)}</td>
                                                    <td className="px-5 py-4 text-base text-right text-green-600">{formatCurrency(row.totalReceived)}</td>
                                                    <td className="px-5 py-4 text-base text-right text-red-600">{formatCurrency(row.difference)}</td>
                                                    <td className="px-5 py-4 text-base text-right">
                                                        <span className={`font-medium ${row.payPercent >= 90 ? 'text-green-600' : row.payPercent >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {row.payPercent}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            {/* Unpaid Memos Section */}
            {activeSection === 'unpaid-memos' && (
                <>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search manufacturer or memo..."
                                value={unpaidSearch}
                                onChange={(e) => setUnpaidSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchUnpaidMemos()}
                                className="w-full pl-10 pr-4 py-2.5 text-base border border-[#e2e2e2] rounded-lg bg-white"
                            />
                        </div>
                        <button onClick={fetchUnpaidMemos} className="px-5 py-2.5 text-base bg-[#516057] text-white rounded-lg hover:opacity-90">
                            Search
                        </button>
                    </div>

                    {unpaidLoading ? <LoadingSkeleton /> : unpaidError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-base">
                            {unpaidError}
                            <button onClick={fetchUnpaidMemos} className="ml-2 underline">Retry</button>
                        </div>
                    ) : unpaidData ? (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Unpaid Memos</p>
                                    <p className="text-base font-bold text-gray-900">{formatNumber(unpaidData.summary?.totalUnpaidMemos || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Outstanding</p>
                                    <p className="text-base font-bold text-red-600">{formatCurrency(unpaidData.summary?.totalOutstanding || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Amount Requested</p>
                                    <p className="text-base font-bold text-blue-600">{formatCurrency(unpaidData.summary?.totalAmountRequested || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Avg Days Outstanding</p>
                                    <p className="text-base font-bold text-orange-600">{unpaidData.summary?.avgDaysOutstanding || 0} days</p>
                                </div>
                            </div>

                            {/* Aging Buckets */}
                            {unpaidData.agingBuckets && (
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <h2 className="text-base font-semibold text-gray-900 mb-4">Aging Buckets</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[
                                            { label: '< 30 Days', data: unpaidData.agingBuckets.under30Days, color: 'green' },
                                            { label: '30-90 Days', data: unpaidData.agingBuckets.days30to90, color: 'yellow' },
                                            { label: '91-180 Days', data: unpaidData.agingBuckets.days91to180, color: 'orange' },
                                            { label: '181-365 Days', data: unpaidData.agingBuckets.days181to365, color: 'red' },
                                            { label: '> 365 Days', data: unpaidData.agingBuckets.over365Days, color: 'red' },
                                        ].map((bucket) => (
                                            <div key={bucket.label} className={`p-4 rounded-lg border-2 border-${bucket.color}-200 bg-${bucket.color}-50`}>
                                                <p className="text-sm font-medium text-gray-700 mb-1">{bucket.label}</p>
                                                <p className="text-base font-bold">{bucket.data?.count || 0} memos</p>
                                                <p className="text-sm text-gray-600">{formatCurrency(bucket.data?.outstanding || 0)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Unpaid Memos Table */}
                            <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                <h2 className="text-base font-semibold text-gray-900 mb-4">Unpaid Memo Details</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <tr>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Memo #</th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Manufacturer</th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Pharmacy</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Requested</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Received</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Days</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {unpaidData.data.map((item, idx) => (
                                                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50`}>
                                                    <td className="px-4 py-3 text-sm font-mono">{item.memoNumber}</td>
                                                    <td className="px-4 py-3 text-sm">{item.labelerName}</td>
                                                    <td className="px-4 py-3 text-sm">{item.pharmacyName}</td>
                                                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.amountRequested)}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(item.amountReceived)}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{formatCurrency(item.outstandingAmount)}</td>
                                                    <td className="px-4 py-3 text-sm text-right">
                                                        <span className={`${item.daysOutstanding > 180 ? 'text-red-600 font-bold' : item.daysOutstanding > 90 ? 'text-orange-600' : ''}`}>
                                                            {item.daysOutstanding}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {unpaidData.data.length === 0 && (
                                        <p className="text-center text-xs text-gray-500 py-6">No unpaid memos found</p>
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
