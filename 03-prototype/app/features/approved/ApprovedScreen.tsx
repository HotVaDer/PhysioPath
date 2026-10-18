"use client";
// End of a session: the patient's home program link shown as a "paddock pass" (from the portfolio's
// contact card), then: open the home program, back to the room, or start the next patient.
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { PlusIcon } from "@/app/components/ui/icons";
import { useDraft } from "@/app/context/DraftContext";

type ApprovedScreenProps = { id: string; title: string; patientName: string | null; exerciseCount: number };

export function ApprovedScreen({ id, title, patientName, exerciseCount }: ApprovedScreenProps) {
  const { dispatch } = useDraft();
  const router = useRouter();
  const link = `/p/${id}` as Route; // the id comes from the server, which only accepts valid ones

  return (
    <>
      <PageHeader title="Η συνεδρία ολοκληρώθηκε">
        Το πρόγραμμα για το σπίτι και η κλινική σημείωση είναι έτοιμα. Στην πραγματική εφαρμογή θα στέλναμε το πρόγραμμα στον ασθενή με SMS ή WhatsApp.
      </PageHeader>

      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,26rem)_1fr]">
        {/* The pass: always paper-coloured, like a printed card, in both themes. */}
        <div className="-rotate-1 overflow-hidden rounded-lg bg-[#f6f4ee] text-[#1b1b1b] shadow-2xl shadow-black/40">
          <div className="flex items-end justify-between bg-primary px-5 pt-6 pb-3 text-on-primary">
            <p className="label-mono">
              Πρόγραμμα
              <br />
              για το σπίτι
            </p>
            <p aria-hidden="true" className="text-3xl leading-none font-extrabold italic">
              PP
            </p>
          </div>
          <div className="px-5 pt-5 pb-2">
            <p className="label-mono text-[#5c574d]">Για</p>
            <p className="text-2xl font-extrabold tracking-tight italic">{patientName || "Ασθενής"}</p>
            <p className="mt-3 font-semibold">{title}</p>
          </div>
          <dl className="px-5 pb-5 font-mono text-base">
            <div className="grid grid-cols-[7rem_1fr] border-t border-dashed border-[#c9c3b5] py-2.5">
              <dt className="label-mono text-[#5c574d]">Ασκήσεις</dt>
              <dd>{exerciseCount}</dd>
            </div>
            <div className="grid grid-cols-[7rem_1fr] border-t border-dashed border-[#c9c3b5] py-2.5">
              <dt className="label-mono text-[#5c574d]">Σύνδεσμος</dt>
              <dd className="break-all">{link}</dd>
            </div>
          </dl>
        </div>

        <div>
          <p className="label-mono text-muted">Επόμενο βήμα</p>
          <div className="mt-3 flex flex-col items-start gap-3">
            <ButtonLink href={link} newTab variant="primary" size="xl">
              Άνοιγμα προγράμματος για το σπίτι
            </ButtonLink>
            <ButtonLink href="/">Στην αίθουσα</ButtonLink>
            <Button
              variant="ghost"
              icon={<PlusIcon />}
              onClick={() => {
                dispatch({ type: "reset" });
                router.push("/new");
              }}
            >
              Νέος ασθενής
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
