'use client';

import { useEffect, useState, useCallback } from 'react';
import { Building2, DollarSign, Package, Search, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import { PharmacyPerformanceResponse, GpoSummaryResponse } from '@/lib/types';

export default function PerformancePage() {
    const [activeSection, setActiveSection] = useState<'pharmacy' | 'gpo'>('pharmacy');

    // Pharmacy Performance state
    const [pharmData, setPharmData] = useState<PharmacyPerformanceResponse | null>(null);
    const [pharmLoading, setPharmLoading] = useState(true);
    const [pharmError, setPharmError] = useState<string | null>(null);
    const [pharmSearch, setPharmSearch] = useState('');
    const [pharmSort, setPharmSort] = useState('totalValue');
    const [pharmPage, setPharmPage] = useState(1);

    // GPO Summary state
    const [gpoData, setGpoData] = useState<GpoSummaryResponse | null>(null);
    const [gpoLoading, setGpoLoading] = useState(false);
    const [gpoError, setGpoError] = useState<string | null>(null);

    const fetchPharmacy = useCallback(async () => {
        setPharmLoading(true);
        setPharmError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/pharmacy-performance', true, {
                search: pharmSearch || undefined,
                sort_by: pharmSort,
                sort_dir: 'desc',
                page: pharmPage,
                limit: 15,
            });
            setPharmData({ data: response.data, overall: response.overall, pagination: response.pagination });
        } catch (err: any) {
            setPharmError(err?.message || 'Failed to load pharmacy performance');
        } finally {
            setPharmLoading(false);
        }
    }, [pharmSearch, pharmSort, pharmPage]);

    const fetchGpo = useCallback(async () => {
        setGpoLoading(true);
        setGpoError(null);
        try {
            const { apiClient } = await import('@/lib/api/apiClient');
            const response = await apiClient.get<any>('/admin/analytics/gpo-summary', true, {
                limit: 20,
            });
            setGpoData({ data: response.data, pagination: response.pagination });
        } catch (err: any) {
            setGpoError(err?.message || 'Failed to load GPO summary');
        } finally {
            setGpoLoading(false);
        }
    }, []);

    useEffect(() => { fetchPharmacy(); }, [fetchPharmacy]);

    useEffect(() => {
        if (activeSection === 'gpo' && !gpoData && !gpoLoading) {
            fetchGpo();
        }
    }, [activeSection, gpoData, gpoLoading, fetchGpo]);

    const LoadingSkeleton = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                        <div className="h-8 bg-gray-200 rounded w-40" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6 h-80 animate-pulse" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Section Toggle */}
            <div className="flex gap-3">
                <button
                    onClick={() => setActiveSection('pharmacy')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg ${activeSection === 'pharmacy' ? 'bg-[#516057] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    Pharmacy Performance
                </button>
                <button
                    onClick={() => setActiveSection('gpo')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg ${activeSection === 'gpo' ? 'bg-[#516057] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    GPO Summary
                </button>
            </div>

            {/* Pharmacy Performance Section */}
            {activeSection === 'pharmacy' && (
                <>
                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search pharmacy name..."
                                value={pharmSearch}
                                onChange={(e) => setPharmSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setPharmPage(1); fetchPharmacy(); } }}
                                className="w-full pl-10 pr-4 py-2.5 text-base border border-[#e2e2e2] rounded-lg bg-white"
                            />
                        </div>
                        <select
                            value={pharmSort}
                            onChange={(e) => { setPharmSort(e.target.value); setPharmPage(1); }}
                            className="text-base border border-[#e2e2e2] rounded-lg px-3 py-2.5 bg-white"
                        >
                            <option value="totalValue">Sort by Value</option>
                            <option value="returns">Sort by Returns</option>
                            <option value="avgValue">Sort by Avg Value</option>
                        </select>
                        <button
                            onClick={() => { setPharmPage(1); fetchPharmacy(); }}
                            className="px-5 py-2.5 text-base bg-[#516057] text-white rounded-lg hover:opacity-90"
                        >
                            Search
                        </button>
                    </div>

                    {pharmLoading ? <LoadingSkeleton /> : pharmError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-base">
                            {pharmError}
                            <button onClick={fetchPharmacy} className="ml-2 underline">Retry</button>
                        </div>
                    ) : pharmData ? (
                        <div className="space-y-6">
                            {/* Overall Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Pharmacies</p>
                                    <p className="text-base font-bold text-blue-600">{formatNumber(pharmData.overall?.totalPharmacies || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Returns</p>
                                    <p className="text-base font-bold text-gray-900">{formatNumber(pharmData.overall?.totalReturns || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Value</p>
                                    <p className="text-base font-bold text-green-600">{formatCurrency(pharmData.overall?.totalReturnableValue || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Items</p>
                                    <p className="text-base font-bold text-gray-900">{formatNumber(pharmData.overall?.totalItems || 0)}</p>
                                </div>
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <p className="text-sm text-gray-500 mb-2">Total Payout</p>
                                    <p className="text-base font-bold text-purple-600">{formatCurrency(pharmData.overall?.totalPayout || 0)}</p>
                                </div>
                            </div>

                            {/* Top Pharmacies Chart */}
                            {pharmData.data.length > 0 && (
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <h2 className="text-base font-semibold text-gray-900 mb-4">Top Pharmacies by Value</h2>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={pharmData.data.slice(0, 8)} margin={{ top: 5, right: 5, left: -10, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="pharmacyName"
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
                                                <Bar dataKey="totalReturnableValue" fill="#3b82f6" name="Returnable Value" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="totalPayout" fill="#10b981" name="Payout" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Pharmacy Performance Table */}
                            <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                <h2 className="text-base font-semibold text-gray-900 mb-4">Pharmacy Details</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <tr>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Pharmacy</th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">GPO</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Returns</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg Value</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Payout</th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Last Return</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {pharmData.data.map((item, idx) => (
                                                <tr key={item.pharmacyId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]'} hover:bg-[#fafafa] transition-all`}>
                                                    <td className="px-5 py-4 text-base font-medium text-gray-900">{item.pharmacyName}</td>
                                                    <td className="px-5 py-4 text-base text-gray-600">{item.gpoAffiliation || '—'}</td>
                                                    <td className="px-5 py-4 text-base text-right">{formatNumber(item.totalReturns)}</td>
                                                    <td className="px-5 py-4 text-base text-right">{formatNumber(item.totalItems)}</td>
                                                    <td className="px-5 py-4 text-base text-right font-medium">{formatCurrency(item.totalReturnableValue)}</td>
                                                    <td className="px-5 py-4 text-base text-right">{formatCurrency(item.avgReturnValue)}</td>
                                                    <td className="px-5 py-4 text-base text-right text-green-600">{formatCurrency(item.totalPayout)}</td>
                                                    <td className="px-5 py-4 text-base text-gray-600">
                                                        {item.lastReturnDate ? formatDate(item.lastReturnDate) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {pharmData.data.length === 0 && (
                                        <p className="text-center text-base text-gray-500 py-8">No pharmacy performance data found</p>
                                    )}
                                </div>

                                {/* Pagination */}
                                {pharmData.pagination && pharmData.pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e2e2e2]">
                                        <p className="text-sm text-gray-500">
                                            Page {pharmData.pagination.page} of {pharmData.pagination.totalPages}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPharmPage(Math.max(1, pharmPage - 1))}
                                                disabled={pharmPage <= 1}
                                                className="px-4 py-2 text-sm border border-[#e2e2e2] rounded-lg disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setPharmPage(Math.min(pharmData.pagination.totalPages, pharmPage + 1))}
                                                disabled={pharmPage >= pharmData.pagination.totalPages}
                                                className="px-4 py-2 text-sm border border-[#e2e2e2] rounded-lg disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </>
            )}

            {/* GPO Summary Section */}
            {activeSection === 'gpo' && (
                <>
                    {gpoLoading ? <LoadingSkeleton /> : gpoError ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-base">
                            {gpoError}
                            <button onClick={fetchGpo} className="ml-2 underline">Retry</button>
                        </div>
                    ) : gpoData ? (
                        <div className="space-y-6">
                            {/* GPO Chart */}
                            {gpoData.data.length > 0 && (
                                <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                    <h2 className="text-base font-semibold text-gray-900 mb-4">GPO Comparison</h2>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={gpoData.data} margin={{ top: 5, right: 5, left: -10, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="gpoName"
                                                    stroke="#6b7280"
                                                    style={{ fontSize: '11px' }}
                                                    angle={-30}
                                                    textAnchor="end"
                                                    height={70}
                                                />
                                                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                                                <Tooltip
                                                    formatter={(value) => typeof value === 'number' ? formatCurrency(value) : value}
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                                                />
                                                <Legend />
                                                <Bar dataKey="totalReturnableValue" fill="#3b82f6" name="Total Value" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="totalPayout" fill="#10b981" name="Total Payout" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="totalGpoShare" fill="#f59e0b" name="GPO Share" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* GPO Table */}
                            <div className="bg-white rounded-lg shadow border border-[#e2e2e2] p-6">
                                <h2 className="text-base font-semibold text-gray-900 mb-4">GPO Details</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                            <tr>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">GPO</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Pharmacies</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Returns</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg Value</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">Payout</th>
                                                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider">GPO Share</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {gpoData.data.map((item, idx) => (
                                                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]'} hover:bg-[#fafafa] transition-all`}>
                                                    <td className="px-5 py-4 text-base font-medium text-gray-900">{item.gpoName}</td>
                                                    <td className="px-5 py-4 text-base text-right">{item.pharmacyCount}</td>
                                                    <td className="px-5 py-4 text-base text-right">{formatNumber(item.totalReturns)}</td>
                                                    <td className="px-5 py-4 text-base text-right">{formatNumber(item.totalItems)}</td>
                                                    <td className="px-5 py-4 text-base text-right font-medium">{formatCurrency(item.totalReturnableValue)}</td>
                                                    <td className="px-5 py-4 text-base text-right">{formatCurrency(item.avgReturnValue)}</td>
                                                    <td className="px-5 py-4 text-base text-right text-green-600">{formatCurrency(item.totalPayout)}</td>
                                                    <td className="px-5 py-4 text-base text-right text-purple-600 font-medium">{formatCurrency(item.totalGpoShare)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {gpoData.data.length === 0 && (
                                        <p className="text-center text-base text-gray-500 py-8">No GPO data found</p>
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
