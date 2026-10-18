"use client";
// The room board: every patient whose session is running, at a glance. Who is exercising, who has
// finished, and above all who needs the physio (a question or pain), so the physio can work with
// several patients without walking back and forth to check. Refreshes every 2 seconds.
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button, ButtonLink } from "@/app/components/ui/Button";
import { CheckIcon, PlusIcon } from "@/app/components/ui/icons";
import { useDraft } from "@/app/context/DraftContext";
import { listSessionsRequest, physioAction } from "@/app/lib/api";
import { cx } from "@/app/lib/cx";
import { type BoardStatus, type Session, boardStatus, currentExercise, exercisesDone, setsTarget } from "@/app/lib/session";

const POLL_MS = 2000;

const minutesAgo = (from: string, now: string) => {
  const minutes = Math.floor((Date.parse(now) - Date.parse(from)) / 60_000);
  return minutes < 1 ? "μόλις τώρα" : minutes === 1 ? "πριν από 1 λεπτό" : `πριν από ${minutes} λεπτά`;
};

const displayName = (session: Session) => session.program.patient_first_name?.trim() || session.program.title || "Ασθενής";

// The badge in words, so colour is never the only clue.
function StatusBadge({ session, now }: { session: Session; now: string }) {
  const status = boardStatus(session);
  const call = session.call;
  const look: Record<BoardStatus, string> = {
    "needs-you": call?.reason === "pain" ? "bg-danger text-background" : "bg-warning text-background",
    done: "bg-success text-background",
    working: "border border-border-strong text-muted",
  };
  const text = call ? `Χρειάζεται εσάς · ${call.reason === "pain" ? "Πόνος" : "Απορία"}` : status === "done" ? "Τελείωσε" : "Ασκείται";
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={cx("label-mono rounded-xs px-2 py-1", look[status])}>{text}</span>
      {call && <span className="text-muted">{minutesAgo(call.at, now)}</span>}
    </p>
  );
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
      <article
        aria-labelledby={`patient-${session.id}`}
        className={cx("h-full border-t-4 pt-4", status === "needs-you" ? (session.call?.reason === "pain" ? "border-danger" : "border-warning") : status === "done" ? "border-success" : "border-border")}
      >
        <h2 id={`patient-${session.id}`} className="text-2xl font-extrabold tracking-tight italic">
          {displayName(session)}
        </h2>
        {session.program.patient_first_name && <p className="text-muted">{session.program.title}</p>}

        <div className="mt-3">
          <StatusBadge session={session} now={now} />
        </div>

        <p className="mt-4 text-lg">
          {exercise ? (
            <>
              <span className="font-semibold">
                Άσκηση {current + 1} από {total}
              </span>{" "}
              · {exercise.name}
              {sets > 1 && ` · σετ ${session.setsDone[current] + 1} από ${sets}`}
            </>
          ) : (
            <span className="font-semibold">
              {exercisesDone(session)} από {total} ασκήσεις
            </span>
          )}
        </p>
        <ol aria-hidden="true" className="mt-2 flex gap-1">
          {session.program.exercises.map((_, i) => (
            <li key={i} className={cx("h-2 flex-1", session.setsDone[i] >= setsTarget(session, i) ? "bg-success" : i === current ? "bg-primary" : "bg-surface-muted")} />
          ))}
        </ol>

        {error && (
          <p role="alert" className="mt-3 font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {session.call && (
            <Button variant="primary" icon={<CheckIcon />} loading={busy === "clear"} onClick={() => void run("clear")}>
              Το είδα
            </Button>
          )}
          <Button variant={status === "done" && !session.call ? "primary" : "secondary"} loading={busy === "finish"} onClick={() => void run("finish")}>
            Ολοκλήρωση<span className="sr-only"> συνεδρίας: {displayName(session)}</span>
          </Button>
          <ButtonLink href={`/session/${session.id}` as Route} variant="ghost">
            QR / οθόνη ασθενή<span className="sr-only">: {displayName(session)}</span>
          </ButtonLink>
        </div>
      </article>
    </li>
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
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg text-muted" aria-live="polite">
          {sessions.length === 0
            ? "Δεν υπάρχουν ασθενείς στην αίθουσα."
            : `${sessions.length} ${sessions.length === 1 ? "ασθενής" : "ασθενείς"} · ${waiting.length === 0 ? "κανείς δεν σας περιμένει" : waiting.length === 1 ? "1 χρειάζεται εσάς" : `${waiting.length} χρειάζονται εσάς`}`}
        </p>
        <Button variant={sessions.length === 0 ? "primary" : "secondary"} size="lg" icon={<PlusIcon />} onClick={newPatient}>
          Νέος ασθενής
        </Button>
      </div>

      <p className="sr-only" aria-live="assertive">
        {announcement}
      </p>

      {offline && (
        <p role="alert" className="mt-6 font-semibold text-danger">
          Χάθηκε η σύνδεση με τον server. Τρέχει ακόμα το npm run dev;
        </p>
      )}

      {sessions.length > 0 && (
        <ul className="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} now={now} onChanged={() => void refresh()} />
          ))}
        </ul>
      )}
    </>
  );
}
