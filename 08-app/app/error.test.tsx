// The Greek page shown when a page can't load, instead of Next's English one.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AppError from "@/app/error";

describe("app/error.tsx", () => {
  it("says it in Greek, and «Δοκιμάστε ξανά» asks for the page again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<AppError error={new Error("database down")} retry={retry} />);
    expect(screen.getByRole("heading", { name: "Η σελίδα δεν άνοιξε" })).toBeInTheDocument();
    expect(screen.queryByText(/database down/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Δοκιμάστε ξανά" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
