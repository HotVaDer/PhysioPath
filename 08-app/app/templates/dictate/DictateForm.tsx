"use client";
// «Πείτε τα πρότυπά σας»: one or more recordings (or a file, typed text, the fictional sample) of the physio's
// usual programs, then «Δημιουργία προτύπων»: one AI call splits the text into templates, one card each
// (TemplateDraft). The physio checks each card and saves it, or all at once; nothing is saved before that.
// Each recording's text goes after the text already there, so they can say a few programs at a time.
// Everything is kept in sessionStorage (this tab only), so a refresh or a visit to another page loses nothing;
// another person or another clinic in the same tab never sees it.
// Demo clinics: a dictation is one of the 5 programs, and each recording one of the 5 recordings.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch } from "react";

import { fieldBox } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { PartTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import type { DemoLeft } from "@/app/lib/demo/left";
import { ApiError, generateTemplates, transcribeAudio } from "@/app/lib/notes/api";
import { AUDIO_TOO_LARGE, MAX_AUDIO_BYTES } from "@/app/lib/notes/limits";
import type { Sample } from "@/app/lib/notes/samples";
import { MAX_DICTATED_TEMPLATES } from "@/app/lib/notes/schema";
import { MAX_RECORDING_SECONDS, useRecorder } from "@/app/lib/notes/useRecorder";
import { createTemplate } from "@/app/lib/templates/actions";
import {
  cardProblem,
  dictationReducer,
  emptyDictation,
  isDictationStale,
  parseDictation,
  type DictatedCard,
  type DictationAction,
} from "@/app/lib/templates/dictation";
import { greenButton, LiveRecording } from "@/app/notes/LiveRecording";

import { TemplateDraft } from "./TemplateDraft";

export const DICTATION_KEY = "physiopath:template-dictation";

type Busy = null | "transcribing" | "generating";

type Props = {
  clinicId: string;
  userId: string;
  libraryNames: string[];
  sample: Sample;
  demoLeft?: DemoLeft | null;
};

// The state of this page, kept in sessionStorage. A slow answer that arrives after the physio left the page
// still goes into the saved state (as DraftProvider does for the voice note).
function useDictation(clinicId: string, userId: string) {
  const [state, dispatchHere] = useReducer(dictationReducer, emptyDictation);
  const [ready, setReady] = useState(false);
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  const dispatch = useCallback<Dispatch<DictationAction>>((action) => {
    if (here.current) return dispatchHere(action);
    try {
      const saved = parseDictation(sessionStorage.getItem(DICTATION_KEY));
      if (saved) sessionStorage.setItem(DICTATION_KEY, JSON.stringify(dictationReducer(saved, action)));
    } catch {
      // Storage blocked: nothing was kept anyway.
    }
  }, []);

  useEffect(() => {
    try {
      const saved = parseDictation(sessionStorage.getItem(DICTATION_KEY));
      if (saved && saved.userId === userId && saved.clinicId === clinicId) dispatch({ type: "restore", state: saved });
      else if (saved) sessionStorage.removeItem(DICTATION_KEY); // someone else's, or another clinic's
    } catch {
      // Storage blocked (e.g. private mode): the work just isn't kept across refreshes.
    }
    dispatch({ type: "stamp", userId, clinicId });
    setReady(true);
  }, [dispatch, userId, clinicId]);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(DICTATION_KEY, JSON.stringify(state));
    } catch {
      // See above.
    }
  }, [state, ready]);

  return { state, dispatch, ready };
}

