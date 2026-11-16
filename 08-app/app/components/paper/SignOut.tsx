// "Αποσύνδεση" as a small form button (a POST), so no other website can log someone out with a link.
import { signOut } from "@/app/lib/onboarding/actions";

export function SignOut({ lead }: { lead?: string }) {
  return (
    <form action={signOut} className="mt-6 text-base text-muted">
      {lead && <span>{lead} </span>}
      <button type="submit" className="min-h-11 cursor-pointer text-action underline underline-offset-[3px] hover:text-ink">
        Αποσύνδεση
      </button>
    </form>
  );
}
