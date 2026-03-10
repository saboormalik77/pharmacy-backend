"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  ScanLine,
  Plus,
  Upload,
  X,
  Search,
  Package,
  FileSpreadsheet,
  Camera,
  Keyboard,
  TrendingUp,
  Download,
  Check,
  Database,
  Loader2,
  AlertTriangle,
  Trash2,
  Edit,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Eye,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import type { ProductListItem, ProductList } from "@/types";
import Link from "next/link";
import { BarcodeScanner } from "@/components/barcode/BarcodeScanner";
import { productsService, productListsService, optimizationService } from "@/lib/api/services";
import type { PackageSuggestionsResponse, PackageSuggestion } from "@/lib/api/services/optimizationService";

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<"scan" | "manual" | "lists">(
    "scan"
  );
  const [ndcInput, setNdcInput] = useState("");
  const [product_name, setProductName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productLists, setProductLists] = useState<ProductList[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState({
    products: false,
    ndcLookup: false,
    barcodeScan: false,
    bulkUpload: false,
    clearAll: false,
    delete: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expirationFilter, setExpirationFilter] = useState<"all" | "expired">(
    "all"
  );

  // Product form fields
  const [lotNumber, setLotNumber] = useState<string>("");
  const [lotNumberError, setLotNumberError] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isFromScan, setIsFromScan] = useState<boolean>(false);
  const [ndcLookupSuccess, setNdcLookupSuccess] = useState<boolean>(false);
  const [originalNdc, setOriginalNdc] = useState<string>(""); // Track original NDC when editing

  // Modals state
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedProductsForList, setSelectedProductsForList] = useState<
    Set<string>
  >(new Set());
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"initial" | "scan" | "manual">("initial");
  const [fullUnits, setFullUnits] = useState<number>(0);
  const [partialUnits, setPartialUnits] = useState<number>(0);
  const [isFullChecked, setIsFullChecked] = useState<boolean>(false);
  const [isPartialChecked, setIsPartialChecked] = useState<boolean>(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  
  // Package suggestions state
  const [modalStep, setModalStep] = useState<1 | 2>(1); // 1: Add Product Form, 2: Package Suggestions
  const [packageSuggestions, setPackageSuggestions] = useState<PackageSuggestionsResponse | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageSuggestion | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [creatingPackage, setCreatingPackage] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  // Store selected feeRate (percentage) and feeDuration (days) for each package by distributorId
  const [selectedFeeRates, setSelectedFeeRates] = useState<Map<string, { feeRate: number; feeDuration: number }>>(new Map());
  const [activeModalTab, setActiveModalTab] = useState<'existing' | 'create'>('create');
  const [packageCardTabs, setPackageCardTabs] = useState<Map<string, 'existing' | 'create'>>(new Map());
  const [activePackageTab, setActivePackageTab] = useState<'existing' | 'new'>('new');

  // Ref for manual entry form to scroll to
  const manualEntryRef = useRef<HTMLDivElement>(null);

  

  // Load products from database on mount
  useEffect(() => {
    loadProducts();
    // loadProductLists();
  }, []);

  // Reload products when filter changes
  useEffect(() => {
    // Filter is applied client-side, no need to reload
  }, [expirationFilter]);

  // Scroll to top when switching to manual tab for editing
  useEffect(() => {
    if (activeTab === "manual" && editingProductId) {
      // Try scrolling immediately
      const scrollToTop = () => {
        if (manualEntryRef.current) {
          manualEntryRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          // Fallback to window scroll if ref not available
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      };

      // Try immediately
      scrollToTop();

      // Also try after a delay to ensure DOM is fully updated
      const scrollTimeout1 = setTimeout(scrollToTop, 100);
      const scrollTimeout2 = setTimeout(scrollToTop, 300);

      return () => {
        clearTimeout(scrollTimeout1);
        clearTimeout(scrollTimeout2);
      };
    }
  }, [activeTab, editingProductId]);

  // Debounce NDC lookup when NDC input changes (only in manual entry mode)
  useEffect(() => {
    // Only lookup in manual entry tab and when modal is open
    if (activeTab !== 'manual' || !isAddProductModalOpen) {
      return;
    }

    // Don't lookup if NDC is empty
    if (!ndcInput.trim()) {
      return;
    }

    // When editing: only lookup if NDC has changed from original
    // When not editing: only lookup if product name is empty
    if (editingProductId) {
      // Check if NDC has changed from original
      const cleanCurrentNdc = ndcInput.replace(/[-\s]/g, '');
      const cleanOriginalNdc = originalNdc.replace(/[-\s]/g, '');
      if (cleanCurrentNdc === cleanOriginalNdc) {
        // NDC hasn't changed, don't lookup
        return;
      }
    } else {
      // Not editing: only lookup if product name is empty
      if (product_name.trim()) {
        return;
      }
    }

    // Debounce the lookup
    const timeoutId = setTimeout(async () => {
      // Clean NDC: remove dashes and spaces
      const cleanNdc = ndcInput.replace(/[-\s]/g, '');
      
      // Only lookup if NDC has at least 10 digits (valid NDC format)
      if (cleanNdc.length < 10 || cleanNdc.length > 11) {
        return;
      }

      try {
        setLoading(prev => ({ ...prev, ndcLookup: true }));
        const response = await fetch(
          `https://rxnav.nlm.nih.gov/REST/ndcstatus.json?ndc=${cleanNdc}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch product information');
        }

        const data = await response.json();
        
        // Extract product name from response
        if (data?.ndcStatus?.conceptName) {
          // When editing and NDC changed, always update product name
          // When not editing, only update if product name is empty
          if (editingProductId || !product_name.trim()) {
            setProductName(data.ndcStatus.conceptName);
            setNdcLookupSuccess(true);
            console.log('✅ Product name auto-filled:', data.ndcStatus.conceptName);
          }
        } else {
          setNdcLookupSuccess(false);
        }
      } catch (err: any) {
        // Silently fail - don't show error to user, just don't auto-fill
        console.log('⚠️ Could not lookup product name for NDC:', cleanNdc);
        setNdcLookupSuccess(false);
      } finally {
        setLoading(prev => ({ ...prev, ndcLookup: false }));
      }
    }, 800); // 800ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [ndcInput, activeTab, isAddProductModalOpen, editingProductId, product_name, originalNdc]);

  const loadProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      console.log("🔄 Loading products from optimization recommendations...");

      // Call optimization recommendations API
      const recommendations = await optimizationService.getRecommendations();
      console.log(`✅ Loaded ${recommendations.recommendations.length} products`);

      // Get existing products to preserve full_units and partial_units
      const existingProducts = products;
      const existingProductsMap = new Map(
        existingProducts.map(p => [p.ndc, p])
      );

      // Transform recommendations to ProductListItem format
      const transformed = recommendations.recommendations.map((rec: any) => {
        // Check if this product already exists in our local state
        const existingProduct = existingProductsMap.get(rec.ndc);
        const existingProductAny = existingProduct as any;
        
        // Use full and partial from API response first, then fallback to existing product values
        // This ensures we always use the latest values from the API
        const fullUnits = rec.full ?? existingProductAny?.full_units ?? existingProductAny?.fullUnits ?? 0;
        const partialUnits = rec.partial ?? existingProductAny?.partial_units ?? existingProductAny?.partialUnits ?? 0;
        
        return {
          id: rec.id || rec.ndc || existingProduct?.id, // Use ID from API or fallback to NDC or existing ID
          ndc: rec.ndc,
          productName: rec.productName,
          full_units: fullUnits,
          partial_units: partialUnits,
          lotNumber: existingProductAny?.lotNumber ?? rec.lotNumber ?? '',
          expirationDate: existingProductAny?.expirationDate ?? rec.expirationDate ?? '',
          notes: existingProductAny?.notes ?? '',
          addedAt: existingProductAny?.addedAt ?? recommendations.generatedAt ?? new Date().toISOString(),
          addedBy: existingProductAny?.addedBy ?? 'system',
          // Keep quantity for backward compatibility
          quantity: fullUnits + partialUnits,
          // Add recommended distributor and price fields
          recommendedDistributor: rec.recommendedDistributor || '',
          price: rec.expectedPrice ?? 0,
          expectedPrice: rec.expectedPrice ?? 0,
        };
      });

      // Merge with existing products that might not be in recommendations yet
      // (e.g., newly added products that haven't been processed)
      const recommendationsNdcs = new Set(transformed.map(p => p.ndc));
      const productsNotInRecommendations = existingProducts.filter(
        p => !recommendationsNdcs.has(p.ndc)
      );
      
      // Combine recommendations with products not in recommendations
      setProducts([...transformed, ...productsNotInRecommendations]);
    } catch (err: any) {
      console.error("❌ Failed to load products:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const handleScan = () => {
    setShowScanner(true);
  };

  const handleBarcodeScan = async (code: string) => {
    console.log("🔍 handleBarcodeScan called with code:", code);
    setShowScanner(false);
    setEntryMode("manual");
    setActiveTab("manual");
    setError(null);
    setLoading(prev => ({ ...prev, barcodeScan: true }));

    if (!code || !code.trim()) {
      console.warn("⚠️ Empty barcode code received");
      setLoading(prev => ({ ...prev, barcodeScan: false }));
      return;
    }

    try {
      // Call backend API to parse barcode using Azure OpenAI
      // Use the API base URL from environment or default
      // Note: Backend runs on port 3000, frontend might be on 3001
      // If NEXT_PUBLIC_API_URL is set, use it, otherwise try backend directly
      let apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://0984419f0c8b.ngrok-free.app/api";

      // If API URL is not set or points to frontend, use backend directly
      // if (!apiBaseUrl || apiBaseUrl.includes('localhost:3001') || apiBaseUrl.includes('localhost:3000/api')) {
      //   // Backend typically runs on port 3000
      //   apiBaseUrl = 'http://localhost:3000/api';
      // }

      const apiUrl = `${apiBaseUrl}/barcode/parse`;

      console.log("📡 Calling backend API:", apiUrl);
      console.log("📦 Request body:", { barcodeData: code });
      console.log("🌐 API Base URL from env:", process.env.NEXT_PUBLIC_API_URL);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barcodeData: code }),
      });

      console.log("📥 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to parse barcode" }));
        console.error("❌ API Error:", errorData);
        throw new Error(
          errorData.message || errorData.error || "Failed to parse barcode"
        );
      }

      const result = await response.json();
      console.log("✅ API Response:", result);

      const parsed = result.data;

      if (!parsed) {
        throw new Error("No data returned from API");
      }

      // Set the parsed values from AI
      setNdcInput(parsed.ndc || code.trim());
      setIsFromScan(true); // Mark that data came from scanning
      // If product name is found, mark lookup as successful
      if (parsed.productName || parsed.product_name) {
        setProductName(parsed.productName || parsed.product_name);
        setNdcLookupSuccess(true);
      } else {
        setNdcLookupSuccess(false);
      }
      if (parsed.lotNumber) {
        setLotNumber(parsed.lotNumber);
        // Validate parsed lot number
        const validation = validateLotNumber(parsed.lotNumber);
        setLotNumberError(validation.isValid ? null : validation.error || null);
      } else {
        setLotNumber("");
        setLotNumberError(null);
      }
      if (parsed.expirationDate) {
        setExpirationDate(parsed.expirationDate);
      } else {
        setExpirationDate("");
      }

      console.log("✅ Parsed data set:", {
        ndc: parsed.ndc,
        lotNumber: parsed.lotNumber,
        expirationDate: parsed.expirationDate,
      });
    } catch (err: any) {
      console.error("❌ Error parsing barcode with AI:", err);
      // Fallback: use the scanned code as NDC
      setNdcInput(code.trim());
      setIsFromScan(true); // Mark that data came from scanning
      setNdcLookupSuccess(false); // No product name found
      setLotNumber("");
      setLotNumberError(null);
      setExpirationDate("");
      setError(
        `Could not parse barcode data: ${
          err.message || "Unknown error"
        }. Using scanned code as NDC only.`
      );
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  // Validate lot number
  const validateLotNumber = (lot: string): { isValid: boolean; error?: string } => {
    const trimmed = lot.trim();
    
    if (!trimmed) {
      return { isValid: false, error: 'Lot number is required' };
    }
    
    // Check length (typically 3-30 characters for pharmaceutical lot numbers)
    if (trimmed.length < 3) {
      return { isValid: false, error: 'Lot number must be at least 3 characters' };
    }
    
    if (trimmed.length > 30) {
      return { isValid: false, error: 'Lot number must not exceed 30 characters' };
    }
    
    // Allow alphanumeric characters, hyphens, underscores, slashes, and spaces
    // Common lot number formats: alphanumeric with optional separators
    const lotPattern = /^[A-Za-z0-9\s\-_/]+$/;
    if (!lotPattern.test(trimmed)) {
      return { isValid: false, error: 'Lot number can only contain letters, numbers, hyphens, underscores, slashes, and spaces' };
    }
    
    // Must contain at least one alphanumeric character (not just special characters)
    if (!/[A-Za-z0-9]/.test(trimmed)) {
      return { isValid: false, error: 'Lot number must contain at least one letter or number' };
    }
    
    return { isValid: true };
  };

  const handleAddProduct = async () => {
    if (!ndcInput.trim()) {
      setError("Please enter an NDC code");
      return;
    }

    if (!product_name.trim()) {
      setError("Please enter a product name");
      return;
    }

    // Validate lot number
    const lotValidation = validateLotNumber(lotNumber);
    if (!lotValidation.isValid) {
      setLotNumberError(lotValidation.error || 'Invalid lot number');
      setError(lotValidation.error || 'Invalid lot number');
      return;
    }
    setLotNumberError(null);

    if (!expirationDate.trim()) {
      setError("Please enter an expiration date");
      return;
    }

    // Validate that at least one checkbox is checked
    if (!isFullChecked && !isPartialChecked) {
      setError("Please select either Full or Partial");
      return;
    }

    // Validate input values
    if (isFullChecked && (!fullUnits || fullUnits <= 0)) {
      setError("Please enter a valid full units value");
      return;
    }

    if (isPartialChecked && (!partialUnits || partialUnits <= 0)) {
      setError("Please enter a valid partial units value");
      return;
    }

    setError(null);
    setLoading(prev => ({ ...prev, products: true }));

    try {
      // Use input values: if Full is checked, use fullUnits value and set partial to 0
      // If Partial is checked, use partialUnits value and set full to 0
      const finalFullUnits = isFullChecked ? fullUnits : 0;
      const finalPartialUnits = isPartialChecked ? partialUnits : 0;

      // Always include all required fields in payload
      const payload: any = {
        ndc: ndcInput.trim(),
        product_name: product_name.trim(),
        full_units: finalFullUnits,
        partial_units: finalPartialUnits,
        lot_number: lotNumber.trim(),
        expiration_date: expirationDate.trim(),
      };

      // Only include notes if it has a value
      if (notes && notes.trim()) {
        payload.notes = notes.trim();
      }

      console.log("📤 Sending payload:", JSON.stringify(payload, null, 2));

      if (editingProductId) {
        // Update existing product
        const updatedItem = await productListsService.updateItem(
          editingProductId,
          payload as any
        );

        console.log("✅ Product updated successfully:", updatedItem);
        
        setSuccess(`Product updated: ${product_name}`);
        
        // Close modal immediately for edits (no package suggestions)
        resetModalState();
        
        // Refresh products table by calling recommendations API
        await loadProducts();
      } else {
        // Add new product
        const addedItem = await productListsService.addItem("", payload as any);

        console.log("✅ Product added to list successfully:", addedItem);
        
        // Add to local state instead of reloading
        const addedItemAny = addedItem as any;
        const newProduct: any = {
          id: addedItem.id || `product-${Date.now()}`,
          ndc: ndcInput,
          productName: product_name,
          full_units: addedItemAny.full_units ?? finalFullUnits,
          partial_units: addedItemAny.partial_units ?? finalPartialUnits,
          quantity: (addedItemAny.full_units ?? finalFullUnits) + (addedItemAny.partial_units ?? finalPartialUnits), // For backward compatibility
          lotNumber: lotNumber,
          expirationDate: expirationDate,
          notes: notes || '',
          addedAt: addedItemAny.added_at || new Date().toISOString(),
          addedBy: addedItemAny.added_by || 'user',
        };
        
        setProducts(prevProducts => [...prevProducts, newProduct]);
        setSuccess(`Product added: ${product_name}`);
        
        // Store the added product ID
        setAddedProductId(addedItem.id);
        
        // Fetch package suggestions for the added product
        try {
          setLoadingPackages(true);
          
          // Prepare items array for package suggestions API
          const items = [{
            ndc: ndcInput.trim(),
            productId: addedItem.id,
            productName: product_name.trim(),
            full: finalFullUnits,
            partial: finalPartialUnits,
          }];
          
          console.log('Fetching package suggestions with items:', items);
          const suggestions = await optimizationService.getPackageSuggestions(items);
          
          // Check if packages array is empty
          if (!suggestions.packages || suggestions.packages.length === 0) {
            // No packages found, close modal directly
            resetModalState();
            setSuccess(`Product added successfully! No package suggestions available.`);
          } else {
            // Packages found, show step 2
            setPackageSuggestions(suggestions);
            // Set default tab: 'existing' if there are existing packages, otherwise 'new'
            const hasExistingPackages = suggestions.packages.some(pkg => pkg.alreadyCreated && pkg.existingPackage);
            setActivePackageTab(hasExistingPackages ? 'existing' : 'new');
            setModalStep(2); // Move to step 2
          }
        } catch (err: any) {
          console.error("Error fetching package suggestions:", err);
          setError(err.message || "Failed to fetch package suggestions");
          // Close modal on error
          resetModalState();
        } finally {
          setLoadingPackages(false);
        }
        
        // Reload products from recommendations API to get latest data
        // This will replace the local products list with fresh data from the API
        try {
          await loadProducts();
        } catch (err: any) {
          console.error("Error reloading recommendations:", err);
          // Don't show error to user, just log it - the product was already added successfully
        }
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error saving product:", err);
      setError(err.message || "Failed to save product. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const handleEditProduct = (product: ProductListItem) => {
    // If user is on scan tab, switch to manual tab
    if (activeTab === "scan") {
      setActiveTab("manual");
    }

    setEditingProductId(product.id);
    setNdcInput(product.ndc);
    setOriginalNdc(product.ndc); // Store original NDC to detect changes
    setProductName(product.productName);
    // Check if product has full_units and partial_units, otherwise use quantity for full_units
    const productAny = product as any;
    const fullUnitsValue = productAny.full_units ?? productAny.fullUnits ?? 0;
    const partialUnitsValue = productAny.partial_units ?? productAny.partialUnits ?? 0;
    
    // Set checkbox states based on existing values
    // Check partial first since it's more specific
    // If partial_units > 0, it's partial; otherwise if full_units > 0, it's full
    const isPartial = partialUnitsValue > 0;
    const isFull = !isPartial && fullUnitsValue > 0;
    
    setIsFullChecked(isFull);
    setIsPartialChecked(isPartial);
    
    // Keep the numeric values for backward compatibility if needed
    setFullUnits(fullUnitsValue);
    setPartialUnits(partialUnitsValue);
    const lotNum = product.lotNumber || "";
    setLotNumber(lotNum);
    // Validate existing lot number when editing
    if (lotNum.trim()) {
      const validation = validateLotNumber(lotNum);
      setLotNumberError(validation.isValid ? null : validation.error || null);
    } else {
      setLotNumberError(null);
    }
    setExpirationDate(product.expirationDate || "");
    setNotes(product.notes || "");
    setIsFromScan(false); // Mark that data is from editing, not scanning
    setNdcLookupSuccess(true); // When editing, we already have product name, so mark as successful
  };

  const handleClearForm = () => {
    setNdcInput("");
    setProductName("");
    setFullUnits(0);
    setPartialUnits(0);
    setIsFullChecked(false);
    setIsPartialChecked(false);
    setLotNumber("");
    setLotNumberError(null);
    setExpirationDate("");
    setNotes("");
    setEditingProductId(null);
    setOriginalNdc(""); // Reset original NDC
    setIsFromScan(false);
    setLoading(prev => ({ ...prev, ndcLookup: false }));
    setNdcLookupSuccess(false);
    setEntryMode("initial");
  };

  const resetModalState = () => {
    setIsAddProductModalOpen(false);
    setModalStep(1);
    setPackageSuggestions(null);
    setSelectedPackage(null);
    setAddedProductId(null);
    setSelectedFeeRates(new Map()); // Reset fee rate selections
    setActivePackageTab('new'); // Reset to new tab
    setError(null); // Clear any errors when closing modal
    handleClearForm();
  };

  const handleCreatePackage = async (pkg: PackageSuggestion, addToExisting: boolean = false) => {
    if (!addedProductId) {
      setError("No product ID available");
      return;
    }

    // Validate feeRate selection for new packages
    if (!addToExisting) {
      const selectedFee = selectedFeeRates.get(pkg.distributorId);
      if (!selectedFee || !selectedFee.feeRate || !selectedFee.feeDuration) {
        setError("Please select a fee rate before creating a new package");
        return;
      }
    }

    try {
      setCreatingPackage(true);
      setError(null);

      // Find the newly added product from the package products
      const newProduct = pkg.products.find(p => p.productId === addedProductId);
      if (!newProduct) {
        setError("New product not found in package");
        return;
      }

      // Prepare the item for the newly added product only
      const items = [{
        id: newProduct.productId,
        ndc: newProduct.ndc,
        productId: newProduct.productId,
        product_id: newProduct.productId,
        productName: newProduct.productName,
        full: newProduct.full,
        partial: newProduct.partial,
        pricePerUnit: newProduct.pricePerUnit,
        price_per_unit: newProduct.pricePerUnit,
        totalValue: newProduct.totalValue,
        total_value: newProduct.totalValue,
      }];

      if (addToExisting && pkg.existingPackage?.id) {
        // Add items to existing package using PATCH
        console.log('Adding items to existing package:', pkg.existingPackage.id, items);
        await optimizationService.addItemsToPackage(pkg.existingPackage.id, items);
        setSuccess(`Product added to existing package ${pkg.existingPackage.packageNumber}!`);
      } else {
        // Create new package using POST
        // Get selected feeRate and feeDuration for this distributor
        const selectedFee = selectedFeeRates.get(pkg.distributorId);
        
        const payload: any = {
          distributorName: pkg.distributorName,
          distributorId: pkg.distributorId,
          items: pkg.products.map(product => ({
            id: product.productId,
            ndc: product.ndc,
            productId: product.productId,
            product_id: product.productId,
            productName: product.productName,
            full: product.full,
            partial: product.partial,
            pricePerUnit: product.pricePerUnit,
            price_per_unit: product.pricePerUnit,
            totalValue: product.totalValue,
            total_value: product.totalValue,
          })),
          notes: '',
        };

        // Only include feeRate and feeDuration if they were selected (for new packages only)
        if (selectedFee) {
          payload.feeRate = selectedFee.feeRate;
          payload.feeDuration = selectedFee.feeDuration;
        }

        console.log('Creating new custom package with payload:', payload);
        await optimizationService.createCustomPackage(payload);
        setSuccess(`New package created successfully with ${pkg.distributorName}!`);
      }
      
      setTimeout(() => setSuccess(null), 3000);
      
      // Close modal and reset state
      resetModalState();
    } catch (err: any) {
      setError(err.message || (addToExisting ? 'Failed to add items to package' : 'Failed to create custom package'));
      console.error('Error handling package:', err);
    } finally {
      setCreatingPackage(false);
    }
  };

  const handleClearAll = async () => {
    setShowClearAllModal(false);
    setError(null);
    setLoading(prev => ({ ...prev, clearAll: true }));

    try {
      await productListsService.clearAllItems();
      
      // Update local state instead of reloading
      setProducts([]);
      
      setSuccess("All products cleared successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error clearing products:", err);
      setError(err.message || "Failed to clear products. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, clearAll: false }));
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setError(null);
    setLoading(prev => ({ ...prev, bulkUpload: true }));

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        setError("File must contain at least a header row and one data row");
        setLoading(prev => ({ ...prev, bulkUpload: false }));
        return;
      }

      // Parse CSV - Expected format: NDC,Product Name,Quantity,Lot Number,Expiration Date,Notes
      const csvRows = lines
        .slice(1)
        .map((line) => {
          const columns = line.split(",").map((col) => col.trim());
          return {
            ndc: columns[0] || "",
            productName: columns[1] || "",
            quantity: parseInt(columns[2]) || 1,
            lotNumber: columns[3] || undefined,
            expirationDate: columns[4] || undefined,
            notes: columns[5] || undefined,
          };
        })
        .filter((row) => row.ndc);

      let successCount = 0;
      let failCount = 0;
      const newProducts: ProductListItem[] = [];

      for (const row of csvRows) {
        try {
          // Save directly to product_list_items table (simplified API)
          const addedItem = await productListsService.addItem("", {
            ndc: row.ndc,
            product_name: row.productName,
            quantity: row.quantity || 1,
            lot_number: row.lotNumber || undefined,
            expiration_date: row.expirationDate || undefined,
            notes: row.notes || undefined,
          } as any);
          
          // Add to local state array
          newProducts.push({
            id: addedItem.id || `product-${Date.now()}-${successCount}`,
            ndc: row.ndc,
            productName: row.productName,
            quantity: row.quantity || 1,
            lotNumber: row.lotNumber || '',
            expirationDate: row.expirationDate || '',
            notes: row.notes || '',
            addedAt: new Date().toISOString(),
            addedBy: 'user',
          });
          
          successCount++;
        } catch (err) {
          console.error("Error adding product:", err);
          failCount++;
        }
      }

      // Update local state instead of reloading
      setProducts(prevProducts => [...prevProducts, ...newProducts]);

      setSuccess(
        `Bulk upload completed: ${successCount} products added, ${failCount} failed`
      );
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("Bulk upload error:", err);
      setError(err.message || "Failed to process file");
    } finally {
      setLoading(prev => ({ ...prev, bulkUpload: false }));
      // Reset file input
      e.target.value = "";
    }
  };

  const removeProduct = async (id: string) => {
    try {
      setDeletingProductId(id);
      setError(null);
      await productListsService.removeItem(id);
      
      // Update local state instead of reloading
      setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
      
      setSuccess("Product removed successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove product");
    } finally {
      setDeletingProductId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    // Search filter
    const matchesSearch =
      p.ndc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Expiration filter
    if (expirationFilter === "expired") {
      // Show only expired products (expiration date is in the past)
      if (!p.expirationDate) return false;
      try {
        const expirationDate = new Date(p.expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        expirationDate.setHours(0, 0, 0, 0); // Reset time to compare dates only
        
        // Check if date is valid
        if (isNaN(expirationDate.getTime())) return false;
        
        return expirationDate < today;
      } catch (e) {
        return false;
      }
    }

    // 'all' filter - show all products
    return true;
  });

  // Create New List functionality
  const handleCreateList = () => {
    if (!newListName.trim()) {
      alert("Please enter a list name");
      return;
    }

    const selectedProductsList = products.filter((p) =>
      selectedProductsForList.has(p.id)
    );

    const newList: ProductList = {
      id: `list-${Date.now()}`,
      pharmacyId: "pharm-1",
      name: newListName,
      products:
        selectedProductsList.length > 0 ? selectedProductsList : products,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProductLists([...productLists, newList]);
    setShowCreateListModal(false);
    setNewListName("");
    setSelectedProductsForList(new Set());
    alert(
      `List "${newListName}" created successfully with ${newList.products.length} products!`
    );
  };

  // Export Products functionality
  const handleExportProducts = () => {
    if (products.length === 0) {
      alert("No products to export");
      return;
    }

    // Create CSV content
    const headers = [
      "NDC",
      "Product Name",
      "Quantity",
      "Lot Number",
      "Expiration Date",
      "Notes",
      "Added At",
    ];
    const rows = products.map((p) => [
      p.ndc,
      p.productName,
      p.quantity.toString(),
      p.lotNumber || "",
      p.expirationDate || "",
      p.notes || "",
      new Date(p.addedAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `products_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // alert(`Exported ${products.length} products successfully!`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:py-2 sm:px-4 rounded-lg bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border-2 border-teal-200">
          <div>
            <h1 className="text-lg sm:text-md font-bold text-gray-900">
              My Products
            </h1>
            {/* <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Manage products for return optimization
            </p> */}
          </div>
          <button
              onClick={() => {
                setError(null); // Clear any previous errors
                resetModalState();
                setIsAddProductModalOpen(true);
                setEntryMode("initial");
                setActiveTab("scan");
              }}
            className="mt-3 sm:mt-0 px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Success/Error Alerts */}
        {(success || error) && (
          <div
            className={`p-2 sm:p-3 rounded text-xs flex items-center gap-2 ${
              success
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {success ? (
              <Check className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            )}
            <span className="flex-1 min-w-0 break-words">
              {success || error}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-5 w-5 p-0 flex-shrink-0"
              onClick={() => {
                setSuccess(null);
                setError(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Products Table - First Section */}
        <Card className="border-2 border-teal-200">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  All Products ({products.length})
                </CardTitle>
                <CardDescription>View and manage your products</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full sm:w-48 md:w-64"
                  />
                </div>
                {products.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowClearAllModal(true)}
                      disabled={loading.clearAll || loading.products}
                      className="px-2 py-1 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs flex-1 sm:flex-initial"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Clear All</span>
                      <span className="sm:hidden">Clear</span>
                    </button>
                    <Link
                      href="/optimization"
                      className="flex-1 sm:flex-initial"
                    >
                      <button
                        className="w-full sm:w-auto px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                      >
                        <Search className="h-3 w-3" />
                        <span className="sm:inline">Search</span>
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="flex center justify-center gap-2 pt-2">
              <button
                onClick={() => setExpirationFilter("all")}
                className={`px-2 py-1 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs ${
                  expirationFilter === "all"
                    ? "bg-teal-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setExpirationFilter("expired")}
                className={`px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs ${
                  expirationFilter === "expired"
                    ? "bg-red-600 text-white"
                    : "bg-white border border-red-300 text-red-700 hover:bg-red-50"
                }`}
              >
                Expired
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading.products ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-xs text-gray-600">
                  Loading products...
                </span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No products yet. Add products using the button above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Product Name</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">NDC</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Full Units</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Partial Units</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Recommended Distributor</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Price per unit</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Lot Number</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Expiration Date</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product: any) => (
                      <tr
                        key={product.id}
                        className="border-b border-gray-100 hover:bg-teal-50/50 transition-colors"
                      >
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs font-medium text-gray-900">{product.productName}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs text-gray-600 font-mono">{product.ndc}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs text-gray-600">{(product as any).full_units ?? (product as any).fullUnits ?? (product as any).full ?? 0}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs text-gray-600">{(product as any).partial_units ?? (product as any).partialUnits ?? (product as any).partial ?? 0}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs text-gray-600">{product.recommendedDistributor || '-'}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs text-gray-600 font-semibold">
                            {product.price ? formatCurrency(product.price) : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs text-gray-600">{product.lotNumber || '-'}</span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className="text-xs text-gray-600">
                            {product.expirationDate ? formatDate(product.expirationDate) : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={() => {
                                setError(null); // Clear any previous errors
                                handleEditProduct(product);
                                setIsAddProductModalOpen(true);
                                setActiveTab("manual");
                              }}
                              className="p-1 hover:bg-teal-100 rounded text-teal-600 transition-colors"
                              title="Edit product"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => removeProduct(product.id)}
                              disabled={deletingProductId === product.id}
                              className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete product"
                            >
                              {deletingProductId === product.id ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                              ) : (
                                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Product Modal */}
        {isAddProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => {
            resetModalState();
          }}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-gray-900">
                    {modalStep === 1 
                      ? (editingProductId ? "Edit Product" : "Add Product")
                      : "Create Package"}
                  </h2>
                  {modalStep === 1 && entryMode !== "initial" && (
                    <p className="text-xs text-gray-600 mt-1">
                      {entryMode === "scan" ? "Scan barcode" : "Enter product details manually"}
                    </p>
                  )}
                  {modalStep === 2 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-teal-600 font-semibold">
                        <CheckCircle className="h-3 w-3" />
                        <span>Product Added</span>
                      </div>
                      <ArrowRight className="h-2.5 w-2.5 text-gray-400" />
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                        <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center text-[8px]">2</span>
                        <span>Choose Package</span>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    resetModalState();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Error Alert inside Modal */}
              {error && modalStep === 1 && (
                <div className="mx-4 mt-4 p-2 sm:p-3 rounded text-xs flex items-center gap-2 bg-red-50 text-red-800 border border-red-200 flex-shrink-0">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="flex-1 min-w-0 break-words">
                    {error}
                  </span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto h-5 w-5 p-0 flex-shrink-0 hover:bg-red-100 rounded transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Initial Mode - Two Small Buttons in One Column */}
              {entryMode === "initial" && !editingProductId && (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={() => {
                        setEntryMode("scan");
                        setActiveTab("scan");
                        setShowScanner(true);
                      }}
                      className="w-full px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                    >
                      <Camera className="h-3 w-3" />
                      <span>Scan Barcode</span>
                    </button>
                    <button
                      onClick={() => {
                        setEntryMode("manual");
                        setActiveTab("manual");
                      }}
                      className="w-full px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                    >
                      <Keyboard className="h-3 w-3" />
                      <span>Manual Entry</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Back Button - Show when not in initial mode and not editing (but not in step 2) */}
              {entryMode !== "initial" && !editingProductId && modalStep === 1 && (
                <div className="px-4 pt-4 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEntryMode("initial");
                      setShowScanner(false);
                    }}
                    className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Back</span>
                  </button>
                </div>
              )}

              {/* Modal Content */}
              {modalStep === 1 && (entryMode !== "initial" || editingProductId) && (
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Scan Barcode Tab */}
                  {activeTab === "scan" && entryMode === "scan" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xs font-semibold mb-2">Scanning Barcode</h3>
                        <p className="text-xs text-gray-600 mb-4">Position the barcode in front of your camera</p>
                      </div>

                      {/* Scanned Data Display */}
                      {ndcInput && isFromScan && (
                        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-3">Scanned from Barcode:</p>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-gray-600">NDC Code:</span>
                              <span className="ml-2 font-mono font-bold text-teal-700">{ndcInput}</span>
                            </div>
                            {lotNumber && (
                              <div>
                                <span className="text-gray-600">Lot Number:</span>
                                <span className="ml-2 font-mono text-teal-700">{lotNumber}</span>
                              </div>
                            )}
                            {expirationDate && (
                              <div>
                                <span className="text-gray-600">Expiration Date:</span>
                                <span className="ml-2 font-mono text-teal-700">{expirationDate}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-4">
                            Switch to "Manual Entry" tab to complete and submit the product information.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Entry Tab */}
                  {activeTab === "manual" && (entryMode === "manual" || editingProductId) && (
                    <div ref={manualEntryRef} className="space-y-6">
                    <div>
                      <h3 className="text-xs font-semibold mb-2">Manual NDC Entry</h3>
                      <p className="text-xs text-gray-600 mb-4">Enter NDC codes manually or paste from clipboard</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium mb-2 block">NDC Code *</label>
                          <div className="relative">
                            <Input
                              value={ndcInput}
                              onChange={(e) => {
                                const newNdc = e.target.value;
                                setNdcInput(newNdc);
                                
                                // When editing: if NDC changes from original, clear product name to allow new lookup
                                if (editingProductId) {
                                  const cleanNewNdc = newNdc.replace(/[-\s]/g, '');
                                  const cleanOriginalNdc = originalNdc.replace(/[-\s]/g, '');
                                  if (cleanNewNdc !== cleanOriginalNdc) {
                                    // NDC changed, clear product name to allow new lookup
                                    setProductName("");
                                    setNdcLookupSuccess(false);
                                  }
                                } else {
                                  // Not editing: reset lookup success and clear product name
                                  setNdcLookupSuccess(false);
                                  setProductName("");
                                }
                              }}
                              placeholder="00093-2263-01 or 00093226301"
                              className="font-mono"
                            />
                            {loading.ndcLookup && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Format: XXXXX-XXXX-XX (dashes optional)
                            {loading.ndcLookup && (
                              <span className="ml-2 text-teal-600">Looking up product name...</span>
                            )}
                          </p>
                        </div>
                        {(ndcLookupSuccess || product_name.trim()) && (
                          <div>
                            <label className="text-xs font-medium mb-2 block">Product Name *</label>
                            <Input
                              value={product_name}
                              onChange={(e) => {
                                setProductName(e.target.value);
                                // If user manually enters product name, mark as success to show remaining fields
                                if (e.target.value.trim()) {
                                  setNdcLookupSuccess(true);
                                }
                              }}
                              placeholder="Enter product name"
                            />
                          </div>
                        )}
                      </div>

                      {(ndcLookupSuccess || product_name.trim()) && (
                        <>
                          <div className="space-y-4">
                            {/* Full Checkbox and Input */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="fullCheckbox"
                                  checked={isFullChecked}
                                  onChange={(e) => {
                                    setIsFullChecked(e.target.checked);
                                    if (e.target.checked) {
                                      setIsPartialChecked(false);
                                      setPartialUnits(0);
                                    }
                                  }}
                                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <label htmlFor="fullCheckbox" className="text-xs font-medium text-gray-700">
                                  Full
                                </label>
                              </div>
                              {isFullChecked && (
                                <div>
                                  <label className="text-xs font-medium mb-2 block">Full Units *</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="Enter full units"
                                    value={fullUnits || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      setFullUnits(value);
                                    }}
                                    required
                                  />
                                </div>
                              )}
                            </div>

                            {/* Partial Checkbox and Input */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="partialCheckbox"
                                  checked={isPartialChecked}
                                  onChange={(e) => {
                                    setIsPartialChecked(e.target.checked);
                                    if (e.target.checked) {
                                      setIsFullChecked(false);
                                      setFullUnits(0);
                                    }
                                  }}
                                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <label htmlFor="partialCheckbox" className="text-xs font-medium text-gray-700">
                                  Partial
                                </label>
                              </div>
                              {isPartialChecked && (
                                <div>
                                  <label className="text-xs font-medium mb-2 block">Partial Units *</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="Enter partial units"
                                    value={partialUnits || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      setPartialUnits(value);
                                    }}
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium mb-2 block">Lot Number *</label>
                              <Input
                                placeholder="LOT-2024-001"
                                value={lotNumber}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setLotNumber(value);
                                  // Real-time validation
                                  if (value.trim()) {
                                    const validation = validateLotNumber(value);
                                    setLotNumberError(validation.isValid ? null : validation.error || null);
                                  } else {
                                    setLotNumberError(null);
                                  }
                                }}
                                onBlur={() => {
                                  // Validate on blur if field has value
                                  if (lotNumber.trim()) {
                                    const validation = validateLotNumber(lotNumber);
                                    setLotNumberError(validation.isValid ? null : validation.error || null);
                                  }
                                }}
                                required
                                className={lotNumberError ? 'border-red-500' : ''}
                              />
                              {lotNumberError && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {lotNumberError}
                                </p>
                              )}
                              {!lotNumberError && lotNumber.trim() && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Valid lot number
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-2 block">Expiration Date *</label>
                              <Input
                                type="date"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium mb-2 block">Notes (Optional)</label>
                            <textarea
                              className="w-full px-3 py-2 border border-input rounded-lg text-xs min-h-[80px]"
                              placeholder="Additional notes..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {(ndcLookupSuccess || product_name.trim()) && (
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={handleAddProduct}
                            className="flex-1 px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                            disabled={loading.products}
                          >
                            {loading.products ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>{editingProductId ? "Updating..." : "Adding..."}</span>
                              </>
                            ) : editingProductId ? (
                              <>
                                <Edit className="h-3 w-3" />
                                <span>Update Product</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                <span>Add Product</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleClearForm}
                            className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* Step 2: Package Suggestions */}
              {modalStep === 2 && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {loadingPackages ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                      <p className="text-sm text-gray-600 mt-4">Loading package suggestions...</p>
                    </div>
                  ) : packageSuggestions && packageSuggestions.packages.length > 0 ? (
                    <>
                      {/* Tabs - Show if there are existing packages */}
                      {packageSuggestions.summary.packagesAlreadyCreated > 0 && (
                        <div className="flex border-b border-gray-200 flex-shrink-0 px-6 pt-4">
                          <button
                            onClick={() => setActivePackageTab('existing')}
                            className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
                              activePackageTab === 'existing'
                                ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Existing
                          </button>
                          <button
                            onClick={() => setActivePackageTab('new')}
                            className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
                              activePackageTab === 'new'
                                ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            New
                          </button>
                        </div>
                      )}

                      {/* Package Cards */}
                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-3 mt-4">
                        {packageSuggestions.packages
                          .filter((pkg) => {
                            // Filter packages based on active tab
                            if (activePackageTab === 'existing') {
                              // Existing tab: only show packages with existing packages
                              return pkg.alreadyCreated && pkg.existingPackage;
                            } else {
                              // New tab: show ALL packages (including those with existing packages)
                              return true;
                            }
                          })
                          .map((pkg, idx) => {
                          return (
                          <div
                            key={idx}
                            className="border border-gray-300 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-gray-900">{pkg.distributorName} {pkg.recommended && <Badge variant="success" className="text-[10px] px-1.5 py-0.5 border-2">Recommended</Badge>}</h4>
                                </div>
                                <div className="space-y-1 text-xs text-gray-600">
                                  {pkg.distributorContact.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      <span>{pkg.distributorContact.email}</span>
                                    </div>
                                  )}
                                  {pkg.distributorContact.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      <span>{pkg.distributorContact.phone}</span>
                                    </div>
                                  )}
                                  {pkg.distributorContact.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      <span className="truncate">{pkg.distributorContact.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">Total Items</p>
                                <p className="text-lg font-bold text-teal-600">{pkg.totalItems}</p>
                              </div>
                            </div>

                            {/* Content based on active tab */}
                            {activePackageTab === 'existing' && pkg.alreadyCreated && pkg.existingPackage ? (
                              // Existing Package Tab - Show only existing package details
                              <div className="space-y-3">
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <h5 className="text-xs font-semibold text-gray-900 mb-2">Existing Package Details</h5>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <p className="text-gray-600">Package Number</p>
                                      <p className="font-semibold text-gray-900">{pkg.existingPackage.packageNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Current Items</p>
                                      <p className="font-semibold text-gray-900">{pkg.existingPackage.totalItems}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Current Value</p>
                                      <p className="font-semibold text-gray-900">{formatCurrency(pkg.existingPackage.totalEstimatedValue)}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Created</p>
                                      <p className="font-semibold text-gray-900">{new Date(pkg.existingPackage.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    {pkg.existingPackage.feeRate !== undefined && pkg.existingPackage.feeRate !== null && (
                                      <div>
                                        <p className="text-gray-600">Fee Rate</p>
                                        <p className="font-semibold text-gray-900">{pkg.existingPackage.feeRate}%</p>
                                      </div>
                                    )}
                                    {pkg.existingPackage.feeDuration !== undefined && pkg.existingPackage.feeDuration !== null && (
                                      <div>
                                        <p className="text-gray-600">Fee Duration</p>
                                        <p className="font-semibold text-gray-900">{pkg.existingPackage.feeDuration} days</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // New Tab - Show distributor info, package stats, and fee rate selector
                              <div className="space-y-3">
                                {/* Distributor Name */}
                           
{/* {pkg.recommended && <Badge variant="success" className="text-[10px] px-1.5 py-0.5 border-2">Recommended</Badge>} */}
                                <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-white rounded border border-gray-200">
                                  <div>
                                    <p className="text-xs text-gray-600">New Total Value</p>
                                    {(() => {
                                      const selectedFee = selectedFeeRates.get(pkg.distributorId);
                                      if (selectedFee && selectedFee.feeRate) {
                                        const discountedValue = pkg.totalEstimatedValue * (1 - selectedFee.feeRate / 100);
                                        return (
                                          <div className="flex flex-col">
                                            <p className="text-sm font-semibold text-gray-900 line-through text-gray-400">
                                              {formatCurrency(pkg.totalEstimatedValue)}
                                            </p>
                                            <p className="text-sm font-semibold text-teal-600">
                                              {formatCurrency(discountedValue)}
                                            </p>
                                          </div>
                                        );
                                      }
                                      return (
                                        <p className="text-sm font-semibold text-gray-900">
                                          {formatCurrency(pkg.totalEstimatedValue)}
                                        </p>
                                      );
                                    })()}
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Avg Price/Unit</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatCurrency(pkg.averagePricePerUnit)}
                                    </p>
                                  </div>
                                </div>

                                {/* Fee Rate Selection */}
                                {pkg.distributorContact && pkg.distributorContact.feeRates && Object.keys(pkg.distributorContact.feeRates).length > 0 && (
                                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                                      Select Fee Rate:
                                    </label>
                                    <select
                                      value={selectedFeeRates.get(pkg.distributorId)?.feeDuration?.toString() || ''}
                                      onChange={(e) => {
                                        const selectedDuration = e.target.value;
                                        if (selectedDuration && pkg.distributorContact.feeRates) {
                                          const feeRateData = pkg.distributorContact.feeRates[selectedDuration];
                                          if (feeRateData) {
                                            const newMap = new Map(selectedFeeRates);
                                            newMap.set(pkg.distributorId, {
                                              feeRate: feeRateData.percentage,
                                              feeDuration: parseInt(selectedDuration),
                                            });
                                            setSelectedFeeRates(newMap);
                                          }
                                        } else {
                                          // Clear selection if empty
                                          const newMap = new Map(selectedFeeRates);
                                          newMap.delete(pkg.distributorId);
                                          setSelectedFeeRates(newMap);
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                      <option value="">Select fee rate...</option>
                                      {Object.entries(pkg.distributorContact.feeRates).map(([duration, rate]) => (
                                        <option key={duration} value={duration}>
                                          {duration} days - {rate.percentage}%
                                        </option>
                                      ))}
                                    </select>
                                    {selectedFeeRates.get(pkg.distributorId) && (
                                      <p className="text-xs text-teal-600 mt-1">
                                        Selected: {selectedFeeRates.get(pkg.distributorId)?.feeRate}% for {selectedFeeRates.get(pkg.distributorId)?.feeDuration} days
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => {
                                  setSelectedPackage(pkg);
                                  // Set default tab: 'existing' if existing package exists, otherwise 'create'
                                  setActiveModalTab(pkg.alreadyCreated && pkg.existingPackage ? 'existing' : 'create');
                                }}
                                className="flex-1 px-3 py-2 bg-white border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 text-xs font-medium flex items-center justify-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View Details
                              </button>
                              
                              {activePackageTab === 'existing' ? (
                                // Existing Tab - Show Add to Existing button
                                <button
                                  onClick={() => handleCreatePackage(pkg, true)}
                                  disabled={creatingPackage}
                                  className="flex-1 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1"
                                >
                                  {creatingPackage ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3" />
                                      Add to Existing
                                    </>
                                  )}
                                </button>
                              ) : (
                                // New Tab - Show Create Package button
                                <button
                                  onClick={() => handleCreatePackage(pkg, false)}
                                  disabled={creatingPackage || !selectedFeeRates.get(pkg.distributorId)}
                                  className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center gap-1"
                                  title={!selectedFeeRates.get(pkg.distributorId) ? "Please select a fee rate first" : ""}
                                >
                                  {creatingPackage ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Creating...
                                    </>
                                  ) : (
                                    <>
                                      <Package className="h-3 w-3" />
                                      Create Package
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 mb-4">No package suggestions available</p>
                      <button
                        onClick={resetModalState}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Package Details Modal */}
        {selectedPackage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Package Details</h3>
                  <p className="text-xs text-gray-600 mt-1">{selectedPackage.distributorName}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPackage(null);
                    setActiveModalTab('create');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Tabs - Only show if existing package exists */}
              {selectedPackage.alreadyCreated && selectedPackage.existingPackage && (
                <div className="flex border-b border-gray-200 flex-shrink-0">
                  <button
                    onClick={() => setActiveModalTab('existing')}
                    className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
                      activeModalTab === 'existing'
                        ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Existing Package
                  </button>
                  <button
                    onClick={() => setActiveModalTab('create')}
                    className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
                      activeModalTab === 'create'
                        ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Create New
                  </button>
                </div>
              )}

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedPackage.alreadyCreated && selectedPackage.existingPackage && activeModalTab === 'existing' ? (
                  // Existing Package Tab
                  <div className="space-y-3">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">{selectedPackage.distributorName}</h4>
                      
                      {/* Existing Package Info */}
                      <div className="mb-4 p-3 border border-gray-200 bg-yellow-50 rounded-lg">
                        <h5 className="text-xs font-semibold text-gray-900 mb-3">Existing Package Details</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-gray-600">Package Number</p>
                            <p className="font-semibold text-gray-900">{selectedPackage.existingPackage.packageNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Current Items</p>
                            <p className="font-semibold text-gray-900">{selectedPackage.existingPackage.totalItems}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Current Value</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(selectedPackage.existingPackage.totalEstimatedValue)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Created</p>
                            <p className="font-semibold text-gray-900">{new Date(selectedPackage.existingPackage.createdAt).toLocaleDateString()}</p>
                          </div>
                          {selectedPackage.existingPackage.feeRate !== undefined && selectedPackage.existingPackage.feeRate !== null && (
                            <div>
                              <p className="text-gray-600">Fee Rate</p>
                              <p className="font-semibold text-gray-900">{selectedPackage.existingPackage.feeRate}%</p>
                            </div>
                          )}
                          {selectedPackage.existingPackage.feeDuration !== undefined && selectedPackage.existingPackage.feeDuration !== null && (
                            <div>
                              <p className="text-gray-600">Fee Duration</p>
                              <p className="font-semibold text-gray-900">{selectedPackage.existingPackage.feeDuration} days</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Distributor Contact Info */}
                      {selectedPackage.distributorContact && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {selectedPackage.distributorContact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-700 truncate">{selectedPackage.distributorContact.email}</span>
                              </div>
                            )}
                            {selectedPackage.distributorContact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-700">{selectedPackage.distributorContact.phone}</span>
                              </div>
                            )}
                            {selectedPackage.distributorContact.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-700 truncate">{selectedPackage.distributorContact.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Create New Tab (or default if no existing package)
                  <div className="space-y-3">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">{selectedPackage.distributorName}</h4>

                      {/* Distributor Contact Info */}
                      {selectedPackage.distributorContact && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {selectedPackage.distributorContact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-700 truncate">{selectedPackage.distributorContact.email}</span>
                              </div>
                            )}
                            {selectedPackage.distributorContact.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-700">{selectedPackage.distributorContact.phone}</span>
                              </div>
                            )}
                            {selectedPackage.distributorContact.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-700 truncate">{selectedPackage.distributorContact.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fee Rate Selection */}
                      {selectedPackage.distributorContact?.feeRates && Object.keys(selectedPackage.distributorContact.feeRates).length > 0 && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <label className="text-xs font-semibold text-gray-700 mb-2 block">
                            Select Fee Rate:
                          </label>
                          <select
                            value={selectedFeeRates.get(selectedPackage.distributorId)?.feeDuration?.toString() || ''}
                            onChange={(e) => {
                              const selectedDuration = e.target.value;
                              if (selectedDuration && selectedPackage.distributorContact.feeRates) {
                                const feeRateData = selectedPackage.distributorContact.feeRates[selectedDuration];
                                if (feeRateData) {
                                  const newMap = new Map(selectedFeeRates);
                                  newMap.set(selectedPackage.distributorId, {
                                    feeRate: feeRateData.percentage,
                                    feeDuration: parseInt(selectedDuration),
                                  });
                                  setSelectedFeeRates(newMap);
                                }
                              } else {
                                // Clear selection if empty
                                const newMap = new Map(selectedFeeRates);
                                newMap.delete(selectedPackage.distributorId);
                                setSelectedFeeRates(newMap);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">Select fee rate...</option>
                            {Object.entries(selectedPackage.distributorContact.feeRates).map(([duration, rate]) => (
                              <option key={duration} value={duration}>
                                {duration} days - {rate.percentage}%
                              </option>
                            ))}
                          </select>
                          {selectedFeeRates.get(selectedPackage.distributorId) && (
                            <p className="text-xs text-teal-600 mt-1">
                              Selected: {selectedFeeRates.get(selectedPackage.distributorId)?.feeRate}% for {selectedFeeRates.get(selectedPackage.distributorId)?.feeDuration} days
                            </p>
                          )}
                        </div>
                      )}

                      {/* Products Table */}
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-gray-900 mb-3">Products in Package</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Product Name</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">NDC</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Full</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Partial</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Price/Unit</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Total Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPackage.products.map((product, idx) => (
                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-3 py-2 text-xs text-gray-900">{product.productName}</td>
                                  <td className="px-3 py-2 text-xs font-mono text-gray-600">{product.ndc}</td>
                                  <td className="px-3 py-2 text-xs text-gray-700">{product.full}</td>
                                  <td className="px-3 py-2 text-xs text-gray-700">{product.partial}</td>
                                  <td className="px-3 py-2 text-xs text-gray-700 font-semibold">
                                    {formatCurrency(product.pricePerUnit)}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-700 font-semibold">
                                    {formatCurrency(product.totalValue)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedPackage(null);
                    setActiveModalTab('create');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Close
                </button>
                
                {(() => {
                  const hasExistingPackage = selectedPackage.alreadyCreated && selectedPackage.existingPackage;
                  
                  // Show buttons based on active tab
                  if (hasExistingPackage && activeModalTab === 'existing') {
                    // Existing Package Tab - Show Add to Existing button
                    return (
                      <button
                        onClick={() => {
                          handleCreatePackage(selectedPackage, true);
                          setSelectedPackage(null);
                          setActiveModalTab('create');
                        }}
                        disabled={creatingPackage}
                        className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-2"
                      >
                        {creatingPackage ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            Add to Existing
                          </>
                        )}
                      </button>
                    );
                  } else {
                    // Create New Tab - Show Create Package button
                    return (
                      <button
                        onClick={() => {
                          handleCreatePackage(selectedPackage, false);
                          setSelectedPackage(null);
                          setActiveModalTab('create');
                        }}
                        disabled={creatingPackage || !selectedFeeRates.get(selectedPackage.distributorId)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-2"
                        title={!selectedFeeRates.get(selectedPackage.distributorId) ? "Please select a fee rate first" : ""}
                      >
                        {creatingPackage ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Package className="h-3 w-3" />
                            Create Package
                          </>
                        )}
                      </button>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Create New List Modal */}
        {showCreateListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 flex-shrink-0" />
                  <h3 className="font-bold text-sm truncate">
                    Create New Product List
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateListModal(false);
                    setNewListName("");
                    setSelectedProductsForList(new Set());
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="text-xs font-medium mb-2 block">
                    List Name *
                  </label>
                  <Input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., January Returns, Expiring Products, etc."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block">
                    Select Products ({selectedProductsForList.size} selected)
                  </label>
                  <div className="border rounded-lg p-2 sm:p-3 max-h-48 sm:max-h-64 overflow-y-auto space-y-2">
                    {products.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">
                        No products available. Add products first.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                          <button
                            onClick={() => {
                              if (
                                selectedProductsForList.size === products.length
                              ) {
                                setSelectedProductsForList(new Set());
                              } else {
                                setSelectedProductsForList(
                                  new Set(products.map((p) => p.id))
                                );
                              }
                            }}
                            className="text-xs text-teal-600 hover:text-teal-700"
                          >
                            {selectedProductsForList.size === products.length
                              ? "Deselect All"
                              : "Select All"}
                          </button>
                        </div>
                        {products.map((product) => (
                          <label
                            key={product.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedProductsForList.has(product.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedProductsForList);
                                if (e.target.checked) {
                                  newSet.add(product.id);
                                } else {
                                  newSet.delete(product.id);
                                }
                                setSelectedProductsForList(newSet);
                              }}
                              className="rounded flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {product.productName}
                              </p>
                              <p className="text-[10px] text-gray-600">
                                NDC: {product.ndc} • Qty: {product.quantity}
                              </p>
                            </div>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedProductsForList.size === 0
                      ? "No products selected. All current products will be added to the list."
                      : `${selectedProductsForList.size} product(s) selected.`}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t flex-shrink-0">
                  <button
                    onClick={handleCreateList}
                    className="flex-1 px-2 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                    disabled={!newListName.trim()}
                  >
                    <Check className="h-3 w-3" />
                    <span>Create List</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateListModal(false);
                      setNewListName("");
                      setSelectedProductsForList(new Set());
                    }}
                    className="w-full sm:w-auto px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          isOpen={showScanner}
          onScan={handleBarcodeScan}
          onClose={() => {
            setShowScanner(false);
            setEntryMode("initial");
          }}
        />

        {/* Clear All Confirmation Modal */}
        {showClearAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-gray-900 mb-2">
                      Clear All Products
                    </h3>
                    <p className="text-xs text-gray-700 mb-4">
                      Are you sure you want to delete all {products.length} product(s)? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleClearAll}
                        disabled={loading.clearAll}
                        className="flex-1 px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                      >
                        {loading.clearAll ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3" />
                            <span>Clear</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowClearAllModal(false)}
                        disabled={loading.clearAll}
                        className="flex-1 px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
