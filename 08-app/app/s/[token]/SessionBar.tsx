"use client";
// The bar at the top of the session screen, always in reach while the page scrolls: the «Φ», «Αα»
// (the three text sizes, the same choice as on the home program) and «Φυσιοθεραπευτής» (call the physio,
// with a reason). Once the physio has been called, that button says «Ειδοποιήθηκε» in the call's
// colour (pink: pain, yellow: question) until the board sees it or the patient cancels.
// Always one line and never tall, because it stays on screen: on a phone its text and buttons are
// capped by the screen width (never under 48 px), and at big text sizes the «Φ», then the bell, step
// aside so the words stay.
import { LogoMark } from "@/app/components/paper/Logo";
import { BellIcon } from "@/app/components/patient/icons";
import { TextSizeControl, useTextSize } from "@/app/components/patient/TextSize";
import type { Call, CallReason } from "@/app/lib/board/session";
import { cx } from "@/app/lib/cx";

export type BarPanel = "none" | "size" | "call";

const tool =
  "flex min-h-[max(48px,min(3rem,14vw))] cursor-pointer items-center gap-2 border-2 px-[min(0.75rem,3vw)] text-[min(0.95rem,5vw)] font-bold disabled:cursor-default";
const link =
  "min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink disabled:cursor-default disabled:text-muted disabled:no-underline";

type Props = {
  panel: BarPanel;
  onToggle: (panel: BarPanel) => void;
  call: Call | null;
  onCall: ((reason: CallReason) => void) | null; // null after «Τέλος»: no calling any more
  pending: boolean;
};

export function SessionBar({ panel, onToggle, call, onCall, pending }: Props) {
  const [textSize, changeTextSize] = useTextSize();

  return (
    <>
      <LogoMark className="size-[min(2rem,9vw)] @max-[17rem]:hidden" />
      <button
        type="button"
        aria-expanded={panel === "size"}
        aria-controls={panel === "size" ? "text-size" : undefined}
        aria-label="Αα, μέγεθος γραμμάτων"
        onClick={() => onToggle("size")}
        className={cx(tool, "ml-auto", panel === "size" ? "border-ink bg-white text-ink" : "border-line bg-sheet text-ink")}
      >
        Αα
      </button>
      {onCall &&
        (call ? (
          <button
            type="button"
            disabled
            aria-label="Ο φυσιοθεραπευτής ειδοποιήθηκε"
            className={cx(tool, "border-ink text-ink", call.reason === "pain" ? "bg-tab-pink" : "bg-tab-yellow")}
          >
            <BellIcon className="size-[1.2rem] @max-[13rem]:hidden" />
            Ειδοποιήθηκε
          </button>
        ) : (
          <button
            type="button"
            aria-expanded={panel === "call"}
            aria-controls={panel === "call" ? "call-choices" : undefined}
            aria-label="Φυσιοθεραπευτής: χρειάζομαι βοήθεια"
            onClick={() => onToggle("call")}
            className={cx(tool, "border-action text-action", panel === "call" ? "bg-white" : "bg-sheet hover:text-action-hover")}
          >
            <BellIcon className="size-[1.2rem] @max-[13rem]:hidden" />
            Φυσιοθεραπευτής
          </button>
        ))}

      {panel === "size" && (
        <div id="text-size" className="basis-full pt-1 pb-2">
          <TextSizeControl value={textSize} onChange={changeTextSize} />
        </div>
      )}

      {panel === "call" && onCall && !call && (
        <fieldset id="call-choices" className="basis-full pt-1 pb-2">
          <legend className="pt-1 text-[1.05rem] font-bold">Γιατί χρειάζεστε τον φυσιοθεραπευτή;</legend>
          <p className="text-muted">Θα το δει στην οθόνη της αίθουσας.</p>
          <div className="mt-3 grid gap-3 @min-[26rem]:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => onCall("question")}
              className="min-h-[3.5rem] cursor-pointer border-[3px] border-action bg-white px-4 py-2 text-[1.1rem] font-bold text-action hover:text-action-hover"
            >
              Έχω απορία
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onCall("pain")}
              className="min-h-[3.5rem] cursor-pointer border-[3px] border-error bg-error px-4 py-2 text-[1.1rem] font-bold text-white"
            >
              Πονάω
            </button>
          </div>
          <button type="button" onClick={() => onToggle("none")} className={cx(link, "mt-1")}>
            Πίσω
          </button>
        </fieldset>
      )}
    </>
  );
}
