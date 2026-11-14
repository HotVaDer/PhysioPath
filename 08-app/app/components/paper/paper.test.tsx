import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BinderTabs } from "@/app/components/paper/BinderTabs";
import { SubmitButton } from "@/app/components/paper/Buttons";
import { LineField, LineSelect } from "@/app/components/paper/LineField";
import { FormAlert, Stamp } from "@/app/components/paper/Notes";
import { SectionHeading, Sheet } from "@/app/components/paper/Sheet";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("LineField", () => {
  it("ties the hint and the error to the field", async () => {
    const { container } = render(
      <LineField id="phone" name="phone" label="Τηλέφωνο" number="1.3" hint="Το βλέπει ο ασθενής." error="Μόνο ψηφία." />,
    );
    const input = screen.getByLabelText("1.3 Τηλέφωνο");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Το βλέπει ο ασθενής. Μόνο ψηφία.");
    await expectNoA11yViolations(container);
  });

  it("is not marked invalid without an error", () => {
    render(<LineField id="name" name="name" label="Επωνυμία" />);
    expect(screen.getByLabelText("Επωνυμία")).not.toHaveAttribute("aria-invalid");
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

describe("BinderTabs", () => {
  it("marks the current section and says which are done", async () => {
    const { container } = render(<BinderTabs current="rooms" done={{ you: true, clinic: true }} />);
    const nav = screen.getByRole("navigation", { name: "Ενότητες του δελτίου" });
    expect(screen.getByRole("link", { current: "step" })).toHaveTextContent("Χώροι");
    expect(screen.getByRole("link", { name: /Κλινική/ })).toHaveTextContent("(έγινε)");
    expect(screen.getByRole("link", { name: /Ομάδα/ })).not.toHaveTextContent("(έγινε)");
    expect(nav).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe("Sheet", () => {
  it("has one main landmark and the page number", async () => {
    const { container } = render(
      <Sheet page={{ n: 2, of: 5 }}>
        <SectionHeading mark="§1" title="Στοιχεία κλινικής" note="Τα βλέπουν οι ασθενείς." />
      </Sheet>,
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("§1 Στοιχεία κλινικής");
    expect(screen.getByText(/Σελ\./)).toHaveTextContent("Σελ. 2 / 5");
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
