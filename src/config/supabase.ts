import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import WebSocket from 'ws';

// Load environment variables
// Vercel provides env vars directly, so only load .env.local in development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config({ path: '.env.local' });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const bgSupabaseUrl = process.env.BG_SUPABASE_URL;
const bgSupabaseAnonKey = process.env.BG_SUPABASE_ANON_KEY;
const bgSupabaseServiceKey = process.env.BG_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

if (!bgSupabaseUrl || !bgSupabaseAnonKey) {
  throw new Error('Missing BG Supabase environment variables');
}

// Custom fetch with longer timeout (60 seconds) for slow network connections
const customFetch = (url: string | Request | URL, options?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
};

// Client with anon key (subject to RLS policies)
// Note: We handle token refresh manually through our API endpoints
// so we disable auto-refresh to have full control over token lifecycle
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false, // We handle refresh manually via /api/auth/refresh
    persistSession: false, // Server-side doesn't need session persistence
  },
  global: {
    fetch: customFetch,
  },
  realtime: {
    // Node.js < 22 needs a WebSocket implementation for Supabase realtime
    transport: WebSocket as unknown as any,
  },
});

// Client with service role key (bypasses RLS - use for admin operations)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: customFetch,
      },
      realtime: {
        transport: WebSocket as unknown as any,
      },
    })
  : null;

// BG Admin DB client (anon — for non-privileged BG reads)
export const bgSupabase = createClient(bgSupabaseUrl!, bgSupabaseAnonKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: customFetch,
  },
  realtime: {
    transport: WebSocket as unknown as any,
  },
});

// BG Admin DB client with service role key (bypasses RLS)
export const bgSupabaseAdmin = bgSupabaseServiceKey
  ? createClient(bgSupabaseUrl!, bgSupabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: customFetch,
      },
      realtime: {
        transport: WebSocket as unknown as any,
      },
    })
  : null;

