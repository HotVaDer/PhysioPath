import type { NextConfig } from "next";

import { lanAddresses, lanEnabled } from "./app/lib/lan";

const nextConfig: NextConfig = {
  // TypeScript checks every <Link href="..."> points to a page that exists.
  typedRoutes: true,
  // Don't advertise "x-powered-by: Next.js" to every visitor.
  poweredByHeader: false,
  // Same-Wi-Fi mode (npm run dev:lan): let phones on the Wi-Fi load the dev server's files through
  // this Mac's own address. Off by default; what they may open is limited in proxy.ts and http.ts.
  ...(lanEnabled() && { allowedDevOrigins: lanAddresses() }),
};

export default nextConfig;
