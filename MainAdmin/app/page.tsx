'use client';

import { useEffect } from 'react';
import { Users, CheckCircle, XCircle, AlertTriangle, Package, Layers, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchBuyingGroups } from '@/lib/store/buyingGroupsSlice';
import { useWarehouseStats } from '@/hooks/useWarehouseStats';
import Link from 'next/link';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, isLoading } = useAppSelector((state) => state.buyingGroups);
  const warehouseStats = useWarehouseStats();

  useEffect(() => {
    dispatch(fetchBuyingGroups({ page: 1, limit: 1 }));
  }, [dispatch]);

  const statCards = [
    { label: 'Total Buying Groups', value: stats.total, icon: Users, color: 'bg-indigo-500' },
    { label: 'Active Groups', value: stats.active, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Total Returns', value: warehouseStats.totalReturns, icon: Package, color: 'bg-blue-500' },
    { label: 'Total Batches', value: warehouseStats.totalBatches, icon: Layers, color: 'bg-purple-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Overview of buying groups, warehouse operations, and system metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">{card.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {(isLoading || warehouseStats.isLoading) ? '...' : card.value}
                  </p>
                </div>
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Batch Info */}
      {!warehouseStats.isLoading && !warehouseStats.error && (
        <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Current Active Batch</p>
              <p className="text-lg font-bold text-gray-900">
                {warehouseStats.activeBatch || 'No active batch'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error handling for warehouse stats */}
      {warehouseStats.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">
              Unable to load warehouse statistics: {warehouseStats.error}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow px-4 py-3 border border-gray-100 mt-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/buying-groups"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Buying Groups</p>
              <p className="text-sm text-gray-500">Manage buying groups</p>
            </div>
          </Link>
          
          <Link
            href="/warehouse"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Warehouse</p>
              <p className="text-sm text-gray-500">Manage returns & batches</p>
            </div>
          </Link>

          <Link
            href="/warehouse/batches"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Batches</p>
              <p className="text-sm text-gray-500">View & manage batches</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
