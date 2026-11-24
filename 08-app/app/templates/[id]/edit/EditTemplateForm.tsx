"use client";
// «Αλλαγή ασκήσεων» of one template. The physio says what changes (one or more recordings, a file, typed text or
// a fictional sample), «Εφαρμογή αλλαγών» (one AI call: the server reads the saved template, the AI applies only
// what was said), or edits the card by hand. «Τι άλλαξε» compares the card with the saved template (the app's own
// comparison, never the AI's account), then «Αποθήκευση αλλαγών» replaces the template; «Ακύρωση αλλαγών» goes
// back to the saved one. Programs already given to patients never change.
// What was said is applied to the saved template each time, all of it: the card is rewritten, so edits made by
// hand since the last «Εφαρμογή αλλαγών» are asked about first.
// Kept in sessionStorage per template; dropped when the saved template has changed since (another tab or physio).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormAlert } from "@/app/components/paper/Notes";
import { cx } from "@/app/lib/cx";
import type { DemoLeft } from "@/app/lib/demo/left";
import { ApiError, editTemplate } from "@/app/lib/notes/api";
import type { Sample } from "@/app/lib/notes/samples";
import type { PatientProgram } from "@/app/lib/notes/schema";
import { updateTemplateProgram } from "@/app/lib/templates/actions";
import { templateChanges } from "@/app/lib/templates/changes";
import { cardProblem, emptyDictation, isDictationStale, sideOf, type Dictation } from "@/app/lib/templates/dictation";
import { useDictation } from "@/app/lib/templates/useDictation";
import { greenButton } from "@/app/notes/LiveRecording";
import { TemplateDraft, type CardWords } from "@/app/templates/dictate/TemplateDraft";
import { VoiceInput } from "@/app/templates/VoiceInput";

export const editKey = (templateId: string) => `physiopath:template-edit:${templateId}`;

const WORDS: CardWords = { save: "Αποθήκευση αλλαγών", drop: "Ακύρωση αλλαγών", saved: (name) => `Οι αλλαγές στο «${name}» αποθηκεύτηκαν` };

type Props = {
  clinicId: string;
  userId: string;
  template: { id: string; name: string; area: string; program: PatientProgram };
  libraryNames: string[]; // the other templates' names (nameKey)
  sample: Sample;
  demoLeft?: DemoLeft | null;
};

