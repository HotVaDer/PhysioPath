import { describe, expect, it } from "vitest";

import {
  addDays,
  clinicDay,
  doneOn,
  entryFor,
  isHighPain,
  lastDays,
  localDay,
  LogAnswer,
  LogChange,
  longDayName,
  shortWeekday,
  withChange,
  type LogEntry,
} from "@/app/lib/home/log";

const log: LogEntry[] = [
  { day: "2026-11-21", exercise: 0, status: "done", pain: 2, note: null },
  { day: "2026-11-22", exercise: 0, status: "done", pain: null, note: null },
  { day: "2026-11-22", exercise: 2, status: "skipped", pain: 8, note: "πονάει" },
];

describe("home diary helpers", () => {
  it("finds the entry of one exercise on one day", () => {
    expect(entryFor(log, "2026-11-22", 2)?.status).toBe("skipped");
    expect(entryFor(log, "2026-11-22", 1)).toBeNull();
  });

  it("applies a change: adds, replaces the same exercise and day, or takes it back; trims the note", () => {
    const added = withChange(log, { day: "2026-11-22", exercise: 1, status: "done", pain: 3, note: "  λίγο  " });
    expect(entryFor(added, "2026-11-22", 1)).toEqual({ day: "2026-11-22", exercise: 1, status: "done", pain: 3, note: "λίγο" });
    const replaced = withChange(log, { day: "2026-11-22", exercise: 2, status: "done", pain: null, note: "   " });
    expect(replaced.filter((e) => e.day === "2026-11-22" && e.exercise === 2)).toEqual([
      { day: "2026-11-22", exercise: 2, status: "done", pain: null, note: null },
    ]);
    const removed = withChange(log, { day: "2026-11-22", exercise: 0, status: null, pain: null, note: null });
    expect(removed).toHaveLength(2);
    expect(entryFor(removed, "2026-11-21", 0)).not.toBeNull(); // another day of the same exercise stays
  });

  it("counts only «Το έκανα» of the exercises on the letter", () => {
    expect(doneOn(log, "2026-11-22", [0, 1, 2])).toBe(1);
    expect(doneOn(log, "2026-11-22", [1, 2])).toBe(0);
  });

  it("pain 7 or more is high", () => {
    expect([null, undefined, 0, 6, 7, 10].map(isHighPain)).toEqual([false, false, false, false, true, true]);
  });

  it("counts days across months and years, and lists the last 7 oldest first", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(lastDays("2026-12-02")).toEqual(["2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  });

  it("the clinic's day is Cyprus time; the device's day is its own", () => {
    expect(clinicDay("2026-11-22T22:30:00Z")).toBe("2026-11-23"); // 00:30 in Limassol
    expect(localDay(new Date(2026, 10, 18, 23, 30))).toBe("2026-11-18");
  });

  it("names days in Greek", () => {
    expect(shortWeekday("2026-11-24")).toBe("Τρί");
    expect(longDayName("2026-11-24")).toBe("Τρίτη 24 Νοεμβρίου");
  });

  it("checks what the letter sends and what the database answers", () => {
    expect(LogChange.safeParse({ day: "2026-11-22", exercise: 0, status: "done", pain: 3, note: null }).success).toBe(true);
    expect(LogChange.safeParse({ day: "22/11/2026", exercise: 0, status: "done", pain: 3, note: null }).success).toBe(false);
    expect(LogChange.safeParse({ day: "2026-11-22", exercise: 0, status: "done", pain: 11, note: null }).success).toBe(false);
    expect(LogChange.safeParse({ day: "2026-11-22", exercise: 0, status: "maybe", pain: null, note: null }).success).toBe(false);
    expect(LogChange.safeParse({ day: "2026-11-22", exercise: 0, status: null, pain: null, note: "α".repeat(501) }).success).toBe(false);
    expect(LogAnswer.parse({ status: "newer", clinicName: "x" })).toEqual({ status: "newer" });
    expect(LogAnswer.parse({ status: "ok", log, program: {} })).toEqual({ status: "ok", log });
  });
});
