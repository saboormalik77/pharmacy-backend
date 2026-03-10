"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Building2, 
  Search,
  X,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
} from 'lucide-react';
import { distributorsService, optimizationService, productListsService, type TopDistributor, type OptimizationRecommendations } from '@/lib/api/services';
import type { ProductListItem } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils/format';

interface DistributorRanking {
  distributor: TopDistributor;
  averagePricePerUnit: number;
  priceDifference: number; // Difference from recommended price
  totalDataPoints: number;
  rank: number;
}

export default function TopDistributorsPage() {
  const [distributors, setDistributors] = useState<TopDistributor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<ProductListItem | null>(null);
  const [distributorRankings, setDistributorRankings] = useState<DistributorRanking[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [optimizationData, setOptimizationData] = useState<OptimizationRecommendations | null>(null);
  const [optimizationLoading, setOptimizationLoading] = useState<boolean>(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<ProductListItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Fetch top distributors from API
  useEffect(() => {
    fetchTopDistributors();
  }, []);

  const fetchTopDistributors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await distributorsService.getTopDistributors();
      setDistributors(response.distributors);
    } catch (err: any) {
      setError(err.message || 'Failed to load top distributors');
      console.error('Error fetching top distributors:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter distributors based on search
  const filteredDistributors = distributors.filter(dist =>
    dist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dist.code.toLowerCase().includes(searchQuery.toLowerCase())
  );


  console.log({filteredDistributors});

  // Fetch inventory items from API
  const fetchInventoryItems = async () => {
    try {
      setInventoryLoading(true);
      setInventoryError(null);
      const items = await productListsService.getItems();
      
      // Transform API items to frontend format
      const transformed: ProductListItem[] = items.map((item: any) => ({
        id: item.id,
        ndc: item.ndc,
        productName: item.product_name,
        quantity: item.quantity,
        lotNumber: item.lot_number,
        expirationDate: item.expiration_date,
        notes: item.notes,
        addedAt: item.added_at,
        addedBy: item.added_by || '',
      }));
      
      setInventoryItems(transformed);
    } catch (err: any) {
      console.error('Error fetching inventory items:', err);
      setInventoryError(err.message || 'Failed to load inventory items');
    } finally {
      setInventoryLoading(false);
    }
  };

  // Handle Compare button click
  const handleCompare = async () => {
    setShowInventoryModal(true);
    // Fetch inventory items when modal opens
    await fetchInventoryItems();
  };

  // Handle inventory selection - call optimization API with NDC
  const handleSelectInventory = async (inventory: ProductListItem) => {
    setSelectedInventory(inventory);
    setShowInventoryModal(false);
    setIsComparing(true);
    setOptimizationLoading(true);
    setOptimizationError(null);
    setOptimizationData(null);
    setDistributorRankings([]);

    try {
      // Call optimization API with the product's NDC
      const data = await optimizationService.getRecommendations(inventory.ndc);
      setOptimizationData(data);
      
      // Build distributor rankings from optimization data
      if (data.recommendations.length > 0) {
        const rec = data.recommendations[0]; // Get first recommendation
        const recommendedPrice = rec.expectedPrice;
        const allDistributors: Array<{ name: string; price: number; difference: number; available: boolean }> = [];
        
        // Add recommended distributor (difference is 0 since it's the baseline)
        allDistributors.push({
          name: rec.recommendedDistributor,
          price: rec.expectedPrice,
          difference: 0,
          available: rec.available
        });
        
        // Add alternative distributors with their differences
        rec.alternativeDistributors.forEach(alt => {
          allDistributors.push({
            name: alt.name,
            price: alt.price,
            difference: alt.difference !== undefined && alt.difference !== null ? alt.difference : (alt.price - recommendedPrice),
            available: alt.available
          });
        });
        
        // Sort by price (lowest first - best deal)
        allDistributors.sort((a, b) => a.price - b.price);
        
        // Create rankings by matching distributor names with the distributors list
        const rankings: DistributorRanking[] = [];
        allDistributors.forEach((optDist, index) => {
          // Find matching distributor from the distributors list
          const matchingDist = distributors.find(d => d.name === optDist.name);
          if (matchingDist) {
            rankings.push({
              distributor: matchingDist,
              averagePricePerUnit: optDist.price,
              priceDifference: optDist.difference,
              totalDataPoints: matchingDist.documentCount || 0,
              rank: index + 1,
            });
          } else {
            // If distributor not found in list, create a basic entry
            rankings.push({
              distributor: {
                id: `opt-${index}`,
                name: optDist.name,
                code: '',
                active: optDist.available,
                email: '',
                phone: '',
                location: '',
                documentCount: 0,
              } as TopDistributor,
              averagePricePerUnit: optDist.price,
              priceDifference: optDist.difference,
              totalDataPoints: 0,
              rank: index + 1,
            });
          }
        });
        
        setDistributorRankings(rankings);
      }
    } catch (err: any) {
      // Check for token expiration (401 or 403)
      if (err.status === 401 || err.status === 403) {
        setOptimizationError('Session expired. Please login again.');
        return;
      }
      setOptimizationError(err.message || 'Failed to load optimization recommendations');
      console.error('Error fetching optimization data:', err);
    } finally {
      setOptimizationLoading(false);
    }
  };

  // Reset comparison
  const handleResetComparison = () => {
    setSelectedInventory(null);
    setIsComparing(false);
    setDistributorRankings([]);
    setOptimizationData(null);
    setOptimizationError(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-2 p-2">
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Top Distributors</h1>
            {/* <p className="text-xs text-gray-600 mt-0.5">Compare distributors and find the best returns</p> */}
          </div>
          <div className="flex items-center gap-2">
            {/* {!isComparing && (
              <Button 
                onClick={handleCompare}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Compare
              </Button>
            )}
            {isComparing && (
              <Button 
                onClick={handleResetComparison}
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )} */}
            {/* <Button 
              onClick={fetchTopDistributors}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Loader2 className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button> */}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 rounded text-xs bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="border-2 border-teal-200">
            <CardContent className="p-2 text-center py-8">
              <Loader2 className="h-6 w-6 mx-auto mb-2 text-teal-600 animate-spin" />
              <p className="text-xs text-gray-600">Loading top distributors...</p>
            </CardContent>
          </Card>
        )}

        {!loading && !isComparing ? (
          /* Distributors List View */
          <div className="space-y-3">
            {/* Search */}
            <Card className="border-2 border-teal-200">
              <CardContent className="p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search distributors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Distributors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDistributors.map((distributor) => (
                <Card key={distributor.id} className="border-2 border-teal-200 hover:border-teal-400 transition-colors">
                  <CardHeader className="p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-teal-100 rounded-lg">
                          <Building2 className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm sm:text-base">{distributor.name}</CardTitle>
                        </div>
                      </div>
                      {/* <div className="flex items-center gap-2">
                        {distributor.active === true ? (
                          <Badge variant="success" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">Used This Month</Badge>
                        )}
                      </div> */}
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2">
                    {distributor.email && (
                      <div className="text-xs">
                        <span className="text-gray-600">Email: </span>
                        <span className="font-medium">{distributor.email}</span>
                      </div>
                    )}
                    {distributor.phone && (
                      <div className="text-xs">
                        <span className="text-gray-600">Phone: </span>
                        <span className="font-medium">{distributor.phone}</span>
                      </div>
                    )}
                    {distributor.location && (
                      <div className="text-xs">
                        <span className="text-gray-600">Location: </span>
                        <span className="font-medium">{distributor.location}</span>
                      </div>
                    )}
                    {/* <div className="flex flex-wrap gap-1 pt-2">
                      {distributor.supportedFormats.map((format, idx) => (
                        <Badge key={idx} variant="info" className="text-xs">
                          {format}
                        </Badge>
                      ))}
                    </div> */}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredDistributors.length === 0 && (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-2 py-8 text-center">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-600">No distributors found matching your search.</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Comparison View */
          <div className="space-y-3">
            {/* Selected Inventory Info */}
            {selectedInventory && (
              <Card className="border-2 border-teal-200 bg-teal-50">
                <CardHeader className="p-2">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Package className="h-3 w-3 text-teal-600" />
                    Selected Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-600 mb-0.5">Product Name</p>
                      <p className="text-xs font-medium">{selectedInventory.productName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 mb-0.5">NDC</p>
                      <p className="text-xs font-mono font-medium">{selectedInventory.ndc}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 mb-0.5">Quantity</p>
                      <p className="text-xs font-medium">{selectedInventory.quantity}</p>
                    </div>
                    {selectedInventory.expirationDate && (
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5">Expiration</p>
                        <p className="text-xs font-medium">{formatDate(selectedInventory.expirationDate)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {optimizationLoading && (
              <Card className="border-2 border-teal-200">
                <CardContent className="p-2 text-center py-8">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 text-teal-600 animate-spin" />
                  <p className="text-xs text-gray-600">Loading optimization recommendations...</p>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {optimizationError && !optimizationLoading && (
              <Card className="border-2 border-red-200 bg-red-50">
                <CardContent className="p-2">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-xs">{optimizationError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Distributors Rankings */}
            {distributorRankings.length > 0 && (
              <div className="space-y-3">
                <Card className="border-2 border-teal-200">
                  <CardHeader className="p-2">
                    <CardTitle className="text-sm sm:text-base">Top Distributors Ranking</CardTitle>
                    <CardDescription className="text-xs">
                      Ranked by price per unit (best deal first)
                    </CardDescription>
                  </CardHeader>
                </Card>

                {distributorRankings.map((ranking, index) => {
                  const previousRanking = index > 0 ? distributorRankings[index - 1] : null;
                  const priceDiff = previousRanking 
                    ? ranking.averagePricePerUnit - previousRanking.averagePricePerUnit
                    : 0;
                  const isBest = ranking.rank === 1;

                  return (
                    <Card 
                      key={ranking.distributor.id} 
                      className={`border-2 ${
                        isBest 
                          ? 'border-yellow-400 bg-yellow-50' 
                          : 'border-teal-200'
                      }`}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {/* Rank Badge */}
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${
                              isBest 
                                ? 'bg-yellow-400 text-yellow-900' 
                                : ranking.rank === 2
                                ? 'bg-gray-300 text-gray-700'
                                : ranking.rank === 3
                                ? 'bg-orange-300 text-orange-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {ranking.rank}
                            </div>

                            {/* Distributor Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Building2 className="h-3 w-3 text-teal-600" />
                                <h3 className="text-xs font-bold">{ranking.distributor.name}</h3>
                                {isBest && (
                                  <Badge variant="success" className="text-xs">
                                    Best Return
                                  </Badge>
                                )}
                                {/* {ranking.distributor.active === true ? (
                                  <Badge variant="success" className="text-xs">Active</Badge>
                                ) : (
                                  <Badge variant="warning" className="text-xs">Used This Month</Badge>
                                )} */}
                                {/* Price Difference Badge */}
                                {ranking.priceDifference !== undefined && ranking.priceDifference !== null && !isNaN(ranking.priceDifference) && (
                                  ranking.priceDifference === 0 ? (
                                    <Badge variant="info" className="text-xs">
                                      Baseline (Recommended)
                                    </Badge>
                                  ) : ranking.priceDifference < 0 ? (
                                    <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                                      {formatCurrency(Math.abs(ranking.priceDifference))} better
                                    </Badge>
                                  ) : (
                                    <Badge className="text-xs bg-red-100 text-red-800 border-red-300">
                                      {formatCurrency(ranking.priceDifference)} more
                                    </Badge>
                                  )
                                )}
                              </div>
                              <div className="space-y-1 mt-2">
                                <div className="text-xs">
                                  <span className="text-gray-600">Price per unit: </span>
                                  <span className="font-medium text-emerald-700">{formatCurrency(ranking.averagePricePerUnit)}</span>
                                </div>
                                {ranking.distributor.email && (
                                  <div className="text-xs">
                                    <span className="text-gray-600">Email: </span>
                                    <span className="font-medium">{ranking.distributor.email}</span>
                                  </div>
                                )}
                                {ranking.distributor.phone && (
                                  <div className="text-xs">
                                    <span className="text-gray-600">Phone: </span>
                                    <span className="font-medium">{ranking.distributor.phone}</span>
                                  </div>
                                )}
                                {ranking.distributor.location && (
                                  <div className="text-xs">
                                    <span className="text-gray-600">Location: </span>
                                    <span className="font-medium">{ranking.distributor.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) }
          </div>
        )}

        {/* Inventory Selection Modal */}
        {showInventoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-teal-600" />
                  <h3 className="font-bold text-sm sm:text-base">Select Inventory to Compare</h3>
                </div>
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {inventoryLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 text-teal-600 animate-spin" />
                    <p className="text-xs text-gray-600">Loading inventory items...</p>
                  </div>
                ) : inventoryError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-400" />
                    <p className="text-xs text-red-600 mb-2">{inventoryError}</p>
                    <button
                      onClick={fetchInventoryItems}
                      className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs mx-auto"
                    >
                      Retry
                    </button>
                  </div>
                ) : inventoryItems.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-600 mb-2">No inventory items available.</p>
                    <p className="text-[10px] text-gray-500">
                      Please add products to your inventory first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inventoryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectInventory(item)}
                        className="w-full text-left p-2 border-2 border-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-xs">{item.productName}</p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                              <span>NDC: <span className="font-mono">{item.ndc}</span></span>
                              <span>Qty: {item.quantity}</span>
                              {item.lotNumber && <span>Lot: {item.lotNumber}</span>}
                              {item.expirationDate && (
                                <span>Exp: {formatDate(item.expirationDate)}</span>
                              )}
                            </div>
                          </div>
                          <CheckCircle2 className="h-3 w-3 text-teal-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

