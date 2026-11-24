"use client";
// «Νέα συνεδρία», step 3 of 4: the recording (or a file, or a sample) for the patient chosen in step 1,
// and the text we heard (the physio can correct it), then «Δημιουργία προγράμματος» (step 4).
// «Ίδιο πρόγραμμα» (step 2): they talk about today only, and «Δημιουργία σημείωσης» writes just the GeSY
// note; the stored program goes into the result unchanged (it is never sent to the AI).
// Everything is kept in the draft (sessionStorage), so going back and forth between the steps loses nothing.
// Plain look (2026-11-17): the record button as the main green button, the text in a white box, no italics.
// A demo clinic («Δοκιμάστε το») has 5 programs and 5 recordings in all (the yellow strip on top says how many
// are left): once the recordings are used up the record buttons rest (the samples still work while programs are left).
// «Ξεκινήστε από πρότυπο» (a new program, when the clinic has templates): the physio picks one of the clinic's
// own templates. «Όπως είναι»: the program is the template unchanged and only the GeSY note is written (as for
// «Ίδιο πρόγραμμα»: the AI never sees the program). «Με αλλαγές»: they say only what changes and the AI
// applies it to the template. Never offered for «Ίδιο πρόγραμμα».
// Layout (2026-11-24): three blocks split by hairlines, in the order they are used: 1. «Πρότυπο» (optional,
// first because it changes what to say), 2. «Τι να πείτε» as a short numbered list in a white box + the record
// button (the privacy line right under it), 3. «Χωρίς μικρόφωνο;» samples, quieter because they are secondary.
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { fieldBox } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { PartTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import type { DemoLeft } from "@/app/lib/demo/left";
import { ApiError, generateNote, generateProgram, transcribeAudio } from "@/app/lib/notes/api";
import { useDraft } from "@/app/lib/notes/DraftContext";
import { isStale, noteFor } from "@/app/lib/notes/draft";
import { formatClock } from "@/app/lib/notes/format";
import { AUDIO_TOO_LARGE, MAX_AUDIO_BYTES } from "@/app/lib/notes/limits";
import type { Sample } from "@/app/lib/notes/samples";
import type { PatientProgram } from "@/app/lib/notes/schema";
import { MAX_RECORDING_SECONDS, useRecorder } from "@/app/lib/notes/useRecorder";
import { ProgramSummary } from "@/app/notes/ProgramSummary";
import { StaleNotice } from "@/app/notes/StaleNotice";

type Busy = null | "transcribing" | "generating";

const BARS = 20;

const radio = "size-[22px] flex-none cursor-pointer accent-action";
const green =
  "inline-flex min-h-14 cursor-pointer items-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-80";

// One of the clinic's templates, for the picker.
export type TemplateChoice = { id: string; name: string; program: PatientProgram };

export function RecordForm({
  samples,
  demoLeft = null,
  templates = [],
}: {
  samples: Sample[];
  demoLeft?: DemoLeft | null;
  templates?: TemplateChoice[];
}) {
  const router = useRouter();
  const { draft, dispatch, ready } = useDraft();
  // «Ίδιο πρόγραμμα»: only today's GeSY note is written; the stored program stays as it is.
  const same = draft.mode === "same" && Boolean(draft.base);
  // The template picked for a new program, and whether it is used «Όπως είναι» (then only the note is written).
  const chosen = !same && draft.template ? (templates.find((t) => t.id === draft.template!.id) ?? null) : null;
  const asIsTemplate = chosen && draft.template?.asIs ? chosen : null;
  const noteOnly = same || asIsTemplate !== null;
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [heardSeconds, setHeardSeconds] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Still on this page? A slow answer must not move the physio away from wherever they went meanwhile.
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);

  async function handleAudio(audio: Blob, seconds?: number) {
    if (audio.size > MAX_AUDIO_BYTES) return setError(AUDIO_TOO_LARGE);
    setError(null);
    setBusy("transcribing");
    const startedFor = noteFor(draft);
    try {
      const heard = await transcribeAudio(audio);
      dispatch({ type: "transcribed", text: heard.text, seconds: heard.seconds, recordingSeconds: seconds, startedFor });
      setHeardSeconds(heard.seconds);
      requestAnimationFrame(() => textRef.current?.focus());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Η ηχογράφηση δεν διαβάστηκε. Δοκιμάστε ξανά.");
    } finally {
      setBusy(null);
      if (demoLeft) router.refresh(); // the demo strip's «Μένουν» count, from the database again
    }
  }

  const recorder = useRecorder((audio, seconds) => void handleAudio(audio, seconds));

  // The template picked earlier was archived meanwhile: start without it.
  const templateGone = ready && draft.template !== null && !templates.some((t) => t.id === draft.template!.id);
  useEffect(() => {
    if (templateGone) dispatch({ type: "setTemplate", template: null });
  }, [templateGone, dispatch]);

  // No patient chosen (opened directly, or the draft was cleared): back to step 1.
  const noPatient = ready && !draft.patient;
  useEffect(() => {
    if (noPatient) router.replace("/notes/new");
  }, [noPatient, router]);

  async function create() {
    if (!draft.transcript.trim()) return setError("Ηχογραφήστε ή γράψτε πρώτα τη σημείωση.");
    setError(null);
    setBusy("generating");
    const startedFor = noteFor(draft);
    const sent = draft.transcript; // what the result is made from (isStale)
    try {
      // «Ίδιο πρόγραμμα», or a template «Όπως είναι»: only the note is written; the program goes in unchanged.
      const kept = same && draft.base ? draft.base.program : asIsTemplate?.program;
      if (kept) {
        const { result, seconds } = await generateNote(draft.transcript, draft.noteLang);
        const full = { program: kept, note: result.note, missing_or_unclear: result.missing_or_unclear };
        dispatch({ type: "generated", result: full, seconds, noteLang: draft.noteLang, draftId: crypto.randomUUID(), startedFor, transcript: sent });
      } else {
        const { result, seconds } = await generateProgram(draft.transcript, draft.noteLang, draft.template?.id);
        dispatch({ type: "generated", result, seconds, noteLang: draft.noteLang, draftId: crypto.randomUUID(), startedFor, transcript: sent });
      }
      if (here.current) router.push("/notes/review");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : noteOnly ? "Η σημείωση δεν γράφτηκε. Δοκιμάστε ξανά." : "Το πρόγραμμα δεν γράφτηκε. Δοκιμάστε ξανά.");
      setBusy(null);
      if (demoLeft) router.refresh();
    }
  }

  if (!ready || !draft.patient) return <p className="text-muted">Φόρτωση…</p>;

  const recording = recorder.state === "recording";
  const patientLabel = draft.patient.label.trim() || "ασθενής χωρίς όνομα";
  const programStep = draft.patient.id ? (`/notes/program?patient=${draft.patient.id}` as const) : null;
  const hasText = draft.transcript.length > 0;
  const lit = Math.round(recorder.level * BARS);
  const noRecordings = demoLeft !== null && demoLeft.transcribe <= 0;
  // «Τι να πείτε»: what to say, in order (one line for «Ίδιο πρόγραμμα», two otherwise).
  const today = (
    <>
      <strong>Τι κάνατε σήμερα</strong> και πώς πάει
    </>
  );
  const say: ReactNode[] = noteOnly
    ? [today]
    : chosen
      ? [
          today,
          <>
            <strong>Μόνο τι αλλάζει</strong> από το πρότυπο «{chosen.name}», π.χ. «χωρίς την τρίτη άσκηση, 2 σετ αντί για 3».
          </>,
        ]
      : [
          today,
          <>
            <strong>Τις ασκήσεις για το σπίτι</strong>, όπως τις λέτε στον ασθενή
          </>,
        ];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Ηχογράφηση</h1>
        <p className="flex flex-wrap items-center gap-x-4 text-[19px]">
          <span>
            Για: <strong>{patientLabel}</strong>
            {draft.patient.id ? "" : " (νέος ασθενής)"}
          </span>
          <ChangeLink href="/notes/new" locked={busy !== null || recording}>
            Αλλαγή ασθενή
          </ChangeLink>
        </p>
        {programStep && (
          <p className="flex flex-wrap items-center gap-x-4 text-[19px]">
            <span>
              Πρόγραμμα: <strong>{same ? "ίδιο" : "νέο"}</strong>
            </span>
            <ChangeLink href={programStep} locked={busy !== null || recording}>
              Αλλαγή
            </ChangeLink>
          </p>
        )}
      </div>

      {/* 1. The template (optional). First, because it changes what the physio says. */}
      {!same && templates.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t-2 border-hairline pt-5">
          <label htmlFor="template" className="text-[21px] font-bold">
            Πρότυπο <span className="text-[19px] font-normal text-muted">(προαιρετικό)</span>
          </label>
          <p id="template-hint" className="text-base text-muted">
            Ένα από τα πρότυπα της κλινικής σας, όπως είναι ή με αλλαγές που λέτε.
          </p>
          <select
            id="template"
            aria-describedby="template-hint"
            value={chosen?.id ?? ""}
            disabled={busy !== null || recording}
            onChange={(e) => {
              const picked = templates.find((t) => t.id === e.target.value);
              setError(null);
              // A new pick starts «Όπως είναι»: the usual case, and the AI doesn't touch the program.
              dispatch({ type: "setTemplate", template: picked ? { id: picked.id, name: picked.name, asIs: draft.template?.asIs ?? true } : null });
            }}
            className={cx(fieldBox(), "max-w-[480px] cursor-pointer")}
          >
            <option value="">Χωρίς πρότυπο</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.program.exercises.length === 1 ? "1 άσκηση" : `${t.program.exercises.length} ασκήσεις`})
              </option>
            ))}
          </select>
          {chosen && draft.template && (
            <>
              <fieldset className="flex flex-col gap-1 pt-2">
                <legend className="sr-only">Πώς θα χρησιμοποιηθεί το πρότυπο</legend>
                {([
                  [true, "Όπως είναι", "Οι ίδιες ασκήσεις και οδηγίες. Ηχογραφείτε μόνο τι κάνατε σήμερα, για τον ΓεΣΥ."],
                  [false, "Με αλλαγές", "Λέτε τι αλλάζει (π.χ. ένα σετ λιγότερο, μια άσκηση έξω) και το αλλάζουμε."],
                ] as const).map(([asIs, label, text]) => (
                  <label key={label} className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1">
                    <input
                      type="radio"
                      name="template-use"
                      checked={draft.template!.asIs === asIs}
                      disabled={busy !== null || recording}
                      onChange={() => dispatch({ type: "setTemplate", template: { ...draft.template!, asIs } })}
                      className={cx(radio, "mt-0.5")}
                    />
                    <span>
                      <strong>{label}</strong> <span className="text-muted">· {text}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <ProgramSummary id="template-preview" program={chosen.program} />
            </>
          )}
        </div>
      )}

      {/* 2. What to say (a short list to glance at while speaking), then the recording itself */}
      <section aria-labelledby="say-h" className="flex flex-col gap-4 border-t-2 border-hairline pt-5">
        <h2 id="say-h" className="text-[21px] font-bold">
          Τι να πείτε
        </h2>
        <div className="flex flex-col gap-3 rounded-md border-2 border-hairline bg-white px-4 py-3.5 sm:px-5">
          <ol className="flex flex-col gap-2.5">
            {say.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-lg">
                {say.length > 1 && (
                  <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-full bg-note-green font-bold text-action">
                    {i + 1}
                  </span>
                )}
                <span className={say.length > 1 ? "pt-0.5" : undefined}>{item}</span>
              </li>
            ))}
          </ol>
          <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-hairline pt-2.5 text-muted">
            {same && <span>Το πρόγραμμα για το σπίτι μένει ίδιο: γράφουμε μόνο τη σημείωση για τον ΓεΣΥ.</span>}
            {asIsTemplate && <span>Το πρόγραμμα είναι το πρότυπο «{asIsTemplate.name}» όπως είναι: γράφουμε μόνο τη σημείωση για τον ΓεΣΥ.</span>}
            <span className="ml-auto font-semibold">Έως {MAX_RECORDING_SECONDS / 60} λεπτά</span>
          </p>
        </div>

        {recording ? (
          <div role="status" className="flex flex-wrap items-center gap-x-7 gap-y-4 rounded-md border-2 border-ink bg-white px-5 py-4">
            <div className="flex flex-col">
              <span className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="size-3.5 rounded-full bg-error" />
                Ηχογραφείται
              </span>
              <span className="text-[34px] font-bold leading-tight tabular-nums">
                {formatClock(recorder.elapsed)} <span className="text-lg font-normal">/ {formatClock(MAX_RECORDING_SECONDS)}</span>
              </span>
            </div>
            <span aria-hidden="true" className="flex h-12 flex-[1_1_200px] items-center gap-1">
              {Array.from({ length: BARS }, (_, i) => (
                <span key={i} className={cx("max-w-2.5 flex-1 rounded-sm", i < lit ? "bg-ink" : "bg-hairline")} style={{ height: `${14 + ((i * 7) % 30)}px` }} />
              ))}
            </span>
            <button type="button" onClick={recorder.stop} className={green}>
              <span aria-hidden="true" className="size-3.5 bg-white" />
              Τέλος ηχογράφησης
            </button>
            {recorder.tooQuiet && (
              <p className="basis-full font-semibold">Δεν σας ακούμε καλά. Πλησιάστε το μικρόφωνο ή μιλήστε πιο δυνατά.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="button" onClick={() => void recorder.start()} disabled={busy !== null || noRecordings} className={cx(green, "min-h-16 text-xl disabled:cursor-not-allowed")}>
                <span aria-hidden="true" className="size-5 rounded-full bg-error ring-[3px] ring-white" />
                {hasText ? "Νέα ηχογράφηση" : "Έναρξη ηχογράφησης"}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null || noRecordings}
                className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink disabled:cursor-wait"
              >
                ή ανέβασμα αρχείου ήχου (έως 4 MB)
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleAudio(file);
                }}
              />
            </div>
            <p className="text-base text-muted">Ο ήχος δεν αποθηκεύεται: κρατάμε μόνο το κείμενο.</p>
            {noRecordings && (
              <p className="self-start bg-tab-pink px-4 py-3">Τελείωσαν οι ηχογραφήσεις της δοκιμής. Δοκιμάστε ένα έτοιμο παράδειγμα εδώ κάτω.</p>
            )}
          </div>
        )}
        {recorder.error && <FormAlert>{recorder.error}</FormAlert>}
        {busy === "transcribing" && (
          <p role="status" className="font-semibold">
            Γράφουμε αυτά που είπατε… λίγα δευτερόλεπτα.
          </p>
        )}
      </section>

      {/* 3. No microphone: a ready sample (secondary, so quieter) */}
      {!recording && (
        <section aria-labelledby="samples-h" className="flex flex-col gap-2.5 border-t-2 border-hairline pt-5">
          <h2 id="samples-h" className="font-semibold">
            Χωρίς μικρόφωνο; <span className="font-normal text-muted">Δοκιμάστε ένα έτοιμο παράδειγμα.</span>
          </h2>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {samples.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setError(null);
                  setHeardSeconds(null);
                  dispatch({ type: "pickSample", text: s.text });
                }}
                className="min-h-11 cursor-pointer rounded-md border-2 border-line bg-white px-3.5 text-ink hover:border-action disabled:cursor-wait"
              >
                {s.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* What we heard */}
      {hasText && (
        <section aria-labelledby="txt-h" className="flex flex-col gap-3.5 border-t-2 border-hairline pt-5">
          <PartTitle id="txt-h">Τι ακούσαμε</PartTitle>
          {heardSeconds !== null && <p className="font-semibold text-action">✓ Έτοιμο κείμενο σε {Math.max(1, Math.round(heardSeconds))} δευτερόλεπτα</p>}
          <div className="flex flex-col gap-1">
            <label htmlFor="t-text" className="text-[19px] font-semibold">
              Το κείμενο
            </label>
            <p id="t-text-hint" className="text-muted">
              Διορθώστε ό,τι ακούστηκε λάθος. Από αυτό το κείμενο γράφουμε {noteOnly ? "τη σημείωση" : "το πρόγραμμα"}.
            </p>
            <textarea
              id="t-text"
              ref={textRef}
              rows={8}
              value={draft.transcript}
              aria-describedby="t-text-hint"
              onChange={(e) => dispatch({ type: "typeTranscript", text: e.target.value })}
              className={cx(fieldBox(), "resize-y py-2.5 text-lg leading-relaxed")}
            />
          </div>

          <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <legend className="float-left mr-4">Η κλινική σημείωση στα:</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input type="radio" name="lang" checked={draft.noteLang === "el"} onChange={() => dispatch({ type: "setNoteLang", lang: "el" })} className={radio} />
              Ελληνικά
            </label>
            <label lang="en" className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input type="radio" name="lang" checked={draft.noteLang === "en"} onChange={() => dispatch({ type: "setNoteLang", lang: "en" })} className={radio} />
              English
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <button type="button" onClick={() => void create()} disabled={busy !== null || recording} className={green}>
              {busy === "generating"
                ? noteOnly
                  ? "Γράφουμε τη σημείωση…"
                  : "Γράφουμε το πρόγραμμα…"
                : noteOnly
                  ? "Δημιουργία σημείωσης"
                  : "Δημιουργία προγράμματος"}{" "}
              <span aria-hidden="true">→</span>
            </button>
            <span role="status" className="text-muted">
              {busy === "generating" ? "Περίπου 20 δευτερόλεπτα. Μην κλείσετε τη σελίδα." : "Περίπου 20 δευτερόλεπτα."}
            </span>
          </div>
          {draft.result && busy === null && !isStale(draft) && (
            <p>
              Υπάρχει ήδη {noteOnly ? "σημείωση" : "πρόγραμμα"} από αυτό το κείμενο. <Link href="/notes/review">Συνέχεια στον έλεγχο</Link>
            </p>
          )}
          {draft.result && busy === null && isStale(draft) && (
            <StaleNotice
              same={noteOnly}
              onNew={() => void create()}
              onKeep={() => {
                dispatch({ type: "keepResult" });
                router.push("/notes/review");
              }}
            />
          )}
        </section>
      )}

      <FormAlert>{error}</FormAlert>
    </div>
  );
}

// «Αλλαγή ασθενή» / «Αλλαγή»: plain text while a recording or a program is under way, so the answer
// can't land on someone else (the reducer throws such answers away too, see noteFor).
function ChangeLink({ href, locked, children }: { href: Route; locked: boolean; children: ReactNode }) {
  if (locked) {
    return (
      <span aria-disabled="true" title="Περιμένετε να τελειώσει" className="min-h-11 content-center text-base text-muted">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="min-h-11 content-center text-base">
      {children}
    </Link>
  );
}
