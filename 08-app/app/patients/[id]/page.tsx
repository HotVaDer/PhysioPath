// One patient's home diary (owner and physio), «day by day» (design B, 2026-11-22): what they did at home
// with their program, newest day first, each day with «2 από 3» and that day's ticks, pain and notes right
// under it, so a note is read with the day it was written. On top: a pink box with the pain reports
// waiting for «Το είδα», and a short summary (days with exercises this week, the pain line).
// Only what the patient wrote in their letter; the clinical note stays on the program page.
import type { Route } from "next";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import * as z from "zod";

import { AutoRefresh } from "@/app/components/paper/AutoRefresh";
import { PaperLink, SubmitButton } from "@/app/components/paper/Buttons";
import { Panel, PanelTitle, PartTitle, StaffSheet } from "@/app/components/paper/StaffSheet";
import { TabName } from "@/app/components/paper/TabLink";
import { cx } from "@/app/lib/cx";
import { seeHomePain } from "@/app/lib/home/actions";
import { lastDays, longDayName } from "@/app/lib/home/log";
import { loadPatientProgress } from "@/app/lib/home/load";
import {
  activeDays,
  diaryDays,
  exerciseNames,
  firstDayOf,
  isLate,
  isUnseenPain,
  painByDay,
  programTitle,
  type DiaryDay,
  type DiaryEntry,
} from "@/app/lib/home/progress";
import { requireMember } from "@/app/lib/onboarding/session";
import { WORK_TAB } from "@/app/lib/tabs";

import { PainLine } from "./PainLine";

export const metadata: Metadata = { title: "Ασθενής" };

// How many days back: two weeks, or more on request («Περισσότερες μέρες»).
const WINDOWS = [14, 28, 56] as const;

const longDate = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Nicosia" });

