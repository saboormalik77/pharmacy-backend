pip install psycopg2-binary -q && python3 << 'PYEOF'
import re, sys, psycopg2, psycopg2.extras

PASSWORD = "Rx!Portal%239QmL7%40eV2"

# SOURCE DATABASE (has all tables and functions)
SOURCE = f"postgresql://postgres.mxdzmfgkjktbvjeonwiq:{PASSWORD}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# DESTINATION DATABASES
# NOTE: Must use pooler URLs (not direct db.*.supabase.co) — direct URLs use IPv6 which
# is not supported in Cloud Shell. Get pooler URLs from:
# Supabase Dashboard → Project Settings → Database → Connection pooling → Transaction mode
MAIN_ADMIN_DEST = f"postgresql://postgres.qkktjmynqjreimeazclm:{PASSWORD}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
BG_ADMIN_DEST = f"postgresql://postgres.kxmdzduhjmgvdikaewfo:{PASSWORD}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

BATCH = 500

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ADMIN DB - Tables (verified against source DB)
# ═══════════════════════════════════════════════════════════════════════════════
MAIN_ADMIN_TABLES = [
    # Core admin
    "main_admin",
    "sub_main_admin",
    "buying_group_domains",
    "admin",
    "admin_recent_activity",
    # Warehouse
    "warehouses",
    "warehouse_discrepancies",
    "warehouse_surplus_items",
    "warehouse_packages",
    "warehouse_package_items",
    "warehouse_orders",
    "warehouse_order_packages",
    # Batches & debit memos
    "return_batches",
    "batch_workflow_steps",
    "debit_memos",
    "debit_memo_items",
    "credits",
    "credit_memo_analysis",
    # RA & shipments
    "ra_requests",
    "shipment_groups",
    "shipments",
    # Wine cellar  (correct name: wine_cellar, not wine_cellar_items)
    "wine_cellar",
    # Destruction
    "destruction_records",
    # Distributors
    "reverse_distributors",
    # Manufacturer
    "manufacturer_policies",
    "manufacturer_return_policies",
    "manufacturer_policy_notes",
    "non_returnable_products",
    # NDC Pricing
    "ndc_pricing",
    "ndc_pricing_index",
    "ndc_products",
    "ndc_packages",
    "ndc_price_history",
    "ndc_payment_history",
    "payment_manufacturer_credits",
]

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ADMIN DB - RPC Functions (verified against source DB)
# ═══════════════════════════════════════════════════════════════════════════════
MAIN_ADMIN_FUNCTIONS = [
    # Auth & Identity (6)
    "get_main_admin_by_email",
    "update_main_admin_last_login",
    "get_main_admin_by_id",
    "get_sub_main_admin_by_email",
    "update_sub_main_admin_last_login",
    "get_sub_main_admin_by_id",
    # Sub Main Admin Management (7)
    "create_sub_main_admin",
    "get_sub_main_admins_list",
    "update_sub_main_admin",
    "delete_sub_main_admin",
    "resend_sub_admin_invite",
    "validate_sub_admin_invite_token",
    "accept_sub_admin_invite",
    # Buying Group Management (8)
    "get_buying_groups_list",
    "get_buying_group_by_id",
    "create_buying_group",
    "update_buying_group",
    "delete_buying_group",
    "get_buying_group_domains",
    "upsert_buying_group_domain",
    "delete_buying_group_domain",
    # Tenant Resolution (1)
    "resolve_domain_to_buying_group",
    # Warehouse Operations (11)
    # NOTE: warehouse_verify_item, warehouse_report_discrepancy, warehouse_add_surplus
    #       do not exist in source — only v2 and resolve variants are present
    "warehouse_scan_box",
    "warehouse_list_pending",
    "warehouse_list_received",
    "warehouse_receive_return",
    "warehouse_verify_return",
    "warehouse_verify_item_v2",
    "warehouse_list_discrepancies",
    "warehouse_start_verification",
    "warehouse_complete_verification",
    "warehouse_resolve_discrepancy",
    "warehouse_get_verification_summary",
    "warehouse_list_surplus",
    "warehouse_list_all_surplus",
    # Warehouse Management (5)
    "get_warehouses",
    "get_default_warehouse",
    "create_warehouse",
    "update_warehouse",
    "delete_warehouse",
    # Batch & Debit Memo (12)
    # NOTE: delete_batch, unassign_returns_from_batch, unassign_single_return
    #       do not exist in source DB
    "create_batch",
    "list_batches",
    "get_batch",
    "assign_returns_to_batch",
    "close_batch",
    "generate_debit_memos_for_batch",
    "submit_cardinal",
    "fix_batch_destinations",
    "get_batch_permissions",
    "list_debit_memos",
    "list_debit_memos_grouped_by_return",
    "get_debit_memo",
    "update_debit_memo",
    # RA & Shipment (17)
    "ra_send_request",
    "ra_update_request_status",
    "ra_receive",
    "ra_resend_request",
    "ra_list_tracking",
    "ra_list_outstanding",
    "ra_list_overdue",
    "ra_ship_debit_memo",
    "ra_list_outbound_shipments",
    "ra_generate_request_email",
    "ra_generate_reminder_email",
    "ra_list_tracking_grouped_by_return",
    "list_memos_for_group_shipping",
    "create_shipment_group",
    "ship_memo_group",
    "get_shipment_group_details",
    "list_shipped_shipment_groups",
    # Wine Cellar (3)
    # NOTE: add_to_wine_cellar, get_wine_cellar_item, update_wine_cellar_item,
    #       mark_wine_cellar_returned do not exist in source DB
    "list_wine_cellar_items",
    "check_and_surface_ready_items",
    "get_wine_cellar_stats",
    # Destruction (1)
    # NOTE: list_destruction_records, create_destruction_record, update_destruction_record
    #       do not exist in source — only the _for_transaction_item variant exists
    "create_destruction_record_for_transaction_item",
    # NDC Pricing (14)
    "search_ndc_pricing_book",
    "search_ndc_pricing",
    "search_ndc_pricing_v2",
    "search_ndc_pricing_v3",
    "search_ndc_pricing_fixed",
    "upsert_ndc_pricing",
    "get_ndc_pricing",
    "get_ndc_pricing_index",
    "get_ndc_pricing_intelligence",
    "get_destination_for_ndc",
    "delete_ndc_pricing",
    "resolve_ndc_price",
    "resolve_ndc_price_with_intelligence",
    "import_ndc_pricing_from_reports",
    "record_credit_memo_analysis",
    # Distributors (7)
    "get_admin_distributors_list",
    "get_admin_distributor_by_id",
    "create_admin_distributor",
    "update_admin_distributor",
    "update_admin_distributor_status",
    "delete_admin_distributor",
    "get_distributor_unique_products",
    # Payment Tracking (6)
    # NOTE: payment_send_reminder does not exist in source DB
    "payment_record",
    "payment_list_unpaid",
    "payment_ask_vs_received",
    "payment_manufacturer_summary",
    "payment_list_unpaid_grouped_by_return",
    "payment_list_paid_grouped_by_return",
    # FedEx (2)
    "save_fedex_shipment_data",
    "save_fedex_pickup_confirmation",
    # Email Management (1)
    "get_email_stats",
]

