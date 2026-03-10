import type { NDCProduct } from './mockNDCProducts';
import { mockNDCProducts, findProductByNDC } from './mockNDCProducts';

export interface InventoryItem {
  id: string;
  product: NDCProduct;
  lotNumber: string;
  expirationDate: string;
  quantity: number; // Total quantity in base units (tablets/capsules)
  boxes?: number; // Number of boxes
  tabletsPerBox?: number; // Tablets per box
  location?: string;
  addedDate: string;
  daysUntilExpiration: number;
  status: 'active' | 'expiring_soon' | 'expired';
  availableQuantity: number; // Available for returns (not already in a return)
}

// Initialize with realistic pharmacy inventory data
function initializeMockInventory(): InventoryItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const createItem = (
    ndc: string,
    lotNumber: string,
    expirationDate: string,
    quantity: number,
    location: string = 'Main Warehouse',
    boxes?: number,
    tabletsPerBox?: number
  ): InventoryItem | null => {
    const product = findProductByNDC(ndc);
    if (!product) return null;

    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const status: InventoryItem['status'] = daysUntilExpiration < 0 
      ? 'expired' 
      : daysUntilExpiration <= 180 
      ? 'expiring_soon' 
      : 'active';

    const baseTime = Date.now();
    const randomOffset = Math.floor(Math.random() * 1000000);
    return {
      id: `INV-${baseTime + randomOffset}-${Math.random().toString(36).substr(2, 9)}`,
      product,
      lotNumber,
      expirationDate,
      quantity,
      boxes,
      tabletsPerBox,
      location,
      addedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      daysUntilExpiration,
      status,
      availableQuantity: quantity,
    };
  };

  // Create dates for different statuses
  const expiredDate = new Date(today);
  expiredDate.setDate(expiredDate.getDate() - 30); // 30 days ago

  const expiringSoonDate = new Date(today);
  expiringSoonDate.setDate(expiringSoonDate.getDate() + 90); // 90 days from now

  const activeDate1 = new Date(today);
  activeDate1.setDate(activeDate1.getDate() + 365); // 1 year from now

  const activeDate2 = new Date(today);
  activeDate2.setDate(activeDate2.getDate() + 730); // 2 years from now

  const items: InventoryItem[] = [];

  // Active Items (good expiration dates)
  const active1 = createItem('00071-0156-23', 'LOT20240115', activeDate1.toISOString().split('T')[0], 270, 'Main Warehouse', 3, 90);
  if (active1) items.push(active1);

  const active2 = createItem('00093-7214-01', 'LOT20240220', activeDate2.toISOString().split('T')[0], 500, 'Main Warehouse', 5, 100);
  if (active2) items.push(active2);

  const active3 = createItem('00006-0019-58', 'LOT20240310', activeDate1.toISOString().split('T')[0], 180, 'Main Warehouse', 2, 90);
  if (active3) items.push(active3);

  const active4 = createItem('00093-2263-01', 'LOT20240405', activeDate2.toISOString().split('T')[0], 300, 'Main Warehouse', 3, 100);
  if (active4) items.push(active4);

  const active5 = createItem('69618-010-01', 'LOT20240512', activeDate1.toISOString().split('T')[0], 200, 'Main Warehouse', 2, 100);
  if (active5) items.push(active5);

  const active6 = createItem('00573-0201-30', 'LOT20240618', activeDate2.toISOString().split('T')[0], 150, 'Main Warehouse', 5, 30);
  if (active6) items.push(active6);

  const active7 = createItem('00113-0912-71', 'LOT20240722', activeDate1.toISOString().split('T')[0], 84, 'Main Warehouse', 6, 14);
  if (active7) items.push(active7);

  const active8 = createItem('00045-5010-30', 'LOT20240830', activeDate2.toISOString().split('T')[0], 120, 'Main Warehouse', 4, 30);
  if (active8) items.push(active8);

  // Expiring Soon Items (within 180 days)
  const expiring1 = createItem('00071-0156-23', 'LOT20230915', expiringSoonDate.toISOString().split('T')[0], 90, 'Main Warehouse', 1, 90);
  if (expiring1) items.push(expiring1);

  const expiring2 = createItem('00093-7214-01', 'LOT20231020', expiringSoonDate.toISOString().split('T')[0], 200, 'Main Warehouse', 2, 100);
  if (expiring2) items.push(expiring2);

  const expiring3 = createItem('00006-0019-58', 'LOT20231110', expiringSoonDate.toISOString().split('T')[0], 90, 'Main Warehouse', 1, 90);
  if (expiring3) items.push(expiring3);

  const expiring4 = createItem('69618-010-01', 'LOT20231205', expiringSoonDate.toISOString().split('T')[0], 100, 'Main Warehouse', 1, 100);
  if (expiring4) items.push(expiring4);

  // Expired Items
  const expired1 = createItem('00071-0156-23', 'LOT20221215', expiredDate.toISOString().split('T')[0], 50, 'Main Warehouse', 1, 50);
  if (expired1) items.push(expired1);

  const expired2 = createItem('00093-7214-01', 'LOT20230120', expiredDate.toISOString().split('T')[0], 100, 'Main Warehouse', 1, 100);
  if (expired2) items.push(expired2);

  const expired3 = createItem('00006-0019-58', 'LOT20230210', expiredDate.toISOString().split('T')[0], 45, 'Main Warehouse', 1, 45);
  if (expired3) items.push(expired3);

  const expired4 = createItem('69618-010-01', 'LOT20230305', expiredDate.toISOString().split('T')[0], 75, 'Main Warehouse', 1, 75);
  if (expired4) items.push(expired4);

  const expired5 = createItem('00573-0201-30', 'LOT20230418', expiredDate.toISOString().split('T')[0], 60, 'Main Warehouse', 2, 30);
  if (expired5) items.push(expired5);

  return items;
}

