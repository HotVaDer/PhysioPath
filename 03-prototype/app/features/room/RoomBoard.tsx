"use client";
// The room board: every patient whose session is running, at a glance. Who is exercising, who has
// finished, and above all who needs the physio (a question or pain), so the physio can work with
// several patients without walking back and forth to check. Refreshes every 2 seconds.
// Calm by default; only alarms get strong colour: a pain card turns fully red, a question fully amber.
// Every state also has its own sign shape and words, and cards never move, so the physio learns where each patient is.
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button, ButtonLink } from "@/app/components/ui/Button";
import { CheckIcon, PlusIcon } from "@/app/components/ui/icons";
import { useDraft } from "@/app/context/DraftContext";
import { listSessionsRequest, physioAction } from "@/app/lib/api";
import { cx } from "@/app/lib/cx";
import { type CallReason, type Session, boardStatus, currentExercise, exercisesDone, setsTarget } from "@/app/lib/session";

const POLL_MS = 2000;

const minutesAgo = (from: string, now: string) => {
  const minutes = Math.floor((Date.parse(now) - Date.parse(from)) / 60_000);
  return minutes < 1 ? "μόλις τώρα" : minutes === 1 ? "πριν από 1 λεπτό" : `πριν από ${minutes} λεπτά`;
};

const displayName = (session: Session) => session.program.patient_first_name?.trim() || session.program.title || "Ασθενής";
const reasonWord = (reason: CallReason) => (reason === "pain" ? "Πόνος" : "Απορία");

// "Ώμος · εβδομάδα 3" from the note (the physio's own board, so the note may be used here).
const bodyLine = (session: Session) =>
  [session.note?.body_area, session.note?.stage].filter((part) => part?.trim()).join(" · ") ||
  (session.program.patient_first_name ? session.program.title : "");

// ---- Status signs: a different shape for each state, so colour is never the only clue ----

type Sign = "working" | CallReason | "done";
const OCTAGON = "[clip-path:polygon(29%_0,71%_0,100%_29%,100%_71%,71%_100%,29%_100%,0_71%,0_29%)]";

function StatusSign({ sign, inverse = false }: { sign: Sign; inverse?: boolean }) {
  const base = "inline-flex size-[1.25rem] shrink-0 items-center justify-center text-[0.8rem] leading-none font-bold";
  switch (sign) {
    case "working": // a half-filled circle: in the middle of it
      return <span aria-hidden="true" className={cx(base, "rounded-full border-3 border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]")} />;
    case "question": // a round "?"
      return (
        <span aria-hidden="true" className={cx(base, "rounded-full", inverse ? "bg-on-question text-question" : "bg-question text-on-question ring-2 ring-on-question ring-inset")}>
          ?
        </span>
      );
    case "pain": // an octagon "!", like a stop sign
      return (
        <span aria-hidden="true" className={cx(base, OCTAGON, inverse ? "bg-on-pain text-pain" : "bg-pain text-on-pain")}>
          !
        </span>
      );
    case "done": // a ticked square
      return (
        <span aria-hidden="true" className={cx(base, "rounded-[6px] bg-primary text-on-primary")}>
          <CheckIcon size={14} strokeWidth={3.4} />
        </span>
      );
  }
}

const signOf = (session: Session): Sign => session.call?.reason ?? (boardStatus(session) === "done" ? "done" : "working");

// ---- One patient's card ----

