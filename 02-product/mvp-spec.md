# MVP Spec

Keep each version deliberately small. Anything not listed under "In scope" waits until real physios ask for it.

v1 (session mode) is the current focus since 2026-10-18 (see `notes/decisions.md`). v0 below is kept: its home program and clinical note are now the end of a v1 session.

# v1: Session mode (draft)

## User flow

1. **Start of session:** while the patient warms up, the physio speaks today's plan in Greek (target: under 60 s).
2. The system transcribes, proofreads and turns it into today's exercises (target: under ~15 s to the first screen).
3. The physio checks the exercises (missing sets/reps are highlighted) and taps **Έναρξη συνεδρίας**.
4. **Patient screen:** the physio chooses per patient: a QR code for the patient's own phone, or "open here" on a clinic tablet. The patient sees one exercise at a time: name, dose, set boxes, a hold countdown when the physio said a hold, and a big **Τελείωσα το σετ** button. The next exercise appears on its own.
5. **Call the physio:** a button with "Απορία" / "Πόνος". The screen only says the physio was notified.
6. **Room board** (physio's screen): every patient in the room, with progress, current exercise and set, and a badge when someone needs the physio or has finished.
7. **End of session:** the physio taps **Ολοκλήρωση**; the session becomes the home program link and the clinical note (v0 below).

## In scope (demo)

- Everything in v0's pipeline (speech-to-text, proofreading, structured exercises)
- Patient session screen (phone or tablet, no login, works on old phones)
- Room board with live progress and calls (simple polling)
- Same Wi-Fi access for the patient screen, opt-in, patient pages only

## Out of scope for v1 demo

- Rest timers the physio didn't dictate, exercise videos, progress over weeks
- Accounts, multiple clinics, online hosting
- Sounds or push notifications

## Extra hard rules

- The patient screen shows only the physio-approved plan and never gives advice. "Πόνος" only notifies the physio.
- The patient screen never shows the clinical note.
- From the Wi-Fi, only patient pages and patient actions are reachable; recording, generation and the room board stay on the physio's computer.

## Success criteria for the demo

- From the end of speaking to the first exercise on the patient's screen in under ~15 s.
- A patient can complete a session without asking the physio what comes next.
- In interviews, physios recognise the waiting/interruption problem and react to the demo with "I would use this in my sessions".

# v0: End of session (original draft)

## User flow

1. Physio opens the web app on their phone and picks or creates a patient (code or first name only).
2. Physio records a Greek voice note (target: under 60 seconds).
3. System transcribes the audio and generates:
   - **Patient program** in plain Greek
   - **Clinical note** in a professional format
4. Physio reviews both, edits if needed, taps **Approve**.
5. Patient receives a link (SMS / WhatsApp / copy link). No app, no login for the patient.

## In scope

- Greek speech-to-text
- Structured extraction: exercises, sets, reps, frequency, duration, precautions, notes
- Patient program page (mobile friendly, printable)
- Clinical note (copyable text)
- Edit + approve step
- Simple patient list per physio

## Out of scope for v0

- Exercise videos
- Reminders and pain check-ins
- Clinic dashboard / multiple physios
- Integrations with clinic software or GESY
- Payments

## Hard rules

- The AI only reformats what the physio said. It must not add exercises, change dosage, diagnose or suggest treatment.
- If something is unclear or missing in the voice note (e.g. no reps given), the output flags it for the physio instead of guessing.
- Nothing reaches the patient without the physio's approval.
- All data stored and processed in the EU.

## Structured output (draft)

```json
{
  "patient_ref": "Maria",
  "body_area": "right knee",
  "program_week": 3,
  "exercises": [
    { "name": "Wall squats", "sets": 3, "reps": 10, "frequency": null, "notes": null },
    { "name": "Heel raises", "sets": 3, "reps": 15, "frequency": null, "notes": null }
  ],
  "after_exercise": ["Ice for 15 minutes"],
  "precautions": ["Avoid stairs for now"],
  "missing_or_unclear": ["Frequency not stated (daily? 3x/week?)"]
}
```

## Open questions

- How do physios want the clinical note formatted? (SOAP? free text? clinic-specific?) → ask in interviews
- Do patients prefer a link, PDF or WhatsApp message?
- Greek speech-to-text quality with Cypriot dialect and mixed English medical terms → test early
- What is the minimum info needed to create a patient?

## Success criteria for the prototype

- A physio can go from voice note to approved program in under 2 minutes.
- Physio edits less than ~20% of the generated text.
- Physio says they would use it again next week.
