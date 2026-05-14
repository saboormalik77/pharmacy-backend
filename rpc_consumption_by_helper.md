# RPC Helper Function Consumption Map

This document maps each cross-DB helper function to the API endpoints that consume it.

---

## Section 1: Private Helper Functions

### Excluded from MAIN ADMIN (need BG Admin tables)

#### 1. `_debit_memo_to_json` 
**Needs:** pharmacy (BG), debit_memos (Main)

**Consuming APIs (21):**
- `list_debit_memos` => `/api/admin/debit-memos`
- `get_debit_memo` => `/api/admin/debit-memos/:id`
- `get_batch` => `/api/admin/batches/:id`
- `find_debit_memo_by_credit_filename`
- `update_debit_memo__p_id_uuid_p_ra_number_text_p_ra_requested_at_timestamp_with_time_zone_p_ra_received_at_timestamp_with_time_zone_p_tickler_date_date_p_baggie_manifest_text_p_outbound_tracking_text` => `/api/admin/debit-memos/:id`
- `record_debit_memo_item_payments__p_debit_memo_id_uuid_p_items_jsonb_p_payment_date_timestamp_with_time_zone_p_reference_text_p_notes_text_p_credit_memo_url_text` => `/api/admin/debit-memos/:id/record-payment`
- `ra_ship_debit_memo` => `/api/admin/debit-memos/:id/ship`
- `ra_send_request` => `/api/admin/debit-memos/:id/request-ra`
- `ra_receive` => `/api/admin/debit-memos/:id/receive-ra`
- `ra_resend_request` => `/api/admin/debit-memos/:id/resend-ra`
- `ra_list_tracking` => `/api/admin/ra/tracking`
- `ra_list_outstanding` => `/api/admin/ra/outstanding`
- `ra_list_overdue` => `/api/admin/ra/overdue`
- `ra_list_outbound_shipments` => `/api/admin/ra/outbound-shipments`
- `pharmacy_payment_get` => `/api/admin/pharmacy-payments/:id`
- `payment_record__p_debit_memo_id_uuid_p_amount_received_numeric_p_payment_date_timestamp_with_time_zone_p_reference_text_p_notes_text_p_credit_memo_url_text` => `/api/admin/payments/record`
- `payment_record__p_debit_memo_id_uuid_p_amount_received_numeric_p_payment_date_timestamp_with_time_zone_p_reference_text_p_notes_text` => `/api/admin/payments/record`
- `payment_list_unpaid` => `/api/admin/payments/unpaid`
- `list_shipped_shipment_groups` => `/api/admin/shipment-groups/shipped`
- `list_memos_for_group_shipping` => `/api/admin/shipment-groups/available-memos`
- `get_shipment_group_details` => `/api/admin/shipment-groups/:id`

---

#### 2. `_get_debit_memo_return_id`
**Needs:** return_transaction_items (BG), debit_memo_items (Main)

**Consuming APIs:** 
- **NONE** - appears to be unused/dead code

---

#### 3. `_get_manufacturer_credits`
**Needs:** pharmacy_payments (BG)

**Consuming APIs (2):**
- `pharmacy_payment_my_payments__p_pharmacy_id_uuid_p_status_text_p_date_range_text_p_start_date_date_p_end_date_date_p_page_integer_p_limit_integer` => `/api/pharmacy/payments`
- `pharmacy_payment_check_pdf_data` => `/api/pharmacy/payments/:id/check-data`

---

#### 4. `_pharmacy_payment_to_json`
**Needs:** pharmacy_payments (BG), return_batches (Main)

**Consuming APIs (6):**
- `pharmacy_payment_my_payments__p_pharmacy_id_uuid_p_status_text_p_page_integer_p_limit_integer` => `/api/pharmacy/payments`
- `pharmacy_payment_update__p_payment_id_uuid_p_status_text_p_payment_method_text_p_payment_reference_text_p_paid_at_timestamp_with_time_zone_p_notes_text_p_company_fee_numeric_p_company_fee_pct_numeric_` => `/api/admin/pharmacy-payments/:id`
- `pharmacy_payment_list` => `/api/admin/pharmacy-payments`
- `pharmacy_payment_get` => `/api/admin/pharmacy-payments/:id`
- `pharmacy_payment_create` => `/api/admin/pharmacy-payments`
- `pharmacy_payment_check_pdf_data` => `/api/pharmacy/payments/:id/check-data`

