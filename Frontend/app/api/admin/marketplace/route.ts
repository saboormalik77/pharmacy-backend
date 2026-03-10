import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/client';
import { MarketplaceListResponse, MarketplaceDeal } from '@/lib/api/services/marketplaceService';

/**
 * GET /api/admin/marketplace
 * Get list of marketplace deals with stats
 * Each product includes an isDealOfTheDay boolean field
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params: Record<string, any> = {};

    // Extract query parameters
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

    if (page) params.page = parseInt(page);
    if (limit) params.limit = parseInt(limit);
    if (search) params.search = search;
    if (category) params.category = category;
    if (status) params.status = status;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    // Fetch marketplace deals from backend
    const response = await apiClient.getApiWithoutPharmacyId<MarketplaceListResponse>(
      '/admin/marketplace',
      params
    );

    if (response.status === 'success' && response.data) {
      // Fetch the deal of the day to determine which deals are "deal of the day"
      let dealOfTheDayId: string | null = null;
      try {
        const dealOfTheDayResponse = await apiClient.getApiWithoutPharmacyId<{ deal: MarketplaceDeal | null }>(
          '/marketplace/deal-of-the-day'
        );
        if (dealOfTheDayResponse.status === 'success' && dealOfTheDayResponse.data?.deal) {
          dealOfTheDayId = dealOfTheDayResponse.data.deal.id;
        }
      } catch (error) {
        // If deal of the day endpoint fails, continue without it
        console.warn('Failed to fetch deal of the day:', error);
      }

      // Add isDealOfTheDay field to each deal
      const dealsWithDealOfTheDay = response.data.deals.map((deal) => ({
        ...deal,
        isDealOfTheDay: deal.id === dealOfTheDayId,
      }));

      return NextResponse.json({
        status: 'success',
        data: {
          deals: dealsWithDealOfTheDay,
          stats: response.data.stats,
          pagination: response.data.pagination,
        },
      });
    }

    // If backend response doesn't have data, return error
    return NextResponse.json(
      {
        status: 'error',
        message: response.message || 'Failed to fetch marketplace deals',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Admin marketplace API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Internal server error',
      },
      { status: error.status || 500 }
    );
  }
}

