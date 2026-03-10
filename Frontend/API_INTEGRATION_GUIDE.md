# API Integration Guide

This document describes the API integration structure for the pharma-collect-ui frontend application.

## Overview

All API calls are centralized through a well-structured service layer that handles authentication, error handling, and request/response transformation.

## Architecture

```
lib/api/
├── client.ts              # Base API client with auth & error handling
└── services/
    ├── index.ts           # Central export for all services
    ├── authService.ts     # Authentication (signup, signin, signout)
    ├── inventoryService.ts # Inventory management
    ├── returnsService.ts  # Returns management
    ├── productsService.ts # Product/NDC validation and search
    ├── creditsService.ts  # Credit estimation
    └── documentsService.ts # Document upload and management
```

## Base API Client

The `apiClient` in `lib/api/client.ts` provides:

- **Authentication**: Automatically includes JWT token from localStorage
- **Pharmacy ID**: Automatically adds `pharmacy_id` to requests
- **Error Handling**: Consistent error handling across all requests
- **Request Methods**: `get`, `post`, `patch`, `delete`, `upload`

### Configuration

Set the API base URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Services

### Authentication Service

```typescript
import { authService } from '@/lib/api/services';

// Sign up
await authService.signup({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe',
  pharmacyName: 'My Pharmacy',
  phone: '555-1234'
});

// Sign in
await authService.signin({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
authService.signout();

// Check authentication
if (authService.isAuthenticated()) {
  const user = authService.getCurrentUser();
}
```

### Inventory Service

```typescript
import { inventoryService } from '@/lib/api/services';

// Get all inventory items
const result = await inventoryService.getInventoryItems({
  status: 'active',
  search: 'aspirin',
  limit: 20,
  offset: 0
});

// Get inventory item by ID
const item = await inventoryService.getInventoryItemById('item-id');

// Create inventory item
const newItem = await inventoryService.createInventoryItem({
  ndc: '12345-6789-01',
  product_name: 'Aspirin',
  lot_number: 'LOT123',
  expiration_date: '2025-12-31',
  quantity: 100,
  location: 'Main Warehouse'
});

// Update inventory item
await inventoryService.updateInventoryItem('item-id', {
  quantity: 150
});

// Delete inventory item
await inventoryService.deleteInventoryItem('item-id');

// Get inventory metrics
const metrics = await inventoryService.getInventoryMetrics();
```

### Returns Service

```typescript
import { returnsService } from '@/lib/api/services';

// Get all returns
const result = await returnsService.getReturns({
  status: 'draft',
  limit: 20,
  offset: 0
});

// Get return by ID
const returnData = await returnsService.getReturnById('return-id');

// Create return
const newReturn = await returnsService.createReturn({
  items: [
    {
      ndc: '12345-6789-01',
      lot_number: 'LOT123',
      expiration_date: '2025-12-31',
      quantity: 10,
      unit: 'tablets'
    }
  ],
  notes: 'Optional notes'
});

// Update return
await returnsService.updateReturn('return-id', {
  status: 'ready_to_ship'
});

// Delete return
await returnsService.deleteReturn('return-id');
```

### Products Service

```typescript
import { productsService } from '@/lib/api/services';

// Validate NDC
const result = await productsService.validateNDC('12345-6789-01');
if (result.valid && result.product) {
  console.log(result.product);
}

// Search products
const products = await productsService.searchProducts('aspirin', 20);

// Create or update product
await productsService.createOrUpdateProduct({
  ndc: '12345-6789-01',
  product_name: 'Aspirin',
  manufacturer: 'Bayer',
  wac: 10.50
});
```

### Credits Service

```typescript
import { creditsService } from '@/lib/api/services';

// Estimate credits
const estimate = await creditsService.estimateCredits([
  {
    ndc: '12345-6789-01',
    lot_number: 'LOT123',
    expiration_date: '2025-12-31',
    quantity: 10
  }
]);
```

### Documents Service

```typescript
import { documentsService } from '@/lib/api/services';

// Get all documents
const result = await documentsService.getDocuments({
  status: 'completed',
  search: 'invoice',
  limit: 20,
  offset: 0
});

// Get document by ID
const document = await documentsService.getDocumentById('doc-id');

// Upload document
const uploadedDoc = await documentsService.uploadDocument(
  file,
  'distributor-id' // optional
);

// Delete document
await documentsService.deleteDocument('doc-id');
```

## Error Handling

All services throw errors that should be caught:

```typescript
try {
  const result = await inventoryService.getInventoryItems();
} catch (error: any) {
  console.error('Error:', error.message);
  // error.status contains HTTP status code
  // error.message contains error message
}
```

## Authentication Flow

1. User signs in/signs up via `authService`
2. Token and user data are stored in `localStorage` under key `'user'`
3. All subsequent API calls automatically include the token in the `Authorization` header
4. The `pharmacy_id` is automatically extracted from the stored user data and added to requests

## Response Format

All API responses follow this format:

```typescript
{
  status: 'success' | 'error',
  data?: T,
  message?: string,
  total?: number // for paginated responses
}
```

## Updated Pages

The following pages have been updated to use the new API services:

- ✅ `/login` - Uses `authService.signin()`
- ✅ `/register` - Uses `authService.signup()`
- ✅ `/inventory` - Uses `inventoryService` and `productsService`
- ✅ `/returns` - Uses `returnsService`
- ✅ `/marketplace/create` - Uses `productsService.validateNDC()`
- ✅ `/upload` - Uses `documentsService.uploadDocument()`
- ✅ `/documents` - Uses `documentsService.getDocuments()`

## Next Steps

1. **Environment Setup**: Create `.env.local` with `NEXT_PUBLIC_API_URL`
2. **Backend Running**: Ensure backend is running on `http://localhost:3000`
3. **Test Authentication**: Sign up or sign in to get a token
4. **Test API Calls**: Verify each service works with your backend

## Notes

- The API client automatically handles authentication tokens
- Pharmacy ID is automatically included in requests
- Error handling is consistent across all services
- Response data is transformed to match frontend types where needed

