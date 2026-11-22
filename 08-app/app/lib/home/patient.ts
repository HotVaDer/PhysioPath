// The patient's letter (/p/<token>) saves a press through this, and only this: the database function
// home_log (20261123120000), with the publishable key and no cookies (createAnonClient). The phone sends
// only its token; the function takes the clinic, program and patient from the program row itself.
import "server-only";

import * as z from "zod";

import { LogAnswer, type LogChange } from "@/app/lib/home/log";
import { createAnonClient } from "@/app/lib/supabase/admin";

// What home_log refuses with (the page never sends these; a script might).
const REFUSALS = new Set(["no such exercise", "day out of range", "bad status", "pain is 0 to 10", "note too long"]);

export class RefusedChange extends Error {}

// null: no program has this token (wrong link, or «Νέος σύνδεσμος» replaced it).
export async function saveHomeLog(token: string, change: LogChange): Promise<LogAnswer | null> {
  if (!z.uuid().safeParse(token).success) return null;
  const { data, error } = await createAnonClient().rpc("home_log", {
    p_token: token,
    p_day: change.day,
    p_exercise: change.exercise,
    p_status: change.status,
    p_pain: change.pain,
    p_note: change.note,
  });
  if (error) {
    if (REFUSALS.has(error.message)) throw new RefusedChange(error.message);
    throw new Error(`home_log failed: ${error.message}`);
  }
  if (data === null) return null;
  return LogAnswer.parse(data);
}
