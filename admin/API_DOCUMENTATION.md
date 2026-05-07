# API Documentation for PharmAdmin

## Redux Toolkit Setup

The application now uses **Redux Toolkit** for all API calls and state management. All API interactions are handled through Redux async thunks.

## Login Endpoint

### Request Details

**Endpoint:** `POST /api/auth/login`

**Full URL:** `http://localhost:3000/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Payload:**
```json
{
  "email": "admin@pharmadmin.com",
  "password": "your_password_here"
}
```

### Expected Response

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_here",
    "email": "admin@pharmadmin.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Alternative Response Formats (also supported):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_here",
    "email": "admin@pharmadmin.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Error Response (401 Unauthorized or 400 Bad Request):**
```json
{
  "message": "Invalid credentials"
}
```

### Response Field Mapping

The frontend will look for the token in the following order:
1. `token`
2. `accessToken`
3. `access_token`

The frontend will look for user data in the following order:
1. `user` object (if present, uses it directly)
2. Falls back to individual fields: `id` or `userId`, `email`, `name` or `username`, `role`

### Redux Implementation

The login is handled by the `loginUser` async thunk in `lib/store/authSlice.ts`:

```typescript
import { useAppDispatch } from '@/lib/store/hooks';
import { loginUser } from '@/lib/store/authSlice';

const dispatch = useAppDispatch();
const result = await dispatch(loginUser({ email, password }));
```

### Notes

- The token will be stored in `localStorage` as `auth_token`
- User data will be stored in `localStorage` as `auth_user` (JSON stringified)
- After successful login, the user will be redirected to the home page (`/`)
- If login fails, an error message will be displayed to the user
- The app will automatically redirect to `/login` if the user is not authenticated
- All API calls use the `apiClient` utility which automatically includes the auth token in headers

## Creating New API Calls

To create new API calls using Redux Toolkit:

1. **Create a new slice** (see `lib/store/exampleSlice.ts` for template)
2. **Add async thunks** using `createAsyncThunk`
3. **Use the `apiClient`** utility for making HTTP requests
4. **Add the reducer** to the store in `lib/store/store.ts`
5. **Use hooks** in components: `useAppDispatch` and `useAppSelector`

### Example Usage in Components

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchPharmacies } from '@/lib/store/pharmaciesSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { items, isLoading, error } = useAppSelector((state) => state.pharmacies);

  useEffect(() => {
    dispatch(fetchPharmacies());
  }, [dispatch]);

  // ... rest of component
}
```