# ═══════════════════════════════════════════════════════════════════════════════
# BG ADMIN DB - Tables (verified against source DB)
# ═══════════════════════════════════════════════════════════════════════════════
BG_ADMIN_TABLES = [
    # Admin settings
    "admin_settings",
    "admin_recent_activity",
    "notifications",
    # Pharmacy
    "pharmacy",
    "pharmacy_invites",
    "pharmacy_branch_invites",           # correct name (was: pharmacy_branches)
    "pharmacy_branch_role_assignments",
    "pharmacy_roles",
    "pharmacy_permissions",
    "pharmacy_role_permissions",
    "pharmacy_notifications",
    "pharmacy_inventory_items",
    "pharmacy_inventory_uploads",
    "pharmacy_payments",
    "pharmacy_cart",
    "pharmacy_cart_items",
    # Processors
    "processors",
    "processor_store_assignments",
    "processor_notifications",
    # Returns
    "return_transactions",
    "return_transaction_items",
    "returns",
    "return_items",
    "return_reports",
    # Service requests
    "service_requests",
    "service_request_assignments",
    # Marketplace
    "marketplace_deals",
    "marketplace_listings",
    "marketplace_orders",
    "marketplace_order_items",
    # Inventory & products
    "inventory_items",
    "inventory_reminders",
    "products",
    "product_lists",
    "product_list_items",
    "pricing_data",
    # Packages
    "custom_packages",
    "custom_package_items",
    # Subscriptions
    "subscriptions",
    "subscription_plans",
    # Documents & tokens
    "uploaded_documents",
    "refresh_tokens",
    # Orders
    "orders",
    # Email & logs
    "email_logs",
    "processed_inbox_emails",
]

