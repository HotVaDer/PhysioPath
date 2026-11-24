// «Πρότυπα» (owner and physio): the clinic's library of templates, programs a physio approved and saved
// under a name («Αποθήκευση ως πρότυπο» on the approved-program page), with a body area. Each one opens to
// show its exercises, its name and area to change, and «Αρχειοθέτηση». A template never holds a patient (the database clears the name
// and the appointment). Starting a new program from a template comes in a later step.
// Assistants go home, like «Ασθενείς».
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/app/components/paper/Buttons";
import { ConfirmSubmit } from "@/app/components/paper/ConfirmSubmit";
import { LineField } from "@/app/components/paper/LineField";
import { FormAlert } from "@/app/components/paper/Notes";
import { StaffSheet } from "@/app/components/paper/StaffSheet";
import { TabName } from "@/app/components/paper/TabLink";
import { doseLines, isBlank } from "@/app/lib/notes/format";
import { requireMember } from "@/app/lib/onboarding/session";
import { WORK_TAB } from "@/app/lib/tabs";
import { archiveTemplate, updateTemplate } from "@/app/lib/templates/actions";
import { loadTemplates, TEMPLATE_AREA_MAX, TEMPLATE_NAME_MAX, type Template, type TemplateResult } from "@/app/lib/templates/load";

export const metadata: Metadata = { title: "Πρότυπα" };

const day = new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Nicosia" });

const DONE: Partial<Record<TemplateResult, { text: string; ok: boolean }>> = {
  renamed: { text: "Οι αλλαγές αποθηκεύτηκαν.", ok: true },
  archived: { text: "Το πρότυπο βγήκε από τη λίστα.", ok: true },
  failed: { text: "Δεν έγινε η αλλαγή. Δοκιμάστε ξανά σε λίγο.", ok: false },
};