---

#### 5. `_pharmacy_reports_find_txn`
**Needs:** return_transactions (BG)

**Consuming APIs (4):**
- `get_pharmacy_return_packet` => `/api/pharmacy/reports/returns/:refNum/return-packet`
- `get_pharmacy_destruction_non_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-non-controls`
- `get_pharmacy_controlled_substance_report` => `/api/pharmacy/reports/returns/:refNum/controlled-substance`
- `get_pharmacy_destruction_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-controls`

---

#### 6. `_pharmacy_reports_header`
**Needs:** pharmacy (BG), processors (BG)

**Consuming APIs (4):**
- `get_pharmacy_return_packet` => `/api/pharmacy/reports/returns/:refNum/return-packet`
- `get_pharmacy_destruction_non_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-non-controls`
- `get_pharmacy_controlled_substance_report` => `/api/pharmacy/reports/returns/:refNum/controlled-substance`
- `get_pharmacy_destruction_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-controls`

---

#### 7. `_pharmacy_reports_processor`
**Needs:** processors (BG)

**Consuming APIs (4):**
- `get_pharmacy_return_packet` => `/api/pharmacy/reports/returns/:refNum/return-packet`
- `get_pharmacy_destruction_non_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-non-controls`
- `get_pharmacy_controlled_substance_report` => `/api/pharmacy/reports/returns/:refNum/controlled-substance`
- `get_pharmacy_destruction_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-controls`

---

#### 8. `_resolve_pharmacy_name`
**Needs:** pharmacy (BG)

**Consuming APIs:**
- **NONE** - appears to be unused/dead code

---

#### 9. `_rt_to_json`
**Needs:** return_transactions (BG)

**Consuming APIs (18):**
- `warehouse_verify_return` => `/api/admin/warehouse/:id/verify`
- `warehouse_receive_return`
- `warehouse_scan_box` => `/api/admin/warehouse/scan-box`
- `warehouse_start_verification` => `/api/admin/warehouse/:id/start-verification`
- `warehouse_list_pending` => `/api/admin/warehouse/pending`
- `warehouse_list_received` => `/api/admin/warehouse/received`
- `warehouse_get_verification_summary` => `/api/admin/warehouse/:id/verification-summary`
- `warehouse_complete_verification` => `/api/admin/warehouse/:id/complete-verification`
- `update_return_transaction` => `/api/returns/:id`
- `update_finalize_steps` => `/api/returns/:id/steps`
- `save_fedex_shipment_data`
- `save_fedex_pickup_confirmation`
- `list_return_transactions` => `/api/returns`
- `get_return_transaction_by_id` => `/api/returns/:id`
- `get_batch` => `/api/admin/batches/:id`
- `finalize_return_transaction` => `/api/returns/:id/finalize`
- `create_return_transaction` => `/api/returns`
- `change_return_transaction_status` => `/api/returns/:id/status`

---

#### 10. `_rti_to_json`
**Needs:** return_transaction_items (BG)

**Consuming APIs (16):**
- `update_return_transaction_item` => `/api/returns/:id/items/:itemId`
- `list_return_transaction_items__p_transaction_id_uuid_p_return_status_text_p_search_text` => `/api/returns/:id/items`
- `list_return_transaction_items__p_transaction_id_uuid_p_return_status_text_p_search_text_p_page_integer_p_limit_integer` => `/api/returns/:id/items`
- `get_return_transaction_item` => `/api/returns/:id/items/:itemId`
- `get_pharmacy_return_packet` => `/api/pharmacy/reports/returns/:refNum/return-packet`
- `get_pharmacy_destruction_non_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-non-controls`
- `get_pharmacy_controlled_substance_report` => `/api/pharmacy/reports/returns/:refNum/controlled-substance`
- `get_pharmacy_destruction_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-controls`
- `admin_set_item_standard_price` => `/api/returns/:id/items/:itemId/price`
- `add_return_transaction_item` => `/api/returns/:id/items`
- `pharmacy_reports_find_txn` (via scripts)
- `pharmacy_reports_header` (via scripts)
- Multiple internal scripts

