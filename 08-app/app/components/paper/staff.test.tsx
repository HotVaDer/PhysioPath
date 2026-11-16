import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Stamp } from "@/app/components/paper/Notes";
import { PartHeading, Slip, SlipTitle, StaffSheet } from "@/app/components/paper/StaffSheet";
import { expectNoA11yViolations } from "@/app/test/axe";

describe("StaffSheet", () => {
  it("shows the physio both tabs and marks the current one", async () => {
    const { container } = render(
      <StaffSheet profile={{ role: "physio", full_name: "Μαρία" }} current="new" title="ΦΩΝΗΤΙΚΗ ΣΗΜΕΙΩΣΗ" page={{ n: 1, of: 2 }}>
        <PartHeading id="a" mark="Α.">
          Ασθενής
        </PartHeading>
        <Slip tint="yellow" labelledBy="q">
          <SlipTitle id="q">2 ΕΡΩΤΗΣΕΙΣ ΓΙΑ ΕΣΑΣ</SlipTitle>
          <p>Πόσα σετ;</p>
        </Slip>
      </StaffSheet>,
    );
    expect(screen.getByRole("link", { name: "Νέα σημείωση" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Αίθουσα" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("region", { name: "2 ΕΡΩΤΗΣΕΙΣ ΓΙΑ ΕΣΑΣ" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("gives an assistant no «Νέα σημείωση» tab", () => {
    render(
      <StaffSheet profile={{ role: "assistant", full_name: "Άννα" }} current="board" title="Κλινική">
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.queryByRole("link", { name: "Νέα σημείωση" })).toBeNull();
    expect(screen.getByText("Άννα · Βοηθός")).toBeInTheDocument();
  });
});

describe("Stamp", () => {
  it("can say «ΕΓΚΡΙΘΗΚΕ» and stays hidden from screen readers", () => {
    const { container } = render(<Stamp word="ΕΓΚΡΙΘΗΚΕ" top="ΜΑΡΙΑ" date="16 ΝΟΕ 2026" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("ΕΓΚΡΙΘΗΚΕ");
  });
});
