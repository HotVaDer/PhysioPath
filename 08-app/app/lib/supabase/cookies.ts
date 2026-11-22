// How the login cookies are written, for server.ts and proxy.ts (the only places that write them).
// httpOnly: scripts on a page can't read the login, so an injected script can't steal it and call
// Supabase as the person. Nothing breaks: no browser code talks to Supabase, only our server does.
export const AUTH_COOKIE_OPTIONS = { httpOnly: true } as const;
