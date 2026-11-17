// Home. The clinic's details, «Νέα συνεδρία» for owner/physio and, for the owner, «Επόμενα βήματα»
// after sign-up: ① the rooms (/settings/rooms) and ② the team (/settings/team), each with ✓ once
// done. The room board moves here next (from 03-prototype, restyled in the paper look).
// Not signed in → the welcome page; signed in without a clinic → the last sign-up step.
import type { Route } from "next";
import type { Metadata } from "next";
import Link from "next/link";

import { PaperLink, QuietSubmit } from "@/app/components/paper/Buttons";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { ROLES } from "@/app/lib/onboarding/schema";
import { requireMember } from "@/app/lib/onboarding/session";
import { workAlone } from "@/app/lib/settings/actions";
import { cx } from "@/app/lib/cx";

export const metadata: Metadata = { title: "Η αίθουσα" };

const SAVED: Record<string, string> = {
  rooms: "Οι χώροι σας αποθηκεύτηκαν.",
  alone: "Εντάξει, δουλεύετε μόνη/ος. Αν χρειαστεί, καλείτε κάποιον από «Ομάδα» πιο κάτω.",
};

// One of the «Επόμενα βήματα»: a big card that is the link, with a number (or ✓ when done).
function NextStep({ n, href, title, text, done }: { n: number; href: Route; title: string; text: string; done: boolean }) {
  return (
    <Link
      href={href}
      className="flex min-h-[76px] items-center gap-4 rounded-md border-2 border-line bg-white px-4 py-3 text-ink no-underline hover:border-action hover:text-ink"
    >
      <span
        aria-hidden="true"
        className={cx(
          "flex h-11 w-11 flex-none items-center justify-center rounded-full text-xl font-bold",
          done ? "bg-note-green text-action" : "bg-action text-white",
        )}
      >
        {done ? "✓" : n}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[19px] font-semibold">
          {title}
          {done && <span className="font-normal text-action"> · Έγινε</span>}
        </span>
        <span className="text-muted">{text}</span>
      </span>
      <span aria-hidden="true" className="ml-auto text-2xl text-action">
        →
      </span>
    </Link>
  );
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { supabase, profile } = await requireMember();
  const { welcome, saved } = await searchParams;
  const isOwner = profile.role === "owner";
  const [{ data: clinic }, { data: rooms }, { count: invited }] = await Promise.all([
    supabase.from("clinics").select("name, city, phone, rooms_checked_at, team_checked_at").eq("id", profile.clinic_id).maybeSingle(),
    supabase.from("rooms").select("name, beds, stations").order("position"),
    isOwner
      ? supabase.from("invites").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0 }),
  ]);
  const roleLabel = profile.role === "owner" ? "Υπεύθυνη/ος κλινικής" : ROLES[profile.role];
  const roomsDone = Boolean(clinic?.rooms_checked_at);
  const teamDone = Boolean(clinic?.team_checked_at) || (invited ?? 0) > 0;
  const savedNote = typeof saved === "string" ? SAVED[saved] : undefined;

  return (
    <StaffSheet profile={profile} current="board">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[36px] leading-[1.08] sm:text-[42px]">Η αίθουσα</h1>
          <p>
            Καλώς ήρθατε, {profile.full_name}. <span className="text-muted">({roleLabel})</span>
          </p>
        </div>

        {welcome === "1" && (
          <p role="status" className="bg-note-green px-4 py-3">
            <span className="font-semibold">Η εγγραφή ολοκληρώθηκε. Η κλινική σας είναι έτοιμη.</span> Από εδώ ξεκινάτε κάθε
            νέα συνεδρία.
          </p>
        )}
        {savedNote && (
          <p role="status" className="bg-note-green px-4 py-3 font-semibold">
            {savedNote}
          </p>
        )}

        {profile.role !== "assistant" && (
          <PaperLink href="/notes/new">
            <span aria-hidden="true">+</span> Νέα συνεδρία
          </PaperLink>
        )}

        {isOwner && !(roomsDone && teamDone) && (
          <section aria-labelledby="next" className="flex max-w-[640px] flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id="next" className="font-display text-[26px]">
                Επόμενα βήματα
              </h2>
              <p className="text-muted">Δύο ακόμα, όποτε θέλετε. Τις σημειώσεις μπορείτε να τις ξεκινήσετε ήδη.</p>
            </div>
            <ol className="flex flex-col gap-3">
              <li>
                <NextStep n={1} href="/settings/rooms" title="Ρυθμίστε τους χώρους σας" text="Αίθουσες, κρεβάτια και θέσεις άσκησης." done={roomsDone} />
              </li>
              <li className="flex flex-col gap-1">
                <NextStep n={2} href="/settings/team" title="Καλέστε την ομάδα σας" text="Φυσιοθεραπευτές και βοηθούς, με το email τους." done={teamDone} />
                {!teamDone && (
                  <form action={workAlone} className="pl-1">
                    <QuietSubmit pending="Αποθήκευση…">Δουλεύω μόνη/ος, δεν χρειάζεται</QuietSubmit>
                  </form>
                )}
              </li>
            </ol>
          </section>
        )}

        <dl className="flex flex-col border-b border-hairline">
          <div className="flex flex-wrap gap-x-4 border-t border-hairline py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Κλινική</dt>
            <dd className="text-[19px]">
              {clinic?.name}
              {clinic?.city ? `, ${clinic.city}` : ""}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4 border-t border-hairline py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Τηλέφωνο</dt>
            <dd className="text-[19px]">{clinic?.phone}</dd>
          </div>
          <div className="flex flex-wrap items-start gap-x-4 border-t border-hairline py-3">
            <dt className="text-base text-muted sm:flex-[0_0_180px]">Χώροι</dt>
            <dd className="flex-1 text-[19px]">
              {(rooms ?? []).map((r) => (
                <span key={r.name} className="block">
                  {[
                    r.name,
                    r.beds > 0 && `${r.beds} ${r.beds === 1 ? "κρεβάτι" : "κρεβάτια"}`,
                    r.stations > 0 && `${r.stations} ${r.stations === 1 ? "θέση άσκησης" : "θέσεις άσκησης"}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ))}
            </dd>
            {isOwner && (
              <dd>
                <Link href="/settings/rooms" className="min-h-11 content-center">
                  Αλλαγή<span className="sr-only"> χώρων</span>
                </Link>
              </dd>
            )}
          </div>
          {isOwner && (
            <div className="flex flex-wrap items-start gap-x-4 border-t border-hairline py-3">
              <dt className="text-base text-muted sm:flex-[0_0_180px]">Ομάδα</dt>
              <dd className="flex-1 text-[19px]">
                {invited ? `${invited} ${invited === 1 ? "πρόσκληση" : "προσκλήσεις"}` : "Μόνο εσείς"}
              </dd>
              <dd>
                <Link href="/settings/team" className="min-h-11 content-center">
                  Διαχείριση<span className="sr-only"> ομάδας</span>
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </StaffSheet>
  );
}
