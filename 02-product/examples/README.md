# Example Voice Notes

Fictional cases for testing prompts and the prototype. **No real patients.**

Each example has:

- `NN-input.txt` – what the physio says (transcript, Greek and/or English)
- `NN-expected.md` – what a good patient program + clinical note should look like

Collect real phrasing from interviews and observations (anonymised) to make these realistic: Cypriot Greek, mixed English terms, incomplete sentences, corrections mid-sentence ("3 sets, no, 2 sets").

## Cases to cover

- [x] 01 – simple knee rehab (from the pitch, English)
- [x] 02 – knee after ACL surgery, Greek with English terms mixed in
- [x] 03 – shoulder after surgery, with a mid-sentence correction ("δύο σετ… όχι, τρία")
- [x] 04 – chronic lower back, elderly patient, missing sets/reps/frequency on purpose
- [ ] Sports ankle sprain
- [ ] Cypriot dialect

Examples 02–04 appear as samples in the demo (`03-prototype/`). What a good result must show:

- **02:** every number as said; "no squats" under things to avoid; crutches outside the house (avoid or other instructions); Thursday as the next appointment.
- **03:** wall slides with **3** sets (the corrected number), not 2.
- **04:** questions for the physio about the missing sets, reps and frequency, and how long to walk; "call us if the pain goes down the leg" under when to call; the massage and heat treatment only in the clinical note, not in the patient program.
