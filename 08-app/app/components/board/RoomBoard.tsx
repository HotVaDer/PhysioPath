"use client";
// The room board («Η αίθουσα»), for every role. Layout from the design canvas, page «Αίθουσα», board
// «Physio · room board» (https://claude.ai/artifact/SNapakX6eXEUocFVggDnWu, project/RoomBoard.dc.html),
// redrawn in the plain look (2026-11-18): paper colours, Literata, green actions, square corners.
//   1. «Η αίθουσα», «Ενημερώθηκε τώρα», «+ Νέα συνεδρία»
//   2. Summary: four numbers (in the room / need you / exercising / finished) and who needs you, in the
//      order they called
//   3. What the signs mean
//   4. One card per patient, in room and bed order (cards never move): a big name, the program, the
//      state with its sign, numbered exercise boxes, the exercise now with its sets, and the buttons.
//      Only patients who need you get colour: the whole card red for pain, yellow for a question.
// A state is never colour alone: there is always a word and a shape. Asks the server every 3 s (paused
// while the tab is hidden); new calls are announced to screen readers and counted in the tab's title.
// Clinic Wi-Fi drops: a press that doesn't reach the server says so on its card and the buttons work
// again; a refresh that started before a press can't put back what the press changed; signed out →
// the board stops asking and hides the patients.
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { finishCard, seeCall } from "@/app/lib/board/actions";
import type { BoardCard, BoardData } from "@/app/lib/board/board";
import { boardStatus, exercisesDone, isDone, minutesAgo, nowExercise, type BoardStatus, type CallReason } from "@/app/lib/board/session";
import { onePhoneTab } from "@/app/components/paper/TabLink";
import { cx } from "@/app/lib/cx";
import { slotLabel } from "@/app/lib/notes/approval";

const POLL_MS = 3000;
const TITLE = "Η αίθουσα · PhysioPath";
const REASON: Record<CallReason, string> = { pain: "Πόνος", question: "Απορία" };

type Result = { ok: true } | { ok: false; message: string };

const NOT_SENT = "Δεν στάλθηκε. Ελέγξτε τη σύνδεση και πατήστε ξανά.";
const NO_ANSWER = "Δεν πήραμε απάντηση. Ελέγξτε τη σύνδεση και πατήστε ξανά.";
const PRESS_WAIT_MS = 10_000; // a press with no answer by then is reported, so the card never hangs

// A press that has no answer in time: some networks hold a request instead of failing it.
class NoAnswer extends Error {}
function inTime<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new NoAnswer()), PRESS_WAIT_MS);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

class SignedOut extends Error {}

async function fetchBoard(): Promise<BoardData> {
  const response = await fetch("/api/board", { cache: "no-store" });
  if (response.status === 401) throw new SignedOut();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as BoardData;
}

// The card's look: plain for most, red for pain, yellow for a question.
type Tone = "plain" | "pain" | "question";
const toneOf = (card: BoardCard): Tone => (card.call ? card.call.reason : "plain");

