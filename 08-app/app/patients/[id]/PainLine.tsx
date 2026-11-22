// The pain line on a patient's page: the highest pain the patient gave each day (0–10), oldest on the
// left. One series, so no legend (the title names it); a faint dashed line at 7, where the physio is
// alerted. A day without a pain number leaves a gap, never a made-up zero. Each dot says its day and
// value on hover, and the same numbers are written out for screen readers.
import { HIGH_PAIN, longDayName } from "@/app/lib/home/log";

const W = 320;
const H = 96;
const PAD = { left: 22, right: 8, top: 8, bottom: 8 };

export function PainLine({ points }: { points: { day: string; pain: number | null }[] }) {
  const known = points.filter((point): point is { day: string; pain: number } => point.pain !== null);
  if (known.length === 0) return <p className="text-muted">Δεν έχει δώσει αριθμό πόνου αυτές τις μέρες.</p>;

  const x = (i: number) => PAD.left + (points.length === 1 ? 0 : (i * (W - PAD.left - PAD.right)) / (points.length - 1));
  const y = (pain: number) => PAD.top + ((10 - pain) * (H - PAD.top - PAD.bottom)) / 10;

  // Runs of days with a number, each drawn as its own line (gaps stay gaps).
  const runs: { i: number; pain: number }[][] = [];
  points.forEach((point, i) => {
    if (point.pain === null) return;
    const last = runs.at(-1);
    if (last && last.at(-1)!.i === i - 1) last.push({ i, pain: point.pain });
    else runs.push([{ i, pain: point.pain }]);
  });

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[460px]" role="img" aria-label="Η γραμμή του πόνου (ο μεγαλύτερος της μέρας)">
        {/* Axis: 0 and 10, and the alert line at 7. */}
        <text x={0} y={y(10) + 4} className="fill-muted text-[13px]">
          10
        </text>
        <text x={8} y={y(0) + 4} className="fill-muted text-[13px]">
          0
        </text>
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="stroke-hairline" strokeWidth={1} />
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(HIGH_PAIN)}
          y2={y(HIGH_PAIN)}
          className="stroke-error/50"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        {runs.map((run, r) => (
          <polyline
            key={r}
            points={run.map((p) => `${x(p.i)},${y(p.pain)}`).join(" ")}
            fill="none"
            className="stroke-action"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {points.map((point, i) =>
          point.pain === null ? null : (
            <g key={point.day}>
              {/* A bigger, invisible target, so the hover is easy to hit. */}
              <circle cx={x(i)} cy={y(point.pain)} r={9} fill="transparent">
                <title>{`${longDayName(point.day)}: πόνος ${point.pain}/10`}</title>
              </circle>
              <circle cx={x(i)} cy={y(point.pain)} r={4} className="fill-action stroke-sheet" strokeWidth={2} pointerEvents="none" />
            </g>
          ),
        )}
      </svg>
      <figcaption className="text-[15px] text-muted">Η διακεκομμένη γραμμή: πόνος {HIGH_PAIN}, από εκεί και πάνω σας ειδοποιούμε.</figcaption>
      <ul className="sr-only">
        {known.map((point) => (
          <li key={point.day}>{`${longDayName(point.day)}: πόνος ${point.pain} από 10`}</li>
        ))}
      </ul>
    </figure>
  );
}