export function EditTemplateForm({ clinicId, userId, template, libraryNames, sample, demoLeft = null }: Props) {
  const router = useRouter();
  const saved = { key: template.id, name: template.name, area: template.area, program: template.program };
  const base = sideOf(saved);
  const initial: Dictation = useMemo(
    () => ({ ...emptyDictation, cards: [{ ...saved, questions: [], savedId: null, error: null }], base }),
    // the saved template, as the page was opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base],
  );
  const { state, dispatch, ready } = useDictation(editKey(template.id), clinicId, userId, {
    initial,
    // Not after the template changed since, nor once these changes were saved (a new visit starts fresh).
    accept: (s) => s.base === base && !s.cards[0]?.savedId,
  });
  const [busy, setBusy] = useState<null | "applying" | "saving">(null);
  const [error, setError] = useState<string | null>(null);
  const library = new Set(libraryNames);

  const card = state.cards[0];

  async function apply() {
    if (!state.transcript.trim()) return setError("Πείτε ή γράψτε πρώτα τι αλλάζει.");
    if (card && sideOf(card) !== (state.applied ?? base)) {
      if (!window.confirm("Οι αλλαγές που κάνατε με το χέρι θα αντικατασταθούν: εφαρμόζουμε ό,τι είπατε στο αποθηκευμένο πρότυπο. Συνέχεια;")) return;
    }
    setError(null);
    setBusy("applying");
    const sent = state.transcript;
    try {
      const { result } = await editTemplate(sent, template.id);
      const questions = [...result.changes.flatMap((c) => (c.question ? [c.question] : [])), ...result.questions];
      dispatch({ type: "applied", key: template.id, program: result.program, name: result.name, area: result.area, questions, transcript: sent });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Οι αλλαγές δεν εφαρμόστηκαν. Δοκιμάστε ξανά.");
    } finally {
      setBusy(null);
      if (demoLeft) router.refresh();
    }
  }

  async function save() {
    if (!card) return;
    const problem = cardProblem(card);
    if (problem) return dispatch({ type: "failed", key: card.key, error: problem });
    setBusy("saving");
    try {
      const answer = await updateTemplateProgram({ clinicId, templateId: template.id, name: card.name, area: card.area, program: card.program });
      dispatch(answer.ok ? { type: "saved", key: card.key, id: answer.id } : { type: "failed", key: card.key, error: answer.error });
    } catch {
      dispatch({ type: "failed", key: card.key, error: "failed" });
    } finally {
      setBusy(null);
    }
  }

  if (!ready || !card) return <p className="text-muted">Φόρτωση…</p>;

  const changes = card.savedId ? [] : templateChanges(saved, card);
  const hasText = state.transcript.trim().length > 0;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex max-w-[680px] flex-col gap-2">
        <Link href="/templates" className="self-start text-base">
          ← Πρότυπα
        </Link>
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Αλλαγή προτύπου</h1>
        <p className="text-[19px]">
          <strong>{template.name}</strong>
        </p>
        <p className="text-muted">
          Πείτε μόνο τι αλλάζει, ή αλλάξτε το πιο κάτω με το χέρι. Ελέγχετε τι άλλαξε πριν το αποθηκεύσετε. Τα προγράμματα που δώσατε ήδη σε
          ασθενείς δεν αλλάζουν.
        </p>
      </div>

      {!card.savedId && (
        <VoiceInput
          say={[
            <>
              <strong>Μόνο τι αλλάζει</strong>, π.χ. «βγάλε τα heel slides, γέφυρα τρία σετ των δέκα κάθε μέρα, πάγος είκοσι λεπτά αντί για
              δεκαπέντε».
            </>,
          ]}
          note="Χωρίς ονόματα ασθενών."
          sample={sample}
          text={state.transcript}
          textLabel="Οι αλλαγές, όπως τις είπατε"
          textHint="Διορθώστε ό,τι ακούστηκε λάθος. Εφαρμόζουμε όλο το κείμενο στο αποθηκευμένο πρότυπο."
          onType={(text) => dispatch({ type: "typeTranscript", text })}
          onHeard={(text) => dispatch({ type: "heard", text })}
          onSample={(text) => {
            setError(null);
            dispatch({ type: "pickSample", text });
          }}
          generating={busy === "applying"}
          demoLeft={demoLeft}
        >
          {(working) => (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={working || busy !== null || !hasText}
                  className={cx(greenButton, "disabled:cursor-not-allowed")}
                >
                  {busy === "applying" ? "Εφαρμόζουμε τις αλλαγές…" : "Εφαρμογή αλλαγών"} <span aria-hidden="true">↓</span>
                </button>
                <span role="status" className="text-muted">
                  {busy === "applying" ? "Περίπου 10 δευτερόλεπτα. Μην κλείσετε τη σελίδα." : "Περίπου 10 δευτερόλεπτα."}
                </span>
              </div>
              <FormAlert>{error}</FormAlert>
            </>
          )}
        </VoiceInput>
      )}

      <section aria-labelledby="edit-h" className="flex flex-col gap-4 border-t-2 border-hairline pt-5">
        <h2 id="edit-h" className="text-[24px] font-bold">
          Το πρότυπο
        </h2>
        {!card.savedId && isDictationStale(state) && (
          <p className="self-start bg-tab-yellow px-4 py-3">
            Το κείμενο άλλαξε μετά. Πατήστε «Εφαρμογή αλλαγών» για να το εφαρμόσουμε, ή κρατήστε το πρότυπο όπως είναι πιο κάτω.
          </p>
        )}
        {!card.savedId && (
          <div className="self-start rounded-md border-2 border-action bg-white px-4 py-3">
            <h3 className="font-semibold">Τι άλλαξε, σε σχέση με το αποθηκευμένο</h3>
            {changes.length === 0 ? (
              <p className="text-muted">Τίποτα ακόμα.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {changes.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="w-4 flex-none text-center font-bold text-action">
                      {c.kind === "added" ? "+" : c.kind === "removed" ? "−" : "~"}
                    </span>
                    <span>
                      <span className="sr-only">{c.kind === "added" ? "Μπαίνει: " : c.kind === "removed" ? "Βγαίνει: " : "Αλλάζει: "}</span>
                      {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <TemplateDraft
          card={card}
          words={WORDS}
          cards={state.cards}
          library={library}
          saving={busy === "saving"}
          dispatch={dispatch}
          onSave={() => void save()}
          onDrop={() => {
            setError(null);
            dispatch({ type: "restore", state: { ...initial, userId, clinicId } });
          }}
        />
      </section>
    </div>
  );
}
