import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crew Showdown Leaderboard",
  description: "View the live Crew Showdown leaderboard.",
  openGraph: {
    title: "Crew Showdown Leaderboard",
    description: "View the live Crew Showdown leaderboard.",
    images: ["/first-class/crew-showdown-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crew Showdown Leaderboard",
    description: "View the live Crew Showdown leaderboard.",
    images: ["/first-class/crew-showdown-logo.png"],
  },
};

export default function FirstClassLayout({ children }: { children: React.ReactNode }) {
  return children;
}
