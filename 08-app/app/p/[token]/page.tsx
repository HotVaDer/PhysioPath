// The patient's home program: what they open at home after a session. No login: the secret token in
// the link is the key. Design «Γράμμα από την κλινική» (2026-11-18, replaces the PRHome board); what
// the patient sees is in HomeProgramLetter, which gets the data as props.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TEXT_SIZE_SCRIPT } from "@/app/components/patient/TextSize";
import { createAnonClient } from "@/app/lib/supabase/admin";
import { HomeProgramLetter } from "@/app/p/[token]/HomeProgramLetter";

// Search engines must never list a patient's program, and the link (the patient's key) is never passed
// on to another site in a Referer header: noindex + no-referrer, as on /s/<token>.
export const metadata: Metadata = {
  title: "Το πρόγραμμά σας",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// What the database function home_program(p_token) returns. It never includes the clinical note.
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
const HomeProgram = z.object({
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
});

export default async function HomeProgramPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const valid = z.uuid().safeParse(token);
  if (!valid.success) notFound();

  // No cookies, no login: the function only answers for this one token.
  const { data, error } = await createAnonClient().rpc("home_program", { p_token: valid.data });
  if (error) throw new Error("home_program failed"); // shows the error page; details stay in the server log
  const home = HomeProgram.safeParse(data);
  if (!home.success) notFound(); // wrong or old link
  return (
    <>
      {/* The text size chosen on this device (or 20px), set before the first paint: the sheet sizes in rem. */}
      <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
      <HomeProgramLetter token={valid.data} {...home.data} />
    </>
  );
}
