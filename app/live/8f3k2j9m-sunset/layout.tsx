import type { Metadata } from "next";
import {managementShareImages} from '@/lib/management-share-image';

export const metadata: Metadata = {
  title: "Sunset Showdown Leaderboard",
  description: "View the live Sunset Showdown rankings.",
  openGraph: {
    title: "Sunset Showdown Leaderboard",
    description: "View the live Sunset Showdown rankings.",
    images: ["/sunset-showdown/logo.png"],
    ...managementShareImages,
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