# ═══════════════════════════════════════════════════════════════════════════════
# BG ADMIN DB - RPC Functions (verified against source DB)
# ═══════════════════════════════════════════════════════════════════════════════
BG_ADMIN_FUNCTIONS = [
    # Admin Auth & Users (13)
    "validate_admin_tenant_access",
    "get_admin_users_list",
    "get_admin_user_by_id",
    "create_admin_user",
    "update_admin_user",
    "update_admin_password",
    "delete_admin_user",
    "get_admin_roles",
    "get_admin_profile",
    "reset_admin_own_password",
    "admin_request_password_reset",
    "admin_reset_password",
    "admin_verify_reset_token",
    # Admin Settings (4)
    "get_admin_settings",
    "update_admin_settings",
    "get_available_timezones",
    "get_available_languages",
    # Admin Dashboard & Activity (5)
    "get_admin_dashboard_stats",
    "get_admin_analytics",
    "get_admin_recent_activity",
    "mark_all_admin_activities_read",
    "mark_admin_activity_read",
    # Pharmacy Management (6)
    "get_admin_pharmacies_list",
    "get_admin_pharmacy_by_id",
    "admin_create_pharmacy",
    "update_admin_pharmacy",
    "update_admin_pharmacy_status",
    "validate_pharmacy_tenant_access",
    # Pharmacy Auth & Profile (3)
    # NOTE: get_pharmacy_by_id, update_pharmacy_profile do not exist in source DB
    "verify_pharmacy_invite",
    "complete_pharmacy_setup",
    "verify_pharmacy_switch_access",
    # Pharmacy Branches (8)
    "pharmacy_admin_create_branch",
    "get_pharmacy_branches",
    "get_branch_pharmacy_detail",
    "update_branch_pharmacy_status",
    "get_pending_branch_invites",
    "resend_branch_invite",
    "verify_branch_invite",
    "complete_branch_setup",
    # Pharmacy Branch Context (1)
    "get_pharmacy_context",
    # Pharmacy Roles & Permissions (9)
    "create_pharmacy_role",
    "list_pharmacy_roles",
    "get_pharmacy_role_detail",
    "update_pharmacy_role",
    "delete_pharmacy_role",
    "assign_role_to_branch",
    "remove_role_from_branch",
    "list_all_pharmacy_permissions",
    "get_branch_effective_permissions",
    # Processor Management (3)
    # NOTE: get_admin_processors_list, create_admin_processor, update_admin_processor,
    #       delete_admin_processor, list_processor_store_assignments do not exist in source DB
    "list_processor_notifications",
    "mark_processor_notification_read",
    "mark_all_processor_notifications_read",
    # Service Requests (8)
    "create_service_request",
    "list_pharmacy_service_requests",
    "cancel_pharmacy_service_request",
    "list_processor_service_requests",
    "claim_service_request",
    "list_admin_service_requests",
    "admin_reassign_service_request",
    "get_service_request_detail",
    # Marketplace — Admin (16)
    "get_marketplace_deals_list",
    "get_marketplace_deal_by_id",
    "create_marketplace_deal",
    "update_marketplace_deal",
    "delete_marketplace_deal",
    "get_marketplace_categories",
    "get_marketplace_stats",
    "mark_marketplace_deal_sold",
    "set_featured_deal",
    "unset_featured_deal",
    "get_featured_deal",
    "get_featured_deal_info",
    "get_all_featured_deals",
    "get_deal_of_the_day",
    "get_current_deal_of_the_day_info",
    "set_deal_of_the_day",
    "unset_deal_of_the_day",
    # Marketplace — Pharmacy (14)
    "get_pharmacy_marketplace_deals",
    "get_pharmacy_marketplace_deal_by_id",
    "get_manual_featured_deal",
    "get_all_manual_featured_deals",
    "get_pharmacy_marketplace_categories",
    "add_to_pharmacy_cart",
    "get_pharmacy_cart",
    "update_pharmacy_cart_item",
    "remove_from_pharmacy_cart",
    "clear_pharmacy_cart",
    "get_pharmacy_cart_count",
    "validate_pharmacy_cart",
    "create_marketplace_order_from_cart",
    "update_marketplace_order_payment",
    # Marketplace — Orders (3)
    "get_marketplace_order_by_id",
    "get_pharmacy_marketplace_orders",
    "cancel_marketplace_order",
    # Pharmacy Payments (9)
    "pharmacy_payment_calculate",
    "pharmacy_payment_create",
    "pharmacy_payment_update",
    "pharmacy_payment_get",
    "pharmacy_payment_list",
    "pharmacy_payment_summary",
    "pharmacy_payment_my_payments",
    "pharmacy_payment_check_pdf_data",
    "pharmacy_payment_generate_check_number",
    # Admin Payments (2)
    "get_admin_payments_list",
    "get_admin_payment_by_id",
    # Admin Documents (3)
    "get_admin_documents_list",
    "get_admin_document_by_id",
    "delete_admin_document",
    # Return Transactions (11)
    "create_return_transaction",
    "list_return_transactions",
    "get_return_transaction_by_id",
    "update_return_transaction",
    "change_return_transaction_status",
    "finalize_return_transaction",
    "update_finalize_steps",
    "get_manifest_data",
    "get_dea_form_222_data",
    "delete_return_transaction",
    "check_return_transaction_lock_status",
    # Return Transaction Items (9)
    "add_return_transaction_item",
    "add_return_transaction_item_with_validation",
    "list_return_transaction_items",
    "get_return_transaction_item",
    "update_return_transaction_item",
    "admin_set_item_standard_price",
    "delete_return_transaction_item",
    "delete_return_transaction_item_with_validation",
    "resolve_transaction_item_with_auto_destination",
    # Legacy Returns (3)
    "validate_legacy_return_update",
    "validate_legacy_return_deletion",
    "check_legacy_return_lock_status",
    # Pharmacy Dashboard & Inventory (5)
    "get_return_credit_summary",
    "get_historical_earnings",
    "get_pharmacy_inventory_summary",
    "get_pending_inventory_reminders",
    "get_earnings_estimation",
    # Pharmacy Reports (5)
    "list_pharmacy_report_returns",
    "get_pharmacy_return_packet",
    "get_pharmacy_controlled_substance_report",
    "get_pharmacy_destruction_controls",
    "get_pharmacy_destruction_non_controls",
    # Pharmacy Notifications (3)
    "list_pharmacy_notifications",
    "mark_pharmacy_notification_read",
    "mark_all_pharmacy_notifications_read",
    # Analytics & Reporting (9)
    "analytics_returns_summary",
    "analytics_ask_vs_received",
    "analytics_aging_inventory",
    "analytics_outstanding_ra",
    "analytics_unpaid_memos",
    "analytics_price_audit",
    "analytics_pharmacy_performance",
    "analytics_gpo_summary",
    "analytics_pharmacy_dashboard",
    # Optimization & Packages (6)
    "get_package_recommendations",
    "get_distributor_suggestions",
    "get_distributor_package_suggestion",
    "add_items_to_custom_package",
    "update_package_item",
    "delete_package_item",
]

