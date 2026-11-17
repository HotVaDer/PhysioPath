# Security review guide: PhysioPath (08-app)

A guide for checking the app's security yourself, one step at a time.
Every step has the same parts:

1. **Learn**: the idea in plain words.
2. **Look**: which files to read.
3. **Try**: how to test it with your own hands.
4. **Ask**: questions to answer while you read. They are not answers.
5. **Notes**: write down what you find.

Go in order. Step 0 is the most important. When you find something, write it in the
**findings log** at the end and keep going. Fix things later, all together.

---

## Before you start: 4 ideas you need

### 1. Anyone can send anything

Your buttons and forms are only *one* way to talk to the server. Anyone can open DevTools
or use `curl`, then change any value (a hidden `inviteId`, a `clinic_id`, a role) and send
it. So **never trust what the browser sends.** Every check has to happen on the server or
in the database.

### 2. Who is talking to the database?

The app talks to Supabase in three ways. Know which one each piece of code uses.

| Client | File | Key | Does RLS apply? |
|---|---|---|---|
| Logged-in user | `app/lib/supabase/server.ts` | publishable key + the user's login cookie | **Yes**: the database knows who it is |
| No login | `createAnonClient()` in `app/lib/supabase/admin.ts` | publishable key only | **Yes**, as `anon` (a stranger) |
| Admin | `createAdminClient()` in `app/lib/supabase/admin.ts` | **secret key** | **No, it skips every rule** |

### 3. RLS (Row Level Security)

RLS is a set of rules *inside the database*. For example: "a user may read a note only if
the note's clinic is the user's clinic." Even if the app code has a bug, the database
refuses. That's why the database is step 0: it is the last wall.

### 4. The people in this app

| Who | How they get in |
|---|---|
| **owner** | logged in, created the clinic |
| **physio** | logged in, accepted an invite |
| **assistant** | logged in, accepted an invite |
| **anon** | not logged in (any stranger on the internet) |
| **patient** | not logged in, but has a token link on their phone |
| **other clinic** | logged in, but in a *different* clinic. **The most important attacker to think about.** |

---

## Step 0: The database (most important)

### Learn

- **Policy**: one rule on one table for one action (`select`, `insert`, `update`, `delete`).
  - `using (...)` decides which **existing** rows you can see, update or delete.
  - `with check (...)` decides which **new or changed** rows you are allowed to write.
  - Example: `using` lets you edit your own note, and `with check` stops you from moving it to
    another clinic.
- **No policy = no access.** When RLS is on and a table has no policy for an action, nobody
  can do that action (except the admin key).
- **Grants** come *before* policies. `revoke update on profiles` then
  `grant update (full_name)` means "you may only change the `full_name` column, nothing else".
  Grants control **columns**, and policies control **rows**.
- **`security definer` functions** run with the power of the function's owner, so **RLS
  does not apply inside them.** Each one has to check "who is calling, and are they allowed?"
  by itself. Treat every one as a small admin door.
- **`private` schema**: helper functions the outside world can't call directly
  (for example `my_clinic_id()` and `my_role()`, used inside policies).
- **Triggers**: code that runs automatically when a row changes (for example
  `keep_profile`, `check_slot`). They can block bad changes.

### Look

The files are `08-app/supabase/migrations/`, read **in date order**. Later files change
earlier ones. For example, `sessions` and `programs` are created in the first file and
**rebuilt** in `20261116000000`. Always check the *latest* version.

Tables: `clinics`, `profiles`, `patients`, `rooms`, `onboarding_drafts`, `invites`,
`notes`, `sessions`, `programs`.

Functions anyone outside can call (the "doors"): `finish_onboarding`, `invite_details`,
`accept_invite`, `save_rooms`, `add_invites`, `approve_program`, `patient_session`,
`patient_action`, `home_program`.

### Try

**A. Fill in this table first, *before* reading the policies.** Write what *should* happen,
based on how a clinic works. Then read the policies and compare. Every difference is a
finding.

| Table | owner | physio | assistant | anon | other clinic |
|---|---|---|---|---|---|
| clinics | | | | | |
| profiles | | | | | |
| patients | | | | | |
| rooms | | | | | |
| onboarding_drafts | | | | | |
| invites | | | | | |
| notes | | | | | |
| sessions | | | | | |
| programs | | | | | |

Use letters: **R** read, **I** insert, **U** update, **D** delete, **–** nothing.

**B. Pretend to be someone, in the Supabase SQL editor.** Everything is inside
`begin … rollback`, so nothing is saved.

```sql
begin;
-- pretend to be a logged-in user (put a real user id from auth.users)
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"PUT-USER-UUID-HERE","role":"authenticated"}', true);

select * from notes;          -- what can this user see?
update clinics set name = 'x'; -- can they change it? how many rows?

rollback;
```

