import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// «Αποσύνδεση» posts to a server action (server-only code); here a plain button stands in for it.
vi.mock("@/app/components/paper/SignOut", () => ({
  SignOut: () => (
    <form>
      <button type="submit">Αποσύνδεση</button>
    </form>
  ),
}));

import { Panel, PanelTitle, PartTitle, StaffSheet } from "@/app/components/paper/StaffSheet";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("StaffSheet", () => {
  it("shows the physio both links, marks the current one, and the step in words", async () => {
    const { container } = render(
      <StaffSheet profile={{ role: "physio", full_name: "Μαρία" }} current="new" step={{ n: 1, of: 2 }}>
        <PartTitle id="a">Ηχογράφηση</PartTitle>
        <Panel tint="yellow" labelledBy="q">
          <PanelTitle id="q">2 ερωτήσεις για εσάς</PanelTitle>
          <p>Πόσα σετ;</p>
        </Panel>
      </StaffSheet>,
    );
    expect(screen.getByRole("link", { name: "Νέα συνεδρία" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Αίθουσα" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Βήμα 1 από 2")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "2 ερωτήσεις για εσάς" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Αποσύνδεση" })).toBeInTheDocument();
    // No paperwork left: no page numbers or Roman-numeral parts.
    expect(container).not.toHaveTextContent(/Σελ\.|ΙΙ\./);
    await expectNoA11yViolations(container);
  });

  it("shows the open clinic with «Αλλαγή κλινικής» to the list of clinics", async () => {
    const { container } = render(
      <StaffSheet profile={{ role: "owner", full_name: "Μαρία", clinic_name: "Φυσιοθεραπεία Λεμεσού" }} current="board">
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.getByText("Φυσιοθεραπεία Λεμεσού")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Αλλαγή κλινικής" })).toHaveAttribute("href", "/clinics");
    await expectNoA11yViolations(container);
  });

  it("gives an assistant no «Νέα συνεδρία» link", () => {
    render(
      <StaffSheet profile={{ role: "assistant", full_name: "Άννα" }} current="board">
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.queryByRole("link", { name: "Νέα συνεδρία" })).toBeNull();
    expect(screen.getByText(/Άννα/)).toHaveTextContent("Άννα · Βοηθός");
  });
});
