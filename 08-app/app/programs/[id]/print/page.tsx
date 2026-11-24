// «Εκτύπωση για τον ασθενή» (owner, physio, assistant): the home program on paper, for a patient who doesn't
// use a phone. The same letter the patient's link shows (home_program, read here on the server with the
// program's link: it only reads), as it will print: two weeks of day boxes to tick with a pen, nothing that
// saves, never the clinical note. ?size=large: «Μεγάλα γράμματα», in one column.
// A newer program for the patient: this one isn't printed; the page points to the newer one.
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as z from "zod";

import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { HomeProgram, NewerHomeProgram } from "@/app/lib/home/program";
import { requireMember } from "@/app/lib/onboarding/session";
import { createAnonClient } from "@/app/lib/supabase/admin";
import { HomeProgramLetter, type PaperSize } from "@/app/p/[token]/HomeProgramLetter";

import { PrintBar } from "./PrintBar";

export const metadata: Metadata = { title: "Εκτύπωση για τον ασθενή", robots: { index: false, follow: false } };

export default async function PrintProgramPage({ params, searchParams }: PageProps<"/programs/[id]/print">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const size: PaperSize = (await searchParams).size === "large" ? "large" : "normal";
  const { supabase, profile } = await requireMember();

  // RLS: only a program of the open clinic.
  const { data: program } = await supabase.from("programs").select("id, token, patient_id").eq("id", id).maybeSingle();
  if (!program) notFound();

  const { data, error } = await createAnonClient().rpc("home_program", { p_token: program.token });
  if (error) throw new Error("home_program failed"); // the error page; details stay in the server log

  if (NewerHomeProgram.safeParse(data).success) {
    const { data: newest } = await supabase
      .from("programs")
      .select("id")
      .eq("patient_id", program.patient_id!)
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (
      <StaffSheet profile={profile}>
        <div className="flex max-w-[620px] flex-col gap-4">
          <h1 className="font-display text-[32px] leading-tight sm:text-[38px]">Υπάρχει νεότερο πρόγραμμα</h1>
          <p>Ο ασθενής έχει πια νεότερο πρόγραμμα. Τυπώστε εκείνο, για να μην πάρει στο σπίτι τις παλιές ασκήσεις.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {newest && (
              <Link href={`/programs/${newest.id}/print` as Route}>
                Εκτύπωση του νεότερου προγράμματος <span aria-hidden="true">→</span>
              </Link>
            )}
            <Link href={`/programs/${program.id}` as Route}>Πίσω στο πρόγραμμα</Link>
          </div>
        </div>
      </StaffSheet>
    );
  }

  const home = HomeProgram.safeParse(data);
  if (!home.success) notFound();
  // Only what the sheet prints goes to the page (the home diary stays here).
  const { program: letter, approvedAt, approvedBy, clinicName, clinicCity, clinicPhone } = home.data;
  return (
    <HomeProgramLetter
      program={letter}
      approvedAt={approvedAt}
      approvedBy={approvedBy}
      clinicName={clinicName}
      clinicCity={clinicCity}
      clinicPhone={clinicPhone}
      paper={{ size, bar: <PrintBar programId={program.id} size={size} /> }}
    />
  );
}
