import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Linting is optional for this project; type-checking still runs on build.
  eslint: { ignoreDuringBuilds: true },
  // Server-only document parsers stay out of the client bundle.
  serverExternalPackages: ["mammoth", "unpdf", "pdf-lib", "docx"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
