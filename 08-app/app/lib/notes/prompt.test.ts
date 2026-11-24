// The template mode of the prompt: the rules stay, and the template is the one extra source.
import { describe, expect, it } from "vitest";

import { tidyTemplates, userMessage } from "@/app/lib/notes/generate";
import { systemPrompt } from "@/app/lib/notes/prompt";

describe("systemPrompt", () => {
  it("template mode keeps every rule and adds the template rules", () => {
    const usual = systemPrompt("el");
    const template = systemPrompt("el", "template");
    expect(template.startsWith(usual)).toBe(true);
    expect(template).toContain("Start from the template exactly");
    expect(template).toContain("Add nothing that is in neither the template nor the transcript");
    expect(usual).not.toContain("<template>");
    expect(systemPrompt("el", "note")).not.toContain("Start from the template");
  });

  it("templates mode («Πείτε τα πρότυπά σας») has its own prompt: only what was said, no patient, no note", () => {
    const templates = systemPrompt("el", "templates");
    expect(templates).toContain("Use only information that is in the transcript");
    expect(templates).toContain("Never add a template the physio did not describe");
    expect(templates).toContain("patient_first_name and next_appointment are always null");
    expect(templates).toContain("At most 10 templates");
    expect(templates).not.toContain("GeSY");
    expect(systemPrompt("en", "templates")).toBe(templates); // templates are for patients: always Greek
  });
});

describe("tidyTemplates", () => {
  const program = { title: "Γόνατο", patient_first_name: "Γιώργος", next_appointment: "Πέμπτη", exercises: [], after_exercises: [], avoid: [], contact_if: [], other: [] };
  const one = (i: number) => ({ name: `Πρότυπο ${i}`, area: null, program, questions: [] });

  it("never a patient, at most 10 templates, and a line saying the rest were left out", () => {
    const few = tidyTemplates({ templates: [one(1)], missing_or_unclear: [] });
    expect(few.templates[0].program).toMatchObject({ patient_first_name: null, next_appointment: null });
    expect(few.missing_or_unclear).toEqual([]);
    const many = tidyTemplates({ templates: Array.from({ length: 12 }, (_, i) => one(i + 1)), missing_or_unclear: ["Α;"] });
    expect(many.templates.map((t) => t.name).at(-1)).toBe("Πρότυπο 10");
    expect(many.templates).toHaveLength(10);
    expect(many.missing_or_unclear).toEqual(["Α;", "Κρατήσαμε τα πρώτα 10 πρότυπα. Πείτε τα υπόλοιπα σε νέα υπαγόρευση."]);
  });
});

describe("userMessage", () => {
  it("the transcript alone, or the template (as JSON) before it", () => {
    expect(userMessage("Γέφυρα 3x10")).toBe("<transcript>\nΓέφυρα 3x10\n</transcript>");
    const program = { title: "Γόνατο", patient_first_name: null, next_appointment: null, exercises: [], after_exercises: [], avoid: [], contact_if: [], other: [] };
    const message = userMessage("Χωρίς αλλαγές", { name: "Γόνατο «ACL»", program });
    expect(message).toMatch(/^<template>\n\{"name":"Γόνατο «ACL»","program":\{"title":"Γόνατο"/);
    expect(message.endsWith("<transcript>\nΧωρίς αλλαγές\n</transcript>")).toBe(true);
  });
});
