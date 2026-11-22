// AutoRefresh: every 30 s, only while the tab is visible, not while someone is in a field, and never
// without a connection (a refresh that can't reach the server would load the browser's offline page).
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AutoRefresh, inField, REFRESH_MS } from "@/app/components/paper/AutoRefresh";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let hidden = false;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  fetchMock.mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  refresh.mockReset();
  fetchMock.mockReset();
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("AutoRefresh", () => {
  it("refreshes after 30 s, after checking the connection, and not before", async () => {
    render(<AutoRefresh />);
    await wait(REFRESH_MS - 5_000);
    expect(refresh).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    await wait(5_000);
    expect(fetchMock).toHaveBeenCalledWith("/icon.svg", expect.objectContaining({ method: "HEAD", cache: "no-store" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    await wait(REFRESH_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("no connection: no refresh, so no reload into the browser's offline page", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AutoRefresh />);
    await wait(REFRESH_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
    // back online: the next look refreshes
    fetchMock.mockResolvedValue({ ok: true });
    await wait(5_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a hidden tab doesn't refresh; coming back after 30 s refreshes at once", async () => {
    hidden = true;
    render(<AutoRefresh />);
    await wait(REFRESH_MS * 3);
    expect(refresh).not.toHaveBeenCalled();
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    await wait(0);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("waits while someone is typing in a field, and refreshes soon after they leave it", async () => {
    const { container } = render(
      <form>
        <AutoRefresh />
        <input type="email" aria-label="Email" />
      </form>,
    );
    const field = container.querySelector("input")!;
    field.focus();
    await wait(REFRESH_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
    field.blur();
    await wait(5_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops when the page goes", async () => {
    const { unmount } = render(<AutoRefresh />);
    unmount();
    await wait(REFRESH_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("inField", () => {
  it("text, lists and choices count; buttons don't", () => {
    document.body.innerHTML = `
      <input id="t" type="text"><input id="r" type="radio"><textarea id="a"></textarea><select id="s"></select>
      <button id="b">x</button><input id="u" type="submit"><div id="e" contenteditable="true"></div><div id="d"></div>`;
    const el = (id: string) => document.getElementById(id);
    expect(["t", "r", "a", "s", "e"].map((id) => inField(el(id)))).toEqual([true, true, true, true, true]);
    expect(["b", "u", "d"].map((id) => inField(el(id)))).toEqual([false, false, false]);
    expect(inField(null)).toBe(false);
  });
});
