"use client";

import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Upload, FileSpreadsheet, Loader2, X, CheckCircle2, AlertTriangle,
  Package, DollarSign, TrendingUp, ArrowRight, Building2, Calendar,
  FileText, Download, Info, RefreshCw, ChevronUp, ChevronDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { apiClient } from '@/lib/api/client';

// Types based on API response
interface DistributorLocation {
  city?: string;
  state?: string;
  street?: string;
  country?: string;
  zipCode?: string;
}

interface RecommendedDistributor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string | DistributorLocation;
}

interface AnalysisItem {
  id?: string;
  ndcCode: string;
  ndcNormalized: string;
  productName: string;
  manufacturer: string;
  quantity: number;
  fullUnits: number;
  partialUnits: number;
  expirationDate: string;
  lotNumber: string;
  recommendationType: 'return_now' | 'keep' | 'monitor' | 'no_data';
  recommendedDistributor: RecommendedDistributor | null;
  estimatedReturnValue: number;
  bestFullPrice: number;
  bestPartialPrice: number;
  confidenceScore: number;
  reason: string;
}

interface AnalysisSummary {
  returnNow: number;
  keep: number;
  monitor: number;
  noData: number;
}

interface AnalysisResponse {
  uploadId: string;
  totalItems: number;
  itemsToReturn: AnalysisItem[];
  itemsToKeep: AnalysisItem[];
  itemsNoData: AnalysisItem[];
  totalPotentialValue: number;
  summary: AnalysisSummary;
  generatedAt: string;
}

type TabType = 'keep' | 'return';

