pip install psycopg2-binary -q && python3 << 'PYEOF'
import os, re, zipfile, psycopg2

PASSWORD = "Rx!Portal%239QmL7%40eV2"
SOURCE = f"postgresql://postgres.mxdzmfgkjktbvjeonwiq:{PASSWORD}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

OUTPUT_DIR = "tables_export"
ZIP_FILE   = "tables_export.zip"

print("=" * 60)
print("  Table Exporter  (SOURCE → ZIP)")
print("  Includes: Schema + Indexes + Constraints + Policies")
print("=" * 60)

# ── CONNECT ──────────────────────────────────────────────────
print("\n[1/5] Connecting to source database...")
conn = psycopg2.connect(SOURCE)
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()
print("  Connected.")

# ── FETCH ALL TABLES ─────────────────────────────────────────
print("\n[2/5] Fetching table list...")
cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
""")
tables = [r[0] for r in cur.fetchall()]
print(f"  Found {len(tables)} tables.")

# ── HELPERS ───────────────────────────────────────────────────

def get_columns(cursor, table):
    cursor.execute("""
        SELECT
            c.column_name,
            c.data_type,
            c.udt_name,
            c.character_maximum_length,
            c.is_nullable,
            c.column_default,
            c.ordinal_position
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = %s
        ORDER BY c.ordinal_position
    """, (table,))
    return cursor.fetchall()

def get_constraints(cursor, table):
    cursor.execute("""
        SELECT
            con.conname                         AS constraint_name,
            con.contype                         AS constraint_type,
            pg_get_constraintdef(con.oid, true) AS definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public' AND rel.relname = %s
        ORDER BY con.contype, con.conname
    """, (table,))
    return cursor.fetchall()

def get_indexes(cursor, table):
    cursor.execute("""
        SELECT
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = %s
        ORDER BY indexname
    """, (table,))
    return cursor.fetchall()

def get_policies(cursor, table):
    cursor.execute("""
        SELECT
            pol.polname                                     AS policy_name,
            CASE pol.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                ELSE 'ALL'
            END                                             AS command,
            CASE pol.polpermissive
                WHEN true THEN 'PERMISSIVE'
                ELSE 'RESTRICTIVE'
            END                                             AS permissive,
            pg_get_expr(pol.polqual, pol.polrelid, true)    AS using_expr,
            pg_get_expr(pol.polwithcheck, pol.polrelid, true) AS check_expr,
            array_to_string(pol.polroles::text[], ', ')     AS roles
        FROM pg_policy pol
        JOIN pg_class rel ON rel.oid = pol.polrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public' AND rel.relname = %s
        ORDER BY pol.polname
    """, (table,))
    return cursor.fetchall()

def get_rls_enabled(cursor, table):
    cursor.execute("""
        SELECT relrowsecurity, relforcerowsecurity
        FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname = 'public' AND pg_class.relname = %s
    """, (table,))
    row = cursor.fetchone()
    return row if row else (False, False)

def col_type_str(data_type, udt_name, max_len):
    if udt_name == 'uuid':           return 'uuid'
    if udt_name == 'jsonb':          return 'jsonb'
    if udt_name == 'json':           return 'json'
    if udt_name == 'timestamptz':    return 'timestamptz'
    if udt_name == 'timestamp':      return 'timestamp'
    if udt_name == 'date':           return 'date'
    if udt_name == 'time':           return 'time'
    if udt_name == 'int4':           return 'integer'
    if udt_name == 'int8':           return 'bigint'
    if udt_name == 'int2':           return 'smallint'
    if udt_name == 'bool':           return 'boolean'
    if udt_name == 'float8':         return 'double precision'
    if udt_name == 'float4':         return 'real'
    if udt_name == 'numeric':        return 'numeric'
    if udt_name == 'text':           return 'text'
    if udt_name == 'varchar' and max_len: return f'varchar({max_len})'
    if udt_name == 'varchar':        return 'varchar'
    if udt_name == 'char' and max_len:    return f'char({max_len})'
    if data_type == 'ARRAY' or udt_name.startswith('_'):
        return udt_name.lstrip('_') + '[]'
    return data_type

# ── WRITE SQL FILES ───────────────────────────────────────────
print(f"\n[3/5] Writing SQL files to '{OUTPUT_DIR}/'...")
os.makedirs(OUTPUT_DIR, exist_ok=True)

files_written  = 0
total_policies = 0
total_indexes  = 0

for table in tables:
    lines = []
    lines.append(f"-- ============================================================")
    lines.append(f"-- Table   : public.{table}")
    lines.append(f"-- ============================================================")
    lines.append("")

    # ── DROP + CREATE TABLE ──────────────────────────────────
    lines.append(f"DROP TABLE IF EXISTS public.\"{table}\" CASCADE;")
    lines.append("")
    lines.append(f"CREATE TABLE public.\"{table}\" (")

    columns = get_columns(cur, table)
    constraints = get_constraints(cur, table)

    col_lines = []
    for col_name, data_type, udt_name, max_len, nullable, default, _ in columns:
        t = col_type_str(data_type, udt_name, max_len)
        parts = [f'    "{col_name}" {t}']
        if default:
            parts.append(f'DEFAULT {default}')
        if nullable == 'NO':
            parts.append('NOT NULL')
        col_lines.append(' '.join(parts))

    # Inline PRIMARY KEY constraint
    pk_constraints = [(n, t, d) for n, t, d in constraints if t == 'p']
    for con_name, con_type, con_def in pk_constraints:
        col_lines.append(f'    CONSTRAINT "{con_name}" {con_def}')

    lines.append(',\n'.join(col_lines))
    lines.append(");")
    lines.append("")

    # ── UNIQUE + CHECK + FK CONSTRAINTS ─────────────────────
    other_constraints = [(n, t, d) for n, t, d in constraints if t != 'p']
    if other_constraints:
        lines.append("-- Constraints")
        for con_name, con_type, con_def in other_constraints:
            con_label = {'u': 'UNIQUE', 'c': 'CHECK', 'f': 'FOREIGN KEY', 'x': 'EXCLUSION'}.get(con_type, con_type)
            lines.append(f'ALTER TABLE public."{table}"')
            lines.append(f'    ADD CONSTRAINT "{con_name}" {con_def};')
            lines.append("")

    # ── INDEXES ──────────────────────────────────────────────
    indexes = get_indexes(cur, table)
    # Skip PK indexes (already created via constraint)
    pk_names = {n for n, t, d in pk_constraints}
    non_pk_indexes = [(iname, idef) for iname, idef in indexes if iname not in pk_names]
    if non_pk_indexes:
        lines.append("-- Indexes")
        for idx_name, idx_def in non_pk_indexes:
            # Make idempotent
            safe_def = re.sub(r'^CREATE\s+(UNIQUE\s+)?INDEX\s+',
                              lambda m: f'CREATE {m.group(1) or ""}INDEX IF NOT EXISTS ',
                              idx_def, flags=re.I)
            lines.append(f"{safe_def};")
        lines.append("")
        total_indexes += len(non_pk_indexes)

    # ── ROW LEVEL SECURITY ────────────────────────────────────
    rls_enabled, rls_forced = get_rls_enabled(cur, table)
    if rls_enabled:
        lines.append("-- Row Level Security")
        lines.append(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY;')
        if rls_forced:
            lines.append(f'ALTER TABLE public."{table}" FORCE ROW LEVEL SECURITY;')
        lines.append("")

    # ── POLICIES ─────────────────────────────────────────────
    policies = get_policies(cur, table)
    if policies:
        lines.append("-- Policies")
        for pol_name, command, permissive, using_expr, check_expr, roles in policies:
            role_clause = f' TO {roles}' if roles and roles != '0' else ' TO public'
            using_clause = f'\n    USING ({using_expr})' if using_expr else ''
            check_clause = f'\n    WITH CHECK ({check_expr})' if check_expr else ''

            lines.append(f'DROP POLICY IF EXISTS "{pol_name}" ON public."{table}";')
            lines.append(
                f'CREATE POLICY "{pol_name}"'
                f'\n    ON public."{table}"'
                f'\n    AS {permissive}'
                f'\n    FOR {command}'
                f'{role_clause}'
                f'{using_clause}'
                f'{check_clause};'
            )
            lines.append("")
        total_policies += len(policies)

    # ── WRITE FILE ────────────────────────────────────────────
    filepath = os.path.join(OUTPUT_DIR, f"{table}.sql")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    files_written += 1

print(f"  Written {files_written} table files  ({total_indexes} indexes, {total_policies} policies)")

# ── WRITE MASTER FILE ─────────────────────────────────────────
print(f"\n[4/5] Writing master file (all_tables.sql)...")
master_path = os.path.join(OUTPUT_DIR, '_all_tables.sql')
with open(master_path, 'w', encoding='utf-8') as master:
    master.write("-- ============================================================\n")
    master.write("-- MASTER FILE: All tables, indexes, constraints, and policies\n")
    master.write(f"-- Tables: {len(tables)}\n")
    master.write("-- Run this file to recreate the entire public schema\n")
    master.write("-- ============================================================\n\n")
    for table in tables:
        filepath = os.path.join(OUTPUT_DIR, f"{table}.sql")
        with open(filepath, 'r', encoding='utf-8') as f:
            master.write(f.read())
        master.write("\n")
print("  Done.")

# ── ZIP ───────────────────────────────────────────────────────
print(f"\n[5/5] Creating '{ZIP_FILE}'...")
with zipfile.ZipFile(ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
    for fname in sorted(os.listdir(OUTPUT_DIR)):
        if fname.endswith('.sql'):
            zf.write(os.path.join(OUTPUT_DIR, fname),
                     arcname=os.path.join(OUTPUT_DIR, fname))

zip_size_kb = os.path.getsize(ZIP_FILE) / 1024
print(f"  ZIP created: {ZIP_FILE} ({zip_size_kb:.1f} KB)")

# ── CLEANUP ───────────────────────────────────────────────────
cur.close()
conn.close()

print("\n" + "=" * 60)
print(f"  ✅ Tables    : {files_written}")
print(f"  ✅ Indexes   : {total_indexes}")
print(f"  ✅ Policies  : {total_policies}")
print(f"  ✅ ZIP  : {ZIP_FILE}  ({zip_size_kb:.1f} KB)")
print(f"  ✅ DIR  : {OUTPUT_DIR}/  ({files_written + 1} files incl. _all_tables.sql)")
print("=" * 60)
PYEOF
