// The page's data part, with the database client replaced: what a wrong, old or good link leads to.
import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/app/lib/supabase/admin", () => ({ createAnonClient: () => ({ rpc }) }));

import { HomeProgramLetter } from "@/app/p/[token]/HomeProgramLetter";
import HomeProgramPage, { metadata, NewerProgram } from "@/app/p/[token]/page";

const TOKEN = "3f0c2b9e-6a1d-4c8e-9b7a-1d2e3f4a5b6c";
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }; // what notFound() throws: Next shows app/not-found.tsx
const open = (token: string) => HomeProgramPage({ params: Promise.resolve({ token }) } as PageProps<"/p/[token]">);

// A fictional clinic and patient, as home_program() returns them.
const home = {
  status: "ok",
  program: { title: "Αριστερό γόνατο", patient_first_name: "Ελένη", exercises: [{ name: "Γέφυρα γλουτών", sets: 3, reps: "10" }] },
  approvedAt: "2026-11-18T15:42:00Z",
  approvedBy: "Μαρία Κωνσταντίνου",
  clinicName: "Φυσιοθεραπεία Ελιά",
  clinicCity: "Λεμεσός",
  clinicPhone: "25 000000",
};

beforeEach(() => rpc.mockReset());

describe("/p/[token]", () => {
  it("is never listed by search engines and never passes the link on (noindex, no-referrer)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });

  it("a link that isn't a token at all is «Δεν βρέθηκε», without asking the database", async () => {
    await expect(open("not-a-token")).rejects.toMatchObject(NOT_FOUND);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a wrong or old token (the database answers nothing) is «Δεν βρέθηκε»", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(open(TOKEN)).rejects.toMatchObject(NOT_FOUND);
    expect(rpc).toHaveBeenCalledWith("home_program", { p_token: TOKEN });
  });

  it("an answer in a shape it doesn't know is «Δεν βρέθηκε» too, not a broken page", async () => {
    rpc.mockResolvedValue({ data: { program: { exercises: "?" } }, error: null });
    await expect(open(TOKEN)).rejects.toMatchObject(NOT_FOUND);
  });

  it("a database error goes to the error page, without its details", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection refused" } });
    await expect(open(TOKEN)).rejects.toThrow("home_program failed");
  });

  it("a newer program for the same patient: a card with the clinic's phone, no program", async () => {
    rpc.mockResolvedValue({ data: { status: "newer", clinicName: "Φυσιοθεραπεία Ελιά", clinicCity: "Λεμεσός", clinicPhone: "25 000000" }, error: null });
    const page = (await open(TOKEN)) as ReactElement<Record<string, unknown>>;
    expect(page.type).toBe(NewerProgram);
    expect(page.props).toEqual({ clinicName: "Φυσιοθεραπεία Ελιά", clinicPhone: "25 000000" });
  });

  it("the card says why and gives the clinic's phone as a link", async () => {
    const { render, screen } = await import("@testing-library/react");
    render(<NewerProgram clinicName="Φυσιοθεραπεία Ελιά" clinicPhone="25 000000" />);
    expect(screen.getByRole("heading", { name: "Υπάρχει νεότερο πρόγραμμα" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "25 000000" })).toHaveAttribute("href", "tel:25000000");
  });

  it("a good token shows the letter with the program and the clinic", async () => {
    rpc.mockResolvedValue({ data: home, error: null });
    const page = (await open(TOKEN)) as ReactElement<{ children: ReactElement[] }>;
    const letter = page.props.children.find((child) => isValidElement(child) && child.type === HomeProgramLetter) as ReactElement<
      Record<string, unknown>
    >;
    expect(letter.props).toMatchObject({ token: TOKEN, clinicName: "Φυσιοθεραπεία Ελιά", approvedBy: "Μαρία Κωνσταντίνου" });
    expect(letter.props.program).toMatchObject({ title: "Αριστερό γόνατο", patient_first_name: "Ελένη" });
    expect(letter.props.log).toEqual([]); // an answer without a diary: nothing ticked yet
    expect(letter.props.firstDay).toBe("2026-11-18"); // the day it was approved, in Cyprus
    expect(letter.props.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("passes the diary on to the letter", async () => {
    const log = [{ day: "2026-11-19", exercise: 0, status: "skipped", pain: 7, note: "πόνος" }];
    rpc.mockResolvedValue({ data: { ...home, log }, error: null });
    const page = (await open(TOKEN)) as ReactElement<{ children: ReactElement[] }>;
    const letter = page.props.children.find((child) => isValidElement(child) && child.type === HomeProgramLetter) as ReactElement<
      Record<string, unknown>
    >;
    expect(letter.props.log).toEqual(log);
  });
});
