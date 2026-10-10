# MVP Spec (v0, draft)

Keep the first version deliberately small. Anything not listed under "In scope" waits until real physios ask for it.

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
