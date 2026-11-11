import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

import "./globals.css";

// Source Sans 3: one calm, very legible family with full Greek, self-hosted (no requests to Google
// from the user's browser). Only the weights the design uses. globals.css picks it up via the CSS variable.
const sourceSans = Source_Sans_3({ subsets: ["latin", "greek"], weight: ["400", "600", "700"], variable: "--font-source-sans" });

// Browser tab title. Each page sets its own name, e.g. "Έλεγχος · PhysioPath".
export const metadata: Metadata = {
  title: { template: "%s · PhysioPath", default: "PhysioPath" },
  description: "Από τη φωνητική σημείωση του φυσιοθεραπευτή σε πρόγραμμα ασκήσεων για τον ασθενή.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the patient page sets the text size on <html> before React starts (see app/p/[id]).
    <html lang="el" className={sourceSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* Hidden until a keyboard user presses Tab: lets them jump past the header straight to the content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold"
        >
          Μετάβαση στο περιεχόμενο
        </a>
        {children}
      </body>
    </html>
  );
}
