import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoilerScout - Purdue Event Discovery",
  description: "Discover events happening across Purdue University campus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        {children}
      </body>
    </html>
  );
}