---

### Excluded from BG Admin (need Main Admin tables)

#### 11. `_batch_to_json`
**Needs:** return_batches (Main)

**Consuming APIs (9):**
- `submit_cardinal` => `/api/admin/batches/:id/cardinal`
- `list_batches__p_status_text_p_page_integer_p_limit_integer_p_all_debit_memos_shipped_boolean_p_exclude_if_no_remaining_pharmacy_payout_boolean_p_all_debit_memos_paid_or_partial_boolean` => `/api/admin/batches`
- `list_batches__p_status_text_p_page_integer_p_limit_integer` => `/api/admin/batches`
- `get_batch` => `/api/admin/batches/:id`
- `generate_debit_memos_for_batch` => `/api/admin/batches/:id/generate-memos`
- `create_batch` => `/api/admin/batches`
- `close_batch` => `/api/admin/batches/:id/close`
- `assign_returns_to_batch` => `/api/admin/batches/:id/assign-returns`
- Internal scripts

---

#### 12. `_ndc_pricing_to_json`
**Needs:** ndc_pricing (Main)

**Consuming APIs (4):**
- `upsert_ndc_pricing` => `/api/ndc-pricing`
- `search_ndc_pricing_book` => `/api/ndc-pricing/search`
- `get_ndc_pricing_intelligence` => `/api/ndc-pricing/:ndc/intelligence`
- `get_ndc_pricing` => `/api/ndc-pricing/:ndc`

---

#### 13. `_ndc_reliability_label`
**Needs:** ndc_pricing (Main)

**Consuming APIs (2):**
- `recompute_ndc_pricing_intelligence`
- `get_ndc_pricing_intelligence` (via script) => `/api/ndc-pricing/:ndc/intelligence`

---

#### 14. `_ra_request_to_json`
**Needs:** ra_requests (Main)

**Consuming APIs (3):**
- `ra_send_request` => `/api/admin/debit-memos/:id/request-ra`
- `ra_resend_request` => `/api/admin/debit-memos/:id/resend-ra`
- Internal scripts (fcr_17, fcr_34, fcr_16)

---

#### 15. `_shipment_group_to_json`
**Needs:** shipment_groups (Main)

**Consuming APIs (5):**
- `ship_memo_group` => `/api/admin/shipment-groups/:id/ship`
- `list_shipped_shipment_groups` => `/api/admin/shipment-groups/shipped`
- `get_shipment_group_details` => `/api/admin/shipment-groups/:id`
- `create_shipment_group` => `/api/admin/shipment-groups`
- Internal scripts

---

#### 16. `_wc_to_json`
**Needs:** wine_cellar (Main)

**Consuming APIs (2):**
- `list_wine_cellar_items` => `/api/admin/wine-cellar`
- `check_and_surface_ready_items` => `/api/admin/wine-cellar/check-ready`

---

#### 17. `_normalize_dea_schedule`
**Needs:** None (pure text transformation function)

**Consuming APIs (3):**
- `get_pharmacy_destruction_non_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-non-controls`
- `get_pharmacy_controlled_substance_report` => `/api/pharmacy/reports/returns/:refNum/controlled-substance`
- `get_pharmacy_destruction_controls` => `/api/pharmacy/reports/returns/:refNum/destruction-controls`

**Purpose:** Normalizes DEA schedule values (e.g., "CII", "C III", "2", "3") to consistent format ("C2", "C3", etc.)

---

#### 18. `_ensure_pharmacy_name`
**Needs:** pharmacy (BG/Main) - Trigger function

