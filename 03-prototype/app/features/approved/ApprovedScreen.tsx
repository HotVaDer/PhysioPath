"use client";
// End of a session: a card with the patient's home program (who it's for, how many exercises, the link),
// then: open the home program, back to the room, or start the next patient.
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/app/components/layout/PageHeader";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { CheckIcon, PlusIcon } from "@/app/components/ui/icons";
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

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section aria-labelledby="program-card" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary text-on-primary">
              <CheckIcon size={22} />
            </span>
            <p className="label text-muted">Πρόγραμμα για το σπίτι</p>
          </div>
          <div>
            <h2 id="program-card" className="text-[2rem] leading-[1.05] font-bold">
              {patientName || "Ασθενής"}
            </h2>
            <p className="mt-1 text-[1.1rem] font-semibold text-muted">{title}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-tile bg-background px-4 py-3">
            <dt className="label self-center text-muted">Ασκήσεις</dt>
            <dd className="font-bold">{exerciseCount}</dd>
            <dt className="label self-center text-muted">Σύνδεσμος</dt>
            <dd className="font-mono text-base break-all">{link}</dd>
          </dl>
        </section>

        <div>
          <p className="label text-muted">Επόμενο βήμα</p>
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
