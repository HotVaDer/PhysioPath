"use client";
// «Νέα συνεδρία» step 1 of 4: for which patient. The clinic's patients as big boxes (with a search
// box when there are many), or «+ Νέος ασθενής» with a short name or code, then «Συνέχεια →»: to step 2
// (same program or a new one) for a patient who has one, straight to the recording for a new patient. If a note was left half-way, it asks first: continue it, or start again.
// The patient goes into the draft (sessionStorage); a new patient is only saved when the note is approved.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LineField } from "@/app/components/paper/LineField";
import { Panel, PanelTitle } from "@/app/components/paper/StaffSheet";
import { cx } from "@/app/lib/cx";
import { useDraft } from "@/app/lib/notes/DraftContext";

type Patient = { id: string; label: string };

const choice =
  "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-md border-2 border-line bg-white px-4 py-2 text-[19px] has-[:checked]:border-[3px] has-[:checked]:border-action has-[:checked]:bg-note-green";
const radio = "size-[22px] flex-none cursor-pointer accent-action";
const green =
  "inline-flex min-h-14 cursor-pointer items-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white hover:bg-action-hover";
const outline =
  "inline-flex min-h-14 cursor-pointer items-center gap-2.5 border-[3px] border-action bg-white px-6 text-[19px] font-bold text-action hover:bg-note-green";

// More than this many patients: show a search box above the list.
const SEARCH_FROM = 8;

export function PatientForm({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const { draft, dispatch, ready } = useDraft();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <p className="text-muted">Φόρτωση…</p>;

  const selected = draft.patient ? (draft.patient.id ?? "new") : null;
  const label = draft.patient?.label ?? "";
  const unfinished = Boolean(draft.patient && (draft.transcript.trim() || draft.result));
  const q = query.trim().toLocaleLowerCase("el");
  const shown = q ? patients.filter((p) => p.label.toLocaleLowerCase("el").includes(q)) : patients;
  // A new patient typed with the same name as one in the list: probably the same person.
  const same = selected === "new" && label.trim() ? patients.find((p) => p.label.trim().toLocaleLowerCase("el") === label.trim().toLocaleLowerCase("el")) : undefined;

  function next() {
    if (!selected) return setError("Διαλέξτε ασθενή, ή «Νέος ασθενής».");
    if (selected === "new" && (label.trim().length < 1 || label.trim().length > 60)) {
      setError(null);
      document.getElementById("n-label")?.focus();
      return setError("Γράψτε το μικρό όνομα ή έναν κωδικό του ασθενή.");
    }
    setError(null);
    if (selected === "new") {
      dispatch({ type: "setMode", mode: "new", base: null });
      router.push("/notes/record");
    } else {
      router.push(`/notes/program?patient=${selected}`); // step 2 skips itself if there's no program yet
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[34px] leading-tight sm:text-[40px]">Για ποιον ασθενή;</h1>
        <p className="max-w-[62ch] text-muted">
          Διαλέξτε τον ασθενή, ή προσθέστε νέο. Μετά διαλέγετε αν κρατά το ίδιο πρόγραμμα, ηχογραφείτε, κι εσείς
          ελέγχετε τα πάντα πριν φτάσει οτιδήποτε στον ασθενή.
        </p>
      </div>

      {unfinished && (
        <Panel tint="yellow" labelledBy="u-h">
          <PanelTitle id="u-h">Έχετε μια συνεδρία που δεν τελείωσε, για «{draft.patient?.label || "ασθενή χωρίς όνομα"}».</PanelTitle>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" className={green} onClick={() => router.push(draft.result ? "/notes/review" : "/notes/record")}>
              Συνέχεια σε αυτή <span aria-hidden="true">→</span>
            </button>
            <button type="button" className={outline} onClick={() => dispatch({ type: "reset" })}>
              Νέα συνεδρία, από την αρχή
            </button>
          </div>
        </Panel>
      )}

      <fieldset aria-describedby={error && selected !== "new" ? "p-error" : undefined} className="flex flex-col gap-3">
        <legend className="sr-only">Ασθενής</legend>

        {patients.length > SEARCH_FROM && (
          <LineField
            id="p-search"
            type="search"
            label="Αναζήτηση"
            autoComplete="off"
            width="max-w-[360px]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        <div className="grid gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          <label className={choice}>
            <input
              type="radio"
              name="patient"
              checked={selected === "new"}
              onChange={() => {
                setError(null);
                dispatch({ type: "setPatient", patient: { id: null, label: "" } });
              }}
              className={radio}
            />
            <span className="font-semibold">
              <span aria-hidden="true">+ </span>Νέος ασθενής
            </span>
          </label>
          {shown.map((p) => (
            <label key={p.id} className={choice}>
              <input
                type="radio"
                name="patient"
                checked={selected === p.id}
                onChange={() => {
                  setError(null);
                  dispatch({ type: "setPatient", patient: { id: p.id, label: p.label } });
                }}
                className={radio}
              />
              {p.label}
            </label>
          ))}
        </div>
        {q && shown.length === 0 && <p className="text-muted">Κανένας ασθενής με «{query.trim()}». Διαλέξτε «Νέος ασθενής».</p>}

        {selected === "new" && (
          <div className={cx("flex flex-col gap-2 rounded-md border-2 border-hairline px-4 py-3.5 sm:px-5")}>
            <LineField
              id="n-label"
              label="Μικρό όνομα ή κωδικός"
              hint="Μόνο ό,τι χρειάζεστε για να τον ξεχωρίζετε, π.χ. «Γιώργος Δ.». Όχι επώνυμο, όχι ταυτότητα."
              maxLength={60}
              autoComplete="off"
              autoFocus
              width="max-w-[360px]"
              value={label}
              error={error && selected === "new" ? error : undefined}
              onChange={(e) => {
                setError(null); // they're fixing it: the problem goes away while they type
                dispatch({ type: "setPatient", patient: { id: null, label: e.target.value } });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") next();
              }}
            />
            {same && (
              <p className="flex flex-wrap items-center gap-x-3">
                Υπάρχει ήδη «{same.label}» στη λίστα. Αν είναι ο ίδιος,
                <button
                  type="button"
                  onClick={() => dispatch({ type: "setPatient", patient: { id: same.id, label: same.label } })}
                  className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink"
                >
                  διαλέξτε τον
                </button>
              </p>
            )}
          </div>
        )}
        {error && selected !== "new" && (
          <p id="p-error" role="alert" className="font-semibold text-error">
            Πρόβλημα: {error}
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t-2 border-hairline pt-5">
        <button type="button" onClick={next} className={green}>
          Συνέχεια <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
