// Finding a template among many: «Προτεινόμενα» for the patient's area, search, groups, and folding.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PatientProgram } from "@/app/lib/notes/schema";
import { TemplatePicker, type TemplateChoice } from "@/app/notes/record/TemplatePicker";
import { expectNoA11yViolations } from "@/app/test/axe";

const program = (n: number): PatientProgram => ({
  title: "Πρόγραμμα", patient_first_name: null, next_appointment: null,
  exercises: Array.from({ length: n }, (_, i) => ({ name: `Άσκηση ${i + 1}`, sets: null, reps: null, hold: null, frequency: null, notes: null })),
  after_exercises: [], avoid: [], contact_if: [], other: [],
});
const t = (id: string, name: string, area: string | null, uses = 0): TemplateChoice => ({ id, name, area, uses, program: program(3) });
const list = [
  t("1", "Γόνατο μετά ACL – εβδ. 1–2", "Γόνατο", 12),
  t("2", "Γόνατο – ενδυνάμωση", "Γόνατο", 5),
  t("3", "Ώμος – κινητικότητα", "Ώμος"),
  t("4", "Μέση – σταθεροποίηση", "Μέση"),
  t("5", "Αστράγαλος – ισορροπία", "Αστράγαλος"),
  t("6", "Γενικό", null),
];

describe("TemplatePicker", () => {
  it("«Προτεινόμενα» for the area of the last note, most used first, and every template below by area", async () => {
    const { container } = render(<TemplatePicker templates={list} chosenId={null} patientArea="Αριστερό γόνατο" disabled={false} onPick={vi.fn()} />);
    const suggested = screen.getByRole("region", { name: /Προτεινόμενα · Γόνατο/ });
    expect(suggested).toHaveTextContent("από την τελευταία σας σημείωση");
    expect(within(suggested).getAllByRole("button").map((b) => b.textContent)).toEqual([
      expect.stringContaining("ACL"),
      expect.stringContaining("ενδυνάμωση"),
    ]);
    expect(within(suggested).getAllByRole("button")[0]).toHaveTextContent("3 ασκήσεις · ×12");
    expect(screen.getByRole("region", { name: "Ώμος" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Χωρίς περιοχή" })).toHaveTextContent("Γενικό");
    await expectNoA11yViolations(container);
  });

  it("a new patient (no note): no «Προτεινόμενα»", () => {
    render(<TemplatePicker templates={list} chosenId={null} patientArea={null} disabled={false} onPick={vi.fn()} />);
    expect(screen.queryByRole("region", { name: /Προτεινόμενα/ })).toBeNull();
  });

  it("the search narrows the list as you type, without accents", async () => {
    render(<TemplatePicker templates={list} chosenId={null} patientArea={null} disabled={false} onPick={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Αναζήτηση"), "ωμος");
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Ώμος – κινητικότητα/ })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Αναζήτηση"));
    await userEvent.type(screen.getByLabelText("Αναζήτηση"), "καρπός");
    expect(screen.getByRole("status")).toHaveTextContent("Κανένα πρότυπο δεν ταιριάζει με «καρπός».");
  });

  it("a chosen template folds the list; «Άλλο πρότυπο» opens it again, «Χωρίς πρότυπο» drops it", async () => {
    const onPick = vi.fn();
    render(<TemplatePicker templates={list} chosenId="3" patientArea={null} disabled={false} onPick={onPick} />);
    expect(screen.getByText("Ώμος – κινητικότητα")).toBeInTheDocument();
    expect(screen.queryByLabelText("Αναζήτηση")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Άλλο πρότυπο" }));
    expect(screen.getByRole("button", { name: /Ώμος – κινητικότητα/, pressed: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Μέση/ }));
    expect(onPick).toHaveBeenCalledWith(list[3]);
    await userEvent.click(screen.getByRole("button", { name: "Χωρίς πρότυπο" }));
    expect(onPick).toHaveBeenLastCalledWith(null);
  });
});
