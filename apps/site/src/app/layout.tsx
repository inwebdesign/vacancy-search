import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slobodno",
  description:
    "Pretraga slobodnog smeštaja i aranžmana turističkih agencija u Srbiji na jednom mestu.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}
