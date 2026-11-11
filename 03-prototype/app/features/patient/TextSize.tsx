"use client";
// Text size for the patient's screens (home program and session screen): bigger text by default (20px),
// and a control to make it bigger still, remembered on this phone.
import { useEffect, useState } from "react";

import { SegmentedControl } from "@/app/components/ui/SegmentedControl";

export type TextSize = "normal" | "large" | "xlarge";

// Root text size for each choice. The physio's pages use 112.5% (18px); patient pages start at 20px.
const TEXT_SIZES: Record<TextSize, string> = { normal: "125%", large: "150%", xlarge: "175%" };
const TEXT_SIZE_KEY = "physiopath:text-size";

// Runs before React (put it in the page as an inline <script>), so the page is drawn at the right size straight away.
export const TEXT_SIZE_SCRIPT = `try{document.documentElement.style.fontSize=${JSON.stringify(TEXT_SIZES)}[localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)})]||"${TEXT_SIZES.normal}"}catch(e){document.documentElement.style.fontSize="${TEXT_SIZES.normal}"}`;

const isTextSize = (value: string | null): value is TextSize => value === "normal" || value === "large" || value === "xlarge";

export function useTextSize() {
  const [textSize, setTextSize] = useState<TextSize>("normal");

  // Read what this phone remembers (after the first render, which has to match the server's) and apply
  // it here too: the inline script only runs on a full page load, not after moving within the app.
  useEffect(() => {
    let size: TextSize = "normal";
    try {
      const saved = localStorage.getItem(TEXT_SIZE_KEY);
      if (isTextSize(saved)) size = saved;
    } catch {
      // Storage blocked: it still works, it just isn't remembered.
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

export function TextSizeControl({ value, onChange }: { value: TextSize; onChange: (size: TextSize) => void }) {
  return (
    <SegmentedControl<TextSize>
      legend="Μέγεθος γραμμάτων"
      options={[
        // Each choice is shown at (roughly) its own size, so the patient sees what they'll get.
        { value: "normal", label: <span className="text-[0.85em]">Μικρά</span> },
        { value: "large", label: <span className="text-[1em]">Μεσαία</span> },
        { value: "xlarge", label: <span className="text-[1.15em]">Μεγάλα</span> },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}
