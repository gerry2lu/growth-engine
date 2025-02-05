// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tweet Recommendation Engine",
  description: "Generate tweets using AI and Twitter data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-black`}>
        <main className="min-h-screen p-4">{children}</main>
      </body>
    </html>
  );
}
