# 🚀 NDC Search - Deployment Guide

## Overview

This guide walks through deploying the instant NDC search feature for both backend and React Native app.

---

## ✅ What Was Created

### Backend (pharmacy-backend)

| File | Description |
|------|-------------|
| `scripts/rpcFunctions/ndc_pricing_index_functions.sql` | SQL schema, indexes, RPC functions, and triggers |
| `src/services/ndcSearchService.ts` | Service layer with server-side caching |
| `src/controllers/ndcSearchController.ts` | API request handlers |
| `src/routes/ndcSearchRoutes.ts` | Route definitions with Swagger docs |
| `src/server.ts` | Updated to register new routes |

### React Native (pharma-collect-mobile)

| File | Description |
|------|-------------|
| `src/store/ndcCacheStore.ts` | Local cache with in-memory HashMap |
| `src/hooks/useNDCSearch.ts` | Optimized search hook |
| `src/api/services/ndcSearchService.ts` | API client for NDC search |
| `src/screens/InstantSearchScreen.tsx` | New instant search screen |

---

## 📋 Deployment Steps

### Step 1: Deploy Database Schema (Supabase)

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of:
   ```
   scripts/rpcFunctions/ndc_pricing_index_functions.sql
   ```
4. Click **Run** to execute

This will:
- Create `ndc_pricing_index` table
- Create optimized indexes (including trigram for fuzzy search)
- Create `search_ndc_pricing` RPC function
- Create `get_ndc_pricing_index` RPC function
- Set up auto-update trigger on `return_reports`
- Populate initial data from existing `return_reports`

### Step 2: Deploy Backend API

```bash
cd ~/2bvt/pharmacy-backend

# Install dependencies (if any new ones)
npm install

# Build
npm run build

# Deploy to Vercel (or your hosting)
vercel --prod

# Or if using npm script
npm run deploy
```

### Step 3: Test Backend API

```bash
# Test search endpoint
curl "https://pharmacy-backend-dusky.vercel.app/api/ndc-search?q=60219" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test index endpoint
curl "https://pharmacy-backend-dusky.vercel.app/api/ndc-search/index?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4: Update React Native App

```bash
cd ~/2bvt/pharma-collect-mobile

# No new packages needed - using existing AsyncStorage

# Build for Android
npm run android

# Or build APK
cd android && ./gradlew assembleRelease
```

---

## 🔌 New API Endpoints

### 1. Search NDCs (Fast)

```
GET /api/ndc-search?q=<search_term>&limit=50
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "ndc": "60219-1748-02",
        "ndcNormalized": "60219174802",
        "productName": "ACETAMINOPHEN 500MG TAB",
        "distributors": [
          {
            "id": "uuid",
            "name": "ABC Distributors",
            "fullPrice": 12.50,
            "partialPrice": 6.25,
            "email": "contact@abc.com"
          }
        ],
        "bestFullPrice": 12.50,
        "bestPartialPrice": 6.25
      }
    ],
    "count": 1,
    "searchTerm": "60219"
  }
}
```

### 2. Get NDC Index (For Client Caching)

```
GET /api/ndc-search/index?limit=10000&offset=0
```

### 3. Cache Stats

```
GET /api/ndc-search/cache-stats
```

### 4. Clear Cache

```
POST /api/ndc-search/clear-cache
```

---

## 📱 Using in React Native

### Option 1: Use the New InstantSearchScreen

```typescript
// In your navigator
import { InstantSearchScreen } from './screens';

<Stack.Screen 
  name="InstantSearch" 
  component={InstantSearchScreen} 
/>
```

### Option 2: Use the Hook in Existing Screens

```typescript
import { useNDCSearch } from '../hooks/useNDCSearch';

function MyScreen() {
  const { 
    results, 
    isLoading, 
    search, 
    isFromCache 
  } = useNDCSearch();

  return (
    <TextInput
      onChangeText={(text) => search(text)}
      placeholder="Search NDC..."
    />
    
    {results.map(item => (
      <View key={item.ndcNormalized}>
        <Text>{item.ndc}</Text>
        <Text>{item.productName}</Text>
        <Text>${item.bestFullPrice}</Text>
      </View>
    ))}
  );
}
```

### Option 3: Direct Cache Access

```typescript
import { 
  searchNDCLocal, 
  initializeNDCCache,
  getCacheStats 
} from '../store/ndcCacheStore';

// Initialize on app start
await initializeNDCCache();

// Search locally (instant)
const results = searchNDCLocal('60219');

// Check stats
const stats = getCacheStats();
console.log(`${stats.uniqueNdcs} NDCs cached`);
```

---

## ⚡ Performance Expectations

| Scenario | Before | After |
|----------|--------|-------|
| First search (cold) | 2-5 seconds | 100-300ms |
| Subsequent searches | 2-5 seconds | < 1ms (cached) |
| Cache hit rate | 0% | 80-95% |
| Memory usage | - | ~5-10MB |

---

## 🔄 How Caching Works

```
User Types "602"
      │
      ▼
┌─────────────────────────────────────┐
│ React Native: useNDCSearch Hook    │
│                                     │
│ 1. Check in-memory HashMap         │ ← < 1ms
│    ├── Found? Return immediately   │
│    └── Not found? Continue...      │
│                                     │
│ 2. Debounce (150ms)                │
│                                     │
│ 3. Call API                        │ ← ~100ms
│    └── Update local cache          │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Backend: ndcSearchService          │
│                                     │
│ 1. Check server cache              │ ← < 1ms
│    ├── Found? Return immediately   │
│    └── Not found? Continue...      │
│                                     │
│ 2. Call RPC function               │ ← ~10-50ms
│    └── Uses optimized indexes      │
│                                     │
│ 3. Cache result (5 min TTL)        │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ Database: ndc_pricing_index        │
│                                     │
│ - Pre-computed pricing data        │
│ - Trigram indexes for fuzzy match  │
│ - Auto-updated via trigger         │
└─────────────────────────────────────┘
```

---

## 🛠 Troubleshooting

### Issue: "RPC function not found"

**Solution:** Make sure you ran the SQL in Supabase:
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'search_ndc_pricing';
```

### Issue: No results in search

**Solution:** Check if index has data:
```sql
SELECT COUNT(*) FROM ndc_pricing_index;
```

If 0, run the population query from the SQL file.

### Issue: Cache not updating

The trigger auto-updates on new `return_reports`. To manually refresh:
```sql
-- Re-populate index
TRUNCATE ndc_pricing_index;
-- Then run the INSERT ... SELECT from the SQL file
```

### Issue: Slow on first app load

The cache syncs in background. First load may be slower. After initial sync, subsequent loads are instant.

---

## 📊 Monitoring

### Check Server Cache Stats

```bash
curl "https://pharmacy-backend-dusky.vercel.app/api/ndc-search/cache-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Database Stats

```sql
-- Total records in index
SELECT COUNT(*) as total,
       COUNT(DISTINCT ndc_normalized) as unique_ndcs,
       COUNT(DISTINCT distributor_id) as unique_distributors
FROM ndc_pricing_index;

-- Most searched NDCs (add logging to track)
```

---

## 🎉 Done!

The instant NDC search feature is now deployed. Users will experience:

- ⚡ **Instant results** as they type
- 📦 **Local caching** for offline-capable search
- 🔄 **Background sync** keeps data fresh
- 💰 **Best price comparison** across distributors

No changes were made to existing APIs - this is all new functionality!

