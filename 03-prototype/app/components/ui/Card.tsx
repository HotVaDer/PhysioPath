// One part of a page, laid out like the portfolio's sections: no box, just a hairline on top and a
// section label ("S1 · SECTOR 1"): an optional orange tag, then the title in mono capitals.
// With a title it becomes a named region, so screen-reader users can jump between sections.
// The page picks the heading level, to keep the heading order right.
import { useId, type ComponentProps, type ReactNode } from "react";

import { cx } from "@/app/lib/cx";

type CardProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  tag?: string; // short code before the title, e.g. "01"
  headingLevel?: 2 | 3 | 4;
};

export function Card({ title, tag, headingLevel = 2, className, children, ...props }: CardProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <section aria-labelledby={title ? headingId : undefined} className={cx("border-t border-border pt-5", className)} {...props}>
      {title && (
        <Heading id={headingId} className="label-mono mb-5 flex items-center gap-3 text-muted">
          {tag && (
            <>
              <span className="rounded-xs bg-primary px-2 py-0.5 text-on-primary">{tag}</span>{" "}
            </>
          )}
          {title}
        </Heading>
      )}
      {children}
    </section>
  );
}
