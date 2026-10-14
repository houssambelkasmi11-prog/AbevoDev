import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // `npm run fast` builds into its own folder so it never fights with `npm run dev`.
  distDir: process.env.ORBIT_DIST || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Linting is optional for this project; type-checking still runs on build.
  eslint: { ignoreDuringBuilds: true },
  // The one-click launcher (`npm run fast`) never refuses to start over a type
  // error — just like dev mode. `npm run build` / `npm run typecheck` still check.
  typescript: { ignoreBuildErrors: process.env.ORBIT_FAST === "1" },
  // Server-only document parsers stay out of the client bundle.
  serverExternalPackages: ["mammoth", "unpdf", "pdf-lib", "docx"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    // Tree-shake big barrel packages so pages ship (and compile) far less JS.
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@xyflow/react",
      "@react-three/drei",
    ],
    // Keep recently visited workspace pages in the client router cache so
    // back/forward and tab switching feel instant (server actions still
    // invalidate the cache whenever data changes).
    staleTimes: { dynamic: 20, static: 300 },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
