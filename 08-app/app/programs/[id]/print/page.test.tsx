// «Εκτύπωση για τον ασθενή», with the login and the database replaced: which letter it prints, at which
// size, and what a wrong id or a newer program leads to.
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ program: null as Record<string, unknown> | null, newest: null as Record<string, unknown> | null, rpc: vi.fn() }));
const member = vi.hoisted(() => ({ role: "physio" as "owner" | "physio" | "assistant" }));
vi.mock("@/app/lib/onboarding/session", () => ({
  requireMember: async () => {
    // programs: the program by id (.eq().maybeSingle()), or the newest one of the patient (.order().limit()).
    const query = {
      select: () => query,
      eq: () => query,
      order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: db.newest }) }) }),
      maybeSingle: async () => ({ data: db.program }),
    };
    return {
      supabase: { from: () => query },
      user: { id: "u1" },
      profile: { role: member.role, full_name: "Μαρία Κωνσταντίνου", clinic_id: "c1", clinic_name: "Φυσιοθεραπεία Ελιά" },
    };
  },
}));
vi.mock("@/app/lib/supabase/admin", () => ({ createAnonClient: () => ({ rpc: db.rpc }) }));
vi.mock("@/app/components/paper/SignOut", () => ({ SignOut: () => null }));
vi.mock("next/navigation", async (actual) => ({
  ...(await actual<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/programs/x/print",
}));

import PrintProgramPage, { metadata } from "@/app/programs/[id]/print/page";
import { HomeProgramLetter } from "@/app/p/[token]/HomeProgramLetter";

const ID = "5eed0000-0000-4000-8000-0000000000b1";
const TOKEN = "3f0c2b9e-6a1d-4c8e-9b7a-1d2e3f4a5b6c";
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };
const open = (id: string, search: Record<string, string> = {}) =>
  PrintProgramPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(search) } as PageProps<"/programs/[id]/print">);

// A fictional clinic and patient, as home_program() returns them (with a diary that must not reach the page).
const home = {
  status: "ok",
  program: { title: "Αριστερό γόνατο", patient_first_name: "Γιώργος", exercises: [{ name: "Γέφυρα", sets: 3, reps: "10" }] },
  approvedAt: "2026-11-24T10:00:00Z",
  approvedBy: "Μαρία Κωνσταντίνου",
  clinicName: "Φυσιοθεραπεία Ελιά",
  clinicCity: "Λεμεσός",
  clinicPhone: "25 000000",
  log: [{ day: "2026-11-24", exercise: 0, status: "done", pain: 3, note: "Καλά" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  member.role = "physio";
  db.program = { id: ID, token: TOKEN, patient_id: "5eed0000-0000-4000-8000-0000000000a1" };
  db.newest = null;
  db.rpc.mockResolvedValue({ data: home, error: null });
});

describe("/programs/[id]/print", () => {
  it("is never listed by search engines", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("prints the patient's letter on paper, at normal size, without the home diary", async () => {
    const page = (await open(ID)) as ReactElement<Record<string, unknown>>;
    expect(db.rpc).toHaveBeenCalledWith("home_program", { p_token: TOKEN });
    expect(page.type).toBe(HomeProgramLetter);
    expect(page.props).toMatchObject({ clinicName: "Φυσιοθεραπεία Ελιά", approvedBy: "Μαρία Κωνσταντίνου", paper: { size: "normal" } });
    expect(page.props.program).toMatchObject({ patient_first_name: "Γιώργος" });
    expect(page.props).not.toHaveProperty("log");
    expect(page.props).not.toHaveProperty("token");
  });

  it("?size=large: «Μεγάλα γράμματα»; anything else is normal", async () => {
    expect(((await open(ID, { size: "large" })) as ReactElement<{ paper: { size: string } }>).props.paper.size).toBe("large");
    expect(((await open(ID, { size: "huge" })) as ReactElement<{ paper: { size: string } }>).props.paper.size).toBe("normal");
  });

  it("an assistant can print it too (they help patients; the sheet has no clinical note)", async () => {
    member.role = "assistant";
    expect(((await open(ID)) as ReactElement).type).toBe(HomeProgramLetter);
  });

  it("a wrong id, or a program the clinic can't see, is «Δεν βρέθηκε»", async () => {
    await expect(open("not-an-id")).rejects.toMatchObject(NOT_FOUND);
    db.program = null;
    await expect(open(ID)).rejects.toMatchObject(NOT_FOUND);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("a database error goes to the error page", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    await expect(open(ID)).rejects.toThrow("home_program failed");
  });

  it("a newer program: not printed, a link to print the newer one", async () => {
    db.rpc.mockResolvedValue({ data: { status: "newer", clinicName: "Φυσιοθεραπεία Ελιά", clinicCity: null, clinicPhone: null }, error: null });
    db.newest = { id: "5eed0000-0000-4000-8000-0000000000b2" };
    render((await open(ID)) as ReactElement);
    expect(screen.getByRole("heading", { name: "Υπάρχει νεότερο πρόγραμμα" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Εκτύπωση του νεότερου προγράμματος/ })).toHaveAttribute(
      "href",
      "/programs/5eed0000-0000-4000-8000-0000000000b2/print",
    );
  });
});

describe("PrintBar", () => {
  it("back to the program, the two sizes (the chosen one marked), and «Εκτύπωση»", async () => {
    const { PrintBar } = await import("@/app/programs/[id]/print/PrintBar");
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PrintBar programId={ID} size="large" />);
    expect(screen.getByRole("link", { name: /Πίσω στο πρόγραμμα/ })).toHaveAttribute("href", `/programs/${ID}`);
    expect(screen.getByRole("link", { name: "Κανονικά" })).toHaveAttribute("href", `/programs/${ID}/print`);
    expect(screen.getByRole("link", { name: "Μεγάλα γράμματα" })).toHaveAttribute("aria-current", "page");
    screen.getByRole("button", { name: "Εκτύπωση" }).click();
    expect(print).toHaveBeenCalled();
  });
});
