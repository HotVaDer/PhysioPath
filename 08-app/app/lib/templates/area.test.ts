import { describe, expect, it } from "vitest";

import { areaFromBodyArea, groupTemplates, key, matchesSearch, sameArea, type FindableTemplate } from "@/app/lib/templates/area";

const t = (name: string, area: string | null, uses = 0): FindableTemplate => ({ id: name, name, area, uses });

describe("key", () => {
  it("no accents, capitals, final ς or punctuation", () => {
    expect(key("  Γόνατο – ΑΡΙΣΤΕΡΌΣ! ")).toBe("γονατο αριστεροσ");
    expect(key("Οσφυϊκή μοίρα")).toBe("οσφυικη μοιρα");
  });
});

describe("areaFromBodyArea", () => {
  it("drops the side and keeps the rest as written, with a capital", () => {
    expect(areaFromBodyArea("Αριστερό γόνατο")).toBe("Γόνατο");
    expect(areaFromBodyArea("δεξιός ώμος")).toBe("Ώμος");
    expect(areaFromBodyArea("Left knee")).toBe("Knee");
    expect(areaFromBodyArea("Οσφυϊκή μοίρα")).toBe("Οσφυϊκή μοίρα");
    expect(areaFromBodyArea("Δεξιά ποδοκνημική")).toBe("Ποδοκνημική");
  });

  it("nothing left (or nothing written) → null", () => {
    expect(areaFromBodyArea("Αριστερό")).toBeNull();
    expect(areaFromBodyArea("  ")).toBeNull();
    expect(areaFromBodyArea(null)).toBeNull();
  });
});

describe("sameArea", () => {
  it("the side, accents and capitals don't count", () => {
    expect(sameArea("Γόνατο", "Αριστερό γόνατο")).toBe(true);
    expect(sameArea("ΩΜΟΣ", "δεξιός ώμος")).toBe(true);
    expect(sameArea("Knee", "Left knee")).toBe(true);
  });

  it("one area inside the other, as whole words", () => {
    expect(sameArea("Γόνατο", "Οπίσθιο γόνατο")).toBe(true);
    expect(sameArea("Ώμος", "Ωμοπλάτη")).toBe(false);
  });

  it("different areas, or nothing to compare", () => {
    expect(sameArea("Γόνατο", "Ώμος")).toBe(false);
    expect(sameArea(null, "Γόνατο")).toBe(false);
    expect(sameArea("Αριστερό", "Αριστερό")).toBe(false);
  });
});

describe("matchesSearch", () => {
  const acl = t("Γόνατο μετά ACL – εβδ. 1–2", "Γόνατο");
  it("each word typed starts a word of the name or the area, without accents", () => {
    expect(matchesSearch(acl, "γον")).toBe(true);
    expect(matchesSearch(acl, "acl")).toBe(true);
    expect(matchesSearch(acl, "γονατο acl")).toBe(true);
    expect(matchesSearch(acl, "ωμ")).toBe(false);
    expect(matchesSearch(acl, "")).toBe(true);
    expect(matchesSearch(t("Ενδυνάμωση", "Ώμος"), "ωμο")).toBe(true); // the area counts too
  });
});

describe("groupTemplates", () => {
  const list = [
    t("Ώμος – κινητικότητα", "Ώμος", 2),
    t("Γόνατο – ενδυνάμωση", "Γόνατο", 5),
    t("Γόνατο μετά ACL", "Γόνατο", 12),
    t("Γενικό πρόγραμμα", null),
    t("Μέση – σταθεροποίηση", "Μέση"),
  ];

  it("«Προτεινόμενα» for the patient's area (most used first), and every template still in its group", () => {
    const { suggested, groups } = groupTemplates(list, "", "Αριστερό γόνατο");
    expect(suggested?.area).toBe("Γόνατο");
    expect(suggested?.templates.map((x) => x.name)).toEqual(["Γόνατο μετά ACL", "Γόνατο – ενδυνάμωση"]);
    expect(groups.map((g) => g.area)).toEqual(["Γόνατο", "Μέση", "Ώμος", null]);
    expect(groups.flatMap((g) => g.templates)).toHaveLength(5);
  });

  it("no area from a note (a new patient): no «Προτεινόμενα»", () => {
    expect(groupTemplates(list, "", null).suggested).toBeNull();
    expect(groupTemplates(list, "", "Αγκώνας").suggested).toBeNull(); // no template for it
  });

  it("the search narrows both", () => {
    const { suggested, groups } = groupTemplates(list, "acl", "Γόνατο");
    expect(suggested?.templates.map((x) => x.name)).toEqual(["Γόνατο μετά ACL"]);
    expect(groups.flatMap((g) => g.templates.map((x) => x.name))).toEqual(["Γόνατο μετά ACL"]);
  });
});
