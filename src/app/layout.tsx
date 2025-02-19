// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from "next/font/google";

const bodyPrimary = Roboto({
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyPrimary.className} bg-gray-950 text-black`}>
        <main className="min-h-screen p-4">{children}</main>
      </body>
    </html>
  );
}
