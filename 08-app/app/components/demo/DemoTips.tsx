// «Δοκιμάστε»: three things to try, on the board of a demo clinic only. When the board is empty (the demo
// cards are from more than 12 hours ago, or the visitor pressed «Τέλος» on all of them), a button puts
// the demo patients back.
import { QuietSubmit } from "@/app/components/paper/Buttons";
import { refillDemo } from "@/app/lib/demo/actions";
import { demoText, type DemoLang } from "@/app/lib/demo/text";

export function DemoTips({ lang, empty }: { lang: DemoLang; empty: boolean }) {
  const t = demoText(lang);
  return (
    <section aria-labelledby="demo-tips" lang={lang} className="flex max-w-[720px] flex-col gap-2 border-2 border-action bg-white px-4 py-3">
      <h2 id="demo-tips" className="text-[19px] font-bold">
        {t.tipsTitle}
      </h2>
      <ol className="flex list-decimal flex-col gap-1.5 pl-6">
        {t.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ol>
      {empty && (
        <form action={refillDemo} className="flex flex-wrap items-center gap-x-3">
          <span className="font-semibold">{t.emptyBoard}</span>
          <QuietSubmit pending={t.refilling}>{t.refill}</QuietSubmit>
        </form>
      )}
    </section>
  );
}
