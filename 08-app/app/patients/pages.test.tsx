// «Ασθενείς» and one patient's page, with the login and the database reads replaced.
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
const load = vi.hoisted(() => ({ loadPatients: vi.fn(), loadPatientProgress: vi.fn() }));
vi.mock("@/app/lib/home/load", () => load);
vi.mock("@/app/lib/home/actions", () => ({ seeHomePain: vi.fn() }));
vi.mock("@/app/components/paper/SignOut", () => ({ SignOut: () => null }));
vi.mock("@/app/components/paper/AutoRefresh", () => ({ AutoRefresh: () => null }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("redirect"), { to });
  },
  notFound: () => {
    throw Object.assign(new Error("not found"), { notFound: true });
  },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/patients",
}));

import { addDays } from "@/app/lib/home/log";
import type { DiaryRow, ProgramRow } from "@/app/lib/home/progress";
import PatientPage from "@/app/patients/[id]/page";
import PatientsPage from "@/app/patients/page";
import { expectNoA11yViolations } from "@/app/test/axe";

const TODAY = "2026-11-22";
const PATIENT = "5eed0000-0000-4000-8000-0000000000a1";
const program: ProgramRow = {
  id: "5eed0000-0000-4000-8000-0000000000b1",
  patient_id: PATIENT,
  approved_at: "2026-11-18T15:42:00Z",
  program: { title: "Αριστερό γόνατο", exercises: [{ name: "Γέφυρα γλουτών" }, { name: "Διάταση γάμπας" }] },
};
const row = (over: Partial<DiaryRow>): DiaryRow => ({
  program_id: program.id,
  patient_id: PATIENT,
  day: TODAY,
  exercise: 0,
  status: "done",
  pain: null,
  note: null,
  created_at: `${over.day ?? TODAY}T10:00:00Z`,
  seen_at: null,
  ...over,
});

const openPatient = (search: Record<string, string> = {}) =>
  PatientPage({ params: Promise.resolve({ id: PATIENT }), searchParams: Promise.resolve(search) } as PageProps<"/patients/[id]">);

beforeEach(() => {
  member.role = "physio";
  load.loadPatients.mockReset();
  load.loadPatientProgress.mockReset();
});

