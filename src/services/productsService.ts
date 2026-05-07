import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

export interface Product {
  id: string;
  ndc: string;
  product_name: string;
  manufacturer?: string;
  strength?: string;
  dosage_form?: string;
  package_size?: number;
  wac?: number;
  awp?: number;
  dea_schedule?: string;
  return_eligibility?: any;
  created_at: string;
  updated_at: string;
}

export const formatNDC = (ndc: string): string => {
  // Remove all non-digit characters
  const digits = ndc.replace(/\D/g, '');
  
  // Format as XXXXX-XXXX-XX
  if (digits.length === 10) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`;
  } else if (digits.length === 11) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`;
  }
  
  return ndc;
};

export const isValidNDCFormat = (ndc: string): boolean => {
  // Check if NDC matches format XXXXX-XXXX-XX or XXXXX-XXXX-XXX
  const pattern = /^\d{5}-\d{4}-\d{2,3}$/;
  return pattern.test(ndc);
};

export const findProductByNDC = async (ndc: string): Promise<Product | null> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;
  const formattedNDC = formatNDC(ndc);

  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('ndc', formattedNDC)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
};

export const createOrUpdateProduct = async (productData: Partial<Product>): Promise<Product> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  if (!productData.ndc) {
    throw new AppError('NDC is required', 400);
  }

  const formattedNDC = formatNDC(productData.ndc);

  // Check if product exists
  const existing = await findProductByNDC(formattedNDC);

  if (existing) {
    // Update existing product
    const { data, error } = await db
      .from('products')
      .update({
        ...productData,
        ndc: formattedNDC,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update product: ${error.message}`, 400);
    }

    return data;
  } else {
    // Create new product
    const { data, error } = await db
      .from('products')
      .insert({
        ...productData,
        ndc: formattedNDC,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to create product: ${error.message}`, 400);
    }

    return data;
  }
};

export const searchProducts = async (searchTerm: string, limit: number = 20): Promise<Product[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  const { data, error } = await db
    .from('products')
    .select('*')
    .or(`ndc.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%,manufacturer.ilike.%${searchTerm}%`)
    .limit(limit);

  if (error) {
    throw new AppError(`Failed to search products: ${error.message}`, 400);
  }

  return data || [];
};

