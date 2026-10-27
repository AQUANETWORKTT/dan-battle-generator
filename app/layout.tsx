import type { Metadata } from "next";
import "./globals.css";

const isEventsSpace = process.env.SITE_MODE === "events";
const isAtlasSpace = process.env.SITE_MODE === "atlas";

export const metadata: Metadata = {
  metadataBase: isAtlasSpace ? (process.env.ATLAS_SITE_URL ? new URL(process.env.ATLAS_SITE_URL) : undefined) : new URL(isEventsSpace ? "https://firstclassagency.space" : "https://firstclassagency.management"),
  title: isAtlasSpace ? "Atlas Creator Network · Agency Tools" : isEventsSpace ? "First Class Event Space" : "First Class Agency Hub",
  description: isAtlasSpace ? "Atlas Creator Network poster generator and template editor." : isEventsSpace ? "First Class events and creator leaderboards." : "First Class Agency Hub for creator intelligence and management.",
  openGraph: {
    title: isAtlasSpace ? "Atlas Creator Network · Agency Tools" : isEventsSpace ? "First Class Event Space" : "First Class Agency Hub",
    description: isAtlasSpace ? "Atlas Creator Network poster generator and template editor." : isEventsSpace ? "First Class events and creator leaderboards." : "First Class Agency Hub for creator intelligence and management.",
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
