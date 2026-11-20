// Shown on «Ηχογράφηση» and «Έλεγχος και έγκριση» when the text changed after the program (or the
// note) was made from it (isStale in app/lib/notes/draft.ts). «Έγκριση» waits until the physio chooses.
import Link from "next/link";

// The text changed after the program was made: make it again from the new text, or keep the one there is.
export function StaleNotice({ same, onNew, onKeep }: { same: boolean; onNew?: () => void; onKeep: () => void }) {
  const what = same ? "η σημείωση" : "το πρόγραμμα";
  return (
    <div role="alert" className="flex flex-col gap-3 bg-tab-yellow px-4 py-3">
      <p>
        <strong>Το κείμενο άλλαξε από τότε που φτιάχτηκε {what}.</strong> Ό,τι αλλάξατε στο κείμενο δεν είναι μέσα. Φτιάξτε {same ? "νέα σημείωση" : "νέο πρόγραμμα"}, ή κρατήστε {same ? "αυτή" : "αυτό"} αν ταιριάζει ακόμα.
      </p>
      <div className="flex flex-wrap gap-3">
        {onNew ? (
          <button type="button" onClick={onNew} className="inline-flex min-h-12 cursor-pointer items-center bg-action px-4 font-bold text-white hover:bg-action-hover">
            {same ? "Νέα σημείωση" : "Νέο πρόγραμμα"}
          </button>
        ) : (
          <Link href="/notes/record" className="inline-flex min-h-12 items-center bg-action px-4 font-bold text-white no-underline hover:bg-action-hover">
            {same ? "Νέα σημείωση" : "Νέο πρόγραμμα"} από το νέο κείμενο
          </Link>
        )}
        <button type="button" onClick={onKeep} className="inline-flex min-h-12 cursor-pointer items-center border-2 border-ink bg-white px-4 font-bold text-ink">
          Κράτα {same ? "αυτή" : "αυτό"}
        </button>
      </div>
    </div>
  );
}
