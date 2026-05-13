pip install psycopg2-binary -q && python3 <<'PY'
import os, psycopg2

# Set this to the DB you want to EXPORT from (URL-encoded password in URI).
PASSWORD = "Rx!Portal%239QmL7%40eV2"
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"postgresql://postgres.mxdzmfgkjktbvjeonwiq:{PASSWORD }@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("""
  SELECT pg_get_functiondef(p.oid) || E';\\n'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
  ORDER BY p.proname, p.oid
""")
out = "all_public_functions.sql"
with open(out, "w") as f:
    for (ddl,) in cur.fetchall():
        f.write(ddl + "\n")
cur.close()
conn.close()
print("Wrote", out)
PY