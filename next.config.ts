import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com", // 先頭に *. をつけることで全て許可されます
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
