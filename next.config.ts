import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Isso libera imagens de qualquer lugar (Instagram, Facebook, etc)
      },
    ],
  },
};

export default nextConfig;