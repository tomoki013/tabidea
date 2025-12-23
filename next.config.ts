import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  basePath: "/ai-travel-planner",
  // trailingSlash: true, // Removed to prevent redirect loops
  experimental: {
    serverActions: {
      allowedOrigins: ['travel.tomokichidiary.com'], // 独自ドメインを許可
    },
  },
};

export default nextConfig;
