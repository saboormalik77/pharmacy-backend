import { supabaseAdmin } from '../config/supabase';
import { AppError } from './appError';

/**
 * Warehouse address shape (compatible with legacy admin_settings warehouse fields)
 * Returned by getWarehouseAddressFromTable() below.
 */
export interface WarehouseAddress {
  warehouseName: string | null;
  warehouseStreet: string | null;
  warehouseCity: string | null;
  warehouseState: string | null;
  warehouseZip: string | null;
  warehouseCountry: string | null;
  warehousePhone: string | null;
  warehouseContactName: string | null;
}

/**
 * Fetch the default warehouse address from the dedicated `warehouses` table.
 *
 * Returns data in the legacy `warehouse*` field shape so it is a drop-in
 * replacement for code that previously read these fields from the
 * `admin_settings` RPC (`get_admin_settings`).
 *
 * If no default warehouse exists, all fields will be null.
 */
export const getWarehouseAddressFromTable = async (): Promise<WarehouseAddress> => {
  if (!supabaseAdmin) {
    throw new AppError('Supabase admin client not configured', 500);
  }

  const { data, error } = await supabaseAdmin.rpc('get_default_warehouse');

  if (error) {
    throw new AppError(`Failed to fetch warehouse: ${error.message}`, 500);
  }

  if (data?.error) {
    throw new AppError(data.message || 'Failed to fetch warehouse', 500);
  }

  const warehouse = data?.warehouse;

  if (!warehouse) {
    return {
      warehouseName: null,
      warehouseStreet: null,
      warehouseCity: null,
      warehouseState: null,
      warehouseZip: null,
      warehouseCountry: null,
      warehousePhone: null,
      warehouseContactName: null,
    };
  }

  return {
    warehouseName: warehouse.name ?? null,
    warehouseStreet: warehouse.street ?? null,
    warehouseCity: warehouse.city ?? null,
    warehouseState: warehouse.state ?? null,
    warehouseZip: warehouse.zip ?? null,
    warehouseCountry: warehouse.country ?? null,
    warehousePhone: warehouse.phone ?? null,
    warehouseContactName: warehouse.contactName ?? null,
  };
};
