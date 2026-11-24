# 08-app progress

Plan: `~/.claude/plans/lets-make-the-design-imperative-possum.md`. Design: canvas page
«Χαρτιά κλινικής · μία ενότητα ανά σελίδα» on https://claude.ai/artifact/SNapakX6eXEUocFVggDnWu.

## Step 1: login + clinic onboarding (2026-11-15)

Built (user said "finish everything, I'll check later" for this step):

- **Folder:** `08-app/` with the prototype's stack and versions, plus `@supabase/ssr` and `@supabase/supabase-js`.
  It runs on port 3001. `supabase/` moved here from `03-prototype/` (still git-ignored).
- **Database:** `supabase/migrations/20261115000000_onboarding.sql`
  - `clinics.city`, `clinics.phone`.
  - `rooms`: everyone in the clinic reads; only the owner writes.
  - `onboarding_drafts`: each person only sees their own draft.
  - `invites`: the token can't be read through the API; the owner sees and cancels invites.
  - `finish_onboarding()` files the whole draft in one transaction.
  - `invite_details(token)` and `accept_invite(token, name)`.
  - `supabase/checks/rls_check.sql` was extended with checks for the draft, filing, rooms, invites and tokens.
- **App:** proxy (session refresh), `auth/confirm`, cover/login (email link), §1–§4 sheets, done page with the stamp,
  invite carbon copy, placeholder home.
- **Checks run:** `npm run check`, `npm test` (28 tests: form rules + axe), `next build` (12 routes),
  signed-out redirects with curl.
- **Database:** with the user's OK, first a rolled-back trial (migration + checks in one transaction), then
  `supabase db push --remote` and the checks again: **74 checks, 0 failed** (2026-11-15).
- **Not run yet:** the end-to-end email flow (needs the dashboard settings below).

### Decisions while building

