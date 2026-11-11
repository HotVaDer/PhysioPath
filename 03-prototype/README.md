# PhysioPath demo

> **Focus changed on 2026-10-25:** PhysioPath is now about the end of the session (the GeSY clinical note + home program; see [../02-product/mvp-spec.md](../02-product/mvp-spec.md)). This README still describes the demo as built (session mode). It will be updated as the demo moves to the v0 flow.

At the start of a session the physio speaks the day's exercises in Greek. The patient follows them on their phone (QR code) or a clinic tablet, one exercise at a time, while the physio watches every patient on a room board. At the end, the session becomes the patient's home program and a clinical note. Built to show at the end of physio interviews.

**Fictional patients only.** Real patient data waits for the steps in [../06-privacy-legal/checklist.md](../06-privacy-legal/checklist.md).

## How it works

| Step | What | Where it runs |
|---|---|---|
| 1. Record (`/new`) | The browser records the voice note (or upload a file, or pick a sample) | Physio's browser |
| 2. Transcribe | whisper.cpp large-v3-turbo with voice activity detection, Greek | **On this Mac** (audio never leaves it) |
| 3. Proofread | Claude Haiku 5.5 fixes misheard words, with undo | Claude API (only text) |
| 4. Write | Claude Opus 5.5 turns the text into exercises + clinical note + questions for the physio | Claude API (only text) |
| 5. Review (`/review`) | The physio checks everything; missing sets/reps are highlighted | Physio's browser |
| 6. Start (`/session/<id>`) | QR code for the patient's phone, or "open here" for a tablet | This Mac |
| 7. Session (`/s/<id>`) | Patient: one exercise at a time, "Τελείωσα το σετ", hold countdown, "Χρειάζομαι τον φυσιοθεραπευτή" | Patient's phone or tablet |
| 8. Room (`/`) | Physio: every patient's progress, who needs them, "Ολοκλήρωση" | Physio's browser |
| 9. End (`/approved/<id>`) | Home program page (`/p/<id>`) + clinical note, saved in `output/` | This Mac |

Claude's instructions are in [app/lib/prompt.ts](app/lib/prompt.ts) and [app/lib/proofread.ts](app/lib/proofread.ts). The key rule is to use only what the physio said and to ask instead of guessing. More: [docs/session-mode.md](docs/session-mode.md), [docs/transcription.md](docs/transcription.md).

## Setup (once)

```bash
cd 03-prototype
brew install whisper-cpp ffmpeg # speech-to-text and audio conversion
npm install
npm run download-model          # ~550 MB speech model + 1 MB voice detection, into models/
cp .env.example .env            # then paste your Claude API key into .env
```

To get a Claude API key, go to https://console.anthropic.com, add credit ($5 is plenty for the course), then open **Settings → API keys**. Each patient costs about 3–6 cents.

## Run

```bash
npm run dev:lan                 # demo with phones: http://localhost:3000, phones on the same Wi-Fi scan the QR code
npm run dev                     # this Mac only (phones can't connect)
```

`npm test` runs the tests, `npm run check` checks the TypeScript types, `npm run bench:speech` measures speech-to-text (see [docs/transcription.md](docs/transcription.md)). After a `next build`, restart the dev server: running both on the same folder confused the dev server once (the page kept reloading).

The old single-file demo still runs with `npm start` (http://localhost:8766) until it is removed.

## Demo script (for interviews, after the questions)

1. Start `npm run dev:lan`; laptop and phone on the same Wi-Fi.
2. **Νέος ασθενής** → pick **Δείγμα 02** (or record a fictional patient) → **Δημιουργία προγράμματος**: ready in ~15–20 s.
3. Show the **questions** box: the tool asks instead of guessing. Then **Έναρξη συνεδρίας**.
4. Scan the QR code with your phone and hand it over: *"This is what the patient sees."* Tap a set, then **Χρειάζομαι τον φυσιοθεραπευτή → Πονάω**.
5. Back on the laptop, the room board shows it within 2 seconds. Tap **Το είδα**.
6. Finish the exercises on the phone, then **Ολοκλήρωση** on the board: the home program and the clinical note are ready.
7. Ask: *"How would this change your afternoon with three patients at once? What's missing? Would you trust it?"*

## Files

| Path | What it is |
|---|---|
| `app/(physio)/` | The physio's pages: room board `/`, record `/new`, review, start `/session/[id]`, end `/approved/[id]` |
| `app/s/[id]`, `app/p/[id]` | The patient's pages: session screen and home program (never the clinical note) |
| `app/features/` | The screens (`room/`, `session/`, `record/`, `review/`, `patient/`, `approved/`) |
| `app/components/ui/` | Shared building blocks (catalogue at `/ui`) |
| `app/lib/session.ts`, `sessions.ts` | Session rules (pure, tested) and the store (`output/sessions/`) |
| `app/lib/lan.ts`, `http.ts`, `proxy.ts` | Same-Wi-Fi mode and the request guard |
| `app/lib/transcribe.ts`, `proofread.ts`, `generate.ts` | Whisper, the proofreader, the Claude call |
| `scripts/speech-bench.ts` | Speech-to-text bench (recordings in `test-audio/`) |
| `models/`, `output/`, `test-audio/`, `.env` | Local only, not on GitHub |

Sample notes come from [../02-product/examples/](../02-product/examples/) (Greek ones only).

## Known limits

- English exercise names are sometimes still misheard; the proofreader fixes most, and Claude asks about the rest.
- Same Wi-Fi only (no online hosting yet), plain HTTP on the local network, sessions kept on this Mac.
- The room board refreshes every 2 seconds, and only while its tab is open in front (browsers slow down hidden tabs).
- No SMS/WhatsApp sending, accounts, exercise videos or reminders yet.
