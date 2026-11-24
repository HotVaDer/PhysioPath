"use client";
// «Πρότυπο» on the recording page: finding one of the clinic's templates quickly, even among 30 or more.
//   search      as you type, over the names and areas («γον acl»), without accents or capitals
//   Προτεινόμενα the templates for the area the physio wrote in this patient's last note, most used first,
//               saying where that comes from. Plain matching (app/lib/templates/area.ts): it only sorts.
//   Όλα         every template that matches the search, by area; the suggested ones are there too
// Picking one folds the list into the chosen template with «Άλλο πρότυπο». Buttons, not radios: a suggested
// template appears twice (in «Προτεινόμενα» and in its area), and both show it chosen.
import { useId, useState } from "react";

import { fieldBox } from "@/app/components/paper/LineField";
import { cx } from "@/app/lib/cx";
import type { PatientProgram } from "@/app/lib/notes/schema";
import { groupTemplates } from "@/app/lib/templates/area";

// One of the clinic's templates, for the picker. uses: approved programs that started from it.
export type TemplateChoice = { id: string; name: string; area: string | null; uses: number; program: PatientProgram };

type Props = {
  templates: TemplateChoice[];
  chosenId: string | null;
  patientArea: string | null; // «Περιοχή σώματος» of the patient's last note
  disabled: boolean;
  onPick: (template: TemplateChoice | null) => void;
};

const exercises = (n: number) => (n === 1 ? "1 άσκηση" : `${n} ασκήσεις`);

export function TemplatePicker({ templates, chosenId, patientArea, disabled, onPick }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const chosen = templates.find((t) => t.id === chosenId) ?? null;
  const open = !chosen || browsing;
  const { suggested, groups } = groupTemplates(templates, query, patientArea);
  const found = groups.reduce((n, g) => n + g.templates.length, 0);

  const pick = (template: TemplateChoice | null) => {
    onPick(template);
    setBrowsing(false);
    setQuery("");
  };

  const option = (t: TemplateChoice) => {
    const on = t.id === chosenId;
    return (
      <li key={t.id}>
        <button
          type="button"
          aria-pressed={on}
          disabled={disabled}
          onClick={() => pick(t)}
          className={cx(
            "flex min-h-12 w-full cursor-pointer flex-wrap items-baseline gap-x-3 rounded-md border-2 px-3.5 py-2 text-left text-ink disabled:cursor-wait",
            on ? "border-action bg-note-green" : "border-line bg-white hover:border-action",
          )}
        >
          <span className="font-semibold">{t.name}</span>
          <span className="text-base text-muted">
            {exercises(t.program.exercises.length)}
            {t.uses > 0 ? ` · ×${t.uses}` : ""}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 id={`${id}-h`} className="text-[21px] font-bold">
        Πρότυπο <span className="text-[19px] font-normal text-muted">(προαιρετικό)</span>
      </h2>

      {!open && chosen ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[19px]">
          <span>
            <strong>{chosen.name}</strong>
            <span className="text-base text-muted"> · {exercises(chosen.program.exercises.length)}</span>
          </span>
          <button type="button" disabled={disabled} onClick={() => setBrowsing(true)} className="min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink">
            Άλλο πρότυπο
          </button>
          <button type="button" disabled={disabled} onClick={() => pick(null)} className="min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink">
            Χωρίς πρότυπο
          </button>
        </p>
      ) : (
        <div role="group" aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
          <p className="text-base text-muted">Ένα από τα πρότυπα της κλινικής σας, όπως είναι ή με αλλαγές που λέτε.</p>
          {templates.length > 5 && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-q`} className="font-semibold">
                Αναζήτηση
              </label>
              <input
                id={`${id}-q`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="π.χ. γόνατο, ACL, ώμος"
                autoComplete="off"
                className={cx(fieldBox(), "max-w-[420px]")}
              />
            </div>
          )}

          <div className="flex max-h-[440px] flex-col gap-4 overflow-y-auto pr-1">
            {suggested && (
              <section aria-labelledby={`${id}-s`} className="flex flex-col gap-1.5 rounded-md bg-tab-yellow px-3 py-2.5">
                <h3 id={`${id}-s`} className="font-bold">
                  Προτεινόμενα · {suggested.area}
                  <span className="font-normal text-muted"> · από την τελευταία σας σημείωση</span>
                </h3>
                <ul className="flex flex-col gap-1.5">{suggested.templates.map(option)}</ul>
              </section>
            )}

            {found === 0 ? (
              <p role="status">Κανένα πρότυπο δεν ταιριάζει με «{query.trim()}».</p>
            ) : (
              groups.map((g) => (
                <section key={g.area ?? "-"} aria-label={g.area ?? "Χωρίς περιοχή"} className="flex flex-col gap-1.5">
                  {(groups.length > 1 || g.area) && <h3 className="font-semibold">{g.area ?? "Χωρίς περιοχή"}</h3>}
                  <ul className="flex flex-col gap-1.5">{g.templates.map(option)}</ul>
                </section>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-x-5">
            {chosen ? (
              <button type="button" disabled={disabled} onClick={() => setBrowsing(false)} className="min-h-11 cursor-pointer text-base text-action underline underline-offset-[3px] hover:text-ink">
                Πίσω στο «{chosen.name}»
              </button>
            ) : null}
            <span className="min-h-11 content-center text-base text-muted">Χωρίς πρότυπο: απλώς ηχογραφήστε.</span>
          </div>
        </div>
      )}
    </div>
  );
}
