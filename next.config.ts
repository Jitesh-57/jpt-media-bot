import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from PixelBin CDN
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.pixelbin.io" },
      { protocol: "https", hostname: "*.pixelbin.io" },
    ],
  },
  // Increase body size limit for media files
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
