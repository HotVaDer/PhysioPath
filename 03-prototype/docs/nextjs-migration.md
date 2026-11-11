# Next.js migration: progress

Rebuilding the demo from one big `public/index.html` + a hand-written Node server (`src/server.ts`) into **Next.js 16 + React + Tailwind 4 + TypeScript**, the same stack as Stylianos's other sites (`~/Documents/UNIVERSITY/Website_Builds/`).

## How we work

- **One file at a time.** Explain what the file does and why, show it, wait for OK, then write it.
- Read the bundled Next.js docs (`node_modules/next/dist/docs/`) before writing Next.js code (Next 16 has breaking changes).
- **Accessibility first: elderly users.** WCAG 2.2 AA, AAA where practical: text contrast ≥7:1, field borders ≥3:1, touch targets ≥48px, 18px base text (20px on the patient page), labels always visible, text next to every icon, persistent error messages, undo instead of "are you sure?", keyboard + focus ring, `prefers-reduced-motion`.
- Components small and reusable; pages only compose; logic in `lib/`, hooks and context; shared types from one schema.
- The old demo must keep working (`npm start`, port 8766) until the new one replaces it.

## Steps

1. ✅ **Hello Next.js** (2026-10-15): `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `app/globals.css` (contrast-checked colour tokens), `app/layout.tsx` (Inter + Greek, `lang="el"`, skip link), `app/page.tsx` (Server Component status check). Run with `npm run dev` → http://127.0.0.1:3000
2. ✅ **Move the server logic into Next.js** (2026-10-15). `src/` is copied, not moved; it stays until step 6.
   - `app/lib/`:
     - `schema.ts`, `prompt.ts` (prompt text unchanged), `generate.ts` and `transcribe.ts` (ported);
     - `config.ts` (paths and limits);
     - `http.ts` (security, body limits, JSON errors);
     - `samples.ts`;
     - `programs.ts` (save `output/<id>.json`; read the program only, never the note).
   - API routes replacing `src/server.ts`. `app/api/` holds the backend endpoints the browser calls; each `route.ts` is a few lines that call `app/lib`:
     - `samples` (GET);
     - `transcribe` (POST audio);
     - `generate` (POST `{ transcript, noteLang }`);
     - `approve` (POST `{ program, note }`, both validated);
     - `programs/[id]` (GET, patient program only).
   - `instrumentation.ts` prints setup hints and warms up Whisper when the server starts.
   - `/api/status` is not ported: `app/page.tsx` does that check. The patient HTML page becomes `/p/[id]` in step 5, so approve no longer writes an `.html` file.
   - Verified with `next build`, `curl` on every route and the security checks:
     - other Origin or Host → 403;
     - wrong content type → 415;
     - over 25 MB, with or without Content-Length → 413;
     - bad id → 404.
3. ✅ **Design system** (2026-10-15): in `app/components/ui/`, each with a `*.test.tsx` next to it (43 tests, axe on every component).
   - **Components:**
     - `Button` + `ButtonLink` (`newTab` says so in words);
     - `Field` (shared label, hint and message) used by `TextField`, `TextArea` (grows with CSS `field-sizing`) and `ListField` (one item per line ↔ `string[]`);
     - `SegmentedControl` (real radio buttons);
     - `Alert` (persistent; `role="alert"` for errors, `role="status"` otherwise);
     - `Card` (open section with a hairline and label, no box), `Spinner` (the start lights), `Stepper`, `TimingStrip`, `icons`.
   - **Tests:** Vitest + Testing Library + jsdom, set up as in the Next docs (`vitest.config.mts`, `vitest.setup.ts`). `app/test/axe.ts` runs axe without the contrast rule, because jsdom has no colours. Run with `npm test`.
   - **Look:** taken from the portfolio (hotvader.github.io). Dark mode is its hero (near-black, racing orange, mono capital labels, italic headings); light mode is its notebook paper (cream, dark ink, orange). The device setting picks one. Sharp corners, hairlines instead of boxes. Tokens in `app/globals.css`, all text ≥7:1 and borders/focus ≥3:1 (checked with a script). Mono font is JetBrains Mono, because the portfolio's DM Mono has no Greek.
   - **Catalogue:** `/ui` (internal, in English) lists every component with what it's for, where it's used and its states. In step 6, decide whether to keep it.
4. ✅ **App state** (2026-10-15):
   - `app/lib/draft.ts`: the draft and its reducer (every edit rule, incl. remove + undo), checked with zod when read back.
   - `app/context/DraftContext.tsx`: shares the draft between the physio's pages and keeps it in sessionStorage.
   - `app/lib/format.ts`: doses in full words, missing fields, note labels, note as text.
   - `app/lib/api.ts`: the browser's typed calls to the API routes.
   - `app/hooks/useRecorder.ts`: the microphone.
   - Tests: `draft.test.ts`, `format.test.ts` (63 tests in total).
5. ✅ **Pages** (2026-10-15):
   - `(physio)` route group: header and draft shared by `/` Record → `/review` → `/approved/[id]`.
   - `/p/[id]` patient page: text-size control (set before the page draws), print, big "Το έκανα σήμερα" buttons, never the clinical note.
   - Screens live in `app/features/<page>/`; `app/components/layout/` has the header, page title and PP badge.
   - The step-1 status page (`app/page.tsx`) is gone; its setup checks are alerts on the Record page.
   - Checked end to end in Chrome (sample → Claude → review → approve → patient page), light and dark, desktop and phone.
5b. ✅ **Redesign «Αίθουσα»** (2026-10-20), from the Claude Design canvas (https://claude.ai/artifact/SNapakX6eXEUocFVggDnWu). Replaces the portfolio look from step 3.
   - **Look:** towel white `#F6F8F7` and bed teal `#0C5957`; night `#0C1716` / `#79D3C9`. Only alarms get strong colour: new `pain` / `question` tokens (+ `on-` and `-inset`) for the room board. Source Sans 3 (Greek), tabular digits everywhere, sentence-case `label` utility, `rounded-card` (22px) and `rounded-tile` (16px), pill buttons. JetBrains Mono, racing orange, the start lights and the paddock pass are gone. 112 colour pairs checked: text ≥7:1, borders/focus/fills ≥3:1, both themes.
   - **Components:** Button gets `outline` (undo, start a hold) and `inverse` / `inverse-outline` (buttons on a red or amber card; the card sets `--card-bg`, `--card-fg` and its own `--focus`). Card is a real white card now. Stepper and the set counter use round markers. Spinner is a teal ring. New icons: Play, Restart, Chat, Tap.
   - **Patient session:** numbered exercise boxes (tap to go to another exercise; only screen state, `session.ts` unchanged because `setDone` already works per exercise), centred exercise card, round set markers, big «Τελείωσα», outlined undo, «Μετά» card, call button at the bottom. Hold timer: ring countdown, «Ξεκίνα το κράτημα» → «Ξανά από την αρχή».
   - **Room board:** summary card (4 counts + who called, in order), legend, alarm cards fully red (pain) or amber (question), status signs by shape (octagon, circle, half circle, tick), numbered exercise boxes and a set bar. Cards never move.
   - **Home program:** exercise cards, «Αποφύγετε» / «Πάρτε μας τηλέφωνο αν» on soft amber/red panels; text size «Μικρά / Μεσαία / Μεγάλα».
   - **Not built:** the canvas's «Δείτε πώς γίνεται» video slot (videos are out of the v1 scope). If the patient jumps ahead, the room board still shows the first unfinished exercise as «now».
   - `cx` doesn't merge Tailwind classes: to override a Button's size from outside, use the `!` suffix (`text-[0.95rem]!`).
