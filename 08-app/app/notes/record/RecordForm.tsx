"use client";
// «Νέα συνεδρία», step 3 of 4: the recording (or a file, or a sample) for the patient chosen in step 1,
// and the text we heard, with the proofreader's fixes and undo, then «Δημιουργία προγράμματος» (step 4).
// «Ίδιο πρόγραμμα» (step 2): they talk about today only, and «Δημιουργία σημείωσης» writes just the GeSY
// note; the stored program goes into the result unchanged (it is never sent to the AI).
// Everything is kept in the draft (sessionStorage), so going back and forth between the steps loses nothing.
// Plain look (2026-11-17): the record button as the main green button, the text in a white box, no italics.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { fieldBox } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { Panel, PanelTitle, PartTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import { ApiError, generateNote, generateProgram, transcribeAudio } from "@/app/lib/notes/api";
import { useDraft } from "@/app/lib/notes/DraftContext";
import { formatClock } from "@/app/lib/notes/format";
import { AUDIO_TOO_LARGE, MAX_AUDIO_BYTES } from "@/app/lib/notes/limits";
import type { Sample } from "@/app/lib/notes/samples";
import { MAX_RECORDING_SECONDS, useRecorder } from "@/app/lib/notes/useRecorder";

type Busy = null | "transcribing" | "generating";

const BARS = 20;

const radio = "size-[22px] flex-none cursor-pointer accent-action";
const green =
  "inline-flex min-h-14 cursor-pointer items-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-80";

