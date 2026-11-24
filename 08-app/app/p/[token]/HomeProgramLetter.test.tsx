import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { addDays, localDay } from "@/app/lib/home/log";
import { HomeProgramLetter, type HomeProgramLetterProps } from "@/app/p/[token]/HomeProgramLetter";
import { expectNoA11yViolations } from "@/app/test/axe";
import { useMemoryStorage } from "@/app/test/storage";

// A fictional clinic, physio and patient.
const full: HomeProgramLetterProps = {
  token: "3f0c2b9e-6a1d-4c8e-9b7a-1d2e3f4a5b6c",
  program: {
    title: "Αριστερό γόνατο · εβδομάδα 3",
    patient_first_name: "Ελένη",
    exercises: [
      { name: "Γέφυρα γλουτών", sets: 3, reps: "10", hold: "3 δευτερόλεπτα", frequency: "1 φορά τη μέρα", notes: "Σφίξτε τους γλουτούς." },
      { name: "Διάταση γάμπας", sets: null, reps: "30 δευτερόλεπτα", hold: null, frequency: null, notes: null },
      { name: "   ", sets: 1, reps: "5" }, // a blank row the physio left: not shown
    ],
    after_exercises: ["Πάγος για 10 λεπτά."],
    avoid: ["Σκάλες χωρίς κουπαστή.", "  "],
    contact_if: ["Το γόνατο πρηστεί."],
    other: ["Άνετα παπούτσια."],
    next_appointment: "Πέμπτη 26 Νοεμβρίου, 17:30",
  },
  approvedAt: "2026-11-18T15:42:00Z",
  approvedBy: "Μαρία Κωνσταντίνου",
  clinicName: "Φυσιοθεραπεία Ελιά",
  clinicCity: "Λεμεσός",
  clinicPhone: "25 000000",
  log: [],
  today: localDay(),
  firstDay: addDays(localDay(), -10),
};

const sparse: HomeProgramLetterProps = {
  ...full,
  program: { title: "Δεξιός ώμος", patient_first_name: null, exercises: [{ name: "Εκκρεμές", reps: "1 λεπτό" }] },
  approvedBy: null,
  clinicCity: null,
  clinicPhone: null,
};

const letterhead = (container: HTMLElement) => container.querySelector("main > header") as HTMLElement;

useMemoryStorage();

