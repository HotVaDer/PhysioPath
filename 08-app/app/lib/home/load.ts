// Reads for «Ασθενείς» and one patient's page, with the signed-in user's client: the read policies keep
// it to the clinic open now, and home_logs to its owner and physios (an assistant gets no rows).
// Only reads; «Το είδα» is a database function (app/lib/home/actions.ts).
import "server-only";

import { addDays, clinicDay } from "@/app/lib/home/log";
import { summarise, type DiaryRow, type PatientSummary, type ProgramRow } from "@/app/lib/home/progress";
import type { Supabase } from "@/app/lib/supabase/server";

const DIARY = "program_id, patient_id, day, exercise, status, pain, note, created_at, seen_at";
const PROGRAM = "id, patient_id, approved_at, program";

export const clinicToday = () => clinicDay(new Date());

// The diary rows since `since`, plus any pain report still waiting for «Το είδα», however old.
const recentOrUnseen = (since: string) => `day.gte.${since},and(pain.gte.7,seen_at.is.null)`;

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what} failed: ${result.error.message}`);
  return result.data as T;
}

export async function loadPatients(supabase: Supabase): Promise<{ today: string; patients: PatientSummary[] }> {
  const today = clinicToday();
  const [patients, programs, rows] = await Promise.all([
    supabase.from("patients").select("id, label").is("archived_at", null),
    supabase.from("programs").select(PROGRAM).not("patient_id", "is", null),
    supabase.from("home_logs").select(DIARY).or(recentOrUnseen(addDays(today, -27))),
  ]);
  return {
    today,
    patients: summarise(
      must(patients, "patients") as { id: string; label: string }[],
      must(programs, "programs") as ProgramRow[],
      must(rows, "home_logs") as DiaryRow[],
      today,
    ),
  };
}

export type PatientProgress = {
  today: string;
  patient: { id: string; label: string; archived: boolean };
  programs: ProgramRow[]; // newest first
  rows: DiaryRow[];
};

// null: no such patient in the clinic open now.
export async function loadPatientProgress(supabase: Supabase, patientId: string, days: number): Promise<PatientProgress | null> {
  const today = clinicToday();
  const patient = must(
    await supabase.from("patients").select("id, label, archived_at").eq("id", patientId).maybeSingle(),
    "patient",
  ) as { id: string; label: string; archived_at: string | null } | null;
  if (!patient) return null;
  const [programs, rows] = await Promise.all([
    supabase.from("programs").select(PROGRAM).eq("patient_id", patientId).order("approved_at", { ascending: false }),
    supabase.from("home_logs").select(DIARY).eq("patient_id", patientId).or(recentOrUnseen(addDays(today, -(days - 1)))),
  ]);
  return {
    today,
    patient: { id: patient.id, label: patient.label, archived: patient.archived_at !== null },
    programs: must(programs, "programs") as ProgramRow[],
    rows: must(rows, "home_logs") as DiaryRow[],
  };
}

// How many patients have a pain report waiting for «Το είδα» (the line on the board).
export async function countPainAlerts(supabase: Supabase): Promise<number> {
  const rows = must(await supabase.from("home_logs").select("patient_id").gte("pain", 7).is("seen_at", null), "home_logs") as {
    patient_id: string | null;
  }[];
  return new Set(rows.map((row) => row.patient_id).filter(Boolean)).size;
}
