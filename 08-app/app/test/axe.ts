// Accessibility check for tests: runs axe on what a test rendered and fails on any problem,
// listing each rule and the HTML it found it in.
// Colour contrast is skipped because jsdom has no real colours; the tokens in globals.css are checked by hand.
import axe from "axe-core";
import { expect } from "vitest";

export async function expectNoA11yViolations(container: Element) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  const problems = results.violations.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`);
  expect(problems).toEqual([]);
}
