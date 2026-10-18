import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "@/app/components/ui/Spinner";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("Spinner", () => {
  it("says in words what is happening (role=status)", () => {
    render(<Spinner label="Γράφεται το πρόγραμμα…">Συνήθως 5–15 δευτερόλεπτα.</Spinner>);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Γράφεται το πρόγραμμα…");
    expect(status).toHaveTextContent("Συνήθως 5–15 δευτερόλεπτα.");
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<Spinner label="Μεταγραφή…" />);
    await expectNoA11yViolations(container);
  });
});
