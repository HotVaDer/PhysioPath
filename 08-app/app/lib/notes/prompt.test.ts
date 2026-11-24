// The template mode of the prompt: the rules stay, and the template is the one extra source.
import { describe, expect, it } from "vitest";

import { userMessage } from "@/app/lib/notes/generate";
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
