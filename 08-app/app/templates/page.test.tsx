// «Πρότυπα», with the login and the database read replaced.
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const member = vi.hoisted(() => ({ role: "physio" as "owner" | "physio" | "assistant" }));
vi.mock("@/app/lib/onboarding/session", () => ({
  requireMember: async () => ({
    supabase: {},
    user: { id: "u1" },
    profile: { role: member.role, full_name: "Μαρία Κωνσταντίνου", clinic_id: "c1", clinic_name: "Φυσιοθεραπεία Ελιά" },
  }),
}));
const load = vi.hoisted(() => ({ loadTemplates: vi.fn() }));
vi.mock("@/app/lib/templates/load", () => ({ ...load, TEMPLATE_NAME_MAX: 80, TEMPLATE_AREA_MAX: 60 }));
vi.mock("@/app/lib/templates/actions", () => ({ updateTemplate: vi.fn(), archiveTemplate: vi.fn() }));
vi.mock("@/app/components/paper/SignOut", () => ({ SignOut: () => null }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("redirect"), { to });
  },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/templates",
}));

import type { Template } from "@/app/lib/templates/load";
import TemplatesPage from "@/app/templates/page";
import { expectNoA11yViolations } from "@/app/test/axe";

const knee: Template = {
  id: "5eed0000-0000-4000-8000-0000000000d1",
  name: "Γόνατο μετά ACL – εβδ. 1–2",
  area: "Γόνατο",
  uses: 12,
  createdAt: "2026-11-20T10:00:00Z",
  program: {
    title: "Πρόγραμμα ασκήσεων – Γόνατο",
    patient_first_name: null,
    next_appointment: null,
    exercises: [
      { name: "Ευθείες άρσεις ποδιού", sets: 3, reps: "10", hold: null, frequency: "2 φορές τη μέρα", notes: null },
      { name: "Ολισθήσεις φτέρνας", sets: null, reps: null, hold: null, frequency: null, notes: "Μέχρι να πονέσει λίγο." },
    ],
    after_exercises: ["Πάγο για 20 λεπτά."],
    avoid: ["Όχι καθίσματα ακόμα."],
    contact_if: [],
    other: [],
  },
};
const shoulder: Template = { ...knee, id: "5eed0000-0000-4000-8000-0000000000d2", name: "Ώμος – κινητικότητα", area: null, uses: 0 };

const open = (search: Record<string, string> = {}) =>
  TemplatesPage({ searchParams: Promise.resolve(search) } as PageProps<"/templates">);

beforeEach(() => {
  member.role = "physio";
  load.loadTemplates.mockReset();
});

describe("/templates", () => {
  it("lists the clinic's templates; each opens to its exercises, rename and archive", async () => {
    load.loadTemplates.mockResolvedValue([knee, shoulder]);
    const { container } = render((await open()) as ReactElement);
    expect(screen.getByRole("heading", { level: 1, name: "Πρότυπα" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Πρότυπα" })).toHaveAttribute("aria-current", "page");
    const cards = container.querySelectorAll("details");
    expect(cards).toHaveLength(2);
    expect(cards[0]).not.toHaveAttribute("open");
    const first = within(cards[0] as HTMLElement);
    expect(first.getByText("Γόνατο μετά ACL – εβδ. 1–2")).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("Γόνατο · 2 ασκήσεις · χρησιμοποιήθηκε 12 φορές · αποθηκεύτηκε στις 20 Νοεμβρίου 2026");
    expect(cards[1]).toHaveTextContent("2 ασκήσεις · αποθηκεύτηκε");
    expect(cards[0]).toHaveTextContent("3 σετ × 10 επαναλήψεις · 2 φορές τη μέρα");
    expect(cards[0]).toHaveTextContent("Μέχρι να πονέσει λίγο.");
    expect(cards[0]).toHaveTextContent("Όχι καθίσματα ακόμα.");
    expect(first.getByLabelText("Όνομα")).toHaveValue("Γόνατο μετά ACL – εβδ. 1–2");
    expect(first.getByLabelText("Περιοχή")).toHaveValue("Γόνατο");
    expect(first.getByRole("button", { name: "Αποθήκευση αλλαγών" })).toBeInTheDocument();
    expect(first.getByRole("button", { name: "Αρχειοθέτηση" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("after a rename, that template is open and says so", async () => {
    load.loadTemplates.mockResolvedValue([knee, shoulder]);
    const { container } = render((await open({ done: "renamed", open: shoulder.id })) as ReactElement);
    const cards = container.querySelectorAll("details");
    expect(cards[0]).not.toHaveAttribute("open");
    expect(cards[1]).toHaveAttribute("open");
    expect(within(cards[1] as HTMLElement).getByRole("status")).toHaveTextContent("Οι αλλαγές αποθηκεύτηκαν.");
  });

  it("a name already taken: the error is on that template's name field", async () => {
    load.loadTemplates.mockResolvedValue([knee, shoulder]);
    const { container } = render((await open({ done: "taken", open: knee.id })) as ReactElement);
    const card = within(container.querySelectorAll("details")[0] as HTMLElement);
    expect(card.getByLabelText("Όνομα")).toHaveAttribute("aria-invalid", "true");
    expect(card.getByText(/Υπάρχει ήδη πρότυπο με αυτό το όνομα/)).toBeInTheDocument();
  });

  it("after archiving: a line at the top", async () => {
    load.loadTemplates.mockResolvedValue([shoulder]);
    render((await open({ done: "archived" })) as ReactElement);
    expect(screen.getByRole("status")).toHaveTextContent("Το πρότυπο βγήκε από τη λίστα.");
  });

  it("no templates yet: says how to make the first one", async () => {
    load.loadTemplates.mockResolvedValue([]);
    render((await open()) as ReactElement);
    const empty = screen.getByText(/Δεν έχετε ακόμα πρότυπα/);
    expect(within(empty).getByRole("link", { name: "Νέα συνεδρία" })).toHaveAttribute("href", "/notes/new");
    expect(within(empty).getByRole("link", { name: "Πείτε τα πρότυπά σας" })).toHaveAttribute("href", "/templates/dictate");
  });

  it("«Πείτε τα πρότυπά σας» is under the title, with templates or without", async () => {
    load.loadTemplates.mockResolvedValue([knee]);
    render((await open()) as ReactElement);
    expect(screen.getByRole("link", { name: "Πείτε τα πρότυπά σας" })).toHaveAttribute("href", "/templates/dictate");
  });

  it("assistants go home", async () => {
    member.role = "assistant";
    await expect(open()).rejects.toMatchObject({ to: "/" });
    expect(load.loadTemplates).not.toHaveBeenCalled();
  });
});
