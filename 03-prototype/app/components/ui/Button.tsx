// The only button in the app, so every button is big enough, has a focus ring and shows text.
// Button is for actions; ButtonLink looks the same but goes to a page.
// Look: pills; bed teal for the one main action, an outline for everything else.
import type { Route } from "next";
import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

import { ExternalIcon } from "@/app/components/ui/icons";
import { SpinnerRing } from "@/app/components/ui/Spinner";
import { cx } from "@/app/lib/cx";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "inverse" | "inverse-outline";
type Size = "md" | "lg" | "xl";

type Look = {
  variant?: Variant; // primary: the one main action on a page
  size?: Size;
  icon?: ReactNode; // shown before the text, never instead of it
};

const VARIANTS: Record<Variant, string> = {
  primary: "border-2 border-primary bg-primary text-on-primary hover:border-primary-hover hover:bg-primary-hover",
  secondary: "border-2 border-border-strong bg-surface text-foreground hover:border-foreground hover:bg-surface-muted",
  outline: "border-2 border-primary bg-surface text-primary-text hover:bg-success-bg", // a strong second action: undo, start a hold
  ghost: "text-primary-text underline decoration-1 underline-offset-4 hover:decoration-2",
  danger: "border-2 border-danger bg-surface text-danger hover:bg-danger-bg",
  // On a filled alarm card (room board): the card sets --card-bg and --card-fg, the buttons swap them.
  inverse: "border-2 border-(--card-fg) bg-(--card-fg) text-(--card-bg) hover:opacity-90",
  "inverse-outline": "border-2 border-(--card-fg) bg-transparent text-(--card-fg) hover:bg-(--card-fg)/10",
};

// At our 18px text size min-h-11 is 49.5px, above the 48px the design asks for (and WCAG 2.2 AAA's 44px).
// lg is for the one main action on a page; xl for the record button and the patient page.
const SIZES: Record<Size, string> = {
  md: "min-h-11 px-5 text-base",
  lg: "min-h-12 px-6 text-base",
  xl: "min-h-15 px-4 text-[1.05rem]", // 21px on the patient pages, where it has to fit a 390px phone
};

// Disabled buttons get a dashed outline and muted (still readable) text instead of fading out.
function buttonClasses({ variant = "secondary", size = "md" }: Look, className?: string) {
  return cx(
    "inline-flex min-w-11 items-center justify-center gap-2 rounded-full font-bold transition",
    "disabled:cursor-not-allowed disabled:border-2 disabled:border-dashed disabled:border-border-strong disabled:bg-transparent disabled:text-muted disabled:no-underline",
    "aria-busy:cursor-wait",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> &
  Look & {
    children: ReactNode; // the visible text
    loading?: boolean; // shows a spinner, keeps the text, and ignores clicks
  };

export function Button({ variant, size, icon, loading = false, type = "button", className, onClick, children, ...props }: ButtonProps) {
  // While loading the button stays focusable (no `disabled`), so keyboard users don't lose their place.
  const handleClick = loading ? (event: MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick;
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size }, className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      {...props}
    >
      {loading ? <SpinnerRing /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<"a">, "href"> &
  Look & {
    href: Route;
    children: ReactNode;
    newTab?: boolean; // opens in a new tab and says so, in words and with an icon
    reloadDocument?: boolean; // a full page load instead of an in-app move (patient pages set their text size before drawing)
  };

export function ButtonLink({ variant, size, icon, href, newTab = false, reloadDocument = false, className, children, ...props }: ButtonLinkProps) {
  const linkProps = {
    href,
    className: buttonClasses({ variant, size }, className),
    ...(newTab && { target: "_blank", rel: "noopener noreferrer" }),
    ...props,
  };
  const content = (
    <>
      {icon}
      {children}
      {newTab && (
        <>
          <ExternalIcon size={18} />
          {/* The space sits outside the span: screen readers drop spaces at the edge of an element. */}{" "}
          <span className="sr-only">(ανοίγει σε νέα καρτέλα)</span>
        </>
      )}
    </>
  );
  return reloadDocument ? <a {...linkProps}>{content}</a> : <Link {...linkProps}>{content}</Link>;
}
