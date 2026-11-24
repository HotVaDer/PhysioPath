// The thin yellow strip on top of every page of a demo clinic («Δοκιμάστε το»): that this is a demo with
// fictional patients, when it is deleted, what is left of its 5 programs and 5 recordings, and a small way
// out to a clinic of their own (the big one is at the end of the guided tour). It stays short on a phone.
import { cx } from "@/app/lib/cx";
import { leaveDemo } from "@/app/lib/demo/actions";
import type { DemoLeft } from "@/app/lib/demo/left";
import { daysLeft, demoText, type DemoLang } from "@/app/lib/demo/text";

export function DemoStrip({ demo }: { demo: { expiresAt: string; lang: DemoLang; left?: DemoLeft | null } }) {
  const t = demoText(demo.lang);
  const left = demo.left;
  const out = left ? left.generate <= 0 || left.transcribe <= 0 : false;
  return (
    <aside aria-label={t.stripTitle} lang={demo.lang} className="border-b-2 border-hairline bg-tab-yellow text-[17px]">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2 sm:px-6">
        <p className="flex-[1_1_220px]">
          <span className="font-semibold">{t.stripTitle}</span> · {t.stripText(daysLeft(demo.expiresAt))}
          {left && (
            <>
              {" · "}
              <span className={cx("font-semibold", out && "bg-tab-pink px-1.5")}>
                {t.stripLeft(Math.max(0, left.generate), Math.max(0, left.transcribe), left.of)}
              </span>
            </>
          )}
          {t.stripAppInGreek && <span className="text-muted"> · {t.stripAppInGreek}</span>}
        </p>
        {/* Leaving ends the demo (the visitor is signed out): the button's title says so. */}
        <form action={leaveDemo}>
          <button
            type="submit"
            title={t.ownNote}
            className="min-h-11 cursor-pointer whitespace-nowrap bg-action px-4 font-bold text-white hover:bg-action-hover"
          >
            {t.own} <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
