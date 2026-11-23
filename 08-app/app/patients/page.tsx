// «Ασθενείς» (owner and physio): every patient of the clinic with what they did at home, from the home
// diary their letter (/p/<token>) fills in. A pink «Δυνατός πόνος» tag (pain 7 or more nobody has
// marked «Το είδα» yet) puts a patient first; then whoever ticked most recently.
// Assistants go home: pain and notes are for physios (the database gives them no diary rows anyway).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AutoRefresh } from "@/app/components/paper/AutoRefresh";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { TabName } from "@/app/components/paper/TabLink";
import { cx } from "@/app/lib/cx";
import { isHighPain } from "@/app/lib/home/log";
import { loadPatients } from "@/app/lib/home/load";
import { daysAgo, type PatientSummary } from "@/app/lib/home/progress";
import { requireMember } from "@/app/lib/onboarding/session";
import { WORK_TAB } from "@/app/lib/tabs";

export const metadata: Metadata = { title: "Ασθενείς" };

export default async function PatientsPage() {
  const { supabase, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  const { today, patients } = await loadPatients(supabase);
  const alerts = patients.filter((patient) => patient.unseenPain > 0).length;

  return (
    <StaffSheet profile={profile} current="patients">
      <TabName name={WORK_TAB} />
      <AutoRefresh />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[36px] leading-[1.05] sm:text-[40px]">Ασθενείς</h1>
          <p className="text-muted">Τι κάνουν στο σπίτι με το πρόγραμμά τους: ό,τι σημειώνουν στο γράμμα τους.</p>
        </div>

        {alerts > 0 && (
          <p role="status" className="bg-tab-pink px-4 py-3 font-semibold">
            {alerts === 1 ? "1 ασθενής ανέφερε δυνατό πόνο. Είναι πρώτος στη λίστα." : `${alerts} ασθενείς ανέφεραν δυνατό πόνο. Είναι πρώτοι στη λίστα.`}
          </p>
        )}

        {patients.length === 0 ? (
          <p className="bg-tab-yellow px-4 py-3">
            Δεν υπάρχουν ακόμα ασθενείς. Ο πρώτος μπαίνει εδώ με την πρώτη <Link href="/notes/new">Νέα συνεδρία</Link>.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {patients.map((patient) => (
              <li key={patient.id}>
                <PatientRow patient={patient} today={today} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </StaffSheet>
  );
}

// One patient: the whole row is the link to their page.
function PatientRow({ patient, today }: { patient: PatientSummary; today: string }) {
  const flagged = patient.unseenPain > 0;
  return (
    <Link
      href={`/patients/${patient.id}`}
      className={cx(
        "flex min-h-[76px] flex-wrap items-center gap-x-6 gap-y-2 rounded-md border-2 bg-white px-4 py-3 text-ink no-underline hover:border-action hover:text-ink",
        flagged ? "border-tab-pink" : "border-line",
      )}
    >
      <span className="flex min-w-0 flex-[1_1_220px] flex-col">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[20px] font-semibold">{patient.label}</span>
          {flagged && <span className="bg-tab-pink px-2 py-0.5 text-[15px] font-bold">Δυνατός πόνος</span>}
        </span>
        <span className="text-muted">{patient.program ? patient.program.title : "Χωρίς πρόγραμμα για το σπίτι"}</span>
      </span>
      <span className="flex flex-[1_1_300px] flex-wrap gap-x-6 gap-y-1">
        <Fact label="Τελευταία φορά" value={patient.lastDay ? daysAgo(patient.lastDay, today) : "ποτέ"} />
        <Fact label="Τελευταίες 7 μέρες" value={`${patient.activeDays} από 7 μέρες`} />
        {patient.latestPain && (
          <Fact
            label="Πόνος"
            value={`${patient.latestPain.pain}/10`}
            strong={isHighPain(patient.latestPain.pain)}
          />
        )}
      </span>
      <span aria-hidden="true" className="ml-auto text-2xl text-action">
        →
      </span>
    </Link>
  );
}

function Fact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="flex flex-col leading-snug">
      <span className="text-[15px] text-muted">{label}</span>
      <span className={cx("font-semibold", strong && "text-error")}>{value}</span>
    </span>
  );
}
