// «Η κλινική Χ σας προσκάλεσε»: waiting invites, shown inside the app.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InviteNotice } from "@/app/components/paper/InviteNotice";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const TOKEN = "6b3c0d6e-8f41-4a2b-9c7d-1e2f3a4b5c6d";

describe("InviteNotice", () => {
  it("says which clinic, as what, who invited, and links to the invite", () => {
    render(<InviteNotice invites={[{ token: TOKEN, role: "physio", clinicName: "Κλινική Β", clinicCity: "Λεμεσός", invitedBy: "Μαρία" }]} />);
    expect(screen.getByRole("region", { name: "Προσκλήσεις" })).toHaveTextContent("Κλινική Β (Λεμεσός) σας προσκάλεσε, ως φυσιοθεραπευτή · από Μαρία.");
    const link = screen.getByRole("link", { name: /Δείτε την πρόσκληση/ });
    expect(link).toHaveAttribute("href", `/invite/${TOKEN}`);
    expect(link).toHaveTextContent("από Κλινική Β"); // for screen readers: which invite
  });

  it("nothing at all when there are no invites", () => {
    const { container } = render(<InviteNotice invites={[]} lead="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});
