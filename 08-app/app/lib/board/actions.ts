"use server";
// What staff press on a card of the room board. Every role can (assistants too), in their own clinic:
// the database allows only these columns, and only while the card is open (20261116000000).
//   «Το είδα»  clears the call, but only the call they saw: if the patient called again since (a newer
//             call_at, e.g. pain after a question), nothing is cleared and the board shows the new one.
//   «Τέλος»    closes the card; the patient's phone then shows the home program (the database stamps
//             the time and clears any call).
// 0 rows changed means someone else got there first; the board then just refreshes.
import * as z from "zod";

import { requireMember } from "@/app/lib/onboarding/session";

export type BoardActionResult = { ok: true } | { ok: false; message: string };

const ALREADY = "Άλλαξε ήδη από κάποιον άλλον. Η αίθουσα ανανεώθηκε.";
const FAILED = "Δεν έγινε. Δοκιμάστε ξανά.";
const Id = z.uuid();

export async function seeCall(sessionId: string, callAt: string): Promise<BoardActionResult> {
  if (!Id.safeParse(sessionId).success || typeof callAt !== "string" || callAt.length > 64) return { ok: false, message: FAILED };
  const { supabase } = await requireMember();
  const { data, error } = await supabase
    .from("sessions")
    .update({ call_reason: null, call_at: null })
    .eq("id", sessionId)
    .eq("call_at", callAt)
    .is("finished_at", null)
    .select("id");
  if (error) return { ok: false, message: FAILED };
  return data.length ? { ok: true } : { ok: false, message: ALREADY };
}

export async function finishCard(sessionId: string): Promise<BoardActionResult> {
  if (!Id.safeParse(sessionId).success) return { ok: false, message: FAILED };
  const { supabase } = await requireMember();
  const { data, error } = await supabase
    .from("sessions")
    .update({ finished_at: new Date().toISOString() }) // the database uses its own clock instead
    .eq("id", sessionId)
    .is("finished_at", null)
    .select("id");
  if (error) return { ok: false, message: FAILED };
  return data.length ? { ok: true } : { ok: false, message: ALREADY };
}
