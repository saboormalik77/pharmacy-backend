# Redux Toolkit Guide for PharmAdmin

## Overview

The application uses **Redux Toolkit** for state management and API calls. All API interactions are handled through Redux async thunks.

## Project Structure

```
lib/
├── store/
│   ├── store.ts          # Redux store configuration
│   ├── hooks.ts          # Typed Redux hooks
│   ├── authSlice.ts      # Authentication slice
│   └── exampleSlice.ts   # Example slice template
├── api/
│   └── apiClient.ts      # API client utility
└── types/
    └── auth.ts           # TypeScript types
```

## Key Files

### 1. Store Configuration (`lib/store/store.ts`)
- Configures the Redux store
- Combines all reducers
- Exports typed store, state, and dispatch types

### 2. Typed Hooks (`lib/store/hooks.ts`)
- `useAppDispatch` - Typed dispatch hook
- `useAppSelector` - Typed selector hook
- `useAppStore` - Typed store hook

### 3. API Client (`lib/api/apiClient.ts`)
- Centralized HTTP client
- Automatically includes auth token in headers
- Handles errors consistently
- Supports GET, POST, PUT, PATCH, DELETE

### 4. Auth Slice (`lib/store/authSlice.ts`)
- Manages authentication state
- `loginUser` - Async thunk for login
- `logoutUser` - Async thunk for logout
- `checkAuthStatus` - Check stored auth

## Usage Examples

### Using Auth in Components

```typescript
'use client';

import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { loginUser, logoutUser } from '@/lib/store/authSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth
  );

  const handleLogin = async () => {
    const result = await dispatch(
      loginUser({ email: 'user@example.com', password: 'password' })
    );
    
    if (loginUser.fulfilled.match(result)) {
      // Login successful
      console.log('Logged in:', result.payload);
    } else {
      // Login failed
      console.error('Login error:', result.payload);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### Creating a New Slice

1. **Create the slice file** (e.g., `lib/store/pharmaciesSlice.ts`):

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api/apiClient';

// Async thunk
export const fetchPharmacies = createAsyncThunk(
  'pharmacies/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.get('/pharmacies');
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pharmacies');
    }
  }
);

// Slice
const pharmaciesSlice = createSlice({
  name: 'pharmacies',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPharmacies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPharmacies.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchPharmacies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default pharmaciesSlice.reducer;
```

2. **Add to store** (`lib/store/store.ts`):

```typescript
import pharmaciesReducer from './pharmaciesSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      pharmacies: pharmaciesReducer, // Add here
    },
  });
};
```

3. **Use in components**:

```typescript
const dispatch = useAppDispatch();
const { items, isLoading, error } = useAppSelector((state) => state.pharmacies);

useEffect(() => {
  dispatch(fetchPharmacies());
}, [dispatch]);
```

## API Client Usage

The `apiClient` automatically includes the auth token in headers:

```typescript
import { apiClient } from '@/lib/api/apiClient';

// GET request (with auth)
const data = await apiClient.get('/pharmacies');

// POST request (with auth)
const newItem = await apiClient.post('/pharmacies', { name: 'New Pharmacy' });

// PUT request (with auth)
const updated = await apiClient.put('/pharmacies/123', { name: 'Updated' });

// DELETE request (with auth)
await apiClient.delete('/pharmacies/123');

// Request without auth (e.g., login)
const loginData = await apiClient.post('/auth/login', credentials, false);
```

## Best Practices

1. **Always use typed hooks**: Use `useAppDispatch` and `useAppSelector` instead of plain Redux hooks
2. **Handle loading states**: Check `isLoading` before rendering data
3. **Handle errors**: Display error messages from the Redux state
4. **Use async thunks**: All API calls should be async thunks in slices
5. **Type everything**: Use TypeScript types for all state and actions
6. **Centralize API calls**: Use `apiClient` for all HTTP requests

## Route Protection

The `ProtectedRoute` component automatically handles authentication redirects:

- Unauthenticated users → Redirected to `/login`
- Authenticated users on `/login` → Redirected to `/`

This is handled in `components/auth/ProtectedRoute.tsx` using Redux state.

## Environment Variables

Make sure your `.env.local` file has:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

The API client uses this for all requests.