describe("HomeProgramLetter", () => {
  it("opens like a letter: from the clinic, for the patient, dated, about the program, with the next appointment", async () => {
    const { container } = render(<HomeProgramLetter {...full} />);
    const main = screen.getByRole("main");

    // From: the clinic's name, city and a phone to tap.
    expect(letterhead(container)).toHaveTextContent("Φυσιοθεραπεία Ελιά");
    expect(letterhead(container)).toHaveTextContent("Λεμεσός");
    expect(within(letterhead(container)).getByRole("link", { name: "Τηλέφωνο: 25 000000" })).toHaveAttribute("href", "tel:25000000");

    // For whom and when, then the program's own title as the page title, and one opening sentence.
    expect(main).toHaveTextContent("Για: Ελένη");
    expect(within(main).getByText("18 Νοεμβρίου 2026")).toHaveAttribute("dateTime", full.approvedAt);
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe("Αριστερό γόνατο\u00a0· εβδομάδα 3"); // the «·» never starts a line
    expect(main).toHaveTextContent("Το πρόγραμμά σας για το σπίτι, όπως το είπαμε στη συνεδρία.");

    // The next appointment comes before the exercises, near the top.
    const appointment = screen.getByRole("region", { name: "Επόμενο ραντεβού" });
    expect(appointment).toHaveTextContent("Πέμπτη 26 Νοεμβρίου, 17:30");
    const today = screen.getByRole("region", { name: "Σήμερα" });
    expect(appointment.compareDocumentPosition(today) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it("lists today's exercises with full doses, then the physio's instructions, and closes with who approved it", async () => {
    const { container } = render(<HomeProgramLetter {...full} />);
    const main = screen.getByRole("main");

    // The exercises, numbered, with the dose in full words; the blank one is left out.
    const names = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(["Άσκηση 1: Γέφυρα γλουτών", "Άσκηση 2: Διάταση γάμπας"]);
    expect(main).toHaveTextContent("3 σετ × 10 επαναλήψεις");
    expect(main).toHaveTextContent("Κρατήστε 3 δευτερόλεπτα");
    expect(main).toHaveTextContent("Σφίξτε τους γλουτούς.");
    expect(screen.getAllByRole("button", { name: /^Το έκανα σήμερα/ })).toHaveLength(2);

    // The sections, in reading order, and the call button.
    const sections = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(sections).toEqual(["Επόμενο ραντεβού", "Οι τελευταίες 7 μέρες", "Σήμερα", "Μετά τις ασκήσεις", "Αποφύγετε", "Πάρτε μας τηλέφωνο αν", "Άλλες οδηγίες"]);
    expect(within(screen.getByRole("region", { name: "Αποφύγετε" })).getAllByRole("listitem")).toHaveLength(1); // the blank item is dropped
    expect(screen.getByRole("link", { name: "Καλέστε μας, 25 000000" })).toHaveAttribute("href", "tel:25000000");

    // The closing: where to ask, and who prepared and approved it.
    const closing = container.querySelector("main > footer") as HTMLElement;
    expect(closing).toHaveTextContent("Για οποιαδήποτε απορία, καλέστε μας στο 25 000000.");
    expect(within(closing).getByRole("link", { name: "25 000000" })).toHaveAttribute("href", "tel:25000000");
    expect(closing).toHaveTextContent("Το ετοίμασε και το ενέκρινε");
    expect(closing).toHaveTextContent("Μαρία Κωνσταντίνου");
    expect(closing).toHaveTextContent("Φυσιοθεραπεία Ελιά");
    await expectNoA11yViolations(container);
  });

  it("works with little data: no name, city, phone, approver, appointment or lists", async () => {
    const { container } = render(<HomeProgramLetter {...sparse} />);
    const main = screen.getByRole("main");
    expect(letterhead(container).textContent).toBe("Φυσιοθεραπεία Ελιά");
    expect(main).not.toHaveTextContent("Για:");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Δεξιός ώμος");
    expect(screen.queryAllByRole("link")).toHaveLength(0); // no phone, so nothing to call
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Οι τελευταίες 7 μέρες", "Σήμερα"]);
    const closing = container.querySelector("main > footer") as HTMLElement;
    expect(closing).toHaveTextContent("Το ενέκρινε");
    expect(closing).not.toHaveTextContent("ετοίμασε");
    expect(main).not.toHaveTextContent(/null|undefined/);
    await expectNoA11yViolations(container);
  });

  it("without a program title, the page title says what it is", () => {
    render(<HomeProgramLetter {...sparse} program={{ ...sparse.program, title: undefined }} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Το πρόγραμμά σας για το σπίτι");
    expect(screen.getByRole("main")).toHaveTextContent("Οι ασκήσεις και οι οδηγίες σας, όπως τις είπαμε στη συνεδρία.");
  });

  it.each([null, "  "])("treats a city or name of %j as missing", (blank) => {
    const { container } = render(<HomeProgramLetter {...full} clinicCity={blank} program={{ ...full.program, patient_first_name: blank }} />);
    expect(letterhead(container)).not.toHaveTextContent("Λεμεσός");
    expect(screen.getByRole("main")).not.toHaveTextContent("Για:");
  });

  it("shows what the diary saved, matched by the program's own number (a hidden blank row doesn't shift it)", () => {
    // full's third row is blank; here a blank row comes first, so «Διάταση γάμπας» is number 2 in the program.
    const program = { ...full.program, exercises: [{ name: " " }, ...full.program.exercises.slice(0, 2)] };
    const log = [{ day: localDay(), exercise: 2, status: "done" as const, pain: 2, note: null }];
    render(<HomeProgramLetter {...full} program={program} log={log} />);
    expect(screen.getByRole("button", { name: "Το έκανα σήμερα: Διάταση γάμπας" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Το έκανα σήμερα: Γέφυρα γλουτών" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Πόνος 2 από 10")).toBeInTheDocument();
  });

  it("says so when a program has no exercises, without a today counter", async () => {
    const { container } = render(<HomeProgramLetter {...sparse} program={{ exercises: [] }} />);
    expect(screen.getByText("Αυτό το πρόγραμμα δεν έχει ασκήσεις.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Σήμερα" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Το έκανα σήμερα/ })).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe("HomeProgramLetter on paper (printed by the clinic)", () => {
  const { token: _token, log: _log, today: _today, firstDay: _firstDay, ...letter } = full;
  const onPaper = (size: "normal" | "large" = "normal") => render(<HomeProgramLetter {...letter} paper={{ size, bar: <span>Εργαλεία</span> }} />);

  it("is shown as it will print: two weeks of boxes per exercise, no buttons, nothing that saves", async () => {
    const { container } = onPaper();
    expect(screen.getByRole("main")).toHaveAttribute("data-paper");
    expect(screen.getByText("Εργαλεία")).toBeInTheDocument(); // the clinic's bar, not the patient's «Αα»
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Οι ασκήσεις" })).toBeInTheDocument();
    for (const week of ["1η εβδομάδα", "2η εβδομάδα"])
      expect(screen.getAllByRole("list", { name: `${week}: οι μέρες` })).toHaveLength(2); // the blank row is left out
    expect(screen.queryByRole("list", { name: "3η εβδομάδα: οι μέρες" })).not.toBeInTheDocument();
    expect(screen.getByText("Σφίξτε τους γλουτούς.")).toBeInTheDocument();
    expect(screen.getByText("Τηλέφωνο: 25 000000")).toBeInTheDocument(); // the call button gives way to the number
    expect(container.querySelector("style")?.textContent).toContain("font-size:14px");
    await expectNoA11yViolations(container);
  });

  it("«Μεγάλα γράμματα» prints bigger, in one column", () => {
    const { container } = onPaper("large");
    expect(container.querySelector("style")?.textContent).toContain("font-size:18px");
    expect(container.querySelector("[class*='paper:grid']")).toBeNull();
  });
});

