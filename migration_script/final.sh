pip install psycopg2-binary -q && python3 << 'PYEOF'
import re, sys, psycopg2, psycopg2.extras

PASSWORD = "Rx!Portal%239QmL7%40eV2"
SOURCE = f"postgresql://postgres.zggtgjbokgfsbenazzpx:{PASSWORD}@aws-1-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
DEST   = f"postgresql://postgres.mxdzmfgkjktbvjeonwiq:{PASSWORD}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

BATCH = 500

print("=" * 60)
print("  FULL Supabase Clone  (SOURCE → DEST)")
print("  Schema + Functions + Triggers + Data")
print("=" * 60)

# ── CONNECT ──────────────────────────────────────────────────
print("\n[1/6] Connecting...")
src = psycopg2.connect(SOURCE)
src.set_session(readonly=True, autocommit=True)
dst = psycopg2.connect(DEST)
dst.autocommit = True
sc = src.cursor()
dc = dst.cursor()
print("  Connected to both databases.")

# ── PHASE 1: EXTENSIONS ─────────────────────────────────────
print("\n[2/6] Ensuring extensions...")
for ext in ["pg_trgm", "unaccent", "uuid-ossp", "pgcrypto"]:
    try:
        dc.execute(f'CREATE EXTENSION IF NOT EXISTS "{ext}"')
    except Exception:
        pass
print("  Done.")

# ── PHASE 2: TABLES — create missing tables + add missing columns ──
print("\n[3/6] Syncing table schemas...")

sc.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
""")
source_tables = [r[0] for r in sc.fetchall()]

dc.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
""")
dest_tables = set(r[0] for r in dc.fetchall())

tables_created, cols_added = 0, 0

for tbl in source_tables:
    # Get source columns
    sc.execute("""
        SELECT column_name, data_type, is_nullable, column_default,
               character_maximum_length, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
    """, (tbl,))
    src_cols = sc.fetchall()
    if not src_cols:
        continue

    if tbl not in dest_tables:
        # Build CREATE TABLE from source column info
        col_defs = []
        for col_name, data_type, nullable, default, max_len, udt_name in src_cols:
            if udt_name == 'uuid':
                t = 'uuid'
            elif udt_name == 'jsonb':
                t = 'jsonb'
            elif udt_name == 'json':
                t = 'json'
            elif udt_name == 'timestamptz':
                t = 'timestamptz'
            elif udt_name == 'int4':
                t = 'integer'
            elif udt_name == 'int8':
                t = 'bigint'
            elif udt_name == 'int2':
                t = 'smallint'
            elif udt_name == 'bool':
                t = 'boolean'
            elif udt_name == 'float8':
                t = 'double precision'
            elif udt_name == 'float4':
                t = 'real'
            elif udt_name == 'numeric':
                t = 'numeric'
            elif udt_name == 'text':
                t = 'text'
            elif udt_name == 'varchar' and max_len:
                t = f'varchar({max_len})'
            elif data_type == 'ARRAY':
                t = udt_name.lstrip('_') + '[]'
            elif udt_name.startswith('_'):
                t = udt_name.lstrip('_') + '[]'
            else:
                t = data_type

            parts = [f'"{col_name}"', t]
            if default:
                parts.append(f"DEFAULT {default}")
            if nullable == 'NO':
                parts.append("NOT NULL")
            col_defs.append(" ".join(parts))

        create_sql = f'CREATE TABLE IF NOT EXISTS "public"."{tbl}" ({", ".join(col_defs)})'
        try:
            dc.execute(create_sql)
            tables_created += 1
        except Exception as e:
            print(f"  WARN: create {tbl}: {str(e)[:80]}")
    else:
        # Table exists — add any missing columns
        dc.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
        """, (tbl,))
        dest_cols = set(r[0] for r in dc.fetchall())

        for col_name, data_type, nullable, default, max_len, udt_name in src_cols:
            if col_name in dest_cols:
                continue
            if udt_name == 'uuid':
                t = 'uuid'
            elif udt_name == 'jsonb':
                t = 'jsonb'
            elif udt_name in ('int4', 'integer'):
                t = 'integer'
            elif udt_name in ('int8', 'bigint'):
                t = 'bigint'
            elif udt_name == 'bool':
                t = 'boolean'
            elif udt_name == 'timestamptz':
                t = 'timestamptz'
            elif udt_name == 'text':
                t = 'text'
            elif udt_name == 'numeric':
                t = 'numeric'
            elif data_type == 'ARRAY' or udt_name.startswith('_'):
                t = udt_name.lstrip('_') + '[]'
            else:
                t = data_type

            try:
                dc.execute(f'ALTER TABLE "public"."{tbl}" ADD COLUMN IF NOT EXISTS "{col_name}" {t}')
                cols_added += 1
                if default:
                    try:
                        dc.execute(f'ALTER TABLE "public"."{tbl}" ALTER COLUMN "{col_name}" SET DEFAULT {default}')
                    except Exception:
                        pass
            except Exception as e:
                print(f"  WARN: add {tbl}.{col_name}: {str(e)[:80]}")

print(f"  Tables created: {tables_created}, Columns added: {cols_added}")

# ── PHASE 3: FUNCTIONS (all RPC) ────────────────────────────
print("\n[4/6] Copying ALL functions...")
sc.execute("""
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
    ORDER BY p.proname
