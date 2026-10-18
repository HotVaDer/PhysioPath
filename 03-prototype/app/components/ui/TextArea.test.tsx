import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MISSING_TEXT } from "@/app/components/ui/Field";
import { TextArea } from "@/app/components/ui/TextArea";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("TextArea", () => {
  it("is a multi-line field linked to its label and hint", () => {
    render(<TextArea label="Κείμενο" hint="Μπορείτε να το διορθώσετε." />);
    const field = screen.getByRole("textbox", { name: "Κείμενο" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAccessibleDescription("Μπορείτε να το διορθώσετε.");
  });

  it("keeps new lines as typed", async () => {
    render(<TextArea label="Κείμενο" />);
    await userEvent.type(screen.getByLabelText("Κείμενο"), "πρώτη{Enter}δεύτερη");
    expect(screen.getByLabelText("Κείμενο")).toHaveValue("πρώτη\nδεύτερη");
  });

  it("shows the missing message", () => {
    render(<TextArea label="Πλάνο" missing />);
    expect(screen.getByLabelText("Πλάνο")).toHaveAccessibleDescription(MISSING_TEXT);
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<TextArea label="Κείμενο" hint="Βοήθεια." error="Λείπει το κείμενο." />);
    await expectNoA11yViolations(container);
  });
});
