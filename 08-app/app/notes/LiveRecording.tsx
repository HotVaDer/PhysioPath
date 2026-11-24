"use client";
// The box shown while the microphone records: «Ηχογραφείται», the clock up to the maximum, a level bar,
// «Τέλος ηχογράφησης», and a warning when the microphone barely hears the physio. Used by the voice note
// (RecordForm) and «Πείτε τα πρότυπά σας» (DictateForm), both with useRecorder.
import { cx } from "@/app/lib/cx";
import { formatClock } from "@/app/lib/notes/format";
import { MAX_RECORDING_SECONDS, type useRecorder } from "@/app/lib/notes/useRecorder";

const BARS = 20;

export const greenButton =
  "inline-flex min-h-14 cursor-pointer items-center gap-2.5 bg-action px-6 text-[19px] font-bold text-white hover:bg-action-hover disabled:cursor-wait disabled:opacity-80";

type Recorder = Pick<ReturnType<typeof useRecorder>, "elapsed" | "level" | "tooQuiet" | "stop">;

export function LiveRecording({ recorder }: { recorder: Recorder }) {
  const lit = Math.round(recorder.level * BARS);
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-7 gap-y-4 rounded-md border-2 border-ink bg-white px-5 py-4">
      <div className="flex flex-col">
        <span className="flex items-center gap-2 font-bold">
          <span aria-hidden="true" className="size-3.5 rounded-full bg-error" />
          Ηχογραφείται
        </span>
        <span className="text-[34px] font-bold leading-tight tabular-nums">
          {formatClock(recorder.elapsed)} <span className="text-lg font-normal">/ {formatClock(MAX_RECORDING_SECONDS)}</span>
        </span>
      </div>
      <span aria-hidden="true" className="flex h-12 flex-[1_1_200px] items-center gap-1">
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} className={cx("max-w-2.5 flex-1 rounded-sm", i < lit ? "bg-ink" : "bg-hairline")} style={{ height: `${14 + ((i * 7) % 30)}px` }} />
        ))}
      </span>
      <button type="button" onClick={recorder.stop} className={greenButton}>
        <span aria-hidden="true" className="size-3.5 bg-white" />
        Τέλος ηχογράφησης
      </button>
      {recorder.tooQuiet && <p className="basis-full font-semibold">Δεν σας ακούμε καλά. Πλησιάστε το μικρόφωνο ή μιλήστε πιο δυνατά.</p>}
    </div>
  );
}
