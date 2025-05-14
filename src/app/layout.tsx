// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from "next/font/google";
import NavBar from "@/components/NavBar";

const bodyPrimary = Roboto({
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Growth Engine",
  description: "Your all in one agentic growth platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyPrimary.className} bg-white text-gray-800`}>
        <NavBar />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
