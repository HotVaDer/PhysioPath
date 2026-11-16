// «Χρειάζεστε βοήθεια;» at the bottom of every sign-up and sign-in page: a real person to call or
// write to. Shows nothing until HELP in app/lib/site.ts has a phone or an email.
import { HELP } from "@/app/lib/site";

export function HelpLine() {
  if (!HELP.phone && !HELP.email) return null;
  return (
    <p className="mt-5 border-t border-hairline pt-3 text-base text-muted">
      Χρειάζεστε βοήθεια;{" "}
      {HELP.phone && (
        <>
          Καλέστε μας στο{" "}
          <a href={`tel:${HELP.phone.replace(/\s+/g, "")}`} className="whitespace-nowrap font-semibold">
            {HELP.phone}
          </a>
        </>
      )}
      {HELP.phone && HELP.email && " ή γράψτε μας στο "}
      {!HELP.phone && HELP.email && "Γράψτε μας στο "}
      {HELP.email && (
        <a href={`mailto:${HELP.email}`} className="break-all font-semibold">
          {HELP.email}
        </a>
      )}
      .
    </p>
  );
}
