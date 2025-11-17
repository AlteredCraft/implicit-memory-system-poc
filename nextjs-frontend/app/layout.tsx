import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memory System v2",
  description: "Claude's autonomous memory management demonstration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