# ═══════════════════════════════════════════════════════════════════════════════
# Cross-DB helper functions — reference tables from BOTH databases.
# They cannot work in either split DB and must be excluded from both.
# ═══════════════════════════════════════════════════════════════════════════════
CROSS_DB_HELPERS = {
    # ── Private helper functions ──────────────────────────────────────────────
    "_batch_to_json",                    # needs return_batches (Main)
    "_debit_memo_to_json",               # needs pharmacy (BG) + debit_memos (Main)
    "_get_debit_memo_return_id",         # needs return_transaction_items (BG) + debit_memo_items (Main)
    "_get_manufacturer_credits",         # needs pharmacy_payments (BG)
    "_ndc_pricing_to_json",              # needs ndc_pricing (Main)
    "_ndc_reliability_label",            # needs ndc_pricing (Main)
    "_pharmacy_payment_to_json",         # needs pharmacy_payments (BG) + return_batches (Main)
    "_pharmacy_reports_find_txn",        # needs return_transactions (BG)
    "_pharmacy_reports_header",          # needs pharmacy (BG) + processors (BG)
    "_pharmacy_reports_processor",       # needs processors (BG)
    "_ra_request_to_json",               # needs ra_requests (Main)
    "_resolve_pharmacy_name",            # needs pharmacy (BG)
    "_rt_to_json",                       # needs return_transactions (BG)
    "_rti_to_json",                      # needs return_transaction_items (BG)
    "_shipment_group_to_json",           # needs shipment_groups (Main)
    "_wc_to_json",                       # needs wine_cellar (Main)
    # ── RPC functions in Main Admin that reference BG Admin tables ────────────
    "warehouse_scan_box",                # needs return_transactions (BG)
    "warehouse_receive_return",          # needs return_transactions (BG)
    "warehouse_verify_return",           # needs return_transactions (BG)
    "warehouse_verify_item_v2",          # needs return_transactions (BG)
    "warehouse_start_verification",      # needs return_transactions (BG)
    "warehouse_complete_verification",   # needs return_transactions (BG)
    "warehouse_get_verification_summary",# needs return_transactions (BG)
    "assign_returns_to_batch",           # needs return_transactions (BG)
    "create_destruction_record_for_transaction_item",  # needs return_transaction_items (BG)
    "save_fedex_shipment_data",          # needs return_transactions (BG)
    "save_fedex_pickup_confirmation",    # needs return_transactions (BG)
}

