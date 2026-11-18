// The rules the room board and the patient's phone share. Pure functions: no database, no React.
//
// Both screens read the same progress from public.sessions:
//   setsTarget  sets per exercise (an exercise with no sets said counts as one go)
//   setsDone    sets the patient has finished, per exercise
//   current     the exercise the patient is on (the phone sends it; see 20261118000000)
// The phone gets it from patient_session() (only the patient's part, never the note), the board
// from its own query. The database already refuses impossible taps; these only read the result.

import * as z from "zod";

import { readProgram, type PatientProgram } from "@/app/lib/notes/schema";

export const CallReason = z.enum(["question", "pain"]);
export type CallReason = z.infer<typeof CallReason>;
export type Call = { reason: CallReason; at: string };

export type Progress = { setsTarget: number[]; setsDone: number[]; current: number };

// ---------- what the phone gets ----------
const Count = z.number().int().min(0);
const ViewJson = z.object({
  program: z.unknown(),
  setsTarget: z.array(Count.min(1)).min(1).max(40),
  setsDone: z.array(Count).max(40),
  current: Count,
  call: z.object({ reason: CallReason, at: z.string() }).nullable(),
  finishedAt: z.string().nullable(),
  homeToken: z.string().nullable(), // the /p/<token> link, only after «Τέλος»
  clinicName: z.string(),
  updatedAt: z.string(),
});
export type PatientView = Omit<z.infer<typeof ViewJson>, "program"> & { program: PatientProgram };

// patient_session() → PatientView, or null when anything doesn't fit (wrong token, an old shape).
// The program and the two arrays must describe the same exercises, or the screens would mix them up.
export function readPatientView(json: unknown): PatientView | null {
  const parsed = ViewJson.safeParse(json);
  if (!parsed.success) return null;
  const view = parsed.data;
  const program = readProgram(view.program);
  const n = view.setsTarget.length;
  if (!program || program.exercises.length !== n || view.setsDone.length !== n || view.current >= n) return null;
  return { ...view, program };
}

// What the phone can send. The same list as patient_action() in the database.
const Exercise = z.number().int().min(0).max(39);
const SetNumber = z.number().int().min(1).max(20);
export const PatientAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("setDone"), exercise: Exercise, set: SetNumber }), // the set just finished
  z.object({ type: z.literal("undoSet"), exercise: Exercise, set: SetNumber }), // the set to take back
  z.object({ type: z.literal("show"), exercise: Exercise }), // the patient tapped another exercise
  z.object({ type: z.literal("call"), reason: CallReason }),
  z.object({ type: z.literal("cancelCall") }),
]);
export type PatientAction = z.infer<typeof PatientAction>;

// ---------- progress ----------
export const isDone = (p: Progress, exercise: number) => (p.setsDone[exercise] ?? 0) >= (p.setsTarget[exercise] ?? 1);
export const exercisesDone = (p: Progress) => p.setsTarget.filter((_, i) => isDone(p, i)).length;
export const allDone = (p: Progress) => exercisesDone(p) === p.setsTarget.length;

// «Τώρα»: the exercise the patient is on. If that one is already done, the first one not done yet.
// -1 when everything is done.
export function nowExercise(p: Progress): number {
  if (!isDone(p, p.current)) return p.current;
  return p.setsTarget.findIndex((_, i) => !isDone(p, i));
}

// What «Αναίρεση» takes back: the last set of the exercise on screen, or (just after an exercise was
// finished and the phone moved on) the nearest exercise before it with sets done. -1: nothing to undo.
export function undoExercise(p: Progress, shown: number): number {
  const from = shown >= 0 ? shown : p.setsTarget.length - 1;
  for (let i = from; i >= 0; i--) if ((p.setsDone[i] ?? 0) > 0) return i;
  return -1;
}

// ---------- the room board ----------
// Waiting for the physio comes first, whatever else is going on.
export type BoardStatus = "calling" | "done" | "working";
export function boardStatus(p: Progress & { call: Call | null }): BoardStatus {
  if (p.call) return "calling";
  return allDone(p) ? "done" : "working";
}

export const CALL_WORDS: Record<CallReason, string> = { pain: "Πονάει", question: "Έχει απορία" };

// «μόλις τώρα», «πριν από 1 λεπτό», «πριν από 12 λεπτά». A clock a little ahead counts as now.
export function minutesAgo(at: string, now: Date | string = new Date()): string {
  const minutes = Math.floor((new Date(now).getTime() - new Date(at).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "μόλις τώρα";
  return minutes === 1 ? "πριν από 1 λεπτό" : `πριν από ${minutes} λεπτά`;
}
