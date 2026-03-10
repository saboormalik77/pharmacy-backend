'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/api/apiClient';
import { DistributorProduct, DistributorProductsResponse } from '@/lib/types';

export default function DistributorProductsPage() {
    const params = useParams();
    const router = useRouter();
    const distributorId = params.id as string;

    const [products, setProducts] = useState<DistributorProduct[]>([]);
    const [distributorName, setDistributorName] = useState<string>('');
    const [productsPagination, setProductsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState<string | null>(null);

    const fetchProducts = useCallback(async (page: number = 1) => {
        if (!distributorId) return;
        
        setProductsLoading(true);
        setProductsError(null);
        try {
            const response: DistributorProductsResponse = await apiClient.get<DistributorProductsResponse>(
                `/admin/distributors/${distributorId}/products`,
                true,
                { page, limit: 20 }
            );
            setProducts(response.data.products);
            setDistributorName(response.data.distributor.name);
            setProductsPagination(response.data.pagination);
        } catch (error: any) {
            setProductsError(error?.message || 'Failed to fetch products');
            setProducts([]);
        } finally {
            setProductsLoading(false);
        }
    }, [distributorId]);

    useEffect(() => {
        fetchProducts(1);
    }, [fetchProducts]);

    const handlePageChange = (newPage: number) => {
        fetchProducts(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="Back to Distributors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    {distributorName && (
                        <p className="text-gray-600 mt-1">{distributorName}</p>
                    )}
                </div>
            </div>

            {productsError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {productsError}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                {productsLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading products...</p>
                    </div>
                ) : (
                    <>
                        {products.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No products found</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NDC Code</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Unit</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Amount</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot Number</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiration Date</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Size</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {products.map((product, index) => (
                                                <tr key={`${product.reportId}-${index}`} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{product.ndcCode}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-900 max-w-[200px] truncate" title={product.productName}>{product.productName}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[150px] truncate" title={product.manufacturer}>{product.manufacturer}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{product.quantity}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">${product.pricePerUnit.toFixed(2)}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">${product.creditAmount.toFixed(2)}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{product.lotNumber}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{new Date(product.expirationDate).toLocaleDateString()}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{product.packageSize}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{new Date(product.reportDate).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Products Pagination */}
                                {productsPagination && productsPagination.totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                                        <div className="text-sm text-gray-600">
                                            Showing {((productsPagination.page - 1) * productsPagination.limit) + 1} to {Math.min(productsPagination.page * productsPagination.limit, productsPagination.total)} of {productsPagination.total} products
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePageChange(productsPagination.page - 1)}
                                                disabled={productsPagination.page === 1}
                                                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                            <span className="px-4 py-2 text-sm text-gray-700">
                                                Page {productsPagination.page} of {productsPagination.totalPages}
                                            </span>
                                            <button
                                                onClick={() => handlePageChange(productsPagination.page + 1)}
                                                disabled={productsPagination.page === productsPagination.totalPages}
                                                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

