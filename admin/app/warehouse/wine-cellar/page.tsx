'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Search, Filter, Package } from 'lucide-react';
import { useAppSelector } from '@/lib/store/hooks';

export default function WineCellarPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');

  if (user?.role !== 'processor') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">Access denied. This page is for processors only.</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Wine Cellar</h1>
        <p className="text-gray-600 mt-1">Products stored for future return processing</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stored products by NDC, name, or store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Wine Cellar Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Wine Cellar is Empty</h3>
          <p className="text-gray-600 mb-6">
            No products are currently stored in the wine cellar. Products will appear here when they are marked as "TBD" (To Be Determined) during return processing.
          </p>
          
          {/* Info Box */}
          <div className="max-w-md mx-auto bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              What is the Wine Cellar?
            </h4>
            <p className="text-sm text-gray-600">
              The Wine Cellar stores products that cannot be immediately classified as returnable or non-returnable. 
              These products require further investigation before final disposition.
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">🚧 Under Development</h3>
        <p className="text-blue-800">
          The Wine Cellar management system will be implemented in Module 4. 
          This includes product storage, investigation tracking, and final disposition workflows.
        </p>
      </div>
    </div>
  );
}