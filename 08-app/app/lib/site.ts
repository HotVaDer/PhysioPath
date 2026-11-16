// Where the app lives, for the links inside emails, and a guard for "?next=" addresses.

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/+$/, "");
}

// Who to contact for help, shown at the bottom of the sign-up and sign-in pages («Χρειάζεστε
// βοήθεια;»). Fill in a real phone and/or email; while both are null the line is hidden.
export const HELP: { phone: string | null; email: string | null } = { phone: null, email: null };

// The subjects of the code emails, shown on the code page so people know what to look for in their
// inbox. Keep them the same as the subjects in supabase/config.toml.
export const EMAIL_SUBJECTS = {
  register: "Ο κωδικός σας για την εγγραφή στο PhysioPath",
  login: "Ο κωδικός σας για είσοδο στο PhysioPath",
} as const;

// After a login link we send people to "next". Only the few addresses the app really uses are
// allowed, so there's nothing to trick: home, the start of registration, and an invite page.
// Anything else (another site, "//evil.example", "/.//evil.example", a typo) gets the fallback.
// A new page that needs "next" has to be added here first.
const PAGES = new Set(["/", "/register/clinic"]);
const INVITE = /^\/invite\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function safeNext(next: string | null | undefined, fallback = "/"): string {
  return next && (PAGES.has(next) || INVITE.test(next)) ? next : fallback;
}
