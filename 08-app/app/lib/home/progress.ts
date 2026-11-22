// What the physio sees of the home diary (home_logs) on «Ασθενείς» (/patients) and on one patient's
// page (/patients/<id>): pure sums over rows already loaded (app/lib/home/load.ts), so they can be
// tested without a database. Days are "YYYY-MM-DD" (the patient's day); "today" is the clinic's day.
import { addDays, clinicDay, isHighPain, type LogEntry } from "@/app/lib/home/log";
import { isBlank } from "@/app/lib/notes/format";

// One diary row as the physio's pages read it (the read policy: owner and physios of the clinic).
export type DiaryRow = LogEntry & {
  program_id: string;
  patient_id: string | null;
  created_at: string;
  seen_at: string | null;
};

export type ProgramRow = {
  id: string;
  patient_id: string | null;
  approved_at: string;
  program: { title?: string | null; exercises?: { name?: string | null }[] };
};

// The names of a program's exercises by their place (a blank row stays as null: never shown).
export const exerciseNames = (program: ProgramRow) =>
  (program.program.exercises ?? []).map((exercise) => (isBlank(exercise.name ?? null) ? null : exercise.name!.trim()));

const exerciseCount = (program: ProgramRow) => exerciseNames(program).filter(Boolean).length;
export const programTitle = (program: ProgramRow) => program.program.title?.trim() || "Πρόγραμμα για το σπίτι";
export const firstDayOf = (program: ProgramRow) => clinicDay(program.approved_at);

// Saved on a later day than the day it is for: «σημειώθηκε αργότερα».
export const isLate = (row: DiaryRow) => clinicDay(row.created_at) > row.day;
export const isUnseenPain = (row: DiaryRow) => isHighPain(row.pain) && row.seen_at === null;

// «σήμερα», «χθες», «πριν 3 μέρες».
export function daysAgo(day: string, today: string): string {
  const n = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  if (n <= 0) return "σήμερα";
  if (n === 1) return "χθες";
  return `πριν ${n} μέρες`;
}

// The days of the last 7 (today included) with at least one «Το έκανα».
export function activeDays(rows: DiaryRow[], today: string): number {
  const from = addDays(today, -6);
  return new Set(rows.filter((row) => row.status === "done" && row.day >= from && row.day <= today).map((row) => row.day)).size;
}

const newest = (a: DiaryRow, b: DiaryRow) => (a.day === b.day ? b.created_at.localeCompare(a.created_at) : b.day.localeCompare(a.day));

// One row of «Ασθενείς».
export type PatientSummary = {
  id: string;
  label: string;
  program: { id: string; title: string } | null; // the newest
  lastDay: string | null; // the last day anything was ticked
  activeDays: number; // of the last 7
  latestPain: { pain: number; day: string } | null;
  unseenPain: number; // reports of pain 7+ nobody pressed «Το είδα» for
};

export function summarise(
  patients: { id: string; label: string }[],
  programs: ProgramRow[],
  rows: DiaryRow[],
  today: string,
): PatientSummary[] {
  const summaries = patients.map((patient) => {
    const own = rows.filter((row) => row.patient_id === patient.id).sort(newest);
    const program = programs
      .filter((p) => p.patient_id === patient.id)
      .sort((a, b) => b.approved_at.localeCompare(a.approved_at))[0];
    const withPain = own.find((row) => row.pain !== null);
    return {
      id: patient.id,
      label: patient.label,
      program: program ? { id: program.id, title: programTitle(program) } : null,
      lastDay: own[0]?.day ?? null,
      activeDays: activeDays(own, today),
      latestPain: withPain ? { pain: withPain.pain!, day: withPain.day } : null,
      unseenPain: own.filter(isUnseenPain).length,
    };
  });
  // Pain reports first, then whoever ticked most recently, then by name.
  return summaries.sort(
    (a, b) =>
      Number(b.unseenPain > 0) - Number(a.unseenPain > 0) ||
      (b.lastDay ?? "").localeCompare(a.lastDay ?? "") ||
      a.label.localeCompare(b.label, "el"),
  );
}

// One day of a patient's diary, as the patient page shows it.
export type DiaryEntry = {
  exercise: number;
  name: string;
  status: LogEntry["status"];
  pain: number | null;
  note: string | null;
  late: boolean;
  unseenPain: boolean;
};
export type DiaryDay = { day: string; done: number; total: number; entries: DiaryEntry[] };

// The last `count` days, newest first, from the day the first program was given. Each day is counted
// against the program the patient had that day (the newest approved by then); its entries keep the
// names of their own program.
export function diaryDays(programs: ProgramRow[], rows: DiaryRow[], today: string, count: number): DiaryDay[] {
  const sorted = [...programs].sort((a, b) => b.approved_at.localeCompare(a.approved_at));
  if (!sorted.length) return [];
  const start = firstDayOf(sorted[sorted.length - 1]);
  const names = new Map(sorted.map((program) => [program.id, exerciseNames(program)]));
  const days: DiaryDay[] = [];
  for (let i = 0; i < count; i++) {
    const day = addDays(today, -i);
    if (day < start) break;
    const program = sorted.find((p) => firstDayOf(p) <= day) ?? sorted[sorted.length - 1];
    const entries = rows
      .filter((row) => row.day === day)
      .map((row) => ({
        exercise: row.exercise,
        name: names.get(row.program_id)?.[row.exercise] ?? `Άσκηση ${row.exercise + 1}`,
        status: row.status,
        pain: row.pain,
        note: row.note,
        late: isLate(row),
        unseenPain: isUnseenPain(row),
        programId: row.program_id,
      }))
      .sort((a, b) => (a.programId === b.programId ? a.exercise - b.exercise : a.programId.localeCompare(b.programId)))
      .map(({ programId: _programId, ...entry }) => entry);
    days.push({ day, done: entries.filter((entry) => entry.status === "done").length, total: exerciseCount(program), entries });
  }
  return days;
}

// The highest pain of each day (null: no pain said that day), oldest first, for the pain line.
export function painByDay(rows: DiaryRow[], days: string[]): { day: string; pain: number | null }[] {
  return days.map((day) => {
    const pains = rows.filter((row) => row.day === day && row.pain !== null).map((row) => row.pain!);
    return { day, pain: pains.length ? Math.max(...pains) : null };
  });
}
