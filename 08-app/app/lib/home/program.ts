// What the database function home_program(p_token) returns (20261123120000): the patient's letter for
// /p/<token>, and the same letter printed by the clinic (/programs/[id]/print). It never includes the
// clinical note.
import { z } from "zod";

import { HomeLog } from "@/app/lib/home/log";

// TODO: once the record → review work is merged, use PatientProgram from app/lib/notes/schema.ts
// for `program` instead of this loose shape.
const Exercise = z.object({
  name: z.string(),
  sets: z.number().nullable().optional(),
  reps: z.string().nullable().optional(),
  hold: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export const HomeProgram = z.object({
  program: z.object({
    title: z.string().optional(),
    patient_first_name: z.string().nullable().optional(),
    exercises: z.array(Exercise),
    after_exercises: z.array(z.string()).optional(),
    avoid: z.array(z.string()).optional(),
    contact_if: z.array(z.string()).optional(),
    other: z.array(z.string()).optional(),
    next_appointment: z.string().nullable().optional(),
  }),
  approvedAt: z.string(),
  approvedBy: z.string().nullable(),
  clinicName: z.string(),
  clinicCity: z.string().nullable(),
  clinicPhone: z.string().nullable(),
  log: HomeLog.default([]), // the home diary of the last 7 days (20261123120000)
});
// A newer program exists for this patient (home_program's status "newer", 20261122160000): only the clinic.
export const NewerHomeProgram = z.object({
  status: z.literal("newer"),
  clinicName: z.string(),
  clinicPhone: z.string().nullable(),
});
