"use client";
// The demo tour's sticky notes («χαρτάκια», 2026-11-25): a yellow note pinned next to the one button the visitor
// should press next, with an arrow to it, and that button pulsing. app/lib/demo/notes.ts picks the note from the
// page as it is; the note moves on by itself when the button is pressed (the page changes), never with «Επόμενο».
// Laptop: next to the button (Floating UI, flips to the side that has room). Phone, or a button out of view:
// docked at the bottom of the screen, with «Δείξε μου» to scroll to the button.
// «×» or Escape closes the notes until «Από την αρχή» (the step card and the green line stay).
// Accessibility: the note doesn't take the focus (it would pull the visitor out of the form at every step);
// the button gets the note as its description, and a polite live region reads each new note once.
// On the staff pages it knows its clinic; on the patient's screen (/s/…) it reads the pointer the staff pages
// left (rememberTour), so it only shows in the browser that is doing the tour.
import { arrow, autoUpdate, flip, offset, shift, useFloating, type Placement } from "@floating-ui/react-dom";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cx } from "@/app/lib/cx";
import { pickNote, type Note, type NoteId } from "@/app/lib/demo/notes";
import { demoText, type DemoLang } from "@/app/lib/demo/text";
import { TOUR_EVENT, lastTour, loadTour, rememberTour, saveTour, type Tour } from "@/app/lib/demo/tour";

const TICK_MS = 400; // how often the page is looked at again (besides clicks, typing and changes)
const PHONE = "(max-width: 639px)";
// Under the button; without room there, beside it, and above it only as a last resort (above is usually what the
// visitor just read, or another button: on the recording page, «Έναρξη ηχογράφησης» above the samples). The
// procedure code sits at the top of the GeSY note, so its note starts at the side.
const SIDE: Partial<Record<NoteId, Placement>> = { code: "right" };
const FALLBACK: Record<"bottom" | "right", Placement[]> = { bottom: ["right", "left", "top"], right: ["bottom", "left", "top"] };
const ARROW = 52; // the green arrow from the note to the button: its length, in px

type Props = { lang?: DemoLang; clinicId?: string };

