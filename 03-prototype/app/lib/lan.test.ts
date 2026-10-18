import { describe, expect, it } from "vitest";

import { hostAllowed } from "@/app/lib/lan";

const wifi = { lan: true, addresses: ["192.168.1.20"] };

describe("hostAllowed", () => {
  it("always allows this Mac, with no origin or its own origin", () => {
    for (const patientRoute of [true, false]) {
      expect(hostAllowed("localhost:3000", null, { patientRoute, lan: false, addresses: [] })).toBe(true);
      expect(hostAllowed("127.0.0.1:3000", "http://127.0.0.1:3000", { patientRoute, lan: false, addresses: [] })).toBe(true);
    }
  });

  it("lets a phone on the Wi-Fi reach patient routes only, and only in same-Wi-Fi mode", () => {
    expect(hostAllowed("192.168.1.20:3000", "http://192.168.1.20:3000", { patientRoute: true, ...wifi })).toBe(true);
    expect(hostAllowed("192.168.1.20:3000", null, { patientRoute: false, ...wifi })).toBe(false); // recording, generating, board
    expect(hostAllowed("192.168.1.20:3000", null, { patientRoute: true, lan: false, addresses: ["192.168.1.20"] })).toBe(false);
  });

  it("blocks other hosts (DNS rebinding) and other websites", () => {
    expect(hostAllowed("evil.com", null, { patientRoute: true, ...wifi })).toBe(false);
    expect(hostAllowed("192.168.1.99:3000", null, { patientRoute: true, ...wifi })).toBe(false); // not this Mac
    expect(hostAllowed("localhost:3000", "http://evil.com", { patientRoute: false, lan: false, addresses: [] })).toBe(false);
    expect(hostAllowed("192.168.1.20:3000", "http://evil.com", { patientRoute: true, ...wifi })).toBe(false);
  });
});
