// The notice when the text changed after the program was made.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StaleNotice } from "@/app/notes/StaleNotice";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("StaleNotice", () => {
  it("on the recording page: «Νέο πρόγραμμα» makes it again, «Κράτα αυτό» keeps it", async () => {
    const onNew = vi.fn();
    const onKeep = vi.fn();
    render(<StaleNotice same={false} onNew={onNew} onKeep={onKeep} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Το κείμενο άλλαξε από τότε που φτιάχτηκε το πρόγραμμα.");
    await userEvent.click(screen.getByRole("button", { name: "Νέο πρόγραμμα" }));
    await userEvent.click(screen.getByRole("button", { name: "Κράτα αυτό" }));
    expect(onNew).toHaveBeenCalledOnce();
    expect(onKeep).toHaveBeenCalledOnce();
  });

  it("on the review page: «Νέο πρόγραμμα» goes back to the recording; «Ίδιο πρόγραμμα» says note", () => {
    render(<StaleNotice same onKeep={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("φτιάχτηκε η σημείωση");
    expect(screen.getByRole("link", { name: /Νέα σημείωση από το νέο κείμενο/ })).toHaveAttribute("href", "/notes/record");
    expect(screen.getByRole("button", { name: "Κράτα αυτή" })).toBeInTheDocument();
  });
});
