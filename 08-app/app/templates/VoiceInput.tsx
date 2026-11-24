"use client";
// What the physio says, for «Πείτε τα πρότυπά σας» and «Αλλαγή με φωνή»: «Τι να πείτε», the recording (each
// recording's text goes after the text already there), a file, a fictional sample, and the text box to correct.
// The page puts its own button under the text (children, told whether a recording is under way).
// A demo clinic: once its recordings are used up the record buttons rest; the sample still works.
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { fieldBox } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { PartTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import type { DemoLeft } from "@/app/lib/demo/left";
import { ApiError, transcribeAudio } from "@/app/lib/notes/api";
import { AUDIO_TOO_LARGE, MAX_AUDIO_BYTES } from "@/app/lib/notes/limits";
import type { Sample } from "@/app/lib/notes/samples";
import { MAX_RECORDING_SECONDS, useRecorder } from "@/app/lib/notes/useRecorder";
import { greenButton, LiveRecording } from "@/app/notes/LiveRecording";

type Props = {
  say: ReactNode[]; // «Τι να πείτε», in order
  note: ReactNode; // under it, left of «Έως 3 λεπτά…»
  sample: Sample;
  text: string;
  textLabel: string;
  textHint: string;
  onType: (text: string) => void;
  onHeard: (text: string) => void;
  onSample: (text: string) => void;
  generating: boolean; // the page's AI call is under way: nothing here starts meanwhile
  demoLeft: DemoLeft | null;
  children: (working: boolean) => ReactNode; // the page's button(s) under the text
};

export function VoiceInput({ say, note, sample, text, textLabel, textHint, onType, onHeard, onSample, generating, demoLeft, children }: Props) {
  const router = useRouter();
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function handleAudio(audio: Blob) {
    if (audio.size > MAX_AUDIO_BYTES) return setError(AUDIO_TOO_LARGE);
    setError(null);
    setTranscribing(true);
    try {
      const heard = await transcribeAudio(audio);
      onHeard(heard.text);
      requestAnimationFrame(() => textRef.current?.focus());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Η ηχογράφηση δεν διαβάστηκε. Δοκιμάστε ξανά.");
    } finally {
      setTranscribing(false);
      if (demoLeft) router.refresh(); // the demo strip's «Μένουν» count, from the database again
    }
  }

  const recorder = useRecorder((audio) => void handleAudio(audio));
  const recording = recorder.state === "recording";
  const busy = transcribing || generating;
  const noRecordings = demoLeft !== null && demoLeft.transcribe <= 0;
  const hasText = text.trim().length > 0;

  return (
    <>
      {/* What to say, then the recording */}
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
            <span>{note}</span>
            <span className="font-semibold">Έως {MAX_RECORDING_SECONDS / 60} λεπτά κάθε ηχογράφηση, όσες θέλετε</span>
          </p>
        </div>

        {recording ? (
          <LiveRecording recorder={recorder} />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                onClick={() => void recorder.start()}
                disabled={busy || noRecordings}
                className={cx(greenButton, "min-h-16 text-xl disabled:cursor-not-allowed")}
              >
                <span aria-hidden="true" className="size-5 rounded-full bg-error ring-[3px] ring-white" />
                {hasText ? "Ηχογράφηση και άλλων" : "Έναρξη ηχογράφησης"}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy || noRecordings}
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
            <p className="text-base text-muted">
              {hasText ? "Το κείμενο της νέας ηχογράφησης μπαίνει μετά από αυτό που υπάρχει. " : ""}Ο ήχος δεν αποθηκεύεται: κρατάμε μόνο το
              κείμενο.
            </p>
            {noRecordings && (
              <p className="self-start bg-tab-pink px-4 py-3">Τελείωσαν οι ηχογραφήσεις της δοκιμής. Δοκιμάστε το έτοιμο παράδειγμα εδώ κάτω.</p>
            )}
          </div>
        )}
        {recorder.error && <FormAlert>{recorder.error}</FormAlert>}
        <FormAlert>{error}</FormAlert>
        {transcribing && (
          <p role="status" className="font-semibold">
            Γράφουμε αυτά που είπατε… λίγα δευτερόλεπτα.
          </p>
        )}
      </section>

      {/* No microphone: the sample, or type */}
      {!recording && (
        <section aria-labelledby="sample-h" className="flex flex-col gap-2.5 border-t-2 border-hairline pt-5">
          <h2 id="sample-h" className="font-semibold">
            Χωρίς μικρόφωνο; <span className="font-normal text-muted">Γράψτε το στο κουτί πιο κάτω, ή δοκιμάστε ένα έτοιμο παράδειγμα.</span>
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              onSample(sample.text);
            }}
            className="min-h-11 cursor-pointer self-start rounded-md border-2 border-line bg-white px-3.5 text-ink hover:border-action disabled:cursor-wait"
          >
            {sample.title}
          </button>
        </section>
      )}

      {/* The text, then the page's button */}
      <section aria-labelledby="txt-h" className="flex flex-col gap-3.5 border-t-2 border-hairline pt-5">
        <PartTitle id="txt-h">Το κείμενο</PartTitle>
        <div className="flex flex-col gap-1">
          <label htmlFor="d-text" className="text-[19px] font-semibold">
            {textLabel}
          </label>
          <p id="d-text-hint" className="text-muted">
            {textHint}
          </p>
          <textarea
            id="d-text"
            ref={textRef}
            rows={6}
            value={text}
            aria-describedby="d-text-hint"
            readOnly={generating}
            onChange={(e) => onType(e.target.value)}
            className={cx(fieldBox(), "resize-y py-2.5 text-lg leading-relaxed")}
          />
        </div>
        {children(recording || transcribing)}
      </section>
    </>
  );
}
