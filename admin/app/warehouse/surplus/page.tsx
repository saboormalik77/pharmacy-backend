'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchAllSurplus } from '@/lib/store/warehouseSlice';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Package, Search, Filter, Calendar, MapPin } from 'lucide-react';

export default function SurplusInventoryPage() {
    const dispatch = useAppDispatch();
    const { allSurplus, surplusPagination, isLoading, error } = useAppSelector(
        (state) => state.warehouse
    );

    const [filters, setFilters] = useState({
        status: 'stored',
        search: '',
        page: 1,
        limit: 20,
    });

    useEffect(() => {
        dispatch(fetchAllSurplus(filters));
    }, [dispatch, filters]);

    const handleStatusFilter = (status: string) => {
        setFilters({ ...filters, status, page: 1 });
    };

    const handleSearch = (search: string) => {
        setFilters({ ...filters, search, page: 1 });
    };

    const handlePageChange = (page: number) => {
        setFilters({ ...filters, page });
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            stored: 'bg-blue-100 text-blue-700',
            assigned_to_return: 'bg-green-100 text-green-700',
            disposed: 'bg-gray-100 text-gray-700',
            other: 'bg-yellow-100 text-yellow-700',
        };
        return styles[status as keyof typeof styles] || styles.other;
    };

    const getConditionBadge = (condition: string) => {
        const styles = {
            good: 'bg-green-100 text-green-700',
            damaged: 'bg-red-100 text-red-700',
            unknown: 'bg-gray-100 text-gray-700',
        };
        return styles[condition as keyof typeof styles] || styles.unknown;
    };

    return (
        <PermissionGate permission="warehouse">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Surplus Inventory</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            View and manage surplus items found during warehouse verification
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-semibold text-gray-700">
                            {surplusPagination?.total || 0} Items
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by NDC, product name, or warehouse location..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={filters.search}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">Status:</span>
                        {['all', 'stored', 'assigned_to_return', 'disposed', 'other'].map((status) => (
                            <button
                                key={status}
                                onClick={() => handleStatusFilter(status === 'all' ? '' : status)}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    (status === 'all' && !filters.status) ||
                                    filters.status === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {status === 'all' ? 'All' : status.replace(/_/g, ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Loading state */}
                {isLoading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* Surplus items table */}
                {!isLoading && allSurplus.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            Product
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            NDC / Lot
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            Quantity
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            Condition
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            Location
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            Source Return
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                                            Added
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {allSurplus.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {item.productName || 'Unknown Product'}
                                                </div>
                                                {item.manufacturer && (
                                                    <div className="text-xs text-gray-500">
                                                        {item.manufacturer}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-900">
                                                    {item.ndc || 'N/A'}
                                                </div>
                                                {item.lotNumber && (
                                                    <div className="text-xs text-gray-500">
                                                        Lot: {item.lotNumber}
                                                    </div>
                                                )}
                                                {item.expirationDate && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(item.expirationDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConditionBadge(
                                                        item.condition
                                                    )}`}
                                                >
                                                    {item.condition.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                                                        item.status
                                                    )}`}
                                                >
                                                    {item.status.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 text-sm text-gray-700">
                                                    <MapPin className="w-3 h-3 text-gray-400" />
                                                    {item.warehouseLocation}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-900">
                                                    {item.licensePlate || 'N/A'}
                                                </div>
                                                {item.pharmacyName && (
                                                    <div className="text-xs text-gray-500">
                                                        {item.pharmacyName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-gray-500">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && allSurplus.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            No surplus items found
                        </h3>
                        <p className="text-xs text-gray-500">
                            Surplus items will appear here when found during verification
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {surplusPagination && surplusPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                        <div className="text-xs text-gray-600">
                            Showing {((surplusPagination.page - 1) * surplusPagination.limit) + 1} to{' '}
                            {Math.min(
                                surplusPagination.page * surplusPagination.limit,
                                surplusPagination.total
                            )}{' '}
                            of {surplusPagination.total} items
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(surplusPagination.page - 1)}
                                disabled={surplusPagination.page === 1}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-gray-600">
                                Page {surplusPagination.page} of {surplusPagination.totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(surplusPagination.page + 1)}
                                disabled={surplusPagination.page === surplusPagination.totalPages}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </PermissionGate>
    );
}
