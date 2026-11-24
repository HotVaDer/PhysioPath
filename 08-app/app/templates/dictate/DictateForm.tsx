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
import { useRef, useState } from "react";

import { FormAlert } from "@/app/components/paper/Notes";
import { cx } from "@/app/lib/cx";
import type { DemoLeft } from "@/app/lib/demo/left";
import { ApiError, generateTemplates } from "@/app/lib/notes/api";
import type { Sample } from "@/app/lib/notes/samples";
import { MAX_DICTATED_TEMPLATES } from "@/app/lib/notes/schema";
import { createTemplate } from "@/app/lib/templates/actions";
import { cardProblem, isDictationStale, type DictatedCard } from "@/app/lib/templates/dictation";
import { useDictation } from "@/app/lib/templates/useDictation";
import { greenButton } from "@/app/notes/LiveRecording";
import { VoiceInput } from "@/app/templates/VoiceInput";

import { TemplateDraft } from "./TemplateDraft";

export const DICTATION_KEY = "physiopath:template-dictation";

type Busy = null | "generating";

type Props = {
  clinicId: string;
  userId: string;
  libraryNames: string[];
  sample: Sample;
  demoLeft?: DemoLeft | null;
};

export function DictateForm({ clinicId, userId, libraryNames, sample, demoLeft = null }: Props) {
  const router = useRouter();
  const { state, dispatch, ready } = useDictation(DICTATION_KEY, clinicId, userId);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const cardsRef = useRef<HTMLHeadingElement>(null);
  const library = new Set(libraryNames);

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

      <VoiceInput
        say={[
          <>
            <strong>Τον αριθμό και το όνομα</strong> κάθε προτύπου, π.χ. «Πρώτο, γόνατο μετά ACL, εβδομάδα 1».
          </>,
          <>
            <strong>Τις ασκήσεις του</strong>, με σετ, επαναλήψεις και πόσο συχνά, όπως τις λέτε στον ασθενή.
          </>,
          <>
            <strong>Τις οδηγίες του</strong>, αν έχει: πάγος, τι να αποφεύγει, πότε να σας πάρει τηλέφωνο.
          </>,
        ]}
        note={`Χωρίς ονόματα ασθενών. Έως ${MAX_DICTATED_TEMPLATES} πρότυπα κάθε φορά.`}
        sample={sample}
        text={state.transcript}
        textLabel="Τα πρότυπα, όπως τα είπατε"
        textHint="Διορθώστε ό,τι ακούστηκε λάθος. Από αυτό το κείμενο γράφουμε τα πρότυπα."
        onType={(text) => dispatch({ type: "typeTranscript", text })}
        onHeard={(text) => dispatch({ type: "heard", text })}
        onSample={(text) => {
          setError(null);
          dispatch({ type: "pickSample", text });
        }}
        generating={busy === "generating"}
        demoLeft={demoLeft}
      >
        {(working) => (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
              <button
                type="button"
                onClick={() => void create()}
                disabled={working || busy !== null || !hasText}
                className={cx(greenButton, "disabled:cursor-not-allowed")}
              >
                {busy === "generating" ? "Γράφουμε τα πρότυπα…" : generated ? "Δημιουργία προτύπων ξανά" : "Δημιουργία προτύπων"}{" "}
                <span aria-hidden="true">→</span>
              </button>
              <span role="status" className="text-muted">
                {busy === "generating" ? "Περίπου 20–40 δευτερόλεπτα. Μην κλείσετε τη σελίδα." : "Περίπου 20–40 δευτερόλεπτα."}
              </span>
            </div>
            <FormAlert>{error}</FormAlert>
          </>
        )}
      </VoiceInput>

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
