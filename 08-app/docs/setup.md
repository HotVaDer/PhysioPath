# Setting up 08-app on your computer

For a collaborator who wants to run the online app locally. You don't need the database files:
the database runs online on Supabase (Frankfurt) and is shared.

## 1. Install

- Node 23.6 or newer, then in `08-app/`:

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3001
```

## 2. Get access (ask Stylianos)

| Service | What you get | Why |
| --- | --- | --- |
| Supabase, project **PhysioPath** | An invite to the organization | To read the URL and keys, and to make your own secret key |
| Vercel, team **kouklos**, project **physio-path** | An invite to the team | Then the CLI fills in the non-secret keys for you (below) |
| Anthropic and OpenAI | Nothing shared | Make your own keys (step 3) |

## 3. Fill in `.env.local`

With Vercel access (`npm i -g vercel`, then `vercel login`), in `08-app/`:

```bash
vercel link --project physio-path --scope kouklos
vercel env pull .env.local     # the Supabase URL, publishable key and localhost site URL
```

Then add your own secret keys from the table to the same file. The online app has its own copies on Vercel.
`vercel env pull` **replaces the whole file**, so pull first and add your keys after (pulling again wipes them).

| Variable | Secret? | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase → Project Settings → API keys |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | Same page. It's safe in the browser: the database rules (RLS) decide what it can read. |
| `SUPABASE_SECRET_KEY` | **Yes** | Same page → create a **new secret key with your name**. Don't use someone else's. It bypasses every database rule, so it only goes in `.env.local`, only on the server, and it's only used to send invites. |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3001` locally |
| `ANTHROPIC_API_KEY` | **Yes** | Your own key from the Anthropic console, with a spending limit |
| `OPENAI_API_KEY` | **Yes** | Your own key from the OpenAI platform, with a spending limit |

Without `SUPABASE_SECRET_KEY` the app still runs; only invite emails aren't sent. Without the AI keys,
recording and writing the program don't work (from phase 3 on).

## 4. What you won't get, and why

- **Email settings (`supabase/.env`, `SMTP_USER` / `SMTP_PASS`):** a Gmail app password of the owner's
  account. It's already set on the online project, so sign-up and invite emails work without it.
- **`supabase/` (migrations, RLS checks):** kept off GitHub on purpose, because they map out the access
  rules. Ask if you need to change the database; changes are pushed from one computer.

## 5. Rules for keys

- Never commit `.env.local` (git ignores it), and never paste a key into chat, email, WhatsApp, an issue or
  a screenshot. If one leaks, delete it in its console and make a new one.
- Send a secret only through a password manager share or a one-time link (e.g. Bitwarden Send).
- Each person has their own keys, so one can be revoked without breaking everyone else.
- Fictional patients only, everywhere.
