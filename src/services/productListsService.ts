import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';

export interface ProductListItem {
  id: string;
  ndc: string;
  product_name: string;
  full_units: number;
  partial_units: number;
  quantity: number; // Calculated as full_units + partial_units
  lot_number?: string;
  expiration_date?: string;
  notes?: string;
  added_at: string;
  added_by?: string;
}

// Add product list item directly (no list dependency)
export const addProductListItem = async (
  pharmacyId: string,
  item: {
    ndc: string;
    product_name: string;
    full_units: number;
    partial_units: number;
    lot_number?: string;
    expiration_date?: string;
    notes?: string;
  }
): Promise<ProductListItem> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  console.log('💾 Adding item directly to product_list_items:', {
    pharmacy_id: pharmacyId,
    ndc: item.ndc,
    product_name: item.product_name,
    full_units: item.full_units,
    partial_units: item.partial_units,
  });

  const { data, error } = await db
    .from('product_list_items')
    .insert({
      ndc: item.ndc,
      product_name: item.product_name,
      full_units: item.full_units,
      partial_units: item.partial_units,
      lot_number: item.lot_number,
      expiration_date: item.expiration_date,
      notes: item.notes,
      added_by: pharmacyId,
    })
    .select('id, ndc, product_name, full_units, partial_units, lot_number, expiration_date, notes, added_at, added_by')
    .single();

  if (error) {
    console.error('❌ Database error:', error);
    throw new AppError(`Failed to add product list item: ${error.message}`, 400);
  }

  console.log('✅ Item added to product_list_items:', data);
  
  // Add quantity field (sum of full_units and partial_units)
  return {
    ...data,
    quantity: (data.full_units || 0) + (data.partial_units || 0),
  };
};

// Remove item from product list
export const removeItemFromProductList = async (itemId: string, pharmacyId: string): Promise<void> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // First, verify the item exists and belongs to the pharmacy
  const { data: existingItem, error: fetchError } = await db
    .from('product_list_items')
    .select('id, added_by, product_name, ndc')
    .eq('id', itemId)
    .single();

  if (fetchError || !existingItem) {
    throw new AppError('Product list item not found', 404);
  }

  if (existingItem.added_by !== pharmacyId) {
    throw new AppError('You do not have permission to delete this item', 403);
  }

  // Check if this product is used in any packages
  // Get all packages for this pharmacy
  const { data: packages, error: packagesError } = await db
    .from('custom_packages')
    .select('id')
    .eq('pharmacy_id', pharmacyId);

  if (packagesError) {
    throw new AppError(`Failed to check packages: ${packagesError.message}`, 400);
  }

  const packageIds = (packages || []).map((pkg: any) => pkg.id);

  if (packageIds.length > 0) {
    // Check if this product_id is used in any package items
    const { data: usedInPackages, error: usageError } = await db
      .from('custom_package_items')
      .select('id, package_id, full, partial')
      .eq('product_id', itemId)
      .in('package_id', packageIds);

    if (usageError) {
      throw new AppError(`Failed to check package usage: ${usageError.message}`, 400);
    }

    if (usedInPackages && usedInPackages.length > 0) {
      // Calculate total quantity used in packages
      const totalUsedFull = usedInPackages.reduce((sum: number, item: any) => sum + (item.full || 0), 0);
      const totalUsedPartial = usedInPackages.reduce((sum: number, item: any) => sum + (item.partial || 0), 0);
      const totalUsed = totalUsedFull + totalUsedPartial;

      throw new AppError(
        `Cannot delete this product. It is currently used in ${usedInPackages.length} package(s) with a total of ${totalUsed} units (${totalUsedFull} full, ${totalUsedPartial} partial). Please remove it from all packages first before deleting.`,
        400
      );
    }
  }

  // Safe to delete - not used in any packages
  const { error } = await db
    .from('product_list_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw new AppError(`Failed to remove item from product list: ${error.message}`, 400);
  }
};