// The card's colours. Alarm cards set --card-bg / --card-fg for the "inverse" buttons, and their own
// focus colour, because the teal ring would not show on red or amber.
const LOOKS = {
  calm: {
    card: "border border-border bg-surface",
    sub: "text-muted",
    inset: "border border-border bg-background",
    boxDone: "bg-primary text-on-primary",
    boxNow: "border-3 border-primary text-foreground",
    boxNext: "border-2 border-border-strong text-muted",
    bar: "border-primary",
    barFill: "bg-primary",
    barHalf: "bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]",
    barNext: "border-border-strong",
  },
  pain: {
    card: "bg-pain text-on-pain [--card-bg:var(--pain)] [--card-fg:var(--on-pain)] [--focus:var(--on-pain)]",
    sub: "",
    inset: "bg-pain-inset",
    boxDone: "bg-on-pain text-pain",
    boxNow: "border-3 border-on-pain bg-pain-inset",
    boxNext: "border-2 border-dashed border-on-pain",
    bar: "border-on-pain",
    barFill: "bg-on-pain",
    barHalf: "bg-[linear-gradient(90deg,var(--on-pain)_50%,transparent_50%)]",
    barNext: "border-on-pain",
  },
  question: {
    card: "border-2 border-on-question bg-question text-on-question [--card-bg:var(--question)] [--card-fg:var(--on-question)] [--focus:var(--on-question)]",
    sub: "",
    inset: "border border-on-question bg-question-inset",
    boxDone: "bg-on-question text-question",
    boxNow: "border-3 border-on-question bg-question-inset",
    boxNext: "border-2 border-dashed border-on-question",
    bar: "border-on-question",
    barFill: "bg-on-question",
    barHalf: "bg-[linear-gradient(90deg,var(--on-question)_50%,transparent_50%)]",
    barNext: "border-on-question",
  },
};

// "Ασκήσεις: η 1 και η 2 έγιναν, τώρα η 3 από 4": what the numbered boxes show, for screen readers.
function exercisesSentence(session: Session) {
  const total = session.program.exercises.length;
  const done = session.setsDone.flatMap((d, i) => (d >= setsTarget(session, i) ? [i + 1] : []));
  const current = currentExercise(session);
  if (done.length === total) return `Ασκήσεις: ${total === 1 ? "η 1 έγινε" : `και οι ${total} έγιναν`}`;
  const donePart = done.length === 0 ? "" : `${done.map((n) => `η ${n}`).join(" και ")} ${done.length === 1 ? "έγινε" : "έγιναν"}, `;
  return `Ασκήσεις: ${donePart}τώρα η ${current + 1} από ${total}`;
}

