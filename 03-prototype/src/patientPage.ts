// Builds the patient's phone page (Greek) from an approved program.
// The page is self-contained HTML, so it can later be sent as a link or a file.
import type { PatientProgram } from "./schema.ts";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

type Exercise = PatientProgram["exercises"][number];

function doseChips(ex: Exercise): string[] {
  const chips: string[] = [];
  // A bare number means repetitions; anything else ("30 δευτερόλεπτα") is shown as said.
  const reps = ex.reps && /^\d+$/.test(ex.reps.trim()) ? `${ex.reps.trim()} επαναλήψεις` : ex.reps;
  if (ex.sets && ex.reps) chips.push(`${ex.sets} σετ × ${ex.reps}`);
  else if (ex.sets) chips.push(`${ex.sets} σετ`);
  else if (reps) chips.push(reps);
  if (ex.hold) chips.push(`Κρατήστε ${ex.hold}`);
  if (ex.frequency) chips.push(ex.frequency);
  return chips;
}

function listSection(cls: string, icon: string, title: string, items: string[]): string {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  if (!clean.length) return "";
  return `
    <section class="box ${cls}">
      <h2><span class="ic" aria-hidden="true">${icon}</span>${esc(title)}</h2>
      <ul>${clean.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    </section>`;
}

export function patientPage(program: PatientProgram, id: string, opts: { clinicName?: string } = {}): string {
  const exercises = program.exercises.filter((e) => e.name.trim());
  // Addressing someone in Greek needs the vocative ("Γιώργο"), which can't be derived reliably,
  // so the name is shown as a label instead.
  const forName = program.patient_first_name?.trim();

  return `<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(program.title)}</title>
<style>
:root {
  --bg: #f4f3ef; --surface: #fff; --text: #1a1a17; --text-2: #55544e; --border: #e6e4dd;
  --accent: #0d7a69; --accent-soft: #e1f2ee; --on-accent: #fff;
  --amber: #8f5500; --amber-soft: #fdf1dc; --red: #b4321f; --red-soft: #fbe9e6; --blue: #2f5fc4; --blue-soft: #e8eefb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f100f; --surface: #1a1b1a; --text: #ecece8; --text-2: #b0afa8; --border: #2c2d2a;
    --accent: #3cc4ab; --accent-soft: #14332e; --on-accent: #06201b;
    --amber: #f2b552; --amber-soft: #352710; --red: #ff9b8a; --red-soft: #3a1a15; --blue: #93b2ff; --blue-soft: #1b2540;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 17px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
main { max-width: 560px; margin: 0 auto; padding: 20px 16px 48px; }
.demo { font-size: 13px; text-align: center; color: var(--amber); background: var(--amber-soft); border-radius: 10px; padding: 6px 10px; margin-bottom: 18px; }
.clinic { font-size: 14px; color: var(--accent); font-weight: 600; margin: 0 0 4px; }
.for { font-size: 15px; color: var(--text-2); margin: 0 0 2px; }
.for b { color: var(--text); }
h1 { font-size: 28px; line-height: 1.2; margin: 0 0 4px; letter-spacing: -.01em; }
.subtitle { color: var(--text-2); margin: 0 0 20px; }
.progress { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 14px 16px; margin-bottom: 14px; }
.progress .bar { flex: 1; height: 8px; background: var(--border); border-radius: 8px; overflow: hidden; }
.progress .bar i { display: block; height: 100%; width: 0; background: var(--accent); border-radius: 8px; transition: width .25s; }
.progress b { font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 15px; }
.ex { display: flex; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 10px; transition: opacity .2s; }
.ex.done { opacity: .6; }
.num { flex: none; width: 34px; height: 34px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-weight: 700; }
.ex-body { flex: 1; min-width: 0; }
.ex h3 { margin: 4px 0 8px; font-size: 18px; line-height: 1.3; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.chip { background: var(--accent-soft); color: var(--accent); font-weight: 650; font-size: 15px; padding: 4px 10px; border-radius: 999px; }
.ex p { margin: 6px 0 0; color: var(--text-2); font-size: 16px; }
.check { flex: none; align-self: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--border); background: transparent; display: grid; place-items: center; cursor: pointer; color: transparent; font-size: 22px; }
.ex.done .check { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.check:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.box { border-radius: 16px; padding: 16px 18px; margin-top: 14px; background: var(--surface); border: 1px solid var(--border); }
.box h2 { display: flex; align-items: center; gap: 10px; font-size: 17px; margin: 0 0 6px; }
.box ul { margin: 0; padding-left: 22px; }
.box li { margin: 4px 0; }
.ic { font-size: 20px; }
.avoid { background: var(--amber-soft); border-color: transparent; }
.avoid h2 { color: var(--amber); }
.call { background: var(--red-soft); border-color: transparent; }
.call h2 { color: var(--red); }
.next { background: var(--blue-soft); border-color: transparent; }
.next h2 { color: var(--blue); }
.next p { margin: 0; font-size: 18px; font-weight: 600; }
footer { margin-top: 28px; text-align: center; font-size: 14px; color: var(--text-2); }
</style>
</head>
<body>
<main>
  <div class="demo">Δείγμα με φανταστικό ασθενή · PhysioPath demo</div>
  ${opts.clinicName ? `<p class="clinic">${esc(opts.clinicName)}</p>` : ""}
  ${forName ? `<p class="for">Για: <b>${esc(forName)}</b></p>` : ""}
  <h1>Το πρόγραμμά σας</h1>
  <p class="subtitle">${esc(program.title)}</p>

  ${exercises.length ? `
  <div class="progress" aria-live="polite"><div class="bar"><i id="bar"></i></div><b id="count">0 από ${exercises.length} σήμερα</b></div>
  ${exercises.map((ex, i) => {
    const chips = doseChips(ex);
    return `
  <article class="ex" data-i="${i}">
    <div class="num">${i + 1}</div>
    <div class="ex-body">
      <h3>${esc(ex.name)}</h3>
      ${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}
      ${ex.notes ? `<p>${esc(ex.notes)}</p>` : ""}
    </div>
    <button class="check" type="button" aria-pressed="false" aria-label="Το έκανα σήμερα: ${esc(ex.name)}">✓</button>
  </article>`;
  }).join("")}` : ""}

  ${listSection("after", "🧊", "Μετά τις ασκήσεις", program.after_exercises)}
  ${listSection("avoid", "⚠️", "Αποφύγετε", program.avoid)}
  ${listSection("call", "📞", "Πάρτε μας τηλέφωνο αν", program.contact_if)}
  ${listSection("other", "📝", "Άλλες οδηγίες", program.other)}
  ${program.next_appointment ? `
  <section class="box next"><h2><span class="ic" aria-hidden="true">📅</span>Επόμενο ραντεβού</h2><p>${esc(program.next_appointment)}</p></section>` : ""}

  <footer>Το πρόγραμμα το ετοίμασε ο φυσιοθεραπευτής σας.<br>Αν έχετε απορίες, ρωτήστε τον.</footer>
</main>
<script>
(() => {
  const key = "physiopath:${esc(id)}:" + new Date().toLocaleDateString("sv");
  let done = [];
  try { done = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
  const cards = [...document.querySelectorAll(".ex")];
  const update = () => {
    cards.forEach((card, i) => {
      const on = done.includes(i);
      card.classList.toggle("done", on);
      card.querySelector(".check").setAttribute("aria-pressed", on);
    });
    const bar = document.getElementById("bar"), count = document.getElementById("count");
    if (bar) bar.style.width = (done.length / cards.length) * 100 + "%";
    if (count) count.textContent = done.length + " από " + cards.length + " σήμερα";
  };
  cards.forEach((card, i) => card.querySelector(".check").addEventListener("click", () => {
    done = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    try { localStorage.setItem(key, JSON.stringify(done)); } catch {}
    update();
  }));
  update();
})();
</script>
</body>
</html>`;
}
