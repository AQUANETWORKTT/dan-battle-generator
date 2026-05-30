import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sunset Showdown Leaderboard",
  description: "View the live Sunset Showdown rankings.",
  openGraph: {
    title: "Sunset Showdown Leaderboard",
    description: "View the live Sunset Showdown rankings.",
    images: ["/sunset-showdown/logo.png"],
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}