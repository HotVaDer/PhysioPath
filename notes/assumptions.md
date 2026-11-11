# Assumptions to Test

From the pitch. Riskiest first. Update status as evidence comes in.

Re-ranked on 2026-10-25: back to v0 (see [decisions.md](decisions.md)). The v0 assumptions come first again; the in-session ones are parked. Numbers are kept so old notes still match.

## Core (v0, riskiest first)

| # | Assumption | How to test | Status |
|---|---|---|---|
| 1 | Physios spend significant unpaid time on notes and patient instructions, including the clinical note GeSY requires for every paid session | Interviews ("How long does your GeSY note take, and when do you write it?") | unclear |
| 17 | A GeSY-shaped note (service given, treatment plan, progress) is what physios need, not a generic SOAP note | Show the demo note in interviews | unclear |
| 4 | Physios are willing to speak the home program aloud in front of the patient at the end of the session, as the explanation they already give | Observation, demo | unclear |
| 2 | Patients often forget or stop doing home exercises | Interviews, observation | unclear |
| 3 | Small clinics mostly use paper / WhatsApp, not dedicated software | Interviews | unclear |
| 5 | Greek speech-to-text is good enough (Cypriot accent, English terms) | Technical tests (see `03-prototype/docs/transcription.md`) | partly confirmed on synthetic audio; real voices next |
| 6 | Physios will pay a monthly subscription | Pilot end question | unclear |
| 7 | Patients prefer a link over an app or paper | Pilot patient survey | unclear |
| 8 | A documentation and organisation tool stays outside medical device rules (incl. the "call the physio" button, which only passes messages on) | Expert advice | unclear |
| 9 | Patients value seeing *their* physio in videos (later feature) | Interviews, pilot | unclear |

## Parked: session mode (2026-10-18 to 2026-10-25)

| # | Assumption | How to test | Status |
|---|---|---|---|
| 10 | Physios often work with 2–3 patients at once, and lose time to patients waiting or calling them | Interviews ("During the session"), observation log | **evidence against** for normal GeSY sessions: PHYS01–03 must be one-to-one. Exception: PHYS04 group exercise (2–4 patients, neuro and scoliosis diagnoses only). Forums and blogs describe parallel care as lower quality. Still open for PHYS04 groups, private group classes and sports rehab |
| 11 | A screen showing the next exercise reduces waits and interruptions | Observation before/after, pilot | parked |
| 12 | Physios are comfortable dictating the plan in front of the patient at the start of the session | Interviews, demo reaction | parked; replaced by the new #4 |
| 13 | Patients will follow exercises on a phone or tablet mid-session (sweaty hands, old phones, older patients) | Demo with patients, pilot | parked |
| 14 | Under ~15 s from speaking to the first exercise on screen is fast enough | Demo, timing in pilot | parked |
| 15 | Clinics have, or would buy, a tablet for the exercise area when patients can't use their own phone | Interviews | parked |
| 16 | Physios will pay for less waiting and smoother parallel work (not only for less paperwork) | Interviews (money block), pilot end question | parked |
