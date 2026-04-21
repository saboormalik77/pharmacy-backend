'use client';

import { Building2, Truck, FileText, DollarSign, ClipboardList, Scan, Archive, MapPin, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { ReturnsValueChart } from '@/components/charts/ReturnsValueChart';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchDashboard } from '@/lib/store/dashboardSlice';
import { fetchRecentActivity, Activity } from '@/lib/store/recentActivitySlice';
import { fetchMyStores } from '@/lib/store/returnTransactionsSlice';
import { formatRelativeTime } from '@/lib/utils';

// Processor Dashboard Component
function ProcessorDashboard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { myStores, isStoresLoading } = useAppSelector((state) => state.returnTransactions);

  useEffect(() => {
    dispatch(fetchMyStores());
  }, [dispatch]);

  return (
    <div className="space-y-3">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">Processor Dashboard</h1>
        <p className="text-xs text-gray-500">Welcome back, {user?.name}</p>
      </div>

      {/* Quick Actions for Processors */}
      <div className="bg-white rounded-lg shadow px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push('/warehouse/returns/create')}
            className="flex flex-col items-center gap-1 p-3 border border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Scan className="w-4 h-4 text-primary-600" />
            <span className="text-xs font-medium text-gray-800 text-center">Create Return</span>
          </button>
          <button
            onClick={() => router.push('/warehouse/returns')}
            className="flex flex-col items-center gap-1 p-3 border border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-800 text-center">View Returns</span>
          </button>
          <button
            onClick={() => router.push('/warehouse/tbd-items')}
            className="flex flex-col items-center gap-1 p-3 border border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Archive className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-medium text-gray-800 text-center">TBD Items</span>
          </button>
        </div>
      </div>

      {/* My Assigned Stores */}
      <div className="bg-white rounded-lg shadow px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">
          My Assigned Stores
          {myStores.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-500">({myStores.length})</span>
          )}
        </h2>

        {isStoresLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
            <span className="text-xs text-gray-500">Loading stores...</span>
          </div>
        ) : myStores.length === 0 ? (
          <div className="text-center py-6">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-3">No stores assigned yet</p>
            <button
              onClick={() => router.push('/warehouse/returns/create')}
              className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              View Stores
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {myStores.map((store) => (
              <div
                key={store.pharmacyId}
                className="border border-gray-200 rounded px-3 py-2 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="font-semibold text-gray-900 text-xs">{store.businessName}</span>
                  {store.storeNumber && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
                      #{store.storeNumber}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-5">
                  {store.city && store.state && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                      <MapPin className="w-2.5 h-2.5" />
                      {store.city}, {store.state}
                    </span>
                  )}
                  {store.lastVisitDate && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                      <Calendar className="w-2.5 h-2.5" />
                      Last: {new Date(store.lastVisitDate).toLocaleDateString()}
                    </span>
                  )}
                  {store.serviceType && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                      {store.serviceType.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data, isLoading } = useAppSelector((state) => state.dashboard);
  const { recentActivity, isLoadingRecentActivity } = useAppSelector((state) => state.recentActivity);
  const { user } = useAppSelector((state) => state.auth);

  const isProcessor = user?.role === 'processor';

  // Always call hooks before any early return (Rules of Hooks)
  useEffect(() => {
    if (isProcessor) return;
    dispatch(fetchDashboard({
      periodType: 'monthly',
      periods: 12,
    }));
    dispatch(fetchRecentActivity({
      limit: 20,
      offset: 0,
      filter: 'recentactivity',
    }));
  }, [dispatch, isProcessor]);

  // Show processor dashboard for processor role
  if (isProcessor) {
    return <ProcessorDashboard />;
  }

  // Format activity message based on activity type
  const formatActivityMessage = (activity: Activity): string => {
    const pharmacyName = activity.pharmacy?.pharmacyName || activity.pharmacy?.name || 'Unknown Pharmacy';
    const entityName = activity.entityName || '';
    
    // Convert activity type to readable format
    const activityTypeMap: Record<string, string> = {
      'pharmacy_registered': 'registered a new pharmacy',
      'document_uploaded': 'uploaded document',
      'product_added': 'added product',
      'payment_processed': 'processed payment',
      'shipment_created': 'created shipment',
      'deal_posted': 'posted deal',
      'document_approved': 'approved document',
      'document_rejected': 'rejected document',
      'pharmacy_updated': 'updated pharmacy',
      'product_updated': 'updated product',
    };

    // Get the readable activity type or convert snake_case to readable text
    let activityText = activityTypeMap[activity.activityType];
    if (!activityText) {
      // Convert snake_case to readable text (e.g., "document_uploaded" -> "uploaded document")
      activityText = activity.activityType
        .split('_')
        .reverse()
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .toLowerCase();
    }

    // Build the message based on activity type
    if (activity.activityType === 'pharmacy_registered') {
      return `${pharmacyName} ${activityText}`;
    } else if (activity.activityType === 'document_uploaded') {
      return `${pharmacyName} ${activityText}${entityName ? `: ${entityName}` : ''}`;
    } else if (activity.activityType === 'product_added') {
      return `${pharmacyName} ${activityText}${entityName ? `: ${entityName}` : ''}`;
    } else {
      // Generic format for other activity types
      return `${pharmacyName} ${activityText}${entityName ? `: ${entityName}` : ''}`;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome to Buying group Management Portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Total Pharmacies"
          value={data?.stats.totalPharmacies.value || 0}
          change={data?.stats.totalPharmacies.change || 0}
          icon={<Building2 className="w-6 h-6" />}
          tooltip={`Total number of registered pharmacies in the system. ${data?.stats.totalPharmacies.changeLabel || ''}`}
          changeLabel={data?.stats.totalPharmacies.changeLabel}
        />
        {/* <StatCard
          title="Active Distributors"
          value={data?.stats.activeDistributors.value || 0}
          change={data?.stats.activeDistributors.change || 0}
          icon={<Warehouse className="w-6 h-6" />}
          tooltip={`Number of currently active distributors. ${data?.stats.activeDistributors.changeLabel || ''}`}
          changeLabel={data?.stats.activeDistributors.changeLabel}
        /> */}
        {/* <StatCard
          title="Pending Documents"
          value={0}
          change={0}
          icon={<FileText className="w-6 h-6" />}
          tooltip="Return receipts awaiting approval"
        /> */}
        <StatCard
          title="Returns Value"
          value={data?.stats.returnsValue.value || 0}
          change={data?.stats.returnsValue.change || 0}
          icon={<DollarSign className="w-6 h-6" />}
          tooltip={`Total value of pharmaceutical returns. ${data?.stats.returnsValue.changeLabel || ''}`}
          isCurrency
          changeLabel={data?.stats.returnsValue.changeLabel}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Returns Value Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Returns Value Trend</h2>
          <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
            <ReturnsValueChart />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Recent Activity</h2>
          {isLoadingRecentActivity ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Loading activities...</p>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 max-h-[500px] overflow-y-auto">
              {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-2 sm:gap-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-900 break-words">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Quick Actions
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/pharmacies')}
            className="p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-900 text-center">Add Pharmacy</p>
          </button>
          <button
            onClick={() => router.push('/documents')}
            className="p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-900 text-center">Review Documents</p>
          </button>
          <button
            onClick={() => router.push('/payments')}
            className="p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-900 text-center">Process Payments</p>
          </button>
          <button
            onClick={() => router.push('/shipments')}
            className="p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 mx-auto mb-1 sm:mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-900 text-center">Track Shipments</p>
          </button>
        </div>
      </div> */}
    </div>
  );
}