// Mock inventory data - in production this would come from a database
export let mockInventory: InventoryItem[] = initializeMockInventory();

// Helper to get inventory from localStorage or return mock data
export function getInventory(): InventoryItem[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pharmacy_inventory');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only return stored data if it exists, otherwise use mock data
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing inventory from localStorage', e);
      }
    } else {
      // Initialize localStorage with mock data if empty
      saveInventory(mockInventory);
    }
  }
  return mockInventory;
}

// Helper to save inventory to localStorage
export function saveInventory(inventory: InventoryItem[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pharmacy_inventory', JSON.stringify(inventory));
    mockInventory = inventory;
  }
}

// Helper to add item to inventory
export function addInventoryItem(item: Omit<InventoryItem, 'id' | 'addedDate' | 'daysUntilExpiration' | 'status' | 'availableQuantity'>): InventoryItem {
  const inventory = getInventory();
  
  const expDate = new Date(item.expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);
  const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const status: InventoryItem['status'] = daysUntilExpiration < 0 
    ? 'expired' 
    : daysUntilExpiration <= 180 
    ? 'expiring_soon' 
    : 'active';

  const newItem: InventoryItem = {
    ...item,
    id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedDate: new Date().toISOString(),
    daysUntilExpiration,
    status,
    availableQuantity: item.quantity,
  };

  const updated = [...inventory, newItem];
  saveInventory(updated);
  return newItem;
}

// Helper to update inventory item
export function updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
  const inventory = getInventory();
  const index = inventory.findIndex(item => item.id === id);
  
  if (index === -1) return null;

  const item = inventory[index];
  const updated = { ...item, ...updates };

  // Recalculate status if expiration date changed
  if (updates.expirationDate) {
    const expDate = new Date(updates.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    updated.daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    updated.status = updated.daysUntilExpiration < 0 
      ? 'expired' 
      : updated.daysUntilExpiration <= 180 
      ? 'expiring_soon' 
      : 'active';
  }

  // Update available quantity if quantity changed
  if (updates.quantity !== undefined) {
    const usedQuantity = item.quantity - item.availableQuantity;
    updated.availableQuantity = Math.max(0, updates.quantity - usedQuantity);
  }

  inventory[index] = updated;
  saveInventory(inventory);
  return updated;
}

// Helper to get available inventory items (for returns)
export function getAvailableInventory(): InventoryItem[] {
  return getInventory().filter(item => item.availableQuantity > 0 && item.status !== 'expired');
}

// Helper to reserve quantity from inventory (when creating return)
export function reserveInventoryQuantity(id: string, quantity: number): boolean {
  const inventory = getInventory();
  const item = inventory.find(i => i.id === id);
  
  if (!item || item.availableQuantity < quantity) {
    return false;
  }

  item.availableQuantity -= quantity;
  saveInventory(inventory);
  return true;
}

// Helper to release reserved quantity (when return is cancelled)
export function releaseInventoryQuantity(id: string, quantity: number): void {
  const inventory = getInventory();
  const item = inventory.find(i => i.id === id);
  
  if (item) {
    item.availableQuantity = Math.min(item.quantity, item.availableQuantity + quantity);
    saveInventory(inventory);
  }
}

