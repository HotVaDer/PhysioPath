// What «Έγκριση» sends to the server, and the rules it must pass before approve_program() runs.
// Pure (no server code), so the review page can use the same rules to show errors early.
import * as z from "zod";

import { NoteLanguage } from "@/app/lib/notes/prompt";
import { ActivityCode, ClinicalNote, PatientProgram } from "@/app/lib/notes/schema";

// "home" or "<room uuid>:<slot number>"
const SLOT = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d{1,2})$/;

export const Approval = z.object({
  draftId: z.uuid(),
  patient: z.object({ id: z.uuid().nullable(), label: z.string().max(200) }),
  program: PatientProgram,
  note: ClinicalNote,
  noteLang: NoteLanguage,
  activityCode: ActivityCode.nullable(),
  where: z.string().nullable(),
});
export type Approval = z.infer<typeof Approval>;

export type ApprovalErrors = Partial<Record<"patient" | "exercises" | "activityCode" | "where", string>>;

// The program as it will be saved: exercises without a name are left out, names trimmed.
export function cleanProgram(program: PatientProgram): PatientProgram {
  return {
    ...program,
    title: program.title.trim() || "Πρόγραμμα ασκήσεων",
    exercises: program.exercises.filter((e) => e.name.trim()).map((e) => ({ ...e, name: e.name.trim() })),
    after_exercises: program.after_exercises.map((s) => s.trim()).filter(Boolean),
    avoid: program.avoid.map((s) => s.trim()).filter(Boolean),
    contact_if: program.contact_if.map((s) => s.trim()).filter(Boolean),
    other: program.other.map((s) => s.trim()).filter(Boolean),
  };
}

export function parseWhere(where: string | null): { roomId: string; slot: number } | "home" | null {
  if (where === "home") return "home";
  const match = where ? SLOT.exec(where) : null;
  return match ? { roomId: match[1], slot: Number(match[2]) } : null;
}

// Everything the physio still has to decide before approving, in Greek, tied to its field.
export function approvalErrors(a: Pick<Approval, "patient" | "program" | "activityCode" | "where">): ApprovalErrors {
  const errors: ApprovalErrors = {};
  const label = a.patient.label.trim();
  if (!a.patient.id && (label.length < 1 || label.length > 60)) errors.patient = "Γράψτε το μικρό όνομα ή έναν κωδικό του ασθενή.";
  const count = cleanProgram(a.program).exercises.length;
  if (count === 0) errors.exercises = "Χρειάζεται τουλάχιστον μία άσκηση με όνομα.";
  if (count > 40) errors.exercises = "Έως 40 ασκήσεις σε ένα πρόγραμμα.";
  if (!a.activityCode) errors.activityCode = "Διαλέξτε τον κωδικό πράξης.";
  if (!parseWhere(a.where)) errors.where = "Διαλέξτε πού ασκείται ο ασθενής, ή «Μόνο για το σπίτι».";
  return errors;
}

// ---------- the free beds and stations ----------
export type Room = { id: string; name: string; beds: number; stations: number };
export type OpenSession = { room_id: string | null; slot: number | null; patient_label: string | null };
export type SlotOption = { value: string; room: string; label: string; free: boolean; takenBy: string | null };

// Slots are numbered like the database counts them (check_slot): beds first, then stations.
// "Κρεβάτι 1…4", then "Θέση 1…3" for a room with 4 beds and 3 stations.
export function slotLabel(room: Pick<Room, "beds">, slot: number): string {
  return slot <= room.beds ? `Κρεβάτι ${slot}` : `Θέση ${slot - room.beds}`;
}

export function slotOptions(rooms: Room[], open: OpenSession[]): SlotOption[] {
  return rooms.flatMap((room) =>
    Array.from({ length: room.beds + room.stations }, (_, i) => {
      const slot = i + 1;
      const taken = open.find((s) => s.room_id === room.id && s.slot === slot);
      return {
        value: `${room.id}:${slot}`,
        room: room.name,
        label: slotLabel(room, slot),
        free: !taken,
        takenBy: taken ? (taken.patient_label ?? "ασθενής") : null,
      };
    }),
  );
}
