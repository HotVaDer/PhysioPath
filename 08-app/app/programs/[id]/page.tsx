// After «Έγκριση»: a green «Εγκρίθηκε» line, the QR code for the patient's phone (the session in the room,
// or the home program), the link, «Εκτύπωση για τον ασθενή» (./print, for a patient without a phone), and the
// GeSY note to copy into the GeSY portal.
// «Νέος σύνδεσμος» (owner, physio): the old links stop at once and the page shows the new QR, e.g. after
// a link went to the wrong number. The home link also stops once a newer program is approved for the
// patient (20261122160000); the page says so.
// Plain look (2026-11-17): no rubber stamp, tilted slips or capital labels. Assistants see the QR (they help patients scan it) but never the note:
// the database gives them no rows from `notes`.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import * as z from "zod";

import { AutoRefresh } from "@/app/components/paper/AutoRefresh";
import { PaperLink, SubmitButton } from "@/app/components/paper/Buttons";
import { ConfirmSubmit } from "@/app/components/paper/ConfirmSubmit";
import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { Panel, PanelTitle, StaffSheet } from "@/app/components/paper/StaffSheet";
import { slotLabel } from "@/app/lib/notes/approval";
import { GESY_LABELS, isBlank, noteAsText } from "@/app/lib/notes/format";
import type { NoteLanguage } from "@/app/lib/notes/prompt";
import { ClinicalNote, GESY_PARTS, readProgram, type ActivityCode } from "@/app/lib/notes/schema";
import { requireMember } from "@/app/lib/onboarding/session";
import { newProgramLink } from "@/app/lib/programs/actions";
import { siteUrl } from "@/app/lib/site";
import { saveTemplate } from "@/app/lib/templates/actions";
import { areaFromBodyArea } from "@/app/lib/templates/area";
import { TEMPLATE_AREA_MAX, TEMPLATE_NAME_MAX, type TemplateResult } from "@/app/lib/templates/load";

import { ClearDraft } from "./ClearDraft";
import { CopyButton } from "./CopyButton";

export const metadata: Metadata = { title: "Εγκρίθηκε" };

const day = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Nicosia" });
const time = new Intl.DateTimeFormat("el-GR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Nicosia" });