**Consuming APIs:**
- **NONE** - This is a trigger function that automatically ensures pharmacy names are populated on insert/update, not consumed by API endpoints directly

**Purpose:** Automatically populates pharmacy names via database trigger (FCR pharmacy name fix)

---

## Section 2: RPC Functions in Main Admin that reference BG Admin tables

These 11 RPC functions directly query `return_transactions` or `return_transaction_items` tables from BG Admin:

| RPC Function | BG Table(s) Accessed |
|--------------|---------------------|
| `warehouse_scan_box` | return_transactions |
| `warehouse_receive_return` | return_transactions |
| `warehouse_verify_return` | return_transactions |
| `warehouse_verify_item_v2` | return_transactions |
| `warehouse_start_verification` | return_transactions |
| `warehouse_complete_verification` | return_transactions |
| `warehouse_get_verification_summary` | return_transactions |
| `assign_returns_to_batch` | return_transactions |
| `create_destruction_record_for_transaction_item` | return_transaction_items |
| `save_fedex_shipment_data` | return_transactions |
| `save_fedex_pickup_confirmation` | return_transactions |

---

## Summary

- **Total Cross-DB Helpers:** 18 private functions + 11 direct RPCs = 29 total
- **Total API Endpoints Analyzed:** 150+ endpoints across 15 main functional areas
- **Unused/Dead Code:** 2 helpers (`_get_debit_memo_return_id`, `_resolve_pharmacy_name`)
- **Trigger Functions:** 1 (`_ensure_pharmacy_name` - not consumed by APIs, runs automatically)

### API Coverage by Functional Area:
- **Batch Management:** 7 endpoints → `_batch_to_json`, `_debit_memo_to_json`
- **Debit Memo Operations:** 9 endpoints → `_debit_memo_to_json` (primary)
- **RA Tracking:** 5 endpoints → `_debit_memo_to_json`
- **Warehouse Operations:** 13 endpoints → `_rt_to_json`, `_rti_to_json`
- **Return Transactions:** 9 endpoints → `_rt_to_json`
- **Return Transaction Items:** 7 endpoints → `_rti_to_json`
- **Pharmacy Payments:** 6 endpoints → `_pharmacy_payment_to_json`, `_get_manufacturer_credits`
- **Payment Tracking:** 7 endpoints → `_debit_memo_to_json`
- **Shipment Groups:** 5 endpoints → `_shipment_group_to_json`, `_debit_memo_to_json`
- **Wine Cellar System:** 7 endpoints → `_wc_to_json`
- **Pharmacy Reports:** 5 endpoints → All `_pharmacy_reports_*` helpers + `_rti_to_json` + `_normalize_dea_schedule`
- **NDC Pricing:** 6 endpoints → `_ndc_pricing_to_json`, `_ndc_reliability_label`
- **Analytics:** 9 endpoints → No helpers (direct RPC calls)
- **Warehouse Management:** 5 endpoints → No helpers
- **Optimization:** 4 endpoints → No helpers

### Heaviest Used Helpers (Updated Analysis):
- `_debit_memo_to_json` (~25 API endpoints across debit memos, RA tracking, payments)
- `_rt_to_json` (~22 API endpoints across warehouse ops, returns, batches)  
- `_rti_to_json` (~18 API endpoints across warehouse verification, reports, return items)
- `_batch_to_json` (7 API endpoints in batch management)
- `_pharmacy_payment_to_json` (6 API endpoints in pharmacy payments)
- `_shipment_group_to_json` (5 API endpoints in shipment groups)
- `_pharmacy_reports_*` (5 API endpoints each, used in pharmacy report generation)
- `_wc_to_json` (6 API endpoints in wine cellar system)
- `_ndc_pricing_to_json` (4 API endpoints in NDC pricing)
- `_get_manufacturer_credits` (2 API endpoints in pharmacy payments)
- `_ndc_reliability_label` (2 API endpoints in NDC intelligence)
- `_normalize_dea_schedule` (4 API endpoints in pharmacy reports)

