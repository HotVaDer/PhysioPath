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
