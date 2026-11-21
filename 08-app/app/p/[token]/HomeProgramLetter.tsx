// What the patient sees at /p/<token>, from the data home_program() returned (page.tsx loads and checks
// it), so it can be tested without a database.
// The idea: a letter from the clinic. Its letterhead (name, city, a phone to tap) says who it's from; the
// letter line says who it's for and the day it was written; the title is what the program is about
// («Αριστερό γόνατο · εβδομάδα 3»), with one opening sentence in the clinic's own voice, and the next
// appointment right there, as a card to keep. Then the day's work as a path («Σήμερα: 2 από 5»), the
// physio's instructions in the app's flat boxes (yellow «Αποφύγετε», pink «Πάρτε μας τηλέφωνο αν» with a
// call button), a closing line and the physio's name like a signature.
// On a laptop and on paper the instructions sit in a column beside the exercises. Printed, it is a sheet
// for the fridge, with day boxes to tick with a pen.
// Every text here is the physio's or neutral: it never advises, diagnoses or suggests treatment, and it
// never guesses the patient's gender.
import type { ReactNode } from "react";

import { AvoidIcon, CalendarIcon, PhoneIcon } from "@/app/components/patient/icons";
import { PatientSheet } from "@/app/components/patient/PatientSheet";
import { cx } from "@/app/lib/cx";
import { doseLines, isBlank } from "@/app/lib/notes/format";
import { ExerciseChecklist, type ChecklistExercise } from "@/app/p/[token]/ExerciseChecklist";
import { HomeBar } from "@/app/p/[token]/HomeBar";

type Text = string | null | undefined;

// The same shape page.tsx checks with zod (loose: older programs may miss fields).
export type HomeProgramLetterProps = {
  token: string;
  program: {
    title?: string;
    patient_first_name?: Text;
    exercises: { name: string; sets?: number | null; reps?: Text; hold?: Text; frequency?: Text; notes?: Text }[];
    after_exercises?: string[];
    avoid?: string[];
    contact_if?: string[];
    other?: string[];
    next_appointment?: Text;
  };
  approvedAt: string;
  approvedBy: string | null;
  clinicName: string;
  clinicCity: string | null;
  clinicPhone: string | null;
};

const clean = (text: Text) => (isBlank(text) ? null : text!.trim());
const lines = (items?: string[]) => (items ?? []).map((item) => item.trim()).filter(Boolean);
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
// «Αριστερό γόνατο · εβδομάδα 3»: a separator stays on the line before it, never starts a new one.
const keepSeparators = (text: string) => text.replace(/ ([·–—-]) /g, " $1 ");

const longDate = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Nicosia" });
const formatDay = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : longDate.format(date);
};

// The two columns (the main one, and the instructions beside it) on paper, and on screen when the sheet
// is at least 42rem wide at the chosen text size: a laptop at normal or medium size, but one column on
// a phone, a tablet, or a laptop at «Μεγάλα», where two columns would squeeze the words.
const columns =
  "@min-[42rem]:grid @min-[42rem]:grid-cols-[minmax(0,1fr)_17rem] @min-[42rem]:gap-x-12 print:grid print:grid-cols-[minmax(0,1fr)_17rem] print:gap-x-12";

