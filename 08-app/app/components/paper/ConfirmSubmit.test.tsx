// «Αφαίρεση» / «Αποχώρηση» ask first; only «Ναι» sends the form.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmSubmit } from "@/app/components/paper/ConfirmSubmit";

describe("ConfirmSubmit", () => {
  it("the first press only asks; «Όχι» goes back; «Ναι» sends", async () => {
    const sent = vi.fn((e: Event) => e.preventDefault());
    render(
      <form onSubmit={(e) => sent(e.nativeEvent)}>
        <ConfirmSubmit question="Να βγει η Μαρία από την ομάδα;" pending="Αφαίρεση…">
          Αφαίρεση
        </ConfirmSubmit>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Αφαίρεση" }));
    expect(sent).not.toHaveBeenCalled();
    expect(screen.getByText("Να βγει η Μαρία από την ομάδα;")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Όχι" }));
    expect(screen.getByRole("button", { name: "Αφαίρεση" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Αφαίρεση" }));
    await userEvent.click(screen.getByRole("button", { name: "Ναι" }));
    expect(sent).toHaveBeenCalledOnce();
  });
});
