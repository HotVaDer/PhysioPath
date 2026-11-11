"use client";
// The patient's program, made for older people reading on a phone or on paper:
// - bigger text (20px), and a control to make it bigger still, remembered on this phone;
// - doses written out in full ("3 σετ × 10 επαναλήψεις");
// - one card per exercise with a big "Το έκανα σήμερα" button, remembered for today;
// - «Αποφύγετε» and «Πάρτε μας τηλέφωνο αν» on soft amber and red panels;
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
    <section
      className={cx(
        "rounded-card p-5",
        tone === "warning" ? "bg-warning-bg" : tone === "danger" ? "bg-danger-bg" : "border border-border bg-surface",
      )}
    >
      <h2 className={cx("text-[1.1rem] font-bold", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>{title}</h2>
      <ul className="mt-1.5 list-disc space-y-1 pl-6">
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
    <div className="mx-auto max-w-xl px-4 pt-5 pb-16 leading-[1.45]">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border pb-3 text-[0.8rem]">
        <p className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-bold">{clinicName ?? "PhysioPath"}</span>
        </p>
        <p className="text-muted">Δείγμα · φανταστικός ασθενής</p>
      </header>

      <main id="main" className="mt-5 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          {program.patient_first_name && <p className="label text-muted">Για: {program.patient_first_name}</p>}
          <h1 className="text-[1.6rem] leading-[1.12] font-bold">Το πρόγραμμά σας για το σπίτι</h1>
          <p className="text-[0.95rem] text-muted">{program.title}</p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
          <TextSizeControl value={textSize} onChange={changeTextSize} />
          <Button icon={<PrinterIcon />} onClick={() => window.print()}>
            Εκτύπωση
          </Button>
        </div>

        {exercises.length > 0 && (
          <section aria-labelledby="exercises-heading" className="flex flex-col gap-3">
            <h2 id="exercises-heading" className="text-[1.2rem] font-bold">
              Ασκήσεις
            </h2>
            <div className="print:hidden">
              <p aria-live="polite">
                <span className="label text-muted">Σήμερα</span>{" "}
                <span className="font-bold">
                  {done.length} από {exercises.length}
                </span>{" "}
                ασκήσεις
              </p>
              <div aria-hidden="true" className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(done.length / exercises.length) * 100}%` }} />
              </div>
            </div>

            <ol className="flex flex-col gap-3">
              {exercises.map((exercise, index) => {
                const isDone = done.includes(index);
                return (
                  <li key={index} className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4 break-inside-avoid">
                    <h3 className="text-[1.2rem] leading-[1.15] font-bold">{exercise.name}</h3>
                    <ul>
                      {doseLines(exercise).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    {!isBlank(exercise.notes) && <p className="text-muted">{exercise.notes}</p>}
                    <button
                      type="button"
                      aria-pressed={isDone}
                      onClick={() => toggleDone(index)}
                      className={cx(
                        "flex min-h-[2.8rem] items-center justify-center gap-2 rounded-full border-2 px-4 text-[0.95rem] font-bold print:hidden",
                        isDone ? "border-primary bg-success-bg text-primary-text" : "border-border-strong bg-surface text-foreground hover:bg-surface-muted",
                      )}
                    >
                      {isDone && <CheckIcon size={22} />}
                      Το έκανα σήμερα
                      <span className="sr-only">: {exercise.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <InfoSection title="Μετά τις ασκήσεις" items={program.after_exercises} />
        <InfoSection title="Αποφύγετε" items={program.avoid} tone="warning" />
        <InfoSection title="Πάρτε μας τηλέφωνο αν" items={program.contact_if} tone="danger" />
        <InfoSection title="Άλλες οδηγίες" items={program.other} />
        {!isBlank(program.next_appointment) && (
          <section className="border-t border-border pt-4">
            <h2 className="text-[1.1rem] font-bold">Επόμενο ραντεβού</h2>
            <p>{program.next_appointment}</p>
          </section>
        )}
      </main>

      <footer className="mt-10 border-t border-border pt-5 text-[0.85rem] text-muted">
        Το πρόγραμμα το ετοίμασε και το ενέκρινε ο φυσιοθεραπευτής σας. Για οποιαδήποτε απορία, ρωτήστε στο φυσιοθεραπευτήριο.
      </footer>
    </div>
  );
}
