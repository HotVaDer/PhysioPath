import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeBar } from "@/app/p/[token]/HomeBar";
import { expectNoA11yViolations } from "@/app/test/axe";
import { useMemoryStorage } from "@/app/test/storage";

useMemoryStorage();
afterEach(() => {
  document.documentElement.style.fontSize = "";
  vi.restoreAllMocks();
});

describe("HomeBar", () => {
  it("«Αα» opens the three text sizes and the choice makes the whole page bigger", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <header>
        <HomeBar />
      </header>,
    );
    const aa = screen.getByRole("button", { name: "Αα, μέγεθος γραμμάτων" });
    expect(aa).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "Μέγεθος γραμμάτων" })).not.toBeInTheDocument();

    await user.click(aa);
    expect(aa).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("radio", { name: "Μεγάλα" }));
    expect(document.documentElement.style.fontSize).toBe("175%");
    expect(window.localStorage.getItem("physiopath:text-size")).toBe("xlarge"); // the same choice as on the session screen
    await expectNoA11yViolations(container);
  });

  it("«Εκτύπωση» opens the browser's print", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<HomeBar />);
    await user.click(screen.getByRole("button", { name: "Εκτύπωση" }));
    expect(print).toHaveBeenCalledOnce();
  });
});
