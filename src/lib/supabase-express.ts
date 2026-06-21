import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type Request, type Response } from "express";

/**
 * Creates a Supabase client for use in Express routes.
 * Handles cookie synchronization between Supabase and Express.
 */
export const createExpressClient = (req: Request, res: Response) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing in environment variables.");
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({
            name,
            value: req.cookies[name],
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookie(name, value, options as CookieOptions);
          });
        },
      },
    }
  );
};
