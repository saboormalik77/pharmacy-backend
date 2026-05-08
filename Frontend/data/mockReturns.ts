import { Return, ReturnItem } from '@/types'

export const mockReturnItems: ReturnItem[] = [
  {
    id: 'item-1',
    ndc: '00002-7510-01',
    drugName: 'Prozac 20mg Capsules',
    manufacturer: 'Eli Lilly',
    lotNumber: 'AB12345',
    expirationDate: '2025-06-30',
    quantity: 100,
    unit: 'capsules',
    reason: 'Overstocked',
    estimatedCredit: 450.00,
    classification: 'returnable',
    photos: []
  },
  {
    id: 'item-2',
    ndc: '00069-5420-66',
    drugName: 'Lipitor 40mg Tablets',
    manufacturer: 'Pfizer',
    lotNumber: 'CD67890',
    expirationDate: '2025-08-15',
    quantity: 90,
    unit: 'tablets',
    reason: 'Overstocked',
    estimatedCredit: 380.50,
    classification: 'returnable',
    photos: []
  },
  {
    id: 'item-3',
    ndc: '00173-0830-00',
    drugName: 'Amoxicillin 500mg Capsules',
    manufacturer: 'GlaxoSmithKline',
    lotNumber: 'EF24680',
    expirationDate: '2024-12-01',
    quantity: 50,
    unit: 'capsules',
    reason: 'Short dated',
    estimatedCredit: 125.00,
    classification: 'returnable',
    photos: []
  }
]

export const mockReturns: Return[] = [
  {
    id: 'RET-2024-001',
    clientId: 'client-1',
    clientName: 'HealthCare Pharmacy',
    createdAt: '2024-03-15T09:30:00Z',
    updatedAt: '2024-03-15T14:20:00Z',
    status: 'in_transit',
    items: [mockReturnItems[0], mockReturnItems[1]],
    totalEstimatedCredit: 830.50,
    shipmentId: 'SHIP-001',
    notes: 'Standard return - overstocked items'
  },
  {
    id: 'RET-2024-002',
    clientId: 'client-1',
    clientName: 'HealthCare Pharmacy',
    createdAt: '2024-03-10T11:00:00Z',
    updatedAt: '2024-03-14T16:45:00Z',
    status: 'completed',
    items: [mockReturnItems[2]],
    totalEstimatedCredit: 125.00,
    shipmentId: 'SHIP-002',
    notes: 'Short dated item'
  },
  {
    id: 'RET-2024-003',
    clientId: 'client-2',
    clientName: 'MediCare Center',
    createdAt: '2024-03-20T08:15:00Z',
    updatedAt: '2024-03-20T08:15:00Z',
    status: 'draft',
    items: [mockReturnItems[0]],
    totalEstimatedCredit: 450.00,
    notes: ''
  },
  {
    id: 'RET-2024-004',
    clientId: 'client-1',
    clientName: 'HealthCare Pharmacy',
    createdAt: '2024-03-18T10:00:00Z',
    updatedAt: '2024-03-19T09:30:00Z',
    status: 'ready_to_ship',
    items: [mockReturnItems[1], mockReturnItems[2]],
    totalEstimatedCredit: 505.50,
    notes: 'Ready for pickup'
  },
  {
    id: 'RET-2024-005',
    clientId: 'client-2',
    clientName: 'MediCare Center',
    createdAt: '2024-03-12T13:20:00Z',
    updatedAt: '2024-03-16T11:00:00Z',
    status: 'processing',
    items: [mockReturnItems[0], mockReturnItems[1], mockReturnItems[2]],
    totalEstimatedCredit: 955.50,
    shipmentId: 'SHIP-003'
  }
]