""")
fn_rows = sc.fetchall()
fn_ok, fn_fail = 0, 0
for (fndef,) in fn_rows:
    try:
        dc.execute(fndef)
        fn_ok += 1
    except Exception as e:
        fn_fail += 1
        if fn_fail <= 5:
            name_match = re.search(r'FUNCTION\s+([\w.]+)', fndef)
            fname = name_match.group(1) if name_match else '?'
            print(f"  WARN: {fname}: {str(e).strip()[:80]}")
if fn_fail > 5:
    print(f"  ... and {fn_fail - 5} more function warnings")
print(f"  Functions: {fn_ok} applied, {fn_fail} warnings")

# ── PHASE 4: TRIGGERS ───────────────────────────────────────
print("\n[5/6] Copying triggers...")
sc.execute("""
    SELECT pg_get_triggerdef(t.oid)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
""")
trig_rows = sc.fetchall()
trig_ok, trig_skip = 0, 0
for (trigdef,) in trig_rows:
    # Convert CREATE TRIGGER to CREATE OR REPLACE TRIGGER for idempotency
    safe_def = re.sub(r'^CREATE\s+TRIGGER', 'CREATE OR REPLACE TRIGGER', trigdef, flags=re.I)
    try:
        dc.execute(safe_def)
        trig_ok += 1
    except Exception:
        # Older PG: drop then create
        trig_match = re.search(r'TRIGGER\s+(\w+)\s+.*ON\s+"?(\w+)"?', trigdef, re.I)
        if trig_match:
            try:
                dc.execute(f'DROP TRIGGER IF EXISTS "{trig_match.group(1)}" ON "public"."{trig_match.group(2)}"')
                dc.execute(trigdef)
                trig_ok += 1
            except Exception:
                trig_skip += 1
        else:
            trig_skip += 1
print(f"  Triggers: {trig_ok} applied, {trig_skip} skipped")

# ── PHASE 5: DATA MERGE ─────────────────────────────────────
print("\n[6/6] Merging data (SOURCE → DEST, existing DEST rows kept)...")

def get_pk_columns(cursor, table):
    cursor.execute("""
        SELECT a.attname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.contype = 'p'
          AND c.conrelid = ('"public"."' || %s || '"')::regclass
        ORDER BY array_position(c.conkey, a.attnum)
    """, (table,))
    return [r[0] for r in cursor.fetchall()]

# Refresh dest table list after creates
dc.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
""")
dest_tables_now = set(r[0] for r in dc.fetchall())

total_rows_inserted = 0
tables_merged = 0
tables_skipped = 0

for tbl in source_tables:
    if tbl not in dest_tables_now:
        continue

    pk_cols = get_pk_columns(dc, tbl)
    if not pk_cols:
        tables_skipped += 1
        continue

    # Get column names that exist in BOTH source and dest
    sc.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s ORDER BY ordinal_position
    """, (tbl,))
    src_col_names = [r[0] for r in sc.fetchall()]

    dc.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
    """, (tbl,))
    dst_col_names = set(r[0] for r in dc.fetchall())

    common_cols = [c for c in src_col_names if c in dst_col_names]
    if not common_cols:
        continue

    cols_quoted = ', '.join(f'"{c}"' for c in common_cols)
    placeholders = ', '.join(['%s'] * len(common_cols))
    conflict_cols = ', '.join(f'"{c}"' for c in pk_cols)

    insert_sql = (
        f'INSERT INTO "public"."{tbl}" ({cols_quoted}) '
        f'VALUES ({placeholders}) '
        f'ON CONFLICT ({conflict_cols}) DO NOTHING'
    )

    # Count source rows
    sc.execute(f'SELECT COUNT(*) FROM "public"."{tbl}"')
    src_count = sc.fetchone()[0]
    if src_count == 0:
        continue

    # Batch fetch and insert
    sc2 = src.cursor('src_cursor_' + tbl.replace('-', '_'))
    sc2.execute(f'SELECT {cols_quoted} FROM "public"."{tbl}"')

    tbl_inserted = 0
    while True:
        rows = sc2.fetchmany(BATCH)
        if not rows:
            break
        try:
            psycopg2.extras.execute_batch(dc, insert_sql, rows, page_size=BATCH)
        except Exception as e:
            # Fall back to row-by-row for this batch
            for row in rows:
                try:
                    dc.execute(insert_sql, row)
                    tbl_inserted += 1
                except Exception:
                    pass
            continue
        tbl_inserted += len(rows)

    sc2.close()
    total_rows_inserted += tbl_inserted
    tables_merged += 1
    if tbl_inserted > 0:
        print(f"  {tbl}: {tbl_inserted} / {src_count} rows merged")

# ── DONE ─────────────────────────────────────────────────────
sc.close()
dc.close()
src.close()
dst.close()

print("\n" + "=" * 60)
print(f"  ✅  Functions  : {fn_ok} applied")
print(f"  ✅  Triggers   : {trig_ok} applied")
print(f"  ✅  Tables     : {tables_created} created, {cols_added} columns added")
print(f"  ✅  Data       : {total_rows_inserted} rows merged across {tables_merged} tables")
print(f"  ⏩  Skipped    : {tables_skipped} tables (no primary key — schema only)")
print(f"\n  DEST data preserved. SOURCE not modified.")
print("=" * 60)
PYEOF