export function HomeProgramLetter({ token, program, approvedAt, approvedBy, clinicName, clinicCity, clinicPhone }: HomeProgramLetterProps) {
  const clinic = clinicName.trim();
  const name = clean(program.patient_first_name);
  const title = clean(program.title);
  const city = clean(clinicCity);
  const phone = clean(clinicPhone);
  const next = clean(program.next_appointment);
  const day = formatDay(approvedAt);
  const after = lines(program.after_exercises);
  const avoid = lines(program.avoid);
  const contactIf = lines(program.contact_if);
  const other = lines(program.other);
  const hasInstructions = after.length + avoid.length + contactIf.length + other.length > 0;
  const exercises: ChecklistExercise[] = program.exercises
    .filter((exercise) => !isBlank(exercise.name))
    .map((exercise) => ({
      name: exercise.name.trim(),
      dose: doseLines({
        name: exercise.name,
        sets: exercise.sets ?? null,
        reps: exercise.reps ?? null,
        hold: exercise.hold ?? null,
        frequency: exercise.frequency ?? null,
        notes: null,
      }),
      notes: clean(exercise.notes),
    }));

  return (
    <PatientSheet
      wide={hasInstructions}
      bar={<HomeBar />}
      letterhead={<Letterhead name={clinic} city={city} phone={phone} />}
      footer={<Closing approvedBy={clean(approvedBy)} clinic={clinic} phone={phone} />}
    >
      {/* The letter's opening: for whom and when, what it is about, and the next appointment beside it. */}
      <div className="flex flex-col gap-5">
        {(name || day) && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            {name ? (
              <p className="text-[1.2rem]">
                <span className="text-muted">Για:</span> <span className="font-typed text-[1.3rem] font-bold">{name}</span>
              </p>
            ) : (
              <span />
            )}
            {day && (
              <p className="text-muted">
                <time dateTime={approvedAt}>{day}</time>
              </p>
            )}
          </div>
        )}

        <div className={cx("flex flex-col gap-5", next && hasInstructions && cx(columns, "@min-[42rem]:items-end print:items-end"))}>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[min(2rem,10vw)] leading-[1.1] text-balance sm:text-[2.5rem]">
              {title ? keepSeparators(title) : "Το πρόγραμμά σας για το σπίτι"}
            </h1>
            <p className="text-[1.15rem] text-balance">
              {title ? "Το πρόγραμμά σας για το σπίτι, όπως το είπαμε στη συνεδρία." : "Οι ασκήσεις και οι οδηγίες σας, όπως τις είπαμε στη συνεδρία."}
            </p>
          </div>
          {next && <NextAppointment text={next} />}
        </div>
      </div>

      {/* The day's work, and the physio's instructions beside it (under it on a phone). */}
      <div className={cx("flex flex-col gap-10", hasInstructions && cx(columns, "@min-[42rem]:items-start print:items-start"))}>
        {exercises.length > 0 ? (
          <ExerciseChecklist token={token} exercises={exercises} printColumns={!hasInstructions} />
        ) : (
          <p className="text-[1.1rem]">Αυτό το πρόγραμμα δεν έχει ασκήσεις.</p>
        )}

        {hasInstructions && (
          <div className="flex flex-col gap-7 print:gap-4">
            <Section id="after-title" title="Μετά τις ασκήσεις" items={after} />
            <Section id="avoid-title" title="Αποφύγετε" items={avoid} tone="yellow" icon={<AvoidIcon className="size-[1.5rem]" />} />
            <Section id="call-title" title="Πάρτε μας τηλέφωνο αν" items={contactIf} tone="pink" icon={<PhoneIcon className="size-[1.5rem]" />}>
              {phone && (
                <>
                  <a
                    href={telHref(phone)}
                    aria-label={`Καλέστε μας, ${phone}`}
                    className="mt-2 flex min-h-[3.5rem] items-center justify-center gap-3 bg-action px-4 py-2.5 text-white no-underline hover:bg-action-hover hover:text-white print:hidden"
                  >
                    <PhoneIcon className="size-[1.5rem]" />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-[1.15rem] font-bold">Καλέστε μας</span>
                      <span className="text-[1.05rem] whitespace-nowrap">{phone}</span>
                    </span>
                  </a>
                  <p className="hidden font-bold print:block">Τηλέφωνο: {phone}</p>
                </>
              )}
            </Section>
            <Section id="other-title" title="Άλλες οδηγίες" items={other} />
          </div>
        )}
      </div>
    </PatientSheet>
  );
}

