import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SocialPilot AI - AI-Powered Social Media Management",
  description:
    "Manage all your social media accounts with AI-powered content creation, scheduling, and analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background antialiased">{children}</div>
      </body>
    </html>
  );
}