export function TourNotes(props: Props) {
  const path = usePathname();
  const [who, setWho] = useState<{ clinicId: string; lang: DemoLang } | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [docked, setDocked] = useState(false);
  const [below, setBelow] = useState(true); // the button is below the screen (else above), when out of view
  // docked: where along the note the arrow starts, and how long it is to reach the button
  const [aim, setAim] = useState<{ x: number; length: number } | null>(null);
  const textId = useId();
  const dock = useRef<HTMLDivElement>(null); // the docked note, to keep its height free at the bottom
  const scrolledTo = useRef<HTMLElement | null>(null); // on a phone: the button last brought into view
  const box = useRef<HTMLDivElement>(null); // the yellow note itself (the second arrow starts at its edge)

  // Which tour: the staff page's own, or the one the staff pages left for the patient's screen.
  useEffect(() => {
    if (props.clinicId && props.lang) {
      rememberTour(props.clinicId, props.lang);
      setWho({ clinicId: props.clinicId, lang: props.lang });
    } else setWho(lastTour());
  }, [props.clinicId, props.lang]);

  // The tour, and its changes from this page (TOUR_EVENT) or another tab (storage).
  useEffect(() => {
    if (!who) return;
    setTour(loadTour(who.clinicId));
    const update = (event: Event) => setTour((event as CustomEvent<Tour>).detail);
    const other = (event: StorageEvent) => {
      if (event.key?.endsWith(who.clinicId)) setTour(loadTour(who.clinicId));
    };
    window.addEventListener(TOUR_EVENT, update);
    window.addEventListener("storage", other);
    return () => {
      window.removeEventListener(TOUR_EVENT, update);
      window.removeEventListener("storage", other);
    };
  }, [who]);

  // Look at the page: which note, and can its button be seen.
  useEffect(() => {
    if (!tour) return;
    const look = () => {
      const next = pickNote(document, path, tour);
      setNote((now) => (now?.id === next?.id && now?.target === next?.target && now?.also === next?.also ? now : next));
      if (!next) return;
      const phone = Boolean(window.matchMedia?.(PHONE).matches);
      const box = next.target.getBoundingClientRect();
      // On a phone the note sits at the bottom: the button must be wholly above it.
      const room = window.innerHeight - (phone ? (dock.current?.offsetHeight ?? 160) + 16 + ARROW + 10 : 0); // the note and its arrow
      const inView = phone ? box.top >= 0 && box.bottom <= room && box.height > 0 : box.bottom > 0 && box.top < room && box.height > 0;
      setDocked(phone || !inView);
      setBelow(box.top >= room || box.height === 0);
      // Docked under a button that can be seen: an arrow up from the note, under the button's middle.
      const holder = dock.current?.getBoundingClientRect();
      const middle = box.left + box.width / 2 - (holder?.left ?? 12);
      const width = holder?.width ?? window.innerWidth - 24;
      const length = Math.max((holder?.top ?? room) - box.bottom - 10, ARROW);
      setAim(inView && box.height > 0 ? { x: Math.min(Math.max(middle, 28), width - 28), length } : null);
      // A phone shows one button at a time: bring each new one into view once (not again if the visitor scrolls away).
      if (phone && !inView && scrolledTo.current !== next.target && box.height > 0) {
        scrolledTo.current = next.target;
        next.target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    look();
    const timer = window.setInterval(look, TICK_MS);
    const soon = () => window.setTimeout(look, 0);
    const watcher = new MutationObserver(soon);
    watcher.observe(document.body, { childList: true, subtree: true });
    for (const type of ["click", "change", "input"]) document.addEventListener(type, soon, true);
    window.addEventListener("scroll", look, { passive: true });
    window.addEventListener("resize", look);
    return () => {
      window.clearInterval(timer);
      watcher.disconnect();
      for (const type of ["click", "change", "input"]) document.removeEventListener(type, soon, true);
      window.removeEventListener("scroll", look);
      window.removeEventListener("resize", look);
    };
  }, [tour, path]);

  // The button (or both, for an either/or): pulsing, and described by the note.
  useEffect(() => {
    if (!note) return;
    const undo = [note.target, note.also].filter((el): el is HTMLElement => Boolean(el)).map((target) => {
      const before = target.getAttribute("aria-describedby");
      target.classList.add("tour-pulse");
      target.setAttribute("aria-describedby", before ? `${before} ${textId}` : textId);
      return () => {
        target.classList.remove("tour-pulse");
        if (before) target.setAttribute("aria-describedby", before);
        else target.removeAttribute("aria-describedby");
      };
    });
    return () => undo.forEach((fn) => fn());
  }, [note, textId]);

  // Docked at the bottom: room under the page for the note, so nothing stays hidden under it, and the focused
  // field kept clear of it (WCAG 2.4.11).
  useEffect(() => {
    if (!note || !docked) return;
    const space = `${(dock.current?.offsetHeight ?? 160) + ARROW + 34}px`;
    document.body.style.paddingBottom = space;
    document.documentElement.style.scrollPaddingBottom = space;
    return () => {
      document.body.style.paddingBottom = "";
      document.documentElement.style.scrollPaddingBottom = "";
    };
  }, [note, docked]);

  const close = () => {
    if (!who) return;
    saveTour(who.clinicId, { ...loadTour(who.clinicId), notes: false });
  };

  useEffect(() => {
    if (!note) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // close only reads who, which is in the closure of this note's render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, who]);

  if (!who || !tour || !note) return null;
  const t = demoText(who.lang);
  const text = t.notes[note.id];
  const label = `${t.tourLabel} · ${t.stepShort(tour.step, t.steps.length)}`;
  const body = (
    <NoteBody
      boxRef={box}
      lang={who.lang}
      label={label}
      text={text}
      textId={textId}
      closeLabel={t.notes.close}
      onClose={close}
      action={
        note.id === "backToRoom" ? (
          <a href="/" className={actionClass}>
            {t.notes.toRoom} <span aria-hidden="true">→</span>
          </a>
        ) : docked && !onScreen(note.target) ? (
          <button type="button" onClick={() => note.target.scrollIntoView({ behavior: "smooth", block: "center" })} className={cx(actionClass, "cursor-pointer")}>
            {t.notes.show} <span aria-hidden="true">{below ? "↓" : "↑"}</span>
          </button>
        ) : null
      }
    />
  );

  return createPortal(
    <>
      {/* Read once when the note changes; the note itself is for the eyes. */}
      <p aria-live="polite" className="sr-only">
        {label}: {text}
      </p>
      {note.also && !docked && <SecondArrow from={box} to={note.also} />}
      {note.also && docked && <MarginArrows from={box} to={[note.target, note.also]} />}
      {docked ? (
        <aside ref={dock} aria-label={label} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[520px]">
          {aim && !note.also && <PointArrow side="bottom" length={aim.length} style={{ left: aim.x - 16, top: -aim.length - 2 }} />}
          {body}
        </aside>
      ) : (
        <Pinned target={note.target} placement={SIDE[note.id] ?? "bottom"} label={label}>
          {body}
        </Pinned>
      )}
    </>,
    document.body,
  );
}

const onScreen = (el: HTMLElement) => {
  const box = el.getBoundingClientRect();
  return box.bottom > 0 && box.top < window.innerHeight && box.height > 0;
};

const actionClass =
  "inline-flex min-h-11 items-center gap-2 self-start bg-action px-4 font-bold text-white no-underline hover:bg-action-hover hover:text-white";

// The yellow note: a strip of tape on top, «Ξενάγηση · 1/3», the one thing to do, and «×».
function NoteBody({
  boxRef,
  lang,
  label,
  text,
  textId,
  closeLabel,
  onClose,
  action,
}: {
  boxRef: React.Ref<HTMLDivElement>;
  lang: DemoLang;
  label: string;
  text: string;
  textId: string;
  closeLabel: string;
  onClose: () => void;
  action: React.ReactNode;
}) {
  return (
    <div
      ref={boxRef}
      role="note"
      aria-label={label}
      lang={lang}
      className="relative flex flex-col gap-2 bg-tab-yellow px-4 pb-3.5 pt-3 text-ink shadow-[2px_4px_0_-1px_rgba(43,36,32,0.16),0_14px_28px_-14px_rgba(43,36,32,0.55)]"
    >
      <span aria-hidden="true" className="absolute -top-2.5 right-6 h-5 w-14 rotate-3 bg-white/70 shadow-[0_1px_1px_rgba(43,36,32,0.12)]" />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-base font-bold text-action">{label}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="-mr-2 -mt-1 grid size-11 flex-none cursor-pointer place-items-center text-[22px] leading-none text-muted hover:text-ink"
        >
          ×
        </button>
      </div>
      <p id={textId} className="text-lg leading-[1.4]">
        {text}
      </p>
      {action}
    </div>
  );
}

// Next to the button, with an arrow to it; on the side that has room.
function Pinned({ target, placement: wanted, label, children }: { target: HTMLElement; placement: Placement; label: string; children: React.ReactNode }) {
  const arrowRef = useRef<HTMLSpanElement>(null);
  const { refs, floatingStyles, placement, middlewareData } = useFloating({
    strategy: "fixed",
    placement: wanted,
    elements: { reference: target },
    middleware: [
      offset(ARROW + 6),
      flip({ padding: 12, fallbackPlacements: FALLBACK[wanted === "right" ? "right" : "bottom"] }),
      shift({ padding: 12 }),
      arrow({ element: arrowRef, padding: 14 }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const side = placement.split("-")[0] as Side;
  const edge = { top: "bottom", bottom: "top", left: "right", right: "left" }[side];
  const a = middlewareData.arrow;
  return (
    <aside ref={refs.setFloating} aria-label={label} style={floatingStyles} className="z-50 w-[min(320px,calc(100vw-24px))]">
      <PointArrow ref={arrowRef} side={side} style={{ left: a?.x ?? undefined, top: a?.y ?? undefined, [edge]: -ARROW - 2 }} />
      {children}
    </aside>
  );
}

type Side = "top" | "bottom" | "left" | "right";

// A thick green arrow, drawn like a marker, from the note's edge to the button. side: where the note is, from the
// button (under it: the arrow points up).
function PointArrow({
  side,
  style,
  length = ARROW,
  ref,
}: {
  side: Side;
  style: React.CSSProperties;
  length?: number;
  ref?: React.Ref<HTMLSpanElement>;
}) {
  const across = side === "left" || side === "right";
  const turn = { bottom: 0, top: 180, left: 90, right: -90 }[side];
  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={{ ...style, width: across ? length : 32, height: across ? 32 : length }}
      className="pointer-events-none absolute grid place-items-center"
    >
      <svg width="32" height={length} viewBox={`0 0 32 ${length}`} style={{ transform: `rotate(${turn}deg)` }} className="overflow-visible">
        <path
          d={`M16 ${length - 3} C 13 ${length * 0.65}, 19 ${length * 0.4}, 16 6 M5 17 L16 4 L27 17`}
          fill="none"
          stroke="var(--color-action)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// The second arrow of an either/or note (the sample, or «Έναρξη ηχογράφησης»): from the note's nearest edge to
// the other button, in the same green marker, gently curved. Drawn over the page and redrawn each frame (the
// note and the page move: scrolling, Floating UI); it ignores the pointer.
function SecondArrow({ from, to }: { from: React.RefObject<HTMLDivElement | null>; to: HTMLElement }) {
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const note = from.current?.getBoundingClientRect();
      const end = to.getBoundingClientRect();
      if (!note || end.height === 0 || end.bottom < 0 || end.top > window.innerHeight) return setPath(null);
      setPath(arrowPath(note, end));
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [from, to]);
  if (!path) return null;
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-full w-full overflow-visible">
      <path d={path} fill="none" stroke="var(--color-action)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Box = { left: number; right: number; top: number; bottom: number };
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const middleOf = (b: Box) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 });
const nearest = (b: Box, p: { x: number; y: number }) => ({ x: clamp(p.x, b.left, b.right), y: clamp(p.y, b.top, b.bottom) });

// A curved arrow from the edge of note to just outside the edge of target, with its head along the curve.
export function arrowPath(note: Box, target: Box): string | null {
  const start = nearest(note, middleOf(target));
  const tip0 = nearest(target, middleOf(note));
  const dx = start.x - tip0.x;
  const dy = start.y - tip0.y;
  const length = Math.hypot(dx, dy);
  if (length < 24) return null; // touching: nothing to point across
  const tip = { x: tip0.x + (dx / length) * 10, y: tip0.y + (dy / length) * 10 };
  // bend: a control point off the middle of the line, a sixth of its length to one side
  const mid = { x: (start.x + tip.x) / 2, y: (start.y + tip.y) / 2 };
  const bend = { x: mid.x - (dy / length) * (length / 6), y: mid.y + (dx / length) * (length / 6) };
  const ux = tip.x - bend.x;
  const uy = tip.y - bend.y;
  const u = Math.hypot(ux, uy) || 1;
  const head = (turn: number) => {
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    const bx = -(ux / u) * 16;
    const by = -(uy / u) * 16;
    return `${(tip.x + bx * c - by * s).toFixed(1)} ${(tip.y + bx * s + by * c).toFixed(1)}`;
  };
  const f = (n: number) => n.toFixed(1);
  return `M${f(start.x)} ${f(start.y)} Q${f(bend.x)} ${f(bend.y)} ${f(tip.x)} ${f(tip.y)} M${head(0.5)} L${f(tip.x)} ${f(tip.y)} L${head(-0.5)}`;
}

// Docked under an either/or (a phone): one arrow per button up the right margin of the screen, side by side,
// each turning left into its button, so neither crosses the other buttons on the way.
function MarginArrows({ from, to }: { from: React.RefObject<HTMLDivElement | null>; to: HTMLElement[] }) {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const note = from.current?.getBoundingClientRect();
      if (!note) return setPaths([]);
      setPaths(marginPaths(note, to.map((el) => el.getBoundingClientRect()), window.innerWidth));
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [from, to]);
  if (paths.length === 0) return null;
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-full w-full overflow-visible">
      {paths.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--color-action)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

// Lanes in the right margin, the first nearest the buttons; a button out of view, or with no margin beside
// it, gets no arrow.
export function marginPaths(note: Box, targets: Box[], width: number): string[] {
  const f = (n: number) => n.toFixed(1);
  const out: string[] = [];
  let lane = 0;
  for (const t of targets) {
    if (t.bottom - t.top <= 0 || t.bottom < 0 || t.top > note.top) continue;
    const x = Math.max(t.right + 24, lane + 26);
    if (x > width - 8) continue;
    lane = x;
    const y = (t.top + t.bottom) / 2;
    const tip = t.right + 10;
    const r = Math.min(16, x - tip);
    out.push(
      `M${f(x)} ${f(note.top - 4)} L${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x - r)} ${f(y)} L${f(tip)} ${f(y)} ` +
        `M${f(tip + 13)} ${f(y - 10)} L${f(tip)} ${f(y)} L${f(tip + 13)} ${f(y + 10)}`,
    );
  }
  return out;
}
