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
    { label: 'Total Buying Groups', value: stats.total, icon: Users, color: 'var(--primary)' },
    { label: 'Active Groups', value: stats.active, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Total Returns', value: warehouseStats.totalReturns, icon: Package, color: 'var(--secondary)' },
    { label: 'Total Batches', value: warehouseStats.totalBatches, icon: Layers, color: 'var(--tertiary)' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-headline" style={{ color: 'var(--foreground)' }}>Admin Dashboard</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
          Overview of buying groups, warehouse operations, and system metrics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-[4px] shadow-sm px-6 py-6 border"
              style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>{card.label}</p>
                  <p className="text-lg font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                    {(isLoading || warehouseStats.isLoading) ? '...' : card.value}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-[4px] flex items-center justify-center"
                  style={{ backgroundColor: card.color as string }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Batch Info */}
      {!warehouseStats.isLoading && !warehouseStats.error && (
        <div className="rounded-[4px] shadow-sm px-6 py-6 border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] flex items-center justify-center" style={{ backgroundColor: 'var(--tertiary-container)' }}>
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Current Active Batch</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {warehouseStats.activeBatch || 'No active batch'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error handling for warehouse stats */}
      {warehouseStats.error && (
        <div className="rounded-[4px] shadow-sm p-6 border" style={{ backgroundColor: 'var(--error-container)', borderColor: 'var(--error)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--error)' }} />
            <p className="text-sm" style={{ color: 'var(--on-error-container)' }}>
              Unable to load warehouse statistics: {warehouseStats.error}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-[4px] shadow-sm px-6 py-6 border mt-4" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
        <h2 className="font-heading text-body font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/buying-groups"
            className="flex items-center gap-3 p-6 rounded-[4px] border transition-colors"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <div className="w-10 h-10 rounded-[4px] flex items-center justify-center" style={{ backgroundColor: 'var(--primary-fixed)' }}>
              <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>Buying Groups</p>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Manage buying groups</p>
            </div>
          </Link>
          
          <Link
            href="/warehouse"
            className="flex items-center gap-3 p-6 rounded-[4px] border transition-colors"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <div className="w-10 h-10 rounded-[4px] flex items-center justify-center" style={{ backgroundColor: 'var(--secondary-container)' }}>
              <Package className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>Warehouse</p>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Manage returns & batches</p>
            </div>
          </Link>

          <Link
            href="/warehouse/batches"
            className="flex items-center gap-3 p-6 rounded-[4px] border transition-colors"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <div className="w-10 h-10 rounded-[4px] flex items-center justify-center" style={{ backgroundColor: 'var(--tertiary-fixed)' }}>
              <Layers className="w-5 h-5" style={{ color: 'var(--tertiary)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>Batches</p>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>View & manage batches</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
