# Pharmacy Backend Codebase Statistics

**Generated on:** May 14, 2026  
**Repository:** pharmacy-backend  
**Analysis Date:** 2026-05-14 7:47 PM (UTC+5)

## 📊 Executive Summary

| Category | Count |
|----------|-------|
| **Total API Endpoints** | **410** |
| **Total RPC Functions** | **383** |
| **Total Database Tables** | **57** |
| **Route Modules** | **63** |
| **Controller Modules** | **61** |

---

## 🔗 API Endpoints Breakdown

### Total API Endpoints: **410**

| HTTP Method | Count | Percentage |
|-------------|-------|------------|
| GET | 210 | 51.2% |
| POST | 130 | 31.7% |
| PATCH | 30 | 7.3% |
| DELETE | 29 | 7.1% |
| PUT | 11 | 2.7% |

### API Routes by Module (63 modules)

**Admin Routes (11 modules):**
- adminAnalyticsRoutes
- adminDashboardRoutes
- adminDistributorsRoutes
- adminDocumentsRoutes
- adminMarketplaceRoutes
- adminPaymentsRoutes
- adminPharmaciesRoutes
- adminRecentActivityRoutes
- adminServiceRequestRoutes
- adminSettingsRoutes
- adminUsersRoutes

**Pharmacy Routes (9 modules):**
- pharmacyAdminBrandingRoutes
- pharmacyAnalyticsRoutes
- pharmacyBranchRoutes
- pharmacyDestructionRoutes
- pharmacyMarketplaceRoutes
- pharmacyNotificationRoutes
- pharmacyPaymentRoutes
- pharmacyReportsRoutes
- pharmacyRoleRoutes
- pharmacyServiceRequestRoutes
- pharmacyWineCellarRoutes

**Core Business Logic Routes (43 modules):**
- authRoutes
- barcodeRoutes, barcodeScanRoutes
- batchRoutes
- creditsRoutes
- customPackagesRoutes
- dashboardRoutes
- debitMemoRoutes
- destructionRoutes
- distributorsRoutes
- documentsRoutes
- earningsEstimationRoutes
- emailManagementRoutes
- inventoryAnalysisRoutes, inventoryRoutes
- mainAdminRoutes
- ndcPricingBookRoutes, ndcSearchRoutes
- notificationRoutes
- optimizationRoutes
- policiesRoutes
- processorMyRoutes, processorNotificationRoutes, processorsRoutes
- productListsRoutes, productsRoutes
- raTrackingRoutes
- returnReportRoutes, returnsRoutes, returnTransactionItemsRoutes, returnTransactionRoutes
- reverseDistributorsAdminRoutes, reverseDistributorsRoutes
- settingsRoutes
- shipmentGroupRoutes, shipmentRoutes
- subscriptionRoutes
- warehouseManagementRoutes, warehouseRoutes
- wineCellarRoutes

---

## 🔧 RPC Functions Breakdown

### Total RPC Functions: **383**

| Function Type | Count | Description |
|---------------|-------|-------------|
| Get/List Functions | 99 | Data retrieval operations |
| Update Functions | 46 | Data modification operations |
| Create Functions | 15 | Data creation operations |
| Warehouse Functions | 13 | Warehouse-specific operations |
| Pharmacy Functions | 11 | Pharmacy-specific operations |
| Validate/Verify Functions | 9 | Validation and verification |
| Other Functions | 190 | Miscellaneous operations |

### Key RPC Function Categories:
- **CRUD Operations:** 160 functions (Create: 15, Read: 99, Update: 46)
- **Business Logic:** 223 functions (Warehouse: 13, Pharmacy: 11, Validation: 9, Others: 190)

---

## 🗄️ Database Tables Breakdown

### Total Database Tables: **57**

**Core Business Tables:**
1. **pharmacy** - Main pharmacy entities
2. **admin** - Administrative users
3. **return_transactions** - Return transaction management
4. **return_transaction_items** - Individual return items
5. **debit_memos** - Financial debit memos
6. **ndc_pricing** - National Drug Code pricing
7. **pharmacy_payments** - Payment processing
8. **marketplace_deals** - Marketplace transactions
9. **warehouse_discrepancies** - Warehouse management
10. **wine_cellar** - Specialized inventory management

