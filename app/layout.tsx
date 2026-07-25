import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://firstclassagency.space"),
  title: "First Class Space",
  description: "First Class events, leaderboards and creator intelligence.",
  openGraph: {
    title: "First Class Space",
    description: "First Class events, leaderboards and creator intelligence.",
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
