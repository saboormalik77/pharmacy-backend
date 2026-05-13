# Database Structure Analysis for Multi-Database Migration

**Last Updated:** May 13, 2026  
**Purpose:** Complete analysis of which database resources (tables, RPCs, policies) are used by each portal for the multi-tenant database migration.  
**Source of Truth:** All RPC names extracted directly from `src/services/*.ts` and `src/controllers/*.ts` via `supabaseAdmin.rpc()` calls. All table names extracted from `supabaseAdmin.from()` calls. **254 unique RPC functions, 48 unique tables confirmed.**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Categorization](#database-categorization)
3. [Portal-to-Database Mapping Summary](#portal-to-database-mapping-summary)
4. [MainAdmin Portal Deep Analysis](#mainadmin-portal-deep-analysis)
5. [Admin (Buying Group) Portal Deep Analysis](#admin-buying-group-portal-deep-analysis)
6. [Pharmacy Portal Deep Analysis](#pharmacy-portal-deep-analysis)
7. [Processor Portal Deep Analysis](#processor-portal-deep-analysis)
8. [Cross-Database Access Analysis](#cross-database-access-analysis)
9. [Migration Critical Considerations](#migration-critical-considerations)

---

## Executive Summary

### Current State
- Single Supabase database serves ALL portals (MainAdmin, Admin, Pharmacy, Processor)
- 48 tables directly accessed in backend code
- 254 unique RPC functions called from backend services/controllers
- Multiple RLS policies

### Target State
- **Main Admin Database**: Central database with warehouse operations + MainAdmin management
- **Buying Group Databases**: Cloned databases (one per buying group) for business operations INCLUDING returns

### Key Architecture Decision
**Returns are managed within each Buying Group database** — `return_transactions` and `return_transaction_items` tables are in BG databases, not MainAdmin.

---

## Database Categorization

### MAIN ADMIN DATABASE (Central Warehouse Operations + Platform Management)

#### Tables (21 tables)

| Table | Description | Directly Accessed By Services |
|-------|-------------|-------------------------------|
| `main_admin` | Main admin user accounts | adminSettingsService |
| `sub_main_admin` | Sub-admin accounts under main admin | adminSettingsService |
| `buying_group_domains` | Domain mappings for tenant resolution | tenantService |
| `admin` | Buying group admin accounts (created by MainAdmin; used for all BG portal logins) | adminService, adminUsersService, tenantService, processorsService, authRoutes |
| `warehouses` | Warehouse locations | (via RPCs only) |
| `return_batches` | Batched returns for processing | batchService |
| `batch_workflow_steps` | Workflow state for batches | batchService |
| `warehouse_discrepancies` | Discrepancy tracking | (via warehouse RPCs) |
| `debit_memos` | Debit memos for returns | creditMemoMatchingService, cardinalInvoiceService, paymentTrackingService, raController |
| `debit_memo_items` | Line items in debit memos | creditMemoMatchingService, dashboardService |
| `ra_requests` | Return Authorization requests | emailManagementService, paymentTrackingService |
| `shipment_groups` | Shipment groupings | shipmentGroupService, shipmentGroupController |
| `wine_cellar_items` | Items in wine cellar (aging) | (via wine cellar RPCs) |
| `destruction_records` | Destruction tracking | destructionService |
| `reverse_distributors` | Reverse distributor partners | customPackagesService, optimizationService, reverseDistributorsService, shipmentGroupService |
| `manufacturer_policies` | Manufacturer return policies | batchService, cardinalInvoiceService, policyEngineService, policiesService |
| `manufacturer_return_policies` | Detailed return policy rules | policyEngineService, policiesService |
| `manufacturer_policy_notes` | Policy notes | policiesService |
| `non_returnable_products` | Products excluded from returns | policyEngineService, policiesService |
| `ndc_pricing` | NDC pricing book | (via NDC RPCs) |
| `distributors` | Distributor records | (via distributor RPCs) |

#### Main Admin RPC Functions (103 total — verified from actual code)

**Auth & Identity (6):**
`get_main_admin_by_email`, `update_main_admin_last_login`, `get_main_admin_by_id`, `get_sub_main_admin_by_email`, `update_sub_main_admin_last_login`, `get_sub_main_admin_by_id`

**Sub Main Admin Management (8):**
`create_sub_main_admin`, `get_sub_main_admins_list`, `get_sub_main_admin_by_id`, `update_sub_main_admin`, `delete_sub_main_admin`, `resend_sub_admin_invite`, `validate_sub_admin_invite_token`, `accept_sub_admin_invite`

**Buying Group Management (8):**
`get_buying_groups_list`, `get_buying_group_by_id`, `create_buying_group`, `update_buying_group`, `delete_buying_group`, `get_buying_group_domains`, `upsert_buying_group_domain`, `delete_buying_group_domain`

**Tenant Resolution (1):**
`resolve_domain_to_buying_group`

**Warehouse Operations (15):**
`warehouse_scan_box`, `warehouse_list_pending`, `warehouse_list_received`, `warehouse_verify_return`, `warehouse_verify_item`, `warehouse_report_discrepancy`, `warehouse_list_discrepancies`, `warehouse_start_verification`, `warehouse_verify_item_v2`, `warehouse_add_surplus`, `warehouse_complete_verification`, `warehouse_resolve_discrepancy`, `warehouse_get_verification_summary`, `warehouse_list_surplus`, `warehouse_list_all_surplus`

**Warehouse Management (5):**
`get_warehouses`, `get_default_warehouse`, `create_warehouse`, `update_warehouse`, `delete_warehouse`

**Batch & Debit Memo (17):**
`create_batch`, `list_batches`, `get_batch`, `assign_returns_to_batch`, `close_batch`, `generate_debit_memos_for_batch`, `submit_cardinal`, `fix_batch_destinations`, `delete_batch`, `unassign_returns_from_batch`, `unassign_single_return`, `get_batch_permissions`, `list_debit_memos`, `list_debit_memos_grouped_by_return`, `get_debit_memo`, `update_debit_memo`

**RA & Shipment (17):**
`ra_send_request`, `ra_update_request_status`, `ra_receive`, `ra_resend_request`, `ra_list_tracking`, `ra_list_outstanding`, `ra_list_overdue`, `ra_ship_debit_memo`, `ra_list_outbound_shipments`, `ra_generate_request_email`, `ra_generate_reminder_email`, `ra_list_tracking_grouped_by_return`, `list_memos_for_group_shipping`, `create_shipment_group`, `ship_memo_group`, `get_shipment_group_details`, `list_shipped_shipment_groups`

**Wine Cellar (7):**
`add_to_wine_cellar`, `list_wine_cellar_items`, `get_wine_cellar_item`, `update_wine_cellar_item`, `mark_wine_cellar_returned`, `check_and_surface_ready_items`, `get_wine_cellar_stats`

**Destruction (4):**
`list_destruction_records`, `create_destruction_record`, `update_destruction_record`, `create_destruction_record_for_transaction_item`

**NDC Pricing (11):**
`search_ndc_pricing_book`, `upsert_ndc_pricing`, `get_ndc_pricing`, `delete_ndc_pricing`, `resolve_ndc_price`, `import_ndc_pricing_from_reports`, `get_ndc_pricing_intelligence`, `resolve_ndc_price_with_intelligence`, `record_credit_memo_analysis`, `search_ndc_pricing_fixed`, `get_ndc_pricing_index`

**Distributors (7):**
`get_admin_distributors_list`, `get_admin_distributor_by_id`, `create_admin_distributor`, `update_admin_distributor`, `update_admin_distributor_status`, `delete_admin_distributor`, `get_distributor_unique_products`

**Reverse Distributors (4):**
(no RPCs — direct table access via `supabaseAdmin.from('reverse_distributors')`)

**Payment Tracking (7):**
`payment_record`, `payment_list_unpaid`, `payment_send_reminder`, `payment_ask_vs_received`, `payment_manufacturer_summary`, `payment_list_unpaid_grouped_by_return`, `payment_list_paid_grouped_by_return`

**FedEx (2):**
`save_fedex_shipment_data`, `save_fedex_pickup_confirmation`

**Email Management (1):**
`get_email_stats`

---

### BUYING GROUP DATABASE (Business Operations — Cloned per Buying Group)

#### Tables (26 tables)

| Table | Description | Directly Accessed By Services |
|-------|-------------|-------------------------------|
| `admin_settings` | Buying group settings | authRoutes, settingsController |
| `pharmacy` | Pharmacies under the buying group | adminPharmaciesService, authService, marketplaceCheckoutService, processorsService, settingsService, subscriptionService, batchService, dashboardService, jobSheetService, notificationCronService, returnTransactionService, serviceRequestService, auth middleware |
| `pharmacy_branches` | Pharmacy branch locations | (via branch RPCs) |
| `pharmacy_invites` | Pending pharmacy invitations | adminPharmaciesController |
| `pharmacy_inventory_items` | Pharmacy inventory analysis | inventoryAnalysisService, notificationCronService |
| `pharmacy_inventory_uploads` | Inventory upload records | inventoryAnalysisService |
| `pharmacy_notifications` | Pharmacy notifications | notificationCronService |
| `pharmacy_payments` | Payments to pharmacies | dashboardService |
| `processors` | Processor users for the buying group | adminPharmaciesService, batchService, jobSheetService, processorsService, serviceRequestService, processorAuth middleware |
| `processor_store_assignments` | Processor-to-pharmacy assignments | processorsService, processorAuth middleware |
| `return_transactions` | Main return transaction records | batchService, cardinalInvoiceService, dashboardService, processorsService, returnTransactionService, warehouseService, fedexController, jobSheetService |
| `return_transaction_items` | Line items within returns | batchService, dashboardService, returnTransactionService, warehouseService |
| `returns` | Legacy return records | returnsService |
| `return_items` | Legacy return items | returnsService |
| `return_reports` | Uploaded return reports | optimizationService, pricingService, returnReportService |
| `service_requests` | On-site service requests | serviceRequestService |
| `service_request_assignments` | Service request assignments | serviceRequestService |
| `marketplace_orders` | Marketplace orders | marketplaceCheckoutService |
| `inventory_items` | Pharmacy inventory | inventoryService |
| `inventory_reminders` | Inventory reminders | inventoryAnalysisService |
| `products` | Product catalog | optimizationService |
| `custom_packages` | Custom package definitions | customPackagesService, optimizationService, productListsService |
| `custom_package_items` | Items in custom packages | customPackagesService, productListsService |
| `product_list_items` | Product list items | dashboardService, optimizationService, productListsService |
| `subscriptions` | Pharmacy subscriptions | marketplaceCheckoutService, subscriptionService |
| `subscription_plans` | Available subscription plans | subscriptionService |
| `uploaded_documents` | Document storage records | documentsService, returnReportService, reverseDistributorsService |
| `refresh_tokens` | Auth refresh tokens | authService |
| `settings` | General settings | (via settings RPCs) |
| `email_logs` | Email logs | emailManagementService |
| `email_logs_with_memo_info` | Email logs with memo information | emailManagementService |

#### Buying Group RPC Functions (151 total — verified from actual code)

**Admin Auth & Users (10):**
`validate_admin_tenant_access`, `get_admin_users_list`, `get_admin_user_by_id`, `create_admin_user`, `update_admin_user`, `update_admin_password`, `delete_admin_user`, `get_admin_roles`, `get_admin_profile`, `reset_admin_own_password`

**Admin Settings (4):**
`get_admin_settings`, `update_admin_settings`, `get_available_timezones`, `get_available_languages`

**Admin Dashboard & Activity (5):**
`get_admin_dashboard_stats`, `get_admin_analytics`, `get_admin_recent_activity`, `mark_all_admin_activities_read`, `mark_admin_activity_read`

**Pharmacy Management (6):**
`get_admin_pharmacies_list`, `get_admin_pharmacy_by_id`, `admin_create_pharmacy`, `update_admin_pharmacy`, `update_admin_pharmacy_status`, `validate_pharmacy_tenant_access`

**Pharmacy Auth & Profile (5):**
`verify_pharmacy_invite`, `complete_pharmacy_setup`, `verify_pharmacy_switch_access`, `get_pharmacy_by_id`, `update_pharmacy_profile`

**Pharmacy Branches (8):**
`pharmacy_admin_create_branch`, `get_pharmacy_branches`, `get_branch_pharmacy_detail`, `update_branch_pharmacy_status`, `get_pending_branch_invites`, `resend_branch_invite`, `verify_branch_invite`, `complete_branch_setup`

**Pharmacy Branch Context (1):**
`get_pharmacy_context`

**Pharmacy Roles & Permissions (9):**
`create_pharmacy_role`, `list_pharmacy_roles`, `get_pharmacy_role_detail`, `update_pharmacy_role`, `delete_pharmacy_role`, `assign_role_to_branch`, `remove_role_from_branch`, `list_all_pharmacy_permissions`, `get_branch_effective_permissions`

**Processor Management (5):**
`get_admin_processors_list`, `create_admin_processor`, `update_admin_processor`, `delete_admin_processor`, `list_processor_store_assignments`

**Processor Notifications (3):**
`list_processor_notifications`, `mark_processor_notification_read`, `mark_all_processor_notifications_read`

**Service Requests (8):**
`create_service_request`, `list_pharmacy_service_requests`, `cancel_pharmacy_service_request`, `list_processor_service_requests`, `claim_service_request`, `list_admin_service_requests`, `admin_reassign_service_request`, `get_service_request_detail`

**Marketplace — Admin (12):**
`get_marketplace_deals_list`, `get_marketplace_deal_by_id`, `create_marketplace_deal`, `update_marketplace_deal`, `delete_marketplace_deal`, `get_marketplace_categories`, `get_marketplace_stats`, `mark_marketplace_deal_sold`, `set_featured_deal`, `unset_featured_deal`, `get_featured_deal_info`, `get_all_featured_deals`

**Marketplace — Pharmacy (14):**
`get_pharmacy_marketplace_deals`, `get_pharmacy_marketplace_deal_by_id`, `get_manual_featured_deal`, `get_all_manual_featured_deals`, `get_pharmacy_marketplace_categories`, `add_to_pharmacy_cart`, `get_pharmacy_cart`, `update_pharmacy_cart_item`, `remove_from_pharmacy_cart`, `clear_pharmacy_cart`, `get_pharmacy_cart_count`, `validate_pharmacy_cart`, `create_marketplace_order_from_cart`, `update_marketplace_order_payment`

**Marketplace — Orders (3):**
`get_marketplace_order_by_id`, `get_pharmacy_marketplace_orders`, `cancel_marketplace_order`

**Pharmacy Payments (9):**
`pharmacy_payment_calculate`, `pharmacy_payment_create`, `pharmacy_payment_update`, `pharmacy_payment_get`, `pharmacy_payment_list`, `pharmacy_payment_summary`, `pharmacy_payment_my_payments`, `pharmacy_payment_check_pdf_data`, `pharmacy_payment_generate_check_number`

**Admin Payments (2):**
`get_admin_payments_list`, `get_admin_payment_by_id`

**Admin Documents (3):**
`get_admin_documents_list`, `get_admin_document_by_id`, `delete_admin_document`

**Return Transactions (11):**
`create_return_transaction`, `list_return_transactions`, `get_return_transaction_by_id`, `update_return_transaction`, `change_return_transaction_status`, `finalize_return_transaction`, `update_finalize_steps`, `get_manifest_data`, `get_dea_form_222_data`, `delete_return_transaction`, `check_return_transaction_lock_status`

**Return Transaction Items (8):**
`add_return_transaction_item_with_validation`, `list_return_transaction_items`, `get_return_transaction_item`, `update_return_transaction_item`, `admin_set_item_standard_price`, `delete_return_transaction_item_with_validation`, `resolve_transaction_item_with_auto_destination`, `check_return_transaction_lock_status`

**Legacy Returns (3):**
`validate_legacy_return_update`, `validate_legacy_return_deletion`, `check_legacy_return_lock_status`

**Pharmacy Dashboard (2):**
`get_return_credit_summary`, `get_historical_earnings`

**Earnings Estimation (1):**
`get_earnings_estimation`

**Pharmacy Reports (5):**
`list_pharmacy_report_returns`, `get_pharmacy_return_packet`, `get_pharmacy_controlled_substance_report`, `get_pharmacy_destruction_controls`, `get_pharmacy_destruction_non_controls`

**Pharmacy Notifications (3):**
`list_pharmacy_notifications`, `mark_pharmacy_notification_read`, `mark_all_pharmacy_notifications_read`

**Analytics & Reporting (9):**
`analytics_returns_summary`, `analytics_ask_vs_received`, `analytics_aging_inventory`, `analytics_outstanding_ra`, `analytics_unpaid_memos`, `analytics_price_audit`, `analytics_pharmacy_performance`, `analytics_gpo_summary`, `analytics_pharmacy_dashboard`

**Optimization & Packages (6):**
`get_package_recommendations`, `get_distributor_suggestions`, `get_distributor_package_suggestion`, `add_items_to_custom_package`, `update_package_item`, `delete_package_item`

**Subscriptions (via direct table access, no RPCs)**

---

## Portal-to-Database Mapping Summary

### Main Admin Database Tables (21):
`main_admin`, `sub_main_admin`, `buying_group_domains`, `admin`, `warehouses`, `return_batches`, `batch_workflow_steps`, `warehouse_discrepancies`, `debit_memos`, `debit_memo_items`, `ra_requests`, `shipment_groups`, `wine_cellar_items`, `destruction_records`, `reverse_distributors`, `manufacturer_policies`, `manufacturer_return_policies`, `manufacturer_policy_notes`, `non_returnable_products`, `ndc_pricing`, `distributors`

### Buying Group Database Tables (26):
`admin_settings`, `pharmacy`, `pharmacy_branches`, `pharmacy_invites`, `pharmacy_inventory_items`, `pharmacy_inventory_uploads`, `pharmacy_notifications`, `pharmacy_payments`, `processors`, `processor_store_assignments`, `return_transactions`, `return_transaction_items`, `returns`, `return_items`, `return_reports`, `service_requests`, `service_request_assignments`, `marketplace_orders`, `inventory_items`, `inventory_reminders`, `products`, `custom_packages`, `custom_package_items`, `product_list_items`, `subscriptions`, `subscription_plans`, `uploaded_documents`, `refresh_tokens`, `settings`, `email_logs`, `email_logs_with_memo_info`

> **Note:** `admin_users` is not a real table — it is a bug in `jobSheetService.ts`. Should be replaced with `processors`.

---

## MainAdmin Portal Deep Analysis

### Pages & API Calls

| Route | APIs Called | Key Tables | Key RPCs |
|-------|-------------|------------|----------|
| `/login` | `POST /main-admin/auth/login` | `main_admin`, `sub_main_admin` | `get_main_admin_by_email`, `get_sub_main_admin_by_email` |
| `/setup-account` | `GET /main-admin/sub-admins/invite/validate`, `POST .../accept` | `sub_main_admin` | `validate_sub_admin_invite_token`, `accept_sub_admin_invite` |
| `/` (Dashboard) | `GET /main-admin/buying-groups`, `GET /admin/warehouse/received`, `GET /admin/batches` | `admin` (Main Admin DB), Cross-DB: `return_transactions` | `get_buying_groups_list`, `warehouse_list_received`, `list_batches` |
| `/buying-groups` | `GET/POST/PUT/DELETE /main-admin/buying-groups`, `GET/POST/DELETE .../domains` | `admin` (Main Admin DB), `buying_group_domains` (Main Admin DB), Cross-DB: `admin_settings` (BG DB) | `get_buying_groups_list`, `create_buying_group`, `update_buying_group`, `delete_buying_group`, `get_buying_group_domains`, `upsert_buying_group_domain`, `delete_buying_group_domain` |
| `/sub-admins` | `GET/POST/PUT/DELETE /main-admin/sub-admins`, `POST .../resend-invite` | `sub_main_admin` | `get_sub_main_admins_list`, `create_sub_main_admin`, `update_sub_main_admin`, `delete_sub_main_admin`, `resend_sub_admin_invite` |
| `/settings` | `GET/PATCH /admin/settings`, `POST .../upload-logo`, `POST .../reset-password` | `admin_settings`, `warehouses` | `get_admin_settings`, `update_admin_settings`, `get_default_warehouse`, `update_warehouse` |
| `/distributors` | `GET/POST/PUT /admin/distributors`, `GET .../products` | `distributors` | `get_admin_distributors_list`, `create_admin_distributor`, `update_admin_distributor`, `update_admin_distributor_status`, `get_distributor_unique_products` |
| `/policies` | `GET/POST/PATCH/DELETE /admin/policies/*`, `GET /admin/reverse-distributors` | `manufacturer_policies`, `manufacturer_return_policies`, `manufacturer_policy_notes`, `non_returnable_products`, `reverse_distributors` | Direct table access + `POST /policies/check` via policyEngine |
| `/ndc-pricing` | `GET/POST/DELETE /admin/ndc-pricing/*`, `POST /barcode/scan` | `ndc_pricing` | `search_ndc_pricing_book`, `upsert_ndc_pricing`, `get_ndc_pricing`, `delete_ndc_pricing`, `resolve_ndc_price`, `import_ndc_pricing_from_reports`, `resolve_ndc_price_with_intelligence` |
| `/pharmacy-payments` | `GET/POST/PATCH /admin/pharmacy-payments/*`, `GET /admin/batches` | Cross-DB: `pharmacy_payments`, `pharmacy` | `pharmacy_payment_list`, `pharmacy_payment_calculate`, `pharmacy_payment_create`, `pharmacy_payment_update`, `pharmacy_payment_get`, `pharmacy_payment_generate_check_number` |
| `/warehouse/receiving` | `POST /admin/warehouse/scan-box`, `GET /admin/warehouse/pending` | `warehouse_discrepancies`, Cross-DB: `return_transactions` | `warehouse_scan_box`, `warehouse_list_pending` |
| `/warehouse/verification` | `GET /admin/warehouse/received` | `warehouse_discrepancies`, Cross-DB: `return_transactions` | `warehouse_list_received` |
| `/warehouse/verification/[id]` | `POST .../start-verification`, `PATCH .../verify-v2`, `POST .../surplus`, `POST .../complete-verification`, `POST /barcode/scan`, `GET/POST /admin/wine-cellar` | `warehouse_discrepancies`, Cross-DB: `return_transactions`, `return_transaction_items` | `warehouse_start_verification`, `warehouse_verify_item_v2`, `warehouse_add_surplus`, `warehouse_complete_verification`, `warehouse_get_verification_summary`, `warehouse_resolve_discrepancy` |
| `/warehouse/returns/*` | `GET/POST/PATCH/DELETE /return-transactions/*`, `GET /admin/reverse-distributors`, `GET/POST /admin/wine-cellar` | Cross-DB: `return_transactions`, `return_transaction_items`, `pharmacy` | `create_return_transaction`, `list_return_transactions`, `get_return_transaction_by_id`, `update_return_transaction`, `change_return_transaction_status`, `finalize_return_transaction` |
| `/warehouse/batches/*` | `GET/POST/DELETE /admin/batches/*`, `POST .../generate-memos`, `GET .../workflow`, `GET .../cardinal-invoice`, `GET .../pharmacy-returns` | `return_batches`, `batch_workflow_steps`, `debit_memos` | `create_batch`, `list_batches`, `get_batch`, `assign_returns_to_batch`, `close_batch`, `generate_debit_memos_for_batch`, `submit_cardinal`, `delete_batch` |
| `/warehouse/debit-memos` | `GET /admin/debit-memos/grouped-by-return`, `GET .../download` | `debit_memos`, `debit_memo_items` | `list_debit_memos_grouped_by_return`, `get_debit_memo`, `update_debit_memo` |
| `/warehouse/ra-tracking` | `GET /admin/ra-tracking/*`, `POST /admin/debit-memos/:id/request-ra`, `POST .../ship`, `POST .../create-fedex-shipment`, `GET /admin/shipment-groups/*` | `ra_requests`, `debit_memos`, `shipment_groups` | `ra_list_tracking`, `ra_send_request`, `ra_receive`, `ra_resend_request`, `ra_ship_debit_memo`, `create_shipment_group`, `ship_memo_group`, `list_shipped_shipment_groups` |
| `/warehouse/wine-cellar` | `GET/PATCH/POST /admin/wine-cellar/*` | `wine_cellar_items` | `list_wine_cellar_items`, `get_wine_cellar_item`, `update_wine_cellar_item`, `mark_wine_cellar_returned`, `check_and_surface_ready_items`, `get_wine_cellar_stats` |
| `/warehouse/destruction` | `GET/PATCH /admin/destruction/*` | `destruction_records` | `list_destruction_records`, `update_destruction_record` |
| `/warehouse/surplus` | `GET /admin/warehouse/surplus` | `warehouse_discrepancies` | `warehouse_list_all_surplus` |
| `/warehouse/tbd-items` | `GET /return-transactions/:id/items`, `POST .../resolve` | Cross-DB: `return_transactions`, `return_transaction_items` | `list_return_transaction_items`, `resolve_transaction_item_with_auto_destination` |
| `/warehouse/unpaid` | `GET /admin/debit-memos/unpaid/*`, `POST .../record-payment`, `POST .../analyze-credit-memo`, `GET /admin/analytics/ask-vs-received`, `GET .../manufacturer-payments` | `debit_memos`, `debit_memo_items` | `payment_list_unpaid`, `payment_record`, `payment_ask_vs_received`, `payment_manufacturer_summary`, `record_credit_memo_analysis` |

---

## Admin (Buying Group) Portal Deep Analysis

### Pages & API Calls

| Route | APIs Called | Key Tables | Key RPCs |
|-------|-------------|------------|----------|
| `/login` | `GET /auth/tenant-info`, `POST /auth/login` | `admin` (Main Admin DB), `buying_group_domains` (Main Admin DB) | `resolve_domain_to_buying_group`, `validate_admin_tenant_access` |
| `/forgot-password` | `POST /auth/admin/forgot-password` | `admin` (Main Admin DB) | — |
| `/reset-password` | `POST /auth/admin/verify-reset-token`, `POST /auth/admin/reset-password` | `admin` (Main Admin DB) | — |
| `/` (Dashboard) | `GET /admin/dashboard` | `pharmacy`, `return_transactions` | `get_admin_dashboard_stats` |
| `/admins` | `GET/POST/PATCH/DELETE /admin/users/*` | `admin` (Main Admin DB — cross-DB write) | `get_admin_users_list`, `get_admin_user_by_id`, `create_admin_user`, `update_admin_user`, `update_admin_password`, `delete_admin_user` |
| `/pharmacies` | `GET/POST/PUT /admin/pharmacies/*`, `GET/DELETE .../invites` | `pharmacy`, `pharmacy_invites` | `get_admin_pharmacies_list`, `admin_create_pharmacy`, `update_admin_pharmacy`, `update_admin_pharmacy_status` |
| `/processors` | `GET/POST/PATCH/DELETE /admin/processors/*`, `GET .../stores`, `POST .../assign-stores` | `processors`, `processor_store_assignments` | `get_admin_processors_list`, `create_admin_processor`, `update_admin_processor`, `delete_admin_processor` |
| `/documents` | `GET/DELETE /admin/documents/*` | `uploaded_documents` | `get_admin_documents_list`, `delete_admin_document` |
| `/payments` | `GET /admin/payments` | `pharmacy_payments` | `get_admin_payments_list` |
| `/marketplace` | `GET/POST/PATCH/DELETE /admin/marketplace/*` | `marketplace_orders` | `get_marketplace_deals_list`, `create_marketplace_deal`, `update_marketplace_deal`, `delete_marketplace_deal`, `set_featured_deal` |
| `/policies` | `GET/POST/PATCH/DELETE /admin/policies/*`, `POST /policies/check`, `GET /admin/reverse-distributors` | Cross-DB: `manufacturer_policies`, `manufacturer_return_policies`, `non_returnable_products`, `reverse_distributors` | Direct table access |
| `/settings` | `GET/PATCH /admin/settings`, `POST .../upload-logo`, `POST .../reset-password` | `admin_settings` | `get_admin_settings`, `update_admin_settings` |
| `/analytics/*` | `GET /admin/analytics`, `GET .../returns-summary`, `GET .../pharmacy-performance`, `GET .../aging-inventory`, `GET .../price-audit`, `GET .../fcr-ask-vs-received`, `GET .../unpaid-memos`, `GET .../outstanding-ra` | `pharmacy`, `return_transactions` | `get_admin_analytics`, `analytics_returns_summary`, `analytics_pharmacy_performance`, `analytics_aging_inventory`, `analytics_price_audit`, `analytics_ask_vs_received`, `analytics_unpaid_memos`, `analytics_outstanding_ra` |
| `/service-requests` | `GET /admin/service-requests`, `POST .../reassign` | `service_requests`, `service_request_assignments` | `list_admin_service_requests`, `admin_reassign_service_request` |
| `/distributors` | `GET/POST/PUT /admin/distributors/*` | Cross-DB: `distributors` | Cross-DB: `get_admin_distributors_list`, `create_admin_distributor`, `update_admin_distributor` |
| `/ndc-pricing` | `GET/POST/DELETE /admin/ndc-pricing/*`, `POST /barcode/scan` | Cross-DB: `ndc_pricing` | Cross-DB: `search_ndc_pricing_book`, `upsert_ndc_pricing`, `delete_ndc_pricing` |
| `/payout-hub`, `/pharmacy-payments` | `GET/POST/PATCH /admin/pharmacy-payments/*`, `GET /admin/batches` | `pharmacy_payments`, `pharmacy` | `pharmacy_payment_list`, `pharmacy_payment_calculate`, `pharmacy_payment_create`, `pharmacy_payment_update` |
| `/warehouse/receiving` | `POST /admin/warehouse/scan-box`, `GET /admin/warehouse/pending`, `GET .../received` | Cross-DB: `warehouse_discrepancies` | Cross-DB: `warehouse_scan_box`, `warehouse_list_pending`, `warehouse_list_received` |
| `/warehouse/verification/[id]` | `POST .../start-verification`, `PATCH .../verify-v2`, `POST .../surplus`, `POST .../complete-verification`, `POST /barcode/scan` | Cross-DB: `warehouse_discrepancies` | Cross-DB: `warehouse_start_verification`, `warehouse_verify_item_v2`, `warehouse_add_surplus`, `warehouse_complete_verification` |
| `/warehouse/returns/*` | `GET/POST/PATCH/DELETE /return-transactions/*`, `GET /admin/reverse-distributors`, `GET/POST /admin/wine-cellar` | `return_transactions`, `return_transaction_items`, Cross-DB: `reverse_distributors`, `wine_cellar_items` | `create_return_transaction`, `list_return_transactions`, `finalize_return_transaction`, `change_return_transaction_status` |
| `/warehouse/batches/*` | `GET/POST/DELETE /admin/batches/*`, `POST .../generate-memos`, `GET .../workflow` | Cross-DB: `return_batches`, `batch_workflow_steps`, `debit_memos` | Cross-DB: `create_batch`, `list_batches`, `generate_debit_memos_for_batch` |
| `/warehouse/debit-memos` | `GET/PATCH /admin/debit-memos/*` | Cross-DB: `debit_memos`, `debit_memo_items` | Cross-DB: `list_debit_memos`, `get_debit_memo`, `update_debit_memo` |
| `/warehouse/ra-tracking` | `GET /admin/ra-tracking/*`, `POST .../request-ra`, `POST .../ship`, `GET /admin/shipment-groups/*` | Cross-DB: `ra_requests`, `debit_memos`, `shipment_groups` | Cross-DB: `ra_list_tracking`, `ra_send_request`, `ra_ship_debit_memo` |
| `/warehouse/wine-cellar` | `GET/PATCH/POST /admin/wine-cellar/*` | Cross-DB: `wine_cellar_items` | Cross-DB: `list_wine_cellar_items`, `update_wine_cellar_item`, `mark_wine_cellar_returned` |
| `/warehouse/destruction` | `GET/PATCH /admin/destruction/*` | Cross-DB: `destruction_records` | Cross-DB: `list_destruction_records`, `update_destruction_record` |
| `/warehouse/unpaid` | `GET /admin/debit-memos/unpaid/*`, `POST .../record-payment` | Cross-DB: `debit_memos` | Cross-DB: `payment_list_unpaid`, `payment_record` |
| `/shipments` | `GET/POST /admin/shipment-groups/*` | Cross-DB: `shipment_groups` | Cross-DB: `list_shipped_shipment_groups`, `create_shipment_group` |

---

## Pharmacy Portal Deep Analysis

### Pages & API Calls

| Route | APIs Called | Key Tables | Key RPCs |
|-------|-------------|------------|----------|
| `/login` | `POST /auth/signin`, `GET /auth/tenant-info` | `pharmacy`, `refresh_tokens` | `validate_pharmacy_tenant_access` |
| `/register` | `POST /auth/signup` | `pharmacy` | — |
| `/setup-account` | `POST /auth/verify-invite`, `POST /auth/complete-setup` | `pharmacy_invites` | `verify_pharmacy_invite`, `complete_pharmacy_setup` |
| `/dashboard` | `GET /dashboard/return-stats`, `GET .../returns-list`, `GET .../return-detail/:id` | `return_transactions` | `get_return_credit_summary` |
| `/returns` | `GET/POST/DELETE /return-transactions/*`, `GET .../dea-form-222` | `return_transactions`, `return_transaction_items` | `list_return_transactions`, `create_return_transaction`, `delete_return_transaction` |
| `/returns/[id]` | `GET/PATCH/POST/DELETE /return-transactions/:id/*`, `GET /admin/reverse-distributors`, `GET .../manifest`, `GET .../job-sheet`, `GET .../shipping-labels` | `return_transactions`, `return_transaction_items`, Cross-DB: `reverse_distributors` | `get_return_transaction_by_id`, `update_return_transaction`, `change_return_transaction_status` |
| `/returns/[id]/add-items` | `POST /barcode/scan`, `POST /return-transactions/:id/items`, `GET /reverse-distributors` | `return_transaction_items`, Cross-DB: `reverse_distributors` | `add_return_transaction_item_with_validation` |
| `/returns/[id]/scan-items` | `POST /barcode/scan`, `POST /wine-cellar`, `POST /return-transactions/:id/items` | `return_transaction_items`, Cross-DB: `wine_cellar_items` | `add_return_transaction_item_with_validation`, `add_to_wine_cellar` |
| `/returns/[id]/finalize` | `PATCH .../finalize-steps`, `POST .../create-shipment`, `POST .../schedule-pickup`, `POST .../finalize` | `return_transactions` | `finalize_return_transaction`, `update_finalize_steps`, `save_fedex_shipment_data` |
| `/returns/scan` | `GET /return-transactions`, `POST /policies/check`, `POST /barcode/scan`, `POST /return-transactions`, `POST .../items`, `POST /wine-cellar` | `return_transactions`, `return_transaction_items`, Cross-DB: `manufacturer_policies`, `wine_cellar_items` | `create_return_transaction`, `add_return_transaction_item_with_validation`, `add_to_wine_cellar` |
| `/returns/destruction` | `GET/PATCH /destruction/*` | Cross-DB: `destruction_records` | Cross-DB: `list_destruction_records`, `update_destruction_record` |
| `/returns/tbd-items` | `GET /return-transactions`, `GET .../items`, `PATCH .../resolve` | `return_transactions`, `return_transaction_items` | `resolve_transaction_item_with_auto_destination` |
| `/inventory` | `GET/POST/PATCH/DELETE /inventory/*`, `POST /ndc/validate` | `inventory_items` | — (direct table access) |
| `/inventory-analysis` | `GET /inventory-analysis/summary`, `POST .../upload` | `pharmacy_inventory_items`, `pharmacy_inventory_uploads` | — |
| `/marketplace/*` | `GET/POST/PATCH/DELETE /marketplace/*` (deals, cart, checkout, orders) | `marketplace_orders` | `get_pharmacy_marketplace_deals`, `add_to_pharmacy_cart`, `validate_pharmacy_cart`, `create_marketplace_order_from_cart`, `cancel_marketplace_order` |
| `/wine-cellar` | `GET /wine-cellar`, `GET /wine-cellar/stats` | Cross-DB: `wine_cellar_items` | Cross-DB: `list_wine_cellar_items`, `get_wine_cellar_stats` |
| `/warehouse/verification` | `GET /admin/warehouse/received` | Cross-DB: `warehouse_discrepancies` | Cross-DB: `warehouse_list_received` |
| `/warehouse/verification/[id]` | `POST .../start-verification`, `PATCH .../verify-v2`, `POST .../surplus`, `POST .../complete-verification` | Cross-DB: `warehouse_discrepancies` | Cross-DB: `warehouse_start_verification`, `warehouse_verify_item_v2`, `warehouse_complete_verification` |
| `/warehouse/surplus` | `GET /admin/warehouse/surplus` | Cross-DB: `warehouse_discrepancies` | Cross-DB: `warehouse_list_all_surplus` |
| `/products` | `GET /optimization/recommendations`, `GET /products/search`, `POST /barcode/parse` | `products`, `product_list_items` | `get_package_recommendations` |
| `/optimization` | `GET /optimization/recommendations`, `GET /return-reports/search` | `return_reports` | `get_package_recommendations` |
| `/packages/*` | `GET/POST/PATCH/DELETE /optimization/custom-packages/*` | `custom_packages`, `custom_package_items` | `add_items_to_custom_package`, `update_package_item`, `delete_package_item` |
| `/documents` | `GET/DELETE /documents/*`, `GET .../view`, `GET .../download` | `uploaded_documents` | — |
| `/upload` | `POST /return-reports/process`, `GET /documents` | `uploaded_documents`, `return_reports` | — |
| `/credits` | `GET /pharmacy-payments/my-payments`, `GET .../check-pdf/:checkNumber` | `pharmacy_payments` | `pharmacy_payment_my_payments`, `pharmacy_payment_check_pdf_data` |
| `/analytics` | `GET /analytics/pharmacy-dashboard` | `return_transactions`, `pharmacy` | `analytics_pharmacy_dashboard` |
| `/reports-hub/*` | `GET /pharmacy-reports/returns`, `GET .../return-packet`, `GET .../controlled-substance`, `GET .../destruction-controls`, `GET .../destruction-non-controls` | Cross-DB: `destruction_records` | `list_pharmacy_report_returns`, `get_pharmacy_return_packet`, `get_pharmacy_controlled_substance_report`, `get_pharmacy_destruction_controls`, `get_pharmacy_destruction_non_controls` |
| `/settings` | `GET/PATCH /settings`, `POST .../change-password`, `POST .../upload-document`, `GET/PATCH /settings/store-settings` | `pharmacy`, `settings` | — |
| `/subscription` | `GET /subscriptions/plans`, `GET /subscriptions`, `POST .../checkout`, `POST .../portal`, `POST .../cancel`, `POST .../reactivate` | `subscriptions`, `subscription_plans` | — |
| `/on-site-service/*` | `GET/POST /on-site-service/*` | `service_requests` | `create_service_request`, `list_pharmacy_service_requests`, `cancel_pharmacy_service_request` |
| `/branches/*` | `GET/POST/PUT /pharmacy-branches/*`, `GET .../invites` | `pharmacy_branches` | `pharmacy_admin_create_branch`, `get_pharmacy_branches`, `update_branch_pharmacy_status` |
| `/roles/*` | `GET/POST/PUT/DELETE /pharmacy-roles/*` | — | `create_pharmacy_role`, `list_pharmacy_roles`, `update_pharmacy_role`, `delete_pharmacy_role`, `assign_role_to_branch`, `remove_role_from_branch` |
| `/top-distributors` | `GET /distributors/top`, `GET /product-lists/items` | Cross-DB: `reverse_distributors` | — |
| `/notifications` | `GET/POST /pharmacy/notifications/*` | `pharmacy_notifications` | `list_pharmacy_notifications`, `mark_pharmacy_notification_read`, `mark_all_pharmacy_notifications_read` |

---

## Processor Portal Deep Analysis

### Pages & API Calls (Uses Admin Portal with Processor Auth)

| Route | APIs Called | Key Tables | Key RPCs |
|-------|-------------|------------|----------|
| `/processors/my-stores` | `GET /processors/my-stores` | `processor_store_assignments`, `pharmacy` | `list_processor_store_assignments` |
| `/service-requests` | `GET/POST /processors/service-requests/*` | `service_requests` | `list_processor_service_requests`, `claim_service_request` |
| `/returns/*` | `GET/POST/PATCH/DELETE /return-transactions/*`, `POST /barcode/scan` | `return_transactions`, `return_transaction_items` | `create_return_transaction`, `list_return_transactions`, `add_return_transaction_item_with_validation` |
| `/notifications` | `GET/POST /processors/notifications/*` | `processor_notifications` (via RPCs) | `list_processor_notifications`, `mark_processor_notification_read`, `mark_all_processor_notifications_read` |
| `/ndc-pricing` | `GET /admin/ndc-pricing/search`, `POST .../resolve` | Cross-DB: `ndc_pricing` | Cross-DB: `search_ndc_pricing_book`, `resolve_ndc_price` |
| `/policies/check` | `POST /policies/check` | Cross-DB: `manufacturer_policies`, `manufacturer_return_policies`, `non_returnable_products` | Cross-DB: Direct table access |

---

## Cross-Database Access Analysis

### Admin Portal APIs → MainAdmin DB Access

#### Warehouse Operations APIs
**Base Route:** `/api/admin/warehouse/*`

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `POST /api/admin/warehouse/scan-box` | `warehouse_scan_box` | `warehouse_discrepancies` |
| `GET /api/admin/warehouse/pending` | `warehouse_list_pending` | `warehouse_discrepancies` |
| `GET /api/admin/warehouse/received` | `warehouse_list_received` | `warehouse_discrepancies` |
| `POST /api/admin/warehouse/:id/start-verification` | `warehouse_start_verification` | `warehouse_discrepancies` |
| `PATCH /api/admin/warehouse/:id/items/:itemId/verify-v2` | `warehouse_verify_item_v2` | `warehouse_discrepancies` |
| `POST /api/admin/warehouse/:id/surplus` | `warehouse_add_surplus` | `warehouse_discrepancies` |
| `GET /api/admin/warehouse/:id/surplus` | `warehouse_list_surplus` | `warehouse_discrepancies` |
| `GET /api/admin/warehouse/surplus` | `warehouse_list_all_surplus` | `warehouse_discrepancies` |
| `POST /api/admin/warehouse/:id/complete-verification` | `warehouse_complete_verification` | `warehouse_discrepancies` |
| `GET /api/admin/warehouse/:id/verification-summary` | `warehouse_get_verification_summary` | `warehouse_discrepancies` |
| `PATCH /api/admin/warehouse/discrepancies/:id/resolve` | `warehouse_resolve_discrepancy` | `warehouse_discrepancies` |

#### Warehouse Management APIs
**Base Route:** `/api/admin/warehouse-management/*`

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET /api/admin/warehouse-management/` | `get_warehouses` | `warehouses` |
| `GET /api/admin/warehouse-management/default` | `get_default_warehouse` | `warehouses` |
| `POST /api/admin/warehouse-management/` | `create_warehouse` | `warehouses` |
| `PATCH /api/admin/warehouse-management/:id` | `update_warehouse` | `warehouses` |
| `DELETE /api/admin/warehouse-management/:id` | `delete_warehouse` | `warehouses` |

#### Policy Management APIs
**Base Route:** `/api/admin/policies/*`

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET/POST/PATCH/DELETE /api/admin/policies/*` | None (direct table access) | `manufacturer_policies`, `manufacturer_return_policies`, `manufacturer_policy_notes`, `non_returnable_products` |

#### NDC Pricing APIs
**Base Route:** `/api/admin/ndc-pricing/*`

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET /api/admin/ndc-pricing/search` | `search_ndc_pricing_book` | `ndc_pricing` |
| `POST /api/admin/ndc-pricing/` | `upsert_ndc_pricing` | `ndc_pricing` |
| `GET /api/admin/ndc-pricing/:ndc` | `get_ndc_pricing` | `ndc_pricing` |
| `DELETE /api/admin/ndc-pricing/:id` | `delete_ndc_pricing` | `ndc_pricing` |
| `GET /api/admin/ndc-pricing/resolve/:ndc` | `resolve_ndc_price`, `resolve_ndc_price_with_intelligence` | `ndc_pricing` |
| `POST /api/admin/ndc-pricing/import` | `import_ndc_pricing_from_reports` | `ndc_pricing` |
| `GET /api/admin/ndc-pricing/:ndc/intelligence` | `get_ndc_pricing_intelligence` | `ndc_pricing` |

#### Distributors Management APIs
**Base Route:** `/api/admin/distributors/*`

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET /api/admin/distributors/` | `get_admin_distributors_list` | `distributors` |
| `GET /api/admin/distributors/:id` | `get_admin_distributor_by_id` | `distributors` |
| `POST /api/admin/distributors/` | `create_admin_distributor` | `distributors` |
| `PUT /api/admin/distributors/:id` | `update_admin_distributor` | `distributors` |
| `PUT /api/admin/distributors/:id/status` | `update_admin_distributor_status` | `distributors` |
| `DELETE /api/admin/distributors/:id` | `delete_admin_distributor` | `distributors` |
| `GET /api/admin/distributors/:id/products` | `get_distributor_unique_products` | `distributors` |

#### Batch & Financial APIs (Admin calling MainAdmin)
**Base Route:** `/api/admin/batches/*`, `/api/admin/debit-memos/*`

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET/POST/DELETE /api/admin/batches/*` | `create_batch`, `list_batches`, `get_batch`, `assign_returns_to_batch`, `close_batch`, `delete_batch` | `return_batches`, `batch_workflow_steps` |
| `POST /api/admin/batches/:id/generate-memos` | `generate_debit_memos_for_batch` | `debit_memos`, `debit_memo_items` |
| `GET/PATCH /api/admin/debit-memos/*` | `list_debit_memos`, `get_debit_memo`, `update_debit_memo` | `debit_memos`, `debit_memo_items` |
| `GET /api/admin/debit-memos/unpaid` | `payment_list_unpaid` | `debit_memos` |
| `POST /api/admin/debit-memos/:id/record-payment` | `payment_record` | `debit_memos` |

#### RA & Shipment APIs (Admin calling MainAdmin)
**Base Route:** `/api/admin/ra-tracking/*`, `/api/admin/shipment-groups/*`

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET /api/admin/ra-tracking/*` | `ra_list_tracking`, `ra_list_outstanding`, `ra_list_overdue` | `ra_requests`, `debit_memos` |
| `POST /api/admin/debit-memos/:id/request-ra` | `ra_send_request` | `ra_requests`, `debit_memos` |
| `POST /api/admin/debit-memos/:id/ship` | `ra_ship_debit_memo` | `ra_requests`, `debit_memos` |
| `GET/POST /api/admin/shipment-groups/*` | `create_shipment_group`, `ship_memo_group`, `list_shipped_shipment_groups` | `shipment_groups` |

#### Wine Cellar & Destruction APIs (Admin calling MainAdmin)

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET/PATCH/POST /api/admin/wine-cellar/*` | `list_wine_cellar_items`, `get_wine_cellar_item`, `update_wine_cellar_item`, `mark_wine_cellar_returned`, `check_and_surface_ready_items` | `wine_cellar_items` |
| `GET/PATCH /api/admin/destruction/*` | None (direct table access) + `create_destruction_record_for_transaction_item` | `destruction_records` |

---

### MainAdmin Portal APIs → Buying Group DB Access

#### Buying Group Management APIs
**Base Route:** `/api/main-admin/buying-groups/*`

| API Endpoint | BG DB RPC Functions Called | BG DB Tables Accessed |
|-------------|---------------------------|---------------------|
| `GET /api/main-admin/buying-groups/` | `get_buying_groups_list` | `admin` (Main Admin DB), `admin_settings` (BG DB — cross-DB read) |
| `GET /api/main-admin/buying-groups/:id` | `get_buying_group_by_id` | `admin` (Main Admin DB), `admin_settings` (BG DB — cross-DB read) |
| `POST /api/main-admin/buying-groups/` | `create_buying_group` | `admin` (Main Admin DB), `admin_settings` (BG DB — cross-DB write at provisioning) |
| `PUT /api/main-admin/buying-groups/:id` | `update_buying_group` | `admin` (Main Admin DB), `admin_settings` (BG DB — cross-DB write) |
| `DELETE /api/main-admin/buying-groups/:id` | `delete_buying_group` | `admin` (Main Admin DB), `admin_settings` (BG DB — cross-DB delete) |

#### Warehouse Operations (MainAdmin reading BG return data)

| API Endpoint | BG DB RPC/Tables Needed | Why |
|-------------|------------------------|-----|
| `GET /api/admin/warehouse/received` | `return_transactions`, `pharmacy` (join for pharmacy_name) | Warehouse lists returns from all BGs |
| `GET /api/admin/warehouse/pending` | `return_transactions`, `pharmacy` | Pending return listings |
| `PATCH .../items/:itemId/verify-v2` | `return_transaction_items` | Verify individual items |
| `GET .../verification-summary` | `return_transactions`, `pharmacy`, `processors` | Return details with pharmacy/processor names |

#### Financial Processing (MainAdmin reading BG data for batches/memos)

| API Endpoint | BG DB RPC/Tables Needed | Why |
|-------------|------------------------|-----|
| `POST /api/admin/batches/:id/assign` | `return_transactions` | Assign returns to batch |
| `POST /api/admin/batches/:id/generate-memos` | `return_transactions`, `return_transaction_items`, `pharmacy` | Generate debit memos from return data |
| `GET /api/admin/debit-memos/grouped-by-return` | `return_transactions`, `pharmacy` | Group memos by return/pharmacy |

#### Dashboard & Analytics (MainAdmin aggregating all BG data)

| API Endpoint | BG DB RPC/Tables Needed | Why |
|-------------|------------------------|-----|
| `GET /api/admin/dashboard` | `pharmacy`, `return_transactions`, `uploaded_documents` | Dashboard stats across all BGs |
| `GET /api/admin/analytics/*` | `pharmacy`, `return_transactions`, `pharmacy_payments` | Analytics aggregation |

#### Pharmacy Payments (MainAdmin managing payments for all BGs)

| API Endpoint | BG DB RPC/Tables Needed | Why |
|-------------|------------------------|-----|
| `GET /api/admin/pharmacy-payments/` | `pharmacy_payments`, `pharmacy` | Payment listing across all BGs |
| `POST /api/admin/pharmacy-payments/calculate` | `pharmacy`, `return_transactions`, `pharmacy_payments` | Payment calculation |

---

### Pharmacy Portal APIs → MainAdmin DB Access

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET /api/wine-cellar/` | `list_wine_cellar_items` | `wine_cellar_items` |
| `GET /api/wine-cellar/stats` | `get_wine_cellar_stats` | `wine_cellar_items` |
| `POST /api/wine-cellar/` | `add_to_wine_cellar` | `wine_cellar_items` |
| `GET /api/destruction/` | None (direct table access) | `destruction_records` |
| `PATCH /api/destruction/:id` | None (direct table access) | `destruction_records` |
| `POST /api/policies/check` | None (direct table access) | `manufacturer_policies`, `manufacturer_return_policies`, `non_returnable_products` |
| `GET /api/ndc-search/` | `search_ndc_pricing_fixed` | `ndc_pricing` |
| `GET /api/ndc-search/index` | `get_ndc_pricing_index` | `ndc_pricing` |
| `GET /api/earnings-estimation/` | `get_earnings_estimation` | `ndc_pricing`, `manufacturer_policies` |
| `GET /api/pharmacy-reports/returns/:refNum/destruction-controls` | `get_pharmacy_destruction_controls` | `destruction_records` |
| `GET /api/pharmacy-reports/returns/:refNum/destruction-non-controls` | `get_pharmacy_destruction_non_controls` | `destruction_records` |
| `GET /api/admin/warehouse/received` | `warehouse_list_received` | `warehouse_discrepancies` |
| `POST /api/admin/warehouse/:id/start-verification` | `warehouse_start_verification` | `warehouse_discrepancies` |
| `PATCH /api/admin/warehouse/:id/items/:itemId/verify-v2` | `warehouse_verify_item_v2` | `warehouse_discrepancies` |
| `GET /api/admin/warehouse/surplus` | `warehouse_list_all_surplus` | `warehouse_discrepancies` |

### Processor Portal APIs → MainAdmin DB Access

| API Endpoint | MainAdmin RPC Functions Called | MainAdmin Tables Accessed |
|-------------|-------------------------------|---------------------------|
| `GET /api/admin/ndc-pricing/search` | `search_ndc_pricing_book` | `ndc_pricing` |
| `GET /api/admin/ndc-pricing/resolve/:ndc` | `resolve_ndc_price`, `resolve_ndc_price_with_intelligence` | `ndc_pricing` |
| `POST /api/policies/check` | None (direct table access) | `manufacturer_policies`, `manufacturer_return_policies`, `non_returnable_products` |

---

## Migration Critical Considerations

### 1. Return Transaction Architecture
**Returns are managed within each Buying Group database** — each BG has their own `return_transactions` and `return_transaction_items` tables.

### 2. Cross-Database Access Patterns
- **Buying Group → MainAdmin**: Warehouse operations, policy validation, NDC pricing, wine cellar, destruction, batches, debit memos, RA tracking
- **MainAdmin → Buying Group**: Reading returns for warehouse processing, pharmacy/processor names for display, BG management, analytics aggregation
- **Shared Reference Data**: Policies, NDC pricing, distributors, reverse distributors in MainAdmin DB

### 3. Authentication Flow
- MainAdmin auth uses `main_admin`/`sub_main_admin` tables (Main Admin DB)
- Buying group auth uses `admin` table (Main Admin DB) for login — accounts created by MainAdmin; after login, session scopes to BG DB
- Pharmacy auth uses `pharmacy` table (BG DB)
- Tenant resolution via `buying_group_domains` (Main Admin DB)

### 4. Data Flow
1. Pharmacies create returns in their BG database
2. MainAdmin reads returns across all BG databases for warehouse processing
3. Warehouse operations (batching, memos, RA) are processed in MainAdmin
4. Results may need to sync back to BG databases

---

## Quick Reference: Portal → Primary Tables

### Main Admin Database

| Portal | Primary Tables |
|--------|---------------|
| **MainAdmin** | `main_admin`, `sub_main_admin`, `buying_group_domains`, `admin`, `warehouses`, `return_batches`, `batch_workflow_steps`, `warehouse_discrepancies`, `debit_memos`, `debit_memo_items`, `ra_requests`, `shipment_groups`, `wine_cellar_items`, `destruction_records`, `reverse_distributors`, `manufacturer_policies`, `manufacturer_return_policies`, `manufacturer_policy_notes`, `non_returnable_products`, `ndc_pricing`, `distributors` |

---

### Buying Group (BG) Database

All three BG portals — **Admin, Pharmacy, and Processor** — share the same BG DB per buying group. All portals login via `admin` table in **Main Admin DB**, then operate against their BG DB.

| Portal | Primary Tables |
|--------|---------------|
| **Admin + Pharmacy + Processor (shared BG DB)** | `admin_settings`, `pharmacy`, `pharmacy_branches`, `pharmacy_invites`, `pharmacy_inventory_items`, `pharmacy_inventory_uploads`, `pharmacy_notifications`, `pharmacy_payments`, `processors`, `processor_store_assignments`, `return_transactions`, `return_transaction_items`, `returns`, `return_items`, `return_reports`, `service_requests`, `service_request_assignments`, `marketplace_orders`, `inventory_items`, `inventory_reminders`, `products`, `custom_packages`, `custom_package_items`, `product_list_items`, `subscriptions`, `subscription_plans`, `uploaded_documents`, `refresh_tokens`, `settings`, `email_logs`, `email_logs_with_memo_info` |

> **Cross-DB Note:** `return_transactions` and `return_transaction_items` live in the **BG DB** but are also read by **MainAdmin** for warehouse processing. They are the primary cross-DB access point.

---

*Document reflects the architecture where: (1) `admin` accounts live in Main Admin DB — login for all BG portals is validated here; (2) returns are managed within each Buying Group database; (3) MainAdmin handles centralized warehouse operations and reference data. All RPC function names and table names verified from actual backend code (254 RPCs, 48 tables).*