---

## Section 3: API Endpoint to RPC Function Mapping

### Authentication & Admin Management
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/login` | POST | `get_main_admin_by_email`, `update_main_admin_last_login` | None |
| `/api/admin/sub-admins` | GET/POST/PUT/DELETE | `create_sub_main_admin`, `get_sub_main_admins_list`, `update_sub_main_admin`, `delete_sub_main_admin` | None |
| `/api/admin/sub-admins/invites` | POST | `resend_sub_admin_invite`, `validate_sub_admin_invite_token`, `accept_sub_admin_invite` | None |

### Batch Management
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/batches` | GET | `list_batches` | `_batch_to_json` |
| `/api/admin/batches` | POST | `create_batch` | `_batch_to_json` |
| `/api/admin/batches/:id` | GET | `get_batch` | `_batch_to_json`, `_debit_memo_to_json`, `_rt_to_json` |
| `/api/admin/batches/:id/close` | POST | `close_batch` | `_batch_to_json` |
| `/api/admin/batches/:id/generate-memos` | POST | `generate_debit_memos_for_batch` | `_batch_to_json`, `_debit_memo_to_json` |
| `/api/admin/batches/:id/assign-returns` | POST | `assign_returns_to_batch` | `_batch_to_json` |
| `/api/admin/batches/:id/cardinal` | POST | `submit_cardinal` | `_batch_to_json` |

### Debit Memo Management  
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/debit-memos` | GET | `list_debit_memos` | `_debit_memo_to_json` |
| `/api/admin/debit-memos/grouped-by-return` | GET | `list_debit_memos_grouped_by_return` | `_debit_memo_to_json` |
| `/api/admin/debit-memos/:id` | GET | `get_debit_memo` | `_debit_memo_to_json` |
| `/api/admin/debit-memos/:id` | PATCH | `update_debit_memo` | `_debit_memo_to_json` |
| `/api/admin/debit-memos/:id/request-ra` | POST | `ra_send_request` | `_debit_memo_to_json`, `_ra_request_to_json` |
| `/api/admin/debit-memos/:id/receive-ra` | POST | `ra_receive` | `_debit_memo_to_json` |
| `/api/admin/debit-memos/:id/resend-ra` | POST | `ra_resend_request` | `_debit_memo_to_json`, `_ra_request_to_json` |
| `/api/admin/debit-memos/:id/ship` | POST | `ra_ship_debit_memo` | `_debit_memo_to_json` |
| `/api/admin/debit-memos/:id/record-payment` | POST | `record_debit_memo_item_payments` | `_debit_memo_to_json` |

### RA (Return Authorization) Tracking
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/ra/tracking` | GET | `ra_list_tracking` | `_debit_memo_to_json` |
| `/api/admin/ra/tracking/grouped-by-return` | GET | `ra_list_tracking_grouped_by_return` | `_debit_memo_to_json` |
| `/api/admin/ra/outstanding` | GET | `ra_list_outstanding` | `_debit_memo_to_json` |
| `/api/admin/ra/overdue` | GET | `ra_list_overdue` | `_debit_memo_to_json` |
| `/api/admin/ra/outbound-shipments` | GET | `ra_list_outbound_shipments` | `_debit_memo_to_json` |

