import type { ProductList, ProductListItem } from '@/types'

export const mockProductLists: ProductList[] = [
  {
    id: 'list-1',
    pharmacyId: 'pharm-1',
    name: 'January Returns',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    products: [
      {
        id: 'item-1',
        ndc: '00093-2263-01',
        productName: 'Amoxicillin 500mg Capsule',
        quantity: 100,
        lotNumber: 'LOT-2024-001',
        expirationDate: '2025-06-30',
        notes: 'Expiring soon',
        addedAt: '2024-01-10T10:00:00Z',
        addedBy: 'user-1',
      },
      {
        id: 'item-2',
        ndc: '69618-010-01',
        productName: 'Tylenol 325mg Tablet',
        quantity: 500,
        lotNumber: 'LOT-TYL-2024-001',
        expirationDate: '2025-12-31',
        notes: '',
        addedAt: '2024-01-10T10:15:00Z',
        addedBy: 'user-1',
      },
    ],
  },
  {
    id: 'list-2',
    pharmacyId: 'pharm-1',
    name: 'February Returns',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-05T00:00:00Z',
    products: [
      {
        id: 'item-3',
        ndc: '00573-0201-30',
        productName: 'Advil 200mg Tablet',
        quantity: 200,
        lotNumber: 'LOT-ADV-2024-001',
        expirationDate: '2025-08-15',
        notes: '',
        addedAt: '2024-02-01T09:00:00Z',
        addedBy: 'user-1',
      },
    ],
  },
]

export const mockProductItems: ProductListItem[] = [
  {
    id: 'item-1',
    ndc: '00093-2263-01',
    productName: 'Amoxicillin 500mg Capsule',
    quantity: 100,
    lotNumber: 'LOT-2024-001',
    expirationDate: '2025-06-30',
    notes: 'Expiring soon',
    addedAt: '2024-01-10T10:00:00Z',
    addedBy: 'user-1',
  },
  {
    id: 'item-2',
    ndc: '69618-010-01',
    productName: 'Tylenol 325mg Tablet',
    quantity: 500,
    lotNumber: 'LOT-TYL-2024-001',
    expirationDate: '2025-12-31',
    notes: '',
    addedAt: '2024-01-10T10:15:00Z',
    addedBy: 'user-1',
  },
  {
    id: 'item-3',
    ndc: '00573-0201-30',
    productName: 'Advil 200mg Tablet',
    quantity: 200,
    lotNumber: 'LOT-ADV-2024-001',
    expirationDate: '2025-08-15',
    notes: '',
    addedAt: '2024-02-01T09:00:00Z',
    addedBy: 'user-1',
  },
]

