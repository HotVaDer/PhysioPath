// Same-Wi-Fi mode, so a patient's phone can open their session screen on this Mac.
// Off unless the server was started with `npm run dev:lan` (PHYSIOPATH_LAN=1). Even then, only
// patient pages and patient actions are reachable from the Wi-Fi; everything else stays on this Mac.
// Server code and next.config.ts only (uses node:os); no "server-only" so next.config can import it.
import os from "node:os";

export const lanEnabled = () => process.env.PHYSIOPATH_LAN === "1";

const isPrivateIPv4 = (ip: string) => /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip);

// This Mac's own addresses on the local network (e.g. 192.168.1.20).
export function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal && isPrivateIPv4(net.address))
    .map((net) => net!.address);
}

// The link to a patient's session screen, for the QR code. In same-Wi-Fi mode it uses this Mac's
// Wi-Fi address so a phone can open it; otherwise it only works on this Mac.
export function patientUrl(id: string): { url: string; reachableFromPhones: boolean } {
  const port = process.env.PORT || "3000";
  const address = lanEnabled() ? lanAddresses().at(0) : undefined;
  return address
    ? { url: `http://${address}:${port}/s/${id}`, reachableFromPhones: true }
    : { url: `http://localhost:${port}/s/${id}`, reachableFromPhones: false };
}

export const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];
export const hostnameOf = (host: string) => host.replace(/:\d+$/, "");

// The request guard, as a pure function so it can be tested. A request is allowed when its Host is
// this Mac (localhost), or, for patient routes in same-Wi-Fi mode, this Mac's own Wi-Fi address.
// Checking Host blocks DNS rebinding; checking Origin blocks other websites posting to us.
export function hostAllowed(
  host: string,
  origin: string | null,
  { patientRoute, lan, addresses }: { patientRoute: boolean; lan: boolean; addresses: string[] },
): boolean {
  const hostname = hostnameOf(host);
  const local = LOCAL_HOSTNAMES.includes(hostname);
  const fromWifi = patientRoute && lan && addresses.includes(hostname);
  if (!local && !fromWifi) return false;
  return !origin || origin === `http://${host}`;
}
