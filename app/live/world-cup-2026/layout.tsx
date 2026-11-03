import type { Metadata } from "next";
import {managementShareImages} from '@/lib/management-share-image';

export const metadata: Metadata = {
  title: "World Cup 2026 Leaderboard",
  description: "View the live World Cup 2026 leaderboard.",
  openGraph: {
    title: "World Cup 2026 Leaderboard",
    description: "View the live World Cup 2026 rankings.",
    images: ["/world-cup-2026/logo.png"],
    ...managementShareImages,
  },
  twitter: {
    card: "summary_large_image",
    title: "World Cup 2026 Leaderboard",
    description: "View the live World Cup 2026 leaderboard.",
    images: ["/world-cup-2026/logo.png"],
    ...managementShareImages,
  },
};

export default function WorldCupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
