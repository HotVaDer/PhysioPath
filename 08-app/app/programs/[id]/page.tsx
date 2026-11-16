// The approved sheet: the stamp, the QR code for the patient's phone (the session in the room, or the
// home program), the link, and the GeSY note to copy into the GeSY portal.
// Canvas: board PRApproved. Assistants see the QR (they help patients scan it) but never the note:
// the database gives them no rows from `notes`.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import * as z from "zod";

import { PaperLink } from "@/app/components/paper/Buttons";
import { Stamp } from "@/app/components/paper/Notes";
import { Slip, SlipTitle, StaffSheet } from "@/app/components/paper/StaffSheet";
import { slotLabel } from "@/app/lib/notes/approval";
import { GESY_LABELS, isBlank, noteAsText } from "@/app/lib/notes/format";
import type { NoteLanguage } from "@/app/lib/notes/prompt";
import { ClinicalNote, GESY_PARTS, type ActivityCode } from "@/app/lib/notes/schema";
import { requireMember } from "@/app/lib/onboarding/session";
import { siteUrl } from "@/app/lib/site";

import { ClearDraft } from "./ClearDraft";
import { CopyButton } from "./CopyButton";

export const metadata: Metadata = { title: "Εγκρίθηκε" };

const dateTime = new Intl.DateTimeFormat("el-GR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Nicosia" });
const stampDate = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Nicosia" });

export default async function ApprovedPage({ params }: PageProps<"/programs/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, user, profile } = await requireMember();

  const { data: program } = await supabase
    .from("programs")
    .select("id, token, program, approved_at, patient_id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!program) notFound();

  const isPhysio = profile.role !== "assistant";
  const [{ data: session }, { data: patient }, { data: note }] = await Promise.all([
    supabase.from("sessions").select("token, room_id, slot, finished_at").eq("program_id", id).maybeSingle(),
    program.patient_id
      ? supabase.from("patients").select("label").eq("id", program.patient_id).maybeSingle()
      : Promise.resolve({ data: null }),
    isPhysio
      ? supabase.from("notes").select("activity_code, session_no, note_lang, note").eq("program_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const { data: room } = session?.room_id
    ? await supabase.from("rooms").select("name, beds").eq("id", session.room_id).maybeSingle()
    : { data: null };

  const name = patient?.label ?? (program.program as { patient_first_name?: string | null }).patient_first_name ?? "Ο ασθενής";
  const inRoom = Boolean(session && !session.finished_at);
  const where = room && session?.slot ? `${room.name} · ${slotLabel(room, session.slot)}` : null;
  // QR codes always point at the real address (NEXT_PUBLIC_SITE_URL), never a preview URL.
  const link = inRoom ? `${siteUrl()}/s/${session!.token}` : `${siteUrl()}/p/${program.token}`;
  const svg = await QRCode.toString(link, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const qrSrc = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const approvedAt = new Date(program.approved_at as string);
  const signedByMe = program.created_by === user.id;

  const parsedNote = note ? ClinicalNote.safeParse(note.note) : null;
  const noteLang = (note?.note_lang ?? "el") as NoteLanguage;
  const noteText =
    note && parsedNote?.success
      ? noteAsText(parsedNote.data, noteLang, { activityCode: note.activity_code as ActivityCode, sessionNo: note.session_no as number })
      : null;

  return (
    <StaffSheet profile={profile} title={`Εγκρίθηκε ${dateTime.format(approvedAt)}`}>
      <ClearDraft />
      <div className="relative flex flex-col gap-7">
        <Stamp
          word="ΕΓΚΡΙΘΗΚΕ"
          top={signedByMe && profile.full_name ? profile.full_name.toLocaleUpperCase("el") : "PHYSIOPATH"}
          date={stampDate.format(approvedAt).toLocaleUpperCase("el")}
          animate
          className="self-end sm:absolute sm:right-0 sm:top-0"
        />

        <div role="status" className="flex max-w-[500px] flex-col gap-2.5">
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
          <figure className="relative m-0 flex -rotate-1 flex-col items-center gap-2.5 border border-hairline bg-white px-6 pb-4 pt-6 shadow-[0_10px_24px_-18px_rgba(43,36,32,0.6)]">
            <svg width="44" height="14" viewBox="0 0 44 14" fill="none" aria-hidden="true" className="absolute -top-1.5 left-5">
              <path d="M2 12V4h40v8" stroke="#8A8178" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
            <figcaption className="font-typed text-sm font-bold tracking-[0.06em]">{inRoom ? "ΓΙΑ ΤΟ ΚΙΝΗΤΟ ΤΗΣ ΣΥΝΕΔΡΙΑΣ" : "ΓΙΑ ΤΟ ΣΠΙΤΙ"}</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated SVG, nothing to optimise */}
            <img src={qrSrc} width={232} height={232} alt={inRoom ? `Κωδικός QR για την οθόνη συνεδρίας: ${name}` : `Κωδικός QR για το πρόγραμμα στο σπίτι: ${name}`} />
          </figure>

          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px]">Σύνδεσμος</span>
              <a href={link} target="_blank" rel="noreferrer" className="break-all border-b-2 border-line pb-1 font-typed text-lg text-ink">
                {link}
              </a>
            </div>
            <CopyButton text={link} label="Αντιγραφή συνδέσμου" done="Ο σύνδεσμος αντιγράφηκε." />
            <p className="max-w-[52ch]">
              {inRoom
                ? "Όταν τελειώσει, πατήστε «Τέλος» στην κάρτα του στην αίθουσα. Τότε το κινητό του δείχνει το πρόγραμμα για το σπίτι."
                : "Το πρόγραμμα δεν αλλάζει πια. Για αλλαγές γράφετε νέα σημείωση και ο ασθενής παίρνει νέο σύνδεσμο."}
            </p>
            <p className="text-[15px] italic text-muted">Η οθόνη του ασθενή και ο πίνακας της αίθουσας έρχονται στο επόμενο βήμα της εφαρμογής.</p>
          </div>
        </div>

        {noteText && parsedNote?.success && (
          <Slip labelledBy="att-h" className="w-full rotate-[0.6deg]">
            <SlipTitle id="att-h">ΣΥΝΗΜΜΕΝΟ · ΚΛΙΝΙΚΗ ΣΗΜΕΙΩΣΗ</SlipTitle>
            <p className="font-display text-[22px] leading-tight">
              {note!.activity_code} · {noteLang === "el" ? "Συνεδρία" : "Session"} {note!.session_no}
              {!isBlank(parsedNote.data.body_area) && ` · ${parsedNote.data.body_area!.trim()}`}
            </p>
            <dl lang={noteLang} className="my-2 flex flex-col gap-1.5 text-base">
              {GESY_PARTS.map((part) => (
                <div key={part}>
                  <dt className="font-semibold">{GESY_LABELS[noteLang][part]}</dt>
                  <dd className="font-typed">{isBlank(parsedNote.data[part]) ? (noteLang === "el" ? "— Δεν αναφέρθηκε" : "— Not mentioned") : parsedNote.data[part]}</dd>
                </div>
              ))}
            </dl>
            <CopyButton text={noteText} label="Αντιγραφή σημείωσης" done="Αντιγράφηκε. Επικολλήστε τη στο σύστημα του ΓεΣΥ." variant="solid" />
          </Slip>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <PaperLink href="/">
            Στην αίθουσα <span aria-hidden="true">→</span>
          </PaperLink>
          {isPhysio && <Link href="/notes/new">Νέα σημείωση</Link>}
        </div>
      </div>
    </StaffSheet>
  );
}
