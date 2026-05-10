"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, Search, Mail, Phone, MapPin, CheckCircle, Eye, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { productListsService, optimizationService } from '@/lib/api/services';
import type { OptimizationSuggestionsResponse, OptimizationSuggestionDistributor, ProductListItem, CustomPackageItem, DistributorSuggestionResponse } from '@/lib/api/services';

export default function OptimizationSuggestionsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Product Selection, 2: Results
  const [productItems, setProductItems] = useState<ProductListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, { full_units: number; partial_units: number; id: string }>>(new Map()); // Map<productId, { full_units, partial_units, id }>
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [optimizationResults, setOptimizationResults] = useState<OptimizationSuggestionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDistributor, setSelectedDistributor] = useState<OptimizationSuggestionDistributor | null>(null);
  const [submittingDistributorId, setSubmittingDistributorId] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'add' | 'create' | null>(null);
  const [selectedFeeRates, setSelectedFeeRates] = useState<Map<string, string>>(new Map()); // Map<distributorId, feeRateDays>
  const [distributorSuggestionData, setDistributorSuggestionData] = useState<DistributorSuggestionResponse | null>(null);
  const [pendingDistributor, setPendingDistributor] = useState<OptimizationSuggestionDistributor | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'existing' | 'create'>('create');
  
  // Combined loading state to reduce re-renders
  const [loading, setLoading] = useState({
    products: false,
    suggestions: false,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      const items = await productListsService.getItems();
      setProductItems(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const handleItemToggle = (productId: string) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      const product = productItems.find(item => item.id === productId);
      if (product) {
        newSelected.set(productId, { 
          full_units: 0, 
          partial_units: 0, 
          id: productId 
        });
      }
    }
    setSelectedItems(newSelected);
  };

  const handleFullUnitsChange = (productId: string, full_units: number) => {
    if (full_units < 0) return;
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(productId) || { full_units: 0, partial_units: 0, id: productId };
    newSelected.set(productId, { ...current, full_units });
    setSelectedItems(newSelected);
  };

  const handlePartialUnitsChange = (productId: string, partial_units: number) => {
    if (partial_units < 0) return;
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(productId) || { full_units: 0, partial_units: 0, id: productId };
    newSelected.set(productId, { ...current, partial_units });
    setSelectedItems(newSelected);
  };

  const handleGetSuggestions = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one product');
      return false;
    }

    // Filter out items with zero units
    const itemsWithUnits = Array.from(selectedItems.entries())
      .filter(([_, units]) => units.full_units > 0 || units.partial_units > 0)
      .map(([productId, units]) => {
        const product = productItems.find(item => item.id === productId);
        if (!product) return null;
        
        return {
          ndc: product.ndc,
          // quantity: units.full_units + units.partial_units, // Total quantity for backward compatibility
          full: units.full_units,
          partial: units.partial_units,
          productId: productId,
        };
      })
      .filter(item => item !== null) as Array<{ ndc: string; full: number; partial: number; productId: string }>;

    if (itemsWithUnits.length === 0) {
      setError('Please enter at least one full unit or partial unit for selected products');
      return false;
    }

    try {
      setLoading(prev => ({ ...prev, suggestions: true }));
      setError(null);
      const results = await optimizationService.getSuggestions(itemsWithUnits);
      setOptimizationResults(results);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to get optimization suggestions');
      console.error('Error fetching suggestions:', err);
      return false;
    } finally {
      setLoading(prev => ({ ...prev, suggestions: false }));
    }
  };

  // Prepare items for API calls
  const prepareItems = (distributor: OptimizationSuggestionDistributor) => {
    return distributor.products.map(product => {
      // Find the selected product item by matching NDC
      const selectedProduct = productItems.find(item => item.ndc === product.ndc && selectedItems.has(item.id));
      const selectedUnits = selectedProduct 
        ? selectedItems.get(selectedProduct.id) || { full_units: 0, partial_units: 0, id: selectedProduct.id }
        : { full_units: 0, partial_units: 0, id: '' };
      
      // Ensure full and partial are always numbers (0 if not set), never null
      const full = selectedUnits.full_units ?? 0;
      const partial = selectedUnits.partial_units ?? 0;
      
      // Get the product ID
      const productId = selectedUnits.id || (selectedProduct?.id || '');
      
      return {
        ndc: product.ndc,
        productId: productId,
        productName: product.productName,
        full: full,
        partial: partial,
      };
    });
  };

  const handleDistributorSelect = async (distributor: OptimizationSuggestionDistributor) => {
    const distributorId = distributor.distributorId || distributor.distributorName;
    try {
      setError(null);
      setSubmittingDistributorId(distributorId);

      // Prepare items for the distributor suggestion API
      const items = prepareItems(distributor);

      // Call the distributor suggestion API first
      const suggestionResponse = await optimizationService.getDistributorSuggestion(
        distributor.distributorId || '',
        items
      );

      // Store the response and show modal
      setDistributorSuggestionData(suggestionResponse);
      setPendingDistributor(distributor);
      // Set default tab: 'existing' if existing package exists, otherwise 'create'
      setActiveModalTab(suggestionResponse.packages[0]?.existingPackage ? 'existing' : 'create');
      // Clear submitting state when modal opens (so buttons in modal are enabled)
      setSubmittingDistributorId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to get distributor suggestion');
      console.error('Error getting distributor suggestion:', err);
      alert(`Error: ${err.message || 'Failed to get distributor suggestion'}`);
      setSubmittingDistributorId(null);
    }
  };

  const handleCreateCustomPackage = async () => {
    if (!pendingDistributor || !distributorSuggestionData) return;

    const distributorId = pendingDistributor.distributorId || pendingDistributor.distributorName;
    try {
      setSubmittingDistributorId(distributorId);
      setSubmittingAction('create');
      setError(null);

      // Prepare payload with items from the modal data (use original prices, not adjusted)
      // Get full_units and partial_units from selectedItems (user's selection in step 1)
      const items = distributorSuggestionData.packages[0].products.map((product: any) => {
        // Find the selected product item by matching NDC
        const selectedProduct = productItems.find(item => item.ndc === product.ndc && selectedItems.has(item.id));
        const selectedUnits = selectedProduct 
          ? selectedItems.get(selectedProduct.id) || { full_units: 0, partial_units: 0, id: selectedProduct.id }
          : { full_units: 0, partial_units: 0, id: '' };
        
        // Ensure full and partial are always numbers (0 if not set), never null
        const full = selectedUnits.full_units ?? 0;
        const partial = selectedUnits.partial_units ?? 0;
        
        // Get the product ID
        const productId = selectedUnits.id || (selectedProduct?.id || '');
        
        // Use original prices from the product (not adjusted by fee rate)
        // These are the actual prices that should be sent in the payload
        const pricePerUnit = product.pricePerUnit || 0;
        const totalValue = product.totalValue || 0;
        
        return {
          id: productId,
          ndc: product.ndc,
          productId: productId,
          product_id: productId,
          productName: product.productName,
          product_name: product.productName,
          full: full,
          partial: partial,
          pricePerUnit: pricePerUnit,
          price_per_unit: pricePerUnit,
          totalValue: totalValue,
          total_value: totalValue,
        };
      });

      // Get selected feeRate for this distributor (just the percentage)
      const selectedFeeRateDays = selectedFeeRates.get(pendingDistributor.distributorId || '');
      const distributorAny = pendingDistributor as any;
      const feeRatePercentage = selectedFeeRateDays && distributorAny.feeRates?.[selectedFeeRateDays] 
        ? distributorAny.feeRates[selectedFeeRateDays].percentage
        : null;
      const feeDuration = selectedFeeRateDays ? parseInt(selectedFeeRateDays) : null;

      const payload: any = {
        distributorName: pendingDistributor.distributorName,
        distributorId: pendingDistributor.distributorId || '',
        items,
        notes: '', // Optional notes field
      };

      // Only include feeRate and feeDuration if they were selected
      if (feeRatePercentage !== null && feeDuration !== null) {
        payload.feeRate = feeRatePercentage;
        payload.feeDuration = feeDuration;
      }

      console.log('Creating custom package with payload:', payload);
      
      // Send to API
      await optimizationService.createCustomPackage(payload);
      
      // Close modal and redirect to packages page
      setDistributorSuggestionData(null);
      setPendingDistributor(null);
      router.push('/packages');
    } catch (err: any) {
      setError(err.message || 'Failed to create custom package');
      console.error('Error creating custom package:', err);
      alert(`Error: ${err.message || 'Failed to create custom package'}`);
    } finally {
      setSubmittingDistributorId(null);
      setSubmittingAction(null);
    }
  };

  const handleAddToExistingPackage = async () => {
    if (!pendingDistributor || !distributorSuggestionData || !distributorSuggestionData.packages[0]?.existingPackage) return;

    const distributorId = pendingDistributor.distributorId || pendingDistributor.distributorName;
    const existingPackage = distributorSuggestionData.packages[0].existingPackage;
    
    try {
      setSubmittingDistributorId(distributorId);
      setSubmittingAction('add');
      setError(null);

      // Prepare items from the package data
      const items = distributorSuggestionData.packages[0].products.map((product: any) => {
        // Find the selected product item by matching NDC
        const selectedProduct = productItems.find(item => item.ndc === product.ndc && selectedItems.has(item.id));
        const selectedUnits = selectedProduct 
          ? selectedItems.get(selectedProduct.id) || { full_units: 0, partial_units: 0, id: selectedProduct.id }
          : { full_units: 0, partial_units: 0, id: '' };
        
        // Ensure full and partial are always numbers (0 if not set), never null
        const full = selectedUnits.full_units ?? 0;
        const partial = selectedUnits.partial_units ?? 0;
        
        // Get the product ID
        const productId = selectedUnits.id || (selectedProduct?.id || '');
        
        return {
          id: productId,
          ndc: product.ndc,
          productId: productId,
          product_id: productId,
          productName: product.productName,
          product_name: product.productName,
          full: full,
          partial: partial,
          pricePerUnit: product.pricePerUnit,
          price_per_unit: product.pricePerUnit,
          totalValue: product.totalValue,
          total_value: product.totalValue,
        };
      });

      console.log('Adding items to existing package:', existingPackage.id, items);
      
      // Send to API
      await optimizationService.addItemsToPackage(existingPackage.id, items);
      
      // Close modal and redirect to packages page
      setDistributorSuggestionData(null);
      setPendingDistributor(null);
      router.push('/packages');
    } catch (err: any) {
      setError(err.message || 'Failed to add items to existing package');
      console.error('Error adding items to existing package:', err);
      alert(`Error: ${err.message || 'Failed to add items to existing package'}`);
    } finally {
      setSubmittingDistributorId(null);
      setSubmittingAction(null);
    }
  };

  const filteredProducts = productItems.filter(item => {
    // Apply search filter only (backend handles filtering of items already in packages)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.ndc?.toLowerCase().includes(query) ||
        item.product_name?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Show all products individually with their exact full_units and partial_units from API
  // Don't group by NDC - show each product as a separate row

  return (
    <DashboardLayout>
      <div className="space-y-2 p-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 hover:bg-[#f5f2f1] rounded-[4px] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[#000000]">Package Management</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`flex items-center gap-1 text-[10px] ${currentStep === 1 ? 'text-blue-600 font-semibold' : 'text-[#9ca3af]'}`}>
                  {currentStep > 1 ? <CheckCircle className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center text-[8px]">1</span>}
                  <span>Select Products</span>
                </div>
                <ArrowRight className="h-2.5 w-2.5 text-[#9ca3af]" />
                <div className={`flex items-center gap-1 text-[10px] ${currentStep === 2 ? 'text-blue-600 font-semibold' : 'text-[#9ca3af]'}`}>
                  <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center text-[8px]">2</span>
                  <span>Choose Distributor</span>
                </div>
              </div>
            </div>
          </div>
          {
            currentStep === 2 && (
            <div className="flex justify-end">
            <Button
              onClick={() => {
                setCurrentStep(1);
                setError(null);
              }}
              variant="outline"
              className="text-xs px-3 py-1 bg-[#516057] text-white hover:bg-[#505454] hover:text-white"
            >
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Products
            </Button>
          </div>
          )}
        </div>

        {/* Step 1: Product Selection */}
        {currentStep === 1 && (
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-sm sm:text-base">Select Products</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[#9ca3af]" />
                  <Input
                    type="text"
                    placeholder="Search by NDC or product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs py-1.5"
                  />
                </div>
              </div>

              {/* Products List */}
              {loading.products ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#516057]" />
                  <p className="text-xs text-[#505454] mt-2">Loading products...</p>
                </div>
              ) : error && !productItems.length ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <p className="text-xs text-[#505454] mt-2">{error}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#505454]">
                      Select Products ({selectedItems.size} selected)
                    </p>
                  </div>
                  <div className="border border-[#e2e2e2] rounded-[4px] overflow-hidden">
                    {filteredProducts.length > 0 ? (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead className="bg-[#f5f2f1]">
                              <tr>
                                <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454] w-10">
                                  <input
                                    type="checkbox"
                                    checked={filteredProducts.length > 0 && filteredProducts.every(item => selectedItems.has(item.id))}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const newSelected = new Map<string, { full_units: number; partial_units: number; id: string }>();
                                        filteredProducts.forEach(item => {
                                          newSelected.set(item.id, { full_units: 0, partial_units: 0, id: item.id });
                                        });
                                        setSelectedItems(newSelected);
                                      } else {
                                        setSelectedItems(new Map());
                                      }
                                    }}
                                    className="rounded"
                                  />
                                </th>
                                <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">NDC</th>
                                <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Product Name</th>
                                <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]"> Full Units</th>
                                <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]"> Partial Units</th>
                                <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Select Units</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((item) => {
                                const isSelected = selectedItems.has(item.id);
                                const units = selectedItems.get(item.id) || { full_units: 0, partial_units: 0, id: item.id };
                                const itemFullUnits = item.full_units || 0;
                                const itemPartialUnits = item.partial_units || 0;
                                return (
                                  <tr
                                    key={item.id}
                                    className={`border-b border-[#f3f4f6] hover:bg-[#f5f2f1] ${isSelected ? 'bg-blue-50' : ''}`}
                                  >
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleItemToggle(item.id)}
                                        className="rounded"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5 text-xs font-mono text-[#000000]">{item.ndc}</td>
                                    <td className="px-2 py-1.5 text-xs text-[#505454]">{item.product_name || 'Unknown Product'}</td>
                                    <td className="px-2 py-1.5 text-xs text-[#505454] font-medium">{itemFullUnits}</td>
                                    <td className="px-2 py-1.5 text-xs text-[#505454] font-medium">{itemPartialUnits}</td>
                                    <td className="px-2 py-1.5">
                                      {isSelected ? (
                                        itemFullUnits > 0 && itemPartialUnits === 0 ? (
                                          <Input
                                            type="number"
                                            min="0"
                                            max={itemFullUnits}
                                            value={units.full_units === 0 ? '' : units.full_units}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                              const maxQty = itemFullUnits;
                                              handleFullUnitsChange(item.id, Math.min(val, maxQty));
                                            }}
                                            onFocus={(e) => {
                                              if (e.target.value === '0') {
                                                e.target.value = '';
                                              }
                                            }}
                                            placeholder="Full Units"
                                            className="w-20 text-xs py-1"
                                          />
                                          ) : itemPartialUnits > 0 && itemFullUnits === 0 ? (
                                          <Input
                                            type="number"
                                            min="0"
                                            max={itemPartialUnits}
                                            value={units.partial_units === 0 ? '' : units.partial_units}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                              const maxQty = itemPartialUnits;
                                              handlePartialUnitsChange(item.id, Math.min(val, maxQty));
                                            }}
                                            onFocus={(e) => {
                                              if (e.target.value === '0') {
                                                e.target.value = '';
                                              }
                                            }}
                                            placeholder="Partial Units"
                                            className="w-20 text-xs py-1"
                                          />
                                        ) : (
                                          <div className="flex gap-1">
                                            <Input
                                              type="number"
                                              min="0"
                                              max={itemFullUnits}
                                            value={units.full_units === 0 ? '' : units.full_units}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                              const maxQty = itemFullUnits;
                                              handleFullUnitsChange(item.id, Math.min(val, maxQty));
                                            }}
                                            onFocus={(e) => {
                                              if (e.target.value === '0') {
                                                e.target.value = '';
                                              }
                                            }}
                                            placeholder="Full"
                                            className="w-16 text-xs py-1"
                                          />
                                          <Input
                                            type="number"
                                            min="0"
                                            max={itemPartialUnits}
                                            value={units.partial_units === 0 ? '' : units.partial_units}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                              const maxQty = itemPartialUnits;
                                              handlePartialUnitsChange(item.id, Math.min(val, maxQty));
                                            }}
                                            onFocus={(e) => {
                                              if (e.target.value === '0') {
                                                e.target.value = '';
                                              }
                                            }}
                                            placeholder="Partial"
                                            className="w-16 text-xs py-1"
                                          />
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-xs text-[#9ca3af]">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Table View */}
                        <div className="md:hidden overflow-x-auto">
                          <table className="w-full border-collapse min-w-[600px]">
                            <thead className="bg-[#f5f2f1]">
                              <tr>
                                <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454] w-8">
                                  <input
                                    type="checkbox"
                                    checked={filteredProducts.length > 0 && filteredProducts.every(item => selectedItems.has(item.id))}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const newSelected = new Map<string, { full_units: number; partial_units: number; id: string }>();
                                        filteredProducts.forEach(item => {
                                          newSelected.set(item.id, { full_units: 0, partial_units: 0, id: item.id });
                                        });
                                        setSelectedItems(newSelected);
                                      } else {
                                        setSelectedItems(new Map());
                                      }
                                    }}
                                    className="rounded"
                                  />
                                </th>
                                <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">NDC</th>
                                <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Product</th>
                                <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Avail Full</th>
                                <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Avail Partial</th>
                                <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Select Units</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((item) => {
                                const isSelected = selectedItems.has(item.id);
                                const units = selectedItems.get(item.id) || { full_units: 0, partial_units: 0, id: item.id };
                                const itemFullUnits = item.full_units || 0;
                                const itemPartialUnits = item.partial_units || 0;
                                return (
                                  <tr
                                    key={item.id}
                                    className={`border-b border-[#f3f4f6] hover:bg-[#f5f2f1] ${isSelected ? 'bg-blue-50' : ''}`}
                                  >
                                    <td className="px-2 py-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleItemToggle(item.id)}
                                        className="rounded"
                                      />
                                    </td>
                                    <td className="px-2 py-1 text-[10px] font-mono text-[#000000]">{item.ndc}</td>
                                    <td className="px-2 py-1 text-[10px] text-[#505454] max-w-[150px] truncate" title={item.product_name || 'Unknown Product'}>
                                      {item.product_name || 'Unknown Product'}
                                    </td>
                                    <td className="px-2 py-1 text-[10px] text-[#505454] font-medium">{itemFullUnits}</td>
                                    <td className="px-2 py-1 text-[10px] text-[#505454] font-medium">{itemPartialUnits}</td>
                                    <td className="px-2 py-1">
                                      {isSelected ? (
                                        itemFullUnits > 0 && itemPartialUnits === 0 ? (
                                          <Input
                                            type="number"
                                            min="0"
                                            max={itemFullUnits}
                                            value={units.full_units === 0 ? '' : units.full_units}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                              const maxQty = itemFullUnits;
                                              handleFullUnitsChange(item.id, Math.min(val, maxQty));
                                            }}
                                            onFocus={(e) => {
                                              if (e.target.value === '0') {
                                                e.target.value = '';
                                              }
                                            }}
                                            placeholder="Full Units"
                                            className="w-16 text-[10px] py-0.5"
                                          />
                                        ) : itemPartialUnits > 0 && itemFullUnits === 0 ? (
                                          <Input
                                            type="number"
                                            min="0"
                                            max={itemPartialUnits}
                                            value={units.partial_units === 0 ? '' : units.partial_units}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                              const maxQty = itemPartialUnits;
                                              handlePartialUnitsChange(item.id, Math.min(val, maxQty));
                                            }}
                                            onFocus={(e) => {
                                              if (e.target.value === '0') {
                                                e.target.value = '';
                                              }
                                            }}
                                            placeholder="Partial Units"
                                            className="w-16 text-[10px] py-0.5"
                                          />
                                        ) : (
                                          <div className="flex gap-0.5">
                                            <Input
                                              type="number"
                                              min="0"
                                              max={itemFullUnits}
                                              value={units.full_units === 0 ? '' : units.full_units}
                                              onChange={(e) => {
                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                                const maxQty = itemFullUnits;
                                                handleFullUnitsChange(item.id, Math.min(val, maxQty));
                                              }}
                                              onFocus={(e) => {
                                                if (e.target.value === '0') {
                                                  e.target.value = '';
                                                }
                                              }}
                                              placeholder="Full"
                                              className="w-14 text-[10px] py-0.5"
                                            />
                                            <Input
                                              type="number"
                                              min="0"
                                              max={itemPartialUnits}
                                              value={units.partial_units === 0 ? '' : units.partial_units}
                                              onChange={(e) => {
                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                                const maxQty = itemPartialUnits;
                                                handlePartialUnitsChange(item.id, Math.min(val, maxQty));
                                              }}
                                              onFocus={(e) => {
                                                if (e.target.value === '0') {
                                                  e.target.value = '';
                                                }
                                              }}
                                              placeholder="Partial"
                                              className="w-14 text-[10px] py-0.5"
                                            />
                                          </div>
                                        )
                                      ) : (
                                        <span className="text-[10px] text-[#9ca3af]">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="px-2 py-6 text-center text-xs text-[#6b7280]">
                        No products found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t">
                {error && (
                  <div className="flex items-center gap-1.5 text-red-600 text-xs mr-auto">
                    <AlertCircle className="h-3 w-3" />
                    <span>{error}</span>
                  </div>
                )}
                <Button
                  onClick={async () => {
                    const success = await handleGetSuggestions();
                    if (success) {
                      setCurrentStep(2);
                    }
                  }}
                  className="bg-[#516057] text-white text-xs px-3 py-1"
                  disabled={selectedItems.size === 0 || loading.suggestions}
                >
                  {loading.suggestions ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      Getting Suggestions...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-3 w-3 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Distributors Table */}
        {currentStep === 2 && optimizationResults && (
          <>
            {/* Summary Card */}
            {/* <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-[#505454] mb-1">Total Distributors</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{optimizationResults.totalDistributors}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-[#505454] mb-1">Total Items</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{optimizationResults.totalItems}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-[#505454] mb-1">Total Estimated Value</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{formatCurrency(optimizationResults.totalEstimatedValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-[#505454] mb-1">Generated At</p>
                    <p className="text-xs font-medium text-blue-700">
                      {new Date(optimizationResults.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card> */}

            {/* Distributors Table */}
            <Card>
              <CardHeader className="p-2">
                <CardTitle className="text-sm sm:text-base">Select a Distributor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Distributor</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Full Units</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Full Price</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Partial Units</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Partial Price</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Contact</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimizationResults.distributors.length > 0 ? (
                        optimizationResults.distributors.map((distributor, idx) => {
                          // Calculate totals from products
                          const totalFullUnits = distributor.products.reduce((sum, p) => sum + ((p as any).full || 0), 0);
                          const totalPartialUnits = distributor.products.reduce((sum, p) => sum + ((p as any).partial || 0), 0);
                          const totalFullPrice = distributor.products.reduce((sum, p) => {
                            const fullPrice = (p as any).fullPricePerUnit || 0;
                            const full = (p as any).full || 0;
                            return sum + (fullPrice * full);
                          }, 0);
                          const totalPartialPrice = distributor.products.reduce((sum, p) => {
                            const partialPrice = (p as any).partialPricePerUnit || 0;
                            const partial = (p as any).partial || 0;
                            return sum + (partialPrice * partial);
                          }, 0);
                          
                          // Check if both prices are null across all products
                          const allProductsHaveNullPrices = distributor.products.every((p: any) => 
                            (p.fullPricePerUnit === null || p.fullPricePerUnit === undefined) && 
                            (p.partialPricePerUnit === null || p.partialPricePerUnit === undefined)
                          );
                          
                          // Get selected fee rate and calculate adjusted prices
                          const selectedFeeRateDays = selectedFeeRates.get(distributor.distributorId || '');
                          const distributorAny = distributor as any;
                          const feeRatePercentage = selectedFeeRateDays && distributorAny.feeRates?.[selectedFeeRateDays]
                            ? distributorAny.feeRates[selectedFeeRateDays].percentage
                            : 0;
                          
                          // Calculate adjusted prices (price - fee percentage)
                          const adjustedFullPrice = feeRatePercentage > 0 
                            ? totalFullPrice * (1 - feeRatePercentage / 100)
                            : totalFullPrice;
                          const adjustedPartialPrice = feeRatePercentage > 0 
                            ? totalPartialPrice * (1 - feeRatePercentage / 100)
                            : totalPartialPrice;
                          
                          return (
                          <tr
                            key={distributor.distributorId || idx}
                            className="border-b border-[#f3f4f6] hover:bg-[#f5f2f1]"
                          >
                            <td className="px-2 py-1.5 text-xs text-[#000000] font-medium">
                              <div className="flex items-center gap-2">
                                <span>{distributor.distributorName}</span>
                                {(distributor as any).recommended && (
                                  <Badge variant="success" className="text-[10px] px-1.5 py-0.5 border-2">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-xs text-[#505454]">{totalFullUnits}</td>
                            <td className="px-2 py-1.5 text-xs text-[#505454]">
                              {allProductsHaveNullPrices ? '-' : (
                                feeRatePercentage > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="line-through text-[#9ca3af] text-[10px]">{formatCurrency(totalFullPrice)}</span>
                                    <span className="font-semibold text-[#516057]">{formatCurrency(adjustedFullPrice)}</span>
                                  </div>
                                ) : (
                                  <span className="font-semibold">{formatCurrency(adjustedFullPrice)}</span>
                                )
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-xs text-[#505454]">{totalPartialUnits}</td>
                            <td className="px-2 py-1.5 text-xs text-[#505454]">
                              {allProductsHaveNullPrices ? '-' : (
                                feeRatePercentage > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="line-through text-[#9ca3af] text-[10px]">{formatCurrency(totalPartialPrice)}</span>
                                    <span className="font-semibold text-[#516057]">{formatCurrency(adjustedPartialPrice)}</span>
                                  </div>
                                ) : (
                                  <span className="font-semibold">{formatCurrency(adjustedPartialPrice)}</span>
                                )
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-xs text-[#505454]">
                              <div className="flex flex-col gap-0.5">
                                {distributor.distributorContact?.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-2.5 w-2.5 text-[#6b7280]" />
                                    <span className="text-[10px]">{distributor.distributorContact.email}</span>
                                  </div>
                                )}
                                {distributor.distributorContact?.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5 text-[#6b7280]" />
                                    <span className="text-[10px]">{distributor.distributorContact.phone}</span>
                                  </div>
                                )}
                                {distributor.distributorContact?.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-2.5 w-2.5 text-[#6b7280]" />
                                    <span className="text-[10px]">{distributor.distributorContact.location}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setSelectedDistributor(distributor)}
                                  className="px-2 py-0.5 bg-[#516057] text-white text-xs rounded hover:bg-[#505454] flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </button>
                                <button
                                  onClick={() => handleDistributorSelect(distributor)}
                                  disabled={submittingDistributorId === (distributor.distributorId || distributor.distributorName)}
                                  className="px-2 py-0.5 bg-[#516057] text-white text-xs rounded hover:bg-[#505454] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {submittingDistributorId === (distributor.distributorId || distributor.distributorName) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    'Create'
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-2 py-6 text-center text-xs text-[#6b7280]">
                            No distributors available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Table View */}
                <div className="md:hidden overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Distributor</th>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Full Units</th>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Full Price</th>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Partial Units</th>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Partial Price</th>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Contact</th>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimizationResults.distributors.length > 0 ? (
                        optimizationResults.distributors.map((distributor, idx) => {
                          // Calculate totals from products
                          const totalFullUnits = distributor.products.reduce((sum, p) => sum + ((p as any).full || 0), 0);
                          const totalPartialUnits = distributor.products.reduce((sum, p) => sum + ((p as any).partial || 0), 0);
                          const totalFullPrice = distributor.products.reduce((sum, p) => {
                            const fullPrice = (p as any).fullPricePerUnit || 0;
                            const full = (p as any).full || 0;
                            return sum + (fullPrice * full);
                          }, 0);
                          const totalPartialPrice = distributor.products.reduce((sum, p) => {
                            const partialPrice = (p as any).partialPricePerUnit || 0;
                            const partial = (p as any).partial || 0;
                            return sum + (partialPrice * partial);
                          }, 0);
                          
                          // Check if both prices are null across all products
                          const allProductsHaveNullPrices = distributor.products.every((p: any) => 
                            (p.fullPricePerUnit === null || p.fullPricePerUnit === undefined) && 
                            (p.partialPricePerUnit === null || p.partialPricePerUnit === undefined)
                          );
                          
                          // Get selected fee rate and calculate adjusted prices
                          const selectedFeeRateDays = selectedFeeRates.get(distributor.distributorId || '');
                          const distributorAny = distributor as any;
                          const feeRatePercentage = selectedFeeRateDays && distributorAny.feeRates?.[selectedFeeRateDays]
                            ? distributorAny.feeRates[selectedFeeRateDays].percentage
                            : 0;
                          
                          // Calculate adjusted prices (price - fee percentage)
                          const adjustedFullPrice = feeRatePercentage > 0 
                            ? totalFullPrice * (1 - feeRatePercentage / 100)
                            : totalFullPrice;
                          const adjustedPartialPrice = feeRatePercentage > 0 
                            ? totalPartialPrice * (1 - feeRatePercentage / 100)
                            : totalPartialPrice;
                          
                          return (
                          <tr
                            key={distributor.distributorId || idx}
                            className="border-b border-[#f3f4f6] hover:bg-[#f5f2f1]"
                          >
                            <td className="px-2 py-1 text-[10px] text-[#000000] font-medium max-w-[120px]">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="truncate" title={distributor.distributorName}>
                              {distributor.distributorName}
                                </span>
                                {(distributor as any).recommended && (
                                  <Badge variant="success" className="text-[9px] px-1 py-0.5 border-2 flex-shrink-0">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-[10px] text-[#505454]">{totalFullUnits}</td>
                            <td className="px-2 py-1 text-[10px] text-[#505454]">
                              {allProductsHaveNullPrices ? '-' : (
                                feeRatePercentage > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="line-through text-[#9ca3af] text-[9px]">{formatCurrency(totalFullPrice)}</span>
                                    <span className="font-semibold text-[#516057]">{formatCurrency(adjustedFullPrice)}</span>
                                  </div>
                                ) : (
                                  <span className="font-semibold">{formatCurrency(adjustedFullPrice)}</span>
                                )
                              )}
                            </td>
                            <td className="px-2 py-1 text-[10px] text-[#505454]">{totalPartialUnits}</td>
                            <td className="px-2 py-1 text-[10px] text-[#505454]">
                              {allProductsHaveNullPrices ? '-' : (
                                feeRatePercentage > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="line-through text-[#9ca3af] text-[9px]">{formatCurrency(totalPartialPrice)}</span>
                                    <span className="font-semibold text-[#516057]">{formatCurrency(adjustedPartialPrice)}</span>
                                  </div>
                                ) : (
                                  <span className="font-semibold">{formatCurrency(adjustedPartialPrice)}</span>
                                )
                              )}
                            </td>
                            <td className="px-2 py-1 text-[10px] text-[#505454]">
                              <div className="flex flex-col gap-0.5">
                                {distributor.distributorContact?.email && (
                                  <div className="flex items-center gap-0.5">
                                    <Mail className="h-2.5 w-2.5 text-[#6b7280] flex-shrink-0" />
                                    <span className="text-[10px] truncate max-w-[100px]" title={distributor.distributorContact.email}>
                                      {distributor.distributorContact.email}
                                    </span>
                                  </div>
                                )}
                                {distributor.distributorContact?.phone && (
                                  <div className="flex items-center gap-0.5">
                                    <Phone className="h-2.5 w-2.5 text-[#6b7280] flex-shrink-0" />
                                    <span className="text-[10px]">{distributor.distributorContact.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-0.5 flex-wrap">
                                <button
                                  onClick={() => setSelectedDistributor(distributor)}
                                  className="px-1.5 py-0.5 bg-[#516057] text-white text-[10px] rounded hover:bg-[#505454] flex items-center gap-0.5 whitespace-nowrap"
                                  title="View items"
                                >
                                  <Eye className="h-2.5 w-2.5" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => handleDistributorSelect(distributor)}
                                  disabled={submittingDistributorId === (distributor.distributorId || distributor.distributorName)}
                                  className="px-1.5 py-0.5 bg-[#516057] text-white text-[10px] rounded hover:bg-[#505454] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-0.5"
                                  title="Create"
                                >
                                  {submittingDistributorId === (distributor.distributorId || distributor.distributorName) ? (
                                    <>
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    'Create'
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-2 py-6 text-center text-[10px] text-[#6b7280]">
                            No distributors available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Back Button */}
            {/* <div className="flex justify-start">
              <Button
                onClick={() => {
                  setCurrentStep(1);
                  setError(null);
                }}
                variant="outline"
                className="text-xs px-3 py-1"
              >
                <ArrowLeft className="h-3 w-3 mr-1.5" />
                Back to Products
              </Button>
            </div> */}
          </>
        )}

        {/* Modal for Viewing Products */}
        {selectedDistributor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-4xl bg-white rounded-[4px] shadow-xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-[#e2e2e2] flex-shrink-0">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-[#000000] truncate">Products</h3>
                  <p className="text-xs text-[#505454] mt-0.5 truncate">
                    {selectedDistributor.distributorName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDistributor(null)}
                  className="p-1.5 hover:bg-[#f5f2f1] rounded-[4px] transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Distributor Contact Info */}
              {selectedDistributor.distributorContact && (
                <div className="p-2 border-b border-[#e2e2e2] bg-[#f5f2f1] flex-shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {selectedDistributor.distributorContact.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-[#6b7280] flex-shrink-0" />
                        <span className="text-[#505454] truncate text-xs">{selectedDistributor.distributorContact.email}</span>
                      </div>
                    )}
                    {selectedDistributor.distributorContact.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-[#6b7280] flex-shrink-0" />
                        <span className="text-[#505454] text-xs">{selectedDistributor.distributorContact.phone}</span>
                      </div>
                    )}
                    {selectedDistributor.distributorContact.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-[#6b7280] flex-shrink-0" />
                        <span className="text-[#505454] truncate text-xs">{selectedDistributor.distributorContact.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Content */}
              <div className="flex-1 p-2 overflow-y-auto">
                {(() => {
                  // Get selected fee rate for this distributor
                  const selectedFeeRateDays = selectedFeeRates.get(selectedDistributor.distributorId || '');
                  const distributorAny = selectedDistributor as any;
                  const feeRatePercentage = selectedFeeRateDays && distributorAny.feeRates?.[selectedFeeRateDays]
                    ? distributorAny.feeRates[selectedFeeRateDays].percentage
                    : 0;

                  return (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Product Name</th>
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">NDC</th>
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Full Units</th>
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Full Price</th>
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Partial Units</th>
                              <th className="px-2 py-1.5 text-left text-xs font-semibold text-[#505454]">Partial Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDistributor.products.length > 0 ? (
                              selectedDistributor.products.map((product, idx) => {
                                const productAny = product as any;
                                const full = productAny.full || 0;
                                const partial = productAny.partial || 0;
                                const fullPricePerUnit = productAny.fullPricePerUnit || 0;
                                const partialPricePerUnit = productAny.partialPricePerUnit || 0;
                                const fullPrice = fullPricePerUnit * full;
                                const partialPrice = partialPricePerUnit * partial;
                                const bothPricesNull = fullPricePerUnit === null && partialPricePerUnit === null;
                                
                                // Calculate adjusted prices
                                const adjustedFullPrice = feeRatePercentage > 0 
                                  ? fullPrice * (1 - feeRatePercentage / 100)
                                  : fullPrice;
                                const adjustedPartialPrice = feeRatePercentage > 0 
                                  ? partialPrice * (1 - feeRatePercentage / 100)
                                  : partialPrice;
                                
                                return (
                                <tr
                                  key={`${product.ndc}-${idx}`}
                                  className="border-b border-[#f3f4f6] hover:bg-[#f5f2f1]"
                                >
                                  <td className="px-2 py-1.5 text-xs text-[#000000]">{product.productName}</td>
                                  <td className="px-2 py-1.5 text-xs font-mono text-[#505454]">{product.ndc}</td>
                                  <td className="px-2 py-1.5 text-xs text-[#505454]">{full}</td>
                                  <td className="px-2 py-1.5 text-xs text-[#505454]">
                                    {bothPricesNull ? '-' : (
                                      feeRatePercentage > 0 ? (
                                        <div className="flex flex-col">
                                          <span className="line-through text-[#9ca3af] text-[10px]">{formatCurrency(fullPrice)}</span>
                                          <span className="font-semibold text-[#516057]">{formatCurrency(adjustedFullPrice)}</span>
                                        </div>
                                      ) : (
                                        <span className="font-semibold">{formatCurrency(fullPrice)}</span>
                                      )
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-xs text-[#505454]">{partial}</td>
                                  <td className="px-2 py-1.5 text-xs text-[#505454]">
                                    {bothPricesNull ? '-' : (
                                      feeRatePercentage > 0 ? (
                                        <div className="flex flex-col">
                                          <span className="line-through text-[#9ca3af] text-[10px]">{formatCurrency(partialPrice)}</span>
                                          <span className="font-semibold text-[#516057]">{formatCurrency(adjustedPartialPrice)}</span>
                                        </div>
                                      ) : (
                                        <span className="font-semibold">{formatCurrency(partialPrice)}</span>
                                      )
                                    )}
                                  </td>
                                </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-2 py-6 text-center text-xs text-[#6b7280]">
                                  No products found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Table View */}
                      <div className="md:hidden overflow-x-auto">
                        <table className="w-full border-collapse min-w-[600px]">
                          <thead>
                            <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                              <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Product</th>
                              <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">NDC</th>
                              <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Full Units</th>
                              <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Full Price</th>
                              <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Partial Units</th>
                              <th className="px-2 py-1 text-left text-[10px] font-semibold text-[#505454]">Partial Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDistributor.products.length > 0 ? (
                              selectedDistributor.products.map((product, idx) => {
                                const productAny = product as any;
                                const full = productAny.full || 0;
                                const partial = productAny.partial || 0;
                                const fullPricePerUnit = productAny.fullPricePerUnit || 0;
                                const partialPricePerUnit = productAny.partialPricePerUnit || 0;
                                const fullPrice = fullPricePerUnit * full;
                                const partialPrice = partialPricePerUnit * partial;
                                const bothPricesNull = fullPricePerUnit === null && partialPricePerUnit === null;
                                
                                // Calculate adjusted prices
                                const adjustedFullPrice = feeRatePercentage > 0 
                                  ? fullPrice * (1 - feeRatePercentage / 100)
                                  : fullPrice;
                                const adjustedPartialPrice = feeRatePercentage > 0 
                                  ? partialPrice * (1 - feeRatePercentage / 100)
                                  : partialPrice;
                                
                                return (
                                <tr
                                  key={`${product.ndc}-${idx}`}
                                  className="border-b border-[#f3f4f6] hover:bg-[#f5f2f1]"
                                >
                                  <td className="px-2 py-1 text-[10px] text-[#000000] max-w-[150px] truncate" title={product.productName}>
                                    {product.productName}
                                  </td>
                                  <td className="px-2 py-1 text-[10px] font-mono text-[#505454]">{product.ndc}</td>
                                  <td className="px-2 py-1 text-[10px] text-[#505454]">{full}</td>
                                  <td className="px-2 py-1 text-[10px] text-[#505454]">
                                    {bothPricesNull ? '-' : (
                                      feeRatePercentage > 0 ? (
                                        <div className="flex flex-col">
                                          <span className="line-through text-[#9ca3af] text-[9px]">{formatCurrency(fullPrice)}</span>
                                          <span className="font-semibold text-[#516057]">{formatCurrency(adjustedFullPrice)}</span>
                                        </div>
                                      ) : (
                                        <span className="font-semibold">{formatCurrency(fullPrice)}</span>
                                      )
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-[10px] text-[#505454]">{partial}</td>
                                  <td className="px-2 py-1 text-[10px] text-[#505454]">
                                    {bothPricesNull ? '-' : (
                                      feeRatePercentage > 0 ? (
                                        <div className="flex flex-col">
                                          <span className="line-through text-[#9ca3af] text-[9px]">{formatCurrency(partialPrice)}</span>
                                          <span className="font-semibold text-[#516057]">{formatCurrency(adjustedPartialPrice)}</span>
                                        </div>
                                      ) : (
                                        <span className="font-semibold">{formatCurrency(partialPrice)}</span>
                                      )
                                    )}
                                  </td>
                                </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={6} className="px-2 py-6 text-center text-[10px] text-[#6b7280]">
                                  No products found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-[#e2e2e2] flex-shrink-0">
                <button
                  onClick={() => setSelectedDistributor(null)}
                  className="px-3 py-1 bg-[#e2e2e2] text-[#505454] rounded hover:bg-gray-300 text-xs"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await handleDistributorSelect(selectedDistributor);
                    setSelectedDistributor(null);
                  }}
                  disabled={submittingDistributorId === (selectedDistributor.distributorId || selectedDistributor.distributorName)}
                  className="px-3 py-1 bg-[#516057] text-white rounded hover:bg-[#505454] text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {submittingDistributorId === (selectedDistributor.distributorId || selectedDistributor.distributorName) ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Select This Distributor'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Distributor Suggestion Response */}
        {distributorSuggestionData && pendingDistributor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-5xl bg-white rounded-[4px] shadow-xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-[#e2e2e2] flex-shrink-0">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-[#000000]">Distributor Suggestion</h3>
                  <p className="text-xs text-[#505454] mt-0.5 truncate">
                    {pendingDistributor.distributorName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDistributorSuggestionData(null);
                    setPendingDistributor(null);
                    setSubmittingDistributorId(null);
                    setSubmittingAction(null);
                  }}
                  className="p-1.5 hover:bg-[#f5f2f1] rounded-[4px] transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs - Only show if existing package exists */}
              {distributorSuggestionData.packages[0]?.existingPackage && (
                <div className="flex border-b border-[#e2e2e2] flex-shrink-0">
                  <button
                    onClick={() => setActiveModalTab('existing')}
                    className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
                      activeModalTab === 'existing'
                        ? 'bg-[#f5f2f1] text-[#516057] border-b-2 border-[#516057]'
                        : 'text-[#505454] hover:bg-[#f5f2f1]'
                    }`}
                  >
                    Existing Package
                  </button>
                  <button
                    onClick={() => setActiveModalTab('create')}
                    className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
                      activeModalTab === 'create'
                        ? 'bg-[#f5f2f1] text-[#516057] border-b-2 border-[#516057]'
                        : 'text-[#505454] hover:bg-[#f5f2f1]'
                    }`}
                  >
                    Create New
                  </button>
                </div>
              )}

              {/* Modal Content */}
              <div className="flex-1 p-2 overflow-y-auto">
                {distributorSuggestionData.packages.map((pkg: any, idx: number) => {
                  // Get selected fee rate for this distributor
                  const selectedFeeRateDays = pendingDistributor ? selectedFeeRates.get(pendingDistributor.distributorId || '') : null;
                  const distributorAny = pendingDistributor as any;
                  const feeRatePercentage = selectedFeeRateDays && distributorAny?.feeRates?.[selectedFeeRateDays] 
                    ? distributorAny.feeRates[selectedFeeRateDays].percentage
                    : null;
                  
                  // Show different content based on active tab
                  if (pkg.existingPackage && activeModalTab === 'existing') {
                    // Existing Package Tab
                    return (
                      <div key={idx} className="space-y-3">
                        <div className="border border-[#e2e2e2] rounded-[4px] p-2">
                          <h4 className="text-sm font-bold text-[#000000] mb-3">{pkg.distributorName}</h4>
                          
                          {/* Existing Package Info */}
                          <div className="mb-4 p-3 border border-[#e2e2e2] bg-yellow-50 rounded-[4px]">
                            <h5 className="text-xs font-semibold text-[#000000] mb-3">Existing Package Details</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <p className="text-[#505454]">Package Number</p>
                                <p className="font-semibold text-[#000000]">{pkg.existingPackage.packageNumber}</p>
                              </div>
                              <div>
                                <p className="text-[#505454]">Current Items</p>
                                <p className="font-semibold text-[#000000]">{pkg.existingPackage.totalItems}</p>
                              </div>
                              <div>
                                <p className="text-[#505454]">Current Value</p>
                                <p className="font-semibold text-[#000000]">{formatCurrency(pkg.existingPackage.totalEstimatedValue)}</p>
                              </div>
                              <div>
                                <p className="text-[#505454]">Created</p>
                                <p className="font-semibold text-[#000000]">{new Date(pkg.existingPackage.createdAt).toLocaleDateString()}</p>
                              </div>
                              {pkg.existingPackage.feeRate !== undefined && pkg.existingPackage.feeRate !== null && (
                                <div>
                                  <p className="text-[#505454]">Fee Rate</p>
                                  <p className="font-semibold text-[#000000]">{pkg.existingPackage.feeRate}%</p>
                                </div>
                              )}
                              {pkg.existingPackage.feeDuration !== undefined && pkg.existingPackage.feeDuration !== null && (
                                <div>
                                  <p className="text-[#505454]">Fee Duration</p>
                                  <p className="font-semibold text-[#000000]">{pkg.existingPackage.feeDuration} days</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Distributor Contact */}
                          {pkg.distributorContact && (
                            <div className="mb-3 p-2 bg-[#f5f2f1] rounded text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                                {pkg.distributorContact.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-[#6b7280]" />
                                    <span className="text-[#505454] truncate">{pkg.distributorContact.email}</span>
                                  </div>
                                )}
                                {pkg.distributorContact.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-[#6b7280]" />
                                    <span className="text-[#505454]">{pkg.distributorContact.phone}</span>
                                  </div>
                                )}
                                {pkg.distributorContact.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-[#6b7280]" />
                                    <span className="text-[#505454] truncate">{pkg.distributorContact.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    // Create New Tab (or default if no existing package)
                    return (
                      <div key={idx} className="space-y-3">
                        <div className="border border-[#e2e2e2] rounded-[4px] p-2">
                          <h4 className="text-sm font-bold text-[#000000] mb-3">{pkg.distributorName}</h4>

                          {/* Distributor Contact */}
                          {pkg.distributorContact && (
                            <div className="mb-3 p-2 bg-[#f5f2f1] rounded text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                                {pkg.distributorContact.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-[#6b7280]" />
                                    <span className="text-[#505454] truncate">{pkg.distributorContact.email}</span>
                                  </div>
                                )}
                                {pkg.distributorContact.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-[#6b7280]" />
                                    <span className="text-[#505454]">{pkg.distributorContact.phone}</span>
                                  </div>
                                )}
                                {pkg.distributorContact.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-[#6b7280]" />
                                    <span className="text-[#505454] truncate">{pkg.distributorContact.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Fee Rate Selection */}
                          {pkg.distributorContact?.feeRates && Object.keys(pkg.distributorContact.feeRates).length > 0 && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-[4px]">
                              <label className="text-xs font-semibold text-[#505454] mb-2 block">
                                Select Fee Rate:
                              </label>
                              <select
                                value={selectedFeeRateDays || ''}
                                onChange={(e) => {
                                  const selectedDuration = e.target.value;
                                  if (selectedDuration && pendingDistributor && pkg.distributorContact?.feeRates) {
                                    const feeRateData = pkg.distributorContact.feeRates[selectedDuration];
                                    if (feeRateData) {
                                      const newMap = new Map(selectedFeeRates);
                                      newMap.set(pendingDistributor.distributorId || '', selectedDuration);
                                      setSelectedFeeRates(newMap);
                                    }
                                  } else {
                                    // Clear selection if empty
                                    const newMap = new Map(selectedFeeRates);
                                    if (pendingDistributor) {
                                      newMap.delete(pendingDistributor.distributorId || '');
                                    }
                                    setSelectedFeeRates(newMap);
                                  }
                                }}
                                className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[4px] text-xs focus:outline-none focus:ring-2 focus:ring-[#516057]"
                              >
                                <option value="">Select fee rate...</option>
                                {Object.entries(pkg.distributorContact.feeRates).map(([duration, rate]: [string, any]) => (
                                  <option key={duration} value={duration}>
                                    {duration} days - {rate.percentage}%
                                  </option>
                                ))}
                              </select>
                              {selectedFeeRateDays && pkg.distributorContact?.feeRates?.[selectedFeeRateDays] && (
                                <p className="text-xs text-[#516057] mt-1">
                                  Selected: {pkg.distributorContact.feeRates[selectedFeeRateDays].percentage}% for {selectedFeeRateDays} days
                                </p>
                              )}
                            </div>
                          )}

                          {/* Package Stats */}
                          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                            <div>
                              <p className="text-[#505454]">Total Items</p>
                              <p className="font-semibold">{pkg.totalItems}</p>
                            </div>
                            <div>
                              <p className="text-[#505454]">Total Value</p>
                              {feeRatePercentage !== null && feeRatePercentage > 0 ? (
                                <div className="flex flex-col">
                                  <span className="line-through text-[#9ca3af] text-[10px]">{formatCurrency(pkg.totalEstimatedValue)}</span>
                                  <span className="font-semibold text-[#516057]">{formatCurrency(pkg.totalEstimatedValue * (1 - feeRatePercentage / 100))}</span>
                                </div>
                              ) : (
                                <p className="font-semibold">{formatCurrency(pkg.totalEstimatedValue)}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-[#505454]">Avg Price/Unit</p>
                              <p className="font-semibold">{formatCurrency(pkg.averagePricePerUnit)}</p>
                            </div>
                          </div>

                          {/* Products Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr className="bg-[#f5f2f1] border-b border-[#e2e2e2]">
                                  <th className="px-2 py-1 text-left font-semibold text-[#505454]">Product Name</th>
                                  <th className="px-2 py-1 text-left font-semibold text-[#505454]">NDC</th>
                                  <th className="px-2 py-1 text-left font-semibold text-[#505454]">Full</th>
                                  <th className="px-2 py-1 text-left font-semibold text-[#505454]">Partial</th>
                                  <th className="px-2 py-1 text-left font-semibold text-[#505454]">Price/Unit</th>
                                  <th className="px-2 py-1 text-left font-semibold text-[#505454]">Total Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pkg.products.map((product: any, pIdx: number) => {
                                  const adjustedTotalValue = feeRatePercentage !== null && feeRatePercentage > 0
                                    ? product.totalValue * (1 - feeRatePercentage / 100)
                                    : product.totalValue;
                                  
                                  return (
                                    <tr key={pIdx} className="border-b border-[#f3f4f6]">
                                      <td className="px-2 py-1 text-[#000000]">{product.productName}</td>
                                      <td className="px-2 py-1 font-mono text-[#505454]">{product.ndc}</td>
                                      <td className="px-2 py-1 text-[#505454]">{product.full}</td>
                                      <td className="px-2 py-1 text-[#505454]">{product.partial}</td>
                                      <td className="px-2 py-1 text-[#505454]">
                                        <span className="font-semibold">{formatCurrency(product.pricePerUnit)}</span>
                                      </td>
                                      <td className="px-2 py-1 text-[#505454] font-semibold">
                                        {feeRatePercentage !== null && feeRatePercentage > 0 ? (
                                          <div className="flex flex-col">
                                            <span className="line-through text-[#9ca3af] text-[10px]">{formatCurrency(product.totalValue)}</span>
                                            <span className="font-semibold text-[#516057]">{formatCurrency(adjustedTotalValue)}</span>
                                          </div>
                                        ) : (
                                          <span>{formatCurrency(product.totalValue)}</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-[#e2e2e2] flex-shrink-0">
                <button
                  onClick={() => {
                    setDistributorSuggestionData(null);
                    setPendingDistributor(null);
                    setSubmittingDistributorId(null);
                    setSubmittingAction(null);
                  }}
                  className="px-3 py-1 bg-[#e2e2e2] text-[#505454] rounded hover:bg-gray-300 text-xs"
                >
                  Cancel
                </button>
                {(() => {
                  const hasExistingPackage = distributorSuggestionData.packages[0]?.existingPackage;
                  
                  // Show buttons based on active tab
                  if (hasExistingPackage && activeModalTab === 'existing') {
                    // Existing Package Tab - Show Add to Existing button
                    return (
                      <button
                        onClick={handleAddToExistingPackage}
                        disabled={submittingAction !== null}
                        className="px-3 py-1 bg-[#516057] text-white rounded hover:bg-[#516057] text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {submittingAction === 'add' ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add to Existing'
                        )}
                      </button>
                    );
                  } else {
                    // Create New Tab - Show Create Package button
                    return (
                      <button
                        onClick={handleCreateCustomPackage}
                        disabled={(() => {
                          const hasSelectedFeeRate = pendingDistributor ? selectedFeeRates.has(pendingDistributor.distributorId || '') : false;
                          return submittingAction !== null || !hasSelectedFeeRate;
                        })()}
                        className="px-3 py-1 bg-[#516057] text-white rounded hover:bg-[#505454] text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title={(() => {
                          const hasSelectedFeeRate = pendingDistributor ? selectedFeeRates.has(pendingDistributor.distributorId || '') : false;
                          if (!hasSelectedFeeRate) {
                            return "Please select a fee rate to create a new package";
                          }
                          return "";
                        })()}
                      >
                        {submittingAction === 'create' ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Package'
                        )}
                      </button>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