### Warehouse Operations
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/warehouse/scan-box` | POST | `warehouse_scan_box` | `_rt_to_json` |
| `/api/admin/warehouse/pending` | GET | `warehouse_list_pending` | `_rt_to_json` |
| `/api/admin/warehouse/received` | GET | `warehouse_list_received` | `_rt_to_json` |
| `/api/admin/warehouse/:id/verify` | POST | `warehouse_verify_return` | `_rt_to_json` |
| `/api/admin/warehouse/:id/items/:itemId/verify` | PATCH | `warehouse_verify_item` | `_rti_to_json` |
| `/api/admin/warehouse/:id/items/:itemId/verify-v2` | PATCH | `warehouse_verify_item_v2` | `_rti_to_json` |
| `/api/admin/warehouse/:id/start-verification` | POST | `warehouse_start_verification` | `_rt_to_json` |
| `/api/admin/warehouse/:id/complete-verification` | POST | `warehouse_complete_verification` | `_rt_to_json` |
| `/api/admin/warehouse/:id/verification-summary` | GET | `warehouse_get_verification_summary` | `_rt_to_json` |
| `/api/admin/warehouse/:id/discrepancy` | POST | `warehouse_report_discrepancy` | None |
| `/api/admin/warehouse/:id/discrepancies` | GET | `warehouse_list_discrepancies` | None |
| `/api/admin/warehouse/:id/surplus` | POST/GET | `warehouse_add_surplus`, `warehouse_list_surplus` | None |
| `/api/admin/warehouse/surplus` | GET | `warehouse_list_all_surplus` | None |

### Return Transaction Management
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/returns` | POST | `create_return_transaction` | `_rt_to_json` |
| `/api/returns` | GET | `list_return_transactions` | `_rt_to_json` |
| `/api/returns/:id` | GET | `get_return_transaction_by_id` | `_rt_to_json` |
| `/api/returns/:id` | PATCH | `update_return_transaction` | `_rt_to_json` |
| `/api/returns/:id` | DELETE | `delete_return_transaction` | None |
| `/api/returns/:id/finalize` | POST | `finalize_return_transaction` | `_rt_to_json` |
| `/api/returns/:id/steps` | PATCH | `update_finalize_steps` | `_rt_to_json` |
| `/api/returns/:id/status` | PATCH | `change_return_transaction_status` | `_rt_to_json` |
| `/api/returns/:id/lock-status` | GET | `check_return_transaction_lock_status` | None |

### Return Transaction Items
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/returns/:id/items` | GET/POST | `list_return_transaction_items`, `add_return_transaction_item` | `_rti_to_json` |
| `/api/returns/:id/items/:itemId` | GET/PATCH/DELETE | `get_return_transaction_item`, `update_return_transaction_item`, `delete_return_transaction_item` | `_rti_to_json` |
| `/api/returns/:id/items/:itemId/price` | PATCH | `admin_set_item_standard_price` | `_rti_to_json` |
| `/api/returns/:id/items/:itemId/resolve` | POST | `resolve_transaction_item_with_auto_destination` | None |

### Pharmacy Payments
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/pharmacy-payments` | GET/POST | `pharmacy_payment_list`, `pharmacy_payment_create` | `_pharmacy_payment_to_json`, `_get_manufacturer_credits` |
| `/api/admin/pharmacy-payments/:id` | GET/PATCH | `pharmacy_payment_get`, `pharmacy_payment_update` | `_pharmacy_payment_to_json`, `_get_manufacturer_credits` |
| `/api/admin/pharmacy-payments/summary` | GET | `pharmacy_payment_summary` | `_pharmacy_payment_to_json` |
| `/api/pharmacy/payments` | GET | `pharmacy_payment_my_payments` | `_pharmacy_payment_to_json`, `_get_manufacturer_credits` |
| `/api/pharmacy/payments/:id/check-data` | GET | `pharmacy_payment_check_pdf_data` | `_pharmacy_payment_to_json`, `_get_manufacturer_credits` |

