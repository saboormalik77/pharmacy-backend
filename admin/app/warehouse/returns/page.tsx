'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Search, Filter } from 'lucide-react';
import { useAppSelector } from '@/lib/store/hooks';

export default function ReturnsPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');

  // Placeholder data - will be implemented in Module 3
  const returns = [];

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Return Transactions</h1>
          <p className="text-gray-600 mt-1">Manage and track return transactions for your assigned stores</p>
        </div>
        
        <button
          onClick={() => router.push('/warehouse/returns/create')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Return
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search returns by store name, return ID, or product..."
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

      {/* Returns List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Return Transactions</h3>
          <p className="text-gray-600 mb-6">
            You haven't created any return transactions yet. Start by creating your first return.
          </p>
          <button
            onClick={() => router.push('/warehouse/returns/create')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Create Your First Return
          </button>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">🚧 Under Development</h3>
        <p className="text-blue-800">
          The full return transaction management system will be implemented in Module 3. 
          This includes creating returns, tracking status, managing products, and generating reports.
        </p>
      </div>
    </div>
  );
}