// Approved programs, saved as output/<id>.json on this Mac.
// The patient side only ever gets the program, never the clinical note.
import "server-only";

import { randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { OUTPUT_DIR } from "@/app/lib/config";
import { PatientProgram, type ClinicalNote } from "@/app/lib/schema";

// Date + random part, e.g. 2026-10-15-k3x9q2ab. The strict pattern also stops an id from
// reaching files outside output/ (no dots or slashes).
export const ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]{6,12}$/;
const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function newId(): string {
  const random = Array.from({ length: 8 }, () => ID_CHARS[randomInt(ID_CHARS.length)]).join("");
  return `${new Date().toISOString().slice(0, 10)}-${random}`;
}

export async function saveApproved(program: PatientProgram, note: ClinicalNote): Promise<string> {
  const id = newId();
  await mkdir(OUTPUT_DIR, { recursive: true });
  const record = { approvedAt: new Date().toISOString(), program, note };
  await writeFile(join(OUTPUT_DIR, `${id}.json`), JSON.stringify(record, null, 2), { flag: "wx" }); // never overwrite
  return id;
}

export async function readPatientProgram(id: string): Promise<PatientProgram | null> {
  if (!ID_PATTERN.test(id)) return null;
  let raw: string;
  try {
    raw = await readFile(join(OUTPUT_DIR, `${id}.json`), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const parsed = PatientProgram.safeParse(JSON.parse(raw).program);
  return parsed.success ? parsed.data : null;
}