export default async function PatientPage({ params, searchParams }: PageProps<"/patients/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const days = WINDOWS.find((n) => String(n) === query.days) ?? WINDOWS[0];
  const seen = query.seen === "1" ? "ok" : query.seen === "failed" ? "failed" : null;

  const { supabase, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  const progress = await loadPatientProgress(supabase, id, days);
  if (!progress) notFound();
  const { today, patient, programs, rows } = progress;

  const current = programs[0] ?? null;
  const names = new Map(programs.map((program) => [program.id, exerciseNames(program)]));
  const diary = diaryDays(programs, rows, today, days);
  const window = lastDays(today, days).filter((day) => !current || day >= firstDayOf(programs[programs.length - 1]));
  const pains = painByDay(rows, window);
  const known = pains.filter((point) => point.pain !== null);
  const alerts = rows
    .filter(isUnseenPain)
    .sort((a, b) => b.day.localeCompare(a.day))
    .map((row) => ({ ...row, name: names.get(row.program_id)?.[row.exercise] ?? `Άσκηση ${row.exercise + 1}` }));
  const more = WINDOWS.find((n) => n > days);

  return (
    <StaffSheet profile={profile} current="patients">
      <TabName name={WORK_TAB} />
      <AutoRefresh />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link href="/patients" className="self-start">
            <span aria-hidden="true">←</span> Ασθενείς
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="font-display text-[36px] leading-[1.05] sm:text-[40px]">{patient.label}</h1>
              <p className="text-muted">
                {current
                  ? `${programTitle(current)} · από ${longDate.format(new Date(current.approved_at))}`
                  : "Δεν έχει ακόμα πρόγραμμα για το σπίτι."}
                {patient.archived && " · Αρχειοθετημένος"}
              </p>
            </div>
            {current && <PaperLink href={`/programs/${current.id}` as Route}>Το πρόγραμμα →</PaperLink>}
          </div>
        </div>

        {seen === "ok" && (
          <p role="status" className="bg-note-green px-4 py-3 font-semibold">
            Εντάξει, το είδατε. Αν ο πόνος ξαναπεράσει το 7, θα το δείτε εδώ ξανά.
          </p>
        )}
        {seen === "failed" && (
          <p role="alert" className="bg-tab-pink px-4 py-3 font-semibold">
            Δεν αποθηκεύτηκε. Δοκιμάστε ξανά.
          </p>
        )}

        {alerts.length > 0 && (
          <Panel tint="pink" labelledBy="pain-title">
            <PanelTitle id="pain-title">Δυνατός πόνος στο σπίτι</PanelTitle>
            <ul className="flex flex-col gap-2">
              {alerts.map((row) => (
                <li key={`${row.program_id}-${row.day}-${row.exercise}`}>
                  <span className="font-semibold">
                    {longDayName(row.day)} · {row.name} · πόνος {row.pain}/10
                  </span>
                  {row.status === "skipped" && " · δεν την έκανε"}
                  {isLate(row) && <span className="text-muted"> · σημειώθηκε αργότερα</span>}
                  {row.note && <span className="block">«{row.note}»</span>}
                </li>
              ))}
            </ul>
            <form action={seeHomePain} className="pt-1">
              <input type="hidden" name="clinicId" value={profile.clinic_id ?? ""} />
              <input type="hidden" name="patientId" value={patient.id} />
              <SubmitButton pending="Αποθήκευση…">Το είδα</SubmitButton>
            </form>
          </Panel>
        )}

        {current && (
          <section aria-labelledby="summary-title" className="flex flex-col gap-4">
            <PartTitle id="summary-title">Με μια ματιά</PartTitle>
            <div className="flex flex-wrap gap-x-12 gap-y-6">
              <div className="flex flex-col gap-1">
                <p className="text-muted">Τελευταίες 7 μέρες</p>
                <p className="font-display text-[28px] leading-tight">
                  {activeDays(rows, today)} <span className="text-[19px] font-normal">από 7 μέρες με ασκήσεις</span>
                </p>
              </div>
              <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                <p className="text-muted">
                  Πόνος, ο μεγαλύτερος της μέρας{known.length > 1 && <> · από {known[0].pain} σε {known.at(-1)!.pain}</>}
                </p>
                <PainLine points={pains} />
              </div>
            </div>
          </section>
        )}

        {current && (
          <section aria-labelledby="diary-title" className="flex flex-col gap-4">
            <PartTitle id="diary-title" note="Ό,τι σημείωσε ο ασθενής στο γράμμα του, πιο πρόσφατο πρώτο.">
              Μέρα με τη μέρα
            </PartTitle>
            <ol className="flex flex-col">
              {diary.map((day) => (
                <DayBlock key={day.day} day={day} today={today} />
              ))}
            </ol>
            {more && diary.length === days && (
              <Link href={`/patients/${patient.id}?days=${more}` as Route} className="self-start">
                Περισσότερες μέρες ({more})
              </Link>
            )}
          </section>
        )}

        {programs.length > 1 && (
          <section aria-labelledby="older-title" className="flex flex-col gap-2">
            <h2 id="older-title" className="text-[19px] font-bold">
              Παλαιότερα προγράμματα
            </h2>
            <ul className="flex flex-col gap-1">
              {programs.slice(1).map((program) => (
                <li key={program.id}>
                  <Link href={`/programs/${program.id}` as Route}>{programTitle(program)}</Link>
                  <span className="text-muted"> · {longDate.format(new Date(program.approved_at))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </StaffSheet>
  );
}

// One day: its name and «2 από 3», then that day's ticks with pain and notes.
function DayBlock({ day, today }: { day: DiaryDay; today: string }) {
  const all = day.total > 0 && day.done >= day.total;
  return (
    <li className="flex flex-col gap-2 border-t-2 border-hairline py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="text-[19px] font-semibold">
          {day.day === today ? "Σήμερα · " : ""}
          {longDayName(day.day)}
        </h3>
        <p className={cx(all ? "font-bold text-action" : day.entries.length ? "font-semibold" : "text-muted")}>
          {day.entries.length === 0 ? "τίποτα" : `${day.done} από ${day.total}${all ? " ✓" : ""}`}
        </p>
      </div>
      {day.entries.length > 0 && (
        <ul className="flex flex-col gap-1.5 ps-1">
          {day.entries.map((entry) => (
            <Entry key={`${entry.exercise}-${entry.name}`} entry={entry} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Entry({ entry }: { entry: DiaryEntry }) {
  const done = entry.status === "done";
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
      <span aria-hidden="true" className={cx("font-bold", done ? "text-action" : "text-muted")}>
        {done ? "✓" : "✗"}
      </span>
      <span>
        <span className="sr-only">{done ? "Την έκανε: " : "Δεν την έκανε: "}</span>
        <span className="font-semibold">{entry.name}</span>
        {entry.pain !== null && (
          <span className={cx(entry.pain >= 7 && "font-bold text-error")}> · πόνος {entry.pain}/10</span>
        )}
        {!done && <span className="text-muted"> · δεν μπόρεσε</span>}
        {entry.late && <span className="text-muted"> · σημειώθηκε αργότερα</span>}
        {entry.note && <span className="block">«{entry.note}»</span>}
      </span>
    </li>
  );
}
