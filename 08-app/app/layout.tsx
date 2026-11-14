import type { Metadata } from "next";
import { Cousine, GFS_Didot, Literata } from "next/font/google";

import "./globals.css";

// Three faces for the paper look, all with full Greek, self-hosted by Next (the visitor's browser
// never calls Google). globals.css picks them up through these CSS variables.
const didot = GFS_Didot({ subsets: ["greek", "latin"], weight: "400", variable: "--font-didot" }); // headings
const literata = Literata({ subsets: ["greek", "latin"], style: ["normal", "italic"], variable: "--font-literata" }); // text
const cousine = Cousine({ subsets: ["greek", "latin"], weight: ["400", "700"], variable: "--font-cousine" }); // typed answers

export const metadata: Metadata = {
  title: { template: "%s · PhysioPath", default: "PhysioPath" },
  description: "Από τη φωνητική σημείωση του φυσιοθεραπευτή σε πρόγραμμα ασκήσεων για τον ασθενή.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (ad blockers, privacy filters) add their own
    // attributes to <html> before React starts. This ignores extra attributes on this one tag only;
    // real mismatches anywhere inside the page are still reported.
    <html lang="el" className={`${didot.variable} ${literata.variable} ${cousine.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/* Hidden until a keyboard user presses Tab: jumps past the tabs straight to the form. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-sheet focus:px-4 focus:py-3 focus:font-semibold"
        >
          Μετάβαση στο περιεχόμενο
        </a>
        {children}
      </body>
    </html>
  );
}
