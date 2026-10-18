# Session mode

Since 2026-10-18 PhysioPath is used at the **start** of a session (decision in `../../notes/decisions.md`). The physio speaks today's exercises; the patient follows them on a phone or tablet; the physio watches the room board. At the end the session becomes the home program and the clinical note.

## Flow

1. **Record → review** (`/new`, `/review`): the same pipeline as before (Whisper → proofreading → Claude). Before starting, the review page asks once if sets or reps are missing, because the patient screen needs them. A missing "how often per day" is still marked "Λείπει" but doesn't hold up the start: it matters for the home program, not for today.
2. **Έναρξη συνεδρίας** → `POST /api/sessions` creates the session → `/session/<id>`: a QR code of the patient link, or "Άνοιγμα οθόνης ασθενή" for a tablet.
3. **Patient screen** `/s/<id>`:
   - one exercise at a time: name, today's dose (sets × reps, hold), notes;
   - set boxes and **Τελείωσα το σετ N**; the next exercise appears by itself; undo for the last set;
   - a **hold countdown** only when the physio said a hold (`holdSeconds()` in `app/lib/format.ts`); no rest timer, because the physio never dictates one and we don't invent it;
   - **Χρειάζομαι τον φυσιοθεραπευτή → Έχω απορία / Πονάω**: only says the physio was notified, never advises;
   - polls every 3 s; plain requests, no websockets, for old phones.
4. **Room board** `/`: polls every 2 s.
   - **Card per patient:** progress, current exercise and set, and a badge in words: Ασκείται / Χρειάζεται εσάς · Πόνος|Απορία (with how long ago) / Τελείωσε.
   - **Actions:** Το είδα, Ολοκλήρωση, QR / οθόνη ασθενή.
   - New calls are announced to screen readers, and the tab title shows "(N)".
5. **Ολοκλήρωση** → the program and note are saved like an approved program (`output/<id>.json`) → `/approved/<id>`. The patient screen switches to "Η συνεδρία ολοκληρώθηκε" with a link to the home program `/p/<id>`.

## Data

- `app/lib/session.ts`: pure rules (start, set done, undo, call, clear, finish, board status). A set is sent with its number, so a double tap counts once. `patientView()` leaves out the clinical note.
- `app/lib/sessions.ts`: in memory (on `globalThis`, like the Whisper queue) and written to `output/sessions/<id>.json`, so a restart keeps unfinished sessions.

## Same-Wi-Fi mode and security

`npm run dev:lan` sets `PHYSIOPATH_LAN=1` and listens on all addresses. `npm run dev` stays on this Mac only.

| From | Allowed |
|---|---|
| This Mac (`localhost`) | Everything |
| A phone on the Wi-Fi, in same-Wi-Fi mode | Pages `/s/*` and `/p/*` (`proxy.ts`), and `GET /api/sessions/<id>` + `POST /api/sessions/<id>/events` (`handler(fn, { lan: true })`) |
| Anything else | 403 |

- **The check** (`hostAllowed()` in `app/lib/lan.ts`, unit-tested): the Host must be this Mac's own Wi-Fi address (blocks DNS rebinding), and the Origin, if present, must match it (blocks other websites).
- **What stays on the Mac:** recording, generation, the room board and finishing.
- **Patient responses never contain the clinical note.**
- **HTTP on the local network is enough:** only the Mac records (localhost is a secure context), and the patient screen needs no microphone. Screen wake lock therefore only works on the Mac or with HTTPS.

## Checked on 2026-10-18

- **Unit and component tests:** session rules, `holdSeconds`, the Wi-Fi guard, `SessionScreen`, `RoomBoard` (with axe).
- **Through the real Wi-Fi address (curl):** physio routes and pages → 403, patient routes → 200, no note in patient responses, evil Origin / Host → 403.
- **End to end in Chrome** (sample 02, one Claude call):
  - program ready in ~15 s;
  - phone opened the QR link over the Wi-Fi;
  - a pain call reached the board in under 2 s, and "Το είδα" cleared it on the phone;
  - Ολοκλήρωση → home program at 20 px on the phone.
- **Found and fixed on the way:**
  - the tab-title count was overwritten by Next.js;
  - patient pages opened by an in-app link kept the physio's smaller text size;
  - the text-size control overflowed on phones (fieldset minimum width);
  - "1 χρειάζονται" grammar.
