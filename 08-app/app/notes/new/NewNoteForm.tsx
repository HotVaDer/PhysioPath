"use client";
// The physio's side of «Νέα σημείωση»: Α. who it's for, Β. record (or upload, or a sample),
// Γ. the text we heard, with the proofreader's fixes and undo, then «Δημιουργία προγράμματος».
// Everything is kept in the draft (sessionStorage), so going to the review page and back loses nothing.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { FormAlert } from "@/app/components/paper/Notes";
import { PartHeading, Slip, SlipTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import { ApiError, generateProgram, transcribeAudio } from "@/app/lib/notes/api";
import { useDraft } from "@/app/lib/notes/DraftContext";
import { formatClock } from "@/app/lib/notes/format";
import { AUDIO_TOO_LARGE, MAX_AUDIO_BYTES } from "@/app/lib/notes/limits";
import type { Sample } from "@/app/lib/notes/samples";
import { MAX_RECORDING_SECONDS, useRecorder } from "@/app/lib/notes/useRecorder";

type Patient = { id: string; label: string };
type Busy = null | "transcribing" | "generating";

const BARS = 20;

export function NewNoteForm({ patients, samples }: { patients: Patient[]; samples: Sample[] }) {
  const router = useRouter();
  const { draft, dispatch, ready } = useDraft();
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

  async function create() {
    if (!draft.transcript.trim()) return setError("Ηχογραφήστε ή γράψτε πρώτα τη σημείωση.");
    setError(null);
    setBusy("generating");
    try {
      const { result, seconds } = await generateProgram(draft.transcript, draft.noteLang);
      dispatch({ type: "generated", result, seconds, noteLang: draft.noteLang, draftId: crypto.randomUUID() });
      router.push("/notes/review");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Το πρόγραμμα δεν γράφτηκε. Δοκιμάστε ξανά.");
      setBusy(null);
    }
  }

  if (!ready) return <p className="italic text-muted">Φόρτωση…</p>;

  const recording = recorder.state === "recording";
  const selected = draft.patient ? (draft.patient.id ?? "new") : null;
  const hasText = draft.transcript.length > 0;
  const lit = Math.round(recorder.level * BARS);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Νέα σημείωση</h1>
        <p className="italic text-muted">
          Μιλάτε μία φορά. Γράφουμε το πρόγραμμα για το σπίτι και την κλινική σημείωση, κι εσείς τα ελέγχετε πριν φτάσει
          οτιδήποτε στον ασθενή.
        </p>
      </div>

      {/* Α. Ασθενής */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2">
          <span className="flex items-baseline gap-3 font-display text-[26px] sm:text-[30px]">
            <span className="text-[30px] sm:text-[34px]">Α.</span> Ασθενής
          </span>
        </legend>
        <div className="flex flex-wrap gap-x-7 gap-y-1">
          {patients.map((p) => (
            <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="patient"
                checked={selected === p.id}
                onChange={() => dispatch({ type: "setPatient", patient: { id: p.id, label: p.label } })}
                className="size-[22px] accent-action"
              />
              {p.label}
            </label>
          ))}
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="patient"
              checked={selected === "new"}
              onChange={() => dispatch({ type: "setPatient", patient: { id: null, label: "" } })}
              className="size-[22px] accent-action"
            />
            Νέος ασθενής
          </label>
        </div>
        {selected === "new" && (
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 pt-1">
            <label htmlFor="n-label" className="text-base sm:flex-[0_0_200px]">
              Μικρό όνομα ή κωδικός
            </label>
            <input
              id="n-label"
              type="text"
              maxLength={60}
              autoComplete="off"
              value={draft.patient?.label ?? ""}
              onChange={(e) => dispatch({ type: "setPatient", patient: { id: null, label: e.target.value } })}
              aria-describedby="n-label-hint"
              className="min-h-11 w-full max-w-[260px] flex-[1_1_220px] border-0 border-b-2 border-line bg-transparent px-1 font-typed text-xl"
            />
            <p id="n-label-hint" className="basis-full text-[15px] italic text-muted sm:pl-[214px]">
              Τίποτε άλλο: όχι επώνυμο, όχι ταυτότητα.
            </p>
          </div>
        )}
        {patients.length === 0 && selected !== "new" && <p className="text-[15px] italic text-muted">Δεν υπάρχουν ακόμα ασθενείς: διαλέξτε «Νέος ασθενής».</p>}
      </fieldset>

      {/* Β. Ηχογράφηση */}
      <section aria-labelledby="rec-h" className="flex flex-col gap-3 border-t border-hairline pt-5">
        <PartHeading id="rec-h" mark="Β.">
          Ηχογράφηση
        </PartHeading>
        <p className="max-w-[62ch]">
          Πείτε πρώτα <strong>τι κάνατε σήμερα και πώς πάει</strong>. Μετά <strong>τις ασκήσεις για το σπίτι</strong>, όπως τις λέτε στον
          ασθενή. Έως {MAX_RECORDING_SECONDS / 60} λεπτά.
        </p>

        {recording ? (
          <div role="status" className="flex flex-wrap items-center gap-x-7 gap-y-4 border-2 border-ink bg-white px-5 py-4">
            <div className="flex flex-col">
              <span className="flex items-center gap-2 font-bold">
                <span aria-hidden="true" className="size-3.5 rounded-full bg-error" />
                Ηχογραφείται
              </span>
              <span className="font-typed text-[34px] font-bold leading-tight">
                {formatClock(recorder.elapsed)} <span className="text-lg font-normal">/ {formatClock(MAX_RECORDING_SECONDS)}</span>
              </span>
            </div>
            <span aria-hidden="true" className="flex h-12 flex-[1_1_200px] items-center gap-1">
              {Array.from({ length: BARS }, (_, i) => (
                <span key={i} className={cx("max-w-2.5 flex-1", i < lit ? "bg-ink" : "bg-hairline")} style={{ height: `${14 + ((i * 7) % 30)}px` }} />
              ))}
            </span>
            <button
              type="button"
              onClick={recorder.stop}
              className="inline-flex min-h-14 cursor-pointer items-center gap-2.5 bg-action px-5 text-[19px] font-bold text-white hover:bg-action-hover"
            >
              <span aria-hidden="true" className="size-3.5 bg-white" />
              Τέλος ηχογράφησης
            </button>
            {recorder.tooQuiet && (
              <p className="basis-full font-semibold">Δεν σας ακούμε καλά. Πλησιάστε το μικρόφωνο ή μιλήστε πιο δυνατά.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                onClick={() => void recorder.start()}
                disabled={busy !== null}
                className="inline-flex min-h-16 cursor-pointer items-center gap-3 border-2 border-ink bg-sheet px-6 text-xl font-bold text-ink hover:bg-white disabled:cursor-wait disabled:opacity-60"
              >
                <span aria-hidden="true" className="size-5 rounded-full bg-error" />
                {hasText ? "Νέα ηχογράφηση" : "Έναρξη ηχογράφησης"}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="min-h-11 cursor-pointer text-[17px] text-action underline underline-offset-[3px] hover:text-ink disabled:cursor-wait"
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
              <span className="text-base">Δοκιμή χωρίς μικρόφωνο:</span>
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
                  className="min-h-11 cursor-pointer border border-line bg-sheet px-3.5 text-base text-ink hover:bg-white disabled:cursor-wait"
                >
                  {s.title}
                </button>
              ))}
            </div>
            <p className="text-[15px] italic text-muted">Ο ήχος δεν αποθηκεύεται: κρατάμε μόνο το κείμενο.</p>
          </div>
        )}
        {recorder.error && <FormAlert>{recorder.error}</FormAlert>}
        {busy === "transcribing" && (
          <p role="status" className="font-semibold">
            Γράφουμε αυτά που είπατε… λίγα δευτερόλεπτα.
          </p>
        )}
      </section>

      {/* Γ. Τι ακούσαμε */}
      {hasText && (
        <section aria-labelledby="txt-h" className="flex flex-col gap-3.5 border-t border-hairline pt-5">
          <PartHeading id="txt-h" mark="Γ.">
            Τι ακούσαμε
          </PartHeading>
          {heardSeconds !== null && (
            <p className="font-typed text-base font-bold">✓ Έτοιμο κείμενο σε {Math.max(1, Math.round(heardSeconds))}″</p>
          )}
          <label htmlFor="t-text" className="text-base">
            Διορθώστε ό,τι ακούστηκε λάθος. Από αυτό το κείμενο γράφουμε το πρόγραμμα.
          </label>
          <textarea
            id="t-text"
            ref={textRef}
            rows={8}
            value={draft.transcript}
            onChange={(e) => dispatch({ type: "typeTranscript", text: e.target.value })}
            className="ruled w-full resize-y border-0 border-b-2 border-line px-1.5 font-typed text-lg leading-[34px] text-ink"
          />

          {draft.fixes.length > 0 && (
            <Slip tint="green" labelledBy="fix-h">
              <SlipTitle id="fix-h">
                ΔΙΟΡΘΩΣΑΜΕ {draft.fixes.length === 1 ? "1 ΛΕΞΗ" : `${draft.fixes.length} ΛΕΞΕΙΣ`}
              </SlipTitle>
              <p className="mb-1.5 text-base">Λέξεις που ακούστηκαν λάθος. Αριθμούς, πλευρά και ασκήσεις δεν τα αλλάζουμε ποτέ.</p>
              <ul className="flex flex-col">
                {draft.fixes.map((fix, i) => (
                  <li key={`${fix.heard}-${i}`} className="flex min-h-11 flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-ledger">
                    <span className="font-typed text-[17px]">
                      «{fix.heard}» → «{fix.corrected}»
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "undoFix", index: i })}
                      className="min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink"
                    >
                      Αναίρεση<span className="sr-only">: «{fix.corrected}» πίσω σε «{fix.heard}»</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Slip>
          )}

          <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <legend className="float-left mr-4 text-base">Κλινική σημείωση στα</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input
                type="radio"
                name="lang"
                checked={draft.noteLang === "el"}
                onChange={() => dispatch({ type: "setNoteLang", lang: "el" })}
                className="size-[22px] accent-action"
              />
              Ελληνικά
            </label>
            <label lang="en" className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input
                type="radio"
                name="lang"
                checked={draft.noteLang === "en"}
                onChange={() => dispatch({ type: "setNoteLang", lang: "en" })}
                className="size-[22px] accent-action"
              />
              English
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy !== null || recording}
              className="inline-flex min-h-14 cursor-pointer items-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-80"
            >
              {busy === "generating" ? "Γράφουμε το πρόγραμμα…" : "Δημιουργία προγράμματος"} <span aria-hidden="true">→</span>
            </button>
            <span role="status" className="text-base italic text-muted">
              {busy === "generating" ? "Περίπου 20 δευτερόλεπτα. Μην κλείσετε τη σελίδα." : "Περίπου 20 δευτερόλεπτα."}
            </span>
          </div>
          {draft.result && busy === null && (
            <p className="text-base">
              Υπάρχει ήδη πρόγραμμα από αυτό το κείμενο.{" "}
              <Link href="/notes/review">Συνέχεια στον έλεγχο</Link>
            </p>
          )}
        </section>
      )}

      <FormAlert>{error}</FormAlert>
    </div>
  );
}
