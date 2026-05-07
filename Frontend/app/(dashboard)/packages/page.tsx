"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, AlertCircle, RefreshCw, X, Eye, Mail, Phone, MapPin, Plus, Trash2, Download, Check, Truck, Copy, CheckCircle, Package as PackageIcon, Info, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { packagesService, optimizationService } from '@/lib/api/services';
import type { PackagesResponse, Package } from '@/lib/api/services';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/Input';

const allowedCarriers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'];
const allowedConditions = ['good', 'damaged', 'partial', 'missing_items', 'other'];

export default function PackagesPage() {
  const router = useRouter();
  const [packagesData, setPackagesData] = useState<PackagesResponse | null>(null);
  const [packagesCache, setPackagesCache] = useState<PackagesResponse | null>(null);
  const [suggestedPackagesCache, setSuggestedPackagesCache] = useState<PackagesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<{ packageId: string; distributorName: string } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [packageType, setPackageType] = useState<'packages' | 'suggested'>('packages');
  const [selectingPackageId, setSelectingPackageId] = useState<string | null>(null);
  const [customPackages, setCustomPackages] = useState<Package[]>([]);
  const [deliveryPackage, setDeliveryPackage] = useState<Package | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [deliveryInfoModal, setDeliveryInfoModal] = useState<{
    open: boolean;
    data: any;
  }>({ open: false, data: null });
  const [deliveryFormData, setDeliveryFormData] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    contactName: '',
    contactPhone: '',
    deliveryDate: '',
    deliveryTime: '',
    deliveryCondition: '',
    trackingNumber: '',
    carrier: '',
    notes: '',
  });
  const [selectedFeeRates, setSelectedFeeRates] = useState<Map<string, string>>(new Map());
  const [deletingItemId, setDeletingItemId] = useState<{ packageId: string; itemId: string; itemName: string } | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<Map<string, { full: number; partial: number }>>(new Map());
  const [editingItemIds, setEditingItemIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch data on initial mount only
  useEffect(() => {
    const fetchBothPackages = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPackages('packages'),
          fetchPackages('suggested')
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchBothPackages();
  }, []);

  // Update displayed data when packageType changes (use cached data)
  useEffect(() => {
    // Only update if we have cached data or if not loading
    // This prevents showing "no data" during initial load
    if (packageType === 'packages') {
      if (packagesCache !== null || !loading) {
        setPackagesData(packagesCache);
      }
    } else {
      if (suggestedPackagesCache !== null || !loading) {
        setPackagesData(suggestedPackagesCache);
      }
    }
  }, [packageType, packagesCache, suggestedPackagesCache, loading]);

  useEffect(() => {
    // Fetch custom packages to check for duplicates when on suggested tab
    // Only fetch if we don't have cached data
    const fetchCustomPackagesForCheck = async () => {
      if (customPackages.length > 0) {
        return; // Already have data
      }
      try {
        const customPkgs = await packagesService.getCustomPackages();
        const transformedPackages = (customPkgs.packages || []).map((pkg: any) => {
          if (pkg.items && !pkg.products) {
            return {
              ...pkg,
              products: pkg.items.map((item: any) => ({
                ndc: item.ndc,
                productName: item.productName,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                totalValue: item.totalValue,
              })),
            };
          }
          return pkg;
        });
        setCustomPackages(transformedPackages);
      } catch (err) {
        // Silently fail - this is just for checking duplicates
        console.error('Error fetching custom packages for duplicate check:', err);
      }
    };

    if (packageType === 'suggested' && packagesCache) {
      // Use cached packages data for duplicate check
      const transformedPackages = (packagesCache.packages || []).map((pkg: any) => {
        if (pkg.items && !pkg.products) {
          return {
            ...pkg,
            products: pkg.items.map((item: any) => ({
              ndc: item.ndc,
              productName: item.productName,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              totalValue: item.totalValue,
            })),
          };
        }
        return pkg;
      });
      setCustomPackages(transformedPackages);
    } else if (packageType === 'suggested') {
      fetchCustomPackagesForCheck();
    }
  }, [packageType, packagesCache]);

  const fetchPackages = async (type: 'packages' | 'suggested' = packageType, showLoading: boolean = false) => {
    try {
      // Show loading only if explicitly requested (for refresh operations)
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Fetch packages based on type
      const packages = type === 'packages' 
        ? await packagesService.getCustomPackages()
        : await packagesService.getSuggestedPackages();
      
      // Debug: Log the response to see the structure
      console.log('API Response:', packages);
      console.log('Stats from API:', packages.stats);
      
      // Transform packages: if items exist, convert to products
      const transformedPackages = (packages.packages || []).map((pkg: any) => {
        // If package has items but no products, convert items to products
        if (pkg.items && !pkg.products) {
          return {
            ...pkg,
            products: pkg.items.map((item: any) => ({
              ndc: item.ndc,
              productName: item.productName,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              totalValue: item.totalValue,
            })),
          };
        }
        return pkg;
      });
      
      // Use stats from API response if available
      const customData: PackagesResponse = {
        packages: transformedPackages,
        total: packages.total || transformedPackages.length,
        totalProducts: packages.stats?.totalProducts || packages.totalProducts || 0,
        totalPackages: packages.total || packages.totalPackages || transformedPackages.length,
        totalEstimatedValue: packages.stats?.totalValue || packages.totalEstimatedValue || 0,
        generatedAt: packages.generatedAt || new Date().toISOString(),
        summary: packages.summary || {
          productsWithPricing: 0,
          productsWithoutPricing: 0,
          distributorsUsed: transformedPackages.length,
        },
        stats: packages.stats,
      };
      
      console.log('Final data with stats:', customData);
      console.log('Stats in final data:', customData.stats);
      
      // Store in appropriate cache
      if (type === 'packages') {
        setPackagesCache(customData);
        // Update displayed data if currently viewing packages
        if (packageType === 'packages') {
          setPackagesData(customData);
        }
      } else {
        setSuggestedPackagesCache(customData);
        // Update displayed data if currently viewing suggested
        if (packageType === 'suggested') {
          setPackagesData(customData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load packages');
      console.error('Error fetching packages:', err);
    } finally {
      // Only set loading to false if we explicitly set it to true for this call
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    fetchPackages(packageType, true);
  };

  const handleDeletePackage = (packageId: string, distributorName: string) => {
    setError(null);
    setPackageToDelete({ packageId, distributorName });
  };

  const confirmDeletePackage = async () => {
    if (!packageToDelete) return;

    try {
      setDeletingId(packageToDelete.packageId);
      setError(null);
      await packagesService.deletePackage(packageToDelete.packageId);
      
      // Refresh both custom packages and suggested packages APIs
      await Promise.all([
        fetchPackages('packages'),
        fetchPackages('suggested')
      ]);
      
      // Reset custom packages cache to force refetch when needed
      setCustomPackages([]);
      
      setPackageToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete package');
      console.error('Error deleting package:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const closeDeleteModal = () => {
    setPackageToDelete(null);
    setError(null);
  };

  const handleStatusToggle = async (packageId: string, currentStatus: boolean) => {
    if (!packageId) return;
    
    const newStatus = !currentStatus;
    try {
      setUpdatingStatusId(packageId);
      setError(null);
      await packagesService.updatePackageStatus(packageId, newStatus);
      
      // Update local state optimistically
      if (packagesData && packagesData.packages) {
        const updatedPackages = packagesData.packages.map(pkg => 
          pkg.id === packageId ? { ...pkg, status: newStatus } : pkg
        );
        
        // Update stats locally
        const updatedStats = packagesData.stats ? { ...packagesData.stats } : undefined;
        if (updatedStats) {
          if (newStatus) {
            updatedStats.deliveredPackages = (updatedStats.deliveredPackages || 0) + 1;
            updatedStats.nonDeliveredPackages = Math.max(0, (updatedStats.nonDeliveredPackages || 0) - 1);
          } else {
            updatedStats.deliveredPackages = Math.max(0, (updatedStats.deliveredPackages || 0) - 1);
            updatedStats.nonDeliveredPackages = (updatedStats.nonDeliveredPackages || 0) + 1;
          }
        }
        
        const updatedData = {
          ...packagesData,
          packages: updatedPackages,
          stats: updatedStats,
        };
        
        setPackagesData(updatedData);
        // Update cache
        setPackagesCache(updatedData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update package status');
      console.error('Error updating package status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeliverySubmit = async () => {
    if (!deliveryPackage || !deliveryPackage.id) {
      setError('Package information is missing');
      return;
    }

    // Validate required fields
    if (!deliveryFormData.contactName || !deliveryFormData.deliveryDate || !deliveryFormData.deliveryCondition || !deliveryFormData.trackingNumber || !deliveryFormData.carrier) {
      setError('Please fill in all required fields (Received By, Delivery Date, Delivery Condition, Tracking Number, and Carrier)');
      return;
    }

    try {
      setUpdatingStatusId(deliveryPackage.id);
      setError(null);
      
      // Format delivery date to ISO string with time
      // If time is provided, use it; otherwise default to 10:30:00
      const timePart = deliveryFormData.deliveryTime || '10:30';
      const deliveryDateTime = `${deliveryFormData.deliveryDate}T${timePart}:00Z`;
      
      // Prepare delivery info payload
      const deliveryInfo = {
        deliveryDate: deliveryDateTime,
        receivedBy: deliveryFormData.contactName,
        deliveryCondition: deliveryFormData.deliveryCondition,
        deliveryNotes: deliveryFormData.notes || '',
        trackingNumber: deliveryFormData.trackingNumber,
        carrier: deliveryFormData.carrier,
      };

      // Update package status to delivered with delivery info
      const response = await packagesService.updatePackageStatus(deliveryPackage.id, true, deliveryInfo);

      // Check if response has status: true and deliveryInfo, then open modal
      if (response && response.status === true && response.deliveryInfo) {
        setDeliveryInfoModal({
          open: true,
          data: response.deliveryInfo,
        });
      }

      // Update local state optimistically
      if (packagesData && packagesData.packages) {
        const updatedPackages = packagesData.packages.map(pkg => 
          pkg.id === deliveryPackage.id ? { 
            ...pkg, 
            status: true,
            deliveryInfo: response.deliveryInfo || pkg.deliveryInfo
          } : pkg
        );
        
        // Update stats locally
        const updatedStats = packagesData.stats ? { ...packagesData.stats } : undefined;
        if (updatedStats) {
          const packageWasDelivered = packagesData.packages.find(p => p.id === deliveryPackage.id)?.status;
          if (!packageWasDelivered) {
            updatedStats.deliveredPackages = (updatedStats.deliveredPackages || 0) + 1;
            updatedStats.nonDeliveredPackages = Math.max(0, (updatedStats.nonDeliveredPackages || 0) - 1);
          }
        }
        
        const updatedData = {
          ...packagesData,
          packages: updatedPackages,
          stats: updatedStats,
        };
        
        setPackagesData(updatedData);
        // Update cache
        setPackagesCache(updatedData);
      }

      // Close delivery form modal and reset form
      setDeliveryPackage(null);
      setDeliveryFormData({
        address: '',
        city: '',
        state: '',
        zipCode: '',
        contactName: '',
        contactPhone: '',
        deliveryDate: '',
        deliveryTime: '',
        deliveryCondition: '',
        trackingNumber: '',
        carrier: '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit delivery information');
      console.error('Error submitting delivery:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const closeDeliveryModal = () => {
    setDeliveryPackage(null);
    setDeliveryFormData({
      address: '',
      city: '',
      state: '',
      zipCode: '',
      contactName: '',
      contactPhone: '',
      deliveryDate: '',
      deliveryTime: '',
      deliveryCondition: '',
      trackingNumber: '',
      carrier: '',
      notes: '',
    });
    setError(null);
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => {
        setCopiedAddress(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
      setError('Failed to copy address to clipboard');
    }
  };

  const handleExportToExcel = () => {
    // Only allow export for packages tab, not suggested packages
    if (packageType !== 'packages') {
      return;
    }

    if (!packagesData || !packagesData.packages || packagesData.packages.length === 0) {
      setError('No data available to export');
      return;
    }

    try {
      // Prepare data for export
      const exportData: any[] = [];
      
      packagesData.packages.forEach((pkg) => {
        // Prioritize items array from API response
        const items = (pkg as any).items || pkg.products || [];
        
        const itemsLength = items.length;
        
        if (items.length === 0) {
          // If no products, export package summary only
          exportData.push({
            'Distributor Name': pkg.distributorName,
            'Distributor ID': pkg.distributorId,
            'Total Items': itemsLength,
            'Total Value': pkg.totalEstimatedValue,
            'Status': packageType === 'packages' ? (pkg.status ? 'Delivered' : 'Pending') : 'N/A',
            'Email': pkg.distributorContact?.email || '',
            'Phone': pkg.distributorContact?.phone || '',
            'Location': pkg.distributorContact?.location || '',
            'Product Name': 'N/A',
            'NDC': 'N/A',
            'Full Units': 'N/A',
            'Partial Units': 'N/A',
            'Price Per Unit': 'N/A',
            'Full Price': 'N/A',
            'Partial Price': 'N/A',
          });
        } else {
          // Export each item as a separate row
          items.forEach((item: any, index: number) => {
            const full = item.full ?? 0;
            const partial = item.partial ?? 0;
            
            // Use pricePerUnit from API response for calculations (same as modal)
            const pricePerUnit = item.pricePerUnit ?? null;
            const fullPricePerUnit = item.fullPricePerUnit ?? item.full_price_per_unit ?? pricePerUnit;
            const partialPricePerUnit = item.partialPricePerUnit ?? item.partial_price_per_unit ?? null;
            
            // Calculate total prices using pricePerUnit (same logic as modal)
            // Full price = pricePerUnit * full (if pricePerUnit exists)
            const fullPrice = pricePerUnit !== null ? pricePerUnit * full : (fullPricePerUnit !== null ? fullPricePerUnit * full : 0);
            const partialPrice = partialPricePerUnit !== null ? partialPricePerUnit * partial : 0;
            
            exportData.push({
              'Distributor Name': index === 0 ? pkg.distributorName : '',
              'Distributor ID': index === 0 ? pkg.distributorId : '',
              'Total Items': index === 0 ? itemsLength : '',
              'Total Value': index === 0 ? pkg.totalEstimatedValue : '',
              'Status': index === 0 && packageType === 'packages' ? (pkg.status ? 'Delivered' : 'Pending') : '',
              'Email': index === 0 ? (pkg.distributorContact?.email || '') : '',
              'Phone': index === 0 ? (pkg.distributorContact?.phone || '') : '',
              'Location': index === 0 ? (pkg.distributorContact?.location || '') : '',
              'Product Name': item.productName || '',
              'NDC': item.ndc || '',
              'Full Units': full,
              'Partial Units': partial,
              'Price Per Unit': pricePerUnit !== null ? pricePerUnit : '',
              'Full Price': fullPrice,
              'Partial Price': partialPrice,
            });
          });
        }
      });

      // Create workbook and worksheet for packages
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, packageType === 'packages' ? 'Packages' : 'Suggested Packages');

      // Set column widths for packages sheet
      const colWidths = [
        { wch: 25 }, // Distributor Name
        { wch: 15 }, // Distributor ID
        { wch: 12 }, // Total Items
        { wch: 15 }, // Total Value
        { wch: 12 }, // Status
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 20 }, // Location
        { wch: 30 }, // Product Name
        { wch: 15 }, // NDC
        { wch: 12 }, // Full Units
        { wch: 12 }, // Partial Units
        { wch: 15 }, // Price Per Unit
        { wch: 15 }, // Full Price
        { wch: 15 }, // Partial Price
      ];
      ws['!cols'] = colWidths;

      // Create second sheet for items
      const itemsData: any[] = [];
      packagesData.packages.forEach((pkg) => {
        const items = (pkg as any).items || pkg.products || [];
        items.forEach((item: any) => {
          const full = item.full ?? 0;
          const partial = item.partial ?? 0;
          const pricePerUnit = item.pricePerUnit ?? null;
          const fullPricePerUnit = item.fullPricePerUnit ?? item.full_price_per_unit ?? pricePerUnit;
          const partialPricePerUnit = item.partialPricePerUnit ?? item.partial_price_per_unit ?? null;
          const fullPrice = pricePerUnit !== null ? pricePerUnit * full : (fullPricePerUnit !== null ? fullPricePerUnit * full : 0);
          const partialPrice = partialPricePerUnit !== null ? partialPricePerUnit * partial : 0;
          
          itemsData.push({
            'Package Number': (pkg as any).packageNumber || '',
            'Distributor Name': pkg.distributorName,
            'Distributor ID': pkg.distributorId,
            'Product Name': item.productName || '',
            'NDC': item.ndc || '',
            'Full Units': full,
            'Partial Units': partial,
            'Price Per Unit': pricePerUnit !== null ? pricePerUnit : '',
            'Full Price': fullPrice,
            'Partial Price': partialPrice,
            'Total Value': item.totalValue ?? (fullPrice + partialPrice),
            'Status': packageType === 'packages' ? (pkg.status ? 'Delivered' : 'Pending') : 'N/A',
          });
        });
      });

      // Create items worksheet
      if (itemsData.length > 0) {
        const wsItems = XLSX.utils.json_to_sheet(itemsData);
        const itemsColWidths = [
          { wch: 25 }, // Package Number
          { wch: 25 }, // Distributor Name
          { wch: 15 }, // Distributor ID
          { wch: 30 }, // Product Name
          { wch: 15 }, // NDC
          { wch: 12 }, // Full Units
          { wch: 12 }, // Partial Units
          { wch: 15 }, // Price Per Unit
          { wch: 15 }, // Full Price
          { wch: 15 }, // Partial Price
          { wch: 15 }, // Total Value
          { wch: 12 }, // Status
        ];
        wsItems['!cols'] = itemsColWidths;
        XLSX.utils.book_append_sheet(wb, wsItems, 'Items');
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${packageType === 'packages' ? 'Packages' : 'Suggested_Packages'}_${timestamp}.xlsx`;

      // Export file
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      setError(err.message || 'Failed to export data to Excel');
      console.error('Error exporting to Excel:', err);
    }
  };

  const handleExportSinglePackage = (pkg: Package) => {
    try {
      // Prioritize items array from API response
      const items = (pkg as any).items || pkg.products || [];
      const exportData: any[] = [];
      
      const itemsLength = items.length;
      
      if (items.length === 0) {
        // If no products, export package summary only
        exportData.push({
          'Distributor Name': pkg.distributorName,
          'Distributor ID': pkg.distributorId,
          'Total Items': itemsLength,
          'Total Value': pkg.totalEstimatedValue,
          'Status': packageType === 'packages' ? (pkg.status ? 'Delivered' : 'Pending') : 'N/A',
          'Email': pkg.distributorContact?.email || '',
          'Phone': pkg.distributorContact?.phone || '',
          'Location': pkg.distributorContact?.location || '',
          'Product Name': 'N/A',
          'NDC': 'N/A',
          'Full Units': 'N/A',
          'Partial Units': 'N/A',
          'Price Per Unit': 'N/A',
          'Full Price': 'N/A',
          'Partial Price': 'N/A',
        });
      } else {
        // Export each item as a separate row
        items.forEach((item: any, index: number) => {
          const full = item.full ?? 0;
          const partial = item.partial ?? 0;
          
          // Use pricePerUnit from API response for calculations (same as modal)
          const pricePerUnit = item.pricePerUnit ?? null;
          const fullPricePerUnit = item.fullPricePerUnit ?? item.full_price_per_unit ?? pricePerUnit;
          const partialPricePerUnit = item.partialPricePerUnit ?? item.partial_price_per_unit ?? null;
          
          // Calculate total prices using pricePerUnit (same logic as modal)
          // Full price = pricePerUnit * full (if pricePerUnit exists)
          const fullPrice = pricePerUnit !== null ? pricePerUnit * full : (fullPricePerUnit !== null ? fullPricePerUnit * full : 0);
          const partialPrice = partialPricePerUnit !== null ? partialPricePerUnit * partial : 0;
          
          exportData.push({
            'Distributor Name': index === 0 ? pkg.distributorName : '',
            'Distributor ID': index === 0 ? pkg.distributorId : '',
            'Total Items': index === 0 ? itemsLength : '',
            'Total Value': index === 0 ? pkg.totalEstimatedValue : '',
            'Status': index === 0 && packageType === 'packages' ? (pkg.status ? 'Delivered' : 'Pending') : '',
            'Email': index === 0 ? (pkg.distributorContact?.email || '') : '',
            'Phone': index === 0 ? (pkg.distributorContact?.phone || '') : '',
            'Location': index === 0 ? (pkg.distributorContact?.location || '') : '',
            'Product Name': item.productName || '',
            'NDC': item.ndc || '',
            'Full Units': full,
            'Partial Units': partial,
            'Price Per Unit': pricePerUnit !== null ? pricePerUnit : '',
            'Full Price': fullPrice,
            'Partial Price': partialPrice,
          });
        });
      }

      // Create workbook and worksheet for package
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      const packageNumber = (pkg as any).packageNumber || pkg.distributorName?.replace(/\s+/g, '_') || 'Package';
      XLSX.utils.book_append_sheet(wb, ws, 'Package');

      // Set column widths for package sheet
      const colWidths = [
        { wch: 25 }, // Distributor Name
        { wch: 15 }, // Distributor ID
        { wch: 12 }, // Total Items
        { wch: 15 }, // Total Value
        { wch: 12 }, // Status
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 20 }, // Location
        { wch: 30 }, // Product Name
        { wch: 15 }, // NDC
        { wch: 12 }, // Full Units
        { wch: 12 }, // Partial Units
        { wch: 15 }, // Price Per Unit
        { wch: 15 }, // Full Price
        { wch: 15 }, // Partial Price
      ];
      ws['!cols'] = colWidths;

      // Create second sheet for items
      if (items.length > 0) {
        const itemsData: any[] = [];
        items.forEach((item: any) => {
          const full = item.full ?? 0;
          const partial = item.partial ?? 0;
          const pricePerUnit = item.pricePerUnit ?? null;
          const fullPricePerUnit = item.fullPricePerUnit ?? item.full_price_per_unit ?? pricePerUnit;
          const partialPricePerUnit = item.partialPricePerUnit ?? item.partial_price_per_unit ?? null;
          const fullPrice = pricePerUnit !== null ? pricePerUnit * full : (fullPricePerUnit !== null ? fullPricePerUnit * full : 0);
          const partialPrice = partialPricePerUnit !== null ? partialPricePerUnit * partial : 0;
          
          itemsData.push({
            'Package Number': packageNumber,
            'Distributor Name': pkg.distributorName,
            'Distributor ID': pkg.distributorId,
            'Product Name': item.productName || '',
            'NDC': item.ndc || '',
            'Full Units': full,
            'Partial Units': partial,
            'Price Per Unit': pricePerUnit !== null ? pricePerUnit : '',
            'Full Price': fullPrice,
            'Partial Price': partialPrice,
            'Total Value': item.totalValue ?? (fullPrice + partialPrice),
            'Status': packageType === 'packages' ? (pkg.status ? 'Delivered' : 'Pending') : 'N/A',
          });
        });

        const wsItems = XLSX.utils.json_to_sheet(itemsData);
        const itemsColWidths = [
          { wch: 25 }, // Package Number
          { wch: 25 }, // Distributor Name
          { wch: 15 }, // Distributor ID
          { wch: 30 }, // Product Name
          { wch: 15 }, // NDC
          { wch: 12 }, // Full Units
          { wch: 12 }, // Partial Units
          { wch: 15 }, // Price Per Unit
          { wch: 15 }, // Full Price
          { wch: 15 }, // Partial Price
          { wch: 15 }, // Total Value
          { wch: 12 }, // Status
        ];
        wsItems['!cols'] = itemsColWidths;
        XLSX.utils.book_append_sheet(wb, wsItems, 'Items');
      }

      // Generate filename with package number or distributor name
      const timestamp = new Date().toISOString().split('T')[0];
      const safePackageName = packageNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Package_${safePackageName}_${timestamp}.xlsx`;

      // Export file
      XLSX.writeFile(wb, filename);
    } catch (err: any) {
      setError(err.message || 'Failed to export package to Excel');
      console.error('Error exporting package to Excel:', err);
    }
  };

  // Check if items already exist in any existing package
  const areItemsAlreadyInPackage = (items: Array<{ ndc: string; quantity: number }>): { exists: boolean; packageNumber?: string } => {
    // Create a map of items to check (ndc -> quantity)
    const itemsMap = new Map<string, number>();
    items.forEach(item => {
      const currentQty = itemsMap.get(item.ndc) || 0;
      itemsMap.set(item.ndc, currentQty + item.quantity);
    });

    // Use customPackages if available, otherwise fall back to packagesCache
    const packagesToCheck = customPackages.length > 0 
      ? customPackages 
      : (packagesCache?.packages || []);

    // Check each existing package
    for (const existingPkg of packagesToCheck) {
      const existingItems = existingPkg.products || (existingPkg as any).items || [];
      
      // Create a map of existing package items
      const existingItemsMap = new Map<string, number>();
      existingItems.forEach((item: any) => {
        const currentQty = existingItemsMap.get(item.ndc) || 0;
        existingItemsMap.set(item.ndc, currentQty + (item.quantity || 0));
      });

      // Check if all items match
      let allItemsMatch = true;
      if (itemsMap.size !== existingItemsMap.size) {
        continue; // Different number of unique NDCs, skip this package
      }

      for (const [ndc, quantity] of itemsMap.entries()) {
        const existingQty = existingItemsMap.get(ndc);
        if (existingQty !== quantity) {
          allItemsMatch = false;
          break;
        }
      }

      if (allItemsMatch) {
        return { 
          exists: true, 
          packageNumber: existingPkg.packageNumber || existingPkg.id 
        };
      }
    }

    return { exists: false };
  };

  const handleSelectPackage = async (pkg: Package) => {
    // Validate package data
    if (!pkg.distributorId || !pkg.distributorName) {
      setError('Package information is incomplete');
      return;
    }

    // Prioritize items array from API response
    const items = (pkg as any).items || pkg.products || [];
    if (items.length === 0) {
      setError('No products found in this package');
      return;
    }

    // Set loading state immediately
    setSelectingPackageId(pkg.distributorId);
    setError(null);

    try {
      // Transform items to the required format (matching API response structure)
      const transformedItems = items.map((item: any) => ({
        productId: item.productId,
        ndc: item.ndc,
        productName: item.productName,
        full: item.full ?? 0,
        partial: item.partial ?? 0,
        pricePerUnit: item.pricePerUnit ?? 0,
        totalValue: item.totalValue ?? 0,
      }));

      // Get selected fee rate for this distributor
      const selectedFeeRateDays = selectedFeeRates.get(pkg.distributorId || '');
      const pkgAny = pkg as any;
      const feeRatePercentage = selectedFeeRateDays && pkgAny.distributorContact?.feeRates?.[selectedFeeRateDays]
        ? pkgAny.distributorContact.feeRates[selectedFeeRateDays].percentage
        : null;
      const feeDuration = selectedFeeRateDays ? parseInt(selectedFeeRateDays) : null;

      // Create the payload matching the API structure
      const payload: any = {
        distributorName: pkg.distributorName,
        distributorId: pkg.distributorId,
        items: transformedItems.map((item: any) => ({
          id: item.productId,
          ndc: item.ndc,
          productId: item.productId,
          product_id: item.productId,
          productName: item.productName,
          product_name: item.productName,
          full: item.full,
          partial: item.partial,
          pricePerUnit: item.pricePerUnit,
          price_per_unit: item.pricePerUnit,
          totalValue: item.totalValue,
          total_value: item.totalValue,
        })),
        notes: '', // Optional notes field
      };

      // Only include feeRate and feeDuration if they were selected
      if (feeRatePercentage !== null && feeDuration !== null) {
        payload.feeRate = feeRatePercentage;
        payload.feeDuration = feeDuration;
      }

      // Call the API (pharmacy_id will be added automatically by the API client)
      await optimizationService.createCustomPackage(payload);

      // Refresh both packages and suggested packages to update the UI
      await fetchPackages('packages');
      await fetchPackages('suggested');
      
      // Switch to packages tab to show the newly created package
      setPackageType('packages');
    } catch (err: any) {
      setError(err.message || 'Failed to create custom package');
      console.error('Error creating custom package:', err);
    } finally {
      setSelectingPackageId(null);
    }
  };

  const handleEditItem = (packageId: string, itemId: string, item: any) => {
    const key = `${packageId}-${itemId}`;
    setEditingItemIds(new Set(editingItemIds).add(key));
    setEditingItems(new Map(editingItems.set(key, { full: item.full ?? 0, partial: item.partial ?? 0 })));
  };

  const handleCancelEdit = (packageId: string, itemId: string) => {
    const key = `${packageId}-${itemId}`;
    const newEditingIds = new Set(editingItemIds);
    newEditingIds.delete(key);
    setEditingItemIds(newEditingIds);
    
    const newEditingItems = new Map(editingItems);
    newEditingItems.delete(key);
    setEditingItems(newEditingItems);
  };

  const handleUnitChange = (packageId: string, itemId: string, item: any, field: 'full' | 'partial', value: number) => {
    const key = `${packageId}-${itemId}`;
    const currentEdit = editingItems.get(key) || { full: item.full ?? 0, partial: item.partial ?? 0 };
    const newEdit = { ...currentEdit, [field]: value };
    setEditingItems(new Map(editingItems.set(key, newEdit)));
  };

  const handleSubmitItem = async (packageId: string, itemId: string, item: any) => {
    const key = `${packageId}-${itemId}`;
    const editedValues = editingItems.get(key);
    
    if (!editedValues) return;
    
    setUpdatingItem(itemId);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Calculate new total value
      const pricePerUnit = item.pricePerUnit ?? 0;
      const totalUnits = editedValues.full + editedValues.partial;
      const newTotalValue = pricePerUnit * totalUnits;
      
      await optimizationService.updatePackageItem(packageId, itemId, {
        ndc: item.ndc,
        productName: item.productName,
        full: editedValues.full,
        partial: editedValues.partial,
        pricePerUnit: pricePerUnit,
        totalValue: newTotalValue,
      });
      
      // Refresh packages data
      await fetchPackages('packages');
      
      // Update selectedPackage if it's the same package
      if (selectedPackage && (selectedPackage as any).id === packageId) {
        const updated = await packagesService.getCustomPackages();
        const updatedPackage = updated.packages?.find((p: any) => p.id === packageId);
        if (updatedPackage) {
          setSelectedPackage(updatedPackage);
        }
      }
      
      // Exit edit mode
      const newEditingIds = new Set(editingItemIds);
      newEditingIds.delete(key);
      setEditingItemIds(newEditingIds);
      
      const newEditingItems = new Map(editingItems);
      newEditingItems.delete(key);
      setEditingItems(newEditingItems);
      
      // Show success message
      setSuccessMessage('Item updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
      setSuccessMessage(null);
      console.error('Error updating item:', err);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleDeleteItem = (packageId: string, itemId: string, itemName: string) => {
    setDeletingItemId({ packageId, itemId, itemName });
    setError(null);
  };

  const confirmDeleteItem = async () => {
    if (!deletingItemId) return;
    
    setUpdatingItem(deletingItemId.itemId);
    setError(null);
    setSuccessMessage(null);
    try {
      await optimizationService.deletePackageItem(deletingItemId.packageId, deletingItemId.itemId);
      
      // Refresh packages data
      await fetchPackages('packages');
      
      // Update selectedPackage if it's the same package
      if (selectedPackage && (selectedPackage as any).id === deletingItemId.packageId) {
        const updated = await packagesService.getCustomPackages();
        const updatedPackage = updated.packages?.find((p: any) => p.id === deletingItemId.packageId);
        if (updatedPackage) {
          setSelectedPackage(updatedPackage);
        } else {
          // If package has no items left, close the modal
          setSelectedPackage(null);
        }
      }
      
      setDeletingItemId(null);
      
      // Show success message
      setSuccessMessage('Item deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
      setSuccessMessage(null);
      console.error('Error deleting item:', err);
    } finally {
      setUpdatingItem(null);
    }
  };

  const closeDeleteItemModal = () => {
    setDeletingItemId(null);
    setError(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-2 p-2">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Packages</h1>

        {/* Success Message Toast - Fixed position above modals */}
        {successMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-green-50 border border-green-200 rounded-lg p-3 shadow-lg flex items-center justify-between min-w-[300px] max-w-[90%]">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-800 font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 flex-shrink-0 ml-2"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Error Message Toast - Fixed position above modals */}
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg flex items-center justify-between min-w-[300px] max-w-[90%]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Summary Card - Stats on Top */}
        {packagesData && (() => {
          // Debug: Log stats
          console.log('packagesData.stats:', packagesData.stats);
          console.log('packagesData:', packagesData);
          
          // Use stats from API response if available, otherwise calculate
          const totalProducts = packagesData.stats?.totalProducts ?? packagesData.totalProducts ?? 0;
          const totalValue = packagesData.stats?.totalValue ?? packagesData.totalEstimatedValue ?? 0;
          const totalPackages = packagesData.total ?? packagesData.totalPackages ?? 0;
          const deliveredPackages = packagesData.stats?.deliveredPackages ?? 0;
          const nonDeliveredPackages = packagesData.stats?.nonDeliveredPackages ?? 0;
          
          return (
            <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200">
              <CardContent className="p-2">
                <div className={`grid gap-2 ${packageType === 'packages' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5">Total Packages</p>
                    <p className="text-base sm:text-lg font-bold text-teal-700">{totalPackages}</p>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5">Total Value</p>
                    <p className="text-base sm:text-lg font-bold text-teal-700">{formatCurrency(totalValue)}</p>
                  </div>
                  {packageType === 'packages' && (
                    <>
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5">Delivered</p>
                        <p className="text-base sm:text-lg font-bold text-green-700">{deliveredPackages}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5">Pending</p>
                        <p className="text-base sm:text-lg font-bold text-green-700">{nonDeliveredPackages}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Toggle Buttons and Action Buttons - All in One Line */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Left Side - Package Type Toggle Buttons */}
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setPackageType('packages')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                packageType === 'packages'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Packages
            </button>
            <button
              onClick={() => setPackageType('suggested')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                packageType === 'suggested'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Suggested Packages
            </button>
          </div>

          {/* Right Side - Refresh, Export and Create Package Buttons */}
          <div className="flex gap-1 justify-end w-full sm:w-auto ml-auto">
            
            {packageType === 'packages' && packagesData && packagesData.packages && packagesData.packages.length > 0 && (
              <button
                onClick={handleExportToExcel}
                className="px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center gap-1 text-xs font-medium transition-all shadow-sm"
              >
                <Download className="h-3 w-3" />
                <span className=" sm:inline">Export All</span>
              </button>
            )}
            {packageType === 'packages' && (
              <button
                onClick={() => router.push('/packages/suggestions')}
                className="px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center gap-1 text-xs font-medium transition-all shadow-sm"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Create Package</span>
                <span className="sm:hidden">Create</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-red-800 font-medium">Error</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Information Card */}
        <Card className="bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <CardContent className="p-2">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <PackageIcon className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-teal-600 mb-1">
                  About Packages
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-700 leading-relaxed">
                  Packages are optimized collections of pharmacy products grouped by distributor to maximize return value. They organize your inventory items (NDC codes, quantities, and prices) into bundles that should be sent to specific reverse distributors based on historical pricing data from return reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Packages Table */}
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-sm sm:text-base">Package List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Distributor</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Total Items</th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Total Value</th>
                    {packageType === 'suggested' && (
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Fee Rate</th>
                    )}
                    {/* <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Avg Price/Unit</th> */}
                    {packageType === 'packages' && (
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Deliver</th>
                    )}
                    {/* <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Contact</th> */}
                        <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={packageType === 'packages' ? 5 : 5} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                          <p className="text-xs text-gray-600">Loading packages...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error && !packagesData ? (
                    <tr>
                      <td colSpan={packageType === 'packages' ? 5 : 5} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                          <p className="text-xs text-gray-600">{error || 'No packages available'}</p>
                          <button
                            onClick={handleRefresh}
                            className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-1 text-xs"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : packagesData && packagesData.packages && packagesData.packages.length > 0 ? (
                    packagesData.packages.map((pkg, index) => {
                      // Calculate adjusted total value based on selected fee rate
                      const selectedFeeRateDays = selectedFeeRates.get(pkg.distributorId || '');
                      const pkgAny = pkg as any;
                      const feeRatePercentage = selectedFeeRateDays && pkgAny.distributorContact?.feeRates?.[selectedFeeRateDays]
                        ? pkgAny.distributorContact.feeRates[selectedFeeRateDays].percentage
                        : 0;
                      const adjustedTotalValue = feeRatePercentage > 0
                        ? pkg.totalEstimatedValue * (1 - feeRatePercentage / 100)
                        : pkg.totalEstimatedValue;

                      return (
                        <tr
                          key={`${pkg.distributorId}-${index}`}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-2 py-1.5 text-xs text-gray-900">{pkg.distributorName}</td>
                          <td className="px-2 py-1.5 text-xs text-gray-700">{((pkg as any).items || pkg.products || []).length}</td>
                          <td className="px-2 py-1.5 text-xs text-gray-700">
                            {packageType === 'suggested' && feeRatePercentage > 0 ? (
                              <div className="flex flex-col">
                                <span className="line-through text-gray-400 text-[10px]">{formatCurrency(pkg.totalEstimatedValue)}</span>
                                <span className="font-semibold text-teal-700">{formatCurrency(adjustedTotalValue)}</span>
                              </div>
                            ) : (
                              formatCurrency(pkg.totalEstimatedValue)
                            )}
                          </td>
                          {packageType === 'suggested' && (
                            <td className="px-2 py-1.5">
                              <select
                                value={selectedFeeRates.get(pkg.distributorId || '') || ''}
                                onChange={(e) => {
                                  const newMap = new Map(selectedFeeRates);
                                  if (e.target.value) {
                                    newMap.set(pkg.distributorId || '', e.target.value);
                                  } else {
                                    newMap.delete(pkg.distributorId || '');
                                  }
                                  setSelectedFeeRates(newMap);
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                disabled={!pkgAny.distributorContact?.feeRates}
                              >
                                <option value="">Select</option>
                                {pkgAny.distributorContact?.feeRates && Object.entries(pkgAny.distributorContact.feeRates).map(([days, rate]: [string, any]) => (
                                  <option key={days} value={days}>
                                    {days} days - {rate.percentage}%
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          {/* <td className="px-2 py-1.5 text-xs text-gray-700">{formatCurrency(pkg.averagePricePerUnit)}</td> */}
                        {packageType === 'packages' && (
                          <td className="px-2 py-1.5">
                            {pkg.status === true ? (
                              pkg.deliveryInfo ? (
                                <button
                                  onClick={() => setDeliveryInfoModal({ open: true, data: pkg.deliveryInfo })}
                                  className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium hover:bg-green-200 transition-colors cursor-pointer"
                                  title="Click to view delivery information"
                                >
                                  Delivered
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                  Delivered
                                </span>
                              )
                            ) : (
                              <button
                                onClick={() => setDeliveryPackage(pkg)}
                                disabled={!pkg.id || updatingStatusId === (pkg.id || '')}
                                className="px-2 py-0.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                <Truck className="h-3 w-3" />
                                Deliver
                              </button>
                            )}
                          </td>
                        )}
                        {/* <td className="px-2 py-1.5 text-xs text-gray-700">
                          <div className="flex flex-col gap-0.5">
                            {pkg.distributorContact?.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5 text-gray-500" />
                                <span className="text-[10px]">{pkg.distributorContact.email}</span>
                              </div>
                            )}
                            {pkg.distributorContact?.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 text-gray-500" />
                                <span className="text-[10px]">{pkg.distributorContact.phone}</span>
                              </div>
                            )}
                          </div>
                        </td> */}
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedPackage(pkg)}
                              className="px-2 py-0.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </button>
                            {packageType === 'packages' && (
                              <button
                                onClick={() => handleExportSinglePackage(pkg)}
                                className="px-2 py-0.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 flex items-center gap-1"
                                title="Export this package to Excel"
                              >
                                <Download className="h-3 w-3" />
                                Export
                              </button>
                            )}
                            {packageType === 'suggested' && (
                              <button
                                onClick={() => handleSelectPackage(pkg)}
                                disabled={(() => {
                                  const pkgAny = pkg as any;
                                  const feeRates = pkgAny.distributorContact?.feeRates;
                                  const hasFeeRates = feeRates && Object.keys(feeRates).length > 0;
                                  const hasSelectedFeeRate = selectedFeeRates.get(pkg.distributorId || '');
                                  // Disable if fee rates exist but none is selected, or if already selecting
                                  return selectingPackageId === pkg.distributorId || (hasFeeRates && !hasSelectedFeeRate);
                                })()}
                                className="px-2 py-0.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                                title={(() => {
                                  const pkgAny = pkg as any;
                                  const feeRates = pkgAny.distributorContact?.feeRates;
                                  const hasFeeRates = feeRates && Object.keys(feeRates).length > 0;
                                  const hasSelectedFeeRate = selectedFeeRates.get(pkg.distributorId || '');
                                  if (hasFeeRates && !hasSelectedFeeRate) {
                                    return "Please select a fee rate first";
                                  }
                                  return "";
                                })()}
                              >
                                {selectingPackageId === pkg.distributorId ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                Create
                              </button>
                            )}
                            {packageType === 'packages' && pkg.id && pkg.status !== true && (
                              <button
                                onClick={() => handleDeletePackage(pkg.id || pkg.distributorId, pkg.distributorName)}
                                disabled={deletingId === (pkg.id || pkg.distributorId)}
                                className="px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {deletingId === (pkg.id || pkg.distributorId) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  ) : (
                    <tr>
                      <td colSpan={packageType === 'packages' ? 5 : 5} className="px-2 py-6 text-center text-xs text-gray-500">
                        No packages available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Table View */}
            <div className="md:hidden overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700">Distributor</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700">Items</th>
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700">Value</th>
                    {packageType === 'suggested' && (
                      <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700">Fee Rate</th>
                    )}
                    {packageType === 'packages' && (
                      <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700">Deliver</th>
                    )}
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={packageType === 'packages' ? 5 : 5} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                          <p className="text-[10px] text-gray-600">Loading packages...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error && !packagesData ? (
                    <tr>
                      <td colSpan={packageType === 'packages' ? 5 : 5} className="px-2 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                          <p className="text-[10px] text-gray-600">{error || 'No packages available'}</p>
                          <button
                            onClick={handleRefresh}
                            className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center gap-1 text-[10px]"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : packagesData && packagesData.packages && packagesData.packages.length > 0 ? (
                    packagesData.packages.map((pkg, index) => {
                      // Calculate adjusted total value based on selected fee rate
                      const selectedFeeRateDays = selectedFeeRates.get(pkg.distributorId || '');
                      const pkgAny = pkg as any;
                      const feeRatePercentage = selectedFeeRateDays && pkgAny.distributorContact?.feeRates?.[selectedFeeRateDays]
                        ? pkgAny.distributorContact.feeRates[selectedFeeRateDays].percentage
                        : 0;
                      const adjustedTotalValue = feeRatePercentage > 0
                        ? pkg.totalEstimatedValue * (1 - feeRatePercentage / 100)
                        : pkg.totalEstimatedValue;

                      return (
                        <tr
                          key={`${pkg.distributorId}-${index}`}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-2 py-1 text-[10px] text-gray-900">{pkg.distributorName}</td>
                          <td className="px-2 py-1 text-[10px] text-gray-700">{((pkg as any).items || pkg.products || []).length}</td>
                          <td className="px-2 py-1 text-[10px] text-gray-700">
                            {packageType === 'suggested' && feeRatePercentage > 0 ? (
                              <div className="flex flex-col">
                                <span className="line-through text-gray-400 text-[9px]">{formatCurrency(pkg.totalEstimatedValue)}</span>
                                <span className="font-semibold text-teal-700">{formatCurrency(adjustedTotalValue)}</span>
                              </div>
                            ) : (
                              formatCurrency(pkg.totalEstimatedValue)
                            )}
                          </td>
                          {packageType === 'suggested' && (
                            <td className="px-2 py-1">
                              <select
                                value={selectedFeeRates.get(pkg.distributorId || '') || ''}
                                onChange={(e) => {
                                  const newMap = new Map(selectedFeeRates);
                                  if (e.target.value) {
                                    newMap.set(pkg.distributorId || '', e.target.value);
                                  } else {
                                    newMap.delete(pkg.distributorId || '');
                                  }
                                  setSelectedFeeRates(newMap);
                                }}
                                className="w-full px-1.5 py-0.5 text-[10px] border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                disabled={!pkgAny.distributorContact?.feeRates}
                              >
                                <option value="">Select</option>
                                {pkgAny.distributorContact?.feeRates && Object.entries(pkgAny.distributorContact.feeRates).map(([days, rate]: [string, any]) => (
                                  <option key={days} value={days}>
                                    {days}d-{rate.percentage}%
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                        {packageType === 'packages' && (
                          <td className="px-2 py-1">
                            {pkg.status === true ? (
                              pkg.deliveryInfo ? (
                                <button
                                  onClick={() => setDeliveryInfoModal({ open: true, data: pkg.deliveryInfo })}
                                  className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-medium hover:bg-green-200 transition-colors cursor-pointer"
                                  title="Click to view delivery information"
                                >
                                  Delivered
                                </button>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-medium">
                                  Delivered
                                </span>
                              )
                            ) : (
                              <button
                                onClick={() => setDeliveryPackage(pkg)}
                                disabled={!pkg.id || updatingStatusId === (pkg.id || '')}
                                className="px-1.5 py-0.5 bg-teal-600 text-white text-[10px] rounded hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-0.5"
                              >
                                <Truck className="h-2.5 w-2.5" />
                                Deliver
                              </button>
                            )}
                          </td>
                        )}
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-0.5 flex-wrap">
                            <button
                              onClick={() => setSelectedPackage(pkg)}
                              className="px-1.5 py-0.5 bg-teal-600 text-white text-[10px] rounded hover:bg-teal-700 flex items-center gap-0.5"
                            >
                              <Eye className="h-2.5 w-2.5" />
                              View
                            </button>
                            {packageType === 'packages' && (
                              <button
                                onClick={() => handleExportSinglePackage(pkg)}
                                className="px-1.5 py-0.5 bg-teal-600 text-white text-[10px] rounded hover:bg-teal-700 flex items-center gap-0.5"
                                title="Export this package to Excel"
                              >
                                <Download className="h-2.5 w-2.5" />
                              </button>
                            )}
                            {packageType === 'suggested' && (
                              <button
                                onClick={() => handleSelectPackage(pkg)}
                                disabled={(() => {
                                  const pkgAny = pkg as any;
                                  const feeRates = pkgAny.distributorContact?.feeRates;
                                  const hasFeeRates = feeRates && Object.keys(feeRates).length > 0;
                                  const hasSelectedFeeRate = selectedFeeRates.get(pkg.distributorId || '');
                                  // Disable if fee rates exist but none is selected, or if already selecting
                                  return selectingPackageId === pkg.distributorId || (hasFeeRates && !hasSelectedFeeRate);
                                })()}
                                className="px-1.5 py-0.5 bg-teal-600 text-white text-[10px] rounded hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-0.5"
                                title={(() => {
                                  const pkgAny = pkg as any;
                                  const feeRates = pkgAny.distributorContact?.feeRates;
                                  const hasFeeRates = feeRates && Object.keys(feeRates).length > 0;
                                  const hasSelectedFeeRate = selectedFeeRates.get(pkg.distributorId || '');
                                  if (hasFeeRates && !hasSelectedFeeRate) {
                                    return "Please select a fee rate first";
                                  }
                                  return "";
                                })()}
                              >
                                {selectingPackageId === pkg.distributorId ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : (
                                  <Check className="h-2.5 w-2.5" />
                                )}
                                Create
                              </button>
                            )}
                            {packageType === 'packages' && pkg.id && pkg.status !== true && (
                              <button
                                onClick={() => handleDeletePackage(pkg.id || pkg.distributorId, pkg.distributorName)}
                                disabled={deletingId === (pkg.id || pkg.distributorId)}
                                className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-0.5"
                              >
                                {deletingId === (pkg.id || pkg.distributorId) ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-2.5 w-2.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  ) : (
                    <tr>
                      <td colSpan={packageType === 'packages' ? 5 : 5} className="px-2 py-6 text-center text-[10px] text-gray-500">
                        No packages available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal for Viewing Products */}
        {selectedPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-gray-900 truncate">Products</h3>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {selectedPackage.distributorName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Distributor Contact Info */}
              {selectedPackage.distributorContact && (
                <div className="p-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedPackage.distributorContact.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 truncate text-xs">{selectedPackage.distributorContact.email}</span>
                      </div>
                    )}
                    {selectedPackage.distributorContact.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 text-xs">{selectedPackage.distributorContact.phone}</span>
                      </div>
                    )}
                  </div>
                  {selectedPackage.distributorContact.location && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 mb-0.5">Location</p>
                          <p className="text-xs text-gray-700 break-words">{selectedPackage.distributorContact.location}</p>
                        </div>
                        <button
                          onClick={() => handleCopyAddress(selectedPackage.distributorContact?.location || '')}
                          className="p-1 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                          title="Copy address"
                        >
                          {copiedAddress ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Content */}
              <div className="flex-1 p-2 overflow-y-auto">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Product Name</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">NDC</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Full Units</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Partial Units</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Price/Unit</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Full Price</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Partial Price</th>
                        <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Use items array from API response
                        const items = (selectedPackage as any).items || selectedPackage.products || [];
                        
                        return items.length > 0 ? (
                          items.map((item: any, idx: number) => {
                            const packageId = (selectedPackage as any).id;
                            const itemId = item.id || item.itemId || `${item.ndc}-${idx}`;
                            const editKey = `${packageId}-${itemId}`;
                            
                            // Get edited values or use original
                            const editedValues = editingItems.get(editKey);
                            const full = editedValues?.full ?? item.full ?? 0;
                            const partial = editedValues?.partial ?? item.partial ?? 0;
                            
                            // Use pricePerUnit from API response
                            const pricePerUnit = item.pricePerUnit ?? null;
                            
                            // Calculate prices based on current units
                            let fullPrice = 0;
                            let partialPrice = 0;
                            let totalValue = 0;
                            
                            if (pricePerUnit !== null) {
                              fullPrice = pricePerUnit * full;
                              partialPrice = pricePerUnit * partial;
                              totalValue = fullPrice + partialPrice;
                            } else {
                              // Fallback to original totalValue if no pricePerUnit
                              totalValue = item.totalValue ?? 0;
                              if (full === 0 && partial > 0) {
                                fullPrice = 0;
                                partialPrice = totalValue;
                              } else if (partial === 0 && full > 0) {
                                fullPrice = totalValue;
                                partialPrice = 0;
                              } else if (full > 0 && partial > 0) {
                                const totalUnits = full + partial;
                                fullPrice = (totalValue * full) / totalUnits;
                                partialPrice = (totalValue * partial) / totalUnits;
                              }
                            }
                            
                            const isUpdating = updatingItem === itemId;
                            const isEditing = editingItemIds.has(editKey);
                            
                            return (
                            <tr
                              key={`${item.ndc}-${idx}`}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-2 py-1.5 text-xs text-gray-900">{item.productName}</td>
                              <td className="px-2 py-1.5 text-xs font-mono text-gray-600">{item.ndc}</td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={full}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    handleUnitChange(packageId, itemId, item, 'full', value);
                                  }}
                                  disabled={!isEditing || isUpdating}
                                  className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={partial}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    handleUnitChange(packageId, itemId, item, 'partial', value);
                                  }}
                                  disabled={!isEditing || isUpdating}
                                  className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-700">
                                {pricePerUnit !== null ? formatCurrency(pricePerUnit) : '-'}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-700 font-semibold">
                                {fullPrice > 0 ? formatCurrency(fullPrice) : '-'}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-700 font-semibold">
                                {partialPrice > 0 ? formatCurrency(partialPrice) : '-'}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {isUpdating ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                                  ) : isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleSubmitItem(packageId, itemId, item)}
                                        className="p-1 hover:bg-teal-100 rounded transition-colors"
                                        title="Submit changes"
                                      >
                                        <Check className="h-3 w-3 text-teal-600" />
                                      </button>
                                      <button
                                        onClick={() => handleCancelEdit(packageId, itemId)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        title="Cancel editing"
                                      >
                                        <X className="h-3 w-3 text-gray-600" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditItem(packageId, itemId, item)}
                                        className="p-1 hover:bg-teal-100 rounded transition-colors"
                                        title="Edit item"
                                      >
                                        <Pencil className="h-3 w-3 text-teal-600" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteItem(packageId, itemId, item.productName)}
                                        className="p-1 hover:bg-red-100 rounded transition-colors"
                                        title="Delete item"
                                      >
                                        <Trash2 className="h-3 w-3 text-red-600" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-2 py-6 text-center text-xs text-gray-500">
                              No products found
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-2">
                  {(() => {
                    // Use items array from API response
                    const items = (selectedPackage as any).items || selectedPackage.products || [];
                    
                    return items.length > 0 ? (
                      items.map((item: any, idx: number) => {
                        const packageId = (selectedPackage as any).id;
                        const itemId = item.id || item.itemId || `${item.ndc}-${idx}`;
                        const editKey = `${packageId}-${itemId}`;
                        
                        // Get edited values or use original
                        const editedValues = editingItems.get(editKey);
                        const full = editedValues?.full ?? item.full ?? 0;
                        const partial = editedValues?.partial ?? item.partial ?? 0;
                        
                        // Use pricePerUnit from API response
                        const pricePerUnit = item.pricePerUnit ?? null;
                        
                        // Calculate prices based on current units
                        let fullPrice = 0;
                        let partialPrice = 0;
                        let totalValue = 0;
                        
                        if (pricePerUnit !== null) {
                          fullPrice = pricePerUnit * full;
                          partialPrice = pricePerUnit * partial;
                          totalValue = fullPrice + partialPrice;
                        } else {
                          // Fallback to original totalValue if no pricePerUnit
                          totalValue = item.totalValue ?? 0;
                          if (full === 0 && partial > 0) {
                            fullPrice = 0;
                            partialPrice = totalValue;
                          } else if (partial === 0 && full > 0) {
                            fullPrice = totalValue;
                            partialPrice = 0;
                          } else if (full > 0 && partial > 0) {
                            const totalUnits = full + partial;
                            fullPrice = (totalValue * full) / totalUnits;
                            partialPrice = (totalValue * partial) / totalUnits;
                          }
                        }
                        
                        const isUpdating = updatingItem === itemId;
                        const isEditing = editingItemIds.has(editKey);
                        
                        return (
                        <div
                          key={`${item.ndc}-${idx}`}
                          className="bg-gray-50 rounded-lg border border-gray-200 p-2"
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-900">{item.productName}</p>
                              <p className="text-[10px] font-mono text-gray-600 mt-0.5">NDC: {item.ndc}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {isUpdating ? (
                                <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                              ) : isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSubmitItem(packageId, itemId, item)}
                                    className="p-1 hover:bg-teal-100 rounded transition-colors"
                                    title="Submit changes"
                                  >
                                    <Check className="h-3 w-3 text-teal-600" />
                                  </button>
                                  <button
                                    onClick={() => handleCancelEdit(packageId, itemId)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title="Cancel editing"
                                  >
                                    <X className="h-3 w-3 text-gray-600" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditItem(packageId, itemId, item)}
                                    className="p-1 hover:bg-teal-100 rounded transition-colors"
                                    title="Edit item"
                                  >
                                    <Pencil className="h-3 w-3 text-teal-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(packageId, itemId, item.productName)}
                                    className="p-1 hover:bg-red-100 rounded transition-colors"
                                    title="Delete item"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">Full Units</p>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={full}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  handleUnitChange(packageId, itemId, item, 'full', value);
                                }}
                                disabled={!isEditing || isUpdating}
                                className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200"
                              />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 mb-0.5">Partial Units</p>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={partial}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  handleUnitChange(packageId, itemId, item, 'partial', value);
                                }}
                                disabled={!isEditing || isUpdating}
                                className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200"
                              />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500">Price/Unit</p>
                              <p className="font-medium text-gray-700 text-xs">
                                {pricePerUnit !== null ? formatCurrency(pricePerUnit) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500">Full Price</p>
                              <p className="font-semibold text-gray-700 text-xs">
                                {fullPrice > 0 ? formatCurrency(fullPrice) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500">Partial Price</p>
                              <p className="font-semibold text-gray-700 text-xs">
                                {partialPrice > 0 ? formatCurrency(partialPrice) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="px-2 py-6 text-center text-xs text-gray-500">
                        No products found
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {packageToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">Delete Package</h3>
                <button
                  onClick={closeDeleteModal}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={deletingId === packageToDelete.packageId && !error}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-2">
                {error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-red-800 font-medium">Error</p>
                      <p className="text-xs text-red-700 mt-0.5">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-700 mb-1">
                        Are you sure you want to delete the package from <span className="font-semibold">{packageToDelete.distributorName}</span>?
                      </p>
                      <p className="text-xs text-red-600 font-medium">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200">
                <button
                  onClick={closeDeleteModal}
                  disabled={deletingId === packageToDelete.packageId && !error}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {error ? 'Close' : 'Cancel'}
                </button>
                <button
                  onClick={confirmDeletePackage}
                  disabled={deletingId === packageToDelete.packageId}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {deletingId === packageToDelete.packageId ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Information Modal */}
        {deliveryPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-gray-900">Delivery Information</h3>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {deliveryPackage.distributorName}
                  </p>
                </div>
                <button
                  onClick={closeDeliveryModal}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  disabled={updatingStatusId === deliveryPackage.id}
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

                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Received By *
                      </label>
                      <Input
                        placeholder="John Doe"
                        value={deliveryFormData.contactName}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, contactName: e.target.value })}
                        required
                        className="text-xs py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Delivery Date *
                      </label>
                      <Input
                        type="date"
                        value={deliveryFormData.deliveryDate}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveryDate: e.target.value })}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="text-xs py-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Delivery Time
                      </label>
                      <Input
                        type="time"
                        value={deliveryFormData.deliveryTime}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveryTime: e.target.value })}
                        className="text-xs py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Delivery Condition *
                      </label>
                      <select
                        className="w-full px-2 py-1.5 border border-input rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2"
                        value={deliveryFormData.deliveryCondition}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, deliveryCondition: e.target.value })}
                        required
                      >
                        <option value="">Select condition</option>
                        {allowedConditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Tracking Number *
                      </label>
                      <Input
                        placeholder="1Z999AA10123456784"
                        value={deliveryFormData.trackingNumber}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, trackingNumber: e.target.value })}
                        required
                        className="text-xs py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Carrier *
                      </label>
                      <select
                        className="w-full px-2 py-1.5 border border-input rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2"
                        value={deliveryFormData.carrier}
                        onChange={(e) => setDeliveryFormData({ ...deliveryFormData, carrier: e.target.value })}
                        required
                      >
                        <option value="">Select carrier</option>
                        {allowedCarriers.map((carrier) => (
                          <option key={carrier} value={carrier}>
                            {carrier}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Delivery Notes (Optional)
                    </label>
                    <textarea
                      className="w-full px-2 py-1.5 border border-input rounded-lg text-xs min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2"
                      placeholder="Package received in good condition..."
                      value={deliveryFormData.notes}
                      onChange={(e) => setDeliveryFormData({ ...deliveryFormData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={closeDeliveryModal}
                  disabled={updatingStatusId === deliveryPackage.id}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeliverySubmit}
                  disabled={updatingStatusId === deliveryPackage.id}
                  className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-xs disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {updatingStatusId === deliveryPackage.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Truck className="h-3 w-3" />
                      Submit Delivery
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Info Modal */}
        {deliveryInfoModal.open && deliveryInfoModal.data && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-gray-900">Delivery Information</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Package delivery details
                  </p>
                </div>
                <button
                  onClick={() => setDeliveryInfoModal({ open: false, data: null })}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Received By</p>
                      <p className="text-xs font-medium text-gray-900">{deliveryInfoModal.data.receivedBy || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Delivery Date</p>
                      <p className="text-xs font-medium text-gray-900">
                        {deliveryInfoModal.data.deliveryDate 
                          ? new Date(deliveryInfoModal.data.deliveryDate).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Delivery Condition</p>
                      <p className="text-xs font-medium text-gray-900">
                        {deliveryInfoModal.data.deliveryCondition 
                          ? deliveryInfoModal.data.deliveryCondition.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Carrier</p>
                      <p className="text-xs font-medium text-gray-900">{deliveryInfoModal.data.carrier || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Tracking Number</p>
                      <p className="text-xs font-medium text-gray-900 font-mono">{deliveryInfoModal.data.trackingNumber || 'N/A'}</p>
                    </div>
                  </div>

                  {deliveryInfoModal.data.deliveryNotes && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Delivery Notes</p>
                      <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        {deliveryInfoModal.data.deliveryNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setDeliveryInfoModal({ open: false, data: null })}
                  className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Item Confirmation Modal */}
        {deletingItemId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">Delete Item</h3>
                <button
                  onClick={closeDeleteItemModal}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={updatingItem === deletingItemId.itemId && !error}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-2">
                {error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-red-800 font-medium">Error</p>
                      <p className="text-xs text-red-700 mt-0.5">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-700 mb-1">
                        Are you sure you want to delete <span className="font-semibold">{deletingItemId.itemName}</span>?
                      </p>
                      <p className="text-xs text-red-600 font-medium">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-2 border-t border-gray-200">
                <button
                  onClick={closeDeleteItemModal}
                  disabled={updatingItem === deletingItemId.itemId}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {error ? 'Close' : 'Cancel'}
                </button>
                <button
                  onClick={confirmDeleteItem}
                  disabled={updatingItem === deletingItemId.itemId}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {updatingItem === deletingItemId.itemId ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}


