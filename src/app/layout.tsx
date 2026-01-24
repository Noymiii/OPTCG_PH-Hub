import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 👇 1. IMPORT THE TRACKER
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OPTCG PH Hub",
  description: "Track your One Piece Card Game collection in PHP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* 👇 2. ACTIVATE THE TRACKER */}
        <Analytics />
      </body>
    </html>
  );
}
