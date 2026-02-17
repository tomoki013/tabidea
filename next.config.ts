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
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/shiori/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://tabide.ai https://www.tabide.ai" },
        ],
      },
    ];
  },
};

export default nextConfig;
