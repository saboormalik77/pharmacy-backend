import { Client } from '@/types'

export const mockClients: Client[] = [
  {
    id: 'client-1',
    pharmacyName: 'HealthCare Pharmacy',
    npiNumber: '1234567890',
    deaNumber: 'AB1234563',
    contactName: 'John Smith',
    contactEmail: 'john@healthcarepharmacy.com',
    contactPhone: '(555) 123-4567',
    physicalAddress: {
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101'
    },
    billingAddress: {
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101'
    },
    status: 'active',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'client-2',
    pharmacyName: 'MediCare Center',
    npiNumber: '9876543210',
    deaNumber: 'CD9876543',
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah@medicare.com',
    contactPhone: '(555) 987-6543',
    physicalAddress: {
      street: '456 Oak Avenue',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    billingAddress: {
      street: '456 Oak Avenue',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    status: 'active',
    subscriptionTier: 'basic',
    subscriptionStatus: 'active',
    createdAt: '2024-02-20T10:00:00Z'
  }
]
