import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import "@/styles/globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getHeaderStats } from "@/lib/offers/stats";

// latin-ext nosi srpsku latinicu (č, ć, ž, š, đ) — Barlow je jedini font na
// sajtu (skill: "hijerarhija dolazi iz debljine, ne druge familije"). Klasa
// se stavlja na <html> da @font-face bude dostupan svuda — tokens.css onda
// referenciše samo ime "Barlow", ne next/font-ovu generisanu promenljivu.
const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Bez ovoga Next.js statički generiše layout jednom pri build-u — broj
// agencija i "ažurirano u HH:MM" bi ostali zamrznuti na build-time trenutku.
// Skill (odeljak 1): "cene se osvežavaju po intervalu, ne po korisniku" —
// 60s je početna vrednost, podesiti kad se vidi stvaran obrazac saobraćaja.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Slobodno",
  description:
    "Poređenje ponuda turističkih agencija u Srbiji na jednom mestu.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const stats = await getHeaderStats();

  return (
    <html lang="sr" className={barlow.className}>
      <body>
        <SiteHeader agencyCount={stats.agencyCount} updatedAt={stats.updatedAt} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
