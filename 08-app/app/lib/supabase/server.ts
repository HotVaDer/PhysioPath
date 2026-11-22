// The Supabase client for server code (pages, server actions, route handlers).
// It reads and writes the login cookies, so every query runs as the signed-in person and
// Row Level Security decides what they may see. Uses the publishable key only.
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { AUTH_COOKIE_OPTIONS } from "@/app/lib/supabase/cookies";

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  return { url, key };
}

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a page while rendering, where cookies are read-only. That's fine:
          // proxy.ts refreshes the session on every request and writes the cookies there.
        }
      },
    },
  });
}

export type Supabase = Awaited<ReturnType<typeof createClient>>;
