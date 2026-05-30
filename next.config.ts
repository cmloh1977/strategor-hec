import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "pptxgenjs"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
