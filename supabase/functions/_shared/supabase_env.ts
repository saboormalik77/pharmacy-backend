/**
 * Supabase CLI refuses `secrets set` for names starting with SUPABASE_*.
 * Optional EDGE_* secrets (and DATABASE_URL) can be pushed via --env-file;
 * functions fall back to platform-injected SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
 */
export function edgeSupabaseUrl(): string {
  return (
    Deno.env.get('EDGE_SUPABASE_URL')?.trim() ||
    Deno.env.get('SUPABASE_URL')?.trim() ||
    ''
  );
}

export function edgeSupabaseServiceRoleKey(): string {
  return (
    Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
    ''
  );
}

export function edgeSupabaseAnonKey(): string {
  return (
    Deno.env.get('EDGE_SUPABASE_ANON_KEY')?.trim() ||
    Deno.env.get('SUPABASE_ANON_KEY')?.trim() ||
    ''
  );
}
