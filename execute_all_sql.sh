#!/bin/bash

# =============================================================================
# SQL Migration Script for Supabase
# Executes all SQL files in chronological order
# =============================================================================

# Database connection settings
HOST="db.zggtgjbokgfsbenazzpx.supabase.co"
PORT="5432"
DATABASE="postgres"
USER="postgres"
PASSWORD="Rx!Portal#9QmL7@eV2"

# Export password for psql
export PGPASSWORD="$PASSWORD"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="sql_migration_$(date +%Y%m%d_%H%M%S).log"

# Counter
TOTAL=239
CURRENT=0
FAILED=0
SUCCESS=0

echo "=============================================="
echo "SQL Migration Script"
echo "Host: $HOST"
echo "Database: $DATABASE"
echo "Total files: $TOTAL"
echo "Log file: $LOG_FILE"
echo "=============================================="
echo ""

# Function to execute SQL file
execute_sql() {
    local file_path="$1"
    local file_num="$2"
    
    CURRENT=$((CURRENT + 1))
    
    if [ ! -f "$file_path" ]; then
        echo -e "${YELLOW}[$CURRENT/$TOTAL] SKIP (not found): $file_path${NC}"
        echo "[$CURRENT/$TOTAL] SKIP (not found): $file_path" >> "$LOG_FILE"
        return
    fi
    
    echo -n "[$CURRENT/$TOTAL] Executing: $file_path ... "
    echo "[$CURRENT/$TOTAL] Executing: $file_path" >> "$LOG_FILE"
    
    # Execute the SQL file
    psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DATABASE" -f "$file_path" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}OK${NC}"
        echo "  Result: SUCCESS" >> "$LOG_FILE"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Result: FAILED" >> "$LOG_FILE"
        FAILED=$((FAILED + 1))
    fi
}

# Start time
START_TIME=$(date +%s)

echo "Starting migration at $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# =============================================================================
# Execute SQL files in chronological order (1-239)
# =============================================================================

