import type { Metadata } from "next";

const title = "Race to the Top October Leaderboard | First Class";
const description = "Race to the Top — October. Bronze, Silver, Gold and Platinum targets from 1–31 October.";

export const metadata: Metadata = {
  metadataBase: new URL("https://firstclassagency.space"),
  title,
  description,
  openGraph: { title: "Race to the Top — October", description, siteName: "First Class Event Space", images: [{ url: "/race-to-the-top-october-logo-clean.png", alt: "Race to the Top" }] },
  twitter: { card: "summary_large_image", title: "Race to the Top — October", description, images: ["/race-to-the-top-october-logo-clean.png"] },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