export function RoomBoard({ initial, action, children }: { initial: BoardData; action?: ReactNode; children?: ReactNode }) {
  const [board, setBoard] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [now, setNow] = useState(() => new Date());
  const seenCalls = useRef(new Set(initial.cards.filter((c) => c.call).map((c) => `${c.id}@${c.call!.at}`)));
  // Goes up when a press starts and again when it ends. A refresh that started at another number
  // is older than the press, so its answer may not have the change yet: it is thrown away.
  const version = useRef(0);
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    const asked = version.current;
    try {
      const fresh = await fetchBoard();
      if (asked !== version.current || stopped.current) return;
      // Say each new call once, for screen readers: «Μαρία: χρειάζεται εσάς, πόνος».
      const freshCalls = fresh.cards.filter((c) => c.call && !seenCalls.current.has(`${c.id}@${c.call.at}`));
      if (freshCalls.length) {
        setAnnounce(freshCalls.map((c) => `${c.label}: χρειάζεται εσάς, ${REASON[c.call!.reason].toLowerCase()}`).join(". "));
        freshCalls.forEach((c) => seenCalls.current.add(`${c.id}@${c.call!.at}`));
      }
      setBoard(fresh);
      setNow(new Date());
      setOffline(false);
    } catch (error) {
      if (stopped.current) return;
      if (error instanceof SignedOut) {
        stopped.current = true; // no more asking, and no more names on screen
        setSignedOut(true);
        return;
      }
      if (asked === version.current) setOffline(true);
    }
  }, []);

  useEffect(() => {
    let gone = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) await refresh();
      if (!gone && !stopped.current) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  }, [refresh]);

  // Cards in room and bed order, so they never jump around; cards whose room was deleted come last.
  const roomOrder = new Map(board.rooms.map((r, i) => [r.id, i]));
  const placeOf = (card: BoardCard) => {
    const room = card.roomId ? board.rooms.find((r) => r.id === card.roomId) : undefined;
    return room && card.slot ? `${room.name} · ${slotLabel(room, card.slot)}` : "Χωρίς θέση";
  };
  const cards = [...board.cards].sort(
    (a, b) => (roomOrder.get(a.roomId ?? "") ?? 999) - (roomOrder.get(b.roomId ?? "") ?? 999) || (a.slot ?? 0) - (b.slot ?? 0),
  );
  const statuses = cards.map((c) => boardStatus(c));
  const count = (s: BoardStatus) => statuses.filter((x) => x === s).length;
  const calling = cards.filter((c) => c.call).sort((a, b) => a.call!.at.localeCompare(b.call!.at));
  const freePlaces = board.rooms.reduce((n, r) => n + r.beds + r.stations, 0) - cards.filter((c) => c.roomId && roomOrder.has(c.roomId)).length;

  useEffect(() => {
    document.title = calling.length ? `(${calling.length}) ${TITLE}` : TITLE;
    return () => {
      document.title = TITLE;
    };
  }, [calling.length]);

  // A press on a card. Returns the message for that card when the press didn't reach the server
  // (no connection): nothing changed, so it can simply be pressed again.
  async function act(run: () => Promise<Result>): Promise<string | null> {
    setMessage(null);
    version.current++;
    let problem: string | null = null;
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline"); // don't even try
      const result = await inTime(run());
      if (!result.ok) setMessage(result.message);
    } catch (error) {
      problem = error instanceof NoAnswer ? NO_ANSWER : NOT_SENT;
      setOffline(true);
    }
    version.current++;
    // Show the board as it is now. After a failed press the network is probably down too, so the
    // card doesn't wait for this; after a good one it waits, but never longer than PRESS_WAIT_MS.
    if (problem) void refresh();
    else await inTime(refresh()).catch(() => {});
    return problem;
  }

  if (signedOut) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-[40px] leading-[1.05] sm:text-[44px]">Η αίθουσα</h1>
        <p role="alert" className="bg-tab-yellow px-4 py-3">
          Αποσυνδεθήκατε, γι&apos; αυτό η αίθουσα δεν ανανεώνεται πια.
        </p>
        <Link href="/login" className="inline-flex min-h-12 items-center self-start bg-action px-5 font-bold text-white no-underline hover:bg-action-hover">
          Είσοδος
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div aria-live="assertive" className="sr-only">
        {announce}
      </div>

      {/* 1. Title, whether it is live, and the main action */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1 className="flex-[1_1_320px] font-display text-[40px] leading-[1.05] sm:text-[44px]">Η αίθουσα</h1>
        <p role="status" className="flex items-center gap-2 text-base text-muted">
          <span aria-hidden="true" className={cx("h-2.5 w-2.5 rounded-full", offline ? "bg-error" : "bg-action")} />
          {offline ? "Χωρίς σύνδεση · δοκιμάζουμε ξανά" : "Ενημερώθηκε τώρα"}
        </p>
        <FullScreenButton />
        {action}
      </div>

      {children}

      {message && (
        <p role="alert" className="bg-tab-yellow px-4 py-3">
          {message}
        </p>
      )}

      {/* 2. Summary: four numbers, and who needs you in the order they called */}
      <section aria-labelledby="summary" className="flex flex-wrap gap-x-8 gap-y-5 border-2 border-hairline bg-white px-5 py-5">
        <h2 id="summary" className="sr-only">
          Σύνοψη αίθουσας
        </h2>
        <dl className="grid flex-[1_1_520px] grid-cols-2 gap-3 sm:grid-cols-4">
          <Count label="Στην αίθουσα" value={cards.length} />
          <Count label="Χρειάζονται εσάς" value={count("calling")} tone={count("calling") > 0 ? "alarm" : "plain"} />
          <Count label="Ασκούνται" value={count("working")} />
          <Count label="Τελείωσαν" value={count("done")} tone="done" />
        </dl>
        <div className="flex flex-[1_1_340px] flex-col gap-2">
          <p className="text-base font-bold text-muted">Σας χρειάζονται, με τη σειρά που κάλεσαν</p>
          {calling.length === 0 ? (
            <p className="text-muted">Κανείς δεν σας περιμένει.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {calling.map((c) => (
                <li
                  key={c.id}
                  className={cx("flex min-h-12 flex-wrap items-center gap-x-2.5 gap-y-0.5 px-3 py-1.5", c.call!.reason === "pain" ? "bg-tab-pink" : "bg-tab-yellow")}
                >
                  <Sign status={c.call!.reason} />
                  <span>
                    <span className="font-bold">{c.label}</span> · <span className={cx("font-bold", c.call!.reason === "pain" && "text-error")}>{REASON[c.call!.reason]}</span>
                  </span>
                  <span className="ml-auto whitespace-nowrap text-base text-muted">{minutesAgo(c.call!.at, now)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* 3. What the signs mean */}
      <ul aria-label="Τι σημαίνουν τα σήματα" className="flex flex-wrap gap-x-6 gap-y-2 text-base text-muted">
        <li className="flex items-center gap-2">
          <Sign status="working" /> Ασκείται
        </li>
        <li className="flex items-center gap-2">
          <Sign status="question" /> Απορία
        </li>
        <li className="flex items-center gap-2">
          <Sign status="pain" /> Πόνος
        </li>
        <li className="flex items-center gap-2">
          <Sign status="done" /> Τελείωσε
        </li>
      </ul>

      {/* 4. The cards */}
      {cards.length === 0 ? (
        <p className="border-2 border-dashed border-hairline px-5 py-8 text-center text-muted">
          Κανένας ασθενής στην αίθουσα αυτή τη στιγμή. Όταν εγκρίνετε ένα πρόγραμμα σε κρεβάτι ή θέση, εμφανίζεται εδώ.
        </p>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
          {cards.map((card) => (
            <PatientCard key={card.id} card={card} place={placeOf(card)} now={now} onAct={act} />
          ))}
        </div>
      )}

      <p className="text-base text-muted">
        Οι κάρτες μένουν στη θέση τους. Χρώμα παίρνουν μόνο όσοι σας χρειάζονται.
        {board.rooms.length > 0 && ` Ελεύθερες θέσεις: ${Math.max(0, freePlaces)}.`}
      </p>
    </div>
  );
}

// «Πλήρης οθόνη»: the board alone on the screen (the two-tab way of working: board here, work in the
// other tab). Shown only where the browser can do it (not on an iPhone); Esc also leaves.
function FullScreenButton() {
  const [can, setCan] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    setCan(Boolean(document.fullscreenEnabled));
    const update = () => setOn(Boolean(document.fullscreenElement));
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  if (!can) return null;
  const toggle = () => {
    const done = on ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    done.catch(() => {}); // refused (e.g. not from a click): nothing changes
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex min-h-12 cursor-pointer items-center gap-2 border-2 border-line bg-white px-4 font-bold text-ink hover:border-action"
    >
      <span aria-hidden="true">{on ? "⤡" : "⤢"}</span> {on ? "Έξοδος από πλήρη οθόνη" : "Πλήρης οθόνη"}
    </button>
  );
}

function Count({ label, value, tone = "plain" }: { label: string; value: number; tone?: "plain" | "alarm" | "done" }) {
  return (
    <div
      className={cx(
        "flex flex-col-reverse gap-0.5 px-4 py-3.5",
        tone === "alarm" ? "bg-error text-white" : tone === "done" ? "bg-note-green text-action" : "bg-sheet",
      )}
    >
      <dt className={cx("text-base font-semibold", tone === "plain" && "text-muted")}>{label}</dt>
      <dd className="font-display text-[40px] leading-none">{value}</dd>
    </div>
  );
}

// The four signs, each its own shape: half-filled circle = exercising, ? in a circle = question,
// ! in an octagon = pain, ✓ in a square = finished. `inverse`: drawn on the red card.
const OCTAGON = "polygon(29% 0, 71% 0, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0 71%, 0 29%)";
function Sign({ status, inverse = false }: { status: BoardStatus | CallReason; inverse?: boolean }) {
  const base = "flex h-[22px] w-[22px] flex-none items-center justify-center text-[14px] font-extrabold";
  if (status === "pain")
    return (
      <span aria-hidden="true" className={cx(base, inverse ? "bg-white text-error" : "bg-error text-white")} style={{ clipPath: OCTAGON }}>
        !
      </span>
    );
  if (status === "question")
    return (
      <span aria-hidden="true" className={cx(base, "rounded-full bg-ink text-tab-yellow")}>
        ?
      </span>
    );
  if (status === "done")
    return (
      <span aria-hidden="true" className={cx(base, "bg-action text-white")}>
        ✓
      </span>
    );
  return <span aria-hidden="true" className="h-[22px] w-[22px] flex-none rounded-full border-[3px] border-ink bg-[linear-gradient(90deg,var(--color-ink)_50%,transparent_50%)]" />;
}

// The colours of everything inside a card, per tone.
const LOOK: Record<Tone, { card: string; muted: string; now: string; box: { done: string; current: string; todo: string }; bar: string; barTodo: string; barHalf: string }> = {
  plain: {
    card: "border-2 border-hairline bg-white text-ink",
    muted: "text-muted",
    now: "border border-hairline bg-sheet",
    box: { done: "bg-action text-white", current: "border-[3px] border-action text-ink", todo: "border-2 border-line text-muted" },
    bar: "bg-action border-action",
    barTodo: "border-line",
    barHalf: "border-action bg-[linear-gradient(90deg,var(--color-action)_50%,transparent_50%)]",
  },
  pain: {
    card: "bg-error text-white",
    muted: "text-white",
    now: "bg-[#6f170d]",
    box: { done: "bg-white text-error", current: "border-[3px] border-white bg-[#6f170d] text-white", todo: "border-2 border-dashed border-white text-white" },
    bar: "bg-white border-white",
    barTodo: "border-white",
    barHalf: "border-white bg-[linear-gradient(90deg,#fff_50%,transparent_50%)]",
  },
  question: {
    card: "border-2 border-ink bg-tab-yellow text-ink",
    muted: "text-ink",
    now: "border border-ink bg-[#fbf3d0]",
    box: { done: "bg-ink text-tab-yellow", current: "border-[3px] border-ink bg-[#fbf3d0] text-ink", todo: "border-2 border-dashed border-ink text-ink" },
    bar: "bg-ink border-ink",
    barTodo: "border-ink",
    barHalf: "border-ink bg-[linear-gradient(90deg,var(--color-ink)_50%,transparent_50%)]",
  },
};

function PatientCard({ card, place, now, onAct }: { card: BoardCard; place: string; now: Date; onAct: (run: () => Promise<Result>) => Promise<string | null> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const tone = toneOf(card);
  const look = LOOK[tone];
  const status = boardStatus(card);
  const index = nowExercise(card);
  const total = card.setsTarget.length;
  const done = exercisesDone(card);
  const headingId = `card-${card.id}`;

  async function run(fn: () => Promise<Result>) {
    setBusy(true);
    setProblem(null);
    try {
      setProblem(await onAct(fn));
    } catch {
      setProblem(NOT_SENT);
    } finally {
      setBusy(false); // the buttons always work again
      setConfirming(false);
    }
  }

  // For screen readers, the boxes in one sentence: «Ασκήσεις: η 1 έγινε, τώρα η 2 από 3».
  const doneList = card.setsTarget.map((_, i) => i).filter((i) => isDone(card, i) && i !== index);
  const sentence =
    index < 0
      ? `Ασκήσεις: και οι ${total} έγιναν`
      : `Ασκήσεις: ${doneList.length ? `${doneList.map((i) => i + 1).join(", ")} έγιναν, ` : ""}τώρα η ${index + 1} από ${total}`;

  const primary = tone === "pain" ? "bg-white text-error" : tone === "question" ? "bg-ink text-tab-yellow" : "bg-action text-white hover:bg-action-hover";
  const secondary =
    tone === "pain" ? "border-2 border-white text-white" : tone === "question" ? "border-2 border-ink text-ink" : "border-2 border-line bg-white text-ink hover:border-action";
  const button = "inline-flex min-h-12 cursor-pointer items-center gap-1.5 px-3.5 font-bold no-underline disabled:cursor-wait disabled:opacity-70";

  return (
    <article aria-labelledby={headingId} className={cx("flex flex-col gap-3 p-[22px]", look.card)}>
      <div>
        <p className={cx("text-base", look.muted)}>{place}</p>
        <h2 id={headingId} className="font-display text-[34px] leading-[1.05]">
          {card.label}
        </h2>
        <p className={cx("mt-1 text-[20px] font-semibold", look.muted)}>{card.title}</p>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Sign status={card.call ? card.call.reason : status} inverse={tone === "pain"} />
        {card.call ? (
          <>
            <span className="font-bold">Χρειάζεται εσάς · {REASON[card.call.reason]}</span>
            <span>{minutesAgo(card.call.at, now)}</span>
          </>
        ) : status === "done" ? (
          <span className="font-bold text-action">Τελείωσε</span>
        ) : (
          <span className="font-bold">Ασκείται</span>
        )}
      </p>

      <ol aria-label={sentence} className="flex flex-wrap gap-2">
        {card.setsTarget.map((_, i) => (
          <li
            key={i}
            aria-hidden="true"
            className={cx(
              "flex h-10 w-10 items-center justify-center text-[18px] font-bold",
              i === index ? look.box.current : isDone(card, i) ? look.box.done : look.box.todo,
            )}
          >
            {i + 1}
          </li>
        ))}
      </ol>

      {index >= 0 ? (
        <div className={cx("flex flex-col gap-0.5 px-4 py-3", look.now)}>
          <span className="text-[22px] font-bold leading-tight">{card.exercises[index] ?? `Άσκηση ${index + 1}`}</span>
          <SetBars done={card.setsDone[index]} target={card.setsTarget[index]} look={look} />
        </div>
      ) : (
        <div className={cx("flex flex-col gap-0.5 px-4 py-3", tone === "plain" ? "border border-action bg-note-green text-action" : look.now)}>
          <span className="text-base font-semibold">Όλες οι ασκήσεις</span>
          <span className="text-[22px] font-bold leading-tight">
            {done} από {total} έγιναν
          </span>
        </div>
      )}

      {problem && (
        <p role="alert" className={cx("px-3 py-2 font-semibold", tone === "plain" ? "bg-tab-pink text-ink" : "border-2 border-current")}>
          {problem}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {card.call && (
          <button type="button" disabled={busy} onClick={() => void run(() => seeCall(card.id, card.call!.at))} className={cx(button, primary)}>
            <span aria-hidden="true">✓</span> Το είδα
          </button>
        )}
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold">Ολοκλήρωση για {card.label};</span>
            <button type="button" disabled={busy} onClick={() => void run(() => finishCard(card.id))} className={cx(button, card.call ? secondary : primary)}>
              Ναι
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={cx(button, secondary)}>
              Όχι
            </button>
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Ολοκλήρωση για ${card.label}`}
            onClick={() => setConfirming(true)}
            className={cx(button, status === "done" && !card.call ? primary : secondary)}
          >
            Ολοκλήρωση
          </button>
        )}
        {!card.call && !confirming && (
          <Link
            href={`/programs/${card.programId}` as Route}
            target="_blank"
            // On a phone one tab is everything: a new tab there looks like the button did nothing.
            onClick={(event) => {
              if (onePhoneTab()) event.currentTarget.removeAttribute("target");
            }}
            aria-label={`QR / οθόνη ασθενή για ${card.label} (ανοίγει σε νέα καρτέλα)`}
            className={cx(button, secondary)}
          >
            QR / οθόνη ασθενή
          </Link>
        )}
      </div>
    </article>
  );
}

// The sets of the exercise now: one bar per set, filled = done, half = the one in progress.
function SetBars({ done, target, look }: { done: number; target: number; look: (typeof LOOK)[Tone] }) {
  if (target <= 1) return null;
  return (
    <span role="img" aria-label={`Σετ ${Math.min(done + 1, target)} από ${target}`} className="mt-2 flex max-w-[220px] gap-1.5">
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className={cx(
            "h-3.5 flex-1 border-2",
            i < done ? look.bar : i === done ? look.barHalf : look.barTodo,
          )}
        />
      ))}
    </span>
  );
}