print("=" * 80)
print("  SPLIT MIGRATION: SOURCE → MAIN ADMIN DB + BG ADMIN DB")
print("  Tables + Functions + Triggers + Data")
print("=" * 80)

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_column_type(data_type, max_len, udt_name):
    """Convert PostgreSQL column info to SQL type string."""
    if udt_name == 'uuid':
        return 'uuid'
    elif udt_name == 'jsonb':
        return 'jsonb'
    elif udt_name == 'json':
        return 'json'
    elif udt_name == 'timestamptz':
        return 'timestamptz'
    elif udt_name == 'timestamp':
        return 'timestamp'
    elif udt_name == 'date':
        return 'date'
    elif udt_name == 'time':
        return 'time'
    elif udt_name == 'timetz':
        return 'timetz'
    elif udt_name == 'int4':
        return 'integer'
    elif udt_name == 'int8':
        return 'bigint'
    elif udt_name == 'int2':
        return 'smallint'
    elif udt_name == 'bool':
        return 'boolean'
    elif udt_name == 'float8':
        return 'double precision'
    elif udt_name == 'float4':
        return 'real'
    elif udt_name == 'numeric':
        return 'numeric'
    elif udt_name == 'text':
        return 'text'
    elif udt_name == 'varchar' and max_len:
        return f'varchar({max_len})'
    elif udt_name == 'varchar':
        return 'varchar'
    elif udt_name == 'char' and max_len:
        return f'char({max_len})'
    elif data_type == 'ARRAY':
        return udt_name.lstrip('_') + '[]'
    elif udt_name.startswith('_'):
        return udt_name.lstrip('_') + '[]'
    else:
        return data_type


def get_pk_columns(cursor, table):
    """Get primary key columns for a table."""
    cursor.execute("""
        SELECT a.attname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.contype = 'p'
          AND c.conrelid = ('"public"."' || %s || '"')::regclass
        ORDER BY array_position(c.conkey, a.attnum)
    """, (table,))
    return [r[0] for r in cursor.fetchall()]


def ensure_extensions(cursor):
    """Create required extensions."""
    for ext in ["pg_trgm", "unaccent", "uuid-ossp", "pgcrypto"]:
        try:
            cursor.execute(f'CREATE EXTENSION IF NOT EXISTS "{ext}"')
        except Exception:
            pass


def wipe_destination(cursor, db_name):
    """Drop ALL tables, functions, and triggers from the destination database (public schema only)."""
    print(f"\n  Wiping destination {db_name}...")

    # 1. Drop all tables (CASCADE automatically drops dependent triggers, views, etc.)
    cursor.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
    """)
    tables = [r[0] for r in cursor.fetchall()]
    if tables:
        tbl_list = ', '.join(f'"public"."{t}"' for t in tables)
        try:
            cursor.execute(f'DROP TABLE IF EXISTS {tbl_list} CASCADE')
        except Exception:
            for t in tables:
                try:
                    cursor.execute(f'DROP TABLE IF EXISTS "public"."{t}" CASCADE')
                except Exception:
                    pass
    print(f"    Dropped {len(tables)} tables")

    # 2. Drop all functions and procedures
    cursor.execute("""
        SELECT p.oid, p.proname,
               pg_get_function_identity_arguments(p.oid) AS args,
               p.prokind
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    """)
    funcs = cursor.fetchall()
    fn_dropped = 0
    for oid, fname, args, kind in funcs:
        try:
            obj_type = 'PROCEDURE' if kind == 'p' else 'FUNCTION'
            cursor.execute(f'DROP {obj_type} IF EXISTS "public"."{fname}"({args}) CASCADE')
            fn_dropped += 1
        except Exception:
            pass
    print(f"    Dropped {fn_dropped} functions/procedures")

    print(f"    Destination {db_name} is now clean.")


def create_table_from_source(src_cursor, dst_cursor, table):
    """Create a table in destination based on source schema, including PK constraint."""
    try:
        src_cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default,
                   character_maximum_length, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table,))
        src_cols = src_cursor.fetchall()

        if not src_cols:
            return False

        # Get primary key columns from source
        src_cursor.execute("""
            SELECT a.attname
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE c.contype = 'p'
              AND c.conrelid = ('"public"."' || %s || '"')::regclass
            ORDER BY array_position(c.conkey, a.attnum)
        """, (table,))
        pk_cols = [r[0] for r in src_cursor.fetchall()]

        col_defs = []
        for col_name, data_type, nullable, default, max_len, udt_name in src_cols:
            t = get_column_type(data_type, max_len, udt_name)
            parts = [f'"{col_name}"', t]
            if default:
                parts.append(f"DEFAULT {default}")
            if nullable == 'NO':
                parts.append("NOT NULL")
            col_defs.append(" ".join(parts))

        if pk_cols:
            pk_def = ', '.join(f'"{c}"' for c in pk_cols)
            col_defs.append(f'PRIMARY KEY ({pk_def})')

        create_sql = f'CREATE TABLE IF NOT EXISTS "public"."{table}" ({", ".join(col_defs)})'
        dst_cursor.execute(create_sql)
        return True
    except Exception:
        return False


def sync_table_columns(src_cursor, dst_cursor, table):
    """Add missing columns to destination table."""
    try:
        src_cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default,
                   character_maximum_length, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table,))
        src_cols = src_cursor.fetchall()

        dst_cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
        """, (table,))
        dst_col_names = set(r[0] for r in dst_cursor.fetchall())

        cols_added = 0
        for col_name, data_type, nullable, default, max_len, udt_name in src_cols:
            if col_name in dst_col_names:
                continue
            try:
                t = get_column_type(data_type, max_len, udt_name)
                dst_cursor.execute(f'ALTER TABLE "public"."{table}" ADD COLUMN IF NOT EXISTS "{col_name}" {t}')
                cols_added += 1
                if default:
                    try:
                        dst_cursor.execute(f'ALTER TABLE "public"."{table}" ALTER COLUMN "{col_name}" SET DEFAULT {default}')
                    except Exception:
                        pass
            except Exception:
                pass
        return cols_added
    except Exception:
        return 0


