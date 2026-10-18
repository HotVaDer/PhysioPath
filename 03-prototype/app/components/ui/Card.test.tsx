import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@/app/components/ui/Card";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("Card", () => {
  it("with a title it's a region named by its heading", () => {
    render(<Card title="Ασκήσεις">περιεχόμενο</Card>);
    expect(screen.getByRole("region", { name: "Ασκήσεις" })).toHaveTextContent("περιεχόμενο");
    expect(screen.getByRole("heading", { level: 2, name: "Ασκήσεις" })).toBeInTheDocument();
  });

  it("uses the heading level the page asks for", () => {
    render(
      <Card title="Οδηγίες" headingLevel={3}>
        …
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Οδηγίες" })).toBeInTheDocument();
  });

  it("without a title it's just a box", () => {
    render(<Card>απλό</Card>);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<Card title="Ασκήσεις">περιεχόμενο</Card>);
    await expectNoA11yViolations(container);
  });
});
