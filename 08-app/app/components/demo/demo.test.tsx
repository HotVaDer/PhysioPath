// The demo clinic's strip (every page) and «Δοκιμάστε» (the board), and the staff frame around them.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The buttons post to server actions (server-only code); plain functions stand in for them here.
vi.mock("@/app/lib/demo/actions", () => ({ leaveDemo: vi.fn(), refillDemo: vi.fn() }));
vi.mock("@/app/lib/onboarding/actions", () => ({ signOut: vi.fn() }));

import { DemoStrip } from "@/app/components/demo/DemoStrip";
import { DemoTips } from "@/app/components/demo/DemoTips";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { expectNoA11yViolations } from "@/app/test/axe";

const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000 - 60_000).toISOString();

describe("DemoStrip", () => {
  it("says it is a demo with fictional patients, when it goes, and offers a clinic of their own", async () => {
    const { container } = render(<DemoStrip demo={{ expiresAt: inDays(7), lang: "el" }} />);
    const strip = screen.getByRole("complementary", { name: "Κλινική δοκιμής" });
    expect(strip).toHaveTextContent("Φανταστικοί ασθενείς · διαγράφεται σε 7 μέρες");
    expect(within(strip).getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("in English, and says the app's screens are still Greek", () => {
    render(<DemoStrip demo={{ expiresAt: inDays(1), lang: "en" }} />);
    const strip = screen.getByRole("complementary", { name: "Demo clinic" });
    expect(strip).toHaveAttribute("lang", "en");
    expect(strip).toHaveTextContent("deleted in 1 day");
    expect(strip).toHaveTextContent("screens are in Greek");
    expect(within(strip).getByRole("button", { name: /I want my own clinic/ })).toBeInTheDocument();
  });
});

describe("DemoTips", () => {
  it("three things to try, and no refill while the board has cards", async () => {
    const { container } = render(<DemoTips lang="el" empty={false} />);
    const tips = screen.getByRole("region", { name: "Δοκιμάστε" });
    expect(within(tips).getAllByRole("listitem")).toHaveLength(3);
    expect(tips).toHaveTextContent("Το είδα");
    expect(screen.queryByRole("button", { name: "Ξαναγέμισε την αίθουσα" })).toBeNull();
    await expectNoA11yViolations(container);
  });

  it("an empty board: «Ξαναγέμισε την αίθουσα»", () => {
    render(<DemoTips lang="el" empty />);
    expect(screen.getByRole("button", { name: "Ξαναγέμισε την αίθουσα" })).toBeInTheDocument();
  });

  it("in English", () => {
    render(<DemoTips lang="en" empty />);
    expect(screen.getByRole("region", { name: "Try this" })).toHaveTextContent("George is in pain");
    expect(screen.getByRole("button", { name: "Fill the room again" })).toBeInTheDocument();
  });
});

describe("StaffSheet in a demo clinic", () => {
  it("shows the strip on top and «Έξοδος από τη δοκιμή» instead of «Αποσύνδεση»", () => {
    render(
      <StaffSheet profile={{ role: "owner", full_name: "Φυσιοθεραπευτής (δοκιμή)", demo: { expiresAt: inDays(7), lang: "el" } }}>
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.getByRole("complementary", { name: "Κλινική δοκιμής" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Έξοδος από τη δοκιμή" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Αποσύνδεση" })).toBeNull();
  });

  it("a real clinic: no strip, «Αποσύνδεση» as before", () => {
    render(
      <StaffSheet profile={{ role: "owner", full_name: "Μαρία", demo: null }}>
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.getByRole("button", { name: "Αποσύνδεση" })).toBeInTheDocument();
  });
});
