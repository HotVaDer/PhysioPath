// The home diary (public.home_logs, migration 20261123120000): what the patient did at home with the
// program on /p/<token>. One entry = one exercise on one day: «Το έκανα» (done) or «Δεν μπόρεσα»
// (skipped), with an optional pain 0–10 and a short note. Shared by the patient's letter, its API route
// and (later) the physio's «Ασθενείς» pages, so the shapes and the day sums live in one place.
// Days are plain "YYYY-MM-DD" strings: the patient's own calendar day, never a moment in time.
import * as z from "zod";

export const HIGH_PAIN = 7; // from here on the physio is alerted, and the patient sees «call us»
export const NOTE_MAX = 500;

export const LogEntry = z.object({
  day: z.iso.date(),
  exercise: z.number().int().min(0), // its place in program.exercises (not on screen: blank rows are hidden)
  status: z.enum(["done", "skipped"]),
  pain: z.number().int().min(0).max(10).nullable(),
  note: z.string().nullable(),
});
export type LogEntry = z.infer<typeof LogEntry>;
export const HomeLog = z.array(LogEntry);

// One press, as the letter sends it to /api/p/<token>. status null = take the press back.
export const LogChange = z.object({
  day: z.iso.date(),
  exercise: z.number().int().min(0).max(63),
  status: z.enum(["done", "skipped"]).nullable(),
  pain: z.number().int().min(0).max(10).nullable(),
  note: z.string().max(NOTE_MAX).nullable(),
});
export type LogChange = z.infer<typeof LogChange>;

// What home_log answers (it answers with home_program): the diary, or "a newer program exists".
export const LogAnswer = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), log: HomeLog }),
  z.object({ status: z.literal("newer") }),
]);
export type LogAnswer = z.infer<typeof LogAnswer>;

export const isHighPain = (pain: number | null | undefined) => pain != null && pain >= HIGH_PAIN;

export const entryFor = (log: LogEntry[], day: string, exercise: number) =>
  log.find((entry) => entry.day === day && entry.exercise === exercise) ?? null;

// The diary with one change applied (what the screen shows before the server has answered).
export function withChange(log: LogEntry[], change: LogChange): LogEntry[] {
  const others = log.filter((entry) => !(entry.day === change.day && entry.exercise === change.exercise));
  if (change.status === null) return others;
  const note = change.note?.trim() || null;
  return [...others, { day: change.day, exercise: change.exercise, status: change.status, pain: change.pain, note }];
}

// How many of the given exercises were done that day.
export const doneOn = (log: LogEntry[], day: string, exercises: number[]) =>
  exercises.filter((exercise) => entryFor(log, day, exercise)?.status === "done").length;

// Day arithmetic on "YYYY-MM-DD", in UTC so no clock change ever skips or repeats a day.
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => {
  const date = asDate(day);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};

// The last n days up to and including `today`, oldest first.
export const lastDays = (today: string, n = 7) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));

// The device's own calendar day (Swedish formatting happens to be YYYY-MM-DD).
export const localDay = (now = new Date()) => now.toLocaleDateString("sv");

// The clinic's calendar day for a moment: what the database counts in (Asia/Nicosia).
export const clinicDay = (iso: string | Date) => new Date(iso).toLocaleDateString("sv", { timeZone: "Asia/Nicosia" });

const weekday = new Intl.DateTimeFormat("el-GR", { weekday: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("el-GR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const shortWeekday = (day: string) => weekday.format(asDate(day)); // «Τρί»
export const dayNumber = (day: string) => String(asDate(day).getUTCDate()); // «24»
export const longDayName = (day: string) => longDay.format(asDate(day)); // «Τρίτη 24 Νοεμβρίου»
