"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { DealHero } from '@/components/marketplace/DealHero';
import { DealCard } from '@/components/marketplace/DealCard';
import { DealModal } from '@/components/marketplace/DealModal';
import { CartDrawer } from '@/components/marketplace/CartDrawer';
import { Toast } from '@/components/marketplace/Toast';
import { useMarketplaceStore } from '@/lib/store/marketplaceStore';
import type { MarketplaceDeal } from '@/lib/api/services/marketplaceService';
import { ArrowDown, Filter, Loader2, Package, Search, X } from 'lucide-react';

type SortOption = 'posted_date' | 'expiry_date' | 'deal_price' | 'savings' | 'product_name';
type StatusFilter = 'all' | 'active' | 'sold' | 'expired';

export default function MarketplacePage() {
  const [sortBy, setSortBy] = useState<SortOption>('posted_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const {
    deals,
    featuredDeal,
    featuredDeals,
    featuredDealType,
    stats,
    pagination,
    categories,
    isLoadingDeals,
    dealsError,
    cartError,
    fetchDeals,
    fetchDealOfTheDay,
    fetchCategories,
    fetchCart,
  } = useMarketplaceStore();

  // Get the title for the featured deal section based on type
  const getFeaturedDealTitle = () => {
    switch (featuredDealType) {
      case 'day':
        return 'Deal of the Day';
      case 'week':
        return 'Deal of the Week';
      case 'month':
        return 'Deal of the Month';
      default:
        return 'Featured Deal';
    }
  };

  // Initial data fetch (non-filter related)
  useEffect(() => {
    fetchDealOfTheDay(); // Fetch Deal of the Day first
    fetchCategories();
    fetchCart();
  }, []);

  // Fetch deals when filters change (includes initial load with default filters)
  useEffect(() => {
    const filters = {
      page: 1,
      limit: 12,
      sortBy,
      sortOrder,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      category: categoryFilter || undefined,
      search: searchQuery || undefined,
    };
    fetchDeals(filters);
  }, [sortBy, sortOrder, statusFilter, categoryFilter, searchQuery]);

  // Show toast on cart error
  useEffect(() => {
    if (cartError) {
      handleShowToast(cartError);
    }
  }, [cartError]);

  const handleShowToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchDeals({ page: pagination.page + 1 });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('active');
    setSortBy('posted_date');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchQuery || categoryFilter || statusFilter !== 'all';

  return (
    <DashboardLayout>
      <PermissionGuard permission="marketplace:view">
      <div className="space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Marketplace</h1>
            <p className="text-xs text-muted-foreground">
              Discover exclusive pharmaceutical deals and special offers
              {stats && (
                <span className="ml-2">
                  • <span className="font-semibold text-primary">{stats.activeDeals}</span> active deals
                  • Avg <span className="font-semibold text-green-600">{stats.avgSavings.toFixed(0)}%</span> savings
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by product name, NDC, distributor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-2 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label} ({cat.count})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 px-2 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="expired">Expired</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-8 px-2 text-xs border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="posted_date">Newest First</option>
            <option value="expiry_date">Expiring Soon</option>
            <option value="savings">Highest Discount</option>
            <option value="deal_price">Lowest Price</option>
            <option value="product_name">A-Z</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-8 px-2 text-xs border rounded-lg bg-background hover:bg-accent transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-8 px-2 text-xs border border-destructive/30 text-destructive rounded-lg bg-background hover:bg-destructive/10 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Error State */}
        {dealsError && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {dealsError}
          </div>
        )}

        {/* Loading State */}
        {isLoadingDeals && deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading marketplace deals...</p>
          </div>
        ) : (
          <>
          <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold">More Deals</h2>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      // Count featured deals (day, week, month)
                      const featuredDealsCount = (featuredDeals?.dealOfTheDay ? 1 : 0) + 
                                                 (featuredDeals?.dealOfTheWeek ? 1 : 0) + 
                                                 (featuredDeals?.dealOfTheMonth ? 1 : 0);
                      
                      // Get marketplace deals total (from pagination)
                      const marketplaceDealsCount = pagination?.total || 0;
                      
                      // Calculate total deals (featured + marketplace)
                      const totalDeals = featuredDealsCount + marketplaceDealsCount;
                      
                      if (totalDeals > 0) {
                        return `${totalDeals} deal${totalDeals !== 1 ? 's' : ''} found`;
                      }
                      
                      return 'Browse available deals';
                    })()}
                  </p>
                </div>
              </div>
            {/* Featured Deal Hero Section - Show only priority deal (Day > Week > Month) */}
            {featuredDeal && featuredDealType && (
              <DealHero 
                deal={featuredDeal} 
                onShowToast={handleShowToast}
                dealType={featuredDealType}
              />
            )}

            {/* More Deals Section */}
            <section>
              

              {/* Empty State */}
              {deals.length === 0 && !isLoadingDeals ? (
                <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-lg border border-dashed">
                  <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-base font-bold mb-1">No deals found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasActiveFilters 
                      ? 'Try adjusting your filters to see more deals'
                      : 'Check back later for new marketplace deals'
                    }
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Deals Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {deals.map((deal) => (
                      <DealCard 
                        key={deal.id} 
                        deal={deal} 
                        onShowToast={handleShowToast}
                        featuredDealType={featuredDealType}
                      />
                    ))}
                  </div>

                  {/* Load More */}
                  {pagination && pagination.page < pagination.totalPages && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingDeals}
                        className="px-3 py-1.5 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md flex items-center gap-1 text-xs font-medium transition-all disabled:opacity-50"
                      >
                        {isLoadingDeals ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load More Deals
                            <ArrowDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>

      {/* Global Components */}
      <DealModal onShowToast={handleShowToast} />
      <CartDrawer />
      <Toast
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
      />
      </PermissionGuard>
    </DashboardLayout>
  );
}
