// «Τι άλλαξε» on «Αλλαγή με φωνή» (/templates/[id]/edit): the edited template compared with the saved one, by
// the app itself (never the AI's own account), so the physio sees exactly what saving will change.
// Exercises are matched by name (spaces and capitals don't count): a renamed exercise shows as one out, one in.
import { cleanProgram } from "@/app/lib/notes/approval";
import { doseLines } from "@/app/lib/notes/format";
import type { Exercise, PatientProgram } from "@/app/lib/notes/schema";

export type Change = { kind: "added" | "removed" | "changed"; text: string };
type Side = { name: string; area: string; program: PatientProgram };

const key = (text: string) => text.trim().replace(/\s+/g, " ").toLocaleLowerCase("el");
const dose = (e: Exercise) => doseLines(e).join(" · ") || "χωρίς δόση";
const LISTS = [
  ["after_exercises", "Μετά τις ασκήσεις"],
  ["avoid", "Αποφύγετε"],
  ["contact_if", "Πάρτε μας τηλέφωνο αν"],
  ["other", "Άλλες οδηγίες"],
] as const;

export function templateChanges(before: Side, after: Side): Change[] {
  const changes: Change[] = [];
  const was = cleanProgram(before.program);
  const now = cleanProgram(after.program);

  if (key(before.name) !== key(after.name)) changes.push({ kind: "changed", text: `Όνομα: «${before.name.trim()}» → «${after.name.trim()}»` });
  if (key(before.area) !== key(after.area))
    changes.push({ kind: "changed", text: `Περιοχή: ${before.area.trim() || "καμία"} → ${after.area.trim() || "καμία"}` });
  if (key(was.title) !== key(now.title)) changes.push({ kind: "changed", text: `Τίτλος: «${was.title}» → «${now.title}»` });

  const old = new Map(was.exercises.map((e) => [key(e.name), e]));
  const fresh = new Map(now.exercises.map((e) => [key(e.name), e]));
  for (const e of was.exercises) if (!fresh.has(key(e.name))) changes.push({ kind: "removed", text: `${e.name}` });
  for (const e of now.exercises) {
    const before = old.get(key(e.name));
    if (!before) changes.push({ kind: "added", text: `${e.name} · ${dose(e)}` });
    else {
      if (dose(before) !== dose(e)) changes.push({ kind: "changed", text: `${e.name}: ${dose(before)} → ${dose(e)}` });
      if ((before.notes ?? "").trim() !== (e.notes ?? "").trim())
        changes.push({ kind: "changed", text: `${e.name}: σημείωση «${(e.notes ?? "").trim() || "καμία"}»` });
    }
  }

  for (const [field, label] of LISTS) {
    const a = new Set(was[field].map(key));
    const b = new Set(now[field].map(key));
    for (const line of was[field]) if (!b.has(key(line))) changes.push({ kind: "removed", text: `${label}: ${line}` });
    for (const line of now[field]) if (!a.has(key(line))) changes.push({ kind: "added", text: `${label}: ${line}` });
  }
  return changes;
}
