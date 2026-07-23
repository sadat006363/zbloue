// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zbloue – AI Code Analysis",
  description: "Analyze, improve, and share your code with AI-powered insights.",
  keywords: "code analysis, AI, developer tools, code review",
  authors: [{ name: "Zbloue" }],
  openGraph: {
    title: "Zbloue – AI Code Analysis",
    description: "Analyze, improve, and share your code with AI-powered insights.",
    url: "https://zbloue.vercel.app",
    siteName: "Zbloue",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zbloue – AI Code Analysis",
    description: "Analyze, improve, and share your code with AI-powered insights.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}