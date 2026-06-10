import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World Cup 2026",
  description: "World Cup 2026 live leaderboard",
  openGraph: {
    title: "World Cup 2026",
    description: "View the live World Cup 2026 rankings.",
    images: ["/world-cup/logo.png"],
  },
};

export default function WorldCupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}