To pretend to be a stranger, use `set local role anon;` and skip the `set_config` line.

Make **two clinics** with test accounts (one owner and one assistant each). Then, as
clinic A, try to read and change clinic B's rows.

**C. Read `supabase/checks/rls_check.sql`.** It was written together with the migrations,
so it can share the same blind spots. Ask yourself: *which tests are missing?*

### Ask

- Is RLS turned on (`enable row level security`) for **every** table?
- For each policy: does it check the **clinic** *and* the **role**, or only one of them?
- Does every `update` policy have a `with check`? Can I move a row into another clinic?
- Can a user change their own `role` or `clinic_id` in `profiles`? (Look at the grants and
  the `keep_profile` trigger.)
- RLS picks **rows**, not **columns**. If a user may read a row, they see **every column** in
  it, unless a `grant select (col1, col2, …)` limits the columns. Which tables have a column
  that some readers shouldn't see (for example a `token`)?
- Can an **assistant** read clinical notes? Should they?
- For each `security definer` function:
  - Who can run it (`grant execute … to`)? Is `anon` blocked if it should be?
  - Does it check who is calling (`auth.uid()`, `my_clinic_id()`, `my_role()`)?
  - Does it trust an id from the caller (for example a `clinic_id` argument) without checking it?
  - Does it set `search_path`? (Without it, a trick can make the function call the wrong code.)
- What happens to a person's data when they leave the clinic (`leave_clinic`,
  `records_outlive_people`)?

### Notes

```
(write here)
```

---

## Step 1: Code that skips RLS (the secret key)

### Learn

The secret key turns off every rule from step 0. So wherever it is used, **the code itself
has to do the checking.** If the code forgets, step 0 doesn't help.

### Look

- `app/lib/supabase/admin.ts`: where the admin client is made. The `import "server-only"`
  line stops it from reaching the browser.
- The only files that use it are `app/lib/onboarding/actions.ts` and
  `app/lib/onboarding/invites.ts`.

Find all uses yourself (do this again after every new feature):

```bash
grep -rn "createAdminClient" 08-app/app
```

### Try

For each place `createAdminClient()` is called, follow the code *backwards* and write down
what has been checked before that line runs.

### Ask

- Before the admin client is used, does the code know **who** the caller is, and has it
  checked they are an **owner** of **this** clinic?
- Is the email, id or role it uses **from the database**, or **from the form** (which the
  user can change)?
- Could this job be done *without* the secret key (with a `security definer` function
  instead)? Fewer secret-key places = smaller risk.

### Notes

```
(write here)
```

---

## Step 2: Server actions and API routes

### Learn

- A function in a `"use server"` file is a **public endpoint**. Next.js gives it a URL that
  anyone can call with any data, even if no button on the page shows it.
- `app/api/*/route.ts` are normal public URLs.
- Every one of them needs the same 3 checks:
  1. **Who are you?** (logged in?)
  2. **Are you allowed?** (right role, right clinic)
  3. **Is the input OK?** (type, length, size)

### Look

| File | Functions |
|---|---|
| `app/lib/onboarding/actions.ts` | `sendLink`, `verifyCode`, `resendCode`, `finishRegistration`, `resendInvite`, `acceptInvite`, `signOut` |
| `app/lib/onboarding/invites.ts` | `sendInvites` |
| `app/lib/settings/actions.ts` | `saveRooms`, `inviteMember`, `cancelInvite`, `workAlone` |
| `app/lib/notes/actions.ts` | `approveNote` |
| `app/api/generate/route.ts` | writes the note with AI (**costs money**) |
| `app/api/transcribe/route.ts` | speech to text (**costs money**) |
| `app/auth/confirm/route.ts` | finishes login from the email link |

### Try

**A. Change a hidden field.** Log in as owner A. Open DevTools → Network, click
«Ξανά αποστολή» and find the POST request. Copy it as `curl`, change `inviteId` to an invite
id from **clinic B**, and send it. What happens? Do the same with `cancelInvite` and
`approveNote`.

**B. Call the paid routes with no login.**

```bash
curl -i -X POST https://physio-path-nine.vercel.app/api/generate \
  -H "content-type: application/json" -d '{}'
```

You should get a "not allowed" answer (401 or 403), **not** an AI result. Do the same for
`/api/transcribe`.

**C. Send something too big or strange**: a very long text, an empty value, a number where
text should be. The app should refuse politely, not crash or save it.

### Ask

