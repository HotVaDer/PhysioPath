// The two-tab way of working: top-bar links go to the tab they belong in.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TabLink, TabName, switchesTabs } from "@/app/components/paper/TabLink";
import { BOARD_TAB, WORK_TAB } from "@/app/lib/tabs";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  window.name = "";
  vi.restoreAllMocks();
});

describe("TabName", () => {
  it("names this browser tab", () => {
    render(<TabName name={WORK_TAB} />);
    expect(window.name).toBe(WORK_TAB);
  });
});

describe("TabLink", () => {
  it("in the work tab, «Αίθουσα» goes to the board's tab and leaves this page as it is", async () => {
    window.name = WORK_TAB;
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<TabLink href="/" tab={BOARD_TAB}>Αίθουσα</TabLink>);
    await userEvent.click(screen.getByRole("link", { name: "Αίθουσα" }));
    expect(open).toHaveBeenCalledWith("/", BOARD_TAB);
  });

  it("already in the board's tab: a normal link", async () => {
    window.name = BOARD_TAB;
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<TabLink href="/" tab={BOARD_TAB}>Αίθουσα</TabLink>);
    await userEvent.click(screen.getByRole("link", { name: "Αίθουσα" }));
    expect(open).not.toHaveBeenCalled();
  });

  it("Cmd-click still does what the person asked for (the browser's own new tab)", async () => {
    window.name = WORK_TAB;
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<TabLink href="/" tab={BOARD_TAB}>Αίθουσα</TabLink>);
    const user = userEvent.setup();
    await user.keyboard("{Meta>}"); // hold Cmd
    await user.click(screen.getByRole("link", { name: "Αίθουσα" }));
    expect(open).not.toHaveBeenCalled();
  });

  it("in Firefox (which won't switch tabs for a site) it opens a new tab instead", async () => {
    window.name = WORK_TAB;
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh; rv:140.0) Gecko/20100101 Firefox/140.0");
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<TabLink href="/" tab={BOARD_TAB}>Αίθουσα</TabLink>);
    const link = screen.getByRole("link", { name: "Αίθουσα" });
    const stop = (e: Event) => e.preventDefault(); // after the app's own handler: jsdom can't open a tab
    window.addEventListener("click", stop);
    await userEvent.click(link);
    window.removeEventListener("click", stop);
    expect(open).not.toHaveBeenCalled(); // the browser follows the link itself
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });
});

describe("switchesTabs", () => {
  it("Safari, Chrome and Firefox on an iPhone switch; Firefox on a computer doesn't", () => {
    expect(switchesTabs("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15")).toBe(true);
    expect(switchesTabs("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36")).toBe(true);
    expect(switchesTabs("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FxiOS/140.0 Mobile/15E148 Safari/605.1.15")).toBe(true);
    expect(switchesTabs("Mozilla/5.0 (Windows NT 10.0; rv:140.0) Gecko/20100101 Firefox/140.0")).toBe(false);
  });
});
