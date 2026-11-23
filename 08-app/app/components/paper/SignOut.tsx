"use client";
// "Αποσύνδεση" as a small form button (a POST), so no other website can log someone out with a link.
// Before signing out it deletes this tab's unfinished note: on a shared clinic computer the next person
// must not find it (DraftProvider also throws away a note written by someone else).
import { signOut } from "@/app/lib/onboarding/actions";
import { cx } from "@/app/lib/cx";
import { STORAGE_KEY } from "@/app/lib/notes/DraftContext";

function forgetDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: nothing was kept
  }
}

// className: where it sits (default: a little space above, at the end of a card).
// label: the button's words, «Αποσύνδεση» unless a demo clinic says «Έξοδος από τη δοκιμή».
export function SignOut({ lead, className = "mt-6", label = "Αποσύνδεση" }: { lead?: string; className?: string; label?: string }) {
  return (
    <form action={signOut} onSubmit={forgetDraft} className={cx("text-base text-muted", className)}>
      {lead && <span>{lead} </span>}
      <button type="submit" className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink">
        {label}
      </button>
    </form>
  );
}
