import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Faza 2, Korak 2: default limit (1mb) je premali za Excel/PDF upload.
  // Vercel platform i dalje ima svoj hard limit (~4.5mb na Hobby tier-u) koji
  // ovo ne zaobilazi — relevantno tek kad se stigne do deploy-a.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
