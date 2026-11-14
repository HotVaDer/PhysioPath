import { describe, expect, it } from "vitest";

import {
  ClinicSchema,
  CoverSchema,
  FilingSchema,
  RoomsSchema,
  TeamSchema,
  fieldErrors,
  progress,
} from "@/app/lib/onboarding/schema";

describe("cover", () => {
  it("trims the name and lower-cases the email", () => {
    expect(CoverSchema.parse({ fullName: "  Μαρία Κ. ", email: " Maria@Example.com " })).toEqual({
      fullName: "Μαρία Κ.",
      email: "maria@example.com",
    });
  });

  it("says in Greek what's wrong", () => {
    const r = CoverSchema.safeParse({ fullName: " ", email: "maria" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error)).toEqual({
        fullName: "Γράψτε το ονοματεπώνυμό σας.",
        email: "Αυτό δεν μοιάζει με email. Παράδειγμα: maria@example.com",
      });
    }
  });
});

describe("§1 clinic", () => {
  const ok = { ownerName: "Μαρία", clinicName: "Φυσικοθεραπεία Ακτή", city: "Λεμεσός", phone: "25 000 000" };

  it("accepts a normal clinic", () => {
    expect(ClinicSchema.parse(ok)).toEqual(ok);
  });

  it("accepts a phone with country code and dashes", () => {
    expect(ClinicSchema.safeParse({ ...ok, phone: "+357 25-000000" }).success).toBe(true);
  });

  it.each(["abc", "12345", "25 000 000 ext. 3", "++++++"])("rejects the phone %s", (phone) => {
    expect(ClinicSchema.safeParse({ ...ok, phone }).success).toBe(false);
  });

  it("only knows the listed cities", () => {
    expect(ClinicSchema.safeParse({ ...ok, city: "Αθήνα" }).success).toBe(false);
  });
});

describe("§2 rooms", () => {
  it("turns the form's text numbers into numbers", () => {
    expect(RoomsSchema.parse([{ name: "Αίθουσα 1", beds: "4", stations: "0" }])).toEqual([
      { name: "Αίθουσα 1", beds: 4, stations: 0 },
    ]);
  });

  it("refuses an empty room, like the database does", () => {
    const r = RoomsSchema.safeParse([{ name: "Άδειο", beds: 0, stations: 0 }]);
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)["0.beds"]).toBe("Βάλτε τουλάχιστον ένα κρεβάτι ή μία θέση.");
  });

  it.each([-1, 41, 2.5])("refuses %s beds", (beds) => {
    expect(RoomsSchema.safeParse([{ name: "Χ", beds, stations: 0 }]).success).toBe(false);
  });

  it("needs at least one room", () => {
    expect(RoomsSchema.safeParse([]).success).toBe(false);
  });
});

describe("§3 team", () => {
  it("may be empty (invite later)", () => {
    expect(TeamSchema.parse([])).toEqual([]);
  });

  it("refuses the same email twice, whatever the capitals", () => {
    const r = TeamSchema.safeParse([
      { email: "eleni@example.com", role: "assistant" },
      { email: "Eleni@Example.com ", role: "physio" },
    ]);
    expect(r.success).toBe(false);
  });

  it("only knows physio and assistant", () => {
    expect(TeamSchema.safeParse([{ email: "a@example.com", role: "owner" }]).success).toBe(false);
  });
});

describe("filing and progress", () => {
  const draft = {
    ownerName: "Μαρία",
    clinicName: "Ακτή",
    city: "Λεμεσός",
    phone: "25 000 000",
    rooms: [{ name: "Αίθουσα 1", beds: 4, stations: 0 }],
  };

  it("files without a team", () => {
    expect(FilingSchema.parse(draft).team).toEqual([]);
  });

  it("shows which sheets are done", () => {
    expect(progress({})).toEqual({ clinic: false, rooms: false, team: false });
    expect(progress(draft)).toEqual({ clinic: true, rooms: true, team: false });
    expect(progress({ ...draft, team: [] })).toEqual({ clinic: true, rooms: true, team: true });
  });
});
