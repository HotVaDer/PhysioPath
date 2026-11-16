// The PhysioPath logo: Φ, the first letter of «φυσιοθεραπεία». The oval is a joint, the green line is
// the limb that passes through it (chosen 2026-11-16 from four ideas). The same drawing is the tab
// icon (app/icon.svg). Next to it, the name. The drawing is decoration: the name is the real text.
import { cx } from "@/app/lib/cx";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cx("flex-none", className)}>
      <ellipse cx="32" cy="32" rx="19" ry="15" fill="none" stroke="currentColor" strokeWidth="5" />
      <line x1="32" y1="5" x2="32" y2="59" stroke="var(--color-action)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// The mark and the name together, as at the top of every page.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 text-xl font-semibold text-ink", className)}>
      <LogoMark className="h-8 w-8" />
      PhysioPath
    </span>
  );
}
