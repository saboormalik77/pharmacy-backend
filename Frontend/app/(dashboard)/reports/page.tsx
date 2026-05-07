"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Search,
  Download,
  Filter,
  DollarSign,
  Building2,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { optimizationService, type OptimizationRecommendations, type Recommendation, type AlternativeDistributor } from '@/lib/api/services';
import { downloadExcel } from '@/lib/utils/excelExport';

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistributor, setSelectedDistributor] = useState<string>('all');
  const [optimizationData, setOptimizationData] = useState<OptimizationRecommendations | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Track selected distributor for each product (by NDC)
  const [selectedDistributors, setSelectedDistributors] = useState<Record<string, string>>({});
  // Track if this is the initial mount to prevent double fetch
  const isInitialMount = useRef(true);
  // Filter dropdown state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchMode, setSearchMode] = useState<'single' | 'multiple'>('single');
  const [multipleNdcInput, setMultipleNdcInput] = useState('');
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch optimization recommendations with optional NDC filter
  const fetchOptimizationData = useCallback(async (ndcParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      // Use provided parameter or fall back to searchQuery
      const ndc = ndcParam !== undefined ? ndcParam : (searchQuery.trim() || undefined);
      const data = await optimizationService.getRecommendations(ndc);
      setOptimizationData(data);
    } catch (err: any) {
      // Check for token expiration (401 or 403)
      // Note: apiClient already handles token expiration and redirects to login
      if (err.status === 401 || err.status === 403) {
        // Error already handled by apiClient, just set error message
        setError('Session expired. Please login again.');
        return;
      }
      setError(err.message || 'Failed to load optimization recommendations');
      console.error('Error fetching optimization data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Fetch immediately on mount
  useEffect(() => {
    fetchOptimizationData();
    isInitialMount.current = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Throttle search with debounce - fetch data when searchQuery changes (only for single mode)
  useEffect(() => {
    // Skip debounce on initial mount (already fetched above)
    if (isInitialMount.current) {
      return;
    }

    // Only debounce for single NDC mode
    if (searchMode !== 'single') {
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchOptimizationData();
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchMode, fetchOptimizationData]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  // Handle multiple NDC search button click
  const handleMultipleNdcSearch = () => {
    if (!multipleNdcInput.trim()) {
      return;
    }
    // Pass comma-separated NDCs to API
    fetchOptimizationData(multipleNdcInput.trim());
  };

  // Handle search mode change
  const handleSearchModeChange = (mode: 'single' | 'multiple') => {
    setSearchMode(mode);
    if (mode === 'single') {
      // Clear multiple input and reset to single search
      setMultipleNdcInput('');
      setSearchQuery('');
      fetchOptimizationData('');
    } else {
      // Clear single search input
      setSearchQuery('');
    }
  };

  // Get all distributors from recommendations
  const allDistributors = Array.from(
    new Set(
      optimizationData?.recommendations.flatMap(rec => [
        rec.recommendedDistributor,
        ...rec.alternativeDistributors.map(alt => alt.name)
      ]) || []
    )
  );

  // Filter by selected distributor (frontend filter only for distributor selection)
  const filteredByDistributor = selectedDistributor === 'all' 
    ? (optimizationData?.recommendations || [])
    : (optimizationData?.recommendations || []).filter(rec =>
        rec.recommendedDistributor === selectedDistributor ||
        rec.alternativeDistributors.some(alt => alt.name === selectedDistributor)
      );

  // Handle distributor selection
  const handleDistributorSelect = (ndc: string, distributorName: string) => {
    setSelectedDistributors(prev => ({
      ...prev,
      [ndc]: distributorName
    }));
  };

  // Process recommendation to reorder distributors and recalculate savings
  const getProcessedRecommendation = (rec: Recommendation) => {
    const selectedDist = selectedDistributors[rec.ndc];
    
    // If no selection or already the recommended one, return original
    if (!selectedDist || selectedDist === rec.recommendedDistributor) {
      return rec;
    }

    // Find the selected alternative distributor
    const selectedAlt = rec.alternativeDistributors.find(alt => alt.name === selectedDist);
    if (!selectedAlt) {
      return rec;
    }

    // Use worstPrice and quantity from the recommendation if available, otherwise calculate
    const worstPrice = rec.worstPrice ?? Math.max(
      rec.expectedPrice,
      ...rec.alternativeDistributors.map(alt => alt.price)
    );
    const quantity = rec.quantity ?? 1;

    // Calculate new savings: (newRecommended.price - worstPrice) × quantity
    const newSavings = (selectedAlt.price - worstPrice) * quantity;

    // Create new alternative distributors list (excluding selected one, adding old recommended)
    // Put the old recommended distributor at the top of alternatives
    const newAlternatives = [
      {
        name: rec.recommendedDistributor,
        price: rec.expectedPrice,
        difference: rec.expectedPrice - selectedAlt.price,
        available: rec.available
      },
      ...rec.alternativeDistributors.filter((alt: AlternativeDistributor) => alt.name !== selectedDist)
    ];

    // Return processed recommendation with selected distributor as recommended (moved to top)
    return {
      ...rec,
      recommendedDistributor: selectedAlt.name,
      expectedPrice: selectedAlt.price,
      available: selectedAlt.available,
      alternativeDistributors: newAlternatives,
      savings: newSavings
    };
  };

  // Calculate total potential savings from filtered and processed recommendations
  const calculateTotalSavings = (): number => {
    if (!optimizationData) return 0;
    
    // Use filteredByDistributor which already includes search and distributor filters
    return filteredByDistributor.reduce((total, rec) => {
      const processedRec = getProcessedRecommendation(rec);
      return total + processedRec.savings;
    }, 0);
  };

  // Export report to Excel with multiple sheets
  const handleExportReport = () => {
    if (!optimizationData) {
      return;
    }

    // Prepare stats data - Sheet 1: Statistics
    const statsData = [
      {
        'Metric': 'Products Analyzed',
        'Value': filteredByDistributor.length.toString()
      },
      {
        'Metric': 'Total Distributors',
        'Value': allDistributors.length.toString()
      },
      {
        'Metric': 'Total Recommendations',
        'Value': optimizationData.recommendations.length.toString()
      },
      {
        'Metric': 'Potential Savings (Filtered)',
        'Value': formatCurrency(calculateTotalSavings())
      },
      {
        'Metric': 'Total Potential Savings (All)',
        'Value': formatCurrency(optimizationData.totalPotentialSavings)
      },
      {
        'Metric': 'Generated Date',
        'Value': formatDate(optimizationData.generatedAt)
      },
      {
        'Metric': 'Distributors Used This Month',
        'Value': optimizationData.distributorUsage?.usedThisMonth?.toString() || '0'
      },
      {
        'Metric': 'Total Distributors Available',
        'Value': optimizationData.distributorUsage?.totalDistributors?.toString() || '0'
      },
      {
        'Metric': 'Distributors Still Available',
        'Value': optimizationData.distributorUsage?.stillAvailable?.toString() || '0'
      },
      {
        'Metric': 'Single Distributor Strategy Earnings',
        'Value': formatCurrency(optimizationData.earningsComparison?.singleDistributorStrategy || 0)
      },
      {
        'Metric': 'Multiple Distributors Strategy Earnings',
        'Value': formatCurrency(optimizationData.earningsComparison?.multipleDistributorsStrategy || 0)
      },
      {
        'Metric': 'Potential Additional Earnings',
        'Value': formatCurrency(optimizationData.earningsComparison?.potentialAdditionalEarnings || 0)
      }
    ];

    // Prepare recommended distributors data - Sheet 2: Recommended Distributors
    const recommendedDistributorsData = filteredByDistributor.map((rec) => {
      const processedRec = getProcessedRecommendation(rec);
      
      return {
        'Product Name': processedRec.productName,
        'NDC': processedRec.ndc,
        'Quantity': processedRec.quantity?.toString() || '1',
        'Recommended Distributor': processedRec.recommendedDistributor,
        'Recommended Price': formatCurrency(processedRec.expectedPrice),
        'Recommended Availability': processedRec.available ? 'Available' : 'Used This Month',
        'Potential Savings': formatCurrency(processedRec.savings),
        'Worst Price': formatCurrency(processedRec.worstPrice || processedRec.expectedPrice)
      };
    });

    // Prepare alternative distributors data - Sheet 3: Alternative Distributors
    const alternativeDistributorsData: Record<string, any>[] = [];
    
    filteredByDistributor.forEach((rec) => {
      const processedRec = getProcessedRecommendation(rec);
      
      // Create a row for each alternative distributor
      processedRec.alternativeDistributors.forEach((alt, index) => {
        alternativeDistributorsData.push({
          'Product Name': processedRec.productName,
          'NDC': processedRec.ndc,
          'Quantity': processedRec.quantity?.toString() || '1',
          'Alternative Number': `Alternative ${index + 1}`,
          'Distributor Name': alt.name,
          'Price': formatCurrency(alt.price),
          'Availability': alt.available ? 'Available' : 'Used This Month',
          'Price Difference': formatCurrency(alt.difference),
          'Recommended Distributor': processedRec.recommendedDistributor,
          'Recommended Price': formatCurrency(processedRec.expectedPrice),
          'Is Better Than Recommended': alt.difference < 0 ? 'Yes' : 'No'
        });
      });
    });

    // Create sheets array
    const sheets = [
      {
        name: 'Statistics',
        data: statsData
      },
      {
        name: 'Recommended Distributors',
        data: recommendedDistributorsData
      },
      {
        name: 'Alternative Distributors',
        data: alternativeDistributorsData.length > 0 ? alternativeDistributorsData : [{
          'Product Name': 'No alternative distributors available',
          'NDC': 'N/A',
          'Quantity': 'N/A',
          'Alternative Number': 'N/A',
          'Distributor Name': 'N/A',
          'Price': 'N/A',
          'Availability': 'N/A',
          'Price Difference': 'N/A',
          'Recommended Distributor': 'N/A',
          'Recommended Price': 'N/A',
          'Is Better Than Recommended': 'N/A'
        }]
      }
    ];

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `reports_export_${timestamp}.xlsx`;

    // Download the Excel file with multiple sheets
    downloadExcel(sheets, filename);
  };

  return (
    <DashboardLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-xs text-gray-600 mt-0.5">Price comparisons and market insights</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOptimizationData()}
              disabled={loading}
              className="border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              className="bg-teal-600 hover:bg-teal-700 text-white border-0"
              onClick={handleExportReport}
              disabled={!optimizationData || loading}
            >
              <Download className="mr-1 h-3 w-3" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-2 border-teal-200">
          <CardContent className="p-3">
            <div className="flex gap-2">
              {searchMode === 'single' ? (
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
                  <Input
                    placeholder="Search by NDC code"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              ) : (
                <div className="relative flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500" />
                    <Input
                      placeholder="Enter NDC codes (comma-separated)"
                      value={multipleNdcInput}
                      onChange={(e) => setMultipleNdcInput(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleMultipleNdcSearch}
                    disabled={!multipleNdcInput.trim() || loading}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Search
                  </Button>
                </div>
              )}
              <div className="relative" ref={filterDropdownRef}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Filter className="mr-1 h-3 w-3" />
                  More Filters
                  <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </Button>
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-teal-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Search Mode</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFilterDropdown(false)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSearchModeChange('single')}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            searchMode === 'single'
                              ? 'bg-teal-100 border-2 border-teal-500 text-teal-900'
                              : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Single NDC
                        </button>
                        <button
                          onClick={() => handleSearchModeChange('multiple')}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            searchMode === 'multiple'
                              ? 'bg-teal-100 border-2 border-teal-500 text-teal-900'
                              : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Multiple NDC
                        </button>
                      </div>
                      {searchMode === 'multiple' && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600">
                            Enter multiple NDC codes separated by commas (e.g., 12345-6789-01, 98765-4321-10)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="border-2 border-teal-200">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-teal-600 animate-spin" />
              <p className="text-gray-600">Loading optimization recommendations...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => fetchOptimizationData()} variant="outline" size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Optimization Recommendations */}
        {optimizationData && !loading && (
          <>
            {/* Summary Card */}
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700 font-medium mb-1">Total Potential Savings</p>
                    <p className="text-3xl font-bold text-emerald-900">
                      {formatCurrency(calculateTotalSavings())}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Based on {filteredByDistributor.length} {filteredByDistributor.length === 1 ? 'product' : 'products'} 
                      {searchQuery || selectedDistributor !== 'all' ? ' (filtered)' : ''}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Generated: {formatDate(optimizationData.generatedAt)}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-2 border-emerald-200">
                    <Sparkles className="h-12 w-12 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Comparisons */}
            <div className="space-y-3">
              {filteredByDistributor.length === 0 ? (
                <Card className="border-2 border-teal-200">
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No recommendations found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredByDistributor.map((rec, idx) => {
                  const processedRec = getProcessedRecommendation(rec);
                  return (
                  <Card key={idx} className="border-2 border-teal-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{processedRec.productName}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            NDC: <span className="font-mono">{processedRec.ndc}</span>
                          </p>
                        </div>
                        <Badge variant="success" className="text-xs">
                          Save {formatCurrency(processedRec.savings)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Recommended Distributor */}
                        <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <p className="text-sm font-semibold text-emerald-900">Recommended Distributor</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-base font-bold text-emerald-900">
                                  {processedRec.recommendedDistributor}
                                </p>
                                {processedRec.available ? (
                                  <Badge variant="info" className="text-xs">
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="text-xs">
                                    Used This Month
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-emerald-700 mt-1">
                                Expected Price: {formatCurrency(processedRec.expectedPrice)} per unit
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-emerald-600">Potential Savings</p>
                              <p className="text-lg font-bold text-emerald-700">
                                {formatCurrency(processedRec.savings)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Alternative Distributors */}
                        {processedRec.alternativeDistributors.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Alternative Options:</p>
                            <div className={`grid gap-3 ${
                              processedRec.alternativeDistributors.length === 1 
                                ? 'grid-cols-1' 
                                : 'grid-cols-1 md:grid-cols-2'
                            }`}>
                              {processedRec.alternativeDistributors.map((alt, altIdx) => {
                                const priceDiff = processedRec.expectedPrice - alt.price;
                                const isBetter = priceDiff < 0;
                                
                                return (
                                  <div
                                    key={altIdx}
                                    onClick={() => alt.available && handleDistributorSelect(processedRec.ndc, alt.name)}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                      !alt.available 
                                        ? 'border-gray-300 bg-gray-100 opacity-75 cursor-not-allowed' 
                                        : isBetter
                                        ? 'border-green-300 bg-green-50 cursor-pointer hover:border-green-400 hover:bg-green-100'
                                        : 'border-gray-200 bg-gray-50 cursor-pointer hover:border-teal-300 hover:bg-teal-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`text-sm font-semibold ${
                                          !alt.available ? 'text-gray-500' : ''
                                        }`}>
                                          {alt.name}
                                        </p>
                                        {!alt.available && (
                                          <Badge variant="warning" className="text-xs">
                                            Used This Month
                                          </Badge>
                                        )}
                                        {alt.available && (
                                          <Badge variant="info" className="text-xs">
                                            Available
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-start">
                                        {/* <span className="text-xs text-gray-600">Price: </span> */}
                                        <span className={`text-sm font-bold ${
                                          !alt.available ? 'text-gray-500' : 'text-emerald-700'
                                        }`}>
                                         Price:  {formatCurrency(alt.price)}/unit
                                        </span>
                                      </div>
                                      {alt.available && (
                                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                                          {isBetter ? (
                                            <>
                                              <TrendingUp className="h-3 w-3 text-green-600" />
                                              <span className="text-xs text-green-600 font-medium">
                                                {formatCurrency(Math.abs(priceDiff))} better than recommended
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <TrendingDown className="h-3 w-3 text-red-600" />
                                              <span className="text-xs text-red-600 font-medium">
                                                {formatCurrency(priceDiff)} more than recommended
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                      {alt.available && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <span className="text-xs text-teal-600 font-medium">
                                            Click to select as recommended
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Recommendation Summary */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-blue-900 mb-1">Recommendation</p>
                              <p className="text-sm text-blue-800">
                                Use {processedRec.recommendedDistributor} for the best price at {formatCurrency(processedRec.expectedPrice)} per unit.
                              </p>
                              <p className="text-xs text-blue-700 mt-2">
                                Potential savings: {formatCurrency(processedRec.savings)} compared to alternatives
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Summary Statistics */}
        {optimizationData && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="border-2 border-teal-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-teal-600" />
                  <p className="text-xs font-medium text-teal-700">Products Analyzed</p>
                </div>
                <p className="text-xl font-bold text-teal-900">{filteredByDistributor.length}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-cyan-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-cyan-600" />
                  <p className="text-xs font-medium text-cyan-700">Distributors</p>
                </div>
                <p className="text-xl font-bold text-cyan-900">{allDistributors.length}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-emerald-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-medium text-emerald-700">Total Recommendations</p>
                </div>
                <p className="text-xl font-bold text-emerald-900">{optimizationData.recommendations.length}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-purple-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-medium text-purple-700">Potential Savings</p>
                </div>
                <p className="text-xl font-bold text-purple-900">
                  {formatCurrency(calculateTotalSavings())}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

