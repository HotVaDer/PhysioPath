import { describe, expect, it } from "vitest";

import { approvalErrors, cleanProgram, parseWhere, slotLabel, slotOptions } from "@/app/lib/notes/approval";
import type { PatientProgram } from "@/app/lib/notes/schema";

const ROOM = "11111111-2222-4333-8444-555555555555";

const program = (names: string[]): PatientProgram => ({
  patient_first_name: null,
  title: "  ",
  exercises: names.map((name) => ({ name, sets: null, reps: null, hold: null, frequency: null, notes: null })),
  after_exercises: [" Πάγος ", ""],
  avoid: [],
  contact_if: [],
  other: [],
  next_appointment: null,
});

describe("cleanProgram", () => {
  it("leaves out exercises without a name and empty list lines", () => {
    const clean = cleanProgram(program([" Γέφυρα ", "  ", "Καθίσματα"]));
    expect(clean.exercises.map((e) => e.name)).toEqual(["Γέφυρα", "Καθίσματα"]);
    expect(clean.after_exercises).toEqual(["Πάγος"]);
    expect(clean.title).toBe("Πρόγραμμα ασκήσεων");
  });
});

describe("parseWhere", () => {
  it("reads home or a room slot, anything else is nothing", () => {
    expect(parseWhere("home")).toBe("home");
    expect(parseWhere(`${ROOM}:3`)).toEqual({ roomId: ROOM, slot: 3 });
    expect(parseWhere("somewhere")).toBeNull();
    expect(parseWhere(null)).toBeNull();
  });
});

describe("approvalErrors", () => {
  const ok = { patient: { id: null, label: "Ελένη" }, program: program(["Γέφυρα"]), activityCode: "PHYS02" as const, where: "home" };

  it("passes when everything is decided", () => {
    expect(approvalErrors(ok)).toEqual({});
  });

  it("asks for each missing decision, tied to its field", () => {
    expect(approvalErrors({ patient: { id: null, label: " " }, program: program(["  "]), activityCode: null, where: null })).toEqual({
      patient: "Γράψτε το μικρό όνομα ή έναν κωδικό του ασθενή.",
      exercises: "Χρειάζεται τουλάχιστον μία άσκηση με όνομα.",
      activityCode: "Διαλέξτε τον κωδικό πράξης.",
      where: "Διαλέξτε πού ασκείται ο ασθενής, ή «Μόνο για το σπίτι».",
    });
  });
});

describe("slots", () => {
  it("numbers beds first, then stations, like the database", () => {
    expect(slotLabel({ beds: 4 }, 2)).toBe("Κρεβάτι 2");
    expect(slotLabel({ beds: 4 }, 5)).toBe("Θέση 1");
    expect(slotLabel({ beds: 0 }, 1)).toBe("Θέση 1");
  });

  it("marks the slots taken by open sessions", () => {
    const options = slotOptions([{ id: ROOM, name: "Αίθουσα 1", beds: 2, stations: 1 }], [{ room_id: ROOM, slot: 2, patient_label: "Γιώργος" }]);
    expect(options.map((o) => [o.label, o.free, o.takenBy])).toEqual([
      ["Κρεβάτι 1", true, null],
      ["Κρεβάτι 2", false, "Γιώργος"],
      ["Θέση 1", true, null],
    ]);
  });
});
