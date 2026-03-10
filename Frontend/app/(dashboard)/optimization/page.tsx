"use client";

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2, AlertCircle, RefreshCw, X, Search, Check, Filter, Download, TrendingDown, BarChart3, Plus, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { optimizationService, returnsService, distributorsService, type OptimizationRecommendations, type Recommendation } from '@/lib/api/services';
import { downloadExcel } from '@/lib/utils/excelExport';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Custom scrollbar styles
const scrollbarStyles = `
  .distributor-menu-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .distributor-menu-scroll::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 4px;
  }
  .distributor-menu-scroll::-webkit-scrollbar-thumb {
    background: #14b8a6;
    border-radius: 4px;
  }
  .distributor-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: #0d9488;
  }
`;

export default function OptimizationPage() {
  const [recommendation, setRecommendation] = useState<OptimizationRecommendations | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Track selected distributor for each product (by NDC)
  const [selectedDistributors, setSelectedDistributors] = useState<Record<string, string>>({});
  // Track editable quantities for each product (by NDC) - separate for full and partial
  const [editableFullQuantities, setEditableFullQuantities] = useState<Record<string, number>>({});
  const [editablePartialQuantities, setEditablePartialQuantities] = useState<Record<string, number>>({});
  // Search state
  const [ndcSearchInput, setNdcSearchInput] = useState<string>('');
  interface NdcItem {
    ndc: string;
  }
  const [selectedNdcs, setSelectedNdcs] = useState<NdcItem[]>([]);
  const [activeNdcFilter, setActiveNdcFilter] = useState<string | undefined>(undefined);
  const [statsModalOpen, setStatsModalOpen] = useState<boolean>(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [statsSummary, setStatsSummary] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsProduct, setStatsProduct] = useState<{ ndc: string; productName: string; distributorName: string } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // Track which dropdown is open (by NDC)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const router = useRouter();

  // No longer fetching distributors - using IDs directly from recommendation data

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.distributor-dropdown') && !target.closest('.distributor-menu-overlay')) {
        setOpenDropdown(null);
        setDropdownPosition(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdown]);

  // Removed auto-fetch on mount - only fetch when user searches

  const fetchRecommendations = async (items?: Array<{ ndc: string }>) => {
    try {
      setLoading(true);
      setError(null);
      // Convert to format expected by API (with fullCount and partialCount as 0 since we're not using them)
      const apiItems = items?.map(item => ({ ndc: item.ndc, fullCount: 0, partialCount: 0 }));
      const data = await optimizationService.getRecommendations(apiItems);
      setRecommendation(data);
      // Reset selections when fetching new data
      setSelectedDistributors({});
      // Initialize editable quantities with default value of 1
      const initialFullQuantities: Record<string, number> = {};
      const initialPartialQuantities: Record<string, number> = {};
      data.recommendations.forEach(rec => {
        initialFullQuantities[rec.ndc] = 1;
        initialPartialQuantities[rec.ndc] = 1;
      });
      setEditableFullQuantities(initialFullQuantities);
      setEditablePartialQuantities(initialPartialQuantities);
    } catch (err: any) {
      setError(err.message || 'Failed to load optimization recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get the displayed distributor and price for a product
  const getDisplayedData = (rec: Recommendation) => {
    const selectedDist = selectedDistributors[rec.ndc];
    const recAny = rec as any;
    // Use editable quantities, default to 1 if not set
    const fullQuantity = editableFullQuantities[rec.ndc] ?? 1;
    const partialQuantity = editablePartialQuantities[rec.ndc] ?? 1;
    
    // For recommended distributor, use fullPricePerUnit and partialPricePerUnit
    // For alternative distributors, use fullPrice and partialPrice
    let fullPrice = recAny.fullPricePerUnit ?? 0;
    let partialPrice = recAny.partialPricePerUnit ?? 0;
    
    if (selectedDist && selectedDist !== rec.recommendedDistributor) {
      // Find the selected alternative distributor
      const selectedAlt = rec.alternativeDistributors.find(alt => alt.name === selectedDist);
      if (selectedAlt) {
        const altAny = selectedAlt as any;
        // Use fullPrice and partialPrice from alternative distributor
        fullPrice = altAny.fullPrice ?? 0;
        partialPrice = altAny.partialPrice ?? 0;
      }
    }
    
    const totalPrice = (fullPrice * fullQuantity) + (partialPrice * partialQuantity);
    
    return {
      distributor: selectedDist && selectedDist !== rec.recommendedDistributor 
        ? selectedDist 
        : rec.recommendedDistributor,
      fullPrice: fullPrice,
      partialPrice: partialPrice,
      fullQuantity: fullQuantity,
      partialQuantity: partialQuantity,
      totalPrice: totalPrice,
    };
  };

  // Handle quantity change for full
  const handleFullQuantityChange = (ndc: string, newQuantity: number) => {
    if (newQuantity < 0) return; // Prevent negative quantities
    setEditableFullQuantities(prev => ({
      ...prev,
      [ndc]: newQuantity,
    }));
  };

  // Handle quantity change for partial
  const handlePartialQuantityChange = (ndc: string, newQuantity: number) => {
    if (newQuantity < 0) return; // Prevent negative quantities
    setEditablePartialQuantities(prev => ({
      ...prev,
      [ndc]: newQuantity,
    }));
  };

  // Calculate savings for a product based on selected distributor
  const calculateProductSavings = (rec: Recommendation): number => {
    const selectedDist = selectedDistributors[rec.ndc];
    
    if (selectedDist && selectedDist !== rec.recommendedDistributor) {
      const selectedAlt = rec.alternativeDistributors.find(alt => alt.name === selectedDist);
      if (selectedAlt) {
        // Savings = (worstPrice - selectedPrice) * quantity
        return (rec.worstPrice - selectedAlt.price) * rec.quantity;
      }
    }
    
    // Default savings from recommendation
    return rec.savings || 0;
  };

  // Calculate total potential savings with top distributor (all recommended): sum of total prices
  const topDistributorTotal = useMemo(() => {
    if (!recommendation) return 0;
    return recommendation.recommendations.reduce((total, rec) => {
      const recAny = rec as any;
      const fullPrice = recAny.fullPricePerUnit ?? 0;
      const partialPrice = recAny.partialPricePerUnit ?? 0;
      // Use default quantity of 1 for calculations
      const fullQty = editableFullQuantities[rec.ndc] ?? 1;
      const partialQty = editablePartialQuantities[rec.ndc] ?? 1;
      return total + (fullPrice * fullQty) + (partialPrice * partialQty);
    }, 0);
  }, [recommendation, editableFullQuantities, editablePartialQuantities]);

  // Calculate total potential savings: sum of total prices for all displayed products
  const totalSavings = useMemo(() => {
    if (!recommendation) return 0;
    return recommendation.recommendations.reduce((total, rec) => {
      const displayedData = getDisplayedData(rec);
      return total + displayedData.totalPrice;
    }, 0);
  }, [recommendation, selectedDistributors, editableFullQuantities, editablePartialQuantities]);

  // Calculate loss: difference between top distributor total and current total
  const lossAmount = useMemo(() => {
    return topDistributorTotal - totalSavings;
  }, [topDistributorTotal, totalSavings]);

  // Get all distributors for the selected product (including recommended)
  const getAllDistributors = (rec: Recommendation) => {
    const recAny = rec as any;
    const distributors = [
      {
        name: rec.recommendedDistributor,
        id: recAny.recommendedDistributorId || '', // Use recommendedDistributorId from recommendation
        fullPrice: recAny.fullPricePerUnit ?? 0,
        partialPrice: recAny.partialPricePerUnit ?? 0,
        price: rec.expectedPrice, // Keep for backward compatibility in dropdown
        isRecommended: true,
      },
      ...rec.alternativeDistributors.map(alt => {
        const altAny = alt as any;
        return {
          name: alt.name,
          id: altAny.id || '', // Use id from alternativeDistributors array
          fullPrice: altAny.fullPrice ?? 0,
          partialPrice: altAny.partialPrice ?? 0,
          price: alt.price, // Keep for backward compatibility in dropdown
          isRecommended: false,
        };
      }),
    ];
    return distributors;
  };

  // Handle distributor selection
  const handleSelectDistributor = (ndc: string, distributorName: string) => {
    setSelectedDistributors(prev => ({
      ...prev,
      [ndc]: distributorName
    }));
  };

  // Check if NDC already exists
  const isDuplicateNdc = (ndc: string): boolean => {
    return selectedNdcs.some(item => item.ndc === ndc);
  };

  // Handle add NDC to list
  const handleAddNdc = () => {
    const trimmedNdc = ndcSearchInput.trim();
    if (!trimmedNdc) {
      setError('Please enter an NDC code');
      return;
    }

    // Check if same NDC already exists
    if (isDuplicateNdc(trimmedNdc)) {
      setError('This NDC is already added');
      return;
    }

    const newItem: NdcItem = {
      ndc: trimmedNdc,
    };

    setSelectedNdcs([...selectedNdcs, newItem]);
    setNdcSearchInput('');
    setError(null);
  };

  // Handle remove NDC from list
  const handleRemoveNdc = (ndcToRemove: string) => {
    setSelectedNdcs(selectedNdcs.filter(item => item.ndc !== ndcToRemove));
  };

  // Handle custom search
  const handleCustomSearch = async () => {
    if (selectedNdcs.length === 0) {
      setError('Please add at least one NDC code to search');
      return;
    }
    
      // Build array of items with just ndc
      const items = selectedNdcs.map(item => ({
        ndc: item.ndc,
      }));
      
      // Store string representation for display/retry
      const ndcValue = items.map(item => item.ndc).join(',');
      setActiveNdcFilter(ndcValue);
      
    setSearchLoading(true);
    setError(null);
    try {
      // Convert to format expected by API (with fullCount and partialCount as 0 since we're not using them)
      const apiItems = items.map(item => ({ ndc: item.ndc, fullCount: 0, partialCount: 0 }));
      const data = await optimizationService.getRecommendations(apiItems);
      setRecommendation(data);
      setSelectedDistributors({});
      // Initialize editable quantities with default value of 1
      const initialFullQuantities: Record<string, number> = {};
      const initialPartialQuantities: Record<string, number> = {};
      data.recommendations.forEach(rec => {
        initialFullQuantities[rec.ndc] = 1;
        initialPartialQuantities[rec.ndc] = 1;
      });
      setEditableFullQuantities(initialFullQuantities);
      setEditablePartialQuantities(initialPartialQuantities);
    } catch (err: any) {
      setError(err.message || 'Failed to load optimization recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setNdcSearchInput('');
    setSelectedNdcs([]);
    setActiveNdcFilter(undefined);
    setRecommendation(null);
    setError(null);
  };

  // Handle view stats
  const handleViewStats = async (rec: Recommendation) => {
    const displayedData = getDisplayedData(rec);
    const distributorName = displayedData.distributor;
    
    // Get distributor ID directly from recommendation data
    let distributorId: string | null = null;
    const recAny = rec as any;
    
    if (distributorName === rec.recommendedDistributor) {
      // Use recommendedDistributorId for recommended distributor
      distributorId = recAny.recommendedDistributorId || null;
    } else {
      // Find the alternative distributor and use its id
      const altDist = rec.alternativeDistributors.find(alt => alt.name === distributorName);
      const altDistAny = altDist as any;
      distributorId = altDistAny?.id || null;
    }

    if (!distributorId) {
      setError(`Distributor ID not found for ${distributorName}. Please try again.`);
      return;
    }

    // Determine type based on which value is greater than 0
    // Check rec.full and rec.partial from the recommendation data
    const fullValue = recAny.full ?? 0;
    const partialValue = recAny.partial ?? 0;
    
    // Set type to "full" if full > 0, otherwise "partial" if partial > 0
    // If both are 0 or both are > 0, default to "full"
    const type = fullValue > 0 ? 'full' : (partialValue > 0 ? 'partial' : 'full');

    setStatsProduct({
      ndc: rec.ndc,
      productName: rec.productName,
      distributorName: distributorName,
    });
    setStatsModalOpen(true);
    setStatsLoading(true);
    setStatsData([]);
    setStatsSummary(null);
    setError(null);

    try {
      const response = await returnsService.searchReturnReports(distributorId, rec.ndc, 'graph', type);
      const data = response.data || response;
      
      if (!data || !data.dataPoints) {
        setError('Invalid data format received from API');
        return;
      }

      const dataPoints = data.dataPoints || [];
      
      if (dataPoints.length > 0) {
        // Format dataPoints for chart - use date and pricePerUnit
        const chartData = dataPoints.map((point: any) => ({
          date: point.date || '',
          price: point.pricePerUnit || 0,
        }));
        setStatsData(chartData);
        
        // Set summary if available
        const summary = data.summary || {};
        if (summary.priceStats) {
          setStatsSummary({
            dateRange: summary.dateRange || {},
            priceStats: summary.priceStats || {},
            totalRecords: summary.totalRecords || 0,
            totalQuantity: summary.totalQuantity || 0,
            totalCreditAmount: summary.totalCreditAmount || 0,
          });
        } else {
          setStatsSummary(null);
        }
      } else {
        setError('No data points available');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Handle export to Excel
  const handleExportReport = () => {
    if (!recommendation) {
      return;
    }

    // Sheet 1: Total Savings
    const totalSavingsData = [
      {
        'Metric': 'Total Potential Savings',
        'Value': formatCurrency(totalSavings)
      },
      {
        'Metric': 'Generated Date',
        'Value': formatDate(recommendation.generatedAt)
      },
      {
        'Metric': 'Total Products',
        'Value': recommendation.recommendations.length.toString()
      },
    ];

    // Sheet 2: Main Page Distributor Data
    const distributorData = recommendation.recommendations.map((rec) => {
      const displayedData = getDisplayedData(rec);
      return {
        'Product Name': rec.productName,
        'NDC': rec.ndc,
        'Full Quantity': displayedData.fullQuantity.toString(),
        'Partial Quantity': displayedData.partialQuantity.toString(),
        'Recommended Distributor': displayedData.distributor,
        'Full Price': formatCurrency(displayedData.fullPrice),
        'Partial Price': formatCurrency(displayedData.partialPrice),
        'Total Price': formatCurrency(displayedData.totalPrice)
      };
    });

    // Create sheets array
    const sheets = [
      {
        name: 'Total Savings',
        data: totalSavingsData
      },
      {
        name: 'Distributor Data',
        data: distributorData.length > 0 ? distributorData : [{
          'Product Name': 'No data available',
          'NDC': 'N/A',
          'Quantity': 'N/A',
          'Recommended Distributor': 'N/A',
          'Price': 'N/A',
          'Total Value': 'N/A'
        }]
      }
    ];

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `optimization_export_${timestamp}.xlsx`;

    // Download the Excel file with multiple sheets
    downloadExcel(sheets, filename);
  };


  return (
    <DashboardLayout>
      <style jsx>{scrollbarStyles}</style>
      <div className="space-y-2 p-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Search Recommendations</h1>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {/* <button
              onClick={() => router.push('/packages')}
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs"
            >
              <span className="hidden sm:inline">Packages Management</span>
              <span className="sm:hidden">Packages</span>
            </button> */}
            <button
              onClick={handleExportReport}
              disabled={!recommendation || loading}
              className="px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
            >
              <Download className="h-3 w-3" />
              <span className="sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Search Bar - Simplified */}
        <Card className="border-2 border-teal-200">
            <CardContent className="p-2">
              <div className="space-y-2">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-red-800">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-600 hover:text-red-800 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Selected NDCs as Chips */}
                {selectedNdcs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedNdcs.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-xs"
                      >
                        <span>{item.ndc}</span>
                        <button
                          onClick={() => handleRemoveNdc(item.ndc)}
                          className="hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                          aria-label={`Remove ${item.ndc}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {/* NDC Input */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter NDC code"
                      value={ndcSearchInput}
                      onChange={(e) => setNdcSearchInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNdc();
                        }
                      }}
                      className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col justify-end sm:flex-row items-stretch sm:items-center gap-1">
                    <button
                      onClick={handleAddNdc}
                      disabled={
                        !ndcSearchInput.trim() || 
                        isDuplicateNdc(ndcSearchInput.trim())
                      }
                      className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs font-medium"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                    <button
                      onClick={handleCustomSearch}
                      disabled={selectedNdcs.length === 0 || searchLoading}
                      className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs font-medium"
                    >
                      {searchLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-3 w-3" />
                          <span>Search</span>
                        </>
                      )}
                    </button>
                    {activeNdcFilter && (
                      <button
                        onClick={handleClearSearch}
                        className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs font-medium"
                      >
                        <X className="h-3 w-3" />
                        <span className=" sm:inline">Clear</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Total Potential Savings */}
        {/* <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Potential Savings</p>
                {loading || searchLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-teal-600" />
                  </div>
                ) : recommendation ? (
                  <div className="space-y-2">
                    <p className="text-2xl sm:text-3xl font-bold text-teal-700 break-words">{formatCurrency(topDistributorTotal)}</p>
                    {lossAmount > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-gray-600">Loss from distributor:</p>
                        <p className="text-base sm:text-lg font-semibold text-red-600">{formatCurrency(lossAmount)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl sm:text-3xl font-bold text-teal-700">$0.00</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card> */}

        <Card>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[180px]">Product Name</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[120px]">NDC</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[100px]">Full Qty</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[100px]">Partial Qty</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[200px]">Recommended Distributor</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[100px]">Full Price</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[100px]">Partial Price</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[100px]">Total Price</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading || searchLoading ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                          <p className="text-xs text-gray-600">Searching recommendations...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error && !recommendation ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                          <p className="text-xs text-gray-600">{error || 'No recommendations available'}</p>
                          <button
                            onClick={() => {
                              const items = selectedNdcs.map(item => ({
                                ndc: item.ndc,
                              }));
                              fetchRecommendations(items);
                            }}
                            className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-1 text-xs"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : recommendation && recommendation.recommendations.length > 0 ? (
                    recommendation.recommendations.map((rec, index) => {
                      const displayedData = getDisplayedData(rec);
                      return (
                        <tr
                          key={`${rec.ndc}-${index}`}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-2 py-1.5 text-xs text-gray-900">{rec.productName}</td>
                          <td className="px-2 py-1.5 text-xs font-mono text-gray-600">{rec.ndc}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              value={displayedData.fullQuantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 0;
                                handleFullQuantityChange(rec.ndc, newQuantity);
                              }}
                              className="w-14 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              value={displayedData.partialQuantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 0;
                                handlePartialQuantityChange(rec.ndc, newQuantity);
                              }}
                              className="w-14 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="relative distributor-dropdown">
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (openDropdown === rec.ndc) {
                                    setOpenDropdown(null);
                                    setDropdownPosition(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const viewportWidth = window.innerWidth;
                                    
                                    // Always position directly below the button
                                    const top = rect.bottom + window.scrollY + 4;
                                    
                                    // Ensure it doesn't go off screen horizontally
                                    let left = rect.left + window.scrollX;
                                    const menuWidth = 320;
                                    if (left + menuWidth > viewportWidth) {
                                      left = viewportWidth - menuWidth - 16;
                                    }
                                    if (left < 16) {
                                      left = 16;
                                    }
                                    
                                    setDropdownPosition({
                                      top,
                                      left,
                                      width: menuWidth
                                    });
                                    setOpenDropdown(rec.ndc);
                                  }
                                }}
                                className="w-full min-w-[160px] px-2 py-1 text-xs border-2 border-teal-200 rounded-lg bg-white text-gray-900 hover:border-teal-300 transition-all font-medium shadow-sm hover:shadow-md flex items-center justify-between gap-1"
                              >
                                <div className="flex items-center gap-1 flex-1">
                                  <span className="truncate">{displayedData.distributor}</span>
                                  {getAllDistributors(rec).find(d => d.name === (selectedDistributors[rec.ndc] || rec.recommendedDistributor))?.isRecommended && (
                                    <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                                      <Check className="h-2.5 w-2.5 inline mr-0.5" />
                                      Rec
                                    </span>
                                  )}
                                </div>
                                <ChevronDown className={`h-2.5 w-2.5 text-teal-600 flex-shrink-0 transition-transform ${openDropdown === rec.ndc ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-xs font-semibold text-teal-700">{formatCurrency(displayedData.fullPrice)}</td>
                          <td className="px-2 py-1.5 text-xs font-semibold text-teal-700">{formatCurrency(displayedData.partialPrice)}</td>
                          <td className="px-2 py-1.5 text-xs font-semibold text-gray-900">{formatCurrency(displayedData.totalPrice)}</td>
                          <td className="px-2 py-1.5">
                              <button
                                onClick={() => handleViewStats(rec)}
                              className="px-2 py-0.5 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 flex items-center gap-1 shadow-sm hover:shadow-md transition-all"
                              >
                                <BarChart3 className="h-3 w-3" />
                                Stats
                              </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-2 py-6 text-center text-xs text-gray-500">
                        {!recommendation && !loading && !searchLoading ? 'Enter NDC codes above and click Search to view recommendations' : 'No data available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Table View */}
            <div className="md:hidden overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[140px]">Product</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[100px]">NDC</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[70px]">Full Qty</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[80px]">Partial Qty</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[160px]">Distributor</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[80px]">Full Price</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[80px]">Partial Price</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[80px]">Total</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700 w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading || searchLoading ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                          <p className="text-[10px] text-gray-600">Searching recommendations...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error && !recommendation ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                          <p className="text-[10px] text-gray-600">{error || 'No recommendations available'}</p>
                          <button
                            onClick={() => {
                              const items = selectedNdcs.map(item => ({
                                ndc: item.ndc,
                              }));
                              fetchRecommendations(items);
                            }}
                            className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-1 text-[10px]"
                          >
                            <RefreshCw className="h-2.5 w-2.5" />
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : recommendation && recommendation.recommendations.length > 0 ? (
                    recommendation.recommendations.map((rec, index) => {
                      const displayedData = getDisplayedData(rec);
                      return (
                        <tr
                          key={`${rec.ndc}-${index}`}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-2 py-1 text-[10px] text-gray-900 max-w-[120px] truncate" title={rec.productName}>
                            {rec.productName}
                          </td>
                          <td className="px-2 py-1 text-[10px] font-mono text-gray-600">{rec.ndc}</td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              value={displayedData.fullQuantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 0;
                                handleFullQuantityChange(rec.ndc, newQuantity);
                              }}
                              className="w-10 px-1 py-0.5 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              value={displayedData.partialQuantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 0;
                                handlePartialQuantityChange(rec.ndc, newQuantity);
                              }}
                              className="w-10 px-1 py-0.5 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <div className="relative distributor-dropdown">
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (openDropdown === rec.ndc) {
                                    setOpenDropdown(null);
                                    setDropdownPosition(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const viewportWidth = window.innerWidth;
                                    
                                    // Always position directly below the button
                                    const top = rect.bottom + window.scrollY + 4;
                                    
                                    // Ensure it doesn't go off screen horizontally
                                    let left = rect.left + window.scrollX;
                                    const menuWidth = 320;
                                    if (left + menuWidth > viewportWidth) {
                                      left = viewportWidth - menuWidth - 16;
                                    }
                                    if (left < 16) {
                                      left = 16;
                                    }
                                    
                                    setDropdownPosition({
                                      top,
                                      left,
                                      width: menuWidth
                                    });
                                    setOpenDropdown(rec.ndc);
                                  }
                                }}
                                className="w-full min-w-[120px] px-1.5 py-0.5 text-[10px] border-2 border-teal-200 rounded-lg bg-white text-gray-900 hover:border-teal-300 transition-all font-medium shadow-sm hover:shadow-md flex items-center justify-between gap-0.5"
                              >
                                <div className="flex items-center gap-0.5 flex-1 min-w-0">
                                  <span className="truncate text-[10px]">{displayedData.distributor}</span>
                                  {getAllDistributors(rec).find(d => d.name === (selectedDistributors[rec.ndc] || rec.recommendedDistributor))?.isRecommended && (
                                    <span className="text-[8px] bg-teal-600 text-white px-1 py-0.5 rounded-full font-semibold flex-shrink-0">
                                      <Check className="h-2 w-2 inline" />
                                    </span>
                                  )}
                                </div>
                                <ChevronDown className={`h-2.5 w-2.5 text-teal-600 flex-shrink-0 transition-transform ${openDropdown === rec.ndc ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-[10px] font-semibold text-teal-700">{formatCurrency(displayedData.fullPrice)}</td>
                          <td className="px-2 py-1 text-[10px] font-semibold text-teal-700">{formatCurrency(displayedData.partialPrice)}</td>
                          <td className="px-2 py-1 text-[10px] font-semibold text-gray-900">{formatCurrency(displayedData.totalPrice)}</td>
                          <td className="px-2 py-1">
                              <button
                                onClick={() => handleViewStats(rec)}
                              className="px-1.5 py-0.5 bg-teal-600 text-white text-[10px] rounded-lg hover:bg-teal-700 flex items-center gap-0.5 shadow-sm hover:shadow-md transition-all"
                                title="View Stats"
                              >
                                <BarChart3 className="h-2.5 w-2.5" />
                              </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-2 py-6 text-center text-[10px] text-gray-500">
                        {!recommendation && !loading && !searchLoading ? 'Enter NDC codes above and click Search to view recommendations' : 'No data available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Distributor Dropdown Menu - Outside Table */}
        {openDropdown && dropdownPosition && recommendation && (() => {
          const selectedRec = recommendation.recommendations.find(r => r.ndc === openDropdown);
          if (!selectedRec) return null;
          
          return (
            <>
              <div 
                className="fixed inset-0 z-40 distributor-menu-overlay"
                  onClick={() => {
                  setOpenDropdown(null);
                  setDropdownPosition(null);
                }}
              />
              <div 
                className="fixed z-50 bg-white border-2 border-teal-200 rounded-lg shadow-2xl distributor-menu-overlay"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: '320px',
                  maxHeight: '400px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="overflow-y-auto py-2 distributor-menu-scroll" 
                  style={{ 
                    maxHeight: '400px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#14b8a6 #f3f4f6'
                  }}
                >
                  {getAllDistributors(selectedRec).map((dist, idx) => {
                    const isSelected = (selectedDistributors[selectedRec.ndc] || selectedRec.recommendedDistributor) === dist.name;
                    // Calculate total price based on current quantities
                    const fullQty = editableFullQuantities[selectedRec.ndc] ?? 1;
                    const partialQty = editablePartialQuantities[selectedRec.ndc] ?? 1;
                    const totalPrice = (dist.fullPrice * fullQty) + (dist.partialPrice * partialQty);
                      return (
                      <button
                          key={`${dist.name}-${idx}`}
                        type="button"
                        onClick={() => {
                          handleSelectDistributor(selectedRec.ndc, dist.name);
                          setOpenDropdown(null);
                          setDropdownPosition(null);
                        }}
                        className={`w-full text-left px-2 py-1.5 hover:bg-teal-50 transition-colors border-l-4 ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {isSelected && (
                              <Check className="h-3 w-3 text-teal-600 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className={`font-semibold text-xs ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                                  {dist.name}
                                </span>
                                {dist.isRecommended && (
                                  <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 flex-shrink-0">
                                    <Check className="h-2.5 w-2.5" />
                                    Recommended
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-xs font-bold ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                              {formatCurrency(totalPrice)}
                        </div>
                    </div>
                </div>
                  </button>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}

        {/* Stats Modal */}
        {statsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-gray-900 truncate">Distributor Stats</h3>
                  {statsProduct && (
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      {statsProduct.productName} - {statsProduct.distributorName}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setStatsModalOpen(false);
                    setStatsProduct(null);
                    setStatsData([]);
                    setStatsSummary(null);
                    setError(null);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-2 overflow-y-auto">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-red-800 font-medium">Error</p>
                      <p className="text-xs text-red-700 mt-0.5">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-600 hover:text-red-800 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {statsLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600 mb-2" />
                    <p className="text-xs text-gray-600">Loading stats...</p>
                  </div>
                ) : statsData.length > 0 ? (
                  <div className="space-y-2">
                    {/* Price Stats at Top */}
                    {statsSummary?.priceStats && (
                      <Card className="bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
                        <CardContent className="p-2">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">Price Statistics</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="bg-white rounded-lg p-2 border border-teal-100">
                              <p className="text-[10px] text-gray-500 mb-0.5">Minimum</p>
                              <p className="text-sm font-bold text-teal-700">{formatCurrency(statsSummary.priceStats.min || 0)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-teal-100">
                              <p className="text-[10px] text-gray-500 mb-0.5">Average</p>
                              <p className="text-sm font-bold text-teal-700">{formatCurrency(statsSummary.priceStats.average || 0)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-teal-100">
                              <p className="text-[10px] text-gray-500 mb-0.5">Maximum</p>
                              <p className="text-sm font-bold text-teal-700">{formatCurrency(statsSummary.priceStats.max || 0)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    

                    {/* Date Range */}
                    {statsSummary?.dateRange && (
                      <Card>
                        <CardContent className="p-2">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">Date Range</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">Earliest</p>
                              <p className="text-xs font-medium text-gray-900">{statsSummary.dateRange.earliest || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">Latest</p>
                              <p className="text-xs font-medium text-gray-900">{statsSummary.dateRange.latest || 'N/A'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Bar Chart from dataPoints */}
                    <Card>
                      <CardContent className="p-2">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Price Per Unit Over Time</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={statsData} barCategoryGap={statsData.length === 1 ? "50%" : "20%"}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#6b7280"
                              style={{ fontSize: '10px' }}
                              angle={-45}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis 
                              stroke="#6b7280"
                              style={{ fontSize: '10px' }}
                              tickFormatter={(value) => `$${value.toFixed(2)}`}
                            />
                            <Tooltip 
                              formatter={(value: any) => formatCurrency(value)}
                              labelStyle={{ color: '#374151' }}
                            />
                            <Legend />
                            <Bar dataKey="price" fill="#14b8a6" name="Price Per Unit" radius={[4, 4, 0, 0]} barSize={statsData.length === 1 ? 60 : undefined} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <BarChart3 className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-600">No stats data available</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => {
                    setStatsModalOpen(false);
                    setStatsProduct(null);
                    setStatsData([]);
                    setStatsSummary(null);
                    setError(null);
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

