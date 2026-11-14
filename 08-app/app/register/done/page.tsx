// After «Υπογραφή και κατάθεση»: the stamped form and what comes next.
import type { Metadata } from "next";

import { Actions, PaperLink } from "@/app/components/paper/Buttons";
import { Attachment, FormAlert, Stamp } from "@/app/components/paper/Notes";
import { Sheet } from "@/app/components/paper/Sheet";
import { requireMember } from "@/app/lib/onboarding/session";

export const metadata: Metadata = { title: "Η κλινική σας είναι έτοιμη" };

const count = (v: string | string[] | undefined) => Math.max(0, Math.min(30, Number(typeof v === "string" ? v : 0) || 0));

export default async function DonePage({ searchParams }: PageProps<"/register/done">) {
  const { supabase, profile } = await requireMember();
  const params = await searchParams;
  const sent = count(params.sent);
  const notSent = count(params.notSent);
  const { data: clinic } = await supabase.from("clinics").select("name, city, created_at").eq("id", profile.clinic_id).maybeSingle();
  const filed = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Nicosia" })
    .format(clinic?.created_at ? new Date(clinic.created_at) : new Date())
    .toUpperCase();

  return (
    <Sheet>
      <div className="relative flex flex-col gap-6">
        <Stamp animate date={filed} className="absolute right-0 top-0 hidden sm:block" />
        <div role="status" className="flex max-w-[460px] flex-col gap-2.5">
          <h1 className="font-display text-[36px] leading-[1.08] sm:text-[42px]">Η κλινική σας είναι έτοιμη</h1>
          <p>
            Το δελτίο κατατέθηκε. {clinic?.name}
            {clinic?.city ? `, ${clinic.city}` : ""}.
          </p>
          {sent > 0 && <p>{sent === 1 ? "Στάλθηκε 1 πρόσκληση" : `Στάλθηκαν ${sent} προσκλήσεις`} στην ομάδα σας.</p>}
        </div>
        {notSent > 0 && (
          <FormAlert>
            {notSent === 1 ? "1 πρόσκληση δεν στάλθηκε." : `${notSent} προσκλήσεις δεν στάλθηκαν.`} Είναι αποθηκευμένες: τις
            στέλνετε ξανά από την αρχική σελίδα, στην ενότητα «Ομάδα».
          </FormAlert>
        )}

        <section aria-labelledby="next" className="flex flex-col gap-2.5 border-t border-hairline pt-2">
          <h2 id="next" className="font-display text-[26px]">
            Τι ακολουθεί
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-6">
            <li>Δοκιμάστε με τον ασθενή του συνημμένου. Περίπου 3 λεπτά.</li>
            <li>Ξεκινήστε την πρώτη πραγματική συνεδρία από την αίθουσα.</li>
          </ol>
        </section>

        <Attachment label="ΣΥΝΗΜΜΕΝΟ Α">
          <p className="mt-1.5 font-display text-[26px] leading-[1.1]">Δοκιμαστικός ασθενής</p>
          <p className="mt-1.5 text-base text-muted">
            Αριστερό γόνατο · 3 ασκήσεις · έτοιμη φωνητική σημείωση. Δεν μπαίνει στους ασθενείς σας. Έρχεται μαζί με την αίθουσα.
          </p>
        </Attachment>

        <Actions>
          <PaperLink href="/">
            Στην αίθουσα <span aria-hidden="true">→</span>
          </PaperLink>
        </Actions>
      </div>
    </Sheet>
  );
}
