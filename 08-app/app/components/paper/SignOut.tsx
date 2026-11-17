// "Αποσύνδεση" as a small form button (a POST), so no other website can log someone out with a link.
import { signOut } from "@/app/lib/onboarding/actions";
import { cx } from "@/app/lib/cx";

// className: where it sits (default: a little space above, at the end of a card).
export function SignOut({ lead, className = "mt-6" }: { lead?: string; className?: string }) {
  return (
    <form action={signOut} className={cx("text-base text-muted", className)}>
      {lead && <span>{lead} </span>}
      <button type="submit" className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink">
        Αποσύνδεση
      </button>
    </form>
  );
}
