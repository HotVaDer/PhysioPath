"use client";
// «Αντιγραφή συνδέσμου» / «Αντιγραφή σημείωσης»: copies text and says so (or why it couldn't).
import { useState } from "react";

import { cx } from "@/app/lib/cx";

export function CopyButton({ text, label, done, variant = "outline" }: { text: string; label: string; done: string; variant?: "outline" | "solid" }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        onClick={() => void copy()}
        className={cx(
          "min-h-12 cursor-pointer px-[18px] text-[17px] font-bold",
          variant === "solid" ? "bg-action text-white hover:bg-action-hover" : "border-2 border-action bg-white text-action hover:bg-note-green",
        )}
      >
        {label}
      </button>
      <span role="status" className="text-base font-semibold">
        {status === "copied" ? done : status === "failed" ? "Η αντιγραφή δεν έγινε. Επιλέξτε το κείμενο και αντιγράψτε το με το χέρι." : ""}
      </span>
    </span>
  );
}
