import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Credentials are injected via the MCP host config (claude_desktop_config.json env block)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. " +
      "Copy .env.example to .env and fill in your credentials."
  );
}

/**
 * Admin Supabase client using the service role key.
 * Bypasses Row Level Security — use carefully.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
