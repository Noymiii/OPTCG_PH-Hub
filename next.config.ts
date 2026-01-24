import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'en.onepiece-cardgame.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'cdn.yuyu-tei.jp',
      },
      {
        protocol: 'https',
        hostname: 'card.yuyu-tei.jp',
      },
      {
        protocol: 'https',
        hostname: 'yuyu-tei.jp',
      },
    ],
  },
};

export default nextConfig;