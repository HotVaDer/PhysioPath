"use client";
// The small box under an exercise, after «Το έκανα» or «Δεν μπόρεσα»: how much it hurt (0–10, the
// scale physios use, with words at 0, 5 and 10) and a note in the patient's own words. Both optional:
// «Αποθήκευση» saves what's there, «Κλείσιμο» leaves it as it was.
// The pain is 11 real radio buttons (one choice, arrow keys work, a screen reader says «3 από 10»),
// drawn as big square boxes; pressing the chosen one again clears it.
import { useId, useState } from "react";

import { cx } from "@/app/lib/cx";
import { NOTE_MAX } from "@/app/lib/home/log";

const SCALE = Array.from({ length: 11 }, (_, i) => i);

type Props = {
  exerciseName: string;
  pain: number | null;
  note: string | null;
  saving: boolean;
  onSave: (pain: number | null, note: string | null) => void;
  onClose: () => void;
};

export function FeedbackPanel({ exerciseName, pain: savedPain, note: savedNote, saving, onSave, onClose }: Props) {
  const id = useId();
  const [pain, setPain] = useState<number | null>(savedPain);
  const [note, setNote] = useState(savedNote ?? "");

  return (
    <form
      aria-label={`Πόνος και σημείωση: ${exerciseName}`}
      className="flex flex-col gap-4 border-2 border-line bg-white px-3 py-4 sm:px-4 print:hidden"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(pain, note.trim() || null);
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Πόνος σε αυτή την άσκηση;</legend>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
          {SCALE.map((n) => (
            <label key={n} className="relative">
              <input
                type="radio"
                name={`${id}-pain`}
                value={n}
                checked={pain === n}
                aria-label={`${n} από 10`}
                onChange={() => setPain(n)}
                onClick={() => {
                  if (pain === n) setPain(null); // the chosen one again: no pain said
                }}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span
                aria-hidden="true"
                className={cx(
                  "grid min-h-[3rem] place-items-center border-2 font-display text-[1.15rem] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-action",
                  pain === n ? "border-action bg-action text-white" : "border-line bg-sheet text-ink",
                )}
              >
                {n}
              </span>
            </label>
          ))}
        </div>
        <p className="text-muted">
          <span className="whitespace-nowrap">0 = Καθόλου</span> · <span className="whitespace-nowrap">5 = Μέτριος</span> ·{" "}
          <span className="whitespace-nowrap">10 = Πολύ δυνατός</span>
        </p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-note`} className="font-bold">
          Σημείωση <span className="font-normal text-muted">(αν θέλετε)</span>
        </label>
        <textarea
          id={`${id}-note`}
          value={note}
          maxLength={NOTE_MAX}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
          className="w-full border-2 border-line bg-sheet px-3 py-2 text-[1.05rem] focus:border-action focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[3.25rem] flex-1 cursor-pointer bg-action px-4 py-2 text-[1.05rem] font-bold text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-70"
        >
          {saving ? "Αποθηκεύεται…" : "Αποθήκευση"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[3.25rem] cursor-pointer border-2 border-line bg-white px-4 py-2 text-[1.05rem] font-bold text-ink hover:border-action"
        >
          Κλείσιμο
        </button>
      </div>
    </form>
  );
}
