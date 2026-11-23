// «Δοκιμάστε το»: the link in our emails and messages (…/try?r=<code>&lang=en). One button, and the
// visitor is inside a demo clinic full of fictional patients: no account, no email, no password.
// Already in a demo → back to it. Signed in with a real account → a note and a link to the app.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/app/components/paper/Card";
import { PaperLink } from "@/app/components/paper/Buttons";
import { cx } from "@/app/lib/cx";
import { demoText, pickLang, pickRef, type DemoLang } from "@/app/lib/demo/text";
import { currentUser, loadProfile } from "@/app/lib/onboarding/session";
import { TryForm } from "@/app/try/TryForm";

export async function generateMetadata({ searchParams }: PageProps<"/try">): Promise<Metadata> {
  const { lang } = await searchParams;
  return { title: demoText(pickLang(lang)).pageTitle };
}

// ΕΛ / EN at the top: a link that keeps the r= code, so the language is part of the link sent out.
function LangSwitch({ lang, refCode }: { lang: DemoLang; refCode?: string }) {
  const href = (to: DemoLang) => {
    const q = new URLSearchParams();
    if (refCode) q.set("r", refCode);
    if (to === "en") q.set("lang", "en");
    const s = q.toString();
    return (s ? `/try?${s}` : "/try") as "/try";
  };
  return (
    <nav aria-label={demoText(lang).switchLabel} className="flex gap-1 text-base">
      {(["el", "en"] as const).map((to) => (
        <Link
          key={to}
          href={href(to)}
          lang={to}
          aria-current={to === lang ? "true" : undefined}
          className={cx(
            "flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold no-underline",
            to === lang ? "bg-ink text-white hover:text-white" : "text-action hover:text-ink",
          )}
        >
          {to === "el" ? "ΕΛ" : "EN"}
        </Link>
      ))}
    </nav>
  );
}

export default async function TryPage({ searchParams }: PageProps<"/try">) {
  const query = await searchParams;
  const lang = pickLang(query.lang);
  const refCode = pickRef(query.r);
  const t = demoText(lang);

  const { supabase, user } = await currentUser();
  if (user?.is_anonymous) {
    const profile = await loadProfile(supabase, user.id);
    if (profile?.demo) redirect("/"); // back to their demo
  }
  const realAccount = Boolean(user && !user.is_anonymous);

  return (
    <div lang={lang}>
      <Card
        label={t.title}
        footer={
          realAccount ? undefined : (
            <>
              {t.haveAccount} <Link href="/login">{t.login}</Link>
            </>
          )
        }
      >
        <LangSwitch lang={lang} refCode={refCode} />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[30px] leading-[1.12] sm:text-[36px]">{t.title}</h1>
          <p className="text-lg leading-[1.5]">{t.lead}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{t.youWillSee}</p>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            {t.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        {realAccount ? (
          <div className="flex flex-col gap-3">
            <p className="bg-tab-yellow px-4 py-3">{t.signedIn}</p>
            <PaperLink href="/">{t.toApp}</PaperLink>
          </div>
        ) : (
          <TryForm lang={lang} refCode={refCode} />
        )}
        <p className="text-base text-muted">{t.fine}</p>
      </Card>
    </div>
  );
}