// Get all product list items directly for a pharmacy
// Subtracts quantities used in ALL packages (pending and created) and removes items with zero remaining quantity
export const getProductListItems = async (pharmacyId: string): Promise<ProductListItem[]> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // Get all items for this pharmacy (filtered by added_by)
  const { data: items, error } = await db
    .from('product_list_items')
    .select('id, ndc, product_name, full_units, partial_units, lot_number, expiration_date, notes, added_at, added_by')
    .eq('added_by', pharmacyId)
    .order('added_at', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch product list items: ${error.message}`, 400);
  }

  if (!items || items.length === 0) {
    return [];
  }

  // Get ALL packages for this pharmacy (both pending and created)
  // Items are "reserved" when added to any package
  const { data: allPackages, error: packagesError } = await db
    .from('custom_packages')
    .select('id, status')
    .eq('pharmacy_id', pharmacyId);

  if (packagesError) {
    throw new AppError(`Failed to fetch packages: ${packagesError.message}`, 400);
  }

  const allPackageIds = (allPackages || []).map((pkg: any) => pkg.id);

  // If there are no packages, return all items with their full quantities
  if (allPackageIds.length === 0) {
    return items.map((item: any) => ({
      ...item,
      quantity: (item.full_units || 0) + (item.partial_units || 0),
    }));
  }

  // Get all items from ALL packages to calculate quantities used
  // IMPORTANT: Use product_id (not NDC) to track which specific product list items are used
  const { data: packageItems, error: packageItemsError } = await db
    .from('custom_package_items')
    .select('product_id, full, partial')
    .in('package_id', allPackageIds);

  if (packageItemsError) {
    throw new AppError(`Failed to fetch package items: ${packageItemsError.message}`, 400);
  }

  // Build a map of product_id to total quantity used in packages
  // Each product list item is tracked by its unique ID (not merged by NDC)
  const usedQuantityByProductId: Record<string, { full: number; partial: number }> = {};
  (packageItems || []).forEach((pkgItem: any) => {
    if (pkgItem.product_id) {
      if (!usedQuantityByProductId[pkgItem.product_id]) {
        usedQuantityByProductId[pkgItem.product_id] = { full: 0, partial: 0 };
    }
      // Track full and partial separately
      usedQuantityByProductId[pkgItem.product_id].full += (pkgItem.full || 0);
      usedQuantityByProductId[pkgItem.product_id].partial += (pkgItem.partial || 0);
    }
  });

  console.log('\n========== PRODUCT LIST ITEMS DEBUG ==========');
  console.log('📦 Package items used by product_id:', usedQuantityByProductId);
  console.log('📋 Product list items from DB:', items.map((i: any) => ({
    id: i.id,
    ndc: i.ndc,
    full: i.full_units,
    partial: i.partial_units,
    total: (i.full_units || 0) + (i.partial_units || 0)
  })));

  // Process each item: subtract used quantities based on product_id and filter out items with remaining <= 0
  const result: ProductListItem[] = [];
  
  for (const item of items) {
    const originalFullUnits = item.full_units || 0;
    const originalPartialUnits = item.partial_units || 0;
    
    // Get how much is used for THIS specific product (by ID)
    const usedForThisProduct = usedQuantityByProductId[item.id] || { full: 0, partial: 0 };
    
    // Calculate remaining quantities
    const adjustedFullUnits = Math.max(0, originalFullUnits - usedForThisProduct.full);
    const adjustedPartialUnits = Math.max(0, originalPartialUnits - usedForThisProduct.partial);
    const remainingQuantity = adjustedFullUnits + adjustedPartialUnits;

    console.log(`\n📊 Processing: id=${item.id}, NDC=${item.ndc}`);
    console.log(`   DB values: full_units=${originalFullUnits}, partial_units=${originalPartialUnits}`);
    console.log(`   Used in packages: full=${usedForThisProduct.full}, partial=${usedForThisProduct.partial}`);
    console.log(`   Result: adjustedFull=${adjustedFullUnits}, adjustedPartial=${adjustedPartialUnits}, remainingQty=${remainingQuantity}`);

    // Only remove if remaining quantity is 0 or negative (completely used)
    if (remainingQuantity <= 0) {
      console.log(`   ❌ REMOVING - remaining (${remainingQuantity}) <= 0`);
      continue;
    }

    console.log(`   ✅ KEEPING - full_units=${adjustedFullUnits}, partial_units=${adjustedPartialUnits}, quantity=${remainingQuantity}`);

    result.push({
      ...item,
      full_units: adjustedFullUnits,
      partial_units: adjustedPartialUnits,
      quantity: remainingQuantity,
    });
  }

  console.log(`\n========== RESULT ==========`);
  console.log(`✅ Returning ${result.length} items (removed ${items.length - result.length} fully used)`);
  console.log('========================================\n');

  return result;
};

// Update product list item
export const updateProductListItem = async (
  itemId: string,
  pharmacyId: string,
  updates: {
    ndc?: string;
    product_name?: string;
    full_units?: number;
    partial_units?: number;
    lot_number?: string;
    expiration_date?: string;
    notes?: string;
  }
): Promise<ProductListItem> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // First, verify the item exists and belongs to the pharmacy
  const { data: existingItem, error: fetchError } = await db
    .from('product_list_items')
    .select('id, added_by, full_units, partial_units, product_name, ndc')
    .eq('id', itemId)
    .single();

  if (fetchError || !existingItem) {
    throw new AppError('Product list item not found', 404);
  }

  if (existingItem.added_by !== pharmacyId) {
    throw new AppError('You do not have permission to update this item', 403);
  }

  // Build update object with only provided fields
  const updateData: any = {};
  if (updates.ndc !== undefined) updateData.ndc = updates.ndc;
  if (updates.product_name !== undefined) updateData.product_name = updates.product_name;
  if (updates.lot_number !== undefined) updateData.lot_number = updates.lot_number;
  if (updates.expiration_date !== undefined) updateData.expiration_date = updates.expiration_date;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  // Handle full_units and partial_units updates
  // If either is being updated, we need to ensure one is 0 and the other is > 0
  if (updates.full_units !== undefined || updates.partial_units !== undefined) {
    const newFullUnits = updates.full_units !== undefined ? updates.full_units : existingItem.full_units;
    const newPartialUnits = updates.partial_units !== undefined ? updates.partial_units : existingItem.partial_units;

    // Validate: one must be 0 and the other must be > 0
    if (!((newFullUnits === 0 && newPartialUnits > 0) || (newFullUnits > 0 && newPartialUnits === 0))) {
      throw new AppError('One of full_units or partial_units must be 0, and the other must be greater than 0', 400);
    }

    // Check how much of this product is already used in packages
    // Get all packages for this pharmacy
    const { data: packages, error: packagesError } = await db
      .from('custom_packages')
      .select('id')
      .eq('pharmacy_id', pharmacyId);

    if (packagesError) {
      throw new AppError(`Failed to check packages: ${packagesError.message}`, 400);
    }

    const packageIds = (packages || []).map((pkg: any) => pkg.id);

    let usedFullUnits = 0;
    let usedPartialUnits = 0;

    if (packageIds.length > 0) {
      // Get total quantities used in packages for this product_id
      const { data: usedInPackages, error: usageError } = await db
        .from('custom_package_items')
        .select('full, partial')
        .eq('product_id', itemId)
        .in('package_id', packageIds);

      if (usageError) {
        throw new AppError(`Failed to check package usage: ${usageError.message}`, 400);
      }

      if (usedInPackages && usedInPackages.length > 0) {
        usedFullUnits = usedInPackages.reduce((sum: number, item: any) => sum + (item.full || 0), 0);
        usedPartialUnits = usedInPackages.reduce((sum: number, item: any) => sum + (item.partial || 0), 0);
      }
    }

    // Validate: cannot decrease below what's already used in packages
    if (newFullUnits < usedFullUnits) {
      throw new AppError(
        `Cannot decrease full units to ${newFullUnits}. This product has ${usedFullUnits} full unit(s) already added to package(s). You can only set full_units to ${usedFullUnits} or higher.`,
        400
      );
    }

    if (newPartialUnits < usedPartialUnits) {
      throw new AppError(
        `Cannot decrease partial units to ${newPartialUnits}. This product has ${usedPartialUnits} partial unit(s) already added to package(s). You can only set partial_units to ${usedPartialUnits} or higher.`,
        400
      );
    }

    if (updates.full_units !== undefined) updateData.full_units = newFullUnits;
    if (updates.partial_units !== undefined) updateData.partial_units = newPartialUnits;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No fields provided to update', 400);
  }

  console.log('💾 Updating product list item:', {
    item_id: itemId,
    updates: updateData,
  });

  const { data, error } = await db
    .from('product_list_items')
    .update(updateData)
    .eq('id', itemId)
    .select('id, ndc, product_name, full_units, partial_units, lot_number, expiration_date, notes, added_at, added_by')
    .single();

  if (error) {
    console.error('❌ Database error:', error);
    throw new AppError(`Failed to update product list item: ${error.message}`, 400);
  }

  console.log('✅ Item updated in product_list_items:', data);
  
  // Add quantity field (sum of full_units and partial_units)
  return {
    ...data,
    quantity: (data.full_units || 0) + (data.partial_units || 0),
  };
};

// Clear all product list items for a pharmacy
export const clearAllProductListItems = async (pharmacyId: string): Promise<{ deletedCount: number }> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const db = supabaseAdmin;

  // First, get count of items to be deleted
  const { count, error: countError } = await db
    .from('product_list_items')
    .select('*', { count: 'exact', head: true })
    .eq('added_by', pharmacyId);

  if (countError) {
    throw new AppError(`Failed to count product list items: ${countError.message}`, 400);
  }

  const deletedCount = count || 0;

  // Delete all items for this pharmacy
  const { error } = await db
    .from('product_list_items')
    .delete()
    .eq('added_by', pharmacyId);

  if (error) {
    throw new AppError(`Failed to clear product list items: ${error.message}`, 400);
  }

  return { deletedCount };
};

