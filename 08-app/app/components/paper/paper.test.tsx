import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SubmitButton } from "@/app/components/paper/Buttons";
import { LineField, LineSelect } from "@/app/components/paper/LineField";
import { FormAlert, Stamp } from "@/app/components/paper/Notes";
import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("LineField", () => {
  it("puts the label first and ties the hint and the error to the field", async () => {
    const { container } = render(
      <LineField id="phone" name="phone" label="Τηλέφωνο" hint="Το βλέπει ο ασθενής." error="Μόνο ψηφία." />,
    );
    const input = screen.getByLabelText("Τηλέφωνο");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Το βλέπει ο ασθενής. Πρόβλημα: Μόνο ψηφία.");
    // Label, then hint, then the box: the order people read in.
    const order = Array.from(container.querySelectorAll("label, p, input")).map((el) => el.tagName);
    expect(order).toEqual(["LABEL", "P", "INPUT", "P"]);
    await expectNoA11yViolations(container);
  });

  it("is not marked invalid without an error", () => {
    render(<LineField id="name" name="name" label="Όνομα κλινικής" />);
    expect(screen.getByLabelText("Όνομα κλινικής")).not.toHaveAttribute("aria-invalid");
  });

  it("works as a select too", async () => {
    const { container } = render(
      <LineSelect id="city" name="city" label="Πόλη" defaultValue="Λεμεσός">
        <option>Λευκωσία</option>
        <option>Λεμεσός</option>
      </LineSelect>,
    );
    expect(screen.getByLabelText("Πόλη")).toHaveValue("Λεμεσός");
    await expectNoA11yViolations(container);
  });
});

describe("Sheet", () => {
  it("has one main landmark and says the step in words", async () => {
    const { container } = render(
      <Sheet step={{ n: 2, of: 3 }}>
        <SectionHeading title="Η κλινική σας" note="Τα βλέπουν οι ασθενείς." />
      </Sheet>,
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Η κλινική σας");
    expect(screen.getByText(/^Βήμα/)).toHaveTextContent("Βήμα 2 από 3");
    expect(container).not.toHaveTextContent(/§|Σελ\./);
    await expectNoA11yViolations(container);
  });
});

describe("small pieces", () => {
  it("FormAlert is read out at once, and shows nothing when empty", () => {
    const { rerender } = render(<FormAlert />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<FormAlert>Κάτι πήγε στραβά.</FormAlert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Κάτι πήγε στραβά.");
  });

  it("the stamp is decoration (hidden from screen readers)", () => {
    const { container } = render(<Stamp date="14 ΝΟΕ 2026" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("the submit button is a real submit button", async () => {
    const { container } = render(
      <form aria-label="Δοκιμή">
        <SubmitButton pending="Αποθήκευση…">Συνέχεια</SubmitButton>
      </form>,
    );
    expect(screen.getByRole("button", { name: "Συνέχεια" })).toHaveAttribute("type", "submit");
    await expectNoA11yViolations(container);
  });
});
