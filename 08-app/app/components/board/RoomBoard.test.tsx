import { act, render, screen, within } from "@testing-library/react";
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// The board asks every 3 s: fake clocks, and a fetch whose answers the test hands out one by one.
function controlledFetch() {
  const pending: ((r: Response) => void)[] = [];
  const fetch = vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve)));
  vi.stubGlobal("fetch", fetch);
  const answer = async (i: number, response: Response) => {
    await act(async () => pending[i](response));
  };
  return { fetch, answer };
}
const json = (data: BoardData) => new Response(JSON.stringify(data), { status: 200 });
const nextPoll = () => act(async () => vi.advanceTimersByTime(3000));

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

  describe("two tabs: the board in one, the work in the other", () => {
    it("«QR / οθόνη ασθενή» opens in a new tab, so the note being written in the other tab stays", () => {
      render(<RoomBoard initial={board([card({})])} />);
      const qr = screen.getByRole("link", { name: /QR \/ οθόνη ασθενή για Γιώργος Δ\./ });
      expect(qr).toHaveAttribute("href", "/programs/bbbbbbbb-0000-4000-8000-000000000001");
      expect(qr).toHaveAttribute("target", "_blank");
    });

    it("on a phone-sized screen «QR / οθόνη ασθενή» opens in the same tab", async () => {
      Object.defineProperty(window, "matchMedia", { value: () => ({ matches: true }), configurable: true, writable: true });
      render(<RoomBoard initial={board([card({})])} />);
      const qr = screen.getByRole("link", { name: /QR \/ οθόνη ασθενή για Γιώργος Δ\./ });
      qr.addEventListener("click", (event) => event.preventDefault()); // jsdom can't navigate
      await userEvent.click(qr);
      expect(qr).not.toHaveAttribute("target");
      Reflect.deleteProperty(window, "matchMedia");
    });

    it("«Πλήρης οθόνη» puts the board alone on the screen, and the same button leaves", async () => {
      const request = vi.fn(async () => {
        Object.defineProperty(document, "fullscreenElement", { configurable: true, value: document.documentElement });
        document.dispatchEvent(new Event("fullscreenchange"));
      });
      Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
      Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: request });
      render(<RoomBoard initial={board([])} />);
      await userEvent.click(screen.getByRole("button", { name: /Πλήρης οθόνη/ }));
      expect(request).toHaveBeenCalledOnce();
      expect(screen.getByRole("button", { name: /Έξοδος από πλήρη οθόνη/ })).toBeInTheDocument();
      // clean up for the other tests
      Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: undefined });
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: undefined });
    });

    it("no full-screen button where the browser can't do it (an iPhone)", () => {
      render(<RoomBoard initial={board([])} />);
      expect(screen.queryByRole("button", { name: /Πλήρης οθόνη/ })).not.toBeInTheDocument();
    });
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

  describe("when the clinic's Wi-Fi drops", () => {
    it("a press that doesn't reach the server says so on its card, and the buttons work again", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
      actions.seeCall.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      render(<RoomBoard initial={board([card({ call: { reason: "pain", at: new Date().toISOString() } })])} />);
      const cardEl = screen.getByRole("article", { name: "Γιώργος Δ." });
      await userEvent.click(within(cardEl).getByRole("button", { name: "Το είδα" }));
      expect(within(cardEl).getByRole("alert")).toHaveTextContent("Δεν στάλθηκε. Ελέγξτε τη σύνδεση και πατήστε ξανά.");
      expect(within(cardEl).getByRole("button", { name: "Το είδα" })).toBeEnabled();
      expect(screen.getByText("Χωρίς σύνδεση · δοκιμάζουμε ξανά")).toBeInTheDocument();
      // Pressing again works, and the message goes away.
      await userEvent.click(within(cardEl).getByRole("button", { name: "Το είδα" }));
      expect(actions.seeCall).toHaveBeenCalledTimes(2);
      expect(within(cardEl).queryByText(/Δεν στάλθηκε/)).not.toBeInTheDocument();
    });

    it("the device is offline: the press isn't even tried, and the card says so", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      render(<RoomBoard initial={board([card({ setsDone: [3, 3, 1] })])} />);
      await userEvent.click(screen.getByRole("button", { name: "Ολοκλήρωση για Γιώργος Δ." }));
      await userEvent.click(screen.getByRole("button", { name: "Ναι" }));
      expect(actions.finishCard).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("Δεν στάλθηκε");
      expect(screen.getByRole("button", { name: "Ολοκλήρωση για Γιώργος Δ." })).toBeEnabled();
      vi.restoreAllMocks();
    });

    it("a press with no answer for 10 s is reported, and the buttons work again", async () => {
      vi.useFakeTimers();
      controlledFetch(); // the refresh after it never answers either
      actions.seeCall.mockImplementationOnce(() => new Promise(() => {})); // held by the network
      render(<RoomBoard initial={board([card({ call: { reason: "question", at: new Date().toISOString() } })])} />);
      act(() => screen.getByRole("button", { name: "Το είδα" }).click());
      expect(screen.getByRole("button", { name: "Το είδα" })).toBeDisabled();
      await act(async () => vi.advanceTimersByTime(10_000));
      expect(screen.getByRole("alert")).toHaveTextContent("Δεν πήραμε απάντηση");
      expect(screen.getByRole("button", { name: "Το είδα" })).toBeEnabled();
    });

    it("a refresh that started before «Το είδα» can't bring the call back", async () => {
      vi.useFakeTimers();
      const { fetch, answer } = controlledFetch();
      const at = new Date().toISOString();
      const calling = board([card({ call: { reason: "pain", at } })]);
      render(<RoomBoard initial={calling} />);
      await nextPoll(); // refresh 0 starts and waits (slow Wi-Fi)
      expect(fetch).toHaveBeenCalledTimes(1);

      // «Το είδα»: the press, then the board asks again (refresh 1).
      let pressed!: Promise<void>;
      act(() => {
        pressed = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Το είδα" }));
      });
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
      await answer(1, json(board([card({})]))); // after the press: no call
      await act(async () => pressed);
      expect(screen.queryByText("Χρειάζεται εσάς · Πόνος")).not.toBeInTheDocument();

      await answer(0, json(calling)); // the old refresh arrives last, from before the press
      expect(screen.queryByText("Χρειάζεται εσάς · Πόνος")).not.toBeInTheDocument();
    });

    it("signed out: the board stops asking and hides the patients", async () => {
      vi.useFakeTimers();
      const { fetch, answer } = controlledFetch();
      render(<RoomBoard initial={board([card({})])} />);
      await nextPoll();
      await answer(0, new Response(JSON.stringify({ error: "x" }), { status: 401 }));
      expect(screen.getByRole("alert")).toHaveTextContent("Αποσυνδεθήκατε");
      expect(screen.getByRole("link", { name: "Είσοδος" })).toHaveAttribute("href", "/login");
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
      expect(screen.queryByText("Γιώργος Δ.")).not.toBeInTheDocument();
      await nextPoll();
      await nextPoll();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("no connection on a refresh: «Χωρίς σύνδεση», and the patients stay on screen", async () => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
      render(<RoomBoard initial={board([card({})])} />);
      await nextPoll();
      expect(screen.getByText("Χωρίς σύνδεση · δοκιμάζουμε ξανά")).toBeInTheDocument();
      expect(screen.getByRole("article", { name: "Γιώργος Δ." })).toBeInTheDocument();
    });
  });
});
