/**
 * PhysioPath demo feedback → Google Sheet.
 *
 * The questionnaire under the demo video (hotvader.github.io/PhysioPath/demo/) sends each answer here,
 * and this script adds it as one row in the "Answers" tab.
 *
 * Setup (once):
 *   1. Create a Google Sheet, e.g. "PhysioPath feedback".
 *   2. Extensions → Apps Script. Delete what is there, paste this whole file, Save.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as: Me.  Who has access: Anyone.
 *   4. Authorize, then copy the Web app URL (ends in /exec) and give it to Claude for the demo page.
 *   After editing this script: Deploy → Manage deployments → Edit → Version: New version (the URL stays).
 */

const SHEET_NAME = "Answers";

// Column order in the Sheet. The page sends fields with these names.
const FIELDS = [
  "role",          // physio / owner / head of department / assistant / other
  "team_size",     // 1 / 2-4 / 5-10 / 10+
  "useful_voice",  // 1–5: voice note → clinical note + program
  "useful_room",   // 1–5: room board for monitoring
  "would_use",     // yes / maybe / no
  "why",           // free text
  "missing",       // free text
  "wants_meeting", // yes / no
  "contact",       // optional email or phone, only if they want a meeting
  "clinic",        // optional clinic name
  "lang",          // gr / en
];

const MAX_LEN = 2000;

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // Honeypot: a hidden field people never see. Bots fill it; pretend success and drop it.
    if (data.website) return reply({ ok: true });

    const row = [new Date()].concat(FIELDS.map((f) => clean(data[f])));

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet().appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false });
  }
}

// Opening the URL in a browser shows this, so you can check the deployment works.
function doGet() {
  return reply({ ok: true, service: "PhysioPath feedback" });
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["submitted_at"].concat(FIELDS));
    sh.setFrozenRows(1);
  }
  return sh;
}

// Text only, length-limited, and never read as a formula by Sheets (=, +, -, @ at the start).
function clean(v) {
  if (v === undefined || v === null) return "";
  let s = String(v).slice(0, MAX_LEN).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
