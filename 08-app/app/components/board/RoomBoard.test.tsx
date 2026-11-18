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
  it("shows every bed and station: free, or the patient with the exercise they are on", () => {
    render(<RoomBoard initial={board([card({})])} />);
    expect(screen.getByRole("heading", { name: "Αίθουσα 1" })).toBeInTheDocument();
    const bed = screen.getByRole("article", { name: "Κρεβάτι 1: Γιώργος Δ." });
    expect(within(bed).getByText("Καθίσματα")).toBeInTheDocument();
    expect(within(bed).getByText(/Σετ 2 από 3/)).toBeInTheDocument();
    expect(within(bed).getByText("1 από 3 ασκήσεις")).toBeInTheDocument();
    expect(screen.getByText("Κρεβάτι 2 · ελεύθερο")).toBeInTheDocument();
    expect(screen.getByText("Θέση 1 · ελεύθερο")).toBeInTheDocument();
    expect(screen.getByText("1 ασθενής · κανείς δεν σας καλεί")).toBeInTheDocument();
  });

  it("a call: words and a sign, the waiting order, and «Το είδα» clears only that call", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(board([card({})])), { status: 200 })));
    const at = new Date(Date.now() - 3 * 60_000).toISOString();
    render(
      <RoomBoard
        initial={board([
          card({ call: { reason: "pain", at } }),
          card({ id: "aaaaaaaa-0000-4000-8000-000000000002", slot: 2, label: "Μαρία", call: { reason: "question", at: new Date().toISOString() } }),
        ])}
      />,
    );
    expect(screen.getByText("2 ασθενείς · 2 σας καλούν")).toBeInTheDocument();
    expect(screen.getByText("Με τη σειρά που κάλεσαν: Γιώργος Δ. (πονάει), Μαρία (έχει απορία)")).toBeInTheDocument();
    const bed = screen.getByRole("article", { name: "Κρεβάτι 1: Γιώργος Δ." });
    expect(within(bed).getByText(/Σας καλεί · Πονάει · πριν από 3 λεπτά/)).toBeInTheDocument();

    await userEvent.click(within(bed).getByRole("button", { name: "Το είδα" }));
    expect(actions.seeCall).toHaveBeenCalledWith("aaaaaaaa-0000-4000-8000-000000000001", at);
  });

  it("«Τέλος» asks first, then closes the card", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(board([])), { status: 200 })));
    render(<RoomBoard initial={board([card({ setsDone: [3, 3, 1] })])} />);
    expect(screen.getByText("✓ Τελείωσε τις ασκήσεις")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Τέλος για Γιώργος Δ." }));
    expect(actions.finishCard).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Ναι, τέλος" }));
    expect(actions.finishCard).toHaveBeenCalledWith("aaaaaaaa-0000-4000-8000-000000000001");
  });

  it("a card whose room was deleted goes under «Χωρίς θέση»", () => {
    render(<RoomBoard initial={board([card({ roomId: null, slot: null })])} />);
    expect(screen.getByRole("heading", { name: "Χωρίς θέση" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Χωρίς θέση: Γιώργος Δ." })).toBeInTheDocument();
  });

  it("has no accessibility problems", async () => {
    const { container } = render(<RoomBoard initial={board([card({ call: { reason: "pain", at: new Date().toISOString() } })])} />);
    await expectNoA11yViolations(container);
  });
});
