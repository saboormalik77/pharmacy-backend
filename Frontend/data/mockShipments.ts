import { Shipment } from '@/types'

export const mockShipments: Shipment[] = [
  {
    id: 'SHIP-001',
    returnId: 'RET-2024-001',
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    serviceLevel: 'Ground',
    status: 'in_transit',
    createdAt: '2024-03-15T14:20:00Z',
    estimatedDelivery: '2024-03-19T17:00:00Z',
    events: [
      {
        timestamp: '2024-03-17T10:30:00Z',
        location: 'Philadelphia, PA',
        status: 'In Transit',
        description: 'Package is on the way'
      },
      {
        timestamp: '2024-03-16T08:15:00Z',
        location: 'Boston, MA',
        status: 'Departed',
        description: 'Departed from facility'
      },
      {
        timestamp: '2024-03-15T14:20:00Z',
        location: 'Boston, MA',
        status: 'Picked Up',
        description: 'Package picked up by carrier'
      }
    ]
  },
  {
    id: 'SHIP-002',
    returnId: 'RET-2024-002',
    trackingNumber: '1Z999AA10123456790',
    carrier: 'UPS',
    serviceLevel: 'Ground',
    status: 'delivered',
    createdAt: '2024-03-10T12:00:00Z',
    estimatedDelivery: '2024-03-14T17:00:00Z',
    actualDelivery: '2024-03-14T16:45:00Z',
    events: [
      {
        timestamp: '2024-03-14T16:45:00Z',
        location: 'Distribution Center',
        status: 'Delivered',
        description: 'Package delivered to distribution center'
      },
      {
        timestamp: '2024-03-13T11:20:00Z',
        location: 'Newark, NJ',
        status: 'In Transit',
        description: 'Package is on the way'
      },
      {
        timestamp: '2024-03-10T12:00:00Z',
        location: 'Boston, MA',
        status: 'Picked Up',
        description: 'Package picked up by carrier'
      }
    ]
  },
  {
    id: 'SHIP-003',
    returnId: 'RET-2024-005',
    trackingNumber: '794612345678',
    carrier: 'FedEx',
    serviceLevel: 'Express',
    status: 'delivered',
    createdAt: '2024-03-12T15:00:00Z',
    estimatedDelivery: '2024-03-15T10:30:00Z',
    actualDelivery: '2024-03-15T09:15:00Z',
    events: [
      {
        timestamp: '2024-03-15T09:15:00Z',
        location: 'Distribution Center',
        status: 'Delivered',
        description: 'Package delivered and signed for'
      },
      {
        timestamp: '2024-03-14T14:00:00Z',
        location: 'Memphis, TN',
        status: 'In Transit',
        description: 'At FedEx sort facility'
      },
      {
        timestamp: '2024-03-12T15:00:00Z',
        location: 'New York, NY',
        status: 'Picked Up',
        description: 'Package picked up by FedEx'
      }
    ]
  }
]