export default async function ApprovedPage({ params, searchParams }: PageProps<"/programs/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  // ?note: which visit (one program can have many: «Ίδιο πρόγραμμα»). Without it: the latest one.
  // ?approved=1: we came straight from «Έγκριση», so the draft is done. From the board's «QR / οθόνη
  // ασθενή» there is no such flag, and a note being written in that tab stays.
  const query = await searchParams;
  const noteId = z.uuid().safeParse(query.note);
  const justApproved = query.approved === "1";
  const linkResult = query.link === "new" || query.link === "failed" ? query.link : null;
  // ?template: what happened to «Αποθήκευση ως πρότυπο».
  const templateResult = (["saved", "taken", "badname", "badarea", "failed"] as const).find((r) => r === query.template) ?? null;
  const { supabase, user, profile } = await requireMember();

  const { data: program } = await supabase
    .from("programs")
    .select("id, token, program, approved_at, patient_id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!program) notFound();

  const isPhysio = profile.role !== "assistant";
  const noteQuery = supabase.from("notes").select("activity_code, session_no, note_lang, note, session_id, created_at").eq("program_id", id);
  const [{ data: patient }, { data: note }, { count: newerCount }] = await Promise.all([
    program.patient_id
      ? supabase.from("patients").select("label").eq("id", program.patient_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Assistants get no rows from notes (the database says no), so this is only for physios.
    isPhysio
      ? noteId.success
        ? noteQuery.eq("id", noteId.data).maybeSingle()
        : noteQuery.order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    // A newer program for the same patient: this program's home link no longer opens.
    program.patient_id
      ? supabase
          .from("programs")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", program.patient_id)
          .gt("approved_at", program.approved_at)
      : Promise.resolve({ count: 0 }),
  ]);
  const newer = (newerCount ?? 0) > 0;
  // The visit's own card on the board (none if it was home only); for assistants, the latest card.
  const sessionQuery = supabase.from("sessions").select("token, room_id, slot, finished_at");
  const { data: session } = note
    ? note.session_id
      ? await sessionQuery.eq("id", note.session_id).maybeSingle()
      : { data: null }
    : await sessionQuery.eq("program_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: room } = session?.room_id
    ? await supabase.from("rooms").select("name, beds").eq("id", session.room_id).maybeSingle()
    : { data: null };

  const stored = readProgram(program.program);
  const name = patient?.label ?? stored?.patient_first_name ?? "Ο ασθενής";
  const inRoom = Boolean(session && !session.finished_at);
  const where = room && session?.slot ? `${room.name} · ${slotLabel(room, session.slot)}` : null;
  // QR codes always point at the real address (NEXT_PUBLIC_SITE_URL), never a preview URL.
  const link = inRoom ? `${siteUrl()}/s/${session!.token}` : `${siteUrl()}/p/${program.token}`;
  const svg = await QRCode.toString(link, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const qrSrc = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  // When this visit was approved (for «Ίδιο πρόγραμμα», today's note; else the program itself).
  const approvedAt = new Date((note?.created_at ?? program.approved_at) as string);
  const signedByMe = program.created_by === user.id;

  const parsedNote = note ? ClinicalNote.safeParse(note.note) : null;
  const noteLang = (note?.note_lang ?? "el") as NoteLanguage;
  const noteText =
    note && parsedNote?.success
      ? noteAsText(parsedNote.data, noteLang, { activityCode: note.activity_code as ActivityCode, sessionNo: note.session_no as number })
      : null;

  return (
    <StaffSheet profile={profile}>
      {justApproved && <ClearDraft />}
      <AutoRefresh />
      <div className="flex flex-col gap-7">
        <p className="self-start rounded-md bg-note-green px-4 py-3 text-[19px]">
          <span className="font-bold text-action">✓ Εγκρίθηκε</span> στις {day.format(approvedAt)}, {time.format(approvedAt)}
          {signedByMe && profile.full_name ? `, από εσάς (${profile.full_name})` : ""}.
        </p>

        <div role="status" className="flex max-w-[620px] flex-col gap-2.5">
          <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">
            {inRoom ? `${name}: ${where ?? "στην αίθουσα"}` : `Το πρόγραμμα για ${name} είναι έτοιμο`}
          </h1>
          <p>
            {inRoom
              ? "Δώστε στον ασθενή να σκανάρει τον κωδικό με το κινητό του, ή ανοίξτε τον σύνδεσμο στο tablet της κλινικής."
              : "Δώστε στον ασθενή να σκανάρει τον κωδικό με το κινητό του, ή στείλτε του τον σύνδεσμο. Ανοίγει χωρίς εφαρμογή και χωρίς κωδικό."}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-x-10 gap-y-7">
          <figure className="m-0 flex flex-col items-center gap-2 rounded-md border-2 border-hairline bg-white px-6 pb-4 pt-4">
            <figcaption className="font-semibold">{inRoom ? "Για το κινητό του ασθενή, τώρα" : "Για το σπίτι"}</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated SVG, nothing to optimise */}
            <img src={qrSrc} width={232} height={232} alt={inRoom ? `Κωδικός QR για την οθόνη συνεδρίας: ${name}` : `Κωδικός QR για το πρόγραμμα στο σπίτι: ${name}`} />
          </figure>

          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Ο σύνδεσμος</span>
              <a href={link} target="_blank" rel="noreferrer" className="break-all text-lg">
                {link}
              </a>
            </div>
            <CopyButton text={link} label="Αντιγραφή συνδέσμου" done="Ο σύνδεσμος αντιγράφηκε." />
            {!newer && (
              <p className="flex flex-col gap-0.5">
                <Link href={`/programs/${program.id}/print`} className="min-h-11 content-center self-start font-semibold">
                  Εκτύπωση για τον ασθενή
                </Link>
                <span className="text-base text-muted">Για ασθενή χωρίς κινητό: το πρόγραμμα σε χαρτί, με κουτάκια για 2 εβδομάδες.</span>
              </p>
            )}
            {linkResult === "new" && (
              <p role="status" className="bg-note-green px-4 py-3">
                <span className="font-semibold">Ο παλιός σύνδεσμος έκλεισε.</span> Δώστε στον ασθενή τον νέο κωδικό QR ή τον νέο σύνδεσμο.
              </p>
            )}
            {linkResult === "failed" && <FormAlert>Ο σύνδεσμος δεν άλλαξε. Δοκιμάστε ξανά σε λίγο.</FormAlert>}
            {newer && !inRoom && (
              <p className="bg-tab-yellow px-4 py-3">
                Υπάρχει νεότερο πρόγραμμα για {name}. Αυτός ο σύνδεσμος δεν ανοίγει πια: γράφει στον ασθενή να ζητήσει τον νέο.
              </p>
            )}
            <p className="max-w-[52ch]">
              {inRoom
                ? "Όταν τελειώσει, πατήστε «Ολοκλήρωση» στην κάρτα του στην αίθουσα. Τότε το κινητό του δείχνει το πρόγραμμα για το σπίτι."
                : "Το πρόγραμμα δεν αλλάζει πια. Για αλλαγές: «Νέα συνεδρία» → «Αλλαγή προγράμματος», και ο ασθενής παίρνει νέο σύνδεσμο."}
            </p>
            {isPhysio && (inRoom || !newer) && (
              <form action={newProgramLink} className="flex flex-col gap-1">
                <input type="hidden" name="clinicId" value={profile.clinic_id ?? ""} />
                <input type="hidden" name="programId" value={program.id} />
                {noteId.success && <input type="hidden" name="note" value={noteId.data} />}
                <ConfirmSubmit question="Ο τωρινός σύνδεσμος θα σταματήσει να ανοίγει. Να φτιαχτεί νέος;" pending="Αλλαγή…">
                  Νέος σύνδεσμος
                </ConfirmSubmit>
                <span className="text-base text-muted">Αν ο σύνδεσμος στάλθηκε σε λάθος αριθμό ή έμεινε σε ξένο κινητό.</span>
              </form>
            )}
          </div>
        </div>

        {noteText && parsedNote?.success && (
          <Panel labelledBy="att-h" className="w-full">
            <PanelTitle id="att-h">Κλινική σημείωση για το ΓεΣΥ</PanelTitle>
            <p className="text-muted">Μένει στην κλινική. Αντιγράψτε τη στο σύστημα του ΓεΣΥ.</p>
            <p className="font-display text-[22px] leading-tight">
              {note!.activity_code} · {noteLang === "el" ? "Συνεδρία" : "Session"} {note!.session_no}
              {!isBlank(parsedNote.data.body_area) && ` · ${parsedNote.data.body_area!.trim()}`}
            </p>
            <dl lang={noteLang} className="my-2 flex flex-col gap-1.5 text-base">
              {GESY_PARTS.map((part) => (
                <div key={part}>
                  <dt className="font-semibold">{GESY_LABELS[noteLang][part]}</dt>
                  <dd>{isBlank(parsedNote.data[part]) ? (noteLang === "el" ? "— Δεν αναφέρθηκε" : "— Not mentioned") : parsedNote.data[part]}</dd>
                </div>
              ))}
            </dl>
            <CopyButton text={noteText} label="Αντιγραφή σημείωσης" done="Αντιγράφηκε. Επικολλήστε τη στο σύστημα του ΓεΣΥ." variant="solid" />
          </Panel>
        )}

        {isPhysio && stored && (
          <SaveAsTemplate
            clinicId={profile.clinic_id ?? ""}
            programId={program.id}
            noteId={noteId.success ? noteId.data : null}
            title={stored.title}
            area={parsedNote?.success ? areaFromBodyArea(parsedNote.data.body_area) : null}
            result={templateResult}
          />
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <PaperLink href="/">
            Στην αίθουσα <span aria-hidden="true">→</span>
          </PaperLink>
          {isPhysio && program.patient_id && (
            <Link href={`/patients/${program.patient_id}`}>
              Πρόοδος στο σπίτι <span aria-hidden="true">→</span>
            </Link>
          )}
          {isPhysio && <Link href="/notes/new">Νέα συνεδρία</Link>}
        </div>
      </div>
    </StaffSheet>
  );
}

// «Αποθήκευση ως πρότυπο»: this program, under a name, into the clinic's library (/templates), without the
// patient's name or next appointment. Saving twice gives two templates only under two names.
function SaveAsTemplate({
  clinicId,
  programId,
  noteId,
  title,
  area,
  result,
}: {
  clinicId: string;
  programId: string;
  noteId: string | null;
  title: string;
  area: string | null; // from the note's «Περιοχή σώματος», without the side
  result: Exclude<TemplateResult, "renamed" | "archived"> | null;
}) {
  return (
    <Panel labelledBy="template-h" className="w-full">
      <span id="template" />
      <PanelTitle id="template-h">Αποθήκευση ως πρότυπο</PanelTitle>
      <p className="text-muted">
        Για να το ξαναχρησιμοποιήσετε σε άλλον ασθενή. Το πρότυπο κρατά τις ασκήσεις και τις οδηγίες, χωρίς το όνομα του ασθενή και το
        επόμενο ραντεβού.
      </p>
      {result === "saved" ? (
        <p role="status" className="bg-note-green px-4 py-3">
          <span className="font-semibold">Αποθηκεύτηκε στα πρότυπα.</span>{" "}
          <Link href="/templates">
            Τα πρότυπα της κλινικής <span aria-hidden="true">→</span>
          </Link>
        </p>
      ) : (
        <form action={saveTemplate} className="flex flex-col gap-3">
          <input type="hidden" name="clinicId" value={clinicId} />
          <input type="hidden" name="programId" value={programId} />
          {noteId && <input type="hidden" name="note" value={noteId} />}
          <LineField
            id="template-name"
            name="name"
            label="Όνομα προτύπου"
            hint="Π.χ. «Γόνατο μετά ACL – εβδ. 1–2». Έτσι θα το βρίσκετε."
            defaultValue={title}
            required
            maxLength={TEMPLATE_NAME_MAX}
            error={
              result === "taken"
                ? "Υπάρχει ήδη πρότυπο με αυτό το όνομα. Δώστε άλλο όνομα."
                : result === "badname"
                  ? `Γράψτε ένα όνομα, έως ${TEMPLATE_NAME_MAX} χαρακτήρες.`
                  : undefined
            }
          />
          <LineField
            id="template-area"
            name="area"
            label="Περιοχή (προαιρετικό)"
            hint="Π.χ. «Γόνατο». Με αυτήν βρίσκετε το πρότυπο γρήγορα στη νέα συνεδρία."
            defaultValue={area ?? ""}
            maxLength={TEMPLATE_AREA_MAX}
            width="max-w-[320px]"
            error={result === "badarea" ? `Έως ${TEMPLATE_AREA_MAX} χαρακτήρες.` : undefined}
          />
          {result === "failed" && <FormAlert>Το πρότυπο δεν αποθηκεύτηκε. Δοκιμάστε ξανά σε λίγο.</FormAlert>}
          <SubmitButton pending="Αποθήκευση…">Αποθήκευση ως πρότυπο</SubmitButton>
        </form>
      )}
    </Panel>
  );
}
