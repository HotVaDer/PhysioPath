// Shown for any address that doesn't exist, e.g. an old or mistyped patient link.
export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-24">
      <p className="label-mono text-muted">Σφάλμα 404</p>
      <h1 className="mt-3 text-5xl leading-[0.95] font-extrabold tracking-tight italic">
        Η σελίδα δεν βρέθηκε
        <span aria-hidden="true" className="text-primary">
          .
        </span>
      </h1>
      <p className="mt-4 text-lg text-muted">Ο σύνδεσμος μπορεί να είναι λάθος ή το πρόγραμμα να μην υπάρχει πια.</p>
    </main>
  );
}
