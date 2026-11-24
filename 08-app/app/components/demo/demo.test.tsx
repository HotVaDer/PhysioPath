// The demo clinic's strip (every page) and «Δοκιμάστε» (the board), and the staff frame around them.
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The buttons post to server actions (server-only code); plain functions stand in for them here.
vi.mock("@/app/lib/demo/actions", () => ({ leaveDemo: vi.fn(), refillDemo: vi.fn() }));
vi.mock("@/app/lib/onboarding/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/app/lib/board/actions", () => ({ finishCard: vi.fn(), seeCall: vi.fn() }));

import { DemoStrip } from "@/app/components/demo/DemoStrip";
import { DemoGuide } from "@/app/components/demo/DemoGuide";
import { BOARD_EVENT } from "@/app/components/board/RoomBoard";
import type { BoardCard } from "@/app/lib/board/board";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { expectNoA11yViolations } from "@/app/test/axe";

const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000 - 60_000).toISOString();

describe("DemoStrip", () => {
  it("says it is a demo with fictional patients, when it goes, and offers a clinic of their own", async () => {
    const { container } = render(<DemoStrip demo={{ expiresAt: inDays(7), lang: "el" }} />);
    const strip = screen.getByRole("complementary", { name: "Κλινική δοκιμής" });
    expect(strip).toHaveTextContent("Φανταστικοί ασθενείς · διαγράφεται σε 7 μέρες");
    expect(within(strip).getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toBeInTheDocument();
    // Leaving ends the demo: the button's title says so.
    expect(within(strip).getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toHaveAttribute("title", expect.stringContaining("Η δοκιμή κλείνει"));
    await expectNoA11yViolations(container);
  });

  it("says what is left of the 5 programs and 5 recordings, pink when something ran out", () => {
    const { rerender } = render(<DemoStrip demo={{ expiresAt: inDays(7), lang: "el", left: { of: 5, generate: 4, transcribe: 5 } }} />);
    const left = screen.getByText("Μένουν 4 από 5 προγράμματα και 5 από 5 ηχογραφήσεις");
    expect(left).not.toHaveClass("bg-tab-pink");
    rerender(<DemoStrip demo={{ expiresAt: inDays(7), lang: "el", left: { of: 5, generate: 0, transcribe: 2 } }} />);
    expect(screen.getByText("Μένουν 0 από 5 προγράμματα και 2 από 5 ηχογραφήσεις")).toHaveClass("bg-tab-pink");
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

const cardOf = (id: string, label: string, call: BoardCard["call"]): BoardCard => ({
  id, programId: `p-${id}`, roomId: "r1", slot: 1, label, title: "Πρόγραμμα", exercises: ["Άσκηση"],
  setsTarget: [3], setsDone: [1], current: 0, call, createdAt: new Date().toISOString(),
});
const andreas = cardOf("a1", "Ανδρέας Μ.", null);
let clinic = 0;
const guide = (over: Partial<React.ComponentProps<typeof DemoGuide>> = {}) => (
  <DemoGuide lang="el" clinicId={`c-${++clinic}`} initialCards={[andreas]} patientCard={{ id: "a1", href: "/s/tok" }} lastProgramAt={inDays(-2)} {...over} />
);
const sendBoard = (cards: BoardCard[]) => act(() => { window.dispatchEvent(new CustomEvent(BOARD_EVENT, { detail: cards })); });

describe("DemoGuide", () => {
  it("starts with a short introduction of PhysioPath and «Ξεκινάμε»", async () => {
    const { container } = render(guide());
    const tour = screen.getByRole("region", { name: "Καλώς ήρθατε στο PhysioPath" });
    expect(tour).toHaveTextContent("εργαλείο για φυσιοθεραπευτές");
    expect(within(tour).getByRole("button", { name: /Ξεκινάμε/ })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("step 1 is a session by voice", async () => {
    render(guide());
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    const tour = screen.getByRole("region", { name: /Μιλάτε/ });
    expect(tour).toHaveTextContent("Βήμα 1 από 3");
    expect(within(tour).getByRole("link", { name: /Νέα συνεδρία με φωνή/ })).toHaveAttribute("href", "/notes/new");
  });

  it("after a program of their own: be the patient; a new call on the board leads to «Το είδα»; then the end", async () => {
    const props = { clinicId: `c-${++clinic}` };
    const { rerender } = render(guide(props));
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    // the visitor approves a program: the board now has a newer one than the start of step 1
    rerender(guide({ ...props, lastProgramAt: new Date(Date.now() + 1000).toISOString() }));
    // step 1 is done (a program was approved): step 2 opens the patient's phone screen
    const two = screen.getByRole("region", { name: /Γίνετε ο ασθενής/ });
    expect(within(two).getByRole("link", { name: /Άνοιξε την οθόνη του ασθενή/ })).toHaveAttribute("href", "/s/tok");
    // the patient presses «Πονάω» on the phone: the board gets a new call
    sendBoard([{ ...andreas, call: { reason: "pain", at: new Date(Date.now() + 1000).toISOString() } }]);
    const three = screen.getByRole("region", { name: /Η αίθουσα σάς ειδοποιεί/ });
    expect(within(three).getByRole("link", { name: /Δείξε μου την κάρτα/ })).toHaveAttribute("href", "#patient-a1");
    // «Το είδα»: the call is gone
    sendBoard([andreas]);
    expect(screen.getByRole("region", { name: /Αυτό είναι το PhysioPath/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Θέλω τη δική μου κλινική/ })).toBeInTheDocument();
  });

  it("«Παράλειψη» moves on, and an empty board offers to fill the room again", async () => {
    render(guide({ initialCards: [], patientCard: null }));
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    await userEvent.click(screen.getByRole("button", { name: "Παράλειψη" }));
    expect(screen.getByRole("region", { name: /Γίνετε ο ασθενής/ })).toHaveTextContent("Βήμα 2 από 3");
    expect(screen.getByRole("button", { name: "Ξαναγέμισε την αίθουσα" })).toBeInTheDocument();
  });

  it("«Από την αρχή» goes back to the introduction, and step 1 waits for a new program", async () => {
    // a program the visitor made in an earlier round of the tour
    render(guide({ lastProgramAt: new Date(Date.now() - 60_000).toISOString() }));
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    await userEvent.click(screen.getByRole("button", { name: "Παράλειψη" }));
    expect(screen.getByRole("region", { name: /Γίνετε ο ασθενής/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Από την αρχή" }));
    expect(screen.getByRole("region", { name: "Καλώς ήρθατε στο PhysioPath" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ξεκινάμε/ }));
    // not skipped to step 2 by the old program
    expect(screen.getByRole("region", { name: /Μιλάτε/ })).toHaveTextContent("Βήμα 1 από 3");
  });

  it("in English", () => {
    render(guide({ lang: "en" }));
    expect(screen.getByRole("region", { name: "Welcome to PhysioPath" })).toHaveTextContent("tool for physiotherapists");
  });
});

describe("StaffSheet in a demo clinic", () => {
  it("shows the strip on top, «Έξοδος» instead of «Αποσύνδεση», and no clinic switcher or fake user", () => {
    render(
      <StaffSheet profile={{ role: "owner", full_name: "Φυσιοθεραπευτής (δοκιμή)", demo: { expiresAt: inDays(7), lang: "el" } }}>
        <p>…</p>
      </StaffSheet>,
    );
    expect(screen.getByRole("complementary", { name: "Κλινική δοκιμής" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Έξοδος" })).toBeInTheDocument();
    expect(screen.queryByText(/Υπεύθυνη\/ος/)).toBeNull();
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
