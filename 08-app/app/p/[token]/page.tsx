// The patient's home program: what they open at home after a session (canvas board PRHome,
// «Κινητό ασθενή · πρόγραμμα για το σπίτι»). No login: the secret token in the link is the key.
//
// STARTER (for AndreasVas04): the data part is done and safe; the design is yours.
// See CONTRIBUTING.md § "Your piece" for the full checklist.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { createAnonClient } from "@/app/lib/supabase/admin";

// Search engines must never list a patient's program.
export const metadata: Metadata = { title: "Το πρόγραμμά σας", robots: { index: false, follow: false } };

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
  const { program, clinicName, clinicPhone } = home.data;

  // TODO (design, board PRHome):
  //   - paper sheet on the desk, red margin, header with clinic name/city and «Για: <name>»
  //   - text size control (normal / large / very large), «Εκτύπωση» (print hides the buttons)
  //   - «Σήμερα N από M ασκήσεις» + «Το έκανα σήμερα» per exercise, kept in localStorage only
  //     (key per token and day, never sent anywhere) → a small Client Component
  //   - «Αποφύγετε» (yellow), «Πάρτε μας τηλέφωνο αν» (pink + tel: link), «Άλλες οδηγίες»,
  //     «Επόμενο ραντεβού», footer with who approved it and when
  //   - 48 px targets, 7:1 contrast, works at 390 px and with the keyboard; a test with axe
  return (
    <main id="main" className="mx-auto max-w-[460px] p-6">
      <p>{clinicName}</p>
      <h1>Το πρόγραμμά σας για το σπίτι</h1>
      {program.title && <p>{program.title}</p>}
      <ol>
        {program.exercises.map((exercise, i) => (
          <li key={i}>{exercise.name}</li>
        ))}
      </ol>
      {clinicPhone && <a href={`tel:${clinicPhone.replace(/\s+/g, "")}`}>{clinicPhone}</a>}
    </main>
  );
}