def fetch_all_source_functions(src_cursor):
    """Fetch ALL function definitions from source (RPC + helpers + trigger functions)."""
    src_cursor.execute("""
        SELECT p.proname, pg_get_functiondef(p.oid), p.prokind
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
        ORDER BY p.proname
    """)
    all_fns = {}
    for fname, fdef, kind in src_cursor.fetchall():
        all_fns.setdefault(fname, []).append((fdef, kind))
    return all_fns


def copy_functions(src_cursor, dst_cursor, function_list, db_name, all_source_fns=None):
    """Copy RPC functions + all private helper functions they depend on."""
    print(f"\n  Copying functions to {db_name}...")

    if all_source_fns is None:
        all_source_fns = fetch_all_source_functions(src_cursor)

    # Copy private helper functions (start with _) — RPC functions call these
    # Exclude cross-DB helpers that reference tables from the other database
    helper_names = [n for n in all_source_fns
                    if n.startswith('_') and n not in CROSS_DB_HELPERS]

    fn_ok, fn_fail, fn_not_found = 0, 0, 0
    failed_names = []

    for func_name in helper_names + list(function_list):
        try:
            if func_name not in all_source_fns:
                if func_name not in helper_names:
                    fn_not_found += 1
                continue

            try:
                dst_cursor.execute(f'DROP FUNCTION IF EXISTS "public"."{func_name}" CASCADE')
            except Exception:
                pass

            for fdef, kind in all_source_fns[func_name]:
                try:
                    dst_cursor.execute(fdef)
                    fn_ok += 1
                except Exception as e:
                    fn_fail += 1
                    failed_names.append(f"{func_name}: {str(e).strip()[:100]}")
        except Exception as e:
            fn_fail += 1
            failed_names.append(f"{func_name}: {str(e).strip()[:100]}")

    if failed_names:
        print(f"    Failed functions:")
        for name in failed_names[:10]:
            print(f"      ✗ {name}")
        if len(failed_names) > 10:
            print(f"      ... and {len(failed_names) - 10} more")

    print(f"    Functions: {fn_ok} applied, {fn_fail} failed, {fn_not_found} not found in source")
    return fn_ok, fn_fail


