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
  // Faza 2, Korak 4: pdf-parse (preko pdfjs-dist) puca ako ga webpack
  // upakuje — pdfjs-dist interno radi Object.defineProperty pozive koji
  // pretpostavljaju pravo Node okruženje, ne bundlovan kod. Ovo govori
  // Next.js-u da ga ne bundluje nego direktno require-uje na serveru
  // (server-only.ts već sprečava da se importuje sa client strane).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
