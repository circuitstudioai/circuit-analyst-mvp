import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { isMarketDeskVnextPromoted, marketDeskVnextRollout } from "@/lib/marketDeskRollout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Circuit Market Desk | AI Stock Analyst Demo",
  description: "A plain-English stock research desk with accountable decisions, visible risks, and sourced evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const vnextPromoted = isMarketDeskVnextPromoted(marketDeskVnextRollout());
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body><SiteNav vnextPromoted={vnextPromoted} />{children}<SiteFooter /></body>
    </html>
  );
}
