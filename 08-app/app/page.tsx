// Home: «Η αίθουσα», the room board (every role), «Νέα συνεδρία» for owner/physio and, for the owner,
// «Επόμενα βήματα» after sign-up: ① the rooms (/settings/rooms) and ② the team (/settings/team), each
// with ✓ once done. The clinic's details moved to «Κλινική» (/settings) on 2026-11-18.
// Not signed in → the welcome page; signed in without a clinic → the last sign-up step.
import type { Route } from "next";
import type { Metadata } from "next";
import Link from "next/link";

import { AutoRefresh } from "@/app/components/paper/AutoRefresh";
import { DemoTips } from "@/app/components/demo/DemoTips";
import { PaperLink, QuietSubmit } from "@/app/components/paper/Buttons";
import { RoomBoard } from "@/app/components/board/RoomBoard";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { loadBoard } from "@/app/lib/board/board";
import { countPainAlerts } from "@/app/lib/home/load";
import { loadMyInvites, requireMember } from "@/app/lib/onboarding/session";
import { InviteNotice } from "@/app/components/paper/InviteNotice";
import { workAlone } from "@/app/lib/settings/actions";
import { cx } from "@/app/lib/cx";
import { TabLink, TabName } from "@/app/components/paper/TabLink";
import { BOARD_TAB, WORK_TAB } from "@/app/lib/tabs";

export const metadata: Metadata = { title: "Η αίθουσα" };

const SAVED: Record<string, string> = {
  rooms: "Οι χώροι σας αποθηκεύτηκαν.",
  alone: "Εντάξει, δουλεύετε μόνη/ος. Αν χρειαστεί, καλείτε κάποιον από «Κλινική» → «Ομάδα».",
  left: "Αποχωρήσατε από την κλινική. Τώρα βλέπετε την επόμενη κλινική σας.",
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
  const { welcome, saved, stale } = await searchParams;
  const isOwner = profile.role === "owner";
  const isPhysio = profile.role !== "assistant";
  const [{ data: clinic }, board, { count: invited }, myInvites, painAlerts] = await Promise.all([
    supabase.from("clinics").select("name, rooms_checked_at, team_checked_at").eq("id", profile.clinic_id).maybeSingle(),
    loadBoard(supabase),
    isOwner
      ? supabase.from("invites").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0 }),
    loadMyInvites(supabase), // invites from other clinics, waiting for this person
    // Pain reports from home, waiting for «Το είδα». Not in a demo: next to the red «pain in the room» card,
    // a second «pain» bar confused visitors (the demo patients' home diary is on «Ασθενείς»).
    isPhysio && !profile.demo ? countPainAlerts(supabase) : Promise.resolve(0),
  ]);
  const roomsDone = Boolean(clinic?.rooms_checked_at);
  const teamDone = Boolean(clinic?.team_checked_at) || (invited ?? 0) > 0;
  const savedNote =
    saved === "clinic"
      ? `Ανοίξατε την κλινική «${clinic?.name ?? ""}». Ό,τι βλέπετε τώρα είναι αυτής της κλινικής.`
      : saved === "new-clinic"
        ? `Η κλινική «${clinic?.name ?? ""}» δημιουργήθηκε και είναι ανοιχτή. Ρυθμίστε τους χώρους και την ομάδα της πιο κάτω.`
        : typeof saved === "string"
        ? SAVED[saved]
        : undefined;

  const newSession =
    profile.role !== "assistant" ? (
      <PaperLink href="/notes/new" tab={WORK_TAB}>
        <span aria-hidden="true">+</span> Νέα συνεδρία
      </PaperLink>
    ) : null;

  // Messages after sign-up or a save, and the owner's «Επόμενα βήματα»: under the title, above the board.
  const notices = (
    <>
      <InviteNotice invites={myInvites} />
      {welcome === "1" && (
        <p role="status" className="bg-note-green px-4 py-3">
          <span className="font-semibold">Η εγγραφή ολοκληρώθηκε. Η κλινική σας είναι έτοιμη.</span> Από εδώ ξεκινάτε κάθε
          νέα συνεδρία.
        </p>
      )}
      {/* A form left open for another clinic (requireSameClinic): nothing was saved. */}
      {stale === "1" && (
        <p role="alert" className="bg-tab-yellow px-4 py-3">
          <span className="font-semibold">Δεν αποθηκεύτηκε τίποτα.</span> Στο μεταξύ ανοίξατε άλλη κλινική, ίσως σε άλλη
          καρτέλα. Τώρα είναι ανοιχτή η «{clinic?.name}». Για την άλλη, πατήστε «Αλλαγή» πάνω, δίπλα στο όνομα της κλινικής.
        </p>
      )}
      {painAlerts > 0 && (
        <p role="status" className="bg-tab-pink px-4 py-3">
          <span className="font-semibold">
            {painAlerts === 1 ? "1 ασθενής ανέφερε δυνατό πόνο στο σπίτι." : `${painAlerts} ασθενείς ανέφεραν δυνατό πόνο στο σπίτι.`}
          </span>{" "}
          <TabLink href="/patients" tab={WORK_TAB}>
            Δείτε τους στους Ασθενείς <span aria-hidden="true">→</span>
          </TabLink>
        </p>
      )}
      {savedNote && (
        <p role="status" className="bg-note-green px-4 py-3 font-semibold">
          {savedNote}
        </p>
      )}

      {isOwner && !profile.demo && !(roomsDone && teamDone) && (
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
                  <input type="hidden" name="clinicId" value={profile.clinic_id ?? ""} />
                  <QuietSubmit pending="Αποθήκευση…">Δουλεύω μόνη/ος, δεν χρειάζεται</QuietSubmit>
                </form>
              )}
            </li>
          </ol>
        </section>
      )}
    </>
  );

  return (
    <StaffSheet profile={profile} current="board" width="wide">
      <TabName name={BOARD_TAB} />
      <AutoRefresh />
      {board.rooms.length === 0 ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <h1 className="flex-[1_1_320px] font-display text-[40px] leading-[1.05] sm:text-[44px]">Η αίθουσα</h1>
            {newSession}
          </div>
          {notices}
          <p className="bg-tab-yellow px-4 py-3">
            Η κλινική δεν έχει ακόμα χώρους.{" "}
            {isOwner ? <Link href="/settings/rooms">Ρυθμίστε πρώτα τους χώρους</Link> : "Ζητήστε από την/τον υπεύθυνη/ο να τους ρυθμίσει."}
          </p>
        </div>
      ) : (
        <RoomBoard initial={board} action={newSession}>
          {notices}
        </RoomBoard>
      )}
      {/* A demo clinic («Δοκιμάστε το»): what to try, under the board, so on a phone the patients come first.
          (A demo has no «Επόμενα βήματα»: those are for a real clinic's owner.) */}
      {profile.demo && (
        <div className="pt-6">
          <DemoTips lang={profile.demo.lang} empty={board.cards.length === 0} />
        </div>
      )}
    </StaffSheet>
  );
}