**Complete Table List:**
```
admin, admin_recent_activity, admin_settings, batch_workflow_steps,
buying_group_domains, custom_package_items, custom_packages, 
debit_memo_items, debit_memos, destruction_records, email_logs,
inventory_reminders, main_admin, manufacturer_policies,
manufacturer_policy_notes, manufacturer_return_policies,
marketplace_deals, marketplace_order_items, marketplace_orders,
ndc_packages, ndc_price_history, ndc_pricing, ndc_pricing_index,
ndc_products, non_returnable_products, pharmacy,
pharmacy_branch_invites, pharmacy_branch_role_assignments,
pharmacy_cart, pharmacy_cart_items, pharmacy_inventory_items,
pharmacy_inventory_uploads, pharmacy_invites, pharmacy_notifications,
pharmacy_payments, pharmacy_permissions, pharmacy_role_permissions,
pharmacy_roles, processed_inbox_emails, processors,
processor_store_assignments, product_list_items, products,
ra_requests, refresh_tokens, return_batches, return_reports,
return_transaction_items, return_transactions, reverse_distributors,
shipment_groups, sub_main_admin, subscription_plans, subscriptions,
uploaded_documents, warehouse_discrepancies, warehouses,
warehouse_surplus_items, wine_cellar
```

---

## 🔄 Database Integration Analysis

### Controllers with Direct Database Calls

**Controllers using direct Supabase table calls (.from()):** 10 controllers
- adminPharmaciesController.ts
- pharmacyBranchController.ts
- barcodeController.ts
- raController.ts
- subscriptionController.ts
- shipmentGroupController.ts
- paymentTrackingController.ts
- settingsController.ts
- fedexController.ts
- pharmacyAdminBrandingController.ts

**Controllers using RPC functions (.rpc()):** 5 controllers
- adminPharmaciesController.ts
- pharmacyBranchController.ts
- authController.ts
- pharmacyRoleController.ts
- fedexController.ts

**Controllers making external API calls (axios/fetch):** 5 controllers
- adminPharmaciesController.ts
- pharmacyBranchController.ts
- returnTransactionItemsController.ts
- optimizationController.ts
- pharmacyAdminBrandingController.ts

**Total controllers using Supabase:** 14 controllers

---

## 📈 Architecture Analysis

### Data Access Patterns

1. **Direct Table Access:** 16.4% of controllers (10/61) use direct table calls
2. **RPC Function Usage:** 8.2% of controllers (5/61) use stored procedures
3. **External API Integration:** 8.2% of controllers (5/61) make external calls
4. **Supabase Integration:** 23% of controllers (14/61) use Supabase

### API Design Patterns

1. **RESTful Design:** Follows standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
2. **Modular Architecture:** 63 route modules organized by business domain
3. **Controller-Route Separation:** 61 controllers managing business logic
4. **Authentication Middleware:** Integrated auth across protected endpoints

### Database Design Patterns

1. **Normalized Schema:** 57 tables with proper relationships
2. **RPC Functions:** 383 stored procedures for complex business logic
3. **Row Level Security:** Implemented via Supabase policies
4. **Audit Trails:** Recent activity and logging tables

---

## 🏗️ Technology Stack Summary

- **Backend Framework:** Node.js with Express.js
- **Database:** PostgreSQL with Supabase
- **API Architecture:** RESTful APIs with 410 endpoints
- **Data Layer:** Mix of direct queries and RPC functions (383 total)
- **Authentication:** JWT with custom middleware
- **Type Safety:** TypeScript throughout the codebase

---

## 📝 Key Insights

1. **Large-scale Application:** 410 API endpoints serving diverse business needs
2. **Comprehensive Data Layer:** 383 RPC functions provide robust data operations  
3. **Well-structured Database:** 57 tables cover all business domains
4. **Modular Design:** Clear separation between admin, pharmacy, and core functionality
5. **Mixed Data Access:** Balanced approach between direct queries and stored procedures
6. **External Integrations:** Strategic use of external APIs for enhanced functionality

---

*This analysis was generated automatically by parsing the codebase structure and database schema. For detailed endpoint documentation, refer to the Swagger documentation available in the application.*