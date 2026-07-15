import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://Zbloue.vercel.app';

export const metadata: Metadata = {
  title: "Zbloue - One-Click Technical Content Generator",
  description:
    "Transform your code into educational content, LinkedIn posts, and shareable code cards instantly.",
  keywords:
    "code to content, technical content, developer tools, AI code explanation, LinkedIn post generator",
  openGraph: {
    title: "Zbloue - One-Click Technical Content Generator",
    description:
      "Transform your code into educational content, LinkedIn posts, and shareable code cards instantly.",
    url: APP_URL,
    siteName: "Zbloue",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Zbloue - Technical Content Generator",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zbloue - One-Click Technical Content Generator",
    description:
      "Transform your code into educational content, LinkedIn posts, and shareable code cards.",
    images: [`${APP_URL}/og-image.png`],
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_URL || 'https://umami-sepia-delta.vercel.app/script.js'}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}