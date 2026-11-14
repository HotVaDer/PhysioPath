import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript checks every <Link href="..."> points to a page that exists.
  typedRoutes: true,
  // Don't advertise "x-powered-by: Next.js" to every visitor.
  poweredByHeader: false,
};

export default nextConfig;
