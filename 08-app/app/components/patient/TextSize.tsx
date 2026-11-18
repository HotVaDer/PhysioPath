"use client";
// Text size for the patient's pages (the session on their phone now, the home program in phase 5).
// They start bigger than the staff pages (20px) and can go bigger still; the choice is remembered on
// this phone. It works by changing the page's root size, so the patient pages size everything in rem.
// (Ported from 03-prototype/app/features/patient/TextSize.tsx; the segmented control became 3 boxes.)
import { useEffect, useState } from "react";

import { cx } from "@/app/lib/cx";

export type TextSize = "normal" | "large" | "xlarge";

const TEXT_SIZES: Record<TextSize, string> = { normal: "125%", large: "150%", xlarge: "175%" }; // 20, 24, 28px
const TEXT_SIZE_KEY = "physiopath:text-size";

// Runs before React (the page puts it in an inline <script>), so the first paint is already the right size.
export const TEXT_SIZE_SCRIPT = `try{document.documentElement.style.fontSize=${JSON.stringify(TEXT_SIZES)}[localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)})]||"${TEXT_SIZES.normal}"}catch(e){document.documentElement.style.fontSize="${TEXT_SIZES.normal}"}`;

const isTextSize = (value: string | null): value is TextSize => value === "normal" || value === "large" || value === "xlarge";

export function useTextSize() {
  const [textSize, setTextSize] = useState<TextSize>("normal");

  // Read what this phone remembers after the first render (which must match the server's), and apply
  // it here too: the inline script only runs on a full page load.
  useEffect(() => {
    let size: TextSize = "normal";
    try {
      const saved = localStorage.getItem(TEXT_SIZE_KEY);
      if (isTextSize(saved)) size = saved;
    } catch {
      // Storage blocked (private mode): it still works, it just isn't remembered.
    }
    setTextSize(size);
    document.documentElement.style.fontSize = TEXT_SIZES[size];
    return () => {
      document.documentElement.style.fontSize = ""; // leaving the page: back to the normal size
    };
  }, []);

  function changeTextSize(size: TextSize) {
    setTextSize(size);
    document.documentElement.style.fontSize = TEXT_SIZES[size];
    try {
      localStorage.setItem(TEXT_SIZE_KEY, size);
    } catch {}
  }

  return [textSize, changeTextSize] as const;
}

// Each choice is written at roughly its own size, so the patient sees what they'll get.
const CHOICES: { value: TextSize; label: string; size: string }[] = [
  { value: "normal", label: "Μικρά", size: "text-[0.9em]" },
  { value: "large", label: "Μεσαία", size: "text-[1em]" },
  { value: "xlarge", label: "Μεγάλα", size: "text-[1.15em]" },
];

export function TextSizeControl({ value, onChange }: { value: TextSize; onChange: (size: TextSize) => void }) {
  return (
    <fieldset>
      <legend className="text-[0.9rem] font-bold">Μέγεθος γραμμάτων</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {CHOICES.map((choice) => (
          <label
            key={choice.value}
            className={cx(
              "flex min-h-[3rem] cursor-pointer items-center justify-center border-2 px-2 text-center font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-action has-[:focus-visible]:outline-offset-2",
              value === choice.value ? "border-action bg-note-green text-ink" : "border-line bg-white text-muted",
            )}
          >
            <input
              type="radio"
              name="text-size"
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="sr-only"
            />
            <span className={choice.size}>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
