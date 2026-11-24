"use client";
// «Νέα συνεδρία» step 2 of 4: the patient's last program, and two big choices.
//   «Ίδιο πρόγραμμα»: the same exercises; they record only a short note about today (for GeSY).
//   «Αλλαγή προγράμματος»: they record the new exercises and a new program is written (as before).
// The choice goes into the draft; then on to the recording (step 3).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { cx } from "@/app/lib/cx";
import { useDraft } from "@/app/lib/notes/DraftContext";
import type { PatientProgram } from "@/app/lib/notes/schema";
import { ProgramSummary } from "@/app/notes/ProgramSummary";

type Props = {
  patient: { id: string; label: string };
  stored: { programId: string; approvedAt: string; program: PatientProgram };
  area?: string | null; // «Περιοχή σώματος» of the last note, for «Προτεινόμενα» templates on the next page
};

const card =
  "flex min-h-[88px] w-full cursor-pointer items-center gap-4 rounded-md border-2 px-5 py-4 text-left text-ink";

export function ProgramChoice({ patient, stored, area = null }: Props) {
  const router = useRouter();
  const { draft, dispatch, ready } = useDraft();

  // Opened from step 1 (or a link): make sure the draft is for this patient.
  useEffect(() => {
    if (ready && draft.patient?.id !== patient.id) dispatch({ type: "setPatient", patient });
  }, [ready, draft.patient?.id, patient, dispatch]);
  useEffect(() => {
    if (ready && draft.patient?.id === patient.id) dispatch({ type: "setPatientArea", area });
  }, [ready, draft.patient?.id, patient.id, area, dispatch]);

  if (!ready) return <p className="text-muted">Φόρτωση…</p>;

  function choose(mode: "same" | "new") {
    dispatch({ type: "setMode", mode, base: mode === "same" ? stored : null });
    router.push("/notes/record");
  }

  const current = draft.patient?.id === patient.id && draft.result ? draft.mode : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Ίδιο πρόγραμμα ή αλλαγή;</h1>
        <p className="flex flex-wrap items-center gap-x-4 text-[19px]">
          <span>
            Για: <strong>{patient.label}</strong>
          </span>
          <Link href="/notes/new" className="min-h-11 content-center text-base">
            Αλλαγή ασθενή
          </Link>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-semibold">Το πρόγραμμα που έχει τώρα:</p>
        <ProgramSummary id="stored-h" program={stored.program} approvedAt={stored.approvedAt} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" onClick={() => choose("same")} className={cx(card, "border-action bg-note-green hover:bg-[#d6e8d0]")}>
          <span className="flex flex-col gap-0.5">
            <span className="text-[21px] font-bold text-action">Ίδιο πρόγραμμα</span>
            <span>Οι ίδιες ασκήσεις. Ηχογραφείτε μόνο μια σύντομη σημείωση για σήμερα, για τον ΓεΣΥ.</span>
          </span>
          <span aria-hidden="true" className="ml-auto text-2xl text-action">
            →
          </span>
        </button>
        <button type="button" onClick={() => choose("new")} className={cx(card, "border-line bg-white hover:border-action")}>
          <span className="flex flex-col gap-0.5">
            <span className="text-[21px] font-bold">Αλλαγή προγράμματος</span>
            <span>Ηχογραφείτε τις νέες ασκήσεις και γράφουμε νέο πρόγραμμα.</span>
          </span>
          <span aria-hidden="true" className="ml-auto text-2xl text-action">
            →
          </span>
        </button>
      </div>
      {current && (
        <p className="text-muted">
          Είχατε ξεκινήσει με «{current === "same" ? "Ίδιο πρόγραμμα" : "Αλλαγή προγράμματος"}». Αν διαλέξετε το άλλο, το
          κείμενο μένει αλλά γράφεται ξανά η σημείωση.
        </p>
      )}
    </div>
  );
}
