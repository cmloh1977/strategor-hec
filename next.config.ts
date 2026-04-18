import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