// Who the letter is from: the clinic's name, then its city and a phone to tap on one line (on the
// right of the name on a wider screen, or under it when there's no room: the name never squeezes).
// On paper the phone is plain text with its label.
function Letterhead({ name, city, phone }: { name: string; city: string | null; phone: string | null }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
      {/* Capped by the screen width, so a long word («Φυσιοθεραπεία») fits whole even at «Μεγάλα». */}
      <p className="font-display text-[min(1.45rem,9vw)] leading-tight sm:text-[1.45rem]">{name}</p>
      {(city || phone) && (
        <div className="flex flex-wrap items-center gap-x-5">
          {city && <p className="text-muted">{city}</p>}
          {phone && (
            <a
              href={telHref(phone)}
              aria-label={`Τηλέφωνο: ${phone}`}
              className="-ml-0.5 inline-flex min-h-[3rem] items-center gap-2 font-bold print:min-h-0 print:font-normal print:text-ink print:no-underline"
            >
              <PhoneIcon className="size-[1.2rem] print:hidden" />
              <span>
                {/* Written out on paper, where the icon isn't printed. */}
                <span className="hidden print:inline">Τηλέφωνο: </span>
                <span className="whitespace-nowrap">{phone}</span>
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// The next appointment, as a card to keep (white = something to keep, as on the staff pages).
function NextAppointment({ text }: { text: string }) {
  return (
    // The text goes under the icon when there isn't room beside it (very big text on a phone), so a
    // word like «Νοεμβρίου» is never split.
    <section
      aria-labelledby="next-title"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-2 border-action bg-white px-4 py-3.5 sm:px-5 print:break-inside-avoid print:border-ink"
    >
      <CalendarIcon className="size-[2rem] text-action print:text-ink" />
      <div className="flex min-w-0 flex-[1_1_10rem] flex-col">
        <h2 id="next-title" className="text-muted">
          Επόμενο ραντεβού
        </h2>
        <p className="font-display text-[1.3rem] leading-snug">{text}</p>
      </div>
    </section>
  );
}

// A list of the physio's instructions under a title. Plain on the paper, or a flat coloured box
// (yellow = take care, pink = call us), which on paper becomes a black border (colours may not print).
function Section({
  id,
  title,
  items,
  tone = "plain",
  icon,
  children,
}: {
  id: string;
  title: string;
  items: string[];
  tone?: "plain" | "yellow" | "pink";
  icon?: ReactNode;
  children?: ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section
      aria-labelledby={id}
      className={cx(
        "flex flex-col gap-2.5 print:break-inside-avoid",
        tone !== "plain" && "px-4 py-4 sm:px-5 print:border-2 print:border-ink print:px-4 print:py-3",
        tone === "yellow" && "bg-tab-yellow",
        tone === "pink" && "bg-tab-pink",
      )}
    >
      <h2 id={id} className="flex items-center gap-2.5 font-display text-[1.3rem] leading-tight text-balance">
        {icon}
        {title}
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 ps-6 text-[1.05rem] marker:text-ink">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {children}
    </section>
  );
}

// The closing, like the end of a letter: where to ask, then who prepared and approved the program.
function Closing({ approvedBy, clinic, phone }: { approvedBy: string | null; clinic: string; phone: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      {phone && (
        <p className="text-[1.1rem]">
          Για οποιαδήποτε απορία, καλέστε μας στο{" "}
          <a
            href={telHref(phone)}
            className="inline-flex min-h-[3rem] items-center font-bold whitespace-nowrap print:min-h-0 print:font-normal print:text-ink print:no-underline"
          >
            {phone}
          </a>
          .
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        <p className="text-muted">{approvedBy ? "Το ετοίμασε και το ενέκρινε" : "Το ενέκρινε"}</p>
        <p className="font-display text-[1.25rem] leading-snug">{approvedBy ?? clinic}</p>
        {approvedBy && <p className="text-muted">{clinic}</p>}
      </div>
    </div>
  );
}