export function RecordForm({ samples }: { samples: Sample[] }) {
  const router = useRouter();
  const { draft, dispatch, ready } = useDraft();
  // «Ίδιο πρόγραμμα»: only today's GeSY note is written; the stored program stays as it is.
  const same = draft.mode === "same" && Boolean(draft.base);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [heardSeconds, setHeardSeconds] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleAudio(audio: Blob, seconds?: number) {
    if (audio.size > MAX_AUDIO_BYTES) return setError(AUDIO_TOO_LARGE);
    setError(null);
    setBusy("transcribing");
    try {
      const heard = await transcribeAudio(audio);
      dispatch({ type: "transcribed", text: heard.text, fixes: heard.fixes, seconds: heard.seconds, proofreadSeconds: heard.proofreadSeconds, recordingSeconds: seconds });
      setHeardSeconds(heard.seconds + heard.proofreadSeconds);
      requestAnimationFrame(() => textRef.current?.focus());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Η ηχογράφηση δεν διαβάστηκε. Δοκιμάστε ξανά.");
    } finally {
      setBusy(null);
    }
  }

  const recorder = useRecorder((audio, seconds) => void handleAudio(audio, seconds));

  // No patient chosen (opened directly, or the draft was cleared): back to step 1.
  const noPatient = ready && !draft.patient;
  useEffect(() => {
    if (noPatient) router.replace("/notes/new");
  }, [noPatient, router]);

  async function create() {
    if (!draft.transcript.trim()) return setError("Ηχογραφήστε ή γράψτε πρώτα τη σημείωση.");
    setError(null);
    setBusy("generating");
    try {
      if (same && draft.base) {
        const { result, seconds } = await generateNote(draft.transcript, draft.noteLang);
        const full = { program: draft.base.program, note: result.note, missing_or_unclear: result.missing_or_unclear };
        dispatch({ type: "generated", result: full, seconds, noteLang: draft.noteLang, draftId: crypto.randomUUID() });
      } else {
        const { result, seconds } = await generateProgram(draft.transcript, draft.noteLang);
        dispatch({ type: "generated", result, seconds, noteLang: draft.noteLang, draftId: crypto.randomUUID() });
      }
      router.push("/notes/review");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : same ? "Η σημείωση δεν γράφτηκε. Δοκιμάστε ξανά." : "Το πρόγραμμα δεν γράφτηκε. Δοκιμάστε ξανά.");
      setBusy(null);
    }
  }

  if (!ready || !draft.patient) return <p className="text-muted">Φόρτωση…</p>;

  const recording = recorder.state === "recording";
  const patientLabel = draft.patient.label.trim() || "ασθενής χωρίς όνομα";
  const programStep = draft.patient.id ? (`/notes/program?patient=${draft.patient.id}` as const) : null;
  const hasText = draft.transcript.length > 0;
  const lit = Math.round(recorder.level * BARS);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Ηχογράφηση</h1>
        <p className="flex flex-wrap items-center gap-x-4 text-[19px]">
          <span>
            Για: <strong>{patientLabel}</strong>
            {draft.patient.id ? "" : " (νέος ασθενής)"}
          </span>
          <Link href="/notes/new" className="min-h-11 content-center text-base">
            Αλλαγή ασθενή
          </Link>
        </p>
        {programStep && (
          <p className="flex flex-wrap items-center gap-x-4 text-[19px]">
            <span>
              Πρόγραμμα: <strong>{same ? "ίδιο" : "νέο"}</strong>
            </span>
            <Link href={programStep} className="min-h-11 content-center text-base">
              Αλλαγή
            </Link>
          </p>
        )}
      </div>

      {/* The recording */}
      <section aria-label="Ηχογράφηση" className="flex flex-col gap-3">
        {same ? (
          <p className="max-w-[62ch]">
            Πείτε <strong>τι κάνατε σήμερα και πώς πάει</strong>. Το πρόγραμμα για το σπίτι μένει ίδιο: γράφουμε μόνο τη
            σημείωση για τον ΓεΣΥ. Έως {MAX_RECORDING_SECONDS / 60} λεπτά.
          </p>
        ) : (
          <p className="max-w-[62ch]">
            Πείτε πρώτα <strong>τι κάνατε σήμερα και πώς πάει</strong>. Μετά <strong>τις ασκήσεις για το σπίτι</strong>, όπως τις λέτε στον
            ασθενή. Έως {MAX_RECORDING_SECONDS / 60} λεπτά.
          </p>
        )}

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
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="button" onClick={() => void recorder.start()} disabled={busy !== null} className={cx(green, "min-h-16 text-xl")}>
                <span aria-hidden="true" className="size-5 rounded-full bg-error ring-[3px] ring-white" />
                {hasText ? "Νέα ηχογράφηση" : "Έναρξη ηχογράφησης"}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>Δοκιμή χωρίς μικρόφωνο:</span>
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
            <p className="text-muted">Ο ήχος δεν αποθηκεύεται: κρατάμε μόνο το κείμενο.</p>
          </div>
        )}
        {recorder.error && <FormAlert>{recorder.error}</FormAlert>}
        {busy === "transcribing" && (
          <p role="status" className="font-semibold">
            Γράφουμε αυτά που είπατε… λίγα δευτερόλεπτα.
          </p>
        )}
      </section>

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
              Διορθώστε ό,τι ακούστηκε λάθος. Από αυτό το κείμενο γράφουμε {same ? "τη σημείωση" : "το πρόγραμμα"}.
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

          {draft.fixes.length > 0 && (
            <Panel tint="green" labelledBy="fix-h">
              <PanelTitle id="fix-h">Διορθώσαμε {draft.fixes.length === 1 ? "1 λέξη" : `${draft.fixes.length} λέξεις`}</PanelTitle>
              <p>Λέξεις που ακούστηκαν λάθος. Αριθμούς, πλευρά και ασκήσεις δεν τα αλλάζουμε ποτέ.</p>
              <ul className="flex flex-col">
                {draft.fixes.map((fix, i) => (
                  <li key={`${fix.heard}-${i}`} className="flex min-h-11 flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-hairline">
                    <span>
                      «{fix.heard}» → «<strong>{fix.corrected}</strong>»
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "undoFix", index: i })}
                      className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink"
                    >
                      Αναίρεση<span className="sr-only">: «{fix.corrected}» πίσω σε «{fix.heard}»</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

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
                ? same
                  ? "Γράφουμε τη σημείωση…"
                  : "Γράφουμε το πρόγραμμα…"
                : same
                  ? "Δημιουργία σημείωσης"
                  : "Δημιουργία προγράμματος"}{" "}
              <span aria-hidden="true">→</span>
            </button>
            <span role="status" className="text-muted">
              {busy === "generating" ? "Περίπου 20 δευτερόλεπτα. Μην κλείσετε τη σελίδα." : "Περίπου 20 δευτερόλεπτα."}
            </span>
          </div>
          {draft.result && busy === null && (
            <p>
              Υπάρχει ήδη {same ? "σημείωση" : "πρόγραμμα"} από αυτό το κείμενο. <Link href="/notes/review">Συνέχεια στον έλεγχο</Link>
            </p>
          )}
        </section>
      )}

      <FormAlert>{error}</FormAlert>
    </div>
  );
}
