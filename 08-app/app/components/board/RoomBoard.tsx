"use client";
// The room board («Η αίθουσα»): one column per room, one box per bed or station, for every role.
//   empty     «Κρεβάτι 2 · ελεύθερο»
//   patient   name, program, the exercise they are on now + «Σετ 2 από 3», «1 από 4 ασκήσεις»
//   calling   the whole box pink (pain) or yellow (question), with a sign and «πριν από 2 λεπτά»
//   done      «✓ Τελείωσε τις ασκήσεις» (the card stays until someone presses «Τέλος»)
// A state is never shown by colour alone: there is always a word and a shape.
// Cards whose room was deleted go under «Χωρίς θέση». Asks the server every 3 s (paused while the tab
// is hidden); new calls are announced to screen readers and counted in the tab's title.
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { finishCard, seeCall } from "@/app/lib/board/actions";
import type { BoardCard, BoardData } from "@/app/lib/board/board";
import { boardStatus, CALL_WORDS, exercisesDone, minutesAgo, nowExercise } from "@/app/lib/board/session";
import { cx } from "@/app/lib/cx";
import { slotLabel, type Room } from "@/app/lib/notes/approval";

const POLL_MS = 3000;
const TITLE = "Η αίθουσα · PhysioPath";

async function fetchBoard(): Promise<BoardData> {
  const response = await fetch("/api/board", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as BoardData;
}

export function RoomBoard({ initial }: { initial: BoardData }) {
  const [board, setBoard] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [now, setNow] = useState(() => new Date());
  const seenCalls = useRef(new Set(initial.cards.filter((c) => c.call).map((c) => `${c.id}@${c.call!.at}`)));

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchBoard();
      // Say each new call once, for screen readers: «Γιώργος, Κρεβάτι 2: πονάει».
      const freshCalls = fresh.cards.filter((c) => c.call && !seenCalls.current.has(`${c.id}@${c.call.at}`));
      if (freshCalls.length) {
        setAnnounce(freshCalls.map((c) => `${c.label}: ${CALL_WORDS[c.call!.reason].toLowerCase()}`).join(". "));
        freshCalls.forEach((c) => seenCalls.current.add(`${c.id}@${c.call!.at}`));
      }
      setBoard(fresh);
      setNow(new Date());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!document.hidden) await refresh();
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [refresh]);

  const calling = board.cards.filter((c) => c.call).sort((a, b) => a.call!.at.localeCompare(b.call!.at));
  useEffect(() => {
    document.title = calling.length ? `(${calling.length}) ${TITLE}` : TITLE;
    return () => {
      document.title = TITLE;
    };
  }, [calling.length]);

  async function act(run: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    setMessage(null);
    const result = await run();
    if (!result.ok) setMessage(result.message);
    await refresh();
  }

  const roomIds = new Set(board.rooms.map((r) => r.id));
  const placeless = board.cards.filter((c) => !c.roomId || !roomIds.has(c.roomId));
  const cardAt = (room: Room, slot: number) => board.cards.find((c) => c.roomId === room.id && c.slot === slot);

  return (
    <div className="flex flex-col gap-5">
      <div aria-live="assertive" className="sr-only">
        {announce}
      </div>

      {/* One line: how many, and who is waiting, oldest call first. */}
      <div role="status" className="flex flex-col gap-1">
        <p className="text-[19px]">
          {board.cards.length === 0
            ? "Κανένας ασθενής στην αίθουσα αυτή τη στιγμή."
            : `${board.cards.length} ${board.cards.length === 1 ? "ασθενής" : "ασθενείς"} · ${
                calling.length === 0 ? "κανείς δεν σας καλεί" : calling.length === 1 ? "1 σας καλεί" : `${calling.length} σας καλούν`
              }`}
        </p>
        {calling.length > 0 && (
          <p className="font-semibold">
            Με τη σειρά που κάλεσαν: {calling.map((c) => `${c.label} (${CALL_WORDS[c.call!.reason].toLowerCase()})`).join(", ")}
          </p>
        )}
      </div>

      {offline && (
        <p role="alert" className="bg-tab-pink px-4 py-3">
          <span className="font-semibold">Χάθηκε η σύνδεση.</span> Δοκιμάζουμε ξανά κάθε λίγα δευτερόλεπτα· ό,τι βλέπετε
          μπορεί να είναι παλιό.
        </p>
      )}
      {message && (
        <p role="alert" className="bg-tab-yellow px-4 py-3">
          {message}
        </p>
      )}

      <div className="grid gap-x-6 gap-y-8 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {board.rooms.map((room) => (
          <section key={room.id} aria-labelledby={`room-${room.id}`} className="flex flex-col gap-3">
            <h2 id={`room-${room.id}`} className="border-b-2 border-ink pb-1 font-display text-[24px]">
              {room.name}
            </h2>
            <ul className="flex flex-col gap-3">
              {Array.from({ length: room.beds + room.stations }, (_, i) => {
                const slot = i + 1;
                const card = cardAt(room, slot);
                return (
                  <li key={slot}>
                    {card ? (
                      <CardBox card={card} place={slotLabel(room, slot)} now={now} onAct={act} />
                    ) : (
                      <div className="flex min-h-[64px] items-center border-2 border-dashed border-hairline px-4 text-muted">
                        {slotLabel(room, slot)} · ελεύθερο
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {placeless.length > 0 && (
          <section aria-labelledby="room-none" className="flex flex-col gap-3">
            <h2 id="room-none" className="border-b-2 border-ink pb-1 font-display text-[24px]">
              Χωρίς θέση
            </h2>
            <ul className="flex flex-col gap-3">
              {placeless.map((card) => (
                <li key={card.id}>
                  <CardBox card={card} place="Χωρίς θέση" now={now} onAct={act} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// A small sign next to the state, so it isn't colour alone: ! in a square for pain, ? in a circle for a question.
function Sign({ reason }: { reason: "pain" | "question" }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex h-8 w-8 flex-none items-center justify-center text-[20px] font-bold text-white",
        reason === "pain" ? "bg-error" : "rounded-full bg-ink",
      )}
    >
      {reason === "pain" ? "!" : "?"}
    </span>
  );
}

function CardBox({
  card,
  place,
  now,
  onAct,
}: {
  card: BoardCard;
  place: string;
  now: Date;
  onAct: (run: () => Promise<{ ok: true } | { ok: false; message: string }>) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = boardStatus(card);
  const index = nowExercise(card);
  const total = card.setsTarget.length;
  const done = exercisesDone(card);

  async function run(fn: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    setBusy(true);
    await onAct(fn);
    setBusy(false);
    setConfirming(false);
  }

  return (
    <article
      aria-label={`${place}: ${card.label}`}
      className={cx(
        "flex flex-col gap-2 border-2 px-4 py-3",
        card.call?.reason === "pain" ? "border-error bg-tab-pink" : card.call ? "border-ink bg-tab-yellow" : "border-line bg-white",
      )}
    >
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-base text-muted">
        <span>{place}</span>
        <span>{card.title}</span>
      </p>
      <p className="font-display text-[22px] leading-tight">{card.label}</p>

      {status === "calling" && card.call && (
        <p className="flex items-center gap-2 font-semibold">
          <Sign reason={card.call.reason} />
          <span>
            Σας καλεί · {CALL_WORDS[card.call.reason]} · {minutesAgo(card.call.at, now)}
          </span>
        </p>
      )}

      {index >= 0 ? (
        <p>
          <span className="text-muted">Τώρα: </span>
          <span className="font-semibold">{card.exercises[index] ?? `Άσκηση ${index + 1}`}</span>
          {card.setsTarget[index] > 1 && (
            <span>
              {" "}
              · Σετ {Math.min(card.setsDone[index] + 1, card.setsTarget[index])} από {card.setsTarget[index]}
            </span>
          )}
        </p>
      ) : (
        <p className="font-semibold text-action">✓ Τελείωσε τις ασκήσεις</p>
      )}

      {/* Progress: one bar per exercise (filled = done, dark = now), and the same in words. */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-1" aria-hidden="true">
          {card.setsTarget.map((target, i) => (
            <span key={i} className={cx("h-2 flex-1", card.setsDone[i] >= target ? "bg-action" : i === index ? "bg-ink" : "bg-hairline")} />
          ))}
        </div>
        <p className="text-base text-muted">
          {done} από {total} {total === 1 ? "άσκηση" : "ασκήσεις"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1">
        {card.call && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => seeCall(card.id, card.call!.at))}
            className="min-h-11 cursor-pointer bg-ink px-4 font-bold text-white hover:bg-action disabled:opacity-70"
          >
            Το είδα
          </button>
        )}
        <Link href={`/programs/${card.programId}` as Route} aria-label={`QR για ${card.label}`} className="min-h-11 content-center">
          QR
        </Link>
        {confirming ? (
          <span className="flex flex-wrap items-center gap-x-3">
            <span>Τέλος για {card.label};</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => finishCard(card.id))}
              className="min-h-11 cursor-pointer bg-action px-4 font-bold text-white hover:bg-action-hover disabled:opacity-70"
            >
              Ναι, τέλος
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 cursor-pointer text-action underline underline-offset-[3px]">
              Όχι
            </button>
          </span>
        ) : (
          <button
            type="button"
            aria-label={`Τέλος για ${card.label}`}
            onClick={() => setConfirming(true)}
            className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink"
          >
            Τέλος
          </button>
        )}
      </div>
    </article>
  );
}
