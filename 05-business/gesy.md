# GeSY and Clinical Notes

Desk research done 2026-10-25 from official ΟΑΥ documents (sources at the bottom). Main source: the allied-health rules of September 2025. Confirm anything marked "unconfirmed" with a GeSY physio.

## Summary

- Every paid GeSY physio session needs a clinical note with four parts: **service given, assessment results, treatment plan, progress**. GeSY sets no template, length or SOAP format.
- Normal sessions (PHYS01–03) must be one-to-one. The only group activity is PHYS04 (2–4 patients, neuro and scoliosis diagnoses only).
- A full-time GeSY physio can bill up to 308 units a month, so roughly 200–300 notes a month (estimate).
- There is no public API to the GeSY portal. PhysioPath's note is pasted in by the physio.
- The same four-part note applies to every allied profession in GeSY, not only physios.

## Activity codes

| Code | What it is | Length | Rules |
|---|---|---|---|
| **PHYS01** | Assessment / re-assessment or therapy | min 45′ | One-to-one |
| **PHYS02** | Therapy | min 30′ | One-to-one, no other patients in parallel |
| **PHYS03** | First assessment + therapy | 60′ | Once per new case. Needs a pre-approval questionnaire (new case? diagnosis and date?) and a signed statement that false or inaccurate statements are a criminal offence |
| **PHYS04** | Group exercise, 2–4 patients | 45′ | The physio supervises continuously, no one-to-one contact needed. Only for listed diagnoses: scoliosis (M41.x), stroke (I63.x, I64), neuropathies, myopathies, Parkinson's (G20), MS (G35), myasthenia (G70.x) |
| **PHYS06** | Request for additional sessions | – | Upload the request form, filled in together with the treating doctor |

## The clinical note

Every code (and every allied profession) has the same rule:

> «Απαραίτητη τεκμηρίωση κατά την υποβολή απαίτησης αποζημίωσης αποτελεί η καταχώρηση της παρεχόμενης υπηρεσίας, αποτελέσματα της αξιολόγησης, του θεραπευτικού πλάνου και εξέλιξης της κατάστασης του δικαιούχου στις κλινικές σημειώσεις.»

1. **Παρεχόμενη υπηρεσία:** what was done in the session.
2. **Αποτελέσματα αξιολόγησης:** assessment findings. Written as a summary in the notes, because the system can't take an uploaded assessment report.
3. **Θεραπευτικό πλάνο:** the treatment plan.
4. **Εξέλιξη κατάστασης:** the patient's progress.

**Why:** so the note shows in the patient's history and the referring doctor is kept informed.

**Where:** the physio creates a *visit* in the GeSY provider portal and records "notes, diagnoses and activities" there. Whether it is one text box or separate fields is **unconfirmed** (no portal manual found).

**What GeSY leaves open:** template, length, format. Every physio writes it their own way.

### Example note PhysioPath would produce (fictional patient)

```
Κλινική σημείωση · PHYS02 (30′) · Συνεδρία 4 από 6 · Δεξιός ώμος

Παρεχόμενη υπηρεσία:
Θεραπευτική άσκηση: pendulum 1′, wall slides 3×10,
ισομετρική έξω στροφή 10″ × 8.

Αποτελέσματα αξιολόγησης:
⚠ Δεν αναφέρθηκε (απαιτείται στην πρώτη επίσκεψη / επαναξιολόγηση)

Θεραπευτικό πλάνο:
Συνέχιση ασκήσεων. Πρόγραμμα στο σπίτι: τα ίδια, καθημερινά.

Εξέλιξη κατάστασης:
Πόνος 3/10 (από 6/10 στην 1η συνεδρία). Καλύτερο εύρος κίνησης.
```

## Limits and money

- Up to **14 units a day** (14 × 30′, 10 × 45′ or 8 × 60′) and **308 units a month** per physio. A 2023 plan to cut this to 280 is not in the Sep 2025 rules.
- Adults: at most **12 sessions a year**, across all diagnoses. The cap per diagnosis group is 6, 9 or 12.
- Referrals are for **3 or 6 sessions**, valid for 6 months. Each referral is for one diagnosis only.
- Patient co-payment: **€10 per session**.
- ΟΑΥ pays by the **end of the next month**.
- Unit price: the physio association said in 2023 it should be at least €20 and that ΟΑΥ wasn't paying that. The current price is **unconfirmed**.

## Requests for additional sessions (PHYS06)

