import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimingStrip } from "@/app/components/ui/TimingStrip";
import { expectNoA11yViolations } from "@/app/test/axe";

const ITEMS = [
  { label: "Μεταγραφή", value: "1,8 δευτ." },
  { label: "Σύνολο", value: "17,5 δευτ.", highlight: true },
];

describe("TimingStrip", () => {
  it("pairs each label with its value", () => {
    render(<TimingStrip items={ITEMS} />);
    const terms = screen.getAllByRole("term").map((t) => t.textContent);
    const values = screen.getAllByRole("definition").map((d) => d.textContent);
    expect(terms).toEqual(["Μεταγραφή", "Σύνολο"]);
    expect(values).toEqual(["1,8 δευτ.", "17,5 δευτ."]);
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<TimingStrip items={ITEMS} />);
    await expectNoA11yViolations(container);
  });
});
