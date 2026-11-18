import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RoomBoard } from "@/app/components/board/RoomBoard";
import type { BoardCard, BoardData } from "@/app/lib/board/board";
import { expectNoA11yViolations } from "@/app/test/axe";

const actions = vi.hoisted(() => ({
  seeCall: vi.fn(async () => ({ ok: true as const })),
  finishCard: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("@/app/lib/board/actions", () => actions);
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const ROOM = "11111111-2222-4333-8444-555555555555";
const card = (over: Partial<BoardCard>): BoardCard => ({
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  programId: "bbbbbbbb-0000-4000-8000-000000000001",
  roomId: ROOM,
  slot: 1,
  label: "Γιώργος Δ.",
  title: "Αριστερό γόνατο",
  exercises: ["Γέφυρα", "Καθίσματα", "Βάδιση"],
  setsTarget: [3, 3, 1],
  setsDone: [3, 1, 0],
  current: 1,
  call: null,
  createdAt: new Date().toISOString(),
  ...over,
});
const board = (cards: BoardCard[]): BoardData => ({ rooms: [{ id: ROOM, name: "Αίθουσα 1", beds: 2, stations: 1 }], cards });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RoomBoard", () => {
  it("one card per patient: place, name, program, state, exercise boxes, the exercise now", () => {
    render(<RoomBoard initial={board([card({})])} />);
    expect(screen.getByRole("heading", { level: 1, name: "Η αίθουσα" })).toBeInTheDocument();
    const cardEl = screen.getByRole("article", { name: "Γιώργος Δ." });
    expect(within(cardEl).getByText("Αίθουσα 1 · Κρεβάτι 1")).toBeInTheDocument();
    expect(within(cardEl).getByText("Αριστερό γόνατο")).toBeInTheDocument();
    expect(within(cardEl).getByText("Ασκείται")).toBeInTheDocument();
    expect(within(cardEl).getByRole("list", { name: "Ασκήσεις: 1 έγιναν, τώρα η 2 από 3" })).toBeInTheDocument();
    expect(within(cardEl).getByText("Καθίσματα")).toBeInTheDocument();
    expect(within(cardEl).getByRole("img", { name: "Σετ 2 από 3" })).toBeInTheDocument();
    expect(screen.getByText(/Ελεύθερες θέσεις: 2\./)).toBeInTheDocument();
  });

  it("the summary counts, and who needs you in the order they called", () => {
    const at = new Date(Date.now() - 3 * 60_000).toISOString();
    render(
      <RoomBoard
        initial={board([
          card({ call: { reason: "pain", at } }),
          card({ id: "aaaaaaaa-0000-4000-8000-000000000002", slot: 2, label: "Μαρία", call: { reason: "question", at: new Date().toISOString() } }),
          card({ id: "aaaaaaaa-0000-4000-8000-000000000003", slot: 3, label: "Ελένη", setsDone: [3, 3, 1] }),
        ])}
      />,
    );
    const summary = screen.getByRole("region", { name: "Σύνοψη αίθουσας" });
    const value = (label: string) => within(summary).getByText(label).nextElementSibling?.textContent ?? within(summary).getByText(label).previousElementSibling?.textContent;
    expect(value("Στην αίθουσα")).toBe("3");
    expect(value("Χρειάζονται εσάς")).toBe("2");
    expect(value("Τελείωσαν")).toBe("1");
    const waiting = within(summary).getAllByRole("listitem").map((li) => li.textContent);
    expect(waiting[0]).toMatch(/Γιώργος Δ\. · Πόνος.*πριν από 3 λεπτά/);
    expect(waiting[1]).toMatch(/Μαρία · Απορία.*μόλις τώρα/);
  });

  it("«Το είδα» clears only the call that was seen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(board([card({})])), { status: 200 })));
    const at = new Date(Date.now() - 2 * 60_000).toISOString();
    render(<RoomBoard initial={board([card({ call: { reason: "pain", at } })])} />);
    const cardEl = screen.getByRole("article", { name: "Γιώργος Δ." });
    expect(within(cardEl).getByText("Χρειάζεται εσάς · Πόνος")).toBeInTheDocument();
    await userEvent.click(within(cardEl).getByRole("button", { name: "Το είδα" }));
    expect(actions.seeCall).toHaveBeenCalledWith("aaaaaaaa-0000-4000-8000-000000000001", at);
  });

  it("«Ολοκλήρωση» asks first, then closes the card", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(board([])), { status: 200 })));
    render(<RoomBoard initial={board([card({ setsDone: [3, 3, 1] })])} />);
    expect(screen.getByText("3 από 3 έγιναν")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ολοκλήρωση για Γιώργος Δ." }));
    expect(actions.finishCard).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ναι" }));
    expect(actions.finishCard).toHaveBeenCalledWith("aaaaaaaa-0000-4000-8000-000000000001");
  });

  it("a card whose room was deleted says «Χωρίς θέση»; no patients says so", () => {
    const { unmount } = render(<RoomBoard initial={board([card({ roomId: null, slot: null })])} />);
    expect(within(screen.getByRole("article", { name: "Γιώργος Δ." })).getByText("Χωρίς θέση")).toBeInTheDocument();
    unmount();
    render(<RoomBoard initial={board([])} />);
    expect(screen.getByText(/Κανένας ασθενής στην αίθουσα/)).toBeInTheDocument();
  });

  it("has no accessibility problems", async () => {
    const { container } = render(
      <RoomBoard initial={board([card({ call: { reason: "pain", at: new Date().toISOString() } }), card({ id: "aaaaaaaa-0000-4000-8000-000000000002", slot: 2 })])} />,
    );
    await expectNoA11yViolations(container);
  });
});