def copy_triggers_for_tables(src_cursor, dst_cursor, table_list, db_name, all_source_fns=None):
    """Copy trigger functions then triggers for specific tables."""
    print(f"\n  Copying triggers to {db_name}...")

    if all_source_fns is None:
        all_source_fns = fetch_all_source_functions(src_cursor)

    table_set = set(table_list)

    # Step 1: Find which trigger functions are needed for these tables
    src_cursor.execute("""
        SELECT DISTINCT p.proname, pg_get_functiondef(p.oid)
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p ON p.oid = t.tgfoid
        JOIN pg_namespace pn ON pn.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND pn.nspname = 'public'
          AND NOT t.tgisinternal
          AND c.relname = ANY(%s)
    """, (list(table_set),))

    trig_fn_ok, trig_fn_fail = 0, 0
    for fn_name, fn_def in src_cursor.fetchall():
        try:
            dst_cursor.execute(f'DROP FUNCTION IF EXISTS "public"."{fn_name}" CASCADE')
        except Exception:
            pass
        try:
            dst_cursor.execute(fn_def)
            trig_fn_ok += 1
        except Exception:
            trig_fn_fail += 1

    print(f"    Trigger functions: {trig_fn_ok} applied, {trig_fn_fail} failed")

    # Step 2: Create the triggers themselves
    src_cursor.execute("""
        SELECT c.relname, pg_get_triggerdef(t.oid)
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
    """)

    trig_ok, trig_skip = 0, 0
    for table_name, trigdef in src_cursor.fetchall():
        if table_name not in table_set:
            continue

        safe_def = re.sub(r'^CREATE\s+TRIGGER', 'CREATE OR REPLACE TRIGGER', trigdef, flags=re.I)
        try:
            dst_cursor.execute(safe_def)
            trig_ok += 1
        except Exception:
            trig_match = re.search(r'TRIGGER\s+(\w+)\s+.*ON\s+"?(\w+)"?', trigdef, re.I)
            if trig_match:
                try:
                    dst_cursor.execute(f'DROP TRIGGER IF EXISTS "{trig_match.group(1)}" ON "public"."{trig_match.group(2)}"')
                    dst_cursor.execute(trigdef)
                    trig_ok += 1
                except Exception:
                    trig_skip += 1
            else:
                trig_skip += 1

    print(f"    Triggers: {trig_ok} applied, {trig_skip} skipped")
    return trig_ok, trig_skip


def copy_table_data(src_conn, dst_cursor, table, src_cursor):
    """Copy data from source table to destination table."""
    try:
        src_cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s ORDER BY ordinal_position
        """, (table,))
        src_col_names = [r[0] for r in src_cursor.fetchall()]

        if not src_col_names:
            return 0

        dst_cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
        """, (table,))
        dst_col_names = set(r[0] for r in dst_cursor.fetchall())

        common_cols = [c for c in src_col_names if c in dst_col_names]
        if not common_cols:
            return 0

        pk_cols = get_pk_columns(dst_cursor, table)

        cols_quoted = ', '.join(f'"{c}"' for c in common_cols)
        placeholders = ', '.join(['%s'] * len(common_cols))

        if pk_cols:
            conflict_cols = ', '.join(f'"{c}"' for c in pk_cols)
            insert_sql = (
                f'INSERT INTO "public"."{table}" ({cols_quoted}) '
                f'VALUES ({placeholders}) '
                f'ON CONFLICT ({conflict_cols}) DO NOTHING'
            )
        else:
            # No PK — safe to use plain INSERT since table was truncated before copy
            insert_sql = (
                f'INSERT INTO "public"."{table}" ({cols_quoted}) '
                f'VALUES ({placeholders})'
            )

        src_cursor.execute(f'SELECT COUNT(*) FROM "public"."{table}"')
        src_count = src_cursor.fetchone()[0]
        if src_count == 0:
            return 0

        sc2 = src_conn.cursor()
        sc2.execute(f'SELECT {cols_quoted} FROM "public"."{table}"')

        tbl_inserted = 0
        while True:
            try:
                rows = sc2.fetchmany(BATCH)
            except Exception:
                break
            if not rows:
                break
            try:
                psycopg2.extras.execute_batch(dst_cursor, insert_sql, rows, page_size=BATCH)
                tbl_inserted += len(rows)
            except Exception:
                for row in rows:
                    try:
                        dst_cursor.execute(insert_sql, row)
                        tbl_inserted += 1
                    except Exception:
                        pass

        sc2.close()
        return tbl_inserted
    except Exception:
        return 0


