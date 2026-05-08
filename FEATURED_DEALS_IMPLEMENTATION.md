# Featured Deals - Implementation Summary

## ✅ Implementation Complete

Featured Deals (Day, Week, Month) have been implemented with a **unified API** that uses a `type` parameter to specify which featured deal to get/set.

---

## 🎯 How It Works

The existing Deal of the Day API now supports three types via the `type` parameter:
- **day** - Deal of the Day (default)
- **week** - Deal of the Week  
- **month** - Deal of the Month

### Selection Logic

| Type | Manual Selection | Automatic Selection |
|------|------------------|---------------------|
| **day** | Admin sets `is_deal_of_the_day = TRUE` | Best savings % deal |
| **week** | Admin sets `is_deal_of_the_week = TRUE` | Best savings % (excluding Day deal) |
| **month** | Admin sets `is_deal_of_the_month = TRUE` | Highest total savings potential (excluding Day & Week) |

---

## 📋 SQL Scripts to Run

Run these in **Supabase SQL Editor** in order:

1. **`scripts/add_deal_of_the_day.sql`** (if not already run)
   - Adds `is_deal_of_the_day` and `deal_of_the_day_until` columns

2. **`scripts/add_deal_of_week_and_month.sql`**
   - Adds columns for Week and Month deals:
     - `is_deal_of_the_week`, `deal_of_the_week_until`
     - `is_deal_of_the_month`, `deal_of_the_month_until`

3. **`scripts/rpcFunctions/featured_deal_functions.sql`**
   - Creates unified RPC functions with `type` parameter

---

## 🔌 API Endpoints

### Admin Endpoints

#### Set Featured Deal
```
POST /api/admin/marketplace/deals/:id/set-deal-of-the-day
Body: {
  "type": "day" | "week" | "month",  // default: "day"
  "expiresAt": "2024-12-31T23:59:59Z"  // optional
}
```

#### Get Featured Deal Info
```
GET /api/admin/marketplace/deal-of-the-day?type=day|week|month
```

#### Unset Featured Deal
```
DELETE /api/admin/marketplace/deal-of-the-day?type=day|week|month
```

#### Get All Featured Deals
```
GET /api/admin/marketplace/featured-deals
```
Returns all three featured deals (day, week, month) in one request.

### Pharmacy (Frontend) Endpoints

#### Get Featured Deal
```
GET /api/marketplace/deal-of-the-day?type=day|week|month
```

#### Get All Featured Deals
```
GET /api/marketplace/featured-deals
```
Returns:
```json
{
  "status": "success",
  "data": {
    "dealOfTheDay": { ... },
    "dealOfTheWeek": { ... },
    "dealOfTheMonth": { ... }
  }
}
```

---

## 📊 Database Schema

### Columns in `marketplace_deals`:

```sql
-- Deal of the Day (already exists)
is_deal_of_the_day BOOLEAN DEFAULT FALSE
deal_of_the_day_until TIMESTAMP WITH TIME ZONE NULL

-- Deal of the Week (new)
is_deal_of_the_week BOOLEAN DEFAULT FALSE
deal_of_the_week_until TIMESTAMP WITH TIME ZONE NULL

-- Deal of the Month (new)
is_deal_of_the_month BOOLEAN DEFAULT FALSE
deal_of_the_month_until TIMESTAMP WITH TIME ZONE NULL
```

### Constraints:
- Only **one deal** can be featured for each type at a time
- Enforced by unique partial indexes
- A deal CAN be featured as Day, Week, AND Month simultaneously

---

## 💡 Usage Examples

### Admin: Set Deal of the Day
```bash
POST /api/admin/marketplace/deals/{dealId}/set-deal-of-the-day
{
  "type": "day"
}
```

### Admin: Set Deal of the Week
```bash
POST /api/admin/marketplace/deals/{dealId}/set-deal-of-the-day
{
  "type": "week",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Admin: Set Deal of the Month
```bash
POST /api/admin/marketplace/deals/{dealId}/set-deal-of-the-day
{
  "type": "month"
}
```

### Admin: Get Deal of the Week Info
```bash
GET /api/admin/marketplace/deal-of-the-day?type=week
```

### Admin: Unset Deal of the Month
```bash
DELETE /api/admin/marketplace/deal-of-the-day?type=month
```

### Pharmacy: Get Deal of the Week
```bash
GET /api/marketplace/deal-of-the-day?type=week
```

### Pharmacy: Get All Featured Deals
```bash
GET /api/marketplace/featured-deals
```

---

## 🔄 Response Format

### Single Featured Deal Response

```json
{
  "status": "success",
  "data": {
    "deal": {
      "id": "...",
      "productName": "Metformin 500mg",
      "isFeaturedDeal": true,
      "featuredDealType": "week",
      "selectionType": "manual" | "automatic",
      "featuredUntil": "2024-12-31T23:59:59Z",
      "savings": 25,
      // ... other deal fields
    },
    "type": "week"
  }
}
```

### All Featured Deals Response

```json
{
  "status": "success",
  "data": {
    "dealOfTheDay": { ... },
    "dealOfTheWeek": { ... },
    "dealOfTheMonth": { ... }
  }
}
```

---

## ✅ Files Modified/Created

### New Files:
- ✅ `scripts/add_deal_of_week_and_month.sql` - Database migration
- ✅ `scripts/rpcFunctions/featured_deal_functions.sql` - Unified RPC functions

### Modified Files:
- ✅ `src/services/adminMarketplaceService.ts` - Unified with type parameter
- ✅ `src/controllers/adminMarketplaceController.ts` - Unified handlers
- ✅ `src/routes/adminMarketplaceRoutes.ts` - Updated swagger docs
- ✅ `src/services/pharmacyMarketplaceService.ts` - Unified with type parameter
- ✅ `src/controllers/pharmacyMarketplaceController.ts` - Unified handlers
- ✅ `src/routes/pharmacyMarketplaceRoutes.ts` - Updated swagger docs

---

## 🚀 Next Steps

1. **Run SQL scripts** in Supabase (in order listed above)
2. **Test the API endpoints** using Swagger or Postman
3. **Admin can now set** Deal of the Day/Week/Month using a single API with type parameter
4. **Frontend can fetch** individual deals by type or all featured deals at once

The system is ready to use! 🎉

