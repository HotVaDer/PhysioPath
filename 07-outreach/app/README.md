# Outreach app

A small local page to browse `../contacts.csv` and email physiotherapists. It only uses the Python standard library and only runs on your computer.

```bash
python3 07-outreach/app/server.py
```

It opens http://localhost:8765. Stop it with Ctrl+C.

## First-time setup

1. Copy `env.example` to `.env` in this folder.
2. Fill in your name, phone and the course name. These go into the email signature.
3. Optional: fill in the SMTP lines so **Send** sends the email directly. Without them, **Send** opens a prefilled draft in Outlook on the web (or Gmail / Mail, set with `COMPOSE`). You press Send there and then click **Mark as sent** in the app.

`.env` is gitignored, so your details and password don't go to GitHub.

## What it does

- Table of all contacts, with search and filters by city, status, has-email and follow-up-due.
- Click a contact to see the Greek or English email, already personalised. You can edit it before sending.
- **Send** updates `contacts.csv` (status, first and last contact date, next step) and adds a line to `../sent-log.csv` (also gitignored).
- **Follow-up** template for after 5+ days. With SMTP it's sent as a reply in the same thread.
- Phone script, tap-to-call, website and map links for contacts without an email.
- Warns after 15 emails a day (`DAILY_LIMIT`).

Edit the email wording in `templates.json`.