- Does each function check the login **itself**, or does it count on the page having
  checked? (The page check doesn't protect the action.)
- When it uses an id from the form, does the query also filter by the user's clinic, or
  does it rely on RLS? (Both are fine, but you must *know* which one.)
- Is there a limit on how often someone can call `/api/generate` and `/api/transcribe`?
  Without one, a logged-in user (or a stolen login) could run up a big bill.
- Is the audio size checked **on the server** too, not only in the browser?
  (See `app/lib/notes/limits.ts`.)
- In `auth/confirm`: is there a "where to go next" value in the URL? Can it send the user to
  **another website** (an "open redirect")?

### Notes

```
(write here)
```

---

## Step 3: Patient token links

### Learn

The patient opens a link on their phone **without logging in**. The token in the link is
the only key, so:

- it must be **impossible to guess** (long and random),
- it should **stop working** after some time,
- it must open **only that one** session or program,
- it should show **as little as possible** (no full name, no notes).

### Look

- The functions `patient_session`, `patient_action` and `home_program` in
  `supabase/migrations/20261116000000_programs_notes_sessions.sql`.
- How the token is created (look for `gen_random_uuid()` or similar) and whether there is an
  expiry column.
- The invite link works the same way: `app/invite/[token]/page.tsx`, with `invite_details`
  and `accept_invite`.

### Try

- As `anon` in the SQL editor, call each function with a **made-up** token. What comes back?
- Call it with a **real** token. List every field it returns. Is each one needed?
- Call `patient_action` many times in a row. Can a patient (or a stranger with the link)
  change things they shouldn't?

### Ask

- Can the token be guessed or counted (for example 1, 2, 3…)?
- Does it expire? What happens after the session ends?
- What can a stranger learn from `invite_details` with only the invite link?
- Does `accept_invite` check that the **logged-in person's email** is the **invited email**?
  Or can anyone holding the link join the clinic?

### Notes

```
(write here)
```

---

## Step 4: Secrets (keys)

### Learn

- In Next.js, an env variable that starts with **`NEXT_PUBLIC_`** is **sent to the browser.**
  Everyone can read it. Only harmless values may start with it.
- The app uses: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SITE_URL` (public, OK) and `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`,
  `OPENAI_API_KEY` (**must stay secret**).
- A key that was **ever** committed to git is leaked, even if you deleted it later. Git
  remembers everything.

### Look

- The root `.gitignore` (it ignores `.env` and `.env.*`).
- Vercel → Project → Settings → Environment Variables.

### Try

```bash
# 1. Is any secret in git history? (should print nothing)
git log -p --all | grep -nE "sb_secret_|sk-ant-|sk-proj-|sk-[A-Za-z0-9]{20,}"

# 2. Is any secret in the files sent to the browser? (should print nothing)
cd 08-app && npm run build
grep -rlE "sb_secret_|sk-ant-|sk-proj-" .next/static
```

### Ask

- Does any secret variable start with `NEXT_PUBLIC_` by mistake?
- On Vercel, are secrets set only where needed (Production / Preview), not "Development"
  for everyone?
- Is the leftover `ZZ_TEST` variable removed?
- Who has access to the Vercel team and the Supabase project? Do they all still need it?

### Notes

```
(write here)
```

---

## Step 5: Sign-in

### Learn

Login uses a **6-digit code** sent by email. Six digits = 1,000,000 options, so guessing is
only blocked by **rate limits** (how many tries per minute) and **expiry** (how long a code
works).

### Look

`08-app/supabase/config.toml`, the `[auth]`, `[auth.rate_limit]` and `[auth.email]` parts.
For example `otp_length`, `otp_expiry`, `token_verifications`, `enable_signup`,
`site_url` and `additional_redirect_urls`.

⚠️ This file is the **local** setup. The **live** values are in the Supabase dashboard →
Authentication. Check that they match.

### Try

**Back button after logout.** Log in, open the home page and a note, then log out. Press the
browser's **Back** button a few times. You should land on the welcome or login page, never
on a page that still shows clinic data. Do it on your phone too (Safari and Chrome).

### Ask

- How many code guesses are allowed per 5 minutes? From one IP only, or in total?
- How long does a code work (`otp_expiry`)? Is 1 hour too long?
- `enable_signup = true` means anyone can create a clinic. Is that OK for the demo?
- `additional_redirect_urls` includes `localhost`. Should production allow it?
- When someone logs out, is the login cookie really gone? (DevTools → Application → Cookies:
  the `sb-…` cookies should disappear.)

### Notes

```
(write here)
```

---

## Step 6: Patient data sent to AI companies

### Learn

The audio goes to **OpenAI** (speech to text) and the text goes to **Anthropic** (writing
the note). Data then leaves your database. For real health data this is a **GDPR** question:
where does the data go, is it stored, and is it used for training?

### Look

- `app/api/transcribe/route.ts` and `app/lib/notes/speech/`: what exactly is sent.
- `app/api/generate/route.ts` and `app/lib/notes/prompt.ts`: what exactly is sent.
- Each company's data policy for API use.

### Ask

- Is the patient's **name** or other identifying info sent? Is it needed?
- Do the providers keep the data? For how long?
- For the demo: are **all** patients fictional?
- What would a real clinic need before using this? (Write a short paragraph for the report.)

### Notes

```
(write here)
```

---

## Step 7: Showing user text on the page (XSS)

### Learn

XSS means someone types code (for example `<script>…`) into a field, and it **runs** in
another person's browser. React makes text safe automatically. The danger is only where
that protection is turned off.

### Try

```bash
grep -rn "dangerouslySetInnerHTML" 08-app/app
```

Then type `<b>hi</b><script>alert(1)</script>` as a clinic name, a room name and a note.
Look at every page that shows it, **and the invite email**. It should show up as plain text.

**The invite email test.** The clinic name and the owner's name go into the invite email
(`{{ .Data.clinic_name }}` and `{{ .Data.invited_by }}` in `supabase/templates/invite.html`),
and the person who signs up types both. So:

1. Make a test clinic named `<a href="https://example.com">Πατήστε εδώ</a>`.
2. Invite your own email.
3. Open the email. If you see the `<a …>` text, it's safe. If you see a **clickable link**,
   the email template doesn't escape HTML. Write it in the findings log.

### Ask

- Is user text ever put into HTML by hand (email templates in `supabase/templates/`, PDFs,
  `innerHTML`)?
- Anyone can sign up and send an invite email **from PhysioPath** to **any** address, with a
  clinic name they choose. Could someone use that for spam or phishing? What limits it
  (`email_sent` in `config.toml`)?
- Is user text ever used inside a link (`href`)? `javascript:` links are dangerous.

### Notes

```
(write here)
```

---

## Step 8: Libraries (dependencies)

### Learn

The app uses hundreds of npm packages. Some may have known security bugs.

### Try

```bash
cd 08-app && npm audit --omit=dev
```

### Ask

- Are there **high** or **critical** issues? Do they affect code that runs in production?
- Can they be fixed with a small update (`npm audit fix`) without breaking the app?

### Notes

```
(write here)
```

---

## Step 9: Caching (one person's page shown to another)

### Learn

To be fast, a page can be **saved** (cached), and the saved copy shown to the next visitor.
That's fine for a page that is the same for everyone (like the welcome page). For a page with
one clinic's data, it would show that data to **someone else**, and RLS never runs for them,
because the database is never asked.

Pages can be saved in three places: on the server (Next.js), on Vercel's network, and in the
browser.

### Look

- `next.config.ts`: any cache settings?
- Search the code. It should find nothing, or only pages without private data:

  ```bash
  grep -rnE "use cache|revalidate|unstable_cache|force-static" 08-app/app
  ```

### Try

**A. Which pages are static?** Run `npm run build` in `08-app`. At the end, every page is
marked:

- `ƒ (Dynamic)`: made fresh for each request. **Every page with private data must be this.**
- `○ (Static)`: made once at build time, the same for everyone. Only OK with no private data.

**B. What does the live site tell browsers?**

```bash
curl -sI https://physio-path-nine.vercel.app/welcome | grep -iE "cache-control|x-vercel-cache"
```

For pages with data you want `cache-control: private, no-cache, no-store, …`, which means
"don't keep a copy anywhere".

### Ask

- Is any page with clinic or patient data marked `○ (Static)`?
- The patient pages in phase 4 (`/s/...`, `/p/...`) have **no login**. Once they exist, do
  they stay dynamic and `no-store`?
- After a new feature, does the build table still look the same?

### Notes

```
(write here)
```

---

## Findings log

How serious is it?

- **High**: another clinic or a stranger can **see or change** patient or clinic data, or
  can **spend your money** (AI routes).
- **Medium**: someone inside the clinic can do more than their role should (for example an
  assistant reads notes), or a link lasts too long.
- **Low**: shows a bit more info than needed, a missing limit, tidy-up.

| # | Step | What I found | How I found it | Severity | Fixed? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## Tips

- **Write the "should" before you read the "is".** If you read the code first, it starts to
  look right.
- **Test with two clinics.** Most real bugs are "clinic A can see clinic B".
- **One thing at a time.** Don't fix while you search. Write it down and keep going.
- **Do it again** after every new feature (especially steps 0, 1, 2 and 9).
- For the report: this log, plus the "should" table from step 0, shows the graders you
  understood your app's security yourself.
