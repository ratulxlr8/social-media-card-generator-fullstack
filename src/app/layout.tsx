import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifBengali = Noto_Serif_Bengali({
  variable: "--noto-serif-bengali",
  subsets: ["bengali"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Card Editor — Social Media Card Generator",
  description: "Create beautiful social media cards from any URL. Canva-style editor with drag-and-drop canvas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifBengali.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