- Filed **jointly by the physio and the treating specialist**, using forms on the GeSY website. Personal doctors can't file them.
- Since Feb 2025, doctors can issue post-surgery and fracture referrals directly, so PHYS06 is now for "exceptional cases" only.
- The musculoskeletal form (Feb 2025) asks for:
  - **Part A, history:** surgery and its date; what worsens or eases symptoms; how symptoms change over 24 h; symptom description; past and family medical history and medications; psychosocial history and red flags; imaging; **the history of the physio plan (what it included, number and frequency of sessions)**.
  - **Part B, objective assessment:** a checklist (observation, palpation, muscles, joint mobility, mobilisation, neurological, special tests) and the findings.
  - Signatures and stamps from both the doctor and the physio.
- The "other conditions" form adds: diagnosis with ICD-10 code, a justification, the number of extra sessions, the **proposed treatment protocol**, and supporting literature or guidelines.

## IT and integration

- The provider portal lets providers create visits, record notes, diagnoses and activities, and view patient history "based on permissions".
- **No public API** or certified-vendor process found. The system is run by a private contractor.
- It was "largely dysfunctional" for several days in January 2026. The head of ΟΑΥ IT said they depend on the contractor for fixes.
- Access is limited to Cyprus and Greece.
- The eHealth law 59(I)/2019 created a national health record bank, and a national electronic health record is going to tender. Standards-based exchange (FHIR) may come later.

## Audits and fines

ΟΑΥ checks clinical notes and fines providers whose notes don't justify their claims. Published cases from 2026 (all specialist doctors; **no public case against a physio found**):

| When | Who | Fine | Why |
|---|---|---|---|
| June 2026 | Orthopaedist | €1,000 | «ανεπαρκή συμπλήρωση των κλινικών σημειώσεων»: many notes were a single word, so procedures, referrals and prescriptions weren't documented |
| May 2026 | Orthopaedist | €5,000 | Claimed procedures that «δεν τεκμηριωνόταν στις κλινικές σημειώσεις» (started from patient complaints) |
| 2026 | Dermatologist | €1,000 | Notes insufficient and not in line with ΟΑΥ's terms |
| June 2026 | Nephrologist | €500 | The uploaded document didn't support the claimed activity |

- **Jan–Jun 2026:** €64,500 in fines across 11 cases.
- **Year to May 2026:** about 850,000 claim audits (up from about 500,000), €19 million of problematic claims recovered.
- **2023:** about €80k in fines on 40+ providers, 80,000+ claims rejected (about €10 million), 10 contracts suspended, some police complaints.
- **The rule behind the fines:** every claimed activity must be visible and justified in the note.

**For PhysioPath:** frame it as complete, consistent notes, never as "avoid fines" or "guaranteed compliance". A safe feature: flag mismatches between the activity code and the note (e.g. PHYS01 picked but no assessment findings recorded), without filling anything in.

## Who sees the note

- **The referring doctor**, in the patient's history (the note's official purpose).
- **Patients** see diagnoses, tests, visits and referral notes in their GeSY portal. Whether they see the physio's clinical note is **unconfirmed**; if they do, the tone matters.
- No ΟΑΥ rule on AI-written notes was found. The provider who submits the claim stays responsible.

## Physios' complaints (association, 2023)

- The unit price is too low, and the monthly unit cap was going to be cut.
- The blanket limit on orthopaedic referrals (30% of monthly visits) is untargeted.
- IT improvements are needed, for example handling several diagnoses at once.
- **Physios want access to the patient's history** ("πρόσβαση των φυσιοθεραπευτών στο ιστορικό των ασθενών").

## Market

- About **1,300 registered physiotherapists in Cyprus** (World Physiotherapy, 2024). That is all physios, not only GeSY-contracted ones; the GeSY number is **unconfirmed**.
- The same rules and the same four-part note cover other allied professions in GeSY. The forms page has forms for occupational therapy, speech therapy, dietitians, clinical psychology and nursing. Occupational therapists were negotiating their GeSY terms in Aug 2026, and a bill to bring counselling psychologists into GeSY went to parliament in Mar 2026.

## What it means for PhysioPath

1. **Two-part recording.** The home-exercise explanation covers the service and the plan, but not progress or assessment findings. The recording needs both: "what we did and how it's going", then the home exercises.
2. **A four-part template.** Every note gets the same four parts, and any missing part is flagged (never guessed). Session numbers come from PhysioPath's own history.
3. **Physio approval of every word.** The note supports a claim that carries a legal statement.
4. **History is a feature.** GeSY doesn't give physios the patient's history, and they have asked for it. PhysioPath keeps the physio's own history, which makes the "progress" part, and later the PHYS06 plan history, easy to write.
5. **Paste, don't integrate.** A copy button with the right structure is the integration for now. It also means PhysioPath still works while GeSY is down.
6. **Session mode has a GeSY niche.** PHYS04 groups of 2–4 neuro patients are exactly what a small room board fits.

## To confirm with a GeSY physio

