'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, Edit, ShoppingCart, Calendar, DollarSign, Package, X, Loader2, ChevronLeft, ChevronRight, Trash2, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchCategories, fetchMarketplaceDeals, createMarketplaceDeal, updateMarketplaceDeal, deleteMarketplaceDeal, setDealOfTheDay, unsetDealOfTheDay } from '@/lib/store/marketplaceSlice';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { ToastContainer, Toast } from '@/components/ui/Toast';

export default function MarketplacePage() {
    const dispatch = useAppDispatch();
    const marketplaceState = useAppSelector((state) => state.marketplace);
    const { categories, deals, pagination, isLoadingCategories, isLoadingDeals, isCreatingDeal, isUpdatingDeal, isDeletingDeal, isSettingDealOfTheDay, isUnsettingDealOfTheDay, error } = marketplaceState;
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: Toast['type'] = 'success') => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'sold' | 'expired'>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<'product_name' | 'category' | 'distributor' | 'status' | 'posted_date' | 'expiry_date' | 'deal_price' | 'quantity'>('posted_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewModal, setViewModal] = useState<any | null>(null);
    const [editModal, setEditModal] = useState<any | null>(null);
    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<any | null>(null);
    const [dealOfTheDayModal, setDealOfTheDayModal] = useState<any | null>(null);
    const [dealOfTheDayExpiry, setDealOfTheDayExpiry] = useState('');
    const [localSettingLoading, setLocalSettingLoading] = useState(false);
    const [localUnsettingLoading, setLocalUnsettingLoading] = useState(false);
    const [newDeal, setNewDeal] = useState({
        productName: '',
        category: '',
        quantity: 0,
        minimumBuyQuantity: 0,
        unit: 'bottles',
        originalPrice: 0,
        dealPrice: 0,
        distributor: '',
        expiryDate: '',
        postedDate: new Date().toISOString().split('T')[0]
    });
    const [dealImage, setDealImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [editDealImage, setEditDealImage] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

    // Debounce search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Fetch categories on mount
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchCategories());
        }
    }, [dispatch, isAuthenticated]);

    // Fetch deals when filters, pagination, or sorting change
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchMarketplaceDeals({
                page: currentPage,
                limit: 12,
                search: debouncedSearch || undefined,
                category: categoryFilter !== 'all' ? categoryFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                sortBy,
                sortOrder,
            }));
        }
    }, [dispatch, isAuthenticated, debouncedSearch, categoryFilter, statusFilter, currentPage, sortBy, sortOrder]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, categoryFilter, statusFilter, sortBy, sortOrder]);

    const calculateSavings = (original: number, deal: number) => {
        return (((original - deal) / original) * 100).toFixed(0);
    };

    const calculateProfit = (original: number, deal: number) => {
        return ((deal / original) * 100).toFixed(0);
    };

    const handleEdit = async (deal: any) => {
        // Validate quantity is not less than minimumBuyQuantity
        if (deal.quantity < deal.minimumBuyQuantity) {
            showToast(`Quantity cannot be less than minimum buy quantity (${deal.minimumBuyQuantity})`, 'error');
            return;
        }

        try {
            const result = await dispatch(updateMarketplaceDeal({
                id: deal.id,
                payload: {
                    productName: deal.productName,
                    category: deal.category,
                    quantity: deal.quantity,
                    minimumBuyQuantity: deal.minimumBuyQuantity,
                    unit: deal.unit,
                    originalPrice: deal.originalPrice,
                    dealPrice: deal.dealPrice,
                    distributor: deal.distributor,
                    expiryDate: deal.expiryDate,
                    status: deal.status,
                    image: editDealImage || undefined,
                }
            }));
            
            if (updateMarketplaceDeal.fulfilled.match(result)) {
                showToast('Deal updated successfully!', 'success');
                setEditModal(null);
                setEditDealImage(null);
                setEditImagePreview(null);
                // Refresh deals after edit
                dispatch(fetchMarketplaceDeals({
                    page: currentPage,
                    limit: 12,
                    search: debouncedSearch || undefined,
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                }));
            } else {
                showToast(result.payload as string || 'Failed to update deal', 'error');
            }
        } catch (err) {
            showToast('An unexpected error occurred', 'error');
        }
    };

    const handleAddDeal = async () => {
        // Validate quantity is not less than minimumBuyQuantity
        if (newDeal.quantity < newDeal.minimumBuyQuantity) {
            showToast(`Quantity cannot be less than minimum buy quantity (${newDeal.minimumBuyQuantity})`, 'error');
            return;
        }

        try {
            const result = await dispatch(createMarketplaceDeal({
                productName: newDeal.productName,
                category: newDeal.category,
                quantity: newDeal.quantity,
                minimumBuyQuantity: newDeal.minimumBuyQuantity,
                unit: newDeal.unit,
                originalPrice: newDeal.originalPrice,
                dealPrice: newDeal.dealPrice,
                distributor: newDeal.distributor,
                expiryDate: newDeal.expiryDate,
                image: dealImage || undefined,
            }));
            
            if (createMarketplaceDeal.fulfilled.match(result)) {
                showToast('Deal created successfully!', 'success');
                setAddModal(false);
                // Reset form
                setNewDeal({
                    productName: '',
                    category: '',
                    quantity: 0,
                    minimumBuyQuantity: 0,
                    unit: 'bottles',
                    originalPrice: 0,
                    dealPrice: 0,
                    distributor: '',
                    expiryDate: '',
                    postedDate: new Date().toISOString().split('T')[0]
                });
                setDealImage(null);
                setImagePreview(null);
                // Refresh deals after adding
                dispatch(fetchMarketplaceDeals({
                    page: currentPage,
                    limit: 12,
                    search: debouncedSearch || undefined,
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                }));
            } else {
                showToast(result.payload as string || 'Failed to create deal', 'error');
            }
        } catch (err) {
            showToast('An error occurred while creating the deal', 'error');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file', 'error');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size should be less than 5MB', 'error');
                return;
            }
            setDealImage(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file', 'error');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size should be less than 5MB', 'error');
                return;
            }
            setEditDealImage(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteDeal = async () => {
        if (!deleteModal) return;
        
        try {
            const result = await dispatch(deleteMarketplaceDeal(deleteModal.id));
            
            if (deleteMarketplaceDeal.fulfilled.match(result)) {
                showToast('Deal deleted successfully!', 'success');
                setDeleteModal(null);
                // Refresh deals after deletion
                dispatch(fetchMarketplaceDeals({
                    page: currentPage,
                    limit: 12,
                    search: debouncedSearch || undefined,
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                }));
            } else {
                showToast(result.payload as string || 'Failed to delete deal', 'error');
            }
        } catch (err) {
            showToast('An unexpected error occurred', 'error');
        }
    };

    const handleSetDealOfTheDay = (deal: any) => {
        // Set default expiry to end of today
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const defaultExpiry = today.toISOString().split('T')[0] + 'T23:59:59Z';
        setDealOfTheDayExpiry(defaultExpiry);
        setDealOfTheDayModal(deal);
    };

    const confirmSetDealOfTheDay = async () => {
        if (!dealOfTheDayModal || !dealOfTheDayExpiry) {
            showToast('Please select an expiry date', 'error');
            return;
        }

        setLocalSettingLoading(true);
        try {
            const result = await dispatch(setDealOfTheDay({
                id: dealOfTheDayModal.id,
                expiresAt: dealOfTheDayExpiry
            }));
            
            if (setDealOfTheDay.fulfilled.match(result)) {
                showToast('Deal of the Day set successfully!', 'success');
                setDealOfTheDayModal(null);
                setDealOfTheDayExpiry('');
                // Refresh deals after setting deal of the day
                dispatch(fetchMarketplaceDeals({
                    page: currentPage,
                    limit: 12,
                    search: debouncedSearch || undefined,
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                }));
            } else if (setDealOfTheDay.rejected.match(result)) {
                const errorMessage = result.payload as string || 'Failed to set deal of the day';
                console.error('Failed to set deal of the day:', result.payload);
                showToast(errorMessage, 'error');
            }
        } catch (err: any) {
            console.error('Unexpected error setting deal of the day:', err);
            const errorMessage = err?.message || err?.data?.message || err?.toString() || 'An unexpected error occurred';
            showToast(errorMessage, 'error');
        } finally {
            setLocalSettingLoading(false);
        }
    };

    const handleUnsetDealOfTheDay = async () => {
        setLocalUnsettingLoading(true);
        try {
            const result = await dispatch(unsetDealOfTheDay());
            
            if (unsetDealOfTheDay.fulfilled.match(result)) {
                showToast('Deal of the Day removed successfully!', 'success');
                // Refresh deals after unsetting deal of the day
                dispatch(fetchMarketplaceDeals({
                    page: currentPage,
                    limit: 12,
                    search: debouncedSearch || undefined,
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                }));
            } else if (unsetDealOfTheDay.rejected.match(result)) {
                showToast(result.payload as string || 'Failed to remove deal of the day', 'error');
            }
        } catch (err) {
            showToast('An unexpected error occurred', 'error');
        } finally {
            setLocalUnsettingLoading(false);
        }
    };

    // Check if any deal is currently being set/unset (combine Redux state with local state)
    const isAnyDealActionLoading = isSettingDealOfTheDay || isUnsettingDealOfTheDay || localSettingLoading || localUnsettingLoading;

    // Get category values for filter dropdown
    const categoryOptions = ['all', ...categories.map(cat => cat.value)];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
                <p className="text-gray-600 mt-1">Browse and manage pharmaceutical deals from distributors</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Total Deals</p>
                        <p className="text-sm font-bold text-gray-900">{isLoadingDeals ? '...' : deals.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Active Deals</p>
                        <p className="text-sm font-bold text-green-600">{isLoadingDeals ? '...' : deals.filter(d => d.status === 'active').length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Sold Deals</p>
                        <p className="text-sm font-bold text-blue-600">{isLoadingDeals ? '...' : deals.filter(d => d.status === 'sold').length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-3">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600">Total Items</p>
                        <p className="text-sm font-bold text-gray-900">{isLoadingDeals ? '...' : deals.reduce((sum, d) => sum + d.quantity, 0)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-3 items-center mb-6">
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search deals..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto min-w-[150px]"
                        disabled={isLoadingCategories}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label} ({cat.count})</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'sold' | 'expired')}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto min-w-[130px]"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="sold">Sold</option>
                        <option value="expired">Expired</option>
                    </select>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[140px]"
                        >
                            <option value="posted_date">Posted Date</option>
                            <option value="product_name">Product Name</option>
                            <option value="category">Category</option>
                            <option value="distributor">Distributor</option>
                            <option value="status">Status</option>
                            <option value="expiry_date">Expiry Date</option>
                            <option value="deal_price">Deal Price</option>
                            <option value="quantity">Quantity</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Order:</label>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[120px]"
                        >
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                    </div>
                    <Button variant="primary" size="md" onClick={() => setAddModal(true)} className="w-full sm:w-auto whitespace-nowrap text-sm">Post New Deal</Button>
                </div>

                {isLoadingDeals ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            <p className="text-sm text-gray-600">Loading deals...</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {deals.map((deal) => (
                        <div key={deal.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow">
                            {deal.imageUrl && (
                                <div className="mb-4 rounded-lg overflow-hidden">
                                    <img 
                                        src={deal.imageUrl} 
                                        alt={deal.productName}
                                        className="w-full h-48 object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-gray-900 text-lg">{deal.productName}</h3>
                                        {deal.isDealOfTheDay && (
                                            <Badge variant="warning" className="flex items-center gap-1 whitespace-nowrap shrink-0">
                                                <Star className="w-3 h-3 fill-current" />
                                                Deal of the Day
                                            </Badge>
                                        )}
                                    </div>
                                    {/* <p className="text-sm text-gray-600">{deal.id}</p> */}
                                </div>
                                <Badge variant={deal.status === 'active' ? 'success' : deal.status === 'sold' ? 'info' : 'danger'} className="shrink-0">
                                    {deal.status}
                                </Badge>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Package className="w-4 h-4" />
                                    <span>{deal.quantity} {deal.unit}</span>
                                </div>
                                {deal.minimumBuyQuantity && deal.minimumBuyQuantity > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <DollarSign className="w-4 h-4" />
                                        <span>Min Order: {deal.minimumBuyQuantity} {deal.unit}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>{deal.category}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>Expires: {deal.expiryDate}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4 mb-4">
                                <div className="flex items-baseline justify-between mb-2">
                                    <span className="text-sm text-gray-600">Original Price:</span>
                                    <span className="text-sm text-gray-500 line-through">{formatCurrency(deal.originalPrice)}</span>
                                </div>
                                <div className="flex items-baseline justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900">Deal Price:</span>
                                    <span className="text-lg font-bold text-green-600">{formatCurrency(deal.dealPrice)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded font-medium">
                                        {calculateSavings(deal.originalPrice, deal.dealPrice)}% savings
                                    </span>
                                    {/* <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                                        {calculateProfit(deal.originalPrice, deal.dealPrice)}% margin
                                    </span> */}
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <p className="text-xs text-gray-500 mb-3">Distributor: {deal.distributor}</p>
                                <div className="flex items-center gap-2 mb-2">
                                    {deal.isDealOfTheDay ? (
                                        <Button 
                                            variant="danger" 
                                            size="sm" 
                                            className="flex-1 cursor-pointer" 
                                            onClick={handleUnsetDealOfTheDay}
                                            disabled={isAnyDealActionLoading}
                                        >
                                            {(isUnsettingDealOfTheDay || localUnsettingLoading) ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                    Removing...
                                                </>
                                            ) : (
                                                <>
                                                    <X className="w-4 h-4 mr-1" />
                                                    Unset Deal of Day
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex-1 cursor-pointer" 
                                            onClick={() => handleSetDealOfTheDay(deal)}
                                            disabled={isAnyDealActionLoading}
                                        >
                                            {isSettingDealOfTheDay ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                    Setting...
                                                </>
                                            ) : (
                                                <>
                                                    <Star className="w-4 h-4 mr-1" />
                                                    Set as Deal of the Day
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewModal(deal)}>
                                        <Eye className="w-4 h-4 mr-1" />
                                        View
                                    </Button>
                                    {deal.status === 'active' && (
                                        <Button variant="primary" size="sm" className="flex-1" onClick={() => setEditModal(deal)}>
                                            <Edit className="w-4 h-4 mr-1" />
                                            Edit
                                        </Button>
                                    )}
                                    <Button 
                                        variant="danger" 
                                        size="sm" 
                                        className="flex-1" 
                                        onClick={() => setDeleteModal(deal)}
                                        disabled={isDeletingDeal}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                )}

                {!isLoadingDeals && deals.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No deals found</p>
                    </div>
                )}

                {/* Pagination */}
                {!isLoadingDeals && pagination && pagination.totalCount && pagination.totalCount > 0 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            Showing {((currentPage - 1) * (pagination.limit || 12)) + 1} to {Math.min(currentPage * (pagination.limit || 12), pagination.totalCount)} of {pagination.totalCount} deals
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination.hasPreviousPage || currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </Button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                    disabled={!pagination.hasNextPage || currentPage === pagination.totalPages}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* View Modal */}
            {viewModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setViewModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Deal Details</h2>
                            <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {viewModal.imageUrl && (
                                <div className="mb-6 rounded-lg overflow-hidden">
                                    <img 
                                        src={viewModal.imageUrl} 
                                        alt={viewModal.productName}
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Deal ID</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.id}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                    <div className="mt-1">
                                        <Badge variant={viewModal.status === 'active' ? 'success' : viewModal.status === 'sold' ? 'info' : 'danger'}>
                                            {viewModal.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.productName}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.category}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Distributor</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.distributor}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.quantity} {viewModal.unit}</p>
                                </div>
                                {viewModal.minimumBuyQuantity && viewModal.minimumBuyQuantity > 0 && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Minimum Order</label>
                                        <p className="text-sm text-gray-900 font-medium">{viewModal.minimumBuyQuantity} {viewModal.unit}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Minimum Buy Quantity</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.minimumBuyQuantity}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.unit}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Original Price</label>
                                    <p className="text-sm text-gray-900 font-medium">{formatCurrency(viewModal.originalPrice)}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Deal Price</label>
                                    <p className="text-sm text-green-600 font-semibold">{formatCurrency(viewModal.dealPrice)}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Savings</label>
                                    <p className="text-sm text-gray-900 font-medium">{calculateSavings(viewModal.originalPrice, viewModal.dealPrice)}%</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Margin</label>
                                    <p className="text-sm text-gray-900 font-medium">{calculateProfit(viewModal.originalPrice, viewModal.dealPrice)}%</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Expiry Date</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.expiryDate}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Posted Date</label>
                                    <p className="text-sm text-gray-900 font-medium">{viewModal.postedDate}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" size="md" onClick={() => setViewModal(null)} className="text-sm">Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => !isUpdatingDeal && setEditModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-3xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Deal</h2>
                            <button onClick={() => {
                                if (!isUpdatingDeal) {
                                    setEditModal(null);
                                    setEditDealImage(null);
                                    setEditImagePreview(null);
                                }
                            }} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isUpdatingDeal}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product Image</label>
                                    <div className="mt-1">
                                        {editImagePreview ? (
                                            <div className="relative">
                                                <img 
                                                    src={editImagePreview} 
                                                    alt="Preview" 
                                                    className="w-full h-32 object-cover rounded-lg border border-gray-300"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditDealImage(null);
                                                        setEditImagePreview(null);
                                                    }}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                    disabled={isUpdatingDeal}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex flex-col items-center justify-center pt-3 pb-4">
                                                    <svg className="w-6 h-6 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <p className="mb-1 text-xs text-gray-500">
                                                        <span className="font-semibold">Click to upload</span>
                                                    </p>
                                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleEditImageChange}
                                                    className="hidden"
                                                    disabled={isUpdatingDeal}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                                    <input
                                        type="text"
                                        value={editModal.productName || ''}
                                        onChange={(e) => setEditModal({ ...editModal, productName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="e.g., Ibuprofen 200mg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            list="category-list-edit"
                                            value={editModal.category || ''}
                                            onChange={(e) => setEditModal({ ...editModal, category: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Select or type a new category"
                                            disabled={isLoadingCategories}
                                        />
                                        <datalist id="category-list-edit">
                                            {categories.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500">Select from list or type a new category</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Distributor *</label>
                                    <input
                                        type="text"
                                        value={editModal.distributor || ''}
                                        onChange={(e) => setEditModal({ ...editModal, distributor: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Distributor name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Buy Quantity *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editModal.minimumBuyQuantity || ''}
                                        onChange={(e) => setEditModal({ ...editModal, minimumBuyQuantity: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editModal.quantity || ''}
                                        onChange={(e) => setEditModal({ ...editModal, quantity: Number(e.target.value) })}
                                        className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                                            editModal.minimumBuyQuantity > 0 && editModal.quantity > 0 && editModal.quantity < editModal.minimumBuyQuantity
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                                        }`}
                                        placeholder="0"
                                    />
                                    {editModal.minimumBuyQuantity > 0 && editModal.quantity > 0 && editModal.quantity < editModal.minimumBuyQuantity && (
                                        <p className="mt-0.5 text-xs text-red-600">Must be ≥ {editModal.minimumBuyQuantity}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                                    <select
                                        value={editModal.unit || 'bottles'}
                                        onChange={(e) => setEditModal({ ...editModal, unit: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="bottles">Bottles</option>
                                        <option value="boxes">Boxes</option>
                                        <option value="units">Units</option>
                                        <option value="packs">Packs</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Original Price ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editModal.originalPrice || ''}
                                        onChange={(e) => setEditModal({ ...editModal, originalPrice: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Deal Price ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editModal.dealPrice || ''}
                                        onChange={(e) => setEditModal({ ...editModal, dealPrice: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date *</label>
                                    <input
                                        type="date"
                                        value={editModal.expiryDate || ''}
                                        onChange={(e) => setEditModal({ ...editModal, expiryDate: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                            <Button 
                                variant="outline" 
                                size="md" 
                                onClick={() => {
                                    if (!isUpdatingDeal) {
                                        setEditModal(null);
                                        setEditDealImage(null);
                                        setEditImagePreview(null);
                                    }
                                }} 
                                className="text-sm" 
                                disabled={isUpdatingDeal}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                size="md"
                                onClick={() => handleEdit(editModal)} 
                                disabled={
                                    isUpdatingDeal || 
                                    !editModal.productName || 
                                    !editModal.category || 
                                    !editModal.distributor || 
                                    editModal.quantity <= 0 || 
                                    editModal.minimumBuyQuantity <= 0 ||
                                    editModal.quantity < editModal.minimumBuyQuantity
                                }
                                className="text-sm"
                            >
                                {isUpdatingDeal ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Deal Modal */}
            {addModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => !isCreatingDeal && setAddModal(false)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-3xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Post New Deal</h2>
                            <button onClick={() => !isCreatingDeal && setAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isCreatingDeal}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product Image</label>
                                    <div className="mt-1">
                                        {imagePreview ? (
                                            <div className="relative">
                                                <img 
                                                    src={imagePreview} 
                                                    alt="Preview" 
                                                    className="w-full h-32 object-cover rounded-lg border border-gray-300"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDealImage(null);
                                                        setImagePreview(null);
                                                    }}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                    disabled={isCreatingDeal}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex flex-col items-center justify-center pt-3 pb-4">
                                                    <svg className="w-6 h-6 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <p className="mb-1 text-xs text-gray-500">
                                                        <span className="font-semibold">Click to upload</span>
                                                    </p>
                                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                    disabled={isCreatingDeal}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                                    <input
                                        type="text"
                                        value={newDeal.productName}
                                        onChange={(e) => setNewDeal({ ...newDeal, productName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="e.g., Ibuprofen 200mg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            list="category-list"
                                            value={newDeal.category}
                                            onChange={(e) => setNewDeal({ ...newDeal, category: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Select or type a new category"
                                            disabled={isLoadingCategories}
                                        />
                                        <datalist id="category-list">
                                            {categories.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500">Select from list or type a new category</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Distributor *</label>
                                    <input
                                        type="text"
                                        value={newDeal.distributor}
                                        onChange={(e) => setNewDeal({ ...newDeal, distributor: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Distributor name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Buy Quantity *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newDeal.minimumBuyQuantity || ''}
                                        onChange={(e) => setNewDeal({ ...newDeal, minimumBuyQuantity: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newDeal.quantity || ''}
                                        onChange={(e) => setNewDeal({ ...newDeal, quantity: Number(e.target.value) })}
                                        className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                                            newDeal.minimumBuyQuantity > 0 && newDeal.quantity > 0 && newDeal.quantity < newDeal.minimumBuyQuantity
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                                        }`}
                                        placeholder="0"
                                    />
                                    {newDeal.minimumBuyQuantity > 0 && newDeal.quantity > 0 && newDeal.quantity < newDeal.minimumBuyQuantity && (
                                        <p className="mt-0.5 text-xs text-red-600">Must be ≥ {newDeal.minimumBuyQuantity}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                                    <select
                                        value={newDeal.unit}
                                        onChange={(e) => setNewDeal({ ...newDeal, unit: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="bottles">Bottles</option>
                                        <option value="boxes">Boxes</option>
                                        <option value="units">Units</option>
                                        <option value="packs">Packs</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Original Price ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newDeal.originalPrice || ''}
                                        onChange={(e) => setNewDeal({ ...newDeal, originalPrice: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Deal Price ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newDeal.dealPrice || ''}
                                        onChange={(e) => setNewDeal({ ...newDeal, dealPrice: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date *</label>
                                    <input
                                        type="date"
                                        value={newDeal.expiryDate}
                                        onChange={(e) => setNewDeal({ ...newDeal, expiryDate: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                            <Button variant="outline" size="md" onClick={() => {
                                if (!isCreatingDeal) {
                                    setAddModal(false);
                                    setDealImage(null);
                                    setImagePreview(null);
                                }
                            }} className="text-sm" disabled={isCreatingDeal}>Cancel</Button>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleAddDeal}
                                disabled={
                                    !newDeal.productName || 
                                    !newDeal.category || 
                                    !newDeal.distributor || 
                                    newDeal.quantity <= 0 || 
                                    newDeal.minimumBuyQuantity <= 0 ||
                                    newDeal.quantity < newDeal.minimumBuyQuantity || 
                                    isCreatingDeal
                                }
                                className="text-sm"
                            >
                                {isCreatingDeal ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    'Post Deal'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => !isDeletingDeal && setDeleteModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Delete Deal</h2>
                            <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isDeletingDeal}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 mb-4">
                                Are you sure you want to delete the deal <span className="font-semibold">"{deleteModal.productName}"</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
                            <Button 
                                variant="outline" 
                                size="md" 
                                onClick={() => setDeleteModal(null)} 
                                className="text-sm"
                                disabled={isDeletingDeal}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="danger" 
                                size="md"
                                onClick={handleDeleteDeal}
                                disabled={isDeletingDeal}
                                className="text-sm"
                            >
                                {isDeletingDeal ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Deal
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deal of the Day Modal */}
            {dealOfTheDayModal && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => !isSettingDealOfTheDay && setDealOfTheDayModal(null)}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Set Deal of the Day</h2>
                            <button onClick={() => setDealOfTheDayModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isSettingDealOfTheDay}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 mb-4">
                                Set <span className="font-semibold">"{dealOfTheDayModal.productName}"</span> as Deal of the Day.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date & Time *</label>
                                <input
                                    type="datetime-local"
                                    value={dealOfTheDayExpiry ? new Date(dealOfTheDayExpiry).toISOString().slice(0, 16) : ''}
                                    onChange={(e) => {
                                        const date = new Date(e.target.value);
                                        date.setSeconds(59);
                                        setDealOfTheDayExpiry(date.toISOString());
                                    }}
                                    min={new Date().toISOString().slice(0, 16)}
                                    max={new Date().toISOString().slice(0, 16)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    disabled={isSettingDealOfTheDay}
                                />
                                <p className="mt-1 text-xs text-gray-500">Select today's date and time (max: end of today)</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
                            <Button 
                                variant="outline" 
                                size="md" 
                                onClick={() => {
                                    setDealOfTheDayModal(null);
                                    setDealOfTheDayExpiry('');
                                }} 
                                className="text-sm"
                                disabled={isSettingDealOfTheDay}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                size="md"
                                onClick={confirmSetDealOfTheDay} 
                                disabled={(isSettingDealOfTheDay || localSettingLoading) || !dealOfTheDayExpiry}
                                className="text-sm"
                            >
                                {(isSettingDealOfTheDay || localSettingLoading) ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Setting...
                                    </>
                                ) : (
                                    'Set Deal of the Day'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
