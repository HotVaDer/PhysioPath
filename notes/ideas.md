# Ideas Backlog

Ideas that are not in the spec yet. Each one has a source and what would need to be true before we build it. Nothing here is decided: decisions go in [decisions.md](decisions.md).

## 2026-11-06: Conversation with a new physiotherapist

Informal chat, not a full interview (no interview file yet). He was interested in the idea, but **mostly in the monitoring part**: using the room board so he can oversee and manage **his assistants** while they work with patients.

Why this matters:
- It touches the session mode we parked on 2026-10-25 ([decisions.md](decisions.md)). The reason for parking was that one physio running parallel patients is forbidden in normal GeSY sessions. This is a different use: a lead physio supervising assistants, each still with one patient.
- One person is not evidence. Ask the next interviewees: do you work with assistants? How do you keep track of what they do with patients today?
- Follow up with him: proper interview (use [`01-research/interviews/_template.md`](../01-research/interviews/_template.md)), how many assistants, GeSY or private, what "managing them" means in practice (who does which exercises, progress, mistakes?).

## 2026-11-06: New feature ideas

### 1. Discomfort flag on the room board

During the session, the tablet watches the patient's face and flags "possible discomfort, exercise 3" for the physio. Fits the live room board and keeps the physio in charge.

### 2. Smart progression hints

If a patient shows no discomfort cues and rates pain low for several sessions, the app asks the physio "ready to progress?". The face data becomes a long-term signal, not a live alarm.

### 3. Home program check-ins

The patient does home exercises in front of their phone, and the physio gets a summary like "3 of 5 sessions done, discomfort on squats". Probably the most valuable of the three: physios can't see what happens at home (see assumption #2 in [assumptions.md](assumptions.md)).

### Things to check before any of these

- **Medical device risk.** Detecting discomfort or suggesting progression is reading the patient's health state, not documenting what the physio said. This likely moves PhysioPath from documentation tool into medical device rules (EU MDR) and breaks assumption #8. Idea 2 is closest to "suggesting treatment", which our hard rules forbid. A safer version: show the facts (sessions done, pain scores the patient gave) and let the physio decide, with no "ready to progress?" wording.
- **GDPR.** Face video used to infer pain is health data and possibly biometric data (special category, Art. 9). Needs explicit consent, ideally on-device processing with no video stored. Add to [`06-privacy-legal/checklist.md`](../06-privacy-legal/checklist.md) if we pursue it.
- **Accuracy.** Pain detection from faces is unreliable, especially for older patients, poor lighting and phones propped at odd angles. A wrong flag (or a missed one) is worse than none.
- **Low-tech first.** Idea 3 can start without any camera: the patient taps "done" and rates pain 1–5 after each home session. That tests whether physios want the summary before we touch face analysis.
