# PhysioPath

The physio's assistant during the session: the physio speaks today's exercises, the patient follows them on a phone or tablet, the physio sees the whole room. At the end: home program for the patient + clinical note for the clinic. Greek first, for physiotherapists in Cyprus and Greece.

**The physio decides, the AI writes.**

Full pitch: [00-pitch/pitch.md](00-pitch/pitch.md)

## Current stage

- [ ] 1. **Listen** – interview 5–10 physiotherapists in Limassol
- [ ] 2. **Observe** – sit in on real sessions (with patient permission)
- [ ] 3. **Prototype** – first version, tested with 1–2 friendly physios on fictional patients
- [ ] 4. **Pilot** – small free pilot with a few clinics, measure time saved and patient feedback
- [ ] 5. **Launch** – start charging once physios confirm they would pay

## Workspace layout

| Folder | What goes there |
|---|---|
| [00-pitch/](00-pitch/) | The pitch and later versions of it (one-pager, slides) |
| [01-research/](01-research/) | Interview guide, interview notes, session observations, tracker |
| [02-product/](02-product/) | MVP spec, example voice notes and expected outputs |
| [03-prototype/](03-prototype/) | Code for the first version |
| [04-pilot/](04-pilot/) | Pilot plan, metrics, feedback |
| [05-business/](05-business/) | Competitors, pricing, business model notes |
| [06-privacy-legal/](06-privacy-legal/) | GDPR checklist, consent forms, regulatory notes |
| [07-outreach/](07-outreach/) | Contacts, message templates for physios and mentors |
| [notes/](notes/) | Decision log, open questions, assumptions to test |

## Rules for the workspace

- No real patient data in this folder. Use fictional patients until consent and storage are sorted (see [06-privacy-legal/](06-privacy-legal/)).
- Interview notes use initials or codes (e.g. `P01`), not full names.
- Write decisions down in [notes/decisions.md](notes/decisions.md) with the date and the reason.

## Private data (not on GitHub)

These stay on your computer only (see `.gitignore`):

- `07-outreach/contacts.csv` and `01-research/interview-tracker.csv`. Start from the `*.template.csv` copies.
- Interview and observation notes in `01-research/interviews/` and `01-research/observations/` (templates excluded)
- `04-pilot/data/`, `06-privacy-legal/signed/`, any `private/` folder or `*.private.*` file
- Audio/video recordings and `.env` files

Back these up somewhere private, since git won't.
