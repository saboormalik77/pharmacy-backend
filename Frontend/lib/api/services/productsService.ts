/**
 * Products/NDC API Service
 */

import { apiClient } from '../client';
import { Product } from '@/types';

export interface ValidateNDCResponse {
  valid: boolean;
  product?: Product;
  error?: string;
  suggestion?: string;
  ndc: string;
}

export interface CreateProductRequest {
  ndc: string;
  product_name: string;
  manufacturer?: string;
  strength?: string;
  dosage_form?: string;
  package_size?: number;
  wac?: number;
  awp?: number;
}

export const productsService = {
  /**
   * Validate NDC format and lookup product
   */
  async validateNDC(ndc: string): Promise<ValidateNDCResponse> {
    try {
      // Try POST first (body param)
      const response = await apiClient.post<any>('/ndc/validate', { ndc }, false);
      
      // The Next.js API route returns { valid: true, product: {...} } directly
      // But apiClient wraps it in ApiResponse format
      // Check both formats
      let responseData: any;
      
      if (response.status === 'success' && response.data) {
        responseData = response.data;
      } else if ((response as any).valid !== undefined) {
        // Direct format from Next.js API route
        responseData = response;
      } else {
        responseData = response;
      }
      
      // Handle success response
      if (responseData.valid === true && responseData.product) {
        return {
          valid: true,
          product: responseData.product,
          ndc: responseData.ndc || ndc,
        };
      }
      
      // Handle error response
      if (responseData.error || responseData.valid === false) {
        return {
          valid: false,
          error: responseData.error || responseData.message || 'NDC validation failed',
          suggestion: responseData.suggestion,
          ndc: responseData.ndc || ndc,
        };
      }
      
      throw new Error('Invalid response format from API');
    } catch (error: any) {
      // If POST fails, try GET
      try {
        const response = await apiClient.get<any>('/ndc/validate', { ndc }, false);
        
        let responseData: any;
        if (response.status === 'success' && response.data) {
          responseData = response.data;
        } else if ((response as any).valid !== undefined) {
          responseData = response;
        } else {
          responseData = response;
        }
        
        if (responseData.valid === true && responseData.product) {
          return {
            valid: true,
            product: responseData.product,
            ndc: responseData.ndc || ndc,
          };
        }
        
        if (responseData.error || responseData.valid === false) {
          return {
            valid: false,
            error: responseData.error || responseData.message || 'NDC validation failed',
            suggestion: responseData.suggestion,
            ndc: responseData.ndc || ndc,
          };
        }
      } catch (getError: any) {
        return {
          valid: false,
          error: getError.message || getError.error || 'NDC validation failed',
          ndc,
        };
      }
      
      return {
        valid: false,
        error: error.message || error.error || 'NDC validation failed',
        ndc,
      };
    }
  },

  /**
   * Search products
   */
  async searchProducts(searchTerm: string, limit: number = 20): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/products/search', { search: searchTerm, limit }, false);
    if (response.status === 'success' && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.message || 'Failed to search products');
  },

  /**
   * Create or update a product
   */
  async createOrUpdateProduct(data: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<Product>('/products', data, false);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create/update product');
  },
};

