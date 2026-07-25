import type { Metadata } from "next";
import "./globals.css";

const isEventsSpace = process.env.SITE_MODE === "events";

export const metadata: Metadata = {
  metadataBase: new URL(isEventsSpace ? "https://firstclassagency.space" : "https://firstclassagency.management"),
  title: isEventsSpace ? "First Class Event Space" : "First Class Agency Hub",
  description: isEventsSpace ? "First Class events and creator leaderboards." : "First Class Agency Hub for creator intelligence and management.",
  openGraph: {
    title: isEventsSpace ? "First Class Event Space" : "First Class Agency Hub",
    description: isEventsSpace ? "First Class events and creator leaderboards." : "First Class Agency Hub for creator intelligence and management.",
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
