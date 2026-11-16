import { describe, expect, it } from "vitest";

import {
  ClinicSchema,
  CoverSchema,
  CodeSchema,
  RegisterClinicSchema,
  RoomsSchema,
  TeamSchema,
  fieldErrors,
  firstRoom,
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

  it("asks for the email when the box is left empty (not «doesn't look like an email»)", () => {
    const r = CoverSchema.safeParse({ fullName: "Μαρία", email: "  " });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toEqual({ email: "Γράψτε το email σας." });
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

describe("sign-up, clinic step", () => {
  const clinic = { ownerName: "Μαρία", clinicName: "Ακτή", city: "Λεμεσός", phone: "25 000 000" };

  it("needs at least one bed and the agreement", () => {
    const r = RegisterClinicSchema.safeParse({ ...clinic, beds: "0" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error)).toEqual({
        beds: "Βάλτε τουλάχιστον 1 κρεβάτι.",
        consent: "Για να ολοκληρωθεί η εγγραφή, τσεκάρετε ότι συμφωνείτε.",
      });
    }
  });

  it("makes one room with the beds", () => {
    const r = RegisterClinicSchema.parse({ ...clinic, beds: "4", consent: "on" });
    expect(r.beds).toBe(4);
    expect(RoomsSchema.parse(firstRoom(r.beds))).toEqual([{ name: "Αίθουσα", beds: 4, stations: 0 }]);
  });
});

describe("email code", () => {
  it("takes 6 digits, with or without spaces", () => {
    expect(CodeSchema.parse(" 123 456 ")).toBe("123456");
    expect(CodeSchema.parse("123-456")).toBe("123456");
  });

  it("says in words what's wrong", () => {
    expect(CodeSchema.safeParse("").error?.issues[0].message).toBe("Γράψτε τον κωδικό από το email.");
    expect(CodeSchema.safeParse("12345").error?.issues[0].message).toBe(
      "Ο κωδικός έχει 6 ψηφία. Τον βρίσκετε στο email που σας στείλαμε.",
    );
  });
});
