// The patient's phone talks to the database through these two functions, and only these.
// The phone has no login: the secret is the token in the /s/<token> link. The calls go through the
// publishable key with no cookies (createAnonClient), to the two functions granted to anon in
// 20261116000000 / 20261118000000. Never the secret key, never a table directly, never the note.
import "server-only";

import * as z from "zod";

import { readPatientView, type PatientAction, type PatientView } from "@/app/lib/board/session";
import { createAnonClient } from "@/app/lib/supabase/admin";

// Anything that isn't a uuid never reaches the database (a typo, a scanner trying paths).
const isToken = (token: string) => z.uuid().safeParse(token).success;

// The session as the phone shows it. null: no such session (wrong or made-up token).
export async function loadPatientView(token: string): Promise<PatientView | null> {
  if (!isToken(token)) return null;
  const { data, error } = await createAnonClient().rpc("patient_session", { p_token: token });
  if (error) throw error;
  return readPatientView(data);
}

// One tap. The database counts a double tap once and changes nothing after «Τέλος»; either way
// it answers with the session as it is now, so the phone shows the truth.
export async function sendPatientAction(token: string, action: PatientAction): Promise<PatientView | null> {
  if (!isToken(token)) return null;
  const { data, error } = await createAnonClient().rpc("patient_action", {
    p_token: token,
    p_type: action.type,
    p_exercise: "exercise" in action ? action.exercise : null,
    p_set: "set" in action ? action.set : null,
    p_reason: action.type === "call" ? action.reason : null,
  });
  if (error) throw error;
  return readPatientView(data);
}
