"use client";
// The patient's program, made for older people reading on a phone or on paper:
// - bigger text (20px), and a control to make it bigger still, remembered on this phone;
// - doses written out in full ("3 σετ × 10 επαναλήψεις");
// - a big "Το έκανα σήμερα" button per exercise, remembered for today;
// - a print button, and a print layout without the buttons.
import { useEffect, useState } from "react";

import { BrandMark } from "@/app/components/layout/BrandMark";
import { Button } from "@/app/components/ui/Button";
import { CheckIcon, PrinterIcon } from "@/app/components/ui/icons";
import { TextSizeControl, useTextSize } from "@/app/features/patient/TextSize";
import { cx } from "@/app/lib/cx";
import { doseLines, isBlank } from "@/app/lib/format";
import type { PatientProgram } from "@/app/lib/schema";

type Tone = "plain" | "warning" | "danger";

function InfoSection({ title, items, tone = "plain" }: { title: string; items: string[]; tone?: Tone }) {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (!clean.length) return null;
  return (
    <section className={cx("border-l-4 pl-5", tone === "warning" ? "border-warning" : tone === "danger" ? "border-danger" : "border-foreground")}>
      <h2 className={cx("text-2xl font-bold", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-lg">
        {clean.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

type PatientProgramViewProps = { id: string; program: PatientProgram; clinicName?: string };

export function PatientProgramView({ id, program, clinicName }: PatientProgramViewProps) {
  const exercises = program.exercises.filter((exercise) => !isBlank(exercise.name));
  const [textSize, changeTextSize] = useTextSize();
  const [done, setDone] = useState<number[]>([]);
  const doneKey = `physiopath:${id}:${new Date().toLocaleDateString("sv")}`; // one list per program per day

  // Read today's ticks from this phone (after the first render, which has to match the server's).
  useEffect(() => {
    try {
      const ticks: unknown = JSON.parse(localStorage.getItem(doneKey) ?? "[]");
      if (Array.isArray(ticks)) setDone(ticks.filter((n): n is number => typeof n === "number"));
    } catch {
      // Storage blocked: everything still works, it just isn't remembered.
    }
  }, [doneKey]);

  function toggleDone(index: number) {
    const next = done.includes(index) ? done.filter((i) => i !== index) : [...done, index];
    setDone(next);
    try {
      localStorage.setItem(doneKey, JSON.stringify(next));
    } catch {}
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
        <p className="flex items-center gap-3">
          <BrandMark />
          <span className="label-mono">{clinicName ?? "PhysioPath"}</span>
        </p>
        <p className="label-mono text-muted">Δείγμα · φανταστικός ασθενής</p>
      </header>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <TextSizeControl value={textSize} onChange={changeTextSize} />
        <Button icon={<PrinterIcon />} onClick={() => window.print()}>
          Εκτύπωση
        </Button>
      </div>

      <main id="main" className="mt-12">
        {program.patient_first_name && (
          <p>
            <span className="label-mono text-muted">Για</span> <span className="text-xl font-semibold">{program.patient_first_name}</span>
          </p>
        )}
        <h1 className="mt-2 text-5xl leading-[0.95] font-extrabold tracking-tight italic">
          Το πρόγραμμά σας
          <span aria-hidden="true" className="text-primary">
            .
          </span>
        </h1>
        <p className="mt-3 text-xl text-muted">{program.title}</p>

        {exercises.length > 0 && (
          <>
            <div className="mt-10 border-y border-border py-4 print:hidden">
              <p aria-live="polite" className="text-lg">
                <span className="label-mono text-muted">Σήμερα</span>{" "}
                <span className="text-xl font-bold tabular-nums">
                  {done.length} από {exercises.length}
                </span>{" "}
                ασκήσεις
              </p>
              <div aria-hidden="true" className="mt-3 h-2 bg-surface-muted">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${(done.length / exercises.length) * 100}%` }} />
              </div>
            </div>

            <ol className="mt-4">
              {exercises.map((exercise, index) => {
                const isDone = done.includes(index);
                return (
                  <li key={index} className="border-b border-border py-8">
                    <div className="flex items-start gap-4">
                      <span aria-hidden="true" className="label-mono mt-1 rounded-xs bg-primary px-2 py-0.5 text-on-primary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-2xl leading-tight font-bold">{exercise.name}</h2>
                        <ul className="mt-3 space-y-1 text-xl font-semibold">
                          {doseLines(exercise).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                        {!isBlank(exercise.notes) && <p className="mt-3 text-lg text-muted">{exercise.notes}</p>}
                        <button
                          type="button"
                          aria-pressed={isDone}
                          onClick={() => toggleDone(index)}
                          className={cx(
                            "mt-5 inline-flex min-h-14 items-center gap-3 rounded-sm border-2 px-5 text-lg font-semibold print:hidden",
                            isDone ? "border-success bg-success-bg text-success" : "border-border-strong hover:bg-surface-muted",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cx("grid size-7 place-items-center rounded-xs border-2", isDone ? "border-success bg-success text-background" : "border-border-strong")}
                          >
                            {isDone && <CheckIcon size={18} />}
                          </span>
                          Το έκανα σήμερα
                          <span className="sr-only">: {exercise.name}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        <div className="mt-12 space-y-10">
          <InfoSection title="Μετά τις ασκήσεις" items={program.after_exercises} />
          <InfoSection title="Αποφύγετε" items={program.avoid} tone="warning" />
          <InfoSection title="Πάρτε μας τηλέφωνο αν" items={program.contact_if} tone="danger" />
          <InfoSection title="Άλλες οδηγίες" items={program.other} />
          {!isBlank(program.next_appointment) && (
            <section className="border-l-4 border-primary pl-5">
              <h2 className="text-2xl font-bold">Επόμενο ραντεβού</h2>
              <p className="mt-2 text-xl font-semibold">{program.next_appointment}</p>
            </section>
          )}
        </div>
      </main>

      <footer className="mt-16 border-t border-border pt-6 text-muted">
        Το πρόγραμμα το ετοίμασε και το ενέκρινε ο φυσιοθεραπευτής σας. Για οποιαδήποτε απορία, ρωτήστε στο φυσιοθεραπευτήριο.
      </footer>
    </div>
  );
}
