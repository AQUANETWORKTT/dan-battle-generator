import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dan's Space",
  description: "Creator events, leaderboards and analytics",
  openGraph: {
    title: "Dan's Space",
    description: "Creator events, leaderboards and analytics",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