def migrate_database(src_conn, dst_conn, table_list, function_list, db_name):
    """Perform full migration for a destination database."""
    print("\n" + "=" * 80)
    print(f"  MIGRATING TO: {db_name}")
    print(f"  Tables: {len(table_list)}, Functions: {len(function_list)}")
    print("=" * 80)
    
    sc = src_conn.cursor()
    dc = dst_conn.cursor()

    # Step 1: Wipe destination completely (drop all tables, functions, triggers)
    print("\n  [1/6] Wiping destination database...")
    wipe_destination(dc, db_name)

    # Step 2: Ensure extensions
    print("\n  [2/6] Ensuring extensions...")
    ensure_extensions(dc)
    print("    Done.")

    # Step 3: Create tables fresh from source schema
    print("\n  [3/6] Creating table schemas...")
    tables_created, cols_added = 0, 0

    for tbl in table_list:
        try:
            if create_table_from_source(sc, dc, tbl):
                tables_created += 1
        except Exception:
            pass

    print(f"    Tables created: {tables_created}")

    # Step 4: Copy functions (fetch all source fns once, reuse for triggers)
    print("\n  [4/6] Copying functions...")
    all_source_fns = fetch_all_source_functions(sc)
    fn_ok, fn_fail = copy_functions(sc, dc, function_list, db_name, all_source_fns)

    # Step 5: Copy trigger functions + triggers
    print("\n  [5/6] Copying triggers...")
    trig_ok, trig_skip = copy_triggers_for_tables(sc, dc, table_list, db_name, all_source_fns)

    # Step 6: Copy data
    print("\n  [6/6] Copying data...")
    
    # Refresh dest table list after creates
    dc.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)
    dest_tables_now = set(r[0] for r in dc.fetchall())
    
    total_rows = 0
    tables_with_data = 0
    
    for tbl in table_list:
        try:
            if tbl not in dest_tables_now:
                continue
            rows_inserted = copy_table_data(src_conn, dc, tbl, sc)
            if rows_inserted > 0:
                total_rows += rows_inserted
                tables_with_data += 1
                print(f"    {tbl}: {rows_inserted} rows")
        except Exception:
            pass
    
    sc.close()
    dc.close()
    
    return {
        'tables_created': tables_created,
        'fn_ok': fn_ok,
        'fn_fail': fn_fail,
        'trig_ok': trig_ok,
        'trig_skip': trig_skip,
        'total_rows': total_rows,
        'tables_with_data': tables_with_data
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

print("\n[STEP 1] Connecting to databases...")

# Connect to source (read-only)
src = psycopg2.connect(SOURCE)
src.set_session(readonly=True, autocommit=True)
print("  ✓ Connected to SOURCE database")

# Connect to Main Admin destination
main_admin_dst = psycopg2.connect(MAIN_ADMIN_DEST)
main_admin_dst.autocommit = True
print("  ✓ Connected to MAIN ADMIN destination")

# Connect to BG Admin destination
bg_admin_dst = psycopg2.connect(BG_ADMIN_DEST)
bg_admin_dst.autocommit = True
print("  ✓ Connected to BG ADMIN destination")

# ═══════════════════════════════════════════════════════════════════════════════
# MIGRATE TO MAIN ADMIN DB
# ═══════════════════════════════════════════════════════════════════════════════
main_admin_stats = migrate_database(
    src, main_admin_dst,
    MAIN_ADMIN_TABLES, MAIN_ADMIN_FUNCTIONS,
    "MAIN ADMIN DB"
)

# ═══════════════════════════════════════════════════════════════════════════════
# MIGRATE TO BG ADMIN DB
# ═══════════════════════════════════════════════════════════════════════════════
bg_admin_stats = migrate_database(
    src, bg_admin_dst,
    BG_ADMIN_TABLES, BG_ADMIN_FUNCTIONS,
    "BG ADMIN DB"
)

# ═══════════════════════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════
src.close()
main_admin_dst.close()
bg_admin_dst.close()

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("  MIGRATION COMPLETE")
print("=" * 80)

print("\n  MAIN ADMIN DB Summary:")
print(f"    ✅ Tables    : {main_admin_stats['tables_created']} created fresh")
print(f"    ✅ Functions : {main_admin_stats['fn_ok']} applied, {main_admin_stats['fn_fail']} failed")
print(f"    ✅ Triggers  : {main_admin_stats['trig_ok']} applied, {main_admin_stats['trig_skip']} skipped")
print(f"    ✅ Data      : {main_admin_stats['total_rows']} rows across {main_admin_stats['tables_with_data']} tables")

print("\n  BG ADMIN DB Summary:")
print(f"    ✅ Tables    : {bg_admin_stats['tables_created']} created fresh")
print(f"    ✅ Functions : {bg_admin_stats['fn_ok']} applied, {bg_admin_stats['fn_fail']} failed")
print(f"    ✅ Triggers  : {bg_admin_stats['trig_ok']} applied, {bg_admin_stats['trig_skip']} skipped")
print(f"    ✅ Data      : {bg_admin_stats['total_rows']} rows across {bg_admin_stats['tables_with_data']} tables")

print("\n  ⚠️  SOURCE database was NOT modified (read-only)")
print("  ⚠️  DESTINATION databases were fully WIPED before migration")
print("=" * 80)
PYEOF
