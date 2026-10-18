// One patient's session in the room: today's exercises, how many sets are done, and whether they
// need the physio. Pure functions, shared by the server (store, API) and the browser (screens),
// so the rules live in one place and are easy to test.
import * as z from "zod";

import { isBlank } from "@/app/lib/format";
import { ClinicalNote, PatientProgram } from "@/app/lib/schema";

export const SESSION_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]{6,12}$/;

export const CallReason = z.enum(["question", "pain"]);
export type CallReason = z.infer<typeof CallReason>;

export const Session = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  program: PatientProgram,
  note: ClinicalNote, // stays on the physio's side: patientView() leaves it out
  setsDone: z.array(z.number().int().min(0)), // one count per exercise
  call: z.object({ reason: CallReason, at: z.string() }).nullable(),
  finishedAt: z.string().nullable(), // when the physio closed the session
  approvedId: z.string().nullable(), // the home program it became (output/<id>.json)
});
export type Session = z.infer<typeof Session>;

// What the patient's screen may send. A set is named by its number, so a double tap or a
// retried request can't count it twice.
export const PatientAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("setDone"), exercise: z.number().int().min(0), set: z.number().int().min(1) }),
  z.object({ type: z.literal("undoSet"), exercise: z.number().int().min(0) }),
  z.object({ type: z.literal("call"), reason: CallReason }),
  z.object({ type: z.literal("cancelCall") }),
]);
export type PatientAction = z.infer<typeof PatientAction>;

// The parts the progress helpers read, so they work on the patient's view (no note) too.
type Progress = Pick<Session, "program" | "setsDone">;

// An exercise with no sets said is done in one go (e.g. "pendulum, ένα λεπτό").
export const setsTarget = (session: Progress, exercise: number) => session.program.exercises.at(exercise)?.sets ?? 1;

export function startSession(program: PatientProgram, note: ClinicalNote, id: string, now: string): Session {
  const exercises = program.exercises.filter((exercise) => !isBlank(exercise.name));
  return {
    id,
    createdAt: now,
    updatedAt: now,
    program: { ...program, exercises },
    note,
    setsDone: exercises.map(() => 0),
    call: null,
    finishedAt: null,
    approvedId: null,
  };
}

// The first exercise with sets left, or -1 when the patient has done everything.
export const currentExercise = (session: Progress) => session.setsDone.findIndex((done, i) => done < setsTarget(session, i));

export const exercisesDone = (session: Progress) => session.setsDone.filter((done, i) => done >= setsTarget(session, i)).length;

export function applyPatientAction(session: Session, action: PatientAction, now: string): Session {
  if (session.finishedAt) return session; // closed by the physio: nothing changes any more
  switch (action.type) {
    case "setDone": {
      const done = session.setsDone.at(action.exercise);
      if (done === undefined || action.set !== done + 1 || done >= setsTarget(session, action.exercise)) return session;
      return { ...session, updatedAt: now, setsDone: session.setsDone.map((d, i) => (i === action.exercise ? d + 1 : d)) };
    }
    case "undoSet": {
      if (!session.setsDone.at(action.exercise)) return session;
      return { ...session, updatedAt: now, setsDone: session.setsDone.map((d, i) => (i === action.exercise ? d - 1 : d)) };
    }
    case "call":
      return { ...session, updatedAt: now, call: { reason: action.reason, at: now } };
    case "cancelCall":
      return session.call ? { ...session, updatedAt: now, call: null } : session;
  }
}

// The physio saw the call ("Το είδα").
export const clearCall = (session: Session, now: string): Session => (session.call ? { ...session, updatedAt: now, call: null } : session);

export const finishSession = (session: Session, approvedId: string, now: string): Session => ({
  ...session,
  updatedAt: now,
  call: null,
  finishedAt: now,
  approvedId,
});

// For the room board: someone waiting for the physio comes first, then who has finished.
export type BoardStatus = "needs-you" | "done" | "working";
export function boardStatus(session: Progress & Pick<Session, "call">): BoardStatus {
  if (session.call) return "needs-you";
  return currentExercise(session) === -1 ? "done" : "working";
}

// What the patient's screen gets: everything except the clinical note.
export function patientView(session: Session) {
  const { note: _note, ...rest } = session;
  return rest;
}
export type PatientSessionView = ReturnType<typeof patientView>;

// What "Αναίρεση" undoes: the last set marked done, in the current exercise or the one before it.
export function lastDoneExercise(session: Progress): number {
  const current = currentExercise(session);
  if (current >= 0 && session.setsDone[current] > 0) return current;
  for (let i = (current >= 0 ? current : session.setsDone.length) - 1; i >= 0; i--) if (session.setsDone[i] > 0) return i;
  return -1;
}
