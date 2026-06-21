import { createBrowserClient } from "@supabase/ssr";

let supabaseInstance: any = null;

/**
 * Lazy initialization of the Supabase client.
 * Prevents the app from crashing on start if environment variables are missing.
 */
export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
  }

  supabaseInstance = createBrowserClient(
    supabaseUrl,
    supabaseKey
  );

  return supabaseInstance;
};

// For backward compatibility with existing components
export const supabase = {
  get from() { return (table: string) => getSupabase().from(table); },
  get auth() { return getSupabase().auth; },
};
