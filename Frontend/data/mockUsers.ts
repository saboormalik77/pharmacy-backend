import { User } from '@/types'

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'john@healthcarepharmacy.com',
    name: 'John Smith',
    role: 'pharmacy_admin',
    pharmacyId: 'client-1'
  },
  {
    id: 'user-2',
    email: 'sarah@medicare.com',
    name: 'Sarah Johnson',
    role: 'pharmacy_admin',
    pharmacyId: 'client-2'
  },
  {
    id: 'user-3',
    email: 'admin@reversedist.com',
    name: 'Admin User',
    role: 'admin'
  }
]

// For demo purposes - credentials for login
export const mockCredentials = {
  'john@healthcarepharmacy.com': 'password123',
  'sarah@medicare.com': 'password123',
  'admin@reversedist.com': 'admin123'
}