6. **Quality and clean-up:** ESLint (`eslint-config-next` + `jsx-a11y`), Vitest + Testing Library + axe tests, delete `src/` and `public/index.html`, update README, `docs/accessibility.md`, `notes/decisions.md`

## Notes

- TypeScript is pinned to 6.0.x because the lint tools don't support TS 7 yet.
- The same-machine check runs inside every route (`handler()` in `app/lib/http.ts`), not in `proxy.ts`. Next 16's proxy buffers request bodies and cuts them at 10 MB (`proxyClientMaxBodySize`), which would break 25 MB audio uploads.
- The Whisper "one at a time" queue lives on `globalThis`, because Next.js can load a module once per route bundle and again on hot reload.
- UI components have no `"use client"`. They become client code when a Client Component imports them. `ListField` uses state, so it only works inside one.
- Hidden screen-reader text that adds to a name (e.g. "(ανοίγει σε νέα καρτέλα)") needs its space **outside** the `sr-only` span, otherwise screen readers join the words. A test caught this.
- `RouteContext<…>` in `app/api/programs/[id]` is a generated type. If `npm run check` can't find it, run `npx next typegen` (or `npm run dev` once) first.
- `tsconfig.json` has `allowImportingTsExtensions` only so the old `src/` keeps type-checking. Remove it in step 6.
- The full plan with HCI rules is in `~/.claude/plans/yes-you-are-right-snuggly-quail.md` (written for Vite; the HCI rules and page list still apply, the framework is now Next.js).