function SessionCard({ session, now, onChanged }: { session: Session; now: string; onChanged: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "clear" | "finish">(null);
  const [error, setError] = useState<string | null>(null);
  const status = boardStatus(session);
  const current = currentExercise(session);
  const total = session.program.exercises.length;
  const exercise = current >= 0 ? session.program.exercises[current] : null;
  const sets = current >= 0 ? setsTarget(session, current) : 0;
  const setsDone = current >= 0 ? session.setsDone[current] : 0;
  const look = LOOKS[session.call?.reason ?? "calm"];
  const alarm = Boolean(session.call);
  const name = displayName(session);
  const sub = bodyLine(session);

  async function run(kind: "clear" | "finish") {
    setBusy(kind);
    setError(null);
    try {
      const result = await physioAction(session.id, kind === "clear" ? "clearCall" : "finish");
      if (kind === "finish" && result.approvedId) router.push(`/approved/${result.approvedId}` as Route);
      else onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Δεν ολοκληρώθηκε. Δοκιμάστε ξανά.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li>
      <article aria-labelledby={`patient-${session.id}`} className={cx("flex h-full flex-col gap-3 rounded-card p-5", look.card)}>
        <div>
          <h2 id={`patient-${session.id}`} className="text-[2rem] leading-[1.05] font-bold">
            {name}
          </h2>
          {sub && <p className={cx("mt-1 text-[1.2rem] font-semibold", look.sub)}>{sub}</p>}
        </div>

        <p className={cx("flex flex-wrap items-center gap-x-2 gap-y-1", status === "done" && "text-primary-text")}>
          <StatusSign sign={signOf(session)} inverse={alarm} />
          <span className="font-bold">
            {session.call ? `Χρειάζεται εσάς · ${reasonWord(session.call.reason)}` : status === "done" ? "Τελείωσε" : "Ασκείται"}
          </span>
          {session.call && (
            <>
              {" "}
              <span>{minutesAgo(session.call.at, now)}</span>
            </>
          )}
        </p>

        {/* The exercises as numbered boxes: filled = done, thick outline = now, thin or dashed = to come. */}
        <p className="sr-only">{exercisesSentence(session)}</p>
        <ol aria-hidden="true" className="flex flex-wrap gap-2">
          {session.program.exercises.map((_, i) => (
            <li
              key={i}
              className={cx(
                "flex size-[2.2rem] items-center justify-center rounded-[12px] font-bold",
                session.setsDone[i] >= setsTarget(session, i) ? look.boxDone : i === current ? look.boxNow : look.boxNext,
              )}
            >
              {i + 1}
            </li>
          ))}
        </ol>

        {exercise ? (
          <div className={cx("flex flex-col gap-2 rounded-tile px-4 py-3", look.inset)}>
            <span className="text-[1.35rem] leading-tight font-bold">{exercise.name}</span>
            {sets > 1 && (
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex max-w-[12rem] flex-1 gap-1.5">
                  {Array.from({ length: sets }, (_, i) => (
                    <span
                      key={i}
                      className={cx("h-[0.8rem] flex-1 rounded-full border-2", i < setsDone ? cx(look.bar, look.barFill) : i === setsDone ? cx(look.bar, look.barHalf) : look.barNext)}
                    />
                  ))}
                </span>
                <span className="label">
                  Σετ {setsDone + 1} από {sets}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 rounded-tile border border-primary bg-success-bg px-4 py-3 text-success">
            <span className="label">Όλες οι ασκήσεις</span>
            <span className="text-[1.35rem] leading-tight font-bold">
              {exercisesDone(session)} από {total} έγιναν
            </span>
          </div>
        )}

        {error && (
          <p role="alert" className={cx("font-bold", !alarm && "text-danger")}>
            {error}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-1">
          {session.call && (
            <Button variant="inverse" icon={<CheckIcon />} loading={busy === "clear"} onClick={() => void run("clear")}>
              Το είδα
            </Button>
          )}
          <Button variant={alarm ? "inverse-outline" : status === "done" ? "primary" : "secondary"} loading={busy === "finish"} onClick={() => void run("finish")}>
            Ολοκλήρωση<span className="sr-only"> συνεδρίας: {name}</span>
          </Button>
          <ButtonLink href={`/session/${session.id}` as Route} variant={alarm ? "inverse-outline" : "secondary"}>
            QR / οθόνη ασθενή<span className="sr-only">: {name}</span>
          </ButtonLink>
        </div>
      </article>
    </li>
  );
}

// ---- The summary at the top: four counts, and who is waiting, in the order they called ----

function Summary({ sessions, now }: { sessions: Session[]; now: string }) {
  const waiting = sessions.filter((s) => s.call).sort((a, b) => a.call!.at.localeCompare(b.call!.at));
  const done = sessions.filter((s) => !s.call && boardStatus(s) === "done").length;
  const cell = "flex flex-col-reverse gap-0.5 rounded-tile px-4 py-3";
  const count = "text-[2.2rem] leading-none font-bold";
  return (
    <section aria-labelledby="summary-heading" className="flex flex-wrap items-stretch gap-x-8 gap-y-5 rounded-card border border-border bg-surface p-5">
      <h2 id="summary-heading" className="sr-only">
        Σύνοψη αίθουσας
      </h2>
      <dl className="grid flex-[1_1_28rem] grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={cx(cell, "bg-background")}>
          <dt className="label text-muted">Στην αίθουσα</dt>
          <dd className={count}>{sessions.length}</dd>
        </div>
        <div className={cx(cell, waiting.length ? "bg-pain text-on-pain" : "bg-background")}>
          <dt className={cx("label", waiting.length ? "font-bold" : "text-muted")}>Χρειάζονται εσάς</dt>
          <dd className={count}>{waiting.length}</dd>
        </div>
        <div className={cx(cell, "bg-background")}>
          <dt className="label text-muted">Ασκούνται</dt>
          <dd className={count}>{sessions.length - waiting.length - done}</dd>
        </div>
        <div className={cx(cell, "bg-success-bg text-success")}>
          <dt className="label">Τελείωσαν</dt>
          <dd className={count}>{done}</dd>
        </div>
      </dl>
      {waiting.length > 0 && (
        <div className="flex flex-[1_1_18rem] flex-col gap-2">
          <p className="label text-muted">Σας χρειάζονται, με τη σειρά που κάλεσαν</p>
          <ol className="flex flex-col gap-2">
            {waiting.map((s) => (
              <li key={s.id} className={cx("flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-[14px] px-3 py-1.5", s.call!.reason === "pain" ? "bg-danger-bg" : "bg-warning-bg")}>
                <StatusSign sign={s.call!.reason} />
                <span>
                  <span className="font-bold">{displayName(s)}</span> ·{" "}
                  <span className={cx("font-bold", s.call!.reason === "pain" ? "text-danger" : "text-warning")}>{reasonWord(s.call!.reason)}</span>
                </span>{" "}
                <span className="ml-auto text-base text-muted">{minutesAgo(s.call!.at, now)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Legend() {
  const items: [Sign, string][] = [
    ["working", "Ασκείται"],
    ["question", "Απορία"],
    ["pain", "Πόνος"],
    ["done", "Τελείωσε"],
  ];
  return (
    <ul aria-label="Τι σημαίνουν τα σήματα" className="flex flex-wrap gap-x-6 gap-y-2 text-base text-muted">
      {items.map(([sign, label]) => (
        <li key={sign} className="flex items-center gap-2">
          <StatusSign sign={sign} />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function RoomBoard({ initial, initialNow }: { initial: Session[]; initialNow: string }) {
  const { dispatch } = useDraft();
  const router = useRouter();
  const [sessions, setSessions] = useState(initial);
  const [now, setNow] = useState(initialNow);
  const [offline, setOffline] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const knownCalls = useRef(new Set(initial.filter((s) => s.call).map((s) => `${s.id}:${s.call!.at}`)));

  async function refresh() {
    try {
      const data = await listSessionsRequest();
      setSessions(data.sessions);
      setNow(data.now);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // New calls: said out loud to screen readers, and counted in the tab title so they show from another tab.
  const waiting = sessions.filter((s) => s.call);
  const callKeys = waiting.map((s) => `${s.id}:${s.call!.at}`).join("|"); // changes only when the calls change
  useEffect(() => {
    const calling = sessions.filter((s) => s.call);
    const fresh = calling.filter((s) => !knownCalls.current.has(`${s.id}:${s.call!.at}`));
    knownCalls.current = new Set(calling.map((s) => `${s.id}:${s.call!.at}`));
    if (fresh.length) setAnnouncement(fresh.map((s) => `${displayName(s)}: χρειάζεται εσάς (${s.call!.reason === "pain" ? "πόνος" : "απορία"})`).join(". "));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the calls change, not on every refresh
  }, [callKeys]);

  // Set again after every refresh: Next.js writes the page's own title after the first render.
  useEffect(() => {
    document.title = waiting.length ? `(${waiting.length}) Η αίθουσα · PhysioPath` : "Η αίθουσα · PhysioPath";
  }, [waiting.length, now]);

  function newPatient() {
    dispatch({ type: "reset" });
    router.push("/new");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-base text-muted" aria-live="polite">
          <span aria-hidden="true" className={cx("size-2.5 rounded-full", offline ? "bg-danger" : "bg-primary")} />
          {sessions.length === 0
            ? "Δεν υπάρχουν ασθενείς στην αίθουσα."
            : `${sessions.length} ${sessions.length === 1 ? "ασθενής" : "ασθενείς"} · ${waiting.length === 0 ? "κανείς δεν σας περιμένει" : waiting.length === 1 ? "1 χρειάζεται εσάς" : `${waiting.length} χρειάζονται εσάς`}`}
        </p>
        <Button variant="primary" size="lg" icon={<PlusIcon />} onClick={newPatient}>
          Νέος ασθενής
        </Button>
      </div>

      <p className="sr-only" aria-live="assertive">
        {announcement}
      </p>

      {offline && (
        <p role="alert" className="font-semibold text-danger">
          Χάθηκε η σύνδεση με τον server. Τρέχει ακόμα το npm run dev;
        </p>
      )}

      {sessions.length > 0 && (
        <>
          <Summary sessions={sessions} now={now} />
          <Legend />
          {/* Cards stay in the order patients arrived, so each one is always in the same place. */}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} now={now} onChanged={() => void refresh()} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