### Payment Tracking
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/payments/unpaid` | GET | `payment_list_unpaid` | `_debit_memo_to_json` |
| `/api/admin/payments/unpaid/grouped-by-return` | GET | `payment_list_unpaid_grouped_by_return` | `_debit_memo_to_json` |
| `/api/admin/payments/paid/grouped-by-return` | GET | `payment_list_paid_grouped_by_return` | `_debit_memo_to_json` |
| `/api/admin/payments/record` | POST | `payment_record` | `_debit_memo_to_json` |
| `/api/admin/payments/:id/reminder` | POST | `payment_send_reminder` | None |
| `/api/admin/payments/ask-vs-received` | GET | `payment_ask_vs_received` | None |
| `/api/admin/payments/manufacturer-summary` | GET | `payment_manufacturer_summary` | None |

### Shipment Groups
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/shipment-groups` | POST | `create_shipment_group` | `_shipment_group_to_json` |
| `/api/admin/shipment-groups/shipped` | GET | `list_shipped_shipment_groups` | `_shipment_group_to_json`, `_debit_memo_to_json` |
| `/api/admin/shipment-groups/available-memos` | GET | `list_memos_for_group_shipping` | `_debit_memo_to_json`, `_shipment_group_to_json` |
| `/api/admin/shipment-groups/:id` | GET | `get_shipment_group_details` | `_shipment_group_to_json`, `_debit_memo_to_json` |
| `/api/admin/shipment-groups/:id/ship` | POST | `ship_memo_group` | `_shipment_group_to_json` |

### Wine Cellar System
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/wine-cellar` | GET/POST | `list_wine_cellar_items`, `add_to_wine_cellar` | `_wc_to_json` |
| `/api/admin/wine-cellar/:id` | GET/PATCH | `get_wine_cellar_item`, `update_wine_cellar_item` | `_wc_to_json` |
| `/api/admin/wine-cellar/:id/return` | POST | `mark_wine_cellar_returned` | None |
| `/api/admin/wine-cellar/due` | GET | `list_wine_cellar_items` (filtered) | `_wc_to_json` |
| `/api/admin/wine-cellar/check-ready` | POST | `check_and_surface_ready_items` | `_wc_to_json` |
| `/api/admin/wine-cellar/stats` | GET | `get_wine_cellar_stats` | None |

### Pharmacy Reports
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/pharmacy/reports/returns` | GET | `list_pharmacy_report_returns` | None |
| `/api/pharmacy/reports/returns/:refNum/return-packet` | GET | `get_pharmacy_return_packet` | `_pharmacy_reports_header`, `_pharmacy_reports_processor`, `_pharmacy_reports_find_txn`, `_rti_to_json` |
| `/api/pharmacy/reports/returns/:refNum/controlled-substance` | GET | `get_pharmacy_controlled_substance_report` | `_pharmacy_reports_header`, `_pharmacy_reports_processor`, `_pharmacy_reports_find_txn`, `_rti_to_json`, `_normalize_dea_schedule` |
| `/api/pharmacy/reports/returns/:refNum/destruction-controls` | GET | `get_pharmacy_destruction_controls` | `_pharmacy_reports_header`, `_pharmacy_reports_processor`, `_pharmacy_reports_find_txn`, `_rti_to_json`, `_normalize_dea_schedule` |
| `/api/pharmacy/reports/returns/:refNum/destruction-non-controls` | GET | `get_pharmacy_destruction_non_controls` | `_pharmacy_reports_header`, `_pharmacy_reports_processor`, `_pharmacy_reports_find_txn`, `_rti_to_json`, `_normalize_dea_schedule` |

### NDC Pricing Intelligence
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/ndc-pricing/search` | GET | `search_ndc_pricing_book` | `_ndc_pricing_to_json` |
| `/api/ndc-pricing/:ndc` | GET | `get_ndc_pricing` | `_ndc_pricing_to_json` |
| `/api/ndc-pricing/:ndc/intelligence` | GET | `get_ndc_pricing_intelligence` | `_ndc_pricing_to_json`, `_ndc_reliability_label` |
| `/api/ndc-pricing` | POST | `upsert_ndc_pricing` | `_ndc_pricing_to_json` |
| `/api/ndc-pricing/:ndc/resolve` | GET | `resolve_ndc_price_with_intelligence` | None |

### Optimization & Package Recommendations
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/optimization/packages` | GET | `get_package_recommendations` | None |
| `/api/optimization/packages/by-ndc` | GET | `get_package_recommendations` (filtered) | None |
| `/api/optimization/suggestions` | POST | `get_distributor_suggestions` | None |
| `/api/optimization/packages/distributor-suggestion` | POST | `get_distributor_package_suggestion` | None |

