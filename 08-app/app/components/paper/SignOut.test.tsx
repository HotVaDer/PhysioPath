// «Αποσύνδεση» deletes this tab's unfinished note before signing out.
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignOut } from "@/app/components/paper/SignOut";
import { STORAGE_KEY } from "@/app/lib/notes/DraftContext";

vi.mock("@/app/lib/onboarding/actions", () => ({ signOut: vi.fn() }));

afterEach(() => sessionStorage.clear());

describe("SignOut", () => {
  it("pressing «Αποσύνδεση» deletes the note in progress", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ transcript: "Γέφυρα 3 σετ" }));
    sessionStorage.setItem("something-else", "stays");
    render(<SignOut />);
    fireEvent.submit(screen.getByRole("button", { name: "Αποσύνδεση" }).closest("form")!);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem("something-else")).toBe("stays");
  });
});
