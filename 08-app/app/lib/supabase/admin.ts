// The Supabase client with the SECRET key. It bypasses Row Level Security, so it's used for one
// job only: sending staff invites by email after the owner files the form. Never import it in
// a Client Component ("server-only" makes the build fail if someone tries).
import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseEnv } from "@/app/lib/supabase/server";

// null when the key isn't set yet (local setup); callers then skip sending and say so.
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return null;
  return createClient(supabaseEnv().url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

// A client with no login at all, for sending a sign-in link to someone else (an invitee who
// already has an account). It has no cookies, so it can't touch the owner's session.
export function createAnonClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