export function DictateForm({ clinicId, userId, libraryNames, sample, demoLeft = null }: Props) {
  const router = useRouter();
  const { state, dispatch, ready } = useDictation(clinicId, userId);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const cardsRef = useRef<HTMLHeadingElement>(null);
  const library = new Set(libraryNames);

  async function handleAudio(audio: Blob) {
    if (audio.size > MAX_AUDIO_BYTES) return setError(AUDIO_TOO_LARGE);
    setError(null);
    setBusy("transcribing");
    try {
      const heard = await transcribeAudio(audio);
      dispatch({ type: "heard", text: heard.text });
      requestAnimationFrame(() => textRef.current?.focus());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Η ηχογράφηση δεν διαβάστηκε. Δοκιμάστε ξανά.");
    } finally {
      setBusy(null);
      if (demoLeft) router.refresh(); // the demo strip's «Μένουν» count, from the database again
    }
  }

  const recorder = useRecorder((audio) => void handleAudio(audio));

  async function create() {
    if (!state.transcript.trim()) return setError("Ηχογραφήστε ή γράψτε πρώτα τα πρότυπα.");
    const unsaved = state.cards.filter((c) => !c.savedId).length;
    if (unsaved > 0 && !window.confirm(`${unsaved === 1 ? "Ένα πρότυπο δεν έχει" : `${unsaved} πρότυπα δεν έχουν`} αποθηκευτεί και θα αντικατασταθούν από τα νέα. Συνέχεια;`))
      return;
    setError(null);
    setBusy("generating");
    const sent = state.transcript;
    try {
      const { result } = await generateTemplates(sent);
      dispatch({ type: "generated", result, transcript: sent, keys: result.templates.map(() => crypto.randomUUID()) });
      requestAnimationFrame(() => cardsRef.current?.focus());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Τα πρότυπα δεν γράφτηκαν. Δοκιμάστε ξανά.");
    } finally {
      setBusy(null);
      if (demoLeft) router.refresh();
    }
  }

  async function save(card: DictatedCard) {
    const problem = cardProblem(card);
    if (problem) return dispatch({ type: "failed", key: card.key, error: problem });
    setSaving((s) => new Set(s).add(card.key));
    try {
      const answer = await createTemplate({ clinicId, name: card.name, area: card.area, program: card.program });
      dispatch(answer.ok ? { type: "saved", key: card.key, id: answer.id } : { type: "failed", key: card.key, error: answer.error });
    } catch {
      dispatch({ type: "failed", key: card.key, error: "failed" });
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(card.key);
        return next;
      });
    }
  }

  async function saveAll() {
    for (const card of state.cards.filter((c) => !c.savedId)) await save(card); // one at a time: clear results
  }

  if (!ready) return <p className="text-muted">Φόρτωση…</p>;

  const recording = recorder.state === "recording";
  const locked = busy !== null || recording;
  const noRecordings = demoLeft !== null && demoLeft.transcribe <= 0;
  const hasText = state.transcript.trim().length > 0;
  const unsaved = state.cards.filter((c) => !c.savedId);
  const savedCount = state.cards.length - unsaved.length;
  const generated = state.resultTranscript !== null;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex max-w-[680px] flex-col gap-2">
        <Link href="/templates" className="self-start text-base">
          ← Πρότυπα
        </Link>
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Πείτε τα πρότυπά σας</h1>
        <p className="text-muted">
          Πείτε μία φορά τα προγράμματα που δίνετε συχνά, το ένα μετά το άλλο. Τα χωρίζουμε σε πρότυπα· εσείς ελέγχετε το καθένα και το
          αποθηκεύετε. Τίποτα δεν μπαίνει στα «Πρότυπα» χωρίς εσάς.
        </p>
      </div>

      {/* What to say, then the recording */}
      <section aria-labelledby="say-h" className="flex flex-col gap-4 border-t-2 border-hairline pt-5">
        <h2 id="say-h" className="text-[21px] font-bold">
          Τι να πείτε
        </h2>
        <div className="flex flex-col gap-3 rounded-md border-2 border-hairline bg-white px-4 py-3.5 sm:px-5">
          <ol className="flex flex-col gap-2.5">
            {[
              <>
                <strong>Τον αριθμό και το όνομα</strong> κάθε προτύπου, π.χ. «Πρώτο, γόνατο μετά ACL, εβδομάδα 1».
              </>,
              <>
                <strong>Τις ασκήσεις του</strong>, με σετ, επαναλήψεις και πόσο συχνά, όπως τις λέτε στον ασθενή.
              </>,
              <>
                <strong>Τις οδηγίες του</strong>, αν έχει: πάγος, τι να αποφεύγει, πότε να σας πάρει τηλέφωνο.
              </>,
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-lg">
                <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-full bg-note-green font-bold text-action">
                  {i + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
          <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-hairline pt-2.5 text-muted">
            <span>Χωρίς ονόματα ασθενών. Έως {MAX_DICTATED_TEMPLATES} πρότυπα κάθε φορά.</span>
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
                disabled={busy !== null || noRecordings}
                className={cx(greenButton, "min-h-16 text-xl disabled:cursor-not-allowed")}
              >
                <span aria-hidden="true" className="size-5 rounded-full bg-error ring-[3px] ring-white" />
                {hasText ? "Ηχογράφηση και άλλων" : "Έναρξη ηχογράφησης"}
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
        {busy === "transcribing" && (
          <p role="status" className="font-semibold">
            Γράφουμε αυτά που είπατε… λίγα δευτερόλεπτα.
          </p>
        )}
      </section>

      {/* No microphone: the sample, or type */}
      {!recording && (
        <section aria-labelledby="sample-h" className="flex flex-col gap-2.5 border-t-2 border-hairline pt-5">
          <h2 id="sample-h" className="font-semibold">
            Χωρίς μικρόφωνο; <span className="font-normal text-muted">Γράψτε τα στο κουτί πιο κάτω, ή δοκιμάστε ένα έτοιμο παράδειγμα.</span>
          </h2>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              dispatch({ type: "pickSample", text: sample.text });
            }}
            className="min-h-11 cursor-pointer self-start rounded-md border-2 border-line bg-white px-3.5 text-ink hover:border-action disabled:cursor-wait"
          >
            {sample.title}
          </button>
        </section>
      )}

      {/* The text, then «Δημιουργία προτύπων» */}
      <section aria-labelledby="txt-h" className="flex flex-col gap-3.5 border-t-2 border-hairline pt-5">
        <PartTitle id="txt-h">Το κείμενο</PartTitle>
        <div className="flex flex-col gap-1">
          <label htmlFor="d-text" className="text-[19px] font-semibold">
            Τα πρότυπα, όπως τα είπατε
          </label>
          <p id="d-text-hint" className="text-muted">
            Διορθώστε ό,τι ακούστηκε λάθος. Από αυτό το κείμενο γράφουμε τα πρότυπα.
          </p>
          <textarea
            id="d-text"
            ref={textRef}
            rows={8}
            value={state.transcript}
            aria-describedby="d-text-hint"
            readOnly={busy === "generating"}
            onChange={(e) => dispatch({ type: "typeTranscript", text: e.target.value })}
            className={cx(fieldBox(), "resize-y py-2.5 text-lg leading-relaxed")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
          <button type="button" onClick={() => void create()} disabled={locked || !hasText} className={cx(greenButton, "disabled:cursor-not-allowed")}>
            {busy === "generating" ? "Γράφουμε τα πρότυπα…" : generated ? "Δημιουργία προτύπων ξανά" : "Δημιουργία προτύπων"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <span role="status" className="text-muted">
            {busy === "generating" ? "Περίπου 20–40 δευτερόλεπτα. Μην κλείσετε τη σελίδα." : "Περίπου 20–40 δευτερόλεπτα."}
          </span>
        </div>
        <FormAlert>{error}</FormAlert>
      </section>

      {/* The templates: one card each */}
      {generated && (
        <section aria-labelledby="cards-h" className="flex flex-col gap-4 border-t-2 border-hairline pt-5">
          <h2 id="cards-h" ref={cardsRef} tabIndex={-1} className="text-[24px] font-bold outline-none">
            {state.cards.length === 0
              ? "Δεν βρήκαμε πρότυπα"
              : state.cards.length === 1
                ? "Βρήκαμε 1 πρότυπο"
                : `Βρήκαμε ${state.cards.length} πρότυπα`}
          </h2>
          {state.cards.length > 0 && (
            <p className="text-muted">Ελέγξτε το καθένα. Μπαίνει στα «Πρότυπα» μόνο όταν πατήσετε «Αποθήκευση».</p>
          )}
          {isDictationStale(state) && (
            <p className="self-start bg-tab-yellow px-4 py-3">
              Το κείμενο άλλαξε μετά. Πατήστε «Δημιουργία προτύπων ξανά» για να τα ξαναγράψουμε, ή κρατήστε αυτά.
            </p>
          )}
          {state.general.length > 0 && (
            <div className="self-start bg-tab-yellow px-4 py-3">
              <h3 className="font-semibold">Να δείτε</h3>
              <ul className="list-disc pl-6">
                {state.general.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <ol className="flex flex-col gap-5">
            {state.cards.map((card, i) => (
              <li key={card.key}>
                <TemplateDraft
                  card={card}
                  n={i + 1}
                  cards={state.cards}
                  library={library}
                  saving={saving.has(card.key)}
                  dispatch={dispatch}
                  onSave={() => void save(card)}
                />
              </li>
            ))}
          </ol>

          {unsaved.length > 1 && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
              <button type="button" onClick={() => void saveAll()} disabled={saving.size > 0 || busy !== null} className={greenButton}>
                {saving.size > 0 ? "Αποθήκευση…" : `Αποθήκευση όλων (${unsaved.length})`}
              </button>
              <span className="text-muted">Όσα έχουν πρόβλημα μένουν εδώ, με το πρόβλημα γραμμένο πάνω τους.</span>
            </div>
          )}
          {state.cards.length > 0 && unsaved.length === 0 && (
            <div role="status" className="flex flex-col gap-2 self-start bg-note-green px-4 py-3">
              <p className="font-semibold">
                {savedCount === 1 ? "Το πρότυπο αποθηκεύτηκε." : `Αποθηκεύτηκαν και τα ${savedCount} πρότυπα.`}{" "}
                <Link href="/templates">Δείτε τα στα «Πρότυπα»</Link>
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: "reset" })}
                className="min-h-11 cursor-pointer self-start text-action underline underline-offset-[3px] hover:text-ink"
              >
                Νέα υπαγόρευση
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
