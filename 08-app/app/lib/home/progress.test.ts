import { describe, expect, it } from "vitest";

import {
  activeDays,
  daysAgo,
  diaryDays,
  exerciseNames,
  isLate,
  painByDay,
  summarise,
  type DiaryRow,
  type ProgramRow,
} from "@/app/lib/home/progress";

const TODAY = "2026-11-22";
// Ελένη: an older program (2 exercises) on 10 Nov, the current one (3, with a blank row) on 18 Nov.
const older: ProgramRow = {
  id: "p-old",
  patient_id: "eleni",
  approved_at: "2026-11-10T09:00:00Z",
  program: { title: "Γόνατο · εβδ. 1", exercises: [{ name: "Γέφυρα" }, { name: "Βάδιση" }] },
};
const current: ProgramRow = {
  id: "p-new",
  patient_id: "eleni",
  approved_at: "2026-11-18T15:42:00Z",
  program: { title: "Γόνατο · εβδ. 3", exercises: [{ name: "Γέφυρα" }, { name: "  " }, { name: "Διάταση" }, { name: "Ισορροπία" }] },
};
const row = (over: Partial<DiaryRow>): DiaryRow => ({
  program_id: "p-new",
  patient_id: "eleni",
  day: TODAY,
  exercise: 0,
  status: "done",
  pain: null,
  note: null,
  created_at: `${over.day ?? TODAY}T10:00:00Z`,
  seen_at: null,
  ...over,
});

describe("home progress for the physio", () => {
  it("names exercises by their place; a blank row is never shown", () => {
    expect(exerciseNames(current)).toEqual(["Γέφυρα", null, "Διάταση", "Ισορροπία"]);
  });

  it("a tick saved on a later day (Cyprus time) is «σημειώθηκε αργότερα»", () => {
    expect(isLate(row({ day: "2026-11-21", created_at: "2026-11-22T06:00:00Z" }))).toBe(true);
    expect(isLate(row({ day: "2026-11-21", created_at: "2026-11-21T21:30:00Z" }))).toBe(false); // 23:30 in Limassol
    expect(isLate(row({ day: "2026-11-21", created_at: "2026-11-21T22:30:00Z" }))).toBe(true); // 00:30 the next day
  });

  it("says how long ago in plain words", () => {
    expect(daysAgo("2026-11-22", TODAY)).toBe("σήμερα");
    expect(daysAgo("2026-11-21", TODAY)).toBe("χθες");
    expect(daysAgo("2026-11-01", TODAY)).toBe("πριν 21 μέρες");
  });

  it("counts the days of the last 7 with at least one «Το έκανα»", () => {
    const rows = [
      row({ day: "2026-11-22" }),
      row({ day: "2026-11-22", exercise: 2 }),
      row({ day: "2026-11-20", status: "skipped" }), // couldn't: not a day with exercises
      row({ day: "2026-11-16" }),
      row({ day: "2026-11-15" }), // 8 days ago: outside
    ];
    expect(activeDays(rows, TODAY)).toBe(2);
  });

  it("lists patients: pain reports first, then the most recent, then by name", () => {
    const rows = [
      row({ patient_id: "eleni", day: "2026-11-19", pain: 3 }),
      row({ patient_id: "kostas", program_id: "k1", day: "2026-11-15", pain: 8, note: "πονάει" }),
      row({ patient_id: "maria", program_id: "m1", day: "2026-11-21", pain: 9, seen_at: "2026-11-21T12:00:00Z" }), // seen
    ];
    const list = summarise(
      [
        { id: "eleni", label: "Ελένη" },
        { id: "kostas", label: "Κώστας" },
        { id: "maria", label: "Μαρία" },
        { id: "andreas", label: "Ανδρέας" },
      ],
      [older, current],
      rows,
      TODAY,
    );
    expect(list.map((p) => p.label)).toEqual(["Κώστας", "Μαρία", "Ελένη", "Ανδρέας"]);
    expect(list[0]).toMatchObject({ unseenPain: 1, latestPain: { pain: 8, day: "2026-11-15" }, program: null });
    expect(list[1].unseenPain).toBe(0);
    expect(list[2]).toMatchObject({ program: { id: "p-new", title: "Γόνατο · εβδ. 3" }, lastDay: "2026-11-19", activeDays: 1 });
    expect(list[3]).toMatchObject({ lastDay: null, latestPain: null, activeDays: 0 });
  });

  it("builds the diary day by day, newest first, each day against the program of that day", () => {
    const rows = [
      row({ day: "2026-11-22", exercise: 0 }),
      row({ day: "2026-11-22", exercise: 2, pain: 8, note: "τράβηγμα" }),
      row({ day: "2026-11-21", exercise: 3, status: "skipped", created_at: "2026-11-22T08:00:00Z" }),
      row({ day: "2026-11-12", program_id: "p-old", exercise: 1, pain: 2, seen_at: null }),
    ];
    const diary = diaryDays([current, older], rows, TODAY, 14);
    expect(diary.map((d) => d.day)).toEqual([
      "2026-11-22", "2026-11-21", "2026-11-20", "2026-11-19", "2026-11-18", "2026-11-17", "2026-11-16",
      "2026-11-15", "2026-11-14", "2026-11-13", "2026-11-12", "2026-11-11", "2026-11-10",
    ]); // stops at the first program's day (13 days, not 14)
    expect(diary[0]).toMatchObject({ done: 2, total: 3 }); // the blank row isn't counted
    expect(diary[0].entries).toEqual([
      { exercise: 0, name: "Γέφυρα", status: "done", pain: null, note: null, late: false, unseenPain: false },
      { exercise: 2, name: "Διάταση", status: "done", pain: 8, note: "τράβηγμα", late: false, unseenPain: true },
    ]);
    expect(diary[1].entries[0]).toMatchObject({ name: "Ισορροπία", status: "skipped", late: true });
    const nov12 = diary.find((d) => d.day === "2026-11-12")!;
    expect(nov12).toMatchObject({ total: 2, done: 1 }); // the older program's day
    expect(nov12.entries[0].name).toBe("Βάδιση");
  });

  it("no program, no diary", () => {
    expect(diaryDays([], [], TODAY, 14)).toEqual([]);
  });

  it("the pain line: the highest pain of each day, a gap where none was given", () => {
    const rows = [row({ day: "2026-11-21", pain: 3 }), row({ day: "2026-11-21", exercise: 2, pain: 6 }), row({ day: "2026-11-22" })];
    expect(painByDay(rows, ["2026-11-20", "2026-11-21", "2026-11-22"])).toEqual([
      { day: "2026-11-20", pain: null },
      { day: "2026-11-21", pain: 6 },
      { day: "2026-11-22", pain: null },
    ]);
  });
});
