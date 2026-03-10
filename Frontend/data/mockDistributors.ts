import type { ReverseDistributor } from '@/types'

export const mockDistributors: ReverseDistributor[] = [
  {
    id: '1',
    name: 'ABC Reverse Distributors',
    code: 'ABC',
    contactEmail: 'support@abcreverse.com',
    contactPhone: '(555) 123-4567',
    address: {
      street: '123 Pharma Way',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
    },
    portalUrl: 'https://portal.abcreverse.com',
    supportedFormats: ['PDF', 'CSV'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'XYZ Pharmaceutical Returns',
    code: 'XYZ',
    contactEmail: 'info@xyzpharma.com',
    contactPhone: '(555) 234-5678',
    address: {
      street: '456 Medical Blvd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
    },
    portalUrl: 'https://portal.xyzpharma.com',
    supportedFormats: ['PDF'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'MedReturn Solutions',
    code: 'MRS',
    contactEmail: 'contact@medreturn.com',
    contactPhone: '(555) 345-6789',
    address: {
      street: '789 Healthcare Ave',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
    },
    portalUrl: 'https://portal.medreturn.com',
    supportedFormats: ['PDF', 'Excel'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'PharmaCollect Inc',
    code: 'PCI',
    contactEmail: 'support@pharmacollect.com',
    contactPhone: '(555) 456-7890',
    address: {
      street: '321 Distribution Dr',
      city: 'Atlanta',
      state: 'GA',
      zipCode: '30301',
    },
    portalUrl: 'https://portal.pharmacollect.com',
    supportedFormats: ['PDF'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'ReturnRx Services',
    code: 'RRS',
    contactEmail: 'info@returnrx.com',
    contactPhone: '(555) 567-8901',
    address: {
      street: '654 Pharmacy St',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
    },
    portalUrl: 'https://portal.returnrx.com',
    supportedFormats: ['PDF', 'CSV', 'Excel'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
]

// Helper function for backward compatibility with old pages
export function getDistributorById(id: string): ReverseDistributor | undefined {
  return mockDistributors.find(dist => dist.id === id);
}
