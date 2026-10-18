#!/usr/bin/env python3
"""PhysioPath outreach app: browse contacts.csv and send interview emails.

Run:   python3 07-outreach/app/server.py
Open:  http://localhost:8765

Only the Python standard library is used. The server listens on 127.0.0.1
only, so nothing is reachable from other machines.
"""
import csv
import json
import os
import re
import smtplib
import ssl
import subprocess
import sys
import threading
import webbrowser
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

APP_DIR = Path(__file__).resolve().parent
OUTREACH_DIR = APP_DIR.parent
CONTACTS = OUTREACH_DIR / "contacts.csv"
SENT_LOG = OUTREACH_DIR / "sent-log.csv"
ENV_FILE = APP_DIR / ".env"
PORT = int(os.environ.get("PORT", "8765"))

SENT_LOG_FIELDS = ["datetime", "contact", "to", "kind", "method", "subject", "message_id"]
FOLLOW_UP_AFTER_DAYS = 5

lock = threading.Lock()


# ---------- storage ----------

def load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def read_contacts():
    with CONTACTS.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


def write_contacts(fields, rows):
    tmp = CONTACTS.with_suffix(".csv.tmp")
    with tmp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    tmp.replace(CONTACTS)


def read_sent_log():
    if not SENT_LOG.exists():
        return []
    with SENT_LOG.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def append_sent_log(entry):
    new_file = not SENT_LOG.exists()
    with SENT_LOG.open("a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=SENT_LOG_FIELDS)
        if new_file:
            writer.writeheader()
        writer.writerow(entry)


def sent_today():
    today = date.today().isoformat()
    return sum(1 for e in read_sent_log() if e["datetime"].startswith(today))


def last_message_id(to):
    ids = [e["message_id"] for e in read_sent_log() if e["to"] == to and e["message_id"]]
    return ids[-1] if ids else None


def contact_label(c):
    return c.get("organisation") or c.get("name") or c.get("email")


def record_sent(rows, i, kind, method, to, subject, message_id=""):
    c = rows[i]
    today = date.today()
    if not c.get("first_contact"):
        c["first_contact"] = today.isoformat()
    c["last_contact"] = today.isoformat()
    if kind == "first":
        c["status"] = "emailed"
        c["next_step"] = f"follow up on {(today + timedelta(days=FOLLOW_UP_AFTER_DAYS)).isoformat()} if no reply"
    else:
        c["status"] = "followed up"
        c["next_step"] = "wait for reply; mark 'no reply' after a week"
    append_sent_log({
        "datetime": datetime.now().isoformat(timespec="seconds"),
        "contact": contact_label(c),
        "to": to,
        "kind": kind,
        "method": method,
        "subject": subject,
        "message_id": message_id,
    })


# ---------- email ----------

def smtp_enabled(env):
    return all(env.get(k) for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"))


def send_smtp(env, to, subject, body, sender_name, in_reply_to=None):
    from_addr = env.get("SMTP_FROM") or env["SMTP_USER"]
    msg = EmailMessage()
    msg["From"] = formataddr((sender_name, from_addr))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=from_addr.split("@")[-1])
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg.set_content(body)

    host, port = env["SMTP_HOST"], int(env.get("SMTP_PORT") or 587)
    ctx = ssl.create_default_context()
    if port == 465:
        server = smtplib.SMTP_SSL(host, port, context=ctx, timeout=30)
    else:
        server = smtplib.SMTP(host, port, timeout=30)
        server.starttls(context=ctx)
    with server:
        server.login(env["SMTP_USER"], env["SMTP_PASSWORD"])
        server.send_message(msg)
    return msg["Message-ID"]


# ---------- HTTP ----------

EMAIL_RE = re.compile(r"^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _send(self, code, body, content_type):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def _host_ok(self):
        # Blocks DNS-rebinding: only answer requests addressed to this machine.
        return self.headers.get("Host", "") in (f"127.0.0.1:{PORT}", f"localhost:{PORT}")

    def do_GET(self):
        if not self._host_ok():
            return self._json({"error": "forbidden"}, 403)
        if self.path in ("/", "/index.html"):
            return self._send(200, (APP_DIR / "index.html").read_bytes(), "text/html; charset=utf-8")
        if self.path == "/api/contacts":
            with lock:
                _, rows = read_contacts()
            return self._json([{"id": i, **r} for i, r in enumerate(rows)])
        if self.path == "/api/templates":
            return self._send(200, (APP_DIR / "templates.json").read_bytes(), "application/json; charset=utf-8")
        if self.path == "/api/config":
            env = load_env()
            return self._json({
                "smtp_enabled": smtp_enabled(env),
                "smtp_from": env.get("SMTP_FROM") or env.get("SMTP_USER", ""),
                "compose": env.get("COMPOSE", "outlook"),
                "daily_limit": int(env.get("DAILY_LIMIT") or 15),
                "sent_today": sent_today(),
                "sender_name_gr": env.get("SENDER_NAME_GR", ""),
                "sender_name_en": env.get("SENDER_NAME_EN", ""),
                "sender_phone": env.get("SENDER_PHONE", ""),
                "sender_email": env.get("SENDER_EMAIL", ""),
                "course_gr": env.get("COURSE_GR", ""),
                "course_en": env.get("COURSE_EN", ""),
                "env_exists": ENV_FILE.exists(),
            })
        self._json({"error": "not found"}, 404)

    def do_POST(self):
        # JSON content type forces a CORS preflight, so other websites can't call this API.
        if not self._host_ok() or not self.headers.get("Content-Type", "").startswith("application/json"):
            return self._json({"error": "forbidden"}, 403)
        try:
            length = int(self.headers.get("Content-Length") or 0)
            data = json.loads(self.rfile.read(length) or b"{}")
            with lock:
                return self._route_post(data)
        except Exception as e:  # report any failure to the UI
            return self._json({"error": str(e)}, 400)

    def _route_post(self, data):
        fields, rows = read_contacts()
        parts = self.path.strip("/").split("/")  # api/contacts[/id[/mark-sent]] or api/send

        if parts == ["api", "contacts"]:
            rows.append({f: data.get(f, "") for f in fields} | {"status": data.get("status") or "to contact"})
            write_contacts(fields, rows)
            return self._json({"id": len(rows) - 1, **rows[-1]})

        if len(parts) >= 3 and parts[:2] == ["api", "contacts"]:
            i = int(parts[2])
            if not 0 <= i < len(rows):
                raise ValueError("contact not found; reload the page")
            if len(parts) == 3:
                for k, v in data.items():
                    if k in fields:
                        rows[i][k] = str(v)
                write_contacts(fields, rows)
                return self._json({"id": i, **rows[i]})
            if parts[3] == "mark-sent":
                record_sent(rows, i, data["kind"], data.get("method", "manual"), data.get("to", rows[i].get("email", "")), data.get("subject", ""))
                write_contacts(fields, rows)
                return self._json({"contact": {"id": i, **rows[i]}, "sent_today": sent_today()})

        if parts == ["api", "open-draft"]:
            # Opens a prefilled draft in the Outlook app on this Mac. Nothing is sent.
            to = data["to"].strip()
            if not EMAIL_RE.match(to):
                raise ValueError(f"not a valid email address: {to!r}")
            body = data["body"].replace("\r\n", "\n").replace("\n", "\r\n")
            url = f"mailto:{to}?subject={quote(data['subject'], safe='')}&body={quote(body, safe='')}"
            app = load_env().get("MAC_MAIL_APP") or "Microsoft Outlook"
            result = subprocess.run(["open", "-a", app, url], capture_output=True, text=True, timeout=15)
            if result.returncode != 0:
                raise ValueError(f"couldn't open {app}: {result.stderr.strip() or 'unknown error'}")
            return self._json({"ok": True})

        if parts == ["api", "send"]:
            env = load_env()
            if not smtp_enabled(env):
                raise ValueError("SMTP is not set up in app/.env")
            i, to = int(data["id"]), data["to"].strip()
            if not EMAIL_RE.match(to):
                raise ValueError(f"not a valid email address: {to!r}")
            if not 0 <= i < len(rows):
                raise ValueError("contact not found; reload the page")
            kind = data["kind"]
            sender = env.get("SENDER_NAME_EN" if data.get("lang") == "en" else "SENDER_NAME_GR", "")
            reply_to = last_message_id(to) if kind == "followup" else None
            message_id = send_smtp(env, to, data["subject"], data["body"], sender, reply_to)
            record_sent(rows, i, kind, "smtp", to, data["subject"], message_id)
            write_contacts(fields, rows)
            return self._json({"contact": {"id": i, **rows[i]}, "sent_today": sent_today()})

        return self._json({"error": "not found"}, 404)


def main():
    if not CONTACTS.exists():
        sys.exit(f"Missing {CONTACTS}. Copy contacts.template.csv to contacts.csv first.")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}"
    print(f"PhysioPath outreach running at {url}  (Ctrl+C to stop)")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.5, webbrowser.open, [url]).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
