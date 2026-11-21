// Plumbing shared by the two route handlers (app/api/transcribe, app/api/generate):
// who may call them, size limits, and errors as { error } JSON with a Greek message.
import "server-only";

import { aiRefusal } from "@/app/lib/notes/ai-limits";
import { loadProfile, currentUser, type Profile } from "@/app/lib/onboarding/session";
import type { Supabase } from "@/app/lib/supabase/server";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Only an owner or a physio records notes. Assistants and strangers get 403/401, never a redirect
// (these are called with fetch, not opened as pages).
export async function requirePhysioApi(): Promise<{ supabase: Supabase; profile: Profile }> {
  const { supabase, user } = await currentUser();
  if (!user) throw new HttpError(401, "Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.");
  const profile = await loadProfile(supabase, user.id);
  if (!profile?.clinic_id) throw new HttpError(401, "Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.");
  if (profile.role === "assistant") throw new HttpError(403, "Μόνο οι φυσιοθεραπευτές γράφουν σημειώσεις.");
  return { supabase, profile };
}

// Counts one paid AI call in the database (public.use_ai, migration 20261119120000_ai_limits.sql)
// before the AI is called. Over a limit → 429 with a Greek message, and the AI is never called.
// The database does the counting, so a script calling our routes can't get around it.
export async function countAiCall(supabase: Supabase, kind: "generate" | "transcribe"): Promise<void> {
  const { error } = await supabase.rpc("use_ai", { p_kind: kind });
  if (!error) return;
  const refusal = aiRefusal(error.message);
  if (refusal) throw new HttpError(refusal.status, refusal.message);
  throw new Error(`use_ai failed: ${error.message}`); // → 500, details in the server log only
}

// Reads the body but stops as soon as it passes the limit, so a huge upload is never held in memory.
// Vercel refuses anything over 4.5 MB before it reaches us, so the limit here is a little lower.
export async function readBody(request: Request, limit: number, tooLarge: string): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > limit) throw new HttpError(413, tooLarge);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, tooLarge);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const json = (status: number, data: unknown) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

// Runs a route: the result as JSON, known errors as { error } with their status, anything else as 500
// (details in the server log only).
export async function respond(fn: () => Promise<unknown>, known: (new (...args: never[]) => Error)[] = []): Promise<Response> {
  try {
    return json(200, await fn());
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message });
    if (known.some((type) => error instanceof type)) return json(502, { error: (error as Error).message });
    console.error(error);
    return json(500, { error: "Κάτι πήγε στραβά. Δοκιμάστε ξανά." });
  }
}