execute_sql "scripts/rls_policies.sql" 1
execute_sql "scripts/return_reports_process_tables.sql" 2
execute_sql "scripts/subscription_tables.sql" 3
execute_sql "scripts/insert_products.sql" 4
execute_sql "scripts/insert_packages.sql" 5
execute_sql "scripts/products_packages_tables.sql" 6
execute_sql "scripts/insert_subscription_plans.sql" 7
execute_sql "scripts/custom_packages_tables.sql" 8
execute_sql "scripts/migrate_custom_packages_status_to_boolean.sql" 9
execute_sql "sqlTable/ndc_packages.sql" 10
execute_sql "sqlTable/ndc_products.sql" 11
execute_sql "sqlTable/products.sql" 12
execute_sql "sqlTable/return_reports.sql" 13
execute_sql "sqlTable/subscription_plans.sql" 14
execute_sql "sqlTable/subscriptions.sql" 15
execute_sql "sqlTable/uploaded_documents.sql" 16
execute_sql "scripts/add_package_delivery_fields.sql" 17
execute_sql "sqlTable/refresh_tokens.sql" 18
execute_sql "scripts/migrate_product_list_items_unit_type.sql" 19
execute_sql "scripts/pharmacy_table.sql" 20
execute_sql "sqlTable/product_list_items.sql" 21
execute_sql "scripts/add_npi_dea_to_pharmacy.sql" 22
execute_sql "sqlTable/pharmacy.sql" 23
execute_sql "scripts/migrate_custom_package_items_full_partial.sql" 24
execute_sql "scripts/get_historical_earnings_function.sql" 25
execute_sql "scripts/view_functions.sql" 26
execute_sql "scripts/get_earnings_estimation_function.sql" 27
execute_sql "scripts/create_all_rpc_functions.sql" 28
execute_sql "scripts/rpcFunctions/create_all_rpc_functions.sql" 29
execute_sql "sqlTable/custom_package_items.sql" 30
execute_sql "sqlTable/reverse_distributors.sql" 31
execute_sql "scripts/migrate_custom_packages_fee_columns.sql" 32
execute_sql "sqlTable/custom_packages.sql" 33
execute_sql "scripts/rpcFunctions/check_pharmacy_status.sql" 34
execute_sql "scripts/rpcFunctions/get_earnings_estimation_function.sql" 35
execute_sql "scripts/rpcFunctions/get_historical_earnings_function.sql" 36
execute_sql "scripts/rpcFunctions/get_package_recommendations.sql" 37
execute_sql "scripts/update_pharmacy_schema.sql" 38
execute_sql "scripts/add_fee_duration_column.sql" 39
execute_sql "scripts/rpcFunctions/distributor_package_suggestion_function.sql" 40
execute_sql "scripts/rpcFunctions/admin_documents_functions.sql" 41
execute_sql "scripts/rpcFunctions/add_items_to_package_function.sql" 42
execute_sql "scripts/update_admin_table_roles.sql" 43
execute_sql "sqlTable/admin.sql" 44
execute_sql "scripts/fix_admin_rls.sql" 45
execute_sql "sqlTable/admin_settings.sql" 46
execute_sql "sqlTable/marketplace_deals.sql" 47
execute_sql "scripts/seed_marketplace_deals.sql" 48
execute_sql "scripts/rpcFunctions/package_items_functions.sql" 49
execute_sql "scripts/rpcFunctions/admin_distributors_functions.sql" 50
execute_sql "scripts/rpcFunctions/admin_password_reset_functions.sql" 51
execute_sql "scripts/add_image_to_marketplace_deals.sql" 52
execute_sql "scripts/rpcFunctions/drop_and_recreate_marketplace_functions.sql" 53
execute_sql "scripts/admin_recent_activity_triggers.sql" 54
execute_sql "sqlTable/admin_recent_activity.sql" 55
execute_sql "scripts/fix_admin_recent_activity_constraint.sql" 56
execute_sql "scripts/setup_admin_recent_activity.sql" 57
execute_sql "sqlTable/pharmacy_cart.sql" 58
execute_sql "sqlTable/marketplace_orders.sql" 59
execute_sql "scripts/add_original_quantity.sql" 60
execute_sql "scripts/add_deal_of_the_day.sql" 61
execute_sql "scripts/update_minimum_buy_quantity_functions.sql" 62
execute_sql "scripts/add_minimum_buy_quantity.sql" 63
execute_sql "scripts/update_deal_of_day_in_admin_functions.sql" 64
execute_sql "scripts/update_deal_of_day_in_pharmacy_functions.sql" 65
execute_sql "scripts/rpcFunctions/deal_of_the_day_functions.sql" 66
execute_sql "scripts/add_read_status_to_recent_activity.sql" 67
execute_sql "scripts/rpcFunctions/marketplace_order_functions.sql" 68
execute_sql "scripts/rpcFunctions/get_distributor_suggestions.sql" 69
execute_sql "scripts/add_deal_of_week_and_month.sql" 70
execute_sql "scripts/rpcFunctions/featured_deal_functions.sql" 71
execute_sql "scripts/resolve_function_conflicts.sql" 72
execute_sql "scripts/check_database_schema.sql" 73
execute_sql "scripts/test_featured_deals.sql" 74
execute_sql "scripts/rpcFunctions/manual_featured_deals_only.sql" 75
execute_sql "scripts/rpcFunctions/admin_payments_functions.sql" 76
execute_sql "scripts/rpcFunctions/pharmacy_marketplace_functions.sql" 77
execute_sql "scripts/rpcFunctions/admin_marketplace_functions.sql" 78
execute_sql "scripts/rpcFunctions/ndc_pricing_index_functions.sql" 79
execute_sql "debug_rxreturn_records.sql" 80
execute_sql "debug_natural_order.sql" 81
execute_sql "debug_current_sql.sql" 82
execute_sql "debug_all_records.sql" 83
execute_sql "debug_optimization_logic.sql" 84
execute_sql "deploy_sql_fix.sql" 85
execute_sql "debug_mismatched_distributors.sql" 86
execute_sql "debug_new_mismatches.sql" 87
execute_sql "scripts/rpcFunctions/search_ndc_pricing_v3.sql" 88
execute_sql "debug_exact_selection.sql" 89
execute_sql "scripts/rpcFunctions/search_ndc_pricing_v2.sql" 90
execute_sql "scripts/rpcFunctions/search_ndc_pricing_fixed.sql" 91
execute_sql "scripts/inventory_analysis_schema.sql" 92
execute_sql "scripts/pharmacy_notifications_schema.sql" 93
execute_sql "create-test-data.sql" 94
execute_sql "test-skip-logic.sql" 95
execute_sql "scripts/add_fcm_token_to_pharmacy.sql" 96
execute_sql "scripts/fcr_01_extend_pharmacy_table.sql" 97
execute_sql "scripts/fcr_02_create_processors_table.sql" 98
execute_sql "scripts/fcr_03_create_processor_store_assignments.sql" 99
execute_sql "scripts/fcr_04_extend_admin_roles.sql" 100
execute_sql "scripts/fcr_05_add_admin_user_id_to_processors.sql" 101
execute_sql "scripts/fcr_06_create_return_transactions.sql" 102
execute_sql "scripts/fcr_09_seed_policy_engine_data.sql" 103
execute_sql "scripts/fcr_10_create_destruction_records.sql" 104
execute_sql "scripts/fcr_11_create_wine_cellar.sql" 105
execute_sql "scripts/fcr_12_wine_cellar_item_link.sql" 106
execute_sql "scripts/fcr_14_warehouse_receiving.sql" 107
execute_sql "scripts/fcr_18_pharmacy_gpo_payout.sql" 108
execute_sql "scripts/fcr_19_reporting_analytics.sql" 109
execute_sql "scripts/fcr_20_email_integration.sql" 110
execute_sql "scripts/fcr_20_email_integration_standalone.sql" 111
execute_sql "scripts/fcr_21_nodemailer_migration.sql" 112
execute_sql "scripts/fcr_24_fedex_tracking_packages.sql" 113
execute_sql "scripts/fcr_25_fedex_api_integration.sql" 114
execute_sql "scripts/fcr_26_multi_box_receiving.sql" 115
execute_sql "scripts/fcr_27_finalize_steps_tracking.sql" 116
execute_sql "scripts/fcr_28_ndc_pricing_book.sql" 117
execute_sql "scripts/fcr_29b_legacy_returns_locking.sql" 118
execute_sql "scripts/fcr_29_return_transaction_locking.sql" 119
execute_sql "scripts/fcr_30_auto_destination_assignment.sql" 120
execute_sql "scripts/fcr_31_granular_locking.sql" 121
execute_sql "scripts/fcr_32_batch_management.sql" 122
execute_sql "scripts/fcr_33_warehouse_verification_filter.sql" 123
execute_sql "scripts/fcr_31b_fix_apply_granular_locking.sql" 124
execute_sql "scripts/fcr_36_batch_workflow.sql" 125
execute_sql "scripts/fix_add_item_signature_mismatch.sql" 126
execute_sql "scripts/fix_warehouse_verify_item_lock.sql" 127
execute_sql "scripts/fix_policy_destination_constraint.sql" 128
execute_sql "scripts/fcr_17_manufacturer_payment_tracking.sql" 129
execute_sql "scripts/fcr_34_ra_email_from_reverse_distributors.sql" 130
execute_sql "scripts/fix_ra_email_address_column.sql" 131
execute_sql "scripts/fix_return_items_destination_constraint.sql" 132
execute_sql "scripts/fcr_37_list_batches_all_memos_shipped.sql" 133
execute_sql "scripts/fix_debit_memo_fedex_labels.sql" 134
execute_sql "scripts/fcr_16_ra_request_tracking.sql" 135
execute_sql "scripts/fcr_38_estimated_store_price.sql" 136
execute_sql "scripts/fcr_39b_group_ship_enhancements.sql" 137
execute_sql "scripts/fcr_39d_ship_memo_shipped_at_and_list.sql" 138
execute_sql "scripts/fcr_08_create_policy_engine_tables.sql" 139
execute_sql "scripts/fcr_40_returnable_within_policy_period.sql" 140
execute_sql "scripts/fcr_41_get_destination_inverted_return_window.sql" 141
execute_sql "scripts/fcr_42_wine_cellar_source_return.sql" 142
execute_sql "scripts/fcr_43_delete_item_refresh_return_totals.sql" 143
execute_sql "scripts/fcr_44_rt_json_live_item_totals.sql" 144
execute_sql "scripts/fcr_39c_available_memos_draft_groups.sql" 145
execute_sql "scripts/fcr_45_shipment_group_destination_ci.sql" 146
execute_sql "scripts/fcr_15_batch_closeout.sql" 147
execute_sql "scripts/fcr_46_debit_memo_labeler_from_scan.sql" 148
execute_sql "scripts/fix_split_close_generate_memos.sql" 149
execute_sql "scripts/fcr_47_normalize_ra_status.sql" 150
execute_sql "scripts/fcr_48_destruction_auto_create_from_tbd.sql" 151
execute_sql "scripts/fcr_48_tbd_destruction_workflow.sql" 152
execute_sql "scripts/fix_add_credit_memo_url.sql" 153
execute_sql "scripts/fix_partials_policies.sql" 154
execute_sql "scripts/add_admin_permissions.sql" 155
execute_sql "scripts/fix_group_memos_by_manufacturer.sql" 156
execute_sql "scripts/add_quantity_returned_column.sql" 157
execute_sql "scripts/fix_quantity_returned_json.sql" 158
execute_sql "scripts/fix_duplicate_prevention.sql" 159
execute_sql "scripts/fcr_07_create_return_transaction_items.sql" 160
execute_sql "scripts/update_transaction_totals_returnable_tbd_only.sql" 161
execute_sql "scripts/fcr_13_finalization_and_manifest.sql" 162
execute_sql "scripts/fix_totals_and_manifest.sql" 163
execute_sql "scripts/fix_add_full_package_qty_returned.sql" 164
execute_sql "scripts/migrate_branch_invite_pending_roles.sql" 165
execute_sql "scripts/fix_function_final.sql" 166
execute_sql "scripts/pharmacy_branch_system.sql" 167
execute_sql "scripts/fcr_47_warehouse_verification_flow.sql" 168
execute_sql "scripts/debug_read_ra_emails.sql" 169
execute_sql "scripts/diagnostics_pg_cron_job.sql" 170
execute_sql "scripts/diagnostics_processed_inbox_emails.sql" 171
execute_sql "scripts/fcr_22_email_inbox_processing.sql" 172
execute_sql "scripts/fcr_48_warehouse_list_received_v2_status_filters.sql" 173
execute_sql "scripts/fcr_49_rt_json_warehouse_verification_status.sql" 174
execute_sql "scripts/fcr_50_verification_excludes_non_correct_from_batches.sql" 175
execute_sql "scripts/setup_read_ra_emails_pg_cron.sql" 176
execute_sql "sqlTable/main_admin.sql" 177
execute_sql "sqlTable/buying_groups.sql" 178
execute_sql "scripts/create_main_admin_user.sql" 179
execute_sql "scripts/debug_main_admin.sql" 180
execute_sql "scripts/fix_main_admin_password.sql" 181
execute_sql "scripts/fcr_39_multi_memo_shipping.sql" 182
execute_sql "scripts/rpcFunctions/sub_main_admin_functions.sql" 183
execute_sql "sqlTable/sub_main_admin.sql" 184
execute_sql "scripts/check_super_admin_roles.sql" 185
execute_sql "scripts/add_business_settings_columns.sql" 186
execute_sql "scripts/add_created_by_to_pharmacy.sql" 187
execute_sql "scripts/fcr_23_admin_create_pharmacy.sql" 188
execute_sql "scripts/rpcFunctions/admin_pharmacies_functions.sql" 189
execute_sql "cleanup_admin_pharmacy_functions.sql" 190
execute_sql "fix_admin_pharmacies_rpc.sql" 191
execute_sql "update_processors_buying_group.sql" 192
execute_sql "scripts/rpcFunctions/get_admin_dashboard_stats.sql" 193
execute_sql "scripts/fix_admin_buying_group_id_backfill.sql" 194
execute_sql "scripts/rpcFunctions/admin_users_functions.sql" 195
execute_sql "scripts/rpcFunctions/get_admin_recent_activity.sql" 196
execute_sql "scripts/rpcFunctions/admin_analytics_function.sql" 197
execute_sql "scripts/simple_settings_migration.sql" 198
execute_sql "scripts/fix_admin_settings_multi_tenant.sql" 199
execute_sql "scripts/create_warehouses_table.sql" 200
execute_sql "scripts/rpcFunctions/warehouse_functions.sql" 201
execute_sql "scripts/fix_business_name_sync.sql" 202
execute_sql "scripts/fix_processor_warehouse_permission.sql" 203
execute_sql "sqlTable/pharmacy_notifications.sql" 204
execute_sql "sqlTable/processor_notifications.sql" 205
execute_sql "ADD_TYPE_COLUMN.sql" 206
execute_sql "MIGRATION_ADD_PHARMACY_NOTIFICATIONS_TYPE.sql" 207
execute_sql "FIX_NOTIFICATION_TYPE_COLUMN.sql" 208
execute_sql "scripts/add_profile_fields.sql" 209
execute_sql "FIX_SERVICE_REQUEST_ADDRESS_COLUMN.sql" 210
execute_sql "PATCH_SERVICE_REQUESTS_SCHEMA.sql" 211
execute_sql "MAKE_PURPOSE_NULLABLE.sql" 212
execute_sql "FIX_CREATE_SERVICE_REQUEST_FUNCTION.sql" 213
execute_sql "SIMPLE_CREATE_SERVICE_REQUEST.sql" 214
execute_sql "FIX_CREATE_SERVICE_REQUEST_COMPLETE.sql" 215
execute_sql "sqlTable/service_requests.sql" 216
execute_sql "scripts/fcr_51_pharmacy_reports.sql" 217
execute_sql "scripts/remove_tbd_finalize_check.sql" 218
execute_sql "scripts/fcr_51_pharmacy_checks.sql" 219
execute_sql "scripts/fcr_52_non_returnable_in_lists_and_memos.sql" 220
execute_sql "fix-verification-summary-calculation.sql" 221
execute_sql "scripts/fcr_53_fix_verification_summary_unverified_count.sql" 222
execute_sql "scripts/fcr_54_exclude_non_returnable_from_debit_memos.sql" 223
execute_sql "scripts/fcr_55_skip_post_closeout_workflow.sql" 224
execute_sql "scripts/update_manifest_show_all_items.sql" 225
execute_sql "scripts/add_serial_lot_verification.sql" 226
execute_sql "fix_cii_detection.sql" 227
execute_sql "fix_manifest_admin_users_error.sql" 228
execute_sql "URGENT_FIX_manifest_admin_users_error.sql" 229
execute_sql "URGENT_FIX_manifest_show_all_items.sql" 230
execute_sql "URGENT_FIX_main_admin_update_received_return.sql" 231
execute_sql "URGENT_FIX_trigger_main_admin_received.sql" 232
execute_sql "scripts/fix_buying_group_contact_fields.sql" 233
execute_sql "scripts/rpcFunctions/main_admin_functions.sql" 234
execute_sql "fix_totalItems_count_all_items.sql" 235
execute_sql "scripts/rpcFunctions/admin_settings_functions.sql" 236
execute_sql "scripts/fix_admin_settings_update_bug.sql" 237
execute_sql "scripts/fix_admin_settings_clean_and_update.sql" 238
execute_sql "scripts/rpcFunctions/buying_group_domains_functions.sql" 239

# =============================================================================
# Summary
# =============================================================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=============================================="
echo "Migration Complete!"
echo "=============================================="
echo -e "Total files: $TOTAL"
echo -e "Successful: ${GREEN}$SUCCESS${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Duration: ${DURATION} seconds"
echo "Log file: $LOG_FILE"
echo "=============================================="

echo "" >> "$LOG_FILE"
echo "=============================================" >> "$LOG_FILE"
echo "Migration completed at $(date)" >> "$LOG_FILE"
echo "Total: $TOTAL | Success: $SUCCESS | Failed: $FAILED" >> "$LOG_FILE"
echo "Duration: ${DURATION} seconds" >> "$LOG_FILE"
echo "=============================================" >> "$LOG_FILE"

# Clean up
unset PGPASSWORD

exit 0
