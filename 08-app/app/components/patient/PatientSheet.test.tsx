import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatientSheet } from "@/app/components/patient/PatientSheet";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("PatientSheet", () => {
  it("is one main landmark with the letterhead at the top, and no bar or footer unless given", async () => {
    const { container } = render(
      <PatientSheet letterhead={<p>Φυσιοθεραπεία Ελιά</p>}>
        <h1>Το πρόγραμμά σας για το σπίτι</h1>
      </PatientSheet>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main");
    expect(main.firstElementChild).toHaveTextContent("Φυσιοθεραπεία Ελιά");
    // Only the letterhead's header (no bar). Not by role: Testing Library calls any <header> "banner",
    // even one inside <main>, which isn't a landmark (axe below agrees).
    expect(container.querySelectorAll("header")).toHaveLength(1);
    expect(main.querySelector("footer")).toBeNull();
    await expectNoA11yViolations(container);
  });

  it("puts the bar above the sheet (left out of print) and the footer at the bottom of the sheet", async () => {
    const { container } = render(
      <PatientSheet letterhead={<p>Φυσιοθεραπεία Ελιά</p>} bar={<button type="button">Αα</button>} footer={<p>Το ενέκρινε η φυσιοθεραπεύτρια.</p>}>
        <h1>Το πρόγραμμά σας για το σπίτι</h1>
      </PatientSheet>,
    );
    const bar = screen.getByRole("button", { name: "Αα" }).closest("header");
    expect(bar).toHaveClass("print:hidden"); // jsdom can't print; the class is what hides it on paper
    expect(screen.getByRole("main")).not.toContainElement(bar);
    expect(screen.getByRole("main").lastElementChild).toHaveTextContent("Το ενέκρινε η φυσιοθεραπεύτρια.");
    await expectNoA11yViolations(container);
  });
});
