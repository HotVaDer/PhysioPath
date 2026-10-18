"use client";
// The interactive part of the Record page: record (or upload, or pick a sample), check the text,
// choose the note language, and create the program. On success it moves on to /review.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alert } from "@/app/components/ui/Alert";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { ArrowRightIcon, CheckIcon, MicIcon, StopIcon, UndoIcon, UploadIcon } from "@/app/components/ui/icons";
import { SegmentedControl } from "@/app/components/ui/SegmentedControl";
import { Spinner } from "@/app/components/ui/Spinner";
import { TextArea } from "@/app/components/ui/TextArea";
import { TimingStrip } from "@/app/components/ui/TimingStrip";
import { useDraft } from "@/app/context/DraftContext";
import { MAX_RECORDING_SECONDS, useRecorder } from "@/app/hooks/useRecorder";
import { generateProgram, transcribeAudio } from "@/app/lib/api";
import { cx } from "@/app/lib/cx";
import { formatClock, formatSeconds } from "@/app/lib/format";
import type { NoteLanguage } from "@/app/lib/prompt";
import type { Sample } from "@/app/lib/samples";

type Busy = null | "transcribing" | "generating";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Κάτι πήγε στραβά. Δοκιμάστε ξανά.");

export function RecordScreen({ samples }: { samples: Sample[] }) {
  const { draft, dispatch } = useDraft();
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const generateButton = useRef<HTMLButtonElement>(null);

  async function transcribe(audio: Blob, recordingSeconds?: number) {
    setBusy("transcribing");
    setError(null);
    try {
      const { text, fixes, seconds, proofreadSeconds } = await transcribeAudio(audio);
      dispatch({ type: "transcribed", text, fixes, seconds, proofreadSeconds, recordingSeconds });
      generateButton.current?.focus(); // next step: check the text, then create
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const recorder = useRecorder((audio, seconds) => void transcribe(audio, seconds));
  const recording = recorder.state === "recording";

  async function generate() {
    if (busy) return;
    const transcript = draft.transcript.trim();
    if (!transcript) {
      setError("Ηχογραφήστε, γράψτε ή επιλέξτε πρώτα ένα δείγμα.");
      return;
    }
    setBusy("generating");
    setError(null);
    try {
      const data = await generateProgram(transcript, draft.noteLang);
      dispatch({ type: "generated", result: data.result, seconds: data.seconds, noteLang: draft.noteLang });
      router.push("/review"); // stays "busy" until the next page appears
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  const { timings } = draft;
  const timingItems = [
    timings.recording != null && { label: "Ηχογράφηση", value: formatClock(timings.recording) },
    timings.transcribe != null && { label: "Μεταγραφή", value: formatSeconds(timings.transcribe) },
    timings.proofread != null && { label: "Διόρθωση", value: formatSeconds(timings.proofread) },
    timings.generate != null && { label: "Πρόγραμμα", value: formatSeconds(timings.generate) },
    timings.generate != null && { label: "Σύνολο", value: formatSeconds((timings.transcribe ?? 0) + timings.generate), highlight: true },
  ].filter((item) => item !== false);

  return (
    <div className="space-y-14">
      <Card tag="01" title="Φωνητική σημείωση">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <Button
            variant={recording ? "danger" : "primary"}
            size="xl"
            icon={recording ? <StopIcon /> : <MicIcon />}
            disabled={busy !== null}
            onClick={recording ? recorder.stop : recorder.start}
          >
            {recording ? "Τέλος ηχογράφησης" : "Έναρξη ηχογράφησης"}
          </Button>
          {recording ? (
            <p className="flex items-center gap-3 font-mono">
              <span aria-hidden="true" className="size-3 animate-pulse rounded-full bg-danger" />
              <span className="label-mono text-danger">Ηχογράφηση</span>
              {/* The timer is not announced: a screen reader would read it out every second. */}
              <span className="text-2xl tabular-nums">{formatClock(recorder.elapsed)}</span>
              <span className="text-muted">/ {formatClock(MAX_RECORDING_SECONDS)}</span>
            </p>
          ) : (
            <p className="font-mono text-muted">Πατήστε και μιλήστε. Πατήστε ξανά για τέλος.</p>
          )}
        </div>

        {recording && (
          <div className="mt-6 max-w-xl">
            <p className="label-mono text-muted">Ένταση φωνής</p>
            {/* One thick outlined box that fills with the voice, easy to see at arm's length.
                For the eyes only; the warning below says the same in words. */}
            <div aria-hidden="true" className="mt-2 h-8 rounded-xs border-2 border-border-strong p-0.5">
              <div
                className={cx("h-full rounded-xs transition-[width] duration-75", recorder.tooQuiet ? "bg-warning" : "bg-primary")}
                style={{ width: `${Math.max(2, recorder.level * 100)}%` }}
              />
            </div>
          </div>
        )}
        <p aria-live="polite" className="mt-2 max-w-xl font-semibold text-warning">
          {recording && recorder.tooQuiet ? "Δεν σας ακούω καλά. Μιλήστε πιο δυνατά ή κρατήστε το τηλέφωνο πιο κοντά." : ""}
        </p>

        {recorder.error && (
          <Alert tone="danger" title="Το μικρόφωνο δεν είναι διαθέσιμο" className="mt-6">
            {recorder.error}
          </Alert>
        )}

        {busy === "transcribing" && <Spinner label="Μεταγραφή…">Ο ήχος μένει σε αυτόν τον υπολογιστή.</Spinner>}

        <div className="mt-10 grid gap-x-12 gap-y-8 lg:grid-cols-[auto_1fr]">
          <div>
            <p className="label-mono text-muted">Ή από αρχείο</p>
            <Button icon={<UploadIcon />} disabled={busy !== null || recording} onClick={() => fileInput.current?.click()} className="mt-3">
              Ανέβασμα αρχείου ήχου
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="audio/*,video/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = ""; // so the same file can be picked again
                if (file) void transcribe(file);
              }}
            />
          </div>

          {samples.length > 0 && (
            <div>
              <p className="label-mono text-muted">Ή με ένα δείγμα (φανταστικοί ασθενείς)</p>
              {/* A list like the portfolio's repo list: one row per sample between dashed lines. */}
              <ul className="mt-3 border-t border-dashed border-border-strong">
                {samples.map((sample) => (
                  <li key={sample.id} className="border-b border-dashed border-border-strong">
                    <button
                      type="button"
                      disabled={busy !== null || recording}
                      onClick={() => {
                        dispatch({ type: "pickSample", text: sample.text });
                        setError(null);
                      }}
                      className="group flex min-h-12 w-full items-center gap-4 py-2 text-left hover:text-primary-text disabled:cursor-not-allowed disabled:text-muted"
                    >
                      <span className="label-mono w-24 shrink-0 text-primary-text group-disabled:text-muted">Δείγμα {sample.id}</span>
                      <span className="flex-1 font-semibold">{sample.title}</span>
                      <ArrowRightIcon size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <Card tag="02" title="Κείμενο">
        <TextArea
          label="Κείμενο της σημείωσης"
          hint="Ελέγξτε το και διορθώστε ό,τι ακούστηκε λάθος. Μπορείτε επίσης να γράψετε ή να επικολλήσετε."
          value={draft.transcript}
          placeholder="Το κείμενο της ηχογράφησης θα εμφανιστεί εδώ."
          onChange={(event) => dispatch({ type: "typeTranscript", text: event.target.value })}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void generate();
            }
          }}
        />

        {draft.fixes.length > 0 && (
          // What the proofreader changed, so the physio can see it and undo any fix in one tap.
          <div className="mt-4">
            <p className="flex items-center gap-2 font-semibold text-success">
              <CheckIcon size={18} />
              {draft.fixes.length === 1 ? "Διορθώθηκε 1 λέξη αυτόματα" : `Διορθώθηκαν ${draft.fixes.length} λέξεις αυτόματα`}
            </p>
            <ul className="mt-2 max-w-2xl border-t border-dashed border-border-strong">
              {draft.fixes.map((fix, index) => (
                <li key={`${fix.heard}-${index}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-dashed border-border-strong py-1.5">
                  <span className="flex-1">
                    <s className="text-muted">{fix.heard}</s> <span aria-hidden="true">→</span>
                    <span className="sr-only">έγινε</span> <span className="font-semibold">{fix.corrected}</span>
                  </span>
                  <Button variant="ghost" icon={<UndoIcon />} onClick={() => dispatch({ type: "undoFix", index })}>
                    Αναίρεση
                    {" "}
                    <span className="sr-only">διόρθωσης «{fix.corrected}»</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <SegmentedControl<NoteLanguage>
            legend="Γλώσσα κλινικής σημείωσης"
            options={[
              { value: "el", label: "Ελληνικά" },
              { value: "en", label: "English" },
            ]}
            value={draft.noteLang}
            onChange={(lang) => dispatch({ type: "setNoteLang", lang })}
          />
          <Button
            ref={generateButton}
            variant="primary"
            size="xl"
            icon={<ArrowRightIcon />}
            loading={busy === "generating"}
            disabled={busy === "transcribing" || recording}
            onClick={() => void generate()}
          >
            Δημιουργία προγράμματος
          </Button>
        </div>

        {error && (
          <Alert tone="danger" title="Δεν ολοκληρώθηκε" className="mt-6">
            {error}
          </Alert>
        )}

        {busy === "generating" && (
          <Spinner label="Γράφεται το πρόγραμμα…">Συνήθως 10–20 δευτερόλεπτα. Στέλνεται μόνο το κείμενο, όχι ο ήχος.</Spinner>
        )}

        {timingItems.length > 0 && <TimingStrip items={timingItems} className="mt-8" />}
      </Card>
    </div>
  );
}
