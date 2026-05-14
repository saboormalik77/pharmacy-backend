pip install psycopg2-binary -q && python3 << 'PYEOF'
import os, re, zipfile, psycopg2

PASSWORD = "Rx!Portal%239QmL7%40eV2"
SOURCE = f"postgresql://postgres.mxdzmfgkjktbvjeonwiq:{PASSWORD}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

OUTPUT_DIR = "rpc_functions"
ZIP_FILE   = "rpc_functions.zip"

print("=" * 60)
print("  RPC Function Exporter  (SOURCE → ZIP)")
print("=" * 60)

# ── CONNECT ──────────────────────────────────────────────────
print("\n[1/4] Connecting to source database...")
conn = psycopg2.connect(SOURCE)
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()
print("  Connected.")

# ── FETCH ALL FUNCTIONS ──────────────────────────────────────
print("\n[2/4] Fetching all RPC functions...")
cur.execute("""
    SELECT
        p.proname                                   AS func_name,
        pg_get_functiondef(p.oid)                   AS func_def,
        p.prokind                                   AS kind,
        pg_get_function_identity_arguments(p.oid)   AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
    ORDER BY p.proname, args
""")
rows = cur.fetchall()
print(f"  Found {len(rows)} function definitions.")

# ── WRITE TO FOLDER ──────────────────────────────────────────
print(f"\n[3/4] Writing SQL files to '{OUTPUT_DIR}/'...")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Track name collisions (overloaded functions) — append _1, _2 etc.
name_count = {}
files_written = 0

for func_name, func_def, kind, args in rows:
    # Build a safe filename
    # For overloaded functions, append argument types to make unique names
    if args:
        # Sanitize args for use in filename: keep only alphanum and underscore
        safe_args = re.sub(r'[^a-zA-Z0-9]', '_', args)
        safe_args = re.sub(r'_+', '_', safe_args).strip('_')
        filename = f"{func_name}__{safe_args}.sql"
    else:
        filename = f"{func_name}.sql"

    # Truncate very long filenames (max 200 chars before .sql)
    base = filename[:-4]
    if len(base) > 200:
        base = base[:200]
        filename = base + ".sql"

    # Handle any remaining collisions
    if filename in name_count:
        name_count[filename] += 1
        base = filename[:-4]
        filename = f"{base}_{name_count[filename]}.sql"
    else:
        name_count[filename] = 0

    filepath = os.path.join(OUTPUT_DIR, filename)

    # Write clean SQL content
    content = (
        f"-- Function : {func_name}\n"
        f"-- Arguments: {args if args else 'none'}\n"
        f"-- Type     : {'PROCEDURE' if kind == 'p' else 'FUNCTION'}\n"
        f"-- =============================================================\n\n"
        f"DROP {'PROCEDURE' if kind == 'p' else 'FUNCTION'} IF EXISTS "
        f"public.{func_name}({args}) CASCADE;\n\n"
        f"{func_def.rstrip()};\n"
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    files_written += 1

print(f"  Written {files_written} SQL files.")

# ── ZIP ───────────────────────────────────────────────────────
print(f"\n[4/4] Creating '{ZIP_FILE}'...")
with zipfile.ZipFile(ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
    for fname in sorted(os.listdir(OUTPUT_DIR)):
        if fname.endswith('.sql'):
            zf.write(os.path.join(OUTPUT_DIR, fname), arcname=os.path.join(OUTPUT_DIR, fname))

zip_size_kb = os.path.getsize(ZIP_FILE) / 1024
print(f"  ZIP created: {ZIP_FILE} ({zip_size_kb:.1f} KB)")

# ── CLEANUP ───────────────────────────────────────────────────
cur.close()
conn.close()

print("\n" + "=" * 60)
print(f"  ✅ {files_written} functions exported")
print(f"  ✅ ZIP : {ZIP_FILE}  ({zip_size_kb:.1f} KB)")
print(f"  ✅ DIR : {OUTPUT_DIR}/  ({files_written} .sql files)")
print("=" * 60)
PYEOF
