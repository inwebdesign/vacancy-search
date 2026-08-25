import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slobodno — Admin",
  description: "Interni dashboard za upravljanje ponudama agencija.",
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
