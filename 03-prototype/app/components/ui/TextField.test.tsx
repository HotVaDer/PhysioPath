import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MISSING_TEXT } from "@/app/components/ui/Field";
import { TextField } from "@/app/components/ui/TextField";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("TextField", () => {
  it("is linked to its visible label", () => {
    render(<TextField label="Τίτλος" />);
    expect(screen.getByLabelText("Τίτλος")).toHaveAttribute("type", "text");
  });

  it("reads the hint together with the field", () => {
    render(<TextField label="Σετ" hint="Μόνο αριθμός." />);
    expect(screen.getByLabelText("Σετ")).toHaveAccessibleDescription("Μόνο αριθμός.");
  });

  it("says in words when a value is missing, not only with colour", () => {
    render(<TextField label="Επαναλήψεις" missing />);
    expect(screen.getByText(MISSING_TEXT)).toBeVisible();
    expect(screen.getByLabelText("Επαναλήψεις")).toHaveAccessibleDescription(MISSING_TEXT);
  });

  it("marks errors as invalid and keeps the message linked", () => {
    render(<TextField label="Σετ" hint="Μόνο αριθμός." error="Γράψτε έναν αριθμό, π.χ. 3." />);
    const input = screen.getByLabelText("Σετ");
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Μόνο αριθμός. Γράψτε έναν αριθμό, π.χ. 3.");
  });

  it("passes typing to onChange", async () => {
    const onChange = vi.fn();
    render(<TextField label="Τίτλος" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Τίτλος"), "Γόνατο");
    expect(onChange).toHaveBeenCalledTimes(6);
    expect(screen.getByLabelText("Τίτλος")).toHaveValue("Γόνατο");
  });

  it("has no accessibility problems in any state", async () => {
    const { container } = render(
      <form>
        <TextField label="Τίτλος" hint="Σύντομος." />
        <TextField label="Σετ" inputMode="numeric" missing />
        <TextField label="Επαναλήψεις" error="Λάθος τιμή." />
      </form>,
    );
    await expectNoA11yViolations(container);
  });
});
