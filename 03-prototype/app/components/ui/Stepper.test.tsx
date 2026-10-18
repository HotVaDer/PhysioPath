import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Stepper } from "@/app/components/ui/Stepper";
import { expectNoA11yViolations } from "@/app/test/axe";

const STEPS = ["Ηχογράφηση", "Έλεγχος", "Έγκριση"];

describe("Stepper", () => {
  it("says which step this is in words", () => {
    render(<Stepper steps={STEPS} current={1} />);
    expect(screen.getByText("Βήμα 2 από 3")).toBeInTheDocument();
  });

  it("marks the current step and says which are done", () => {
    render(<Stepper steps={STEPS} current={1} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Ηχογράφηση (ολοκληρώθηκε)");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[1]).not.toHaveTextContent("ολοκληρώθηκε");
    expect(items[2]).not.toHaveAttribute("aria-current");
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<Stepper steps={STEPS} current={2} />);
    await expectNoA11yViolations(container);
  });
});