- Route folder is `app/register/…` (no route group needed).
- The proxy only refreshes the login. Every page checks the user itself (`getUser()`), so there are no optimistic redirects.
- 1.4 is now «Υπεύθυνη / Υπεύθυνος» (the owner's name, prefilled from the cover). The «Μόνο διαχείριση» role is left out of v1.
- The stamp lands on the done page (after filing), not on §4, because filing is a real POST + redirect.
- «Συνημμένο Α» (test patient) is shown but not clickable yet: it comes with the room board.
- Invites to someone who already has an account get a sign-in link to the same `/invite/<token>` page.
- Without `SUPABASE_SECRET_KEY` the clinic is still filed; the done page says how many invites weren't sent.

## Tested end to end by the user (2026-11-15) ✅

Sign-up → email link → §1–§4 → stamp → home; invite email (arrives late at UCY mail, Microsoft
filtering) → accept as assistant; login as its own small card. Fixes made while testing:
- Sheet no longer has a fixed height: the button is always right after the last field, at every screen size.
- `/auth/confirm` also accepts `?code=` and `?error_code=` links; `/login` explains "other browser".
- Home «Ομάδα» section (owner): invites with status and «Ξανά αποστολή» (renews 7 days, shows to whom and when).
- Login uses `components/paper/Card.tsx` and its own `/login/check-email`, so it never looks like registering.
- `<html suppressHydrationWarning>` for browser-extension attributes.

## Email (done 2026-11-15)

- Our own templates in `supabase/templates/` (confirmation, magic_link, invite): Greek, paper look, email-safe HTML.
  Links go to `/auth/confirm?…&token_hash=…`, so they work on any device.
- Sending goes through **Gmail SMTP** (no own domain yet): `supabase/config.toml` `[auth.email.smtp]` reads
  `SMTP_USER` / `SMTP_PASS` (a Google app password) from `supabase/.env`, which is local only.
- Pushed with `supabase config push` after making `config.toml` match the online settings, so only email changed.
  `supabase config diff` should show no differences. Change templates by editing the files and pushing again.
- `/auth/confirm` also accepts Supabase's default `?code=` links (same browser only) and `?error_code=`.
- Later, with a domain: switch SMTP to Resend (or Brevo) and the sender to `no-reply@<domain>`.

## To do in dashboards (user), originally. Steps 1–3 are done by the above.

1. **Supabase → Authentication → URL Configuration**
   - Site URL: `http://localhost:3001` (later the Vercel URL).
   - Redirect URLs: `http://localhost:3001/**` (later also `https://<vercel-url>/**`).
2. **Supabase → Authentication → Emails → Templates.** The links must go to our `/auth/confirm` with a `token_hash`:
   - *Magic link*, subject «Ο σύνδεσμός σας για το PhysioPath»:
     ```html
     <p>Πατήστε για να μπείτε στο PhysioPath:</p>
     <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Είσοδος</a></p>
     <p>Ο σύνδεσμος λήγει σε 1 ώρα. Αν δεν τον ζητήσατε εσείς, αγνοήστε αυτό το email.</p>
     ```
   - *Confirm signup* (first time someone signs up): the same, with `type=email`.
   - *Invite user*, subject «Πρόσκληση στο PhysioPath»:
     ```html
     <p>Σας προσκάλεσαν να μπείτε στην ομάδα μιας κλινικής στο PhysioPath.</p>
     <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite">Δείτε την πρόσκληση</a></p>
     <p>Η πρόσκληση λήγει σε 7 μέρες.</p>
     ```
3. **Custom SMTP** (Authentication → Emails → SMTP settings, e.g. Resend free tier). Supabase's built-in mailer
   only sends to the project's team members and only a few per hour, so clinic owners and invitees would get nothing.
4. **New secret key** (Project Settings → API keys): create one, paste it as `SUPABASE_SECRET_KEY` in `.env.local`,
   and delete the key that leaked on 11-14.

## Next steps

1. ✅ Migration pushed, RLS checks pass. Re-run them after any schema change: `supabase db query --remote -f supabase/checks/rls_check.sql`.
2. End-to-end test: register with your own email, §1–§4, accept an invite in another browser profile.
3. Plan 2: record → review → approve moved here on Supabase, in the paper look (canvas design first).
4. Plan 3: room board (T-card rack idea) + patient phone screen online.
5. Plan 4: home program `/p/…`, new Vercel project rooted at `08-app`, turn off Vercel auth.

## Plan 2 (rest of the app), phase 2: database (2026-11-15)

Plan: `~/.claude/plans/its-time-to-move-lively-honey.md`. Boards for every new screen: canvas page
«Χαρτιά κλινικής · η αίθουσα» (`project/PR*.dc.html`), approved by the user.

Migration `supabase/migrations/20261116000000_programs_notes_sessions.sql` (local only, git-ignored):
- `programs` rebuilt (were empty): uuid id, `draft_id` (one approval per draft), `token` for `/p/<token>`. No note column.
- `notes` (new): the GeSY note, activity code (PHYS01–04, picked by the physio), session number (counted from history).
  Read and added only by owner/physio: assistants see no rows. This closes the gap where assistants could read notes.
- `sessions` rebuilt (were empty): real columns (room + slot, sets target/done arrays, call reason/time, finished),
  `token` for `/s/<token>`. One open session per slot. Staff can only clear calls, move and finish, and only while open;
  finishing uses the server clock. Composite keys stop a row pointing at another clinic's patient, program or room.
- `approve_program(...)`: program + note + optional card in one transaction (a taken bed undoes all of it; the same
  draft twice returns the first result). Runs with the caller's rights, so RLS applies.
- Patient phone without login: `patient_session(token)`, `patient_action(token, …)` (one guarded update per tap:
  double taps count once, frozen after «Τέλος» or after 12 h), `home_program(token)`. Never the note.
  The secret key stays invites-only.
- `rls_check.sql` updated for the new tables: **rolled-back trial on the online project, 104 checks, 0 failed** (2026-11-15).
- Pushed with the user's OK (`supabase db push --remote`), checks run again on the real schema: **104 checks, 0 failed** (2026-11-15).

## Plan 2, phase 0: online (2026-11-16)

- Vercel project **`physio-path`** (team kouklos, Pro) already had Root Directory `08-app`; it now serves this app at
  **https://physio-path-nine.vercel.app** (deployed from GitHub `main` 432bfc2, READY).
- Env vars added from the CLI (values piped from `.env.local`, never printed):
  Production + Preview: Supabase URL, publishable key, `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
  (the last three stored as Secret: write-only), `NEXT_PUBLIC_SITE_URL=https://physio-path-nine.vercel.app`.
  Development (what `vercel env pull` downloads): only the non-secret ones, site URL `http://localhost:3001`.
- Functions in **fra1** (Frankfurt, next to Supabase). Vercel login wall only on preview URLs; production is public.
- Supabase Auth: Site URL = the Vercel URL; redirect URLs = the Vercel URL and `localhost:3001` (`config.toml`,
  `supabase config push`, diff now empty). Email links use `{{ .RedirectTo }}`, so each app gets its own links.
- `.vercel/` is git-ignored (root `.gitignore`).
- Checked with curl: `/register`, `/login` 200, `/` and `/invite/…` redirect when signed out, served from fra1.
- Left over: `ZZ_TEST` (a test variable, Preview). The CLI needs the user's approval to remove it: `vercel env rm ZZ_TEST`.
- To test by the user: sign up and accept an invite on a phone over mobile data.

## Plan 2, phase 3: record → review → approve (2026-11-16)

Built from the canvas boards PRNew, PRReview, PRApproved; ported from `03-prototype/app/lib`.
- `app/lib/notes/`: `schema.ts` (note = GeSY 4 parts + `patient_ref`, `body_area`; activity codes), `prompt.ts`
  (GeSY section: each part only from what was said, empty part = null + a question, never a diagnosis/code/count),
  `fixes.ts`, `format.ts` (GeSY labels el/en, `noteAsText` with the gesy.md header, `missingParts`), `draft.ts`
  (+ patient, PHYS code, where, `draftId`), `DraftContext.tsx` (sessionStorage), `useRecorder.ts`,
  `generate.ts` (Claude Opus 5.5, effort medium), `proofread.ts` (Claude Haiku 5.5), both `timeout 50 s, 1 retry`,
  `speech/openai.ts` (gpt-transcribe + Cypriot hint), `samples.ts` (examples 02–04 bundled), `approval.ts`
  (payload rules, blank exercises dropped, free slots: beds first then stations, like `check_slot`),
  `actions.ts` (`approveNote` → `approve_program`), `http.ts` + `api.ts` (Greek errors, also for Vercel's HTML 413/504).
- Routes: `POST /api/transcribe` (raw audio ≤ 4 MB) and `POST /api/generate`, `maxDuration = 120`, owner/physio only.
- Pages: `/notes/new`, `/notes/review`, `/programs/[id]` (real QR from `qrcode`, link, copy link, «Αντιγραφή σημείωσης»
  for owner/physio only). `/notes/*` sends assistants home. Home got «Νέα σημείωση» and the staff folder tabs
  (`components/paper/StaffSheet.tsx`); «Κλινική» tab waits for its page (phase 4). `Stamp` takes `word`/`top`.
- Checks: `tsc` clean, **68 tests** pass (28 before) (notes rules, approval rules, staff sheet + axe), `next build` 17 routes.
  Signed out (curl): `/notes/*`, `/programs/*` redirect to `/register`; both APIs answer 401 JSON in Greek.
  Speech-to-text on `03-prototype/test-audio/synth-02.webm`: 2.8 s, numbers kept («δεκαπέντε» heard as «10-15»: the review catches it).
- **Blocked: `ANTHROPIC_API_KEY` is invalid** (Anthropic answers 401, same key as `03-prototype/.env`, and on Vercel).
  Generation can't run and proofreading quietly skips until a new key is set in `.env.local` and on Vercel.
  The GeSY sample check (02–04) is still to do after that.
- Not done here (phases 4–5): `/s/<token>`, `/p/<token>` and the room board, so the QR links 404 for now.

## Sign-up for older users, step A: base pieces (2026-11-16)

Why: the user's mother and a collaborator couldn't finish sign-up. Plan: `~/.claude/plans/propose-a-plan-to-synthetic-haven.md`
(steps A–D: welcome page, 3-step sign-up with a 6-digit email code, rooms/team after sign-up).
- Fields (`LineField`, `LineSelect`): label above in dark semibold, hint under it, a white box with a full border
  (56 px tall, 20 px text), error under the box as «Πρόβλημα: …». `fieldBox()` reused by the invite form. No more `number` («1.3»).
- `Sheet`: no margin rule, «ΔΕΛΤΙΟ» capitals, binder tabs or «Σελ. n / 5»; new `step` prop → «Βήμα n από m» + bar.
  `SectionHeading` has no § mark. `BinderTabs.tsx` deleted. `Card`: no punched hole or typewriter label.
- `HelpLine` («Χρειάζεστε βοήθεια;») on every Sheet and Card; hidden until `HELP` in `app/lib/site.ts` gets a real phone/email.
- Look: headings Literata semibold (GFS Didot removed), `text-base` = 17 px, no italics or 13–15 px text on the
  sign-up, sign-in, invite and home pages (notes pages untouched).
- Words: «Όνομα κλινικής», «Τηλέφωνο για τους ασθενείς», «Είσοδος», «Συνέχεια» (no «στο §2»); empty email →
  «Γράψτε το email σας.»; rooms error no longer says «γραμμές με σημείωση».
- Until step B the old pages stay, counted «Βήμα n από 5».
- Checks: `tsc` clean, 68 tests (BinderTabs test out, label-order + empty-email tests in), `next build` OK.
  Screenshots at 390/1280 px of /register (+ errors), /login, check-email: no sideways scroll, smallest text 17 px.

## Sign-up for older users, step B: welcome page + 3-step sign-up with an email code (2026-11-16)

- `/welcome` (new): «Καλώς ήρθατε», one sentence on what the app does, two equal big buttons «Νέα κλινική · Εγγραφή»
  (green) and «Έχω λογαριασμό · Είσοδος» (outlined, new `PaperLink variant="outline"`). Signed-out visitors of any
  member page land here (`requireMember`/`requireFormUser`), and «Αποσύνδεση» goes here. Signed-in people skip it.
- Flow: `/register` (Βήμα 1 από 3: name + email) → `/register/code` (Βήμα 2: type the 6-digit code) →
  `/register/clinic` (Βήμα 3: name, city, phone, bed counter, agreement → «Ολοκλήρωση εγγραφής») → `/?welcome=1`.
  Removed: `/register/{rooms,team,sign,check-email}`, `/login/check-email`; `/register/done` redirects home.
- Code: `otp_length = 6`; `confirmation.html` and `magic_link.html` show the code large, then the button (still works on
  any device). New subjects «Ο κωδικός σας για την εγγραφή / για είσοδο στο PhysioPath» (also `EMAIL_SUBJECTS` in
  `app/lib/site.ts`, shown on the code page). Pushed with `supabase config push` (diff afterwards: none).
- Actions: `sendLink` → code page; `verifyCode` (`verifyOtp` type `email`, spaces/dashes dropped by `CodeSchema`);
  `resendCode` («Στείλαμε νέο κωδικό στις hh:mm»); `finishRegistration` = clinic + `firstRoom(beds)` + empty team
  into the draft, then the unchanged `finish_onboarding` RPC. `saveClinic/saveRooms/saveTeam/fileRegistration`,
  `FilingSchema`, `progress()` removed. `/login/code` shares `CodeForm` on the small card.
- The agreement is one plain sentence in a big tappable box, «Τι σημαίνει αυτό;» opens the longer text.
  The name from step 1 is reused (asked again only if the account has none). `Counter` moved to `components/paper`.
- Checks: `tsc` clean, 70 tests (code + clinic-step schema tests), `next build` OK. End to end on the dev server with a
  throwaway account (code from the admin API, no email sent) at 390 px: `/` → `/welcome`, wrong code → error,
  real code typed as «123 456» → clinic step, no agreement → error with the bed count kept, then home with
  «Η εγγραφή ολοκληρώθηκε». Test account and its clinic deleted afterwards.
- Next (step C): «Επόμενα βήματα» on home, `/settings/rooms`, `/settings/team` (+ `add_invites` migration).
- Follow-up (same day): **logo «Φ»** chosen from four ideas (γωνιόμετρο, Φ, φωνή→βήματα, έγκριση): the oval is a
  joint, the green line the limb through it. `components/paper/Logo.tsx` (`Logo`, `LogoMark`) in the header of
  Sheet, Card, StaffSheet and the invite card; `app/icon.svg` (green square, white oval, yellow line) is the tab icon.
  Welcome text now «Το PhysioPath είναι ένα εργαλείο για φυσιοθεραπευτές:» + 3 numbered steps (Μιλάτε / Ελέγχετε / Έτοιμο).
- Follow-up: faint repeated «Φ» on the desk around the welcome, sign-up and sign-in cards (`.desk-pattern` in
  `globals.css`, inline SVG tile, two marks per 180 px tile, one slightly turned; used by `Card` and `Sheet`, not staff pages).
- Follow-up: **welcome page full screen** (no card), after the layout of the user's portfolio (hotvader.github.io):
  top bar (logo · «Είσοδος»), kicker «Για φυσιοθεραπευτές και κλινικές», headline «Μιλάτε. Το PhysioPath γράφει.»,
  one paragraph, the two buttons stacked, a large line-drawn Φ on the right (≥1024 px only), the three steps as a
  strip with thin dividers at the bottom (stacked on a phone), help line. Sign-up and sign-in keep the card + Φ pattern.
- Follow-up: welcome page sized to fit one laptop screen without scrolling (measured: 1280×650, 1366×680,
  1440×780 all fit): headline 38/48/54 px on two lines, kicker removed, buttons side by side from 640 px, smaller Φ,
  slimmer strip. Phones (390 and 360 wide): both buttons inside the first screen, the steps scroll below, no sideways scroll.
- Follow-up: **every sign-up/sign-in card fits one screen** (measured with a throwaway account, deleted after):
  `/register`, `/register/code`, `/login`, `/login/code` fit at 1280×650, 1366×680, 1440×780, 390×844 and 360×740;
  `/register/clinic` fits all three laptop sizes. How: tighter Sheet/Card padding, 52 px fields, «Βήμα n από 3» in the
  header when it's free, `wide` Sheet/Card (two columns ≥1024 px): code page puts «Δεν ήρθε το email;» beside the
  code (on phones it folds into a tap-to-open line); clinic step in two columns, one-line hints, «Τι σημαίνει η
  συμφωνία;» beside the button. Not fitting: the clinic step on phones (+129 px at 390×844, one swipe), and with three
  errors on the smallest laptops (+39 px); after a failed submit the page focuses and scrolls to the first field
  with a problem. The email on the code page no longer breaks mid-word.
- Follow-up: Sheet and Card **centred vertically** (flex, `min-h-dvh`, `justify-center`): measured equal space above and
  below (and left/right) on /register, /register/code, /login, /login/code at 360/390/430-wide phones and laptops.
  A card taller than the screen starts at the top. Sign-in no longer repeats «κωδικό 6 ψηφίων» as the email hint.

## 2026-11-16 · Sign-up redesign, step C: rooms and team after sign-up
- Home (owner): **«Επόμενα βήματα»** with two big link cards, ① «Ρυθμίστε τους χώρους σας» → `/settings/rooms`,
  ② «Καλέστε την ομάδα σας» → `/settings/team`, each turning into ✓ «Έγινε»; «Δουλεύω μόνη/ος, δεν χρειάζεται»
  under ② (most clinics we talk to are one physio). The section goes away when both are done; «Χώροι · Αλλαγή» and
  «Ομάδα · Διαχείριση» stay in the clinic details. The invite list moved from home to the team page.
- `/settings/rooms`: one card per room (name box, then «Κρεβάτια − n +» and «Θέσεις άσκησης − n +»), stacked on a
  phone, no table; «+ Προσθήκη χώρου» puts the cursor in the new name; a room with a problem gets a red border and
  «Πρόβλημα: …»; nothing changes until «Αποθήκευση». Removed «Α/Α», «υποδοχή», «Σύνολο».
- `/settings/team`: **one person per press** (email + role + «Αποστολή πρόσκλησης»), so a typed email can't be lost
  (the trap in the old §3). Role as two big choice cards, each saying what that person sees; «Βοηθός» chosen by
  default (sees least). List with status, «Ξανά αποστολή» and «Ακύρωση». Clear messages for own email, someone
  already in the team, and an email already invited.
- Database (`20261116120000_settings_rooms_team.sql`, `20261116130000_team_checked.sql`, pushed live):
  `save_rooms(items)` saves the whole list in one transaction (owner only; room order constraint now deferrable);
  `add_invites(items)` (owner only, returns tokens for the email); a trigger stops a room losing a bed or station a
  patient is on right now (open session in the last 12 h); `clinics.rooms_checked_at` / `team_checked_at` for the ✓.
  `rls_check.sql`: +17 checks (reorder, bed in use, room in use, add/remove, another clinic's room, invites refused for
  own email / team member / already invited / same email twice, assistant and anon refused): **121/121 pass**.
- Code: `sendInvites` moved to `lib/onboarding/invites.ts` (server only), `confirmLink` to `lib/site.ts`,
  `requireOwner()` in `session.ts`, settings actions in `lib/settings/actions.ts`. Times in messages are 24-hour
  («21:35», was «09:35 μ.μ.», which the page then refused to show).
- Checks: `tsc` clean, 73 tests, `next build` OK. End to end on a production build (no email key, so nothing sent)
  at 390×844 and 1280×720 with throwaway accounts (deleted after): sign-up → next steps → rooms (empty room error,
  add, save) → team (empty, own email, invite, same email again, cancel) → home without «Επόμενα βήματα»; no
  sideways scroll. Note: `next dev` blocks its scripts for 127.0.0.1 (allowedDevOrigins), so browser tests use `next start`.

## 2026-11-17 · Sign-up redesign, step D: invite and sign-in wording
- **Invite page** (`/invite/[token]`): the yellow carbon copy («ΑΝΤΙΓΡΑΦΟ», torn edge, red margin) replaced by the
  same plain `Card` as sign-in: «Πρόσκληση από {κλινική}», «Η/Ο {όνομα} σας καλεί στην ομάδα της κλινικής, ως
  φυσιοθεραπευτή/βοηθό», one sentence on what they'll do, «Το ονοματεπώνυμό σας» (boxed field), «Αποδοχή →».
  Problems say what to do next: used («πατήστε Αρχική»), expired (ask the clinic to send it again), wrong account
  (sign out, sign in with the invited email), not found (open it again from the email's button).
- **Sign-in for an invite**: opening an invite signed out goes to `/login?next=/invite/…`, which now reads «Δείτε την
  πρόσκλησή σας · Γράψτε το email στο οποίο ήρθε η πρόσκληση» (label «Πρόσκληση», no «Νέα κλινική» or «Πίσω»),
  instead of «Καλώς ήρθατε ξανά» to someone who has never been here. The code page keeps the «Πρόσκληση» label.
- **Invite email** (`supabase/templates/invite.html`, pushed with `supabase config push`): same light look as the
  code emails; «Πρόσκληση από {κλινική}», who invites, the role, one line on what PhysioPath is, «Δείτε την
  πρόσκληση →», «Δεν χρειάζεστε συνθηματικό».
- Wording search across `app/` and the email templates: no §, «κατάθεση», «δελτίο», «συνημμένο», «υποδοχή» or
  «ΑΝΤΙΓΡΑΦΟ» left in anything people see. Left as is (staff pages, not sign-up): «Σελ. 1 / 2» and the capital
  titles on the voice-note pages.
- Checks: `tsc` clean, 73 tests, build OK. End to end (production build, no email key, throwaway accounts deleted
  after): owner signs up and invites → colleague opens the invite signed out (invite sign-in page) → signed in
  (invite card) → empty name error → accepts → home as «Φυσιοθεραπευτής»; owner's list shows «Μπήκε στην ομάδα ✓»;
  used / wrong-account / made-up invite messages; no sideways scroll at 390 px.
- Still to do in step D: **the real test** (the user's mother and the collaborator sign up alone on their own phones).

## 2026-11-17 · Phase E: the plain look on the staff side
- Decided with the user: apply the sign-up look straight in code (no new canvas boards); the room board will
  be plain room columns (not the T-card rack).
- `StaffSheet`: a plain top bar (logo → home, «Αίθουσα», «Νέα σημείωση» with a green underline on the current
  one, name · role, «Αποσύνδεση») instead of folder tabs; one sheet under it, no red margin, no double rule, no
  «Σελ. n / m», no capital title. `step` shows «Βήμα 1 από 2» (shared `StepBar` from Sheet). `PartHeading`
  (Roman numerals) → `PartTitle`; tilted stapled `Slip` → flat `Panel` (yellow / green / pink / white).
- `/notes/new`: «Για ποιον ασθενή;» as big boxed choices; the patient name as a boxed field; «Ηχογράφηση» with
  the record button as the main green button; «Τι ακούσαμε» in a white box (no ruled lines, no typewriter
  font); «Διορθώσαμε 2 λέξεις» in a green box. No italics, nothing under 17 px.
- `/notes/review`: plain titles («Το πρόγραμμα του ασθενή», «Η κλινική σημείωση για το ΓεΣΥ», «Πού κάνει τις
  ασκήσεις τώρα;», «Έγκριση»); **one card per exercise** (name, then Σετ / Επαναλήψεις / Κράτημα / Πόσο συχνά in
  2 columns on a phone, 4 on a laptop) instead of a 780 px table that scrolled sideways; missing values yellow with
  «λείπει»; questions in a flat yellow box; where-choices as boxes; «Εγκρίνετε ως {όνομα}, {ημερομηνία}» instead of
  a signature line; errors start with «Πρόβλημα:» and the page scrolls to the first.
- `/programs/[id]`: green «✓ Εγκρίθηκε στις 17 Νοεμβρίου 2026, 17:16, από εσάς» instead of the violet stamp; QR in a
  plain white box «Για το κινητό του ασθενή, τώρα»; «Κλινική σημείωση για το ΓεΣΥ» in a white box (was «ΣΥΝΗΜΜΕΝΟ»).
- Home: no second «Αποσύνδεση» (it's in the top bar), clinic details in the normal font, plain lines.
- Removed: `Stamp`, `Attachment`, `Slip`, `PartHeading`, the stamp animation, ruled lines and the unused colour
  tokens (ledger, margin, stamp, tab-blue/violet/done).
- Checks: `tsc` clean, 71 tests (stamp tests removed, StaffSheet test rewritten), build OK. Screenshots with a
  throwaway owner (deleted after) at 390×844 and 1280×800: home, new note (sample), review (fictional draft, two
  missing values, two questions), empty «Έγκριση» → two «Πρόβλημα:» and focus on «Κωδικός πράξης», approve → approved
  page. No sideways scroll, no text under 17 px on any of them.
- Follow-up (user): **a voice note in 3 steps**, one page each. ① `/notes/new` «Για ποιον ασθενή;»: the clinic's
  patients as big boxes (a search box from 9 patients up), «+ Νέος ασθενής» with «Μικρό όνομα ή κωδικός» (hint says
  why: only what tells them apart; error clears while typing; «Υπάρχει ήδη «Γιώργος Δ.» στη λίστα… διαλέξτε τον»
  for the same name), «Συνέχεια στην ηχογράφηση →». If a note was left half-way: «Έχετε μια σημείωση που δεν
  τελείωσε, για «…»» with «Συνέχεια σε αυτή» / «Νέα σημείωση, από την αρχή». ② `/notes/record` «Ηχογράφηση · Για:
  Γιώργος Δ. · Αλλαγή ασθενή» (opened without a patient → back to ①). ③ `/notes/review` («← Πίσω στην ηχογράφηση»).
  `NewNoteForm` became `notes/record/RecordForm.tsx`; new `notes/new/PatientForm.tsx`. Checked at 390 px with a
  throwaway owner and two fictional patients (deleted after).
- Follow-up (user): **«Νέα συνεδρία» with «Ίδιο πρόγραμμα»** (renamed from «Νέα σημείωση» in the top bar,
  home and links). 4 steps: ① patient → ② `/notes/program?patient=` «Ίδιο πρόγραμμα ή αλλαγή;» (the patient's last
  approved program in plain words, then «Ίδιο πρόγραμμα» / «Αλλαγή προγράμματος»; skipped for a new patient or one
  with no program) → ③ recording → ④ review. Decided with the user: «Ίδιο πρόγραμμα» still records a short note
  about today (GeSY needs one per visit); physios and the owner only.
  - Same program: the recording asks only about today; `/api/generate` with `mode: "note"` uses the same rules plus
    one paragraph (write only the note, never add/remove/change exercises, don't ask about sets) and returns
    `NoteOnlyResult`; the stored program is never sent to the AI. Review shows the program read-only
    (`notes/ProgramSummary.tsx`) with «Αλλαγή προγράμματος»; only the GeSY note and the place are checked.
  - Draft: `mode` ("new"/"same") and `base` (the stored program); another patient or another choice clears the
    generated result (the transcript stays). Test added.
  - Database (`20261117120000_same_program_sessions.sql`, pushed live): notes get their own `id`, `session_id`
    and `draft_id` (one program, many visits; a double click saves once); a program can go on the board again;
    `continue_program(...)` (security invoker: owner/physio, own clinic, patient not archived) saves today's note
    and the card in one go; `approve_program` now links note ↔ session and returns `noteId`. RLS checks +10:
    **131/131 pass**. The approved page shows one visit (`?note=`), so visit 1 and visit 2 keep their own note and QR.
  - Checked with a throwaway clinic (deleted after): visit 1 new program → visit 2 «Ίδιο πρόγραμμα» → same program,
    note 2 «Συνεδρία 2», card on bed 2; a new patient skips step 2. The Anthropic key works again: note-only mode
    returned only the GeSY note in 5 s, questions only about today, no program, nothing added.
- Security review (user, 2026-11-17): the database now checks the **inside** of every saved program, not only
  "an object with an exercises array", so a direct API insert that skips the app can't store a broken program.
  Each saved program carries `"version": 1` (`PROGRAM_VERSION`, stamped by `cleanProgram`), and pages read
  programs only through `readProgram()` in `app/lib/notes/schema.ts` (programs saved earlier, without a version,
  read as version 1). Two indexes on `clinic_id` (programs, notes) keep the RLS filter fast as data grows.
  Migration `20261117180000_program_shape.sql` + new RLS checks written; **not pushed yet** (the user pushes it).
  75 tests pass, build OK.
- **One login, several clinics** (user, 2026-11-17), phase A of 4 (database). Decided with the user: anyone already in a
  clinic can open another one (they become its owner, at most 10); someone in a clinic can accept an invite from
  another (a physio who works in two); each clinic stays completely separate. A `memberships` table (one row per
  person per clinic, with the role there) is the source of truth; the profile's clinic now means "the clinic open
  right now", and the database refuses a profile pointing at a clinic or role without a membership. The policies
  and `my_clinic_id()` / `my_role()` are unchanged. New `my_clinics()`, `switch_clinic()`, `create_clinic()`;
  sign-up, invites and «already in the team» use memberships; deleting the open clinic opens the next one.
  Migration `20261117200000_many_clinics.sql` + 22 new RLS checks written, **not pushed yet** (the user pushes).
  Next: B switching (top bar + /clinics), C /clinics/new, D every form carries its clinic (stale-tab guard).
  - 2026-11-17: phase A pushed live (with the program-shape migration); RLS checks **165/165 pass**.
  - Phase B (switching): the top bar shows the open clinic with «Αλλαγή» (`aria-label` «Αλλαγή κλινικής": the
    sr-only span gave screen readers "Αλλαγήκλινικής"); `/clinics` «Οι κλινικές σας» lists each clinic with the role
    there, «Ανοιχτή τώρα» or «Άνοιγμα» (`switchClinic` → `switch_clinic()`), then home says «Ανοίξατε την κλινική …».
    The profile carries `clinic_name`; `loadMyClinics()`. The invite page doesn't ask the name of someone already in
    a clinic (they keep it). 76 tests pass, build OK. Next: C `/clinics/new`, D stale-tab guard.
  - Phase C (new clinic): `/clinics` has «+ Νέα κλινική» → `/clinics/new`, the sign-up clinic form in `mode="new"`
    (no name field and, per the user 11-18, no beds: it starts with «Αίθουσα» · 1 bed and the owner sets the rooms from «Επόμενα βήματα»; «Δημιουργία κλινικής», the agreement again in its own words: each clinic is responsible for
    its own patients' data). `createClinic` → `create_clinic()`; home then says «Η κλινική «…» δημιουργήθηκε και
    είναι ανοιχτή» with that clinic's «Επόμενα βήματα». The 10-clinic limit has its own message. 77 tests, build OK.
  - Phase D (stale-tab guard), 2026-11-18: opening another clinic changes it for every tab, so every form that saves
    for the clinic carries the clinic it was opened for (hidden `clinicId`): rooms, invite, «Ξανά αποστολή»,
    «Ακύρωση», «Δουλεύω μόνη/ος». `requireSameClinic()` (session.ts): no match → nothing saved, the open clinic's
    home with a yellow note «Δεν αποθηκεύτηκε τίποτα. Στο μεταξύ ανοίξατε άλλη κλινική…» (`?stale=1`). The voice
    note lives in the tab, so the draft is stamped with the clinic it was started in (`Draft.clinicId`,
    `stampClinic`); the review page warns and `approveNote` refuses it while another clinic is open (the draft
    stays). Not a security check (the database keeps every rule): it keeps work in the clinic meant. 80 tests,
    build OK. **One login, several clinics: phases A–D done**, uncommitted.

### Later (after the demo): two tabs, two clinics
Asked by the user 2026-11-18, postponed. Today the open clinic is one per person (saved in the profile), so
every tab and browser shows the same clinic; phase D only stops wrong-clinic saves. To work in two clinics
side by side, each tab carries its own clinic:
- **E1 database:** every server request sends the tab's clinic as a header; the two helpers that every policy
  uses return it only if the person has a membership there (a faked header sees nothing), and the role there.
  The policies stay the same; the owner-only functions use the helpers instead of the profile. RLS checks,
  including a faked header.
- **E2 addresses:** clinic pages move under `/c/[clinic]/…` (home, notes, programs, settings); `/` opens the
  clinic used last; links and redirects stay in the same clinic.
- **E3 server:** pages and actions make their database client for their tab's clinic; the hidden `clinicId`
  from phase D becomes the clinic to save into (instead of a refusal).
- **E4 top bar:** «Αλλαγή» lists the clinics, each can open in a new tab.

## 2026-11-18 · Phase 4: the room board and the patient's phone
Plan: `~/.claude/plans/lets-plan-phase-4-ticklish-emerson.md`. Decided with the user: refresh every 3 s (no Realtime),
fix the «τώρα» gap, clinic details move to «Κλινική».
- **Database** (`20261118000000_session_current_exercise.sql`, pushed live after a rolled-back trial):
  `sessions.current_exercise`; `patient_action` gets `show` (the patient tapped another exercise) and `setDone`
  moves on by itself after the last set; `patient_session` returns `current`. RLS checks **169/169** (+4).
- **Shared rules** `app/lib/board/session.ts` (+ test): reading the phone's data safely, the allowed taps
  (`PatientAction`), «τώρα» (`nowExercise`), progress, undo target, board status, «πριν από N λεπτά».
- **Patient phone** `/s/<token>` (no login): `app/lib/board/patient.ts` (anon client → `patient_session` /
  `patient_action` only), `app/api/s/[token]` (GET every 3 s, POST one tap, ≤1 KB, zod, 404 for a wrong token,
  no-store), page with noindex + no-referrer. Screen «One thing at a time» (user's choice after the first,
  boxy version was rejected): top bar Φ · «Αα» · «Φυσιοθεραπευτής» (call: απορία / πονάω), «Άσκηση n από N»
  with a thin line + «Όλες οι ασκήσεις», the exercise and a huge set number, compact hold timer, «Μετά: …»,
  one green button fixed at the bottom, «Αναίρεση» a small link; after «Τέλος»: the home-program link.
  Sizes in rem so «Αα» (125/150/175 %) enlarges everything. `TextSize` lives in `components/patient/`.
- **Room board** on `/` (every role): `app/lib/board/board.ts` (rooms + open cards < 12 h, through RLS),
  `app/api/board` (login only), `app/lib/board/actions.ts` («Το είδα» only for the call seen, «Τέλος» only
  while open; 0 rows → «Άλλαξε ήδη»), `components/board/RoomBoard.tsx`: one column per room, one box per
  bed/station (free / patient + «Τώρα: …» + «Σετ x από y» + bars / pink ! pain / yellow ? question / ✓ done),
  «Χωρίς θέση», waiting order, new calls announced (aria-live) and counted in the tab title, «Τέλος» asks first.
- **«Κλινική»** (`/settings`, new tab in the top bar): the clinic details moved from home, unchanged.
- Checks: `tsc` clean, **102 tests**, build OK. Screenshots: phone at 390 px on a real session (production
  build on :3002), board at 1280 px through a temporary local page with fictional patients (deleted after).
- Note: a dev server started before new files exist can serve stale Tailwind CSS: restart `npm run dev`.
- Still to do: the end-to-end run with two browsers (approve → scan → set, jump, pain → «Το είδα» → «Τέλος»),
  then push; phase 5 (`/p/<token>`); the app-wide design pass the user asked for.

## 2026-11-19 · Code-review fixes, Phase A: money and demo safety
Plan: `~/.claude/plans/1-4-i-think-now-lazy-castle.md` (5 phases, from `docs/code-review.md`).
- **AI limits** (`20261119120000_ai_limits.sql`, pushed live after a rolled-back trial): counters in `private`
  (`ai_usage` per clinic per day, `ai_usage_user` per person per minute, `ai_usage_total` per day). RLS on, no
  policies, all rights revoked. `public.use_ai(kind)` (definer, owner or physio) counts and refuses:
  3 programs / 6 recordings a minute per person, 40 / 80 a day per clinic, 400 each a day for the whole app.
  A refused call adds nothing. Both AI routes call it (`countAiCall` in `app/lib/notes/http.ts`) before the AI,
  and the refusal becomes a 429 with a Greek message (`app/lib/notes/ai-limits.ts`). RLS checks **183/183** (+15).
- **Captcha** (Cloudflare Turnstile): `app/components/paper/Captcha.tsx` on sign-in, sign-up and «νέο κωδικό».
  The token goes into `signInWithOtp`. It is hidden until `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set; Supabase's
  captcha stays off until then. Invite emails to existing accounts now use the admin client (no captcha needed).
- **Proofreading removed** (`proofread.ts`, `fixes.ts` and the «Διορθώσαμε» box): OpenAI's text goes straight in.
- Checks: `tsc` clean, **124 tests**.
- Later (user's choice): checking that a clinic is real (registry number + admin approval page), and billing
  from the `ai_usage` counts.

## 2026-11-20 · Code-review fixes, Phase B: the board and the note flow
No database changes. Each step was tested by the user in Firefox, Safari and Chromium.
- **Wi-Fi drops (1.7):** a board press that fails says «Δεν στάλθηκε…» on its card. No answer in 10 s says
  «Δεν πήραμε απάντηση…». The buttons always work again. An old refresh can't undo a press (version counter).
  A 401 stops polling and hides names. New `app/error.tsx` (Greek, «Δοκιμάστε ξανά»).
- **Two tabs (1.1, 1.3):** named tabs (`app/lib/tabs.ts`, `TabLink`/`TabName`): board, work, clinic. The top bar
  goes to the right tab (Safari and Chrome switch to it; Firefox won't let sites switch tabs, so there it opens a
  new one). «Πλήρης οθόνη» on the board, and «QR / οθόνη ασθενή» opens in a new tab. `ClearDraft` runs only on
  `?approved=1`. «Αλλαγή ασθενή» is locked while the AI works. A late answer for another patient is dropped
  (`noteFor`), and one that arrives after the physio left is still saved (`DraftProvider` safety net).
- **Old text (1.2):** `resultTranscript` + `isStale`. «Το κείμενο άλλαξε…» with «Νέο πρόγραμμα» / «Κράτα αυτό»
  (`app/notes/StaleNotice.tsx`). «Έγκριση» waits until the physio chooses.
- **Whose note (1.10):** `Draft.userId`. Someone else's saved note is thrown away, «Αποσύνδεση» deletes it, and
  sign-out is for this browser only (`scope: "local"`).
- Checks: `tsc` clean, **158 tests**, build OK.
- Later: an offline page (service worker) for page loads; a failed sign-in check should show an error page, not
  /welcome (seen once with a 43 s call to Supabase).

## 2026-11-21 · Code-review fixes, Phase C: invites that work
- **Email links (1.5):** `/auth/confirm` no longer uses a token_hash link itself. It goes on to `/auth/continue`,
  a «Συνέχεια» page, and only that press signs in (`followEmailLink`). Email scanners (Outlook Safe Links) used up
  the link before the person clicked, and the page also stops a stranger's link from signing someone in silently.
  A failed link keeps `next` (`loginAfterLink`), so an invite stays an invite: the sign-in page says the invite is
  still valid, and after the code the person lands on it. `invite.html` says the button lasts 1 hour and gives the
  invite page (`.Data.invite_url`) for the 7 days.
- **Existing accounts (1.6):** before the sign-in email, the server puts `invite_clinic` / `invite_by` /
  `invite_url` in the person's metadata (`user_id_for_email`, service role only), so `magic_link.html` reads as an
  invite. It is cleared once they sign in. `confirmation.html` speaks about the invite for invitees too.
- **Waiting invites in the app** (`20261121120000_my_invites.sql`, pushed live after a rolled-back trial):
  `my_invites()` returns the caller's own open invites (confirmed email only). They are shown by `InviteNotice` on
  home, «Οι κλινικές σας» and the sign-up clinic step (so an invitee doesn't create an empty clinic).
  RLS checks **192/192** (+10).
- The 3 templates were pasted into the Supabase dashboard by the user (`config push` would also send the local
  captcha setting, which is off).
- Checks: `tsc` clean, **170 tests**, build OK.

## 2026-11-22 · The owner manages the team (code review 2.1, 2.5; brought forward from Phase E)
- **Database** (`20261122120000_team_members.sql`, pushed live after a rolled-back trial): `clinic_members`,
  `remove_member`, `change_role` (owner of the open clinic only), `leave_clinic` (anyone), and the trigger
  `keep_an_owner`. A living clinic always keeps an owner, even when a login is deleted from the dashboard.
  Removing someone deletes the membership; the existing FK + `reset_membership` move them to their next clinic or
  back to no clinic, and RLS cuts access at once. They can be invited again. RLS checks **212/212** (+20).
- The same push also applied `20261121130000_no_passwords.sql` (the user's own fix for security to-do 1: every
  password is wiped, since the app only uses email codes). It wasn't in the trial; checks pass and code sign-in was
  tested by the user afterwards. From now on: list the pending migrations before every push.
- **App:** «Η ομάδα σας» lists members (name, email, role selector + «Αλλαγή», «Αφαίρεση» with a confirm step) and,
  separately, the invites still waiting. «Οι κλινικές σας» has «Αποχώρηση». `ConfirmSubmit` asks before a form is sent.
- **No clinic → `/start`:** a welcome with the waiting invites and «Εγγραφή της κλινικής μου», instead of being
  thrown into new-clinic registration (`requireMember`, `/welcome`).
- Checks: `tsc` clean, **171 tests**.

## 2026-11-24 · «Δοκιμάστε το»: try the app without an account (`/try`)
- **Why:** busy clinic owners won't give a stranger 30 minutes, but they might give 2. The link in emails and
  messages (`/try?r=<code>&lang=en`) opens a private demo clinic in one press: no account, no email.
- **Database** (`20261124120000_demo_clinics.sql`, pushed live after a rolled-back trial on live, 345/345):
  - `clinics` + `is_demo`, `demo_expires_at`, `demo_ref` (the r= code), `demo_lang`; real clinics keep the defaults.
  - `start_demo(ref, lang)`: anonymous logins only (Supabase anonymous sign-in). One clinic «Κέντρο Δοκιμής» with
    4 fictional patients: programs, GeSY notes, 7 days of home diary, and 4 board cards (pain 3′ ago, question 1′
    ago, exercising, done). `refill_demo()` puts the cards back when the 12-hour board window has passed.
  - Triggers: a visitor can't make a real clinic (any path), and no invite can be made by a visitor or in a demo.
  - `use_ai`: a demo gets 5 recordings + 5 programs in all, and demos have their own daily total (60/kind), so
    they never use up real clinics' 400 a day.
  - Cleanup: `private.purge_demos()` every night at 02:00 UTC (pg_cron): expired demos, then visitors' logins left
    without a clinic. RLS checks **345/345** (+21 demo checks).
- **Live auth:** anonymous sign-ins turned on with a config push that declared only that one property (a full
  `config push` would have turned the live captcha off). Captcha (Turnstile) also protects `/try`.
- **App:** `/try` (ΕΛ/EN switch, the r= code kept), `DemoStrip` on every staff page («Θέλω τη δική μου κλινική»
  → signs the visitor out → `/register`), `DemoTips` on the board, no invites / «Νέα κλινική» in a demo, a visitor
  never lands on sign-up (`requireFormUser`, `/start` → `/try`). Texts in `app/lib/demo/text.ts`; the screens inside
  the app stay Greek. Welcome page links to `/try`.
- Checks: `tsc` clean, **248 tests**.

## 2026-11-24 · Templates, phase 1: «Αποθήκευση ως πρότυπο» and «Πρότυπα» (branch try-demo)
- **Why:** P03 asked for program templates from his clinic's data; building them in Physitrack took him a long time.
  Templates come only from programs the physio approved, never from the AI (CLAUDE.md).
- **Database** (`20261124180000_templates.sql`, pushed live 2026-11-24 after a rolled-back trial, 372/372):
  - `templates` (clinic, name, program, archived_at). Same shape check as programs, plus no patient name or next
    appointment in it. Names unique per clinic among the active ones (capitals don't count). Read: owner + physio.
  - `save_template`, `rename_template`, `archive_template` (security definer, the usual clinic and role checks).
  - `fill_demo`: new demos get 3 templates (knee, shoulder, back) from the fictional programs.
  - `rls_check.sql`: a templates section (save, tidy name, duplicate, other clinic, B, assistant C, archive and
    reuse of the name, direct writes refused, no patient in a template), demo templates, cleanup, anon calls.
- **App:** «Αποθήκευση ως πρότυπο» box on `/programs/[id]` (name prefilled with the program title); new page
  `/templates` (each template opens to its exercises, «Μετονομασία», «Αρχειοθέτηση»); «Πρότυπα» in the top bar.
  Code in `app/lib/templates/` (actions, load).
- Checks: `tsc` clean, **269 tests**, `next build` OK.

## 2026-11-24 · Demo: the guide restarts properly, and visitors see their limits
- **Guide:** «Από την αρχή» on steps 1–3. Step 1 now remembers when it started (`since`) and only a program approved
  after that finishes it. Before, any visitor program (count > 4) skipped step 1 after a restart.
- **Limits** (`20261124200000_demo_ai_left.sql`, pushed live after a rolled-back trial, 376/376): `demo_ai_left()`
  reads what a demo has left of its 5 programs (Claude) and 5 recordings (OpenAI); null in a real clinic. The 5 is
  also in `use_ai`: change both together. The record page shows «Προγράμματα που μένουν: N από 5 · Ηχογραφήσεις που
  μένουν: N από 5», refreshes after each call, and rests the record buttons when recordings run out. Guide step 1
  and the limit error say the numbers.
- Checks: `tsc` clean, **273 tests**.

## 2026-11-24 · Templates, phase 2: «Ξεκινήστε από πρότυπο» in the voice note
- **Recording page:** for a new program, when the clinic has templates, a picker «Ξεκινήστε από πρότυπο
  (προαιρετικό)». With one picked, the instruction says to say only what changes. The review says
  «Από το πρότυπο «…»». Not offered for «Ίδιο πρόγραμμα». Draft: `template` {id, name}; another template,
  «Ίδιο πρόγραμμα» or another patient clears it; a slow answer for another template is thrown away.
- **AI:** mode `template` in `/api/generate`. The route reads the template itself with the physio's login (open
  clinic, not archived), before counting the call; the browser sends only its id. Prompt: `FROM_TEMPLATE` added
  after the usual rules (keep the template exactly, apply only the changes said, add nothing from elsewhere,
  patient name and appointment only from the transcript). Still one Claude call per program.
- **Live test with Claude, 3 fictional cases** (knee template): unchanged → identical program; "remove heel slides,
  SLR 2 sets" → exactly that; "add wall half-squats 3x10 daily, ice 15′" → added and changed, and it asked about
  the template's «Όχι καθίσματα ακόμα» clashing with the new squats. It also asks to confirm the side (left knee)
  that comes from the template.
- Checks: `tsc` clean, **282 tests**, `next build` OK. No database change.
- **«Όπως είναι» / «Με αλλαγές»** (after the user's test): under the picker, two choices and a preview of the
  template's exercises. «Όπως είναι» (picked first) writes only the GeSY note (mode `note`, as for «Ίδιο
  πρόγραμμα») and puts the template's program in unchanged: the AI never sees it. The review can still edit it
  by hand. «Με αλλαγές» is the template mode above. **286 tests.**

## 2026-11-24 · Templates, phase 2b: finding a template quickly
- **Why:** with 30 templates a list is too long. The user asked for "suggestions"; agreed: by the area the physio
  wrote in the patient's last note, plain matching, never an AI choice from the diagnosis (CLAUDE.md, MDR).
- **Database** (`20261124220000_template_areas.sql`, pushed live after a rolled-back trial, 388/388):
  `templates.area`, `uses`, `last_used_at`; `save_template(…, p_area)` (old 3-argument call dropped);
  `set_template_area`; `mark_template_used` (after «Έγκριση», not on a second press); demo templates get
  «Γόνατο», «Ώμος», «Μέση» (also the demos already made).
- **App:** `app/lib/templates/area.ts` (side words dropped, no accents: «Αριστερό γόνατο» ↔ «Γόνατο»; search
  by word starts; groups by area, «Χωρίς περιοχή» last; most used first). `TemplatePicker` on the recording
  page: search (over 5 templates), «Προτεινόμενα · Γόνατο · από την τελευταία σας σημείωση», all templates by
  area, folds to the chosen one with «Άλλο πρότυπο». Step 2 reads the last note's area into the draft
  (`patientArea`). «Περιοχή» field when saving (prefilled from the note) and on «Πρότυπα» («Αποθήκευση αλλαγών»).
- Checks: `tsc` clean, **301 tests**, `next build` OK.


## 2026-11-24 · Templates, phase 3: «Πείτε τα πρότυπά σας» (`/templates/dictate`)
- **Why:** a new clinic starts with an empty «Πρότυπα» library, and building templates one by one is what took
  P03 so long in Physitrack. The physio now says their usual programs once; each becomes a card to check and save.
  Nothing reaches the library without «Αποθήκευση».
- **Page:** linked from «Πρότυπα» (under the title, and in the empty state). «Τι να πείτε» (number + name,
  exercises with doses, instructions), recording (`useRecorder`, the box `LiveRecording` now shared with
  `RecordForm`), file, typed text, a fictional sample (`TEMPLATES_SAMPLE`). Each recording's text goes after the
  text already there (3′ each, as many as wanted). «Δημιουργία προτύπων» → one card per template
  (`TemplateDraft`): the AI's questions for it, name, area, patient title, exercises (yellow «λείπει»), the four
  lists, «Αποθήκευση» / «Δεν το θέλω»; saved cards fold to one line with «Άνοιγμα». «Αποθήκευση όλων (N)» saves
  one at a time; refused ones stay with their problem. A name already in the library is a warning while typing;
  the database decides. New cards replacing unsaved ones asks first. State in sessionStorage
  (`physiopath:template-dictation`, reducer `app/lib/templates/dictation.ts`), dropped for another user/clinic.
- **AI:** mode `templates` in `/api/generate`, its own prompt `DICTATE_TEMPLATES` (same rules worded for
  templates: only what was said, never an extra exercise or template, name and area from the physio's words, no
  patient, questions per template + general ones, at most 10). Schema `TemplatesResult { templates: [{ name,
  area, program, questions }], missing_or_unclear }`; `tidyTemplates` cuts to 10 (with a line) and clears any
  patient. One counted Claude call; `max_tokens` 32000, 110 s in one try for this mode.
- **Live test with Claude, 4 fictional dictations:** 3 numbered templates with a correction → 3 exact templates,
  questions for the missing doses; an unnumbered one naming a patient and «πάγο σε όλα» → 2 templates, no
  patient, ice in both with a question to confirm; 5 templates where one is «για τον ώμο τα συνηθισμένα» → 4
  templates, no invented shoulder exercises, a general question instead; 11 templates → 10 in 27 s and a line
  about the 11th. Times 15–27 s.
- **Database** (`20261124230000_create_template.sql`, pushed live 2026-11-24 after a rolled-back trial, 403/403): `create_template(clinic,
  name, area, program)`, security definer, the usual checks (`template_clinic`, `template_name`,
  `template_area`), only the program's own keys kept, version 1, never a patient, 'bad program' for a wrong
  shape, at most 300 active templates per clinic ('too many templates'). `rls_check.sql`: +15 checks (tidy +
  no patient + nothing extra, duplicate name, 4 bad shapes, empty name, long area, A for clinic B, B in A, B
  doesn't see it, assistant, the 301st, anon).
- **Demo:** allowed. A dictation is 1 of the 5 programs; each recording 1 of the 5 recordings; the sample needs none.
- Checks: `tsc` clean, **327 tests**, `next build` OK.

## 2026-11-24 · Templates, phase 4: «Εκτύπωση για τον ασθενή» (`/programs/[id]/print`)
- **Why:** some patients (often elderly) never open a link; P03's patients didn't use Physitrack's app at all.
  The clinic now hands them the program on paper.
- **Page:** «Εκτύπωση για τον ασθενή» on the approved-program page (under «Αντιγραφή συνδέσμου», not when a
  newer program exists). Owner, physio and assistant. The same letter as `/p/<token>` (clinic letterhead, for
  whom and when, title, next appointment, instructions, the physio's name), read on the server with
  `home_program(token)` (it only reads; the diary is not passed to the page). Shown on screen as it will print:
  two weeks of day boxes under each exercise (`PaperExercises`), no buttons, nothing that saves, never the
  GeSY note. Bar (not printed): «← Πίσω στο πρόγραμμα», «Κανονικά» / «Μεγάλα γράμματα» (`?size=large`: 18px
  on paper instead of 14px, one column), «Εκτύπωση». A newer program: not printed, a link to print that one.
- **How:** a Tailwind variant `paper:` (globals.css) = printed, or inside `[data-paper]`; `HomeProgramLetter`
  uses it instead of `print:` (the phone page looks and prints as before, 1 week of boxes), and takes a
  `paper` prop; `PatientSheet` takes the size. The `home_program` zod shapes moved to `app/lib/home/program.ts`.
- No database change. Checks: `tsc` clean, **337 tests**, `next build` OK.

## 2026-11-24 · Templates: a correction without its comma (prompt)
- **Why:** the user's own recording of the sample turned «τρία σετ, όχι, δύο σετ» into «τρία σετ, όχι δύο σετ»
  (it may read "3 sets, not 2"). Claude picked 2 but didn't say it was unsure.
- `DICTATE_TEMPLATES`: when it isn't clear which number is the correction, use the number said last and ask the
  physio to confirm it. Live test: the recording → 2 sets and «Στο εκκρεμές είπατε «τρία σετ, όχι δύο σετ».
  Γράψαμε 2 σετ. Είναι σωστό;»; the clean sample (with commas) → 2 sets, no extra question. The voice-note
  prompt is unchanged.

## 2026-11-24 · Templates, phase 5: templates and the paper sheet in the demo guide
- The 3-step tour stays as it was. The intro adds «Μετά την ξενάγηση: πρότυπα και χαρτί για τον ασθενή.»
- The end of the tour adds «Δείτε και αυτά · προαιρετικά», under «Θέλω τη δική μου κλινική» (still the main
  button): «Πρότυπα» (/templates), «Πείτε τα πρότυπά σας» (/templates/dictate, «Παίρνει 1 από τα 5
  προγράμματα της δοκιμής») and «Χαρτί για τον ασθενή» (the newest program's /print, only when there is one).
  Each gets ✓ «Το είδατε» once opened (`seen` in the tour's storage, kept through «Από την αρχή»).
- DemoCoach after the tour, only on those pages: «Πρότυπα», «Πείτε τα πρότυπά σας» (tap the sample, create,
  check, save) and the recording page (pick a template, «Όπως είναι»). It ticks «Πρότυπα» and «Πείτε τα
  πρότυπά σας»; the sheet (no staff frame) is ticked from the board's link. Templates pages never start step 1.
- Greek and English texts (`app/lib/demo/text.ts`). Checks: `tsc` clean, **344 tests**, `next build` OK.

## 2026-11-25 · Templates: «Αλλαγή ασκήσεων», change a template by voice or by hand (`/templates/[id]/edit`)
- **Why:** the user asked to edit templates by voice. Until now a template's exercises could not change at all
  (only its name and area). Decision (user, option A): the template is replaced; programs already given to
  patients don't change (each is its own copy).
- **Page:** «Αλλαγή ασκήσεων» on each open template of «Πρότυπα»; the card there says «άλλαξε στις …» once
  changed. «Τι να πείτε: μόνο τι αλλάζει», recording / file / text / a fictional sample (`TEMPLATE_EDIT_SAMPLE`),
  «Εφαρμογή αλλαγών» (all the text, applied to the saved template; edits by hand since the last apply are
  asked about first), «Τι άλλαξε, σε σχέση με το αποθηκευμένο» (+ − ~, the app's own comparison in
  `app/lib/templates/changes.ts`, never the AI's account), the editable card (`TemplateDraft`, its own words),
  «Αποθήκευση αλλαγών» / «Ακύρωση αλλαγών» (back to the saved one). Kept in sessionStorage per template, dropped
  when the saved template changed since or the changes were saved.
- **Shared pieces:** `VoiceInput` (what to say, recording, file, sample, text box) and `useDictation`
  (sessionStorage) now serve both this page and «Πείτε τα πρότυπά σας».
- **AI:** mode `edit_template` (the route reads the template itself, as for «Με αλλαγές»), own prompt
  `EDIT_TEMPLATE`: keep the template exactly, apply only what was said, add nothing, name/area only if said, no
  patient. Schema `TemplateEditResult { changes: [{ said, applied, question }], name, area, program, questions }`:
  `changes` comes first so the model goes through every change before writing (without it, 3 of 3 runs of an
  unclear edit asked nothing). One counted Claude call.
- **Live test with Claude** (fictional knee template): «βγάλε τα heel slides, γέφυρα 3×10 κάθε μέρα, πάγος 15
  αντί για 20» → exactly that, no questions (4–7 s); Cypriot «μετονόμασε… την άσκηση με το πόδι κάμε τη δύο
  φορές τη μέρα, τζαι πρόσθεσε τζαι ποδήλατο, τζαι τα squat επιτρέπονται» → renamed, bike added, squat line
  out, and two questions (which leg exercise, naming the two others; the bike's dose); «όπως είναι, για τον
  Κώστα την Πέμπτη» → unchanged, no patient, says both.
- **Database** (`20261125120000_update_template.sql`, pushed live 2026-11-25 after a rolled-back trial, 414/414): `templates.updated_at`;
  `update_template(clinic, template, name, area, program)` with the checks of `create_template` + 'template not
  found' (other clinic, archived). `rls_check.sql` +11.
- Checks: `tsc` clean, **365 tests**, `next build` OK.