export default function InventoryAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null); // Summary API data for tabs
  const [uploadResponseData, setUploadResponseData] = useState<AnalysisResponse | null>(null); // Upload API response for modal
  const [showModal, setShowModal] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('keep');
  const [modalActiveTab, setModalActiveTab] = useState<TabType>('return'); // Modal tab state
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch analysis summary on page load
  useEffect(() => {
    fetchAnalysisSummary();
  }, []);

  const fetchAnalysisSummary = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getApiWithoutPharmacyId<AnalysisResponse>(
        '/inventory-analysis/summary'
      );

      if (response.status === 'success' && response.data) {
        setAnalysisData(response.data);
      }
    } catch (err: any) {
      // Don't show error if no data exists yet
      console.log('No analysis data available:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setError(null);
    setSuccess(null);
    
    const validTypes = [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    const isValidType = validTypes.includes(selectedFile.type) || 
                        selectedFile.name.endsWith('.csv') || 
                        selectedFile.name.endsWith('.xlsx') || 
                        selectedFile.name.endsWith('.xls');
    
    if (!isValidType) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.upload<AnalysisResponse>(
        '/inventory-analysis/upload',
        formData
      );

      if (response.status === 'success' && response.data) {
        setUploadResponseData(response.data); // Store upload response for modal
        setSuccess(`Successfully analyzed ${response.data.totalItems} inventory items`);
        setShowModal(true);
        setShowUploadSection(false);
        // Set modal tab based on what data is available
        setModalActiveTab(response.data.itemsToReturn.length > 0 ? 'return' : 'keep');
        // Reset file input
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Refresh summary data for tabs
        await fetchAnalysisSummary();
        // Trigger notification refresh
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        // Some backends generate notifications asynchronously; re-check shortly after upload
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshNotifications'));
        }, 2000);
      } else {
        setError(response.message || 'Failed to analyze inventory');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const formatLocation = (location: string | DistributorLocation | undefined): string => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    
    // Handle location object
    const parts: string[] = [];
    if (location.street) parts.push(location.street);
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.zipCode) parts.push(location.zipCode);
    if (location.country) parts.push(location.country);
    
    return parts.join(', ') || '';
  };

  const renderItemsTable = (items: AnalysisItem[], type: 'return' | 'keep') => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-[#6b7280] text-sm">No items in this category</p>
        </div>
      );
    }

    return (
      <div 
      className="overflow-x-auto max-h-[500px] overflow-y-auto -mx-4 sm:mx-0"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}
      >
        <table className="w-full text-xs min-w-[1000px] sm:min-w-[1200px]">
          <thead className={`sticky top-0 ${type === 'return' ? 'bg-[#f5f2f1]' : 'bg-[#f5f2f1]'}`}>
            <tr>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[120px] sm:min-w-[150px] text-[10px] sm:text-xs">Product</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[100px] sm:min-w-[120px] text-[10px] sm:text-xs">Manufacturer</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[90px] sm:min-w-[100px] text-[10px] sm:text-xs">NDC</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[70px] sm:min-w-[80px] text-[10px] sm:text-xs">Lot #</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[90px] sm:min-w-[100px] text-[10px] sm:text-xs">Qty</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[90px] sm:min-w-[100px] text-[10px] sm:text-xs">Expiration</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[100px] sm:min-w-[110px] text-[10px] sm:text-xs">Best Full Price</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[110px] sm:min-w-[120px] text-[10px] sm:text-xs">Best Partial Price</th>
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[110px] sm:min-w-[120px] text-[10px] sm:text-xs">Est. Return Value</th>
              {type === 'return' && (
                <th className="text-left p-1.5 sm:p-2 font-bold min-w-[130px] sm:min-w-[150px] text-[10px] sm:text-xs">Distributor</th>
              )}
              <th className="text-left p-1.5 sm:p-2 font-bold min-w-[200px] sm:min-w-[250px] text-[10px] sm:text-xs">Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || `item-${idx}-${item.ndcCode}`} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f2f1]/50'} hover:bg-[#f5f2f1]/50 transition-colors`}>
                <td className="p-1.5 sm:p-2">
                  <div className="font-medium text-[10px] sm:text-xs">{item.productName}</div>
                </td>
                <td className="p-1.5 sm:p-2">
                  <span className="text-[#505454] text-[10px] sm:text-xs">{item.manufacturer}</span>
                </td>
                <td className="p-1.5 sm:p-2 font-mono text-[10px] sm:text-xs">{item.ndcCode}</td>
                <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs">{item.lotNumber}</td>
                <td className="p-1.5 sm:p-2">
                  <div className="text-[10px] sm:text-xs">{item.quantity} total</div>
                  <div className="text-[#6b7280] text-[9px] sm:text-xs">
                    {item.fullUnits} full, {item.partialUnits} partial
                  </div>
                </td>
                <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs">{formatDate(item.expirationDate)}</td>
                <td className="p-1.5 sm:p-2">
                  <span className="font-medium text-blue-600 text-[10px] sm:text-xs">{formatCurrency(item.bestFullPrice)}</span>
                </td>
                <td className="p-1.5 sm:p-2">
                  <span className="font-medium text-purple-600 text-[10px] sm:text-xs">{formatCurrency(item.bestPartialPrice)}</span>
                </td>
                <td className="p-1.5 sm:p-2">
                  <span className="font-bold text-[#516057] text-[10px] sm:text-xs">{formatCurrency(item.estimatedReturnValue)}</span>
                </td>
                {type === 'return' && (
                  <td className="p-1.5 sm:p-2">
                    {item.recommendedDistributor ? (
                      <div>
                        <div className="font-medium text-[10px] sm:text-xs">{item.recommendedDistributor.name}</div>
                        {formatLocation(item.recommendedDistributor.location) && (
                          <div className="text-[#6b7280] text-[9px] sm:text-xs">{formatLocation(item.recommendedDistributor.location)}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#9ca3af] text-[10px] sm:text-xs">-</span>
                    )}
                  </td>
                )}
                <td className="p-1.5 sm:p-2">
                  <p className="text-[10px] sm:text-xs text-[#505454]" title={item.reason}>
                    {item.reason}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PermissionGuard permission="inventory_analysis:view">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 rounded-[4px] bg-[#f5f2f1] border-2 border-[#e2e2e2]">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[#000000]">Inventory Analysis</h1>
            <p className="text-[10px] sm:text-xs text-[#505454] mt-0.5">Upload your inventory to analyze return opportunities and recommendations</p>
          </div>
          <Button 
            size="sm" 
            className="bg-[#516057] hover:bg-[#505454] text-white w-full sm:w-auto text-xs sm:text-sm"
            onClick={() => setShowUploadSection(!showUploadSection)}
          >
            <Upload className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            Upload
            {showUploadSection ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Alerts */}
        {(success || error) && (
          <div className={`p-2 sm:p-3 rounded-[4px] text-xs sm:text-sm flex items-center gap-2 ${
            success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {success ? <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> : <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />}
            <span className="flex-1 break-words">{success || error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-auto h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0" 
              onClick={() => { setSuccess(null); setError(null); }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Upload Section - Toggleable */}
        {showUploadSection && (
          <Card className="border-2 border-[#e2e2e2] bg-[#f5f2f1]">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 rounded-[4px] bg-[#f5f2f1] flex-shrink-0">
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-[#516057]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm sm:text-base text-[#000000] truncate">Upload Inventory File</h2>
                    <p className="text-[10px] sm:text-xs text-[#505454]">Upload Excel (.xlsx, .xls) or CSV files</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                  onClick={() => setShowUploadSection(false)}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>

              <div className="border-2 border-dashed border-[#e2e2e2] rounded-[4px] p-4 sm:p-8 text-center bg-[#f5f2f1]/30 hover:bg-[#f5f2f1]/50 transition-colors">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  id="inventory-file-upload" 
                />
                
                {!file ? (
                  <label htmlFor="inventory-file-upload" className="cursor-pointer block">
                    <FileSpreadsheet className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-[#9ca3af]" />
                    <p className="text-xs sm:text-sm font-medium text-[#505454] mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-[10px] sm:text-xs text-[#6b7280]">
                      Supported: CSV, Excel (.xlsx, .xls)
                    </p>
                  </label>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <FileSpreadsheet className="h-6 w-6 sm:h-8 sm:w-8 text-[#516057] flex-shrink-0" />
                      <div className="text-left min-w-0 flex-1">
                        <p className="font-medium text-[#000000] text-xs sm:text-sm truncate">{file.name}</p>
                        <p className="text-[10px] sm:text-xs text-[#6b7280]">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                        onClick={clearFile}
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4 text-[#6b7280]" />
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="bg-[#516057] hover:bg-[#505454] text-white w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="text-xs sm:text-sm">Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="text-xs sm:text-sm">Upload & Analyze</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 rounded-[4px] border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-[10px] sm:text-xs text-blue-800 min-w-0">
                    <p className="font-medium mb-1">File Requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                      <li className="break-words">File must contain NDC codes, quantities, and expiration dates</li>
                      <li className="break-words">Supported columns: NDC, Product Name, Quantity, Expiration Date, Lot Number</li>
                      <li>Maximum file size: 10MB</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#516057] mb-3" />
            <p className="text-sm text-[#6b7280]">Loading analysis data...</p>
          </div>
        )}

        {/* Summary Cards */}
        {!isLoading && analysisData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <p className="text-xs text-[#516057] font-medium">Total Items</p>
              <p className="text-2xl font-bold text-[#000000]">{analysisData.totalItems}</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <p className="text-xs text-blue-700 font-medium">Items to Keep</p>
              <p className="text-2xl font-bold text-blue-900">{analysisData.summary.keep}</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <p className="text-xs text-[#516057] font-medium">Items to Return</p>
              <p className="text-2xl font-bold text-[#000000]">{analysisData.summary.returnNow}</p>
            </div>
            <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-[#f5f2f1]">
              <p className="text-xs text-[#516057] font-medium">Potential Value</p>
              <p className="text-xl font-bold text-[#000000]">{formatCurrency(analysisData.totalPotentialValue)}</p>
            </div>
          </div>
        )}

        {/* Tabs Section - Always show after upload when data exists */}
        {!isLoading && analysisData && (
          <Card className="border-2 border-[#e2e2e2]">
            <CardContent className="p-4">
              {/* Tab Navigation */}
              <div className="flex gap-2 border-b-2 border-[#e2e2e2] pb-2 mb-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('keep')}
                  className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium rounded-[4px] border-2 transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'keep'
                      ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-md'
                      : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
                  }`}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Items to Keep</span>
                    <span className="sm:hidden">Keep</span>
                    <Badge className="bg-blue-600 text-white text-[10px] sm:text-xs">{analysisData.itemsToKeep.length}</Badge>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('return')}
                  className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium rounded-[4px] border-2 transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'return'
                      ? 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2] shadow-md'
                      : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
                  }`}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Items to Return</span>
                    <span className="sm:hidden">Return</span>
                    <Badge className="bg-[#516057] text-white text-[10px] sm:text-xs">{analysisData.itemsToReturn.length}</Badge>
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'keep' && (
                <div>
                  {analysisData.itemsToKeep.length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-[4px] border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <span className="font-bold">{analysisData.itemsToKeep.length}</span> items recommended to keep in inventory
                      </p>
                    </div>
                  )}
                  {renderItemsTable(analysisData.itemsToKeep, 'keep')}
                </div>
              )}
              {activeTab === 'return' && (
                <div>
                  {analysisData.itemsToReturn.length > 0 && (
                    <div className="mb-3 p-3 bg-[#f5f2f1] rounded-[4px] border border-[#e2e2e2]">
                      <p className="text-sm text-[#505454]">
                        <span className="font-bold">{analysisData.itemsToReturn.length}</span> items recommended for return with total potential value of{' '}
                        <span className="font-bold">{formatCurrency(analysisData.totalPotentialValue)}</span>
                      </p>
                    </div>
                  )}
                  {renderItemsTable(analysisData.itemsToReturn, 'return')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State - No data yet */}
        {!isLoading && !analysisData && (
          <Card className="border-2 border-[#e2e2e2]">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Package className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-[#505454] mb-2">No Analysis Data Available</h3>
                <p className="text-sm text-[#6b7280] mb-4">
                  Upload an inventory file to analyze return opportunities and get recommendations
                </p>
                <Button 
                  onClick={() => setShowUploadSection(true)}
                  className="bg-[#516057] hover:bg-[#505454] text-white"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Inventory File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Modal - Shows after upload with upload response data */}
      {showModal && uploadResponseData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-[#f5f2f1]">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-[4px] bg-[#f5f2f1] flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-[#516057]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-[#000000] truncate">Inventory Analysis Results</h2>
                  <p className="text-[10px] sm:text-xs text-[#505454] truncate">
                    Analyzed {uploadResponseData.totalItems} items • Generated {formatDate(uploadResponseData.generatedAt)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={closeModal} className="flex-shrink-0">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            {/* Modal Summary */}
            <div className="p-2 sm:p-4 border-b bg-[#f5f2f1]">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
                <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-white">
                  <p className="text-xs text-[#516057] font-medium">Total Items</p>
                  <p className="text-xl font-bold text-[#000000]">{uploadResponseData.totalItems}</p>
                </div>
                <div className="p-3 rounded-[4px] border-2 border-blue-200 bg-white">
                  <p className="text-xs text-blue-700 font-medium">Keep</p>
                  <p className="text-xl font-bold text-blue-900">{uploadResponseData.summary.keep}</p>
                </div>
                <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-white">
                  <p className="text-xs text-[#516057] font-medium">Return Now</p>
                  <p className="text-xl font-bold text-[#000000]">{uploadResponseData.summary.returnNow}</p>
                </div>
                <div className="p-3 rounded-[4px] border-2 border-amber-200 bg-white">
                  <p className="text-xs text-amber-700 font-medium">Monitor</p>
                  <p className="text-xl font-bold text-amber-900">{uploadResponseData.summary.monitor}</p>
                </div>
                <div className="p-3 rounded-[4px] border-2 border-[#e2e2e2] bg-white">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-[#516057]" />
                    <p className="text-xs text-[#516057] font-medium">Potential Value</p>
                  </div>
                  <p className="text-lg font-bold text-[#000000]">{formatCurrency(uploadResponseData.totalPotentialValue)}</p>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="p-2 sm:p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
              {/* Tab Navigation */}
              <div className="flex gap-2 border-b-2 border-[#e2e2e2] pb-2 mb-4 overflow-x-auto">
                <button
                  onClick={() => setModalActiveTab('keep')}
                  className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium rounded-[4px] border-2 transition-all whitespace-nowrap flex-shrink-0 ${
                    modalActiveTab === 'keep'
                      ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-md'
                      : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
                  }`}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Items to Keep</span>
                    <span className="sm:hidden">Keep</span>
                    <Badge className="bg-blue-600 text-white text-[10px] sm:text-xs">{uploadResponseData.itemsToKeep.length}</Badge>
                  </div>
                </button>
                <button
                  onClick={() => setModalActiveTab('return')}
                  className={`px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium rounded-[4px] border-2 transition-all whitespace-nowrap flex-shrink-0 ${
                    modalActiveTab === 'return'
                      ? 'bg-[#f5f2f1] text-[#516057] border-[#e2e2e2] shadow-md'
                      : 'bg-white text-[#505454] border-[#e2e2e2] hover:bg-[#f5f2f1]'
                  }`}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Items to Return</span>
                    <span className="sm:hidden">Return</span>
                    <Badge className="bg-[#516057] text-white text-[10px] sm:text-xs">{uploadResponseData.itemsToReturn.length}</Badge>
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              {modalActiveTab === 'keep' && (
                <div>
                  {uploadResponseData.itemsToKeep.length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-[4px] border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <span className="font-bold">{uploadResponseData.itemsToKeep.length}</span> items recommended to keep in inventory
                      </p>
                    </div>
                  )}
                  {renderItemsTable(uploadResponseData.itemsToKeep, 'keep')}
                </div>
              )}
              {modalActiveTab === 'return' && (
                <div>
                  {uploadResponseData.itemsToReturn.length > 0 && (
                    <div className="mb-3 p-3 bg-[#f5f2f1] rounded-[4px] border border-[#e2e2e2]">
                      <p className="text-sm text-[#505454]">
                        <span className="font-bold">{uploadResponseData.itemsToReturn.length}</span> items recommended for return with total potential value of{' '}
                        <span className="font-bold">{formatCurrency(uploadResponseData.totalPotentialValue)}</span>
                      </p>
                    </div>
                  )}
                  {renderItemsTable(uploadResponseData.itemsToReturn, 'return')}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-t bg-[#f5f2f1]">
              {/* <p className="text-xs text-[#6b7280]">
                Upload ID: {uploadResponseData.uploadId}
              </p> */}
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" onClick={closeModal} className="text-xs sm:text-sm">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </PermissionGuard>
    </DashboardLayout>
  );
}
