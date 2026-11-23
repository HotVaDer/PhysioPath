// The thin yellow strip on top of every page of a demo clinic («Δοκιμάστε το»): that this is a demo with
// fictional patients, when it is deleted, and the way out to a clinic of their own.
import { SubmitButton } from "@/app/components/paper/Buttons";
import { leaveDemo } from "@/app/lib/demo/actions";
import { daysLeft, demoText, type DemoLang } from "@/app/lib/demo/text";

export function DemoStrip({ demo }: { demo: { expiresAt: string; lang: DemoLang } }) {
  const t = demoText(demo.lang);
  return (
    <aside aria-label={t.stripTitle} lang={demo.lang} className="border-b-2 border-hairline bg-tab-yellow">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <p className="flex-[1_1_280px]">
          <span className="font-semibold">{t.stripTitle}</span> · {t.stripText(daysLeft(demo.expiresAt))}
          {t.stripAppInGreek && <span className="block text-base text-muted">{t.stripAppInGreek}</span>}
        </p>
        {/* Leaving ends the demo (the visitor's login is signed out): say so before they press. */}
        <form action={leaveDemo} className="flex max-w-[360px] flex-col gap-1">
          <SubmitButton pending={t.leaving}>
            {t.own} <span aria-hidden="true">→</span>
          </SubmitButton>
          <span className="text-base text-muted">{t.ownNote}</span>
        </form>
      </div>
    </aside>
  );
}
