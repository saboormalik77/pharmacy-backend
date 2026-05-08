import { Credit } from '@/types'

export const mockCredits: Credit[] = [
  {
    id: 'CR-001',
    returnId: 'RET-2024-002',
    itemId: 'item-3',
    drugName: 'Amoxicillin 500mg Capsules',
    manufacturer: 'GlaxoSmithKline',
    expectedAmount: 125.00,
    actualAmount: 125.00,
    variance: 0,
    expectedPaymentDate: '2024-04-14T00:00:00Z',
    actualPaymentDate: '2024-04-14T10:30:00Z',
    status: 'received'
  },
  {
    id: 'CR-002',
    returnId: 'RET-2024-001',
    itemId: 'item-1',
    drugName: 'Prozac 20mg Capsules',
    manufacturer: 'Eli Lilly',
    expectedAmount: 450.00,
    expectedPaymentDate: '2024-04-19T00:00:00Z',
    status: 'expected'
  },
  {
    id: 'CR-003',
    returnId: 'RET-2024-001',
    itemId: 'item-2',
    drugName: 'Lipitor 40mg Tablets',
    manufacturer: 'Pfizer',
    expectedAmount: 380.50,
    expectedPaymentDate: '2024-04-22T00:00:00Z',
    status: 'expected'
  },
  {
    id: 'CR-004',
    returnId: 'RET-2024-005',
    itemId: 'item-1',
    drugName: 'Prozac 20mg Capsules',
    manufacturer: 'Eli Lilly',
    expectedAmount: 450.00,
    actualAmount: 430.00,
    variance: -20.00,
    expectedPaymentDate: '2024-04-10T00:00:00Z',
    actualPaymentDate: '2024-04-11T14:20:00Z',
    status: 'received'
  },
  {
    id: 'CR-005',
    returnId: 'RET-2024-005',
    itemId: 'item-2',
    drugName: 'Lipitor 40mg Tablets',
    manufacturer: 'Pfizer',
    expectedAmount: 380.50,
    expectedPaymentDate: '2024-03-20T00:00:00Z',
    status: 'overdue'
  }
]