describe("/patients", () => {
  it("lists the patients with their home summary, a pink tag for pain waiting for «Το είδα»", async () => {
    load.loadPatients.mockResolvedValue({
      today: TODAY,
      patients: [
        { id: "k", label: "Κώστας", program: { id: "p2", title: "Ώμος" }, lastDay: "2026-11-21", activeDays: 3, latestPain: { pain: 8, day: "2026-11-21" }, unseenPain: 1 },
        { id: "e", label: "Ελένη", program: null, lastDay: null, activeDays: 0, latestPain: null, unseenPain: 0 },
      ],
    });
    const { container } = render((await PatientsPage()) as ReactElement);
    expect(screen.getByRole("heading", { level: 1, name: "Ασθενείς" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ασθενείς" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("status")).toHaveTextContent("1 ασθενής ανέφερε δυνατό πόνο.");
    const [kostas, eleni] = screen.getAllByRole("listitem").filter((li) => within(li).queryByRole("link", { name: /Κώστας|Ελένη/ }));
    expect(within(kostas).getByRole("link")).toHaveAttribute("href", "/patients/k");
    expect(kostas).toHaveTextContent("Δυνατός πόνος");
    expect(kostas).toHaveTextContent("χθες");
    expect(kostas).toHaveTextContent("3 από 7 μέρες");
    expect(kostas).toHaveTextContent("8/10");
    expect(eleni).toHaveTextContent("Χωρίς πρόγραμμα για το σπίτι");
    expect(eleni).toHaveTextContent("ποτέ");
    expect(eleni).not.toHaveTextContent("Δυνατός πόνος");
    await expectNoA11yViolations(container);
  });

  it("says so when there are no patients yet", async () => {
    load.loadPatients.mockResolvedValue({ today: TODAY, patients: [] });
    render((await PatientsPage()) as ReactElement);
    expect(screen.getByText(/Δεν υπάρχουν ακόμα ασθενείς/)).toBeInTheDocument();
  });

  it("assistants go home (pain and notes are for physios)", async () => {
    member.role = "assistant";
    await expect(PatientsPage()).rejects.toMatchObject({ to: "/" });
    expect(load.loadPatients).not.toHaveBeenCalled();
  });
});

describe("/patients/[id]", () => {
  const progress = {
    today: TODAY,
    patient: { id: PATIENT, label: "Ελένη", archived: false },
    programs: [program],
    rows: [
      row({ day: TODAY, exercise: 0 }),
      row({ day: TODAY, exercise: 1, pain: 8, note: "Τράβηγμα πίσω από το γόνατο" }),
      row({ day: addDays(TODAY, -1), exercise: 1, status: "skipped", pain: 4, created_at: `${TODAY}T08:00:00Z` }),
      row({ day: addDays(TODAY, -2), exercise: 0, pain: 2 }),
    ],
  };

  it("shows the diary day by day, the summary and the pain report with «Το είδα»", async () => {
    load.loadPatientProgress.mockResolvedValue(progress);
    const { container } = render((await openPatient()) as ReactElement);
    expect(load.loadPatientProgress).toHaveBeenCalledWith({}, PATIENT, 14);
    expect(screen.getByRole("heading", { level: 1, name: "Ελένη" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Το πρόγραμμα →" })).toHaveAttribute("href", `/programs/${program.id}`);

    const alert = screen.getByRole("region", { name: "Δυνατός πόνος στο σπίτι" });
    expect(alert).toHaveTextContent("Διάταση γάμπας · πόνος 8/10");
    expect(alert).toHaveTextContent("«Τράβηγμα πίσω από το γόνατο»");
    expect(within(alert).getByRole("button", { name: "Το είδα" })).toBeInTheDocument();
    expect(alert.querySelector('input[name="patientId"]')).toHaveValue(PATIENT);
    expect(alert.querySelector('input[name="clinicId"]')).toHaveValue("c1");

    const summary = screen.getByRole("region", { name: "Με μια ματιά" });
    expect(summary).toHaveTextContent("2 από 7 μέρες με ασκήσεις");
    expect(within(summary).getByRole("img", { name: /γραμμή του πόνου/ })).toBeInTheDocument();
    expect(summary).toHaveTextContent("από 2 σε 8");

    const diary = screen.getByRole("region", { name: "Μέρα με τη μέρα" });
    const days = within(diary).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(days[0]).toBe("Σήμερα · Κυριακή 22 Νοεμβρίου");
    expect(days).toHaveLength(5); // 18 → 22 November: from the day the program was given
    const today = within(diary).getAllByRole("listitem")[0];
    expect(today).toHaveTextContent("2 από 2 ✓");
    const yesterday = within(diary).getAllByRole("heading", { level: 3 })[1].closest("li")!;
    expect(yesterday).toHaveTextContent("Δεν την έκανε: Διάταση γάμπας · πόνος 4/10 · δεν μπόρεσε · σημειώθηκε αργότερα");
    expect(within(diary).getAllByText("τίποτα")).toHaveLength(2);
    await expectNoA11yViolations(container);
  });

  it("after «Το είδα»: a green line, and no pink box once nothing is waiting", async () => {
    load.loadPatientProgress.mockResolvedValue({ ...progress, rows: progress.rows.map((r) => ({ ...r, seen_at: r.pain === 8 ? "2026-11-22T12:00:00Z" : null })) });
    render((await openPatient({ seen: "1" })) as ReactElement);
    expect(screen.getByRole("status")).toHaveTextContent("Εντάξει, το είδατε.");
    expect(screen.queryByRole("region", { name: "Δυνατός πόνος στο σπίτι" })).not.toBeInTheDocument();
  });

  it("more days on request; a patient without a program says so", async () => {
    load.loadPatientProgress.mockResolvedValue({ ...progress, programs: [], rows: [] });
    render((await openPatient({ days: "28" })) as ReactElement);
    expect(load.loadPatientProgress).toHaveBeenCalledWith({}, PATIENT, 28);
    expect(screen.getByText(/Δεν έχει ακόμα πρόγραμμα για το σπίτι/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Μέρα με τη μέρα" })).not.toBeInTheDocument();
  });

  it("an unknown patient (or another clinic's) is «Δεν βρέθηκε»; an assistant goes home", async () => {
    load.loadPatientProgress.mockResolvedValue(null);
    await expect(openPatient()).rejects.toMatchObject({ notFound: true });
    member.role = "assistant";
    await expect(openPatient()).rejects.toMatchObject({ to: "/" });
  });
});
