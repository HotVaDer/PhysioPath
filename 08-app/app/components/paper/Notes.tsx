// The problem box shown at the top of a form when something went wrong with the whole form.
import type { ReactNode } from "react";

import { cx } from "@/app/lib/cx";

// Something went wrong with the whole form (not one field): a pink box, read out at once.
export function FormAlert({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="bg-tab-pink px-4 py-3 font-semibold text-ink">
      {children}
    </p>
  );
}