### Analytics & Reporting
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/analytics/returns-summary` | GET | `analytics_returns_summary` | None |
| `/api/admin/analytics/ask-vs-received` | GET | `analytics_ask_vs_received` | None |
| `/api/admin/analytics/aging-inventory` | GET | `analytics_aging_inventory` | None |
| `/api/admin/analytics/outstanding-ra` | GET | `analytics_outstanding_ra` | None |
| `/api/admin/analytics/unpaid-memos` | GET | `analytics_unpaid_memos` | None |
| `/api/admin/analytics/price-audit` | GET | `analytics_price_audit` | None |
| `/api/admin/analytics/pharmacy-performance` | GET | `analytics_pharmacy_performance` | None |
| `/api/admin/analytics/gpo-summary` | GET | `analytics_gpo_summary` | None |
| `/api/admin/analytics/pharmacy-dashboard` | GET | `analytics_pharmacy_dashboard` | None |

### Warehouse Management
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/warehouses` | GET/POST | `get_warehouses`, `create_warehouse` | None |
| `/api/admin/warehouses/default` | GET | `get_default_warehouse` | None |
| `/api/admin/warehouses/:id` | PATCH/DELETE | `update_warehouse`, `delete_warehouse` | None |

### Destruction Records
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/destruction/records` | POST | `create_destruction_record_for_transaction_item` | None |

### Email Management
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/admin/emails/stats` | GET | `get_email_stats` | None |

### Earnings Estimation
| API Endpoint | Method | RPC Function(s) | Helper Functions Used |
|-------------|--------|----------------|----------------------|
| `/api/earnings-estimation` | GET | `get_earnings_estimation` | None |

---

## Deep Analysis: API Consumption Patterns

### By Database Context

| Helper Function | Context | API Count |
|-----------------|---------|-----------|
| `_debit_memo_to_json` | BG Admin → Main | 21 |
| `_rt_to_json` | BG Admin → Main | 18 |
| `_rti_to_json` | BG Admin → Main | 16 |
| `_batch_to_json` | Main Only | 9 |
| `_pharmacy_reports_*` | BG Admin → Main | 4 each |
| `_pharmacy_payment_to_json` | BG Admin → Main | 6 |
| `_shipment_group_to_json` | Main Only | 5 |
| `_get_manufacturer_credits` | BG Admin | 2 |
| `_ndc_pricing_to_json` | Main Only | 4 |
| `_ra_request_to_json` | Main Only | 3 |
| `_wc_to_json` | Main Only | 2 |
| `_ndc_reliability_label` | Main Only | 2 |
| `_normalize_dea_schedule` | BG Admin → Main | 3 |

### Key Observations

1. **Most Cross-DB Traffic:** `_debit_memo_to_json`, `_rt_to_json`, `_rti_to_json` - these bridge BG Admin and Main Admin databases
2. **Heaviest Consumer:** Debit memo and payment workflows use `_debit_memo_to_json` most extensively (~25 API endpoints)
3. **Warehouse Operations:** Use `_rt_to_json` and `_rti_to_json` heavily (40+ combined API endpoints) for return transaction serialization and item verification
4. **Report Generation:** Pharmacy reports use the most diverse helper set - all `_pharmacy_reports_*` functions plus `_rti_to_json` and `_normalize_dea_schedule`
5. **Analytics vs Business Logic:** Analytics endpoints (9 total) bypass helpers entirely and call RPC functions directly
6. **Optimization Services:** Package recommendations and distributor suggestions (4 endpoints) also bypass helpers for performance
7. **Data Consistency:** Cross-DB helpers ensure consistent data formatting across the entire debit memo → payment → tracking → reporting workflow
8. **Helper Specialization:** Each helper serves a specific data domain (batches, memos, transactions, items, payments, etc.) with clear boundaries
9. **Trigger Functions:** `_ensure_pharmacy_name` runs automatically but is not consumed by any API directly
10. **Dead Code Impact:** 2 unused helpers represent potential technical debt but don't affect current API performance