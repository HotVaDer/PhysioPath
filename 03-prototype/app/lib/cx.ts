// Joins class names and skips empty ones: cx("btn", isBig && "btn-lg") → "btn btn-lg" or "btn".
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
