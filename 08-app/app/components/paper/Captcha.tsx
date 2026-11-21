"use client";
// The "not a robot" check (Cloudflare Turnstile) on the forms that send an email code: sign-in,
// sign-up and «Στείλτε μου νέο κωδικό». Without it a script could ask for codes for random emails
// and use up the project's email limit (30 an hour), so real people couldn't get a code.
// A small box above the button: it checks by itself in a second or two («Επιτυχία!»), and only
// asks for a tap when Cloudflare isn't sure.
//
// It puts a hidden field "captchaToken" in the form; the server action passes it to Supabase,
// which checks it with Cloudflare ([auth.captcha] in supabase/config.toml).
// No site key (local setup) → nothing is shown and Supabase must have captcha off too.
// A token works once, so after every answer from the server (resetKey changes) it gets a new one.
import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<Turnstile> | null = null;

// The script is loaded once, the first time a form with the check is shown.
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => {
      loading = null; // try again next time
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export const captchaSiteKey = () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;

const PROBLEM = "Ο έλεγχος ασφαλείας δεν φόρτωσε. Ανανεώστε τη σελίδα. Αν συνεχίζει, δοκιμάστε άλλον browser ή κλείστε το ad blocker.";

export function Captcha({ resetKey }: { resetKey?: unknown }) {
  const siteKey = captchaSiteKey();
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let gone = false;
    const el = box.current;
    loadTurnstile()
      .then((turnstile) => {
        if (gone) return;
        widget.current = turnstile.render(el, {
          sitekey: siteKey,
          language: "el",
          "response-field-name": "captchaToken",
          callback: () => setProblem(null),
          // Cloudflare's error code goes to the console (e.g. 110200 = this site's address is not
          // in the widget's hostname list). Returning true: we handle it, no console error from them.
          "error-callback": (code: string) => {
            console.error("Turnstile error", code);
            setProblem(PROBLEM);
            return true;
          },
          "unsupported-callback": () => setProblem(PROBLEM),
        });
      })
      .catch((error) => {
        console.error(error);
        if (!gone) setProblem(PROBLEM);
      });
    return () => {
      gone = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return (
    <div className="flex flex-col gap-2">
      <div ref={box} className="min-h-[65px]" />
      {problem && (
        <p role="alert" className="bg-tab-pink px-4 py-3 font-semibold text-ink">
          {problem}
        </p>
      )}
    </div>
  );
}
