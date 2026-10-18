import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Alert } from "@/app/components/ui/Alert";
import { Button } from "@/app/components/ui/Button";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("Alert", () => {
  it("errors are read out at once (role=alert)", () => {
    render(
      <Alert tone="danger" title="Δεν ήταν δυνατή η μεταγραφή">
        Ηχογραφήστε ξανά, λίγο πιο κοντά στο μικρόφωνο.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Δεν ήταν δυνατή η μεταγραφή");
    expect(screen.getByRole("alert")).toHaveTextContent("πιο κοντά στο μικρόφωνο");
  });

  it.each(["info", "success", "warning"] as const)("%s messages are read out politely (role=status)", (tone) => {
    render(<Alert tone={tone} title="Μήνυμα" />);
    expect(screen.getByRole("status")).toHaveTextContent("Μήνυμα");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can carry an action, e.g. undo", async () => {
    const onUndo = vi.fn();
    render(<Alert title="Η άσκηση αφαιρέθηκε" action={<Button onClick={onUndo}>Αναίρεση</Button>} />);
    await userEvent.click(screen.getByRole("button", { name: "Αναίρεση" }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("has no accessibility problems", async () => {
    const { container } = render(
      <div>
        <Alert tone="danger" title="Σφάλμα" />
        <Alert tone="warning" title="Προσοχή" action={<Button>Αναίρεση</Button>} />
        <Alert tone="success" title="Εγκρίθηκε" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