export default async function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  const { supabase, profile } = await requireMember();
  if (profile.role === "assistant") redirect("/");
  const query = await searchParams;
  const done = typeof query.done === "string" ? (query.done as TemplateResult) : null;
  const open = typeof query.open === "string" ? query.open : null;
  const templates = await loadTemplates(supabase);
  const message = done && !open ? DONE[done] : undefined;

  return (
    <StaffSheet profile={profile} current="templates">
      <TabName name={WORK_TAB} />
      <div className="flex flex-col gap-6">
        <div className="flex max-w-[640px] flex-col gap-1">
          <h1 className="font-display text-[36px] leading-[1.05] sm:text-[40px]">Πρότυπα</h1>
          <p className="text-muted">
            Τα προγράμματα της κλινικής σας, για να τα ξαναχρησιμοποιείτε. Ένα εγκεκριμένο πρόγραμμα γίνεται πρότυπο με «Αποθήκευση ως
            πρότυπο».
          </p>
        </div>

        {message &&
          (message.ok ? (
            <p role="status" className="self-start bg-note-green px-4 py-3 font-semibold">
              {message.text}
            </p>
          ) : (
            <FormAlert>{message.text}</FormAlert>
          ))}

        {templates.length === 0 ? (
          <p className="bg-tab-yellow px-4 py-3">
            Δεν έχετε ακόμα πρότυπα. Αποθηκεύστε ένα εγκεκριμένο πρόγραμμα ως πρότυπο: μετά την <Link href="/notes/new">Νέα συνεδρία</Link>,
            στη σελίδα «Εγκρίθηκε».
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {templates.map((template) => (
              <li key={template.id}>
                <TemplateCard
                  template={template}
                  clinicId={profile.clinic_id ?? ""}
                  open={open === template.id}
                  result={open === template.id ? done : null}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </StaffSheet>
  );
}

const exerciseCount = (n: number) => (n === 1 ? "1 άσκηση" : `${n} ασκήσεις`);

// One template: closed, its name and size; open, the exercises and the two actions.
function TemplateCard({
  template,
  clinicId,
  open,
  result,
}: {
  template: Template;
  clinicId: string;
  open: boolean;
  result: TemplateResult | null;
}) {
  const { program } = template;
  const nameId = `name-${template.id}`;
  return (
    <details id={`t-${template.id}`} open={open} className="group rounded-md border-2 border-line bg-white open:border-action">
      <summary className="flex min-h-[68px] cursor-pointer flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
        <span className="flex min-w-0 flex-[1_1_240px] flex-col">
          <span className="text-[20px] font-semibold">{template.name}</span>
          <span className="text-muted">
            {template.area ? `${template.area} · ` : ""}
            {exerciseCount(program.exercises.length)}
            {template.uses > 0 ? ` · χρησιμοποιήθηκε ${template.uses === 1 ? "1 φορά" : `${template.uses} φορές`}` : ""} · αποθηκεύτηκε
            στις {day.format(new Date(template.createdAt))}
          </span>
        </span>
        <span aria-hidden="true" className="ml-auto text-2xl text-action group-open:rotate-90">
          →
        </span>
      </summary>

      <div className="flex flex-col gap-5 border-t-2 border-hairline px-4 pb-5 pt-4">
        {result === "renamed" && (
          <p role="status" className="self-start bg-note-green px-4 py-3 font-semibold">
            Οι αλλαγές αποθηκεύτηκαν.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-[19px] font-bold">{program.title}</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-6">
            {program.exercises.map((exercise, i) => (
              <li key={i}>
                <span className="font-semibold">{exercise.name}</span>
                {doseLines(exercise).length > 0 && <span className="text-muted"> · {doseLines(exercise).join(" · ")}</span>}
                {!isBlank(exercise.notes) && <span className="block text-base">{exercise.notes}</span>}
              </li>
            ))}
          </ol>
          <Extra title="Μετά τις ασκήσεις" items={program.after_exercises} />
          <Extra title="Να αποφεύγει" items={program.avoid} />
          <Extra title="Επικοινωνία αν" items={program.contact_if} />
          <Extra title="Άλλες οδηγίες" items={program.other} />
        </div>

        <form action={updateTemplate} className="flex flex-col gap-3">
          <input type="hidden" name="clinicId" value={clinicId} />
          <input type="hidden" name="templateId" value={template.id} />
          <LineField
            id={nameId}
            name="name"
            label="Όνομα"
            defaultValue={template.name}
            required
            maxLength={TEMPLATE_NAME_MAX}
            error={
              result === "taken"
                ? "Υπάρχει ήδη πρότυπο με αυτό το όνομα. Δώστε άλλο όνομα."
                : result === "badname"
                  ? `Γράψτε ένα όνομα, έως ${TEMPLATE_NAME_MAX} χαρακτήρες.`
                  : undefined
            }
          />
          <LineField
            id={`area-${template.id}`}
            name="area"
            label="Περιοχή"
            hint="Π.χ. «Γόνατο». Τα πρότυπα της ίδιας περιοχής εμφανίζονται μαζί στη νέα συνεδρία."
            defaultValue={template.area ?? ""}
            maxLength={TEMPLATE_AREA_MAX}
            width="max-w-[320px]"
            error={result === "badarea" ? `Έως ${TEMPLATE_AREA_MAX} χαρακτήρες.` : undefined}
          />
          {result === "failed" && <FormAlert>Δεν έγινε η αλλαγή. Δοκιμάστε ξανά σε λίγο.</FormAlert>}
          <SubmitButton pending="Αποθήκευση…">Αποθήκευση αλλαγών</SubmitButton>
        </form>

        <form action={archiveTemplate} className="flex flex-col gap-1">
          <input type="hidden" name="clinicId" value={clinicId} />
          <input type="hidden" name="templateId" value={template.id} />
          <ConfirmSubmit question={`Να βγει το πρότυπο «${template.name}» από τη λίστα;`} pending="Αρχειοθέτηση…">
            Αρχειοθέτηση
          </ConfirmSubmit>
          <span className="text-base text-muted">Τα προγράμματα που δώσατε ήδη στους ασθενείς δεν αλλάζουν.</span>
        </form>
      </div>
    </details>
  );
}

function Extra({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="list-disc pl-6">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
