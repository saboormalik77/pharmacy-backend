'use client';

import { useEffect } from 'react';
import { Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchBuyingGroups } from '@/lib/store/buyingGroupsSlice';
import Link from 'next/link';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, isLoading } = useAppSelector((state) => state.buyingGroups);

  useEffect(() => {
    dispatch(fetchBuyingGroups({ page: 1, limit: 1 }));
  }, [dispatch]);

  const statCards = [
    { label: 'Total Buying Groups', value: stats.total, icon: Users, color: 'bg-indigo-500' },
    { label: 'Active', value: stats.active, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'bg-gray-500' },
    { label: 'Suspended', value: stats.suspended, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your buying groups</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading ? '...' : card.value}
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/buying-groups"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Manage Buying Groups</p>
              <p className="text-sm text-gray-500">Add, edit, or remove buying groups</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
