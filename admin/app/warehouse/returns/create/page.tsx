'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { useAppSelector } from '@/lib/store/hooks';

interface AssignedStore {
  assignmentId: string;
  pharmacyId: string;
  businessName: string;
  storeNumber: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  serviceType: string | null;
  lastVisitDate: string | null;
  nextVisitDate: string | null;
  assignedDate: string;
}

export default function CreateReturnPage() {
  const router = useRouter();
  const { user, token } = useAppSelector((state) => state.auth);
  const [stores, setStores] = useState<AssignedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<AssignedStore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'processor' && token) {
      fetchMyStores();
    } else {
      setError('Access denied. This page is for processors only.');
      setLoading(false);
    }
  }, [user, token]);

  const fetchMyStores = async () => {
    try {
      const { apiClient } = await import('@/lib/api/apiClient');
      const result = await apiClient.get('/processors/my-stores');
      setStores(result.data?.stores || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned stores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = async () => {
    if (!selectedStore) return;

    // TODO: This will be implemented in Module 3
    alert(`Creating return for ${selectedStore.businessName} (Store #${selectedStore.storeNumber})\n\nThis will be implemented in Module 3.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assigned stores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Return Transaction</h1>
        <p className="text-gray-600 mt-1">Select a store to create a new return transaction</p>
      </div>

      {/* Store Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Store</h2>
        
        {stores.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No stores assigned</p>
            <p className="text-sm text-gray-500">Contact your administrator to assign stores to your account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <div
                key={store.pharmacyId}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedStore?.pharmacyId === store.pharmacyId
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedStore(store)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">{store.businessName}</h3>
                      {store.storeNumber && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          Store #{store.storeNumber}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {store.city && store.state && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{store.city}, {store.state}</span>
                        </div>
                      )}
                      {store.lastVisitDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Last visit: {new Date(store.lastVisitDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {store.serviceType && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {store.serviceType.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Return Button */}
        {selectedStore && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-1">Selected Store</h3>
              <p className="text-blue-800">{selectedStore.businessName}</p>
              {selectedStore.storeNumber && (
                <p className="text-sm text-blue-600">Store #{selectedStore.storeNumber}</p>
              )}
            </div>
            
            <button
              onClick={handleCreateReturn}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              Create Return Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  );
}