import type { NextConfig } from "next";
import crypto from "crypto";

const nextConfig: NextConfig = {
  // 開発時のServer Actions許可オリジン（403エラー対策）
  allowedDevOrigins: [
    "tabide.ai",
    "www.tabide.ai",
  ],

  // ビルドIDの一貫性を確保（チャンクロードエラー対策）
  generateBuildId: async () => {
    return crypto.randomUUID();
  },



  async headers() {
    return [
      {
        source: '/shiori/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://blog.tabide.ai https://*.tabide.ai",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