- What the portal's notes field looks like: one box or several?
- How long their notes are in practice, how long they take, and when they write them.
- Has ΟΑΥ ever questioned or cut a claim because of a note? Have they heard about the 2026 fines over notes, and did it change how they write?
- Can patients see the physio's clinical note in their GeSY portal?
- How long must physios keep records? (Code of ethics, Seventh Annex of Law 140/1989; not found online.)
- How often do they file PHYS06, and how long does the form take?
- Do they run PHYS04 groups? How often, and with which patients?
- The current unit price, and how many physios are contracted with GeSY.

## Sources

- [GeSY allied-health rules, Sep 2025](https://www.gesy.org.cy/el-gr/annualreport/rules-allied-sep-2025.pdf) (activity codes, note contents, unit cap, PHYS04)
- [GeSY guidance for doctors and physiotherapists (Dec 2020)](https://www.gesy.org.cy/el-gr/announcementdef/20201207-final--template-physiotherapy.pdf) (referrals, session limits, daily units)
- [GeSY physiotherapy FAQ (Jul 2021)](https://www.gesy.org.cy/el-gr/announcementdef/20210708-phys-announcement.pdf) (PHYS06 process, payment timing)
- [GeSY physiotherapy amendments (Jan 2025)](https://www.gesy.org.cy/el-gr/announcementdef/20250121-phys-announcement.pdf)
- [GeSY allied-health forms](https://www.gesy.org.cy/el-gr/hio-allied-entypa): [musculoskeletal form](https://www.gesy.org.cy/el-gr/annualreport/20250201-entipo-ipovolis-aitimaton-phys-mioskeletika-0.docx), ["other conditions" form](https://www.gesy.org.cy/el-gr/annualreport/entipo-ipovolis-aitimaton-alles-pathiseis-3.docx)
- [GeSY activity catalogues](https://www.gesy.org.cy/el-gr/hioactivitycatalogues-allied)
- [GeSY portal terms](https://registration.gesy.org.cy/assets/terms_en.pdf) · [HIO IT system](https://www.gesy.org.cy/en-us/hioinformationtechnologysys)
- [GeSY IT failures (Cyprus Mail, Jan 2026)](https://cyprus-mail.com/2026/01/15/gesy-it-failures-raise-calls-for-contingency-plan) · [Access restricted from abroad (Reporter)](https://www.reporter.com.cy/article/1318571/epathe-kai-emathe-me-to-logsmiko-toy-gsy-o-oay-proliptiko-to-metro-toy-gogafikoy-apokleismoy-antidroyn-oi-gatroi)
- Fines over notes: [Politis (Jul 2026)](https://www.politis.com.cy/cyprus/igeia/1023072/dyo-ghiatri-sto-mikroskopio-toy-oau-prostima-eur1500-ghia-ton-mina-iounio-orthopedikos-tekmirione-me-monolektikes-simeiwseis-iatrikes-prakseis-parapemptika-kai-sintaghes-entos-gesy) · [ygeia-news: €64,500 in 2026](https://ygeia-news.com/prostima-%E2%82%AC64500-apo-ton-oay-se-paroxoys-toy-gesy-apo-tin-arxi-toy-2026) · [Cyprus Mail: seventh year (audits, €19m)](https://cyprus-mail.com/2026/06/03/gesy-marks-seven-years-of-operation) · [RIK: 2023 fines](https://news.rik.cy/article/2024/3/29/prostima-upsous-80-khiliadon-euro-se-40-parokhous-ugeias-gia-katakhreseis-sto-gesu/)
- [GeSY: what patients see (2023)](https://www.gesy.org.cy/el-gr/announcementdef/20231102-ghs-system-pr.pdf) · [Physiotherapists Registration Law 140/1989](https://www.cylaw.org/nomoi/enop/non-ind/1989_1_140/full.html)
- [Physio association demands (YgeiaWatch, Jul 2023)](https://www.ygeiawatch.com.cy/news/eidhseis/fysiooerapeytes-zhtoyn-kalyterh-diaxeirish-yphresiwn-entos-gesy)
- [World Physiotherapy: Cyprus](https://el.world.physio/membership/cyprus)
- [Occupational therapists and GeSY (Cyprus Mail, Aug 2026)](https://cyprus-mail.com/2026/08/11/occupational-therapists-seek-answers-over-gesy-integration-plans) · [Counselling psychologists bill (Cyprus Mail, Mar 2026)](https://cyprus-mail.com/2026/03/12/bill-to-integrate-counselling-psychologists-into-gesy-heads-to-parliament)
- [eHealth in Cyprus](https://gnius.esante.gouv.fr/en/international-digital-health-systems/ehealth-cyprus)
