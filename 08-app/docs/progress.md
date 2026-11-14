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
