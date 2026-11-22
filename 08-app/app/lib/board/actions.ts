"use server";
// What staff press on a card of the room board. Every role can (assistants too), in the clinic open now.
// Users can't write to the tables themselves (20261122150000): these call checked database functions.
//   «Το είδα»  see_call clears the call, but only the call they saw: if the patient called again since (a
//             newer call_at, e.g. pain after a question), nothing is cleared and the board shows the new one.
//   «Τέλος»    finish_card closes the card; the patient's phone then shows the home program (the database
//             stamps the time and clears any call).
// false (nothing changed) means someone else got there first; the board then just refreshes.
import * as z from "zod";

import { requireMember } from "@/app/lib/onboarding/session";

export type BoardActionResult = { ok: true } | { ok: false; message: string };

const ALREADY = "Άλλαξε ήδη από κάποιον άλλον. Η αίθουσα ανανεώθηκε.";
const FAILED = "Δεν έγινε. Δοκιμάστε ξανά.";
const Id = z.uuid();

export async function seeCall(sessionId: string, callAt: string): Promise<BoardActionResult> {
  if (!Id.safeParse(sessionId).success || typeof callAt !== "string" || callAt.length > 64) return { ok: false, message: FAILED };
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("see_call", { p_session_id: sessionId, p_call_at: callAt });
  if (error) return { ok: false, message: FAILED };
  return data === true ? { ok: true } : { ok: false, message: ALREADY };
}

export async function finishCard(sessionId: string): Promise<BoardActionResult> {
  if (!Id.safeParse(sessionId).success) return { ok: false, message: FAILED };
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("finish_card", { p_session_id: sessionId });
  if (error) return { ok: false, message: FAILED };
  return data === true ? { ok: true } : { ok: false, message: ALREADY };
}
