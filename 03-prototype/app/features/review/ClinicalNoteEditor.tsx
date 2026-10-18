// The clinical note on the review page, in the language it was written in, with a copy button
// for pasting it into the clinic's own system. This part never reaches the patient.
import { useState, type Dispatch } from "react";

import { Button } from "@/app/components/ui/Button";
import { CheckIcon, CopyIcon } from "@/app/components/ui/icons";
import { TextArea } from "@/app/components/ui/TextArea";
import { TextField } from "@/app/components/ui/TextField";
import type { DraftAction } from "@/app/lib/draft";
import { NOTE_FIELDS, noteAsText } from "@/app/lib/format";
import type { NoteLanguage } from "@/app/lib/prompt";
import type { ClinicalNote } from "@/app/lib/schema";

const SHORT_FIELDS: (keyof ClinicalNote)[] = ["patient", "body_area", "stage"];

type ClinicalNoteEditorProps = { note: ClinicalNote; lang: NoteLanguage; dispatch: Dispatch<DraftAction> };

export function ClinicalNoteEditor({ note, lang, dispatch }: ClinicalNoteEditorProps) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const labels = NOTE_FIELDS[lang];
  const fields = Object.keys(labels) as (keyof ClinicalNote)[];
  const placeholder = lang === "en" ? "Not mentioned" : "Δεν αναφέρθηκε";
  const props = (field: keyof ClinicalNote) => ({
    label: labels[field],
    value: note[field] ?? "",
    placeholder,
    onChange: (event: { target: { value: string } }) => dispatch({ type: "setNote", field, value: event.target.value }),
  });

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(noteAsText(note, lang));
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div lang={lang}>
      <div className="grid gap-5 sm:grid-cols-3">
        {SHORT_FIELDS.map((field) => (
          <TextField key={field} {...props(field)} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {fields
          .filter((field) => !SHORT_FIELDS.includes(field))
          .map((field) => (
            <TextArea key={field} {...props(field)} className="min-h-20" />
          ))}
      </div>
      <div lang="el" className="mt-6 flex flex-wrap items-center gap-4">
        <Button icon={copy === "copied" ? <CheckIcon /> : <CopyIcon />} onClick={() => void copyNote()}>
          Αντιγραφή σημείωσης
        </Button>
        <p role="status" className="text-muted">
          {copy === "copied" ? "Η σημείωση αντιγράφηκε." : copy === "failed" ? "Δεν ήταν δυνατή η αντιγραφή. Επιλέξτε το κείμενο και αντιγράψτε το." : ""}
        </p>
      </div>
    </div>
  );
}
