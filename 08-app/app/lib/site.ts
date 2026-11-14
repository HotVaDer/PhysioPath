// Where the app lives, for the links inside emails, and a guard for "?next=" addresses.

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/+$/, "");
}

// After a login link we send people to "next". Only our own paths are allowed: "/register/clinic"
// yes, "https://evil.example" or "//evil.example" no (that would be an open redirect).
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